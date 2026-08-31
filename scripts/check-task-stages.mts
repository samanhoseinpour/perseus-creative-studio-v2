/**
 * Task-stage self-check — the delivery ladder, executable.
 *
 * Run:  node --import tsx scripts/check-task-stages.mts            (pure)
 *       node --env-file=.env.local --import tsx scripts/check-task-stages.mts --db
 *
 * `done` used to mean two things at once: "the member finished the work" and
 * "this counts in the client's monthly report". Splitting it into done →
 * delivered → posted separated them, and everything that can go wrong with
 * that split is SILENT — every screen still renders a number, it is just the
 * wrong one, and nobody sees it until a client's month is short.
 *
 * Three things are pinned, in order of what they cost:
 *
 *   - A →delivered / →posted move must PRESERVE the task's `completed_at`.
 *     Before the stages existed, every status that was not 'done' nulled that
 *     column; left alone, the first task anyone advanced would have dropped
 *     out of its client's month entirely, and out of the leaderboard, the
 *     trend and the retainer burn with it. The fallback matters too: a task
 *     logged straight to Posted never passed through done and has no date to
 *     keep, so it must be stamped rather than left null.
 *   - OPEN_STATUSES and SHIPPED_STATUSES must PARTITION the vocabulary. They
 *     are two hand-written lists, and a status belonging to neither is
 *     invisible to the Open tab, the All count, the Overdue filter and every
 *     report at once, while a status in both is double-counted.
 *   - The ladder only ever goes FORWARD. `nextStage` drives the phone board's
 *     swipe, and a backwards step there would let a flick reopen work that has
 *     already been reported to a client.
 *
 * Run it after touching completionStampMode, nextStage, the two status sets,
 * or the `.set()` branches in setTaskStatus / setTasksStatusBulk.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, like } from 'drizzle-orm';

import {
  completionStampMode,
  isShipped,
  nextStage,
  OPEN_STATUSES,
  SHIPPED_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { clients, taskCategories, tasks } from '@/db/schema';

let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${
      ok ? '' : `  want=${JSON.stringify(want)}`
    }`,
  );
};

// ── The partition ──────────────────────────────────────────────────────────
// Swept over the vocabulary rather than written as two literal lists, so a
// status added later is forced into one side instead of falling out of both.

console.log('— the open/shipped partition —');

for (const slug of TASK_STATUS_SLUGS) {
  const open = (OPEN_STATUSES as readonly string[]).includes(slug);
  const shipped = (SHIPPED_STATUSES as readonly string[]).includes(slug);
  eq_(`'${slug}' belongs to exactly one side`, [open, shipped].filter(Boolean).length, 1);
  eq_(`isShipped('${slug}') agrees with the set`, isShipped(slug), shipped);
}
eq_(
  'the two sets cover the vocabulary exactly',
  [...OPEN_STATUSES, ...SHIPPED_STATUSES].slice().sort(),
  [...TASK_STATUS_SLUGS].slice().sort(),
);
// Order is load-bearing twice over: nextStage walks SHIPPED_STATUSES, and the
// status badge paints it as an ink ramp, so a reordering silently changes both
// what a swipe does and which shade means "furthest along".
eq_(
  'the shipped ladder is in delivery order',
  [...SHIPPED_STATUSES],
  ['done', 'delivered', 'posted'],
);
// Every status needs a label: an unlabelled one renders as `undefined` in the
// tab strip, the row cell, the report chip and the ⌘K palette at once.
for (const slug of TASK_STATUS_SLUGS) {
  eq_(`'${slug}' has a label`, typeof TASK_STATUS_LABELS[slug], 'string');
}

// ── The ladder ─────────────────────────────────────────────────────────────

console.log('\n— the ladder —');

eq_(
  'every open status advances to done',
  OPEN_STATUSES.map((slug: TaskStatusSlug) => nextStage(slug)),
  ['done', 'done', 'done'],
);
eq_("nextStage('done')", nextStage('done'), 'delivered');
eq_("nextStage('delivered')", nextStage('delivered'), 'posted');
eq_("nextStage('posted') is the end", nextStage('posted'), null);

// Stated independently of nextStage's own implementation: a target that ever
// pointed backwards would let the phone board's right-swipe reopen reported
// work, and the card would look exactly the same doing it.
for (const slug of TASK_STATUS_SLUGS) {
  const target = nextStage(slug);
  if (!target) continue;
  const from = (SHIPPED_STATUSES as readonly string[]).indexOf(slug);
  const to = (SHIPPED_STATUSES as readonly string[]).indexOf(target);
  eq_(`'${slug}' → '${target}' moves forward`, from === -1 || to > from, true);
  eq_(`'${slug}' advances into the shipped set`, isShipped(target), true);
}

// ── The completion stamp ───────────────────────────────────────────────────
// The whole reason a task can advance without changing months.

console.log('\n— the completion stamp —');

for (const slug of OPEN_STATUSES) {
  eq_(`→${slug} clears the stamp`, completionStampMode(slug, false), 'clear');
  // Even WITH a day: reopening means the task is back in flight, and a task in
  // flight has no completion date whatever the caller sent.
  eq_(`→${slug} clears it even with a day`, completionStampMode(slug, true), 'clear');
}

// →done restamps rather than preserving, and that is deliberate: re-issuing
// →done on an already-done row is how a completion day is AMENDED (setTaskStatus
// has no `status <> target` guard for exactly that reason). Preserve here and
// the Done tab's date cell silently stops working.
eq_('→done stamps', completionStampMode('done', false), 'stamp');
eq_('→done with an explicit day stamps', completionStampMode('done', true), 'stamp');

// The load-bearing pair. A bare advance keeps the day the work shipped on; an
// explicit day still wins, which is what lets a task be logged straight to
// Posted after the fact.
eq_('→delivered preserves', completionStampMode('delivered', false), 'preserve');
eq_('→posted preserves', completionStampMode('posted', false), 'preserve');
eq_('→delivered with an explicit day stamps', completionStampMode('delivered', true), 'stamp');
eq_('→posted with an explicit day stamps', completionStampMode('posted', true), 'stamp');

// Swept, so a stage added after posted cannot default to 'stamp' and start
// moving tasks into the month they were advanced in.
for (const slug of SHIPPED_STATUSES) {
  if (slug === 'done') continue;
  eq_(`shipped '${slug}' past done preserves`, completionStampMode(slug, false), 'preserve');
}

// ── The DB round trip (--db) ───────────────────────────────────────────────

if (!process.argv.includes('--db')) {
  console.log(
    `\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure checks; add --db with --env-file=.env.local for the Postgres round trip)`,
  );
  process.exit(fails === 0 ? 0 : 1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing — run with --env-file=.env.local');
  process.exit(1);
}

console.log('\n— DB round trip (the real setTaskStatus UPDATE) —');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const TAG = 'ZZ-STAGE';

// Prefix-and-sweep, not a rollback: no transactions to lean on here, so the
// tag is the safety line (the check-task-filters rule).
const sweep = async () => {
  await db.delete(tasks).where(like(tasks.title, `${TAG}%`));
  await db.delete(taskCategories).where(eq(taskCategories.slug, 'zz-stage-cat'));
  await db.delete(clients).where(eq(clients.slug, 'zz-stage-client'));
};

try {
  await sweep();

  const [client] = await db
    .insert(clients)
    .values({ name: `${TAG} Client`, slug: 'zz-stage-client' })
    .returning({ id: clients.id });
  const [category] = await db
    .insert(taskCategories)
    .values({ name: `${TAG} Bucket`, slug: 'zz-stage-cat', siteCategory: 'production' })
    .returning({ id: taskCategories.id });

  /** The instant a task "shipped on" — deliberately in a past month, so a
   *  regression that restamps `now` is visible as a MONTH change and not just
   *  a few hours' drift. */
  const SHIPPED_AT = new Date('2026-06-11T19:00:00.000Z');

  const seed = async (key: string, status: TaskStatusSlug, completedAt: Date | null) => {
    const [row] = await db
      .insert(tasks)
      .values({
        title: `${TAG} ${key}`,
        clientId: client.id,
        categoryId: category.id,
        status,
        estimatedMinutes: 60,
        actualMinutes: completedAt ? 60 : null,
        completedAt,
        createdByName: `${TAG} Maker`,
      })
      .returning({ id: tasks.id });
    return row.id;
  };

  const readStamp = async (id: string) => {
    const [row] = await db
      .select({ status: tasks.status, completedAt: tasks.completedAt })
      .from(tasks)
      .where(eq(tasks.id, id));
    return row;
  };

  // The real UPDATE, spelled the way setTaskStatus spells it. Kept in this
  // file rather than imported because the action is 'use server' and behind
  // requireArea — what is being pinned is the SQL the branch produces, and a
  // divergence between this and the action shows up as the pure
  // completionStampMode assertions above going one way and this the other.
  const advance = async (id: string, to: TaskStatusSlug, day: Date | null) => {
    const now = new Date();
    const mode = completionStampMode(to, day !== null);
    await db
      .update(tasks)
      .set({
        status: to,
        completedAt:
          mode === 'clear'
            ? null
            : mode === 'stamp'
              ? (day ?? now)
              : // The preserve branch, verbatim from setTaskStatus.
                (await (async () => {
                  const { sql } = await import('drizzle-orm');
                  return sql`coalesce(${tasks.completedAt}, ${now})`;
                })()),
        updatedAt: now,
      })
      .where(eq(tasks.id, id));
  };

  // 1. The regression this whole check exists for: advancing a done task must
  //    not move the date, therefore must not move the month.
  const a = await seed('advance-keeps-day', 'done', SHIPPED_AT);
  await advance(a, 'delivered', null);
  let got = await readStamp(a);
  eq_('done → delivered keeps completed_at', got.completedAt?.toISOString(), SHIPPED_AT.toISOString());
  eq_('done → delivered lands on delivered', got.status, 'delivered');
  await advance(a, 'posted', null);
  got = await readStamp(a);
  eq_('delivered → posted keeps completed_at', got.completedAt?.toISOString(), SHIPPED_AT.toISOString());

  // 2. The fallback: a task logged straight to Posted has no date to keep, so
  //    the coalesce must supply one. Null here would make the task invisible
  //    to every month window in the app while reading "Posted" on the board.
  const b = await seed('straight-to-posted', 'todo', null);
  await advance(b, 'posted', null);
  got = await readStamp(b);
  eq_('todo → posted stamps a date rather than leaving null', got.completedAt !== null, true);

  // 3. An explicit day still wins on a later stage — logging after the fact.
  const c = await seed('explicit-day', 'todo', null);
  const BACKDATED = new Date('2026-05-02T19:00:00.000Z');
  await advance(c, 'delivered', BACKDATED);
  got = await readStamp(c);
  eq_('todo → delivered with a day uses it', got.completedAt?.toISOString(), BACKDATED.toISOString());

  // 4. Reopening still clears, which is the other half of the contract: a task
  //    back in flight must leave the month it was reported in.
  const d = await seed('reopen-clears', 'posted', SHIPPED_AT);
  await advance(d, 'in_progress', null);
  got = await readStamp(d);
  eq_('posted → in_progress clears completed_at', got.completedAt, null);

  // 5. The month window itself, which is what every report actually asks. The
  //    three shipped rows seeded at SHIPPED_AT must all answer to it, and the
  //    reopened one must not — this is the assertion a client's short month
  //    would have shown up as.
  const { and, gte, lt, inArray } = await import('drizzle-orm');
  const since = new Date('2026-06-01T07:00:00.000Z');
  const until = new Date('2026-07-01T07:00:00.000Z');
  const e = await seed('still-done', 'done', SHIPPED_AT);
  const f = await seed('reopened', 'done', SHIPPED_AT);
  await advance(f, 'todo', null);
  const inMonth = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        like(tasks.title, `${TAG}%`),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, since),
        lt(tasks.completedAt, until),
      ),
    );
  const ids = new Set(inMonth.map((r) => r.id));
  eq_('the advanced task is still in its original month', ids.has(a), true);
  eq_('an untouched done task is in the month', ids.has(e), true);
  eq_('a reopened task has left the month', ids.has(f), false);
  eq_('a task shipped in another month is not in it', ids.has(c), false);
} finally {
  await sweep();
  await pool.end();
}

console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILED`}`);
process.exit(fails === 0 ? 0 : 1);
