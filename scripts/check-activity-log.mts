/**
 * Activity-log self-check — the redaction control, round-tripped through Neon.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/check-activity-log.mts
 *
 * Redaction is the whole reason this table is safe to add. A regression here is
 * silent and unrecoverable: once a salary or a résumé pathname is written into
 * an audit row it is in every backup, and /admin/logs renders it. So this pins:
 *
 *  - every key on the denylist is refused, in `changes` AND in `meta`
 *  - ordinary admin fields (title, status, areas, author…) survive untouched
 *  - `\bauth\b` does not swallow `author`/`authorSlug`
 *  - a whole payroll row spread into a payload comes back with every figure
 *    redacted — the realistic accident, not the deliberate one
 *  - diff() reports only what changed, and clips long strings at 120 chars
 *  - the table itself accepts the row shape, the FK is ON DELETE SET NULL, and
 *    jsonb survives the round trip (a payload that came back as a string would
 *    render as garbage and compare wrongly, the bigint-mode lesson)
 *
 * SAFE TO RE-RUN: every row it writes carries entity 'ZZ-CHECK' and is deleted
 * in a finally block, with a sweep on the way in too, so a crashed run leaves
 * nothing behind. It touches no row it did not create. neon-http has no
 * transactions, hence prefix-and-sweep rather than a rollback.
 *
 * Run this after touching src/lib/activityFields.ts or the activity_log table.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, sql } from 'drizzle-orm';

import { activityLog } from '@/db/schema';
import type { ActivityPayload } from '@/db/schema';
// The real module, not a re-typed copy: if the denylist is ever loosened these
// assertions must fail rather than keep passing against a stale duplicate.
import { scrub, diff, REDACTED, REDACTED_KEY_RE } from '@/lib/activityFields';
// The diagnostic logger's pure half. `@/lib/log` itself is `server-only` and
// throws under plain node — which is exactly why describeError lives in a leaf.
import { describeError, scrubContext } from '@/lib/logFields';
import {
  authAuditEntry,
  PASSKEY_REGISTER_PATH,
  PASSKEY_REMOVE_PATH,
  CHANGE_PASSWORD_PATH,
} from '@/lib/authAudit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

let fails = 0;
const eq_ = (l: string, g: unknown, w: unknown) => {
  const ok = JSON.stringify(g) === JSON.stringify(w);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${l}  got=${JSON.stringify(g)}${ok ? '' : ` want=${JSON.stringify(w)}`}`,
  );
};

const ENTITY = 'ZZ-CHECK';
const cleanup = () =>
  db.delete(activityLog).where(eq(activityLog.entity, ENTITY));

async function main() {
  await cleanup();

  /* ---------------------------------------------------------------- */
  /* 1. The denylist itself                                           */
  /* ---------------------------------------------------------------- */

  const mustRedact = [
    'password', 'passwordHash', 'newPassword', 'sessionToken', 'token',
    'BETTER_AUTH_SECRET', 'apiKey', 'api_key', 'key', 'credential',
    'authorization', 'cookie', 'salt', 'dsn',
    'resumePath', 'resume_path',
    'costCadCents', 'cost_cad_cents', 'feeCadCents', 'rateMicro',
    'rate_micro', 'wireRef', 'wire_ref', 'amountToman', 'salary', 'payout',
    'adminNote', 'admin_note', 'notes', 'note', 'memberNote', 'prorationNote',
    'message', 'body', 'phone', 'ipAddress',
    'invoiceRef', 'pathname', 'blobPath', 'screenshotPath', 'avatarPath',
    'hadResume', // the trap: this LOOKS benign but matches `resume`
  ];
  for (const k of mustRedact) {
    if (!REDACTED_KEY_RE.test(k)) {
      fails++;
      console.log(`FAIL  denylist misses '${k}'`);
    }
  }
  console.log(`PASS  denylist catches all ${mustRedact.length} sensitive keys`);

  const mustKeep = [
    'author', 'authorSlug', 'title', 'status', 'areas', 'name', 'email',
    'slug', 'category', 'clientId', 'page', 'count', 'priority', 'dueDate',
    'minutes', 'visibility', 'role', 'kind', 'month', 'severity',
  ];
  for (const k of mustKeep) {
    if (REDACTED_KEY_RE.test(k)) {
      fails++;
      console.log(`FAIL  denylist over-matches '${k}'`);
    }
  }
  console.log(`PASS  denylist keeps all ${mustKeep.length} ordinary fields`);

  /* ---------------------------------------------------------------- */
  /* 2. scrub() over changes + meta                                   */
  /* ---------------------------------------------------------------- */

  eq_(
    'scrub redacts a changed secret, keeps a changed status',
    scrub({
      changes: {
        status: { from: 'draft', to: 'sent' },
        wireRef: { from: 'DCINV234292', to: 'DCINV234648' },
      },
    }),
    {
      changes: {
        status: { from: 'draft', to: 'sent' },
        wireRef: { from: REDACTED, to: REDACTED },
      },
    },
  );

  eq_(
    'scrub redacts inside meta',
    scrub({ meta: { taskId: 'abc', costCadCents: 140000 } }),
    { meta: { taskId: 'abc', costCadCents: REDACTED } },
  );

  eq_('scrub of undefined is null', scrub(undefined), null);
  eq_('scrub of an empty payload is null', scrub({}), null);
  eq_('scrub keeps a bare count', scrub({ count: 4 }), { count: 4 });

  // The realistic accident: a whole payroll row spread into a payload.
  const payrollRow = {
    id: 'pay_1', memberName: 'Mahdi NP', month: '2026-07',
    status: 'sent', costCadCents: 140000, feeCadCents: 1500,
    rateMicro: 123300000000, wireRef: 'DCINV234292',
    adminNote: 'paid early', amountToman: 35000000,
  };
  const spread = scrub({
    meta: payrollRow as unknown as Record<string, string | number>,
  });
  const leaked = Object.entries(spread?.meta ?? {}).filter(
    ([k, v]) => REDACTED_KEY_RE.test(k) && v !== REDACTED,
  );
  eq_('a spread payroll row leaks no figure', leaked, []);
  eq_('…while keeping the non-sensitive columns', spread?.meta?.month, '2026-07');

  /* ---------------------------------------------------------------- */
  /* 3. diff()                                                         */
  /* ---------------------------------------------------------------- */

  eq_(
    'diff reports only what changed',
    diff({ title: 'A', status: 'open' }, { title: 'B', status: 'open' }),
    { title: { from: 'A', to: 'B' } },
  );
  eq_('diff of no change is undefined', diff({ a: 1 }, { a: 1 }), undefined);
  eq_(
    'diff clips a long string at 120 chars',
    (diff({ note: 'x'.repeat(200) }, { note: 'y'.repeat(200) })?.note
      ?.to as string).length,
    121, // 120 + the ellipsis
  );

  /* ---------------------------------------------------------------- */
  /* 4. The table round-trip                                           */
  /* ---------------------------------------------------------------- */

  const payload: ActivityPayload = {
    changes: { areas: { from: 'tickets', to: 'tickets,tasks' } },
    count: 1,
    meta: { userId: 'u_123' },
  };

  const [row] = await db
    .insert(activityLog)
    .values({
      actorId: null, // no FK target needed; nullable by design for crons
      actorName: 'ZZ-CHECK actor',
      area: 'users',
      entity: ENTITY,
      entityId: 'u_123',
      entityName: 'Test Member',
      action: 'grant',
      summary: 'Granted Test Member access to tasks',
      payload: scrub(payload),
      requestId: 'sfo1::zzcheck',
    })
    .returning();

  eq_('row inserts with a null actor (cron shape)', row.actorId, null);
  eq_('action enum accepts "grant"', row.action, 'grant');
  eq_(
    'jsonb round-trips as an object, not a string',
    typeof row.payload,
    'object',
  );
  // Compared field-by-field, not by JSON.stringify: Postgres jsonb stores a
  // NORMALIZED object and does not preserve key insertion order, so a
  // whole-object string compare fails on ordering alone. Anything rendering a
  // payload must sort its own keys rather than trust the write order.
  eq_(
    'jsonb preserves the diff "from"',
    row.payload?.changes?.areas?.from,
    'tickets',
  );
  eq_(
    'jsonb preserves the diff "to"',
    row.payload?.changes?.areas?.to,
    'tickets,tasks',
  );
  eq_('jsonb preserves meta', row.payload?.meta?.userId, 'u_123');
  eq_('createdAt defaults', row.createdAt instanceof Date, true);
  eq_('requestId persists for log correlation', row.requestId, 'sfo1::zzcheck');

  // The enum is closed — a typo'd action must be refused by Postgres, not
  // silently stored as a value no filter pill can ever match.
  let enumRefused = false;
  try {
    await db.insert(activityLog).values({
      actorName: 'ZZ-CHECK actor', area: 'users', entity: ENTITY,
      entityId: null, entityName: 'x',
      action: 'obliterate' as never, summary: 'x',
    });
  } catch {
    enumRefused = true;
  }
  eq_('an unknown action is refused by the enum', enumRefused, true);

  // ON DELETE SET NULL is the house rule — history must outlive an offboarded
  // account. Asserted against the live FK definition rather than by deleting a
  // real user.
  const fkResult = await db.execute<{ delete_rule: string }>(sql`
    select rc.delete_rule
    from information_schema.referential_constraints rc
    where rc.constraint_name = 'activity_log_actor_id_user_id_fk'
  `);
  eq_(
    'actor FK is ON DELETE SET NULL',
    fkResult.rows[0]?.delete_rule,
    'SET NULL',
  );

  /* ---------------------------------------------------------------- */
  /* 5. The read layer                                                 */
  /* ---------------------------------------------------------------- */

  // 47 rows so the 40-per-page window has a real second page.
  await db.insert(activityLog).values(
    Array.from({ length: 47 }, (_, i) => ({
      actorName: 'ZZ-CHECK actor',
      area: i % 2 === 0 ? 'users' : 'tickets',
      entity: ENTITY,
      entityId: `e_${i}`,
      entityName: `Entity ${i}`,
      action: (i % 2 === 0 ? 'grant' : 'update') as 'grant' | 'update',
      summary: `ZZ-CHECK summary ${i}`,
    })),
  );

  // The window-count idiom: the filtered total must ride EVERY row, so one
  // round trip serves both the page and its pager. A total that came back as
  // the page size (40) would silently cap the pager at one page forever.
  const scoped = eq(activityLog.entity, ENTITY);
  const pageRows = await db
    .select({
      id: activityLog.id,
      total: sql<number>`count(*) over ()::int`,
    })
    .from(activityLog)
    .where(scoped)
    .orderBy(sql`created_at desc`)
    .limit(40)
    .offset(0);

  eq_('window count returns the FILTERED total, not the page size',
      pageRows[0]?.total, 48); // 47 + the row from section 4
  eq_('page 1 is capped at the page size', pageRows.length, 40);
  eq_('window total is a number, not a string',
      typeof pageRows[0]?.total, 'number');

  const page2 = await db
    .select({ id: activityLog.id })
    .from(activityLog)
    .where(scoped)
    .orderBy(sql`created_at desc`)
    .limit(40)
    .offset(40);
  eq_('page 2 holds the remainder', page2.length, 8);

  // An out-of-range page returns nothing rather than throwing — the branch
  // listActivity() uses to detect a stale ?page= and clamp it.
  const pastEnd = await db
    .select({ id: activityLog.id })
    .from(activityLog)
    .where(scoped)
    .limit(40)
    .offset(4000);
  eq_('a page past the end is empty, not an error', pastEnd.length, 0);

  // THE reason parseActivityListParams validates ?action= against a closed
  // list: Postgres THROWS on an invalid enum cast rather than matching
  // nothing, so an unvalidated query param would 500 the page.
  let enumCastThrew = false;
  try {
    await db.execute(
      sql`select 1 from activity_log where action = 'not_a_verb'`,
    );
  } catch {
    enumCastThrew = true;
  }
  eq_('an unvalidated ?action= would THROW at Postgres', enumCastThrew, true);

  /* ---------------------------------------------------------------- */
  /* 6. The diagnostic logger — the stdout half                        */
  /* ---------------------------------------------------------------- */

  // REGRESSION GUARD, found in review 2026-08-19 and confirmed live.
  // drizzle-orm wraps every driver error in a DrizzleQueryError whose
  // `.message` is "Failed query: <sql>\nparams: <every bound value>". A
  // key-based denylist cannot catch that — the values are inside a message
  // string. Before the fix, one transient Neon error on the contact insert
  // printed the applicant's email and their private résumé blob path to
  // stdout, where Vercel keeps it for a day.
  const SECRET = 'APPLICANT-SECRET@example.com';
  let drizzleErr: unknown;
  try {
    await db.execute(
      sql`select * from activity_log where entity_name = ${SECRET} and nope = 1`,
    );
  } catch (e) {
    drizzleErr = e;
  }
  const described = describeError(drizzleErr);
  const serialized = JSON.stringify(described);

  eq_('a Drizzle error is recognised despite name === "Error"',
      described.errorName, 'DrizzleQueryError');
  eq_('…and NO bound parameter reaches the log line',
      serialized.includes(SECRET), false);
  eq_('…and no raw "params:" survives',
      /params:\s*(?!\[redacted)/.test(serialized), false);
  eq_('…while the real driver message is recovered from .cause',
      String(described.errorMessage).includes('nope'), true);
  eq_('…and the parameterised SQL is kept for debugging',
      String(described.query).includes('$1'), true);

  // A plain error must still describe normally.
  const plain = describeError(new Error('ordinary failure'));
  eq_('a plain Error keeps its message', plain.errorMessage, 'ordinary failure');
  eq_('a non-Error thrown value still describes',
      describeError('just a string').errorMessage, 'just a string');

  // The context denylist.
  const ctx = scrubContext({
    submissionId: 'abc',
    recipient: 'x@y.com',
    wireRef: 'DCINV234292',
    costCadCents: 140000,
    adminNote: 'x',
    invoiceRef: 'i',
    sessionToken: 't',
  });
  eq_('context: ids survive', ctx.submissionId, 'abc');
  eq_('context: wireRef redacted', ctx.wireRef, REDACTED);
  eq_('context: costCadCents redacted', ctx.costCadCents, REDACTED);
  eq_('context: adminNote redacted', ctx.adminNote, REDACTED);
  eq_('context: invoiceRef redacted', ctx.invoiceRef, REDACTED);
  eq_('context: sessionToken redacted', ctx.sessionToken, REDACTED);

  // routePath is the single most useful field on an error line — a bare
  // `path` alternative in the denylist would blank it, so it must survive.
  const ctx2 = scrubContext({
    routePath: '/api/cron/weekly-digest',
    routeType: 'route',
    requestId: 'sfo1::abc',
    method: 'GET',
    memberNote: 'private',
    // `note` does NOT match `notification` (noti- vs note-), so the
    // over-match feared when unanchoring it does not actually exist.
    notificationSent: true,
  });
  eq_('context: routePath SURVIVES', ctx2.routePath, '/api/cron/weekly-digest');
  eq_('context: routeType survives', ctx2.routeType, 'route');
  eq_('context: requestId survives', ctx2.requestId, 'sfo1::abc');
  eq_('context: memberNote redacted (camelCase note)', ctx2.memberNote, REDACTED);
  eq_('context: notificationSent survives (note != noti)', ctx2.notificationSent, true);

  // Stack cap — a runaway async stack must not approach Vercel's 256 KB line
  // ceiling or burn Active CPU in JSON.stringify.
  const deep = new Error('deep');
  deep.stack = 'Error: deep\n' + '    at frame\n'.repeat(5000);
  eq_('stack is capped', (describeError(deep).stack as string).length <= 4000, true);

  /* ---------------------------------------------------------------- */
  /* 7. Auth audit decisions (passkeys + credential change)            */
  /* ---------------------------------------------------------------- */

  // The hook itself needs a real WebAuthn ceremony, which no script can
  // drive — so the DECISION is asserted here and auth.ts is a thin shell.
  const REG_ROW = { id: 'pk_1', userId: 'u_9', name: 'MacBook Touch ID' };
  const SESSION = { user: { id: 'u_9', name: 'Saman' } };

  eq_('ignores unrelated auth endpoints',
      authAuditEntry({ path: '/sign-in/email', failed: false, returned: {}, session: SESSION, bodyId: null }),
      null);

  const reg = authAuditEntry({
    path: PASSKEY_REGISTER_PATH, failed: false, returned: REG_ROW,
    session: null, bodyId: null,
  });
  eq_('registration: actor comes from the created row, not a session',
      reg?.actor.id, 'u_9');
  eq_('registration: action is "grant" (a credential, not an edit)',
      reg?.entry.action, 'grant');
  eq_('registration: names the passkey', reg?.entry.entityName, 'MacBook Touch ID');
  eq_('registration: no credentialID/publicKey in the summary',
      /credential|publicKey/i.test(reg?.entry.summary ?? ''), false);

  // THE subtle one: Better Auth's dispatcher runs after-hooks on the FAILURE
  // path too (it catches an APIError and still assigns context.returned), so
  // a rejected registration must not be filed as if it happened.
  eq_('a REJECTED registration writes nothing',
      authAuditEntry({ path: PASSKEY_REGISTER_PATH, failed: true, returned: REG_ROW, session: SESSION, bodyId: null }),
      null);
  eq_('a registration with no userId writes nothing',
      authAuditEntry({ path: PASSKEY_REGISTER_PATH, failed: false, returned: { id: 'pk_2' }, session: SESSION, bodyId: null }),
      null);

  const del = authAuditEntry({
    path: PASSKEY_REMOVE_PATH, failed: false, returned: { status: true },
    session: SESSION, bodyId: 'pk_1',
  });
  eq_('removal: actor comes from the session', del?.actor.id, 'u_9');
  eq_('removal: action is "delete"', del?.entry.action, 'delete');
  eq_('removal: records which passkey', del?.entry.entityId, 'pk_1');
  eq_('a removal with no session writes nothing',
      authAuditEntry({ path: PASSKEY_REMOVE_PATH, failed: false, returned: { status: true }, session: null, bodyId: 'pk_1' }),
      null);

  // The rows must survive the audit denylist unchanged — 'passkey' must not
  // trip any alternative in REDACTED_KEY_RE via its payload-less shape.
  eq_('passkey rows carry no payload to redact', reg?.entry.payload, undefined);

  // Password change. This replaced an account.update databaseHook that
  // receives only a ROWS-UPDATED COUNT (probed live: the number 1), so it
  // could never name an actor. The endpoint carries sensitiveSessionMiddleware,
  // so here the actor is known — that difference is the whole point.
  const pw = authAuditEntry({
    path: CHANGE_PASSWORD_PATH, failed: false, returned: { status: true },
    session: SESSION, bodyId: null,
  });
  eq_('password change: actor is the session user', pw?.actor.id, 'u_9');
  eq_('password change: filed under auth', pw?.entry.area, 'auth');
  eq_('password change: no password in the summary',
      /password['\":]|newPassword|\$2[aby]\$/.test(pw?.entry.summary ?? ''), false);
  eq_('a REJECTED password change writes nothing',
      authAuditEntry({ path: CHANGE_PASSWORD_PATH, failed: true, returned: { status: true }, session: SESSION, bodyId: null }),
      null);
  eq_('a password change with no session writes nothing',
      authAuditEntry({ path: CHANGE_PASSWORD_PATH, failed: false, returned: { status: true }, session: null, bodyId: null }),
      null);
  // The unbounded-label class: a client-supplied passkey name has no schema
  // max, and entityName/summary are unbounded text held for 365 days.
  const LONG = 'x'.repeat(5000);
  const longReg = authAuditEntry({
    path: PASSKEY_REGISTER_PATH, failed: false,
    returned: { id: 'pk_3', userId: 'u_9', name: LONG },
    session: SESSION, bodyId: null,
  });
  eq_('a 5000-char passkey label is clipped',
      (longReg?.entry.entityName ?? '').length <= 121, true);

  // Registration must be attributable to a PERSON, not the string 'Account' —
  // registration.requireSession defaults to true, so the session is there.
  eq_('registration uses the session name, not a stub',
      longReg?.actor.name, 'Saman');

  // The documented gap: reset-by-email is intentionally not audited here.
  eq_('reset-password is deliberately NOT audited (no actor available)',
      authAuditEntry({ path: '/reset-password', failed: false, returned: { status: true }, session: null, bodyId: null }),
      null);

  /* ---------------------------------------------------------------- */

  console.log(fails === 0 ? '\nAll activity-log checks passed.' : `\n${fails} FAILED`);
  if (fails > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(() => {});
    await pool.end();
  });
