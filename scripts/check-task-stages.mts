/**
 * Task-stage self-check — the delivery fork, executable.
 *
 * Run:  node --import tsx scripts/check-task-stages.mts            (pure)
 *       node --env-file=.env.local --import tsx scripts/check-task-stages.mts --db
 *
 * `done` used to mean two things at once: "the member finished the work" and
 * "this counts in the client's monthly report". Splitting it into done, then
 * either delivered or posted, separated them, and everything that can go wrong
 * with that split is SILENT — every screen still renders a number, it is just
 * the wrong one, and nobody sees it until a client's month is short.
 *
 * Five things are pinned, in order of what they cost:
 *
 *   - A →delivered / →posted move must PRESERVE the task's `completed_at`.
 *     Before the stages existed, every status that was not 'done' nulled that
 *     column; left alone, the first task anyone moved on would have dropped
 *     out of its client's month entirely, and out of the leaderboard, the
 *     trend and the retainer burn with it. The fallback matters too: a task
 *     logged straight to Posted never passed through done and has no date to
 *     keep, so it must be stamped rather than left null.
 *   - OPEN_STATUSES and SHIPPED_STATUSES must PARTITION the vocabulary. They
 *     are two hand-written lists, and a status belonging to neither is
 *     invisible to the Open tab, the All count, the Overdue filter and every
 *     report at once, while a status in both is double-counted.
 *   - Advancing only ever goes FORWARD, and `done` forks rather than steps.
 *     `advanceTargets` drives the phone board's right-swipe: a backwards step
 *     there would let a flick reopen work already reported to a client, and a
 *     single target after done would make the swipe guess between two
 *     exclusive stages instead of asking.
 *   - `released_on` must CLEAR on →done. The column records the day the client
 *     got the work; a task reopened from posted back to done has not been
 *     posted any more, and a stale day there would print a hand-over date on
 *     the client's own report for something nobody handed over.
 *   - `released_on` must PRESERVE on a re-issue. Every door that re-sends a
 *     terminal status while meaning something else — an undo, a dialog save,
 *     an amendment of the COMPLETION day — sends no hand-over date, and
 *     stamping today on those would silently rewrite it.
 *
 * Run it after touching completionStampMode, releaseStampMode, stageDateParts,
 * advanceTargets, the status sets, or the `.set()` branches in setTaskStatus /
 * setTasksStatusBulk.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, like } from 'drizzle-orm';

import {
  advanceTargets,
  completionStampMode,
  isShipped,
  isTerminalStage,
  OPEN_STATUSES,
  releaseStampMode,
  SHIPPED_STATUSES,
  stageDateParts,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  TERMINAL_STATUSES,
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
// Order is load-bearing for the report's stage summary, which reads this list
// to print "12 posted · 4 delivered" — but it is NOT a sequence: done comes
// first and the two terminals are peers after it.
eq_(
  'the shipped set is done plus the two terminals',
  [...SHIPPED_STATUSES],
  ['done', 'delivered', 'posted'],
);
// The terminals are a strict subset of shipped, and `done` is deliberately not
// one of them: it is the only shipped status a task can still move on from.
for (const slug of TASK_STATUS_SLUGS) {
  const terminal = (TERMINAL_STATUSES as readonly string[]).includes(slug);
  eq_(`isTerminalStage('${slug}')`, isTerminalStage(slug), terminal);
  if (terminal) eq_(`'${slug}' is also shipped`, isShipped(slug), true);
}
eq_("'done' is shipped but not terminal", isTerminalStage('done'), false);
// Every status needs a label: an unlabelled one renders as `undefined` in the
// tab strip, the row cell, the report chip and the ⌘K palette at once.
for (const slug of TASK_STATUS_SLUGS) {
  eq_(`'${slug}' has a label`, typeof TASK_STATUS_LABELS[slug], 'string');
}

// ── The fork ───────────────────────────────────────────────────────────────

console.log('\n— the fork after done —');

// Swept rather than written as three literals, so a status added to the open
// side inherits the answer instead of silently returning something else.
for (const slug of OPEN_STATUSES) {
  eq_(`'${slug}' advances to done`, [...advanceTargets(slug)], ['done']);
}
// The load-bearing one. Two targets, not one: delivered and posted are
// exclusive, so a swipe cannot pick between them and must hand the question to
// the confirm. A single target here would make the gesture guess.
eq_("advanceTargets('done') is the fork", [...advanceTargets('done')], [
  'delivered',
  'posted',
]);
for (const slug of TERMINAL_STATUSES) {
  eq_(`'${slug}' is the end`, [...advanceTargets(slug)], []);
}

// Stated independently of advanceTargets' own implementation, and swept over
// the whole vocabulary: a target that ever pointed backwards would let the
// phone board's right-swipe reopen reported work, and the card would look
// exactly the same doing it.
for (const slug of TASK_STATUS_SLUGS) {
  for (const target of advanceTargets(slug)) {
    eq_(`'${slug}' → '${target}' lands in the shipped set`, isShipped(target), true);
    eq_(
      `'${slug}' → '${target}' never reopens`,
      isShipped(slug) ? isTerminalStage(target) : true,
      true,
    );
    eq_(`'${slug}' → '${target}' is a real move`, target !== slug, true);
  }
}
// No cycles: nothing a terminal stage could advance to can lead back.
for (const slug of TASK_STATUS_SLUGS) {
  for (const target of advanceTargets(slug)) {
    eq_(
      `'${slug}' → '${target}' does not bounce back`,
      [...advanceTargets(target)].includes(slug),
      false,
    );
  }
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

// ── The hand-over stamp ────────────────────────────────────────────────────
// released_on's own rule. Every failure here is invisible: the column simply
// holds a different day, and every screen renders it without complaint.

console.log('\n— the hand-over stamp —');

// Swept over everything that is not a terminal stage, so a status added later
// cannot default to keeping a hand-over date it has no business carrying.
for (const slug of TASK_STATUS_SLUGS) {
  if (isTerminalStage(slug)) continue;
  eq_(`→${slug} clears the hand-over day`, releaseStampMode(slug, false), 'clear');
  // Even WITH a day. A non-terminal status has no hand-over to record, and the
  // schema has no key for one there — this is the second lock on that door.
  eq_(`→${slug} clears it even with a day`, releaseStampMode(slug, true), 'clear');
}

// →done is the one worth stating on its own: it is SHIPPED, so a rule keyed on
// isShipped rather than isTerminalStage would keep a stale posted date on a
// task that has just been reopened to done, and print it on a client's report.
eq_('→done clears the hand-over day', releaseStampMode('done', false), 'clear');

for (const slug of TERMINAL_STATUSES) {
  // The load-bearing pair, and the mirror image of the completion stamp above:
  // there, a bare move preserves and a day stamps. Here it is the same, but
  // preserve exists for a different reason — not to hold a month steady, but
  // because every re-issue of a terminal status that means something else
  // (undo, a dialog save, amending the COMPLETION day) sends no day at all.
  eq_(`→${slug} with a day stamps`, releaseStampMode(slug, true), 'stamp');
  eq_(`→${slug} without one preserves`, releaseStampMode(slug, false), 'preserve');
}

// ── The date cell ──────────────────────────────────────────────────────────
// One line or two, and never the same day printed twice. The board, the phone
// card and the client report all render this, so a wrong shape is wrong in
// three places at once.

console.log('\n— the date cell —');

const DONE_DAY = '2026-08-31';
const LATER = '2026-09-03';

// An open task has no dates at all — not an empty part, no part.
for (const slug of OPEN_STATUSES) {
  eq_(`'${slug}' has no dates`, stageDateParts(slug, DONE_DAY, LATER), []);
}

eq_('a done task shows one date', stageDateParts('done', DONE_DAY, ''), [
  { label: 'Done', day: DONE_DAY },
]);

// The load-bearing case: two dates when they differ.
eq_('done and posted on different days', stageDateParts('posted', DONE_DAY, LATER), [
  { label: 'Done', day: DONE_DAY },
  { label: 'Posted', day: LATER },
]);
eq_('done and delivered on different days', stageDateParts('delivered', DONE_DAY, LATER), [
  { label: 'Done', day: DONE_DAY },
  { label: 'Delivered', day: LATER },
]);

// And the collapse. Printing "Done Aug 31 · Posted Aug 31" is not wrong so
// much as unreadable, and it is the case that happens most: work logged after
// the fact takes the same day for both.
eq_('same day collapses to one line', stageDateParts('posted', DONE_DAY, DONE_DAY), [
  { label: 'Done and posted', day: DONE_DAY },
]);
eq_('same day collapses for delivered too', stageDateParts('delivered', DONE_DAY, DONE_DAY), [
  { label: 'Done and delivered', day: DONE_DAY },
]);

// A stale hand-over day on a row that has been reopened to done must not
// print. releaseStampMode should have cleared it, and this is the second lock:
// a row read mid-flight, or one written before that rule existed, still reads
// correctly rather than claiming a hand-over that was undone.
eq_(
  'a done row ignores a stale hand-over day',
  stageDateParts('done', DONE_DAY, LATER),
  [{ label: 'Done', day: DONE_DAY }],
);

// Neither day on file. A terminal row that somehow has no completion date
// still says what it can rather than rendering an empty cell with a stage chip
// beside it.
eq_('a hand-over with no completion still reads', stageDateParts('posted', '', LATER), [
  { label: 'Posted', day: LATER },
]);
eq_('no days at all yields nothing', stageDateParts('posted', '', ''), []);

// Swept: every part a shipped status produces must carry a real day and a real
// label, or the cell renders "undefined" beside a date.
for (const slug of SHIPPED_STATUSES) {
  for (const [c, r] of [
    [DONE_DAY, LATER],
    [DONE_DAY, DONE_DAY],
    [DONE_DAY, ''],
    ['', LATER],
  ] as const) {
    for (const part of stageDateParts(slug, c, r)) {
      eq_(`'${slug}' (${c || '—'}/${r || '—'}) part has a day`, Boolean(part.day), true);
      eq_(`'${slug}' (${c || '—'}/${r || '—'}) part has a label`, Boolean(part.label), true);
    }
  }
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
      .select({
        status: tasks.status,
        completedAt: tasks.completedAt,
        releasedOn: tasks.releasedOn,
      })
      .from(tasks)
      .where(eq(tasks.id, id));
    return row;
  };

  // The real UPDATE, spelled the way setTaskStatus spells it. Kept in this
  // file rather than imported because the action is 'use server' and behind
  // requireArea — what is being pinned is the SQL the branch produces, and a
  // divergence between this and the action shows up as the pure
  // completionStampMode assertions above going one way and this the other.
  const advance = async (
    id: string,
    to: TaskStatusSlug,
    day: Date | null,
    releasedDay: string | null = null,
  ) => {
    const now = new Date();
    const { sql } = await import('drizzle-orm');
    const mode = completionStampMode(to, day !== null);
    const release = releaseStampMode(to, releasedDay !== null);
    const TODAY = '2026-09-01';
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
                sql`coalesce(${tasks.completedAt}, ${now})`,
        releasedOn:
          release === 'clear'
            ? null
            : release === 'stamp'
              ? releasedDay
              : // And its preserve branch, likewise verbatim. TODAY stands in
                // for the action's own dayKeyIn(tz, now) so the assertions can
                // name the fallback instead of guessing at the wall clock.
                sql`coalesce(${tasks.releasedOn}, ${TODAY})`,
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

  // 6. The hand-over day, through the same real UPDATE. Every one of these
  //    renders a perfectly ordinary date on screen when it is wrong.
  const g = await seed('handover-day', 'done', SHIPPED_AT);
  await advance(g, 'posted', null, '2026-06-14');
  got = await readStamp(g);
  eq_('→posted with a day stores it', got.releasedOn, '2026-06-14');
  eq_('→posted with a day still keeps completed_at', got.completedAt?.toISOString(), SHIPPED_AT.toISOString());

  // The one that makes the door safe to re-issue: amending the COMPLETION day
  // sends no hand-over date, and must not overwrite the one on file.
  await advance(g, 'posted', new Date('2026-06-12T19:00:00.000Z'), null);
  got = await readStamp(g);
  eq_('re-issuing without a day keeps the hand-over day', got.releasedOn, '2026-06-14');
  eq_('re-issuing with a completion day still amends it', got.completedAt?.toISOString(), '2026-06-12T19:00:00.000Z');

  // Back to done: the hand-over has been undone, so the day has to go with it
  // or the client's report prints a date for something nobody handed over.
  await advance(g, 'done', null, null);
  got = await readStamp(g);
  eq_('→done clears the hand-over day', got.releasedOn, null);
  eq_('→done keeps completed_at', got.completedAt !== null, true);

  // And the fallback: a task reaching a terminal stage with nothing on file
  // takes today rather than staying null, so the cell never shows a stage chip
  // with no date beside it.
  const h = await seed('handover-fallback', 'done', SHIPPED_AT);
  await advance(h, 'delivered', null, null);
  got = await readStamp(h);
  eq_('→delivered with nothing on file stamps a day', got.releasedOn, '2026-09-01');

  // 7. The whole point of a separate column: a hand-over in ANOTHER month does
  //    not move the task out of the month it was completed in. This is the
  //    assertion that would fail if released_on ever started windowing.
  const i = await seed('handover-next-month', 'done', SHIPPED_AT);
  await advance(i, 'posted', null, '2026-07-04');
  const stillJune = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, i),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, since),
        lt(tasks.completedAt, until),
      ),
    );
  eq_('a July hand-over stays in the June report', stillJune.length, 1);
} finally {
  await sweep();
  await pool.end();
}

console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILED`}`);
process.exit(fails === 0 ? 0 : 1);
