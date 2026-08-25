/**
 * One-off repair: link the revision tasks that were logged BEFORE the revision
 * link existed, when the only way to say "this is another round" was to write
 * it into the title — "Taurus Bahar Deadlift TH (Eslahie)", "Newport House v2".
 *
 * Run:  node --env-file=.env.local --import tsx scripts/backfill-task-revisions.mts
 *       …same, plus --apply   to actually write
 *
 * DRY-RUN BY DEFAULT. Without --apply it writes nothing and prints exactly
 * what it would do.
 *
 * Why this one is worth running when the task-TAG backfill was rightly
 * declined: a missing tag is an absent optional label, which is a correct
 * state. A missing revision LINK is a wrong number — until it runs, every
 * month before the feature reports its revision rounds as separate deliveries
 * on client-facing reports.
 *
 * What it will and will not touch:
 *  - Only rows whose title still carries a revision marker AND that have a
 *    same-client sibling the normaliser collapses onto (`titlesLookSame`).
 *  - The PARENT is the oldest matching sibling that is not itself a marked
 *    revision. Where every candidate is marked (both rows read "Newport House
 *    v2"), the oldest becomes the deliverable and the rest become its rounds —
 *    which is what actually happened.
 *  - Never touches a row that already has a parent, so a re-run is a no-op.
 *  - Never links a row to itself, and never creates a second level: a chosen
 *    parent that somehow has a parent is skipped rather than nested.
 *
 * It writes an UNDO file first (task id → previous null), so a bad run is one
 * script away from reverted.
 */
import { writeFileSync } from 'node:fs';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { tasks, clients } from '@/db/schema';
import { normalizeTaskTitle, titlesLookSame } from '@/lib/taskFields';

const APPLY = process.argv.includes('--apply');

/** A title that still SAYS it is a revision. Deliberately narrower than the
 *  normaliser: that one also strips "TH", which is a format and appears on
 *  plenty of originals. Only these markers mean "another round". */
const MARKED = /\((?=[^)]*\beslah)[^)]*\)|\beslahie?\b|\bv\s?[2-9]\b|\brev(?:ision)?\b/i;

type Row = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  createdAt: Date;
  parentId: string | null;
};

const rows: Row[] = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    clientId: tasks.clientId,
    clientName: clients.name,
    createdAt: tasks.createdAt,
    parentId: tasks.parentTaskId,
  })
  .from(tasks)
  .leftJoin(clients, eq(tasks.clientId, clients.id))
  .orderBy(tasks.createdAt);

// Group by client — the same title for two clients is two different jobs.
const byClient = new Map<string, Row[]>();
for (const row of rows) {
  const key = row.clientId ?? 'internal';
  const list = byClient.get(key);
  if (list) list.push(row);
  else byClient.set(key, [row]);
}

type Link = { child: Row; parent: Row };
const links: Link[] = [];
const ambiguous: Row[] = [];

for (const list of byClient.values()) {
  for (const child of list) {
    if (child.parentId) continue;          // already linked — re-run safe
    if (!MARKED.test(child.title)) continue;
    if (normalizeTaskTitle(child.title) === '') continue;

    const siblings = list.filter(
      (other) => other.id !== child.id && titlesLookSame(child.title, other.title),
    );
    if (siblings.length === 0) continue;

    // Prefer an UNMARKED sibling — the original. Failing that (both rows read
    // "Newport House v2"), the oldest marked one is the deliverable.
    const unmarked = siblings.filter((s) => !MARKED.test(s.title));
    const pool = unmarked.length > 0 ? unmarked : siblings;
    const parent = pool.reduce((oldest, s) =>
      s.createdAt < oldest.createdAt ? s : oldest,
    );

    if (parent.id === child.id) continue;
    if (parent.parentId) { ambiguous.push(child); continue; }
    // In an all-marked group the OLDEST row is the deliverable, so it must not
    // be linked to one of its own rounds — skip any child that is older than
    // (or the same age as) the parent chosen for it.
    if (unmarked.length === 0 && child.createdAt <= parent.createdAt) continue;

    links.push({ child, parent });
  }
}

console.log(
  `\n${links.length} link${links.length === 1 ? '' : 's'} proposed${APPLY ? '' : '  (DRY RUN — pass --apply to write)'}\n`,
);
for (const { child, parent } of links) {
  console.log(`  ${child.clientName ?? 'Perseus'}`);
  console.log(`    revision: ${child.title}`);
  console.log(`    ↳ of:     ${parent.title}\n`);
}
if (ambiguous.length > 0) {
  console.log(`${ambiguous.length} skipped (their best parent is itself a revision):`);
  for (const row of ambiguous) console.log(`  - ${row.title}`);
  console.log();
}

if (!APPLY) {
  console.log('Nothing written.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const undoPath = `backfill-task-revisions-undo-${stamp}.json`;
writeFileSync(
  undoPath,
  JSON.stringify(links.map((l) => ({ id: l.child.id, parentTaskId: null })), null, 2),
);
console.log(`Undo file written: ${undoPath}`);

let written = 0;
for (const { child, parent } of links) {
  // The isNull guard makes a concurrent run (or a re-run) a no-op rather than
  // an overwrite — neon-http has no transactions, so the WHERE is the guard.
  const done = await db
    .update(tasks)
    .set({ parentTaskId: parent.id })
    .where(and(eq(tasks.id, child.id), isNull(tasks.parentTaskId)))
    .returning({ id: tasks.id });
  written += done.length;
}
console.log(`\nWrote ${written} link${written === 1 ? '' : 's'}.`);
