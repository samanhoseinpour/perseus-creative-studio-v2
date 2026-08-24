/**
 * One-off backfill: re-file the completion date of work that was LOGGED late.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/backfill-completion-dates.mts
 *       node --env-file=.env.local --import tsx scripts/backfill-completion-dates.mts --apply
 *
 * DRY RUN BY DEFAULT — it prints every proposed row and writes nothing until
 * `--apply`. Review the output first: `completed_at` is THE reporting column
 * (every monthly client report, the leaderboard, the digest and both crons
 * window on it), so a wrong move here is a wrong number on a client's PDF.
 *
 * Why this exists: /admin/tasks shipped with no way to say WHEN a task was
 * finished — →done always stamped the wall clock. So when the studio caught
 * up on a backlog on 2026-08-23/24, a month of work recorded as completed on
 * those two days. The Digest, the day groupings and turnaround all read from
 * that stamp, so they describe two enormous days instead of a month of work.
 *
 * WHAT IT WILL AND WILL NOT TOUCH — the whole safety of this script:
 *
 *   ✓ done, start_date set, due_date NULL, and the stamped day is LATER than
 *     the start date. A start-only task is what quick-add produces and what a
 *     backfilled log entry looks like: nobody promised a date, so the day the
 *     member typed is the best evidence of when the work happened.
 *
 *   ✓ done, start_date == due_date, and the task was CREATED more than two
 *     days after that date. A row typed days after the day it names never
 *     tracked a commitment — the member filled start and due with the same
 *     past day while logging finished work. Every one of the 28 in this
 *     bucket was created on 2026-08-23, 8 to 22 days after its own date.
 *
 *   ✗ ANY OTHER task carrying a due date. A due date reached in real time IS
 *     a commitment, not evidence of when work finished, and re-filing a late
 *     delivery onto it would flip it to on-time on the internal report — the
 *     report getting better because we edited it is the one outcome worth
 *     refusing. That covers a genuine window (start < due) and a same-day row
 *     the member actually created that day. Listed under "skipped".
 *
 *   ✗ Anything whose stamped day already matches or precedes its start date.
 *     Nothing to correct, and this is what makes the script idempotent: after
 *     a run the condition no longer holds, so a second pass is a no-op.
 *
 * The instant written is MIDDAY of the start date in STUDIO_TZ (`dayNoonIn`),
 * the same anchor setTaskStatus uses. Midday, not midnight: day start files a
 * Tehran-read Aug 1 as July 31 in Vancouver. Studio zone rather than each
 * assignee's is deliberate and provably equivalent here — noon leaves ~12h of
 * slack either way and the roster spans 11.5h, so every reader resolves the
 * same calendar day (pinned in scripts/check-calendar.mts).
 *
 * NO task_events row is written. This is a data repair, not something a
 * person did: attributing 84 status events to whoever ran the script would
 * bury the real history in every one of those tasks' feeds. The dry-run
 * output IS the audit trail — keep it.
 */
import { writeFileSync } from 'node:fs';

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { tasks } from '@/db/schema';
import {
  STUDIO_TZ,
  dayKeyIn,
  dayNoonIn,
  daysBetweenDayKeys,
} from '@/lib/calendar';

const apply = process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const rows = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    who: tasks.assigneeName,
    start: tasks.startDate,
    due: tasks.dueDate,
    completedAt: tasks.completedAt,
    createdAt: tasks.createdAt,
  })
  .from(tasks)
  .where(and(eq(tasks.status, 'done'), isNotNull(tasks.completedAt)))
  .orderBy(tasks.startDate);

type Move = {
  id: string;
  title: string;
  who: string;
  from: string;
  to: string;
  /** Which rule admitted it — the write path differs per kind. */
  kind: 'start-only' | 'backfilled';
};
const moves: Move[] = [];
const skippedDue: Omit<Move, 'kind'>[] = [];

/** How many days after the date it names was this row actually typed? A row
 *  created the same day is a plan; one created three weeks later is a record
 *  of the past, and its due date never tracked anything. */
const LOGGED_LATE_DAYS = 2;
/** Neither date set — nothing to reason from. NOT the same as "correct". */
let noEvidence = 0;
/** Finished on or before the date it carried: no reason to think it is wrong. */
let looksRight = 0;

for (const r of rows) {
  const filed = dayKeyIn(STUDIO_TZ, r.completedAt!);
  if (!r.start && !r.due) {
    noEvidence++;
    continue;
  }
  const evidence = r.due ?? r.start!;
  if (evidence >= filed) {
    looksRight++;
    continue;
  }
  const base = { id: r.id, title: r.title, who: r.who, from: filed, to: evidence };
  if (!r.due) {
    moves.push({ ...base, kind: 'start-only' });
    continue;
  }
  // A due date normally disqualifies the row — unless it is the same day as
  // the start AND the row was typed days after that day, which makes it a log
  // entry rather than a deadline anyone was working to.
  const loggedLate =
    r.start === r.due &&
    daysBetweenDayKeys(r.start, dayKeyIn(STUDIO_TZ, r.createdAt)) > LOGGED_LATE_DAYS;
  if (loggedLate) moves.push({ ...base, kind: 'backfilled' });
  else skippedDue.push(base);
}

const show = (label: string, list: Omit<Move, 'kind'>[]) => {
  if (list.length === 0) return;
  console.log(`\n— ${label} (${list.length}) —`);
  for (const m of list) {
    console.log(
      `  ${m.from} → ${m.to}  ${m.who.padEnd(16).slice(0, 16)}  ${m.title.slice(0, 52)}`,
    );
  }
};

show(
  'WOULD RE-FILE — start-only, the start date is the evidence',
  moves.filter((m) => m.kind === 'start-only'),
);
show(
  'WOULD RE-FILE — logged days late, start == due, never a real deadline',
  moves.filter((m) => m.kind === 'backfilled'),
);
show(
  'SKIPPED — a due date reached in real time; inferring would game on-time',
  skippedDue,
);

const byMonth = new Map<string, number>();
for (const m of moves) {
  const k = `${m.from.slice(0, 7)} → ${m.to.slice(0, 7)}`;
  byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
}
console.log('\n— month impact —');
for (const [k, n] of [...byMonth].sort()) {
  const [from, to] = k.split(' → ');
  console.log(`  ${k}  ${String(n).padStart(4)}${from === to ? '  (same month — no report total changes)' : '  *** CROSSES A MONTH — a report total changes ***'}`);
}

console.log(
  `\n${rows.length} done tasks scanned · ${moves.length} would move ` +
    `(${moves.filter((m) => m.kind === 'start-only').length} start-only, ` +
    `${moves.filter((m) => m.kind === 'backfilled').length} logged late) · ` +
    `${skippedDue.length} skipped (real deadline) · ${looksRight} finished on or before their date · ` +
    `${noEvidence} have no date to judge by`,
);

if (!apply) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
  await pool.end();
  process.exit(0);
}

// An undo file BEFORE the first write. completed_at is the reporting column
// and this is a bulk one-way edit of it; the only other record of the original
// instants is each task's `status` event, and two of these rows carry more
// than one (reopened, re-completed) so recovery from those alone is a guess.
const undoPath = `backfill-completion-dates.undo.${Date.now()}.json`;
const movedIds = new Set(moves.map((m) => m.id));
writeFileSync(
  undoPath,
  JSON.stringify(
    rows
      .filter((r) => movedIds.has(r.id))
      .map((r) => ({ id: r.id, title: r.title, completedAt: r.completedAt })),
    null,
    2,
  ),
);
console.log(`\nundo written: ${undoPath}  (keep until you are satisfied; do not commit)`);

let written = 0;
try {
  for (const m of moves) {
    const done = await db
      .update(tasks)
      // updated_at is deliberately absent: this is a repair, not an edit
      // anyone made, and it must not surface as activity on the row.
      .set({ completedAt: dayNoonIn(STUDIO_TZ, m.to) })
      .where(
        and(
          eq(tasks.id, m.id),
          eq(tasks.status, 'done'),
          eq(tasks.startDate, m.to),
          // The shape that admitted the row, re-asserted. A start-only row
          // must still have no due date; a logged-late one must still be the
          // same-day pair typed well after the day it names (created_at never
          // moves, so that clause is belt-and-braces — but this is a one-way
          // edit to the reporting column and the WHERE should say, in full,
          // exactly which rows it believes it is allowed to touch).
          ...(m.kind === 'start-only'
            ? [isNull(tasks.dueDate)]
            : [
                eq(tasks.dueDate, m.to),
                // ::int is load-bearing — a bare bound param leaves Postgres choosing
                // between date+integer and date+interval and it refuses (42725).
                sql`(${tasks.createdAt} at time zone ${STUDIO_TZ})::date > ${tasks.startDate} + ${LOGGED_LATE_DAYS}::int`,
              ]),
          // Re-check the predicate that SELECTED the row, not merely its
          // shape. The board is live: between the read above and this write a
          // member may have set a considered completion day through the cell
          // editor, and every other clause here would still pass while this
          // overwrote their decision. A NULL completed_at makes the compare
          // NULL, so the old `is not null` guard is subsumed rather than lost.
          sql`(${tasks.completedAt} at time zone ${STUDIO_TZ})::date > ${tasks.startDate}`,
        ),
      )
      .returning({ id: tasks.id });
    written += done.length;
  }
} finally {
  // Reported from `finally` so a mid-loop network blip still says how far it
  // got — the run is idempotent, so knowing that is the whole recovery plan.
  console.log(`\napplied: ${written} of ${moves.length} re-filed.`);
  if (written !== moves.length) {
    console.log(
      '  the rest changed underneath the run (or the run failed) — re-run to see what is left.',
    );
  }
  await pool.end();
}

process.exit(written === moves.length ? 0 : 1);
