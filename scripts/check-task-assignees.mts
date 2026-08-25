/**
 * Multi-assignee self-check — the counting contract, and the WHERE clause
 * behind "tasks this person is on".
 *
 * Run:  node --import tsx scripts/check-task-assignees.mts
 *       node --env-file=.env.local --import tsx scripts/check-task-assignees.mts --db
 *
 * A task can be worked by several people, and the two mistakes that could be
 * made about it are both SILENT — every screen still renders a number, it is
 * just the wrong one. So both are pinned here:
 *
 *  - MINUTES SPLIT, and they must split into WHOLE minutes that still sum to
 *    exactly the task's own. Every duration in this database is an integer, so
 *    an even split cannot be minutes/n: 185 across two people is 92.5, and
 *    rounding each part independently gives 93 + 93 = 186. The per-member bars
 *    would then stop summing to the tile directly above them — on a
 *    client-facing sheet that is an arithmetic error, not a display one.
 *  - COUNTS DO NOT SPLIT. Both people on a shoot delivered it, so each is
 *    credited the task — while the STUDIO still counts it once. Sum the member
 *    tallies to get a studio figure and the headline inflates the moment
 *    anyone adds a second name, with nothing on screen to explain it.
 *
 * It is the exact mirror of the revision rule one script over, which is why
 * the two are easy to get backwards: there counts split and minutes never do.
 *
 * SAFE TO RE-RUN: under --db every row it writes is title-prefixed 'ZZ-CHECK',
 * swept on the way in and in a `finally`, and every assertion query is scoped
 * to the fixtures by id or by that prefix.
 */
import { and, eq, inArray, like, sql } from 'drizzle-orm';

import {
  foldMonthTotals,
  splitMinutesAcross,
  type MonthTaskSlice,
} from '@/lib/taskFields';
import {
  assigneeSummary,
  dedupeAssigneeIds,
  isSharedTask,
} from '@/lib/taskAssigneeFields';

let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`,
  );
};

/**
 * name → figures, as a plain object.
 *
 * Deliberately NOT `byMember[0].tasks`: a fold that drops a member makes an
 * index read THROW, which aborts the whole file instead of failing one line —
 * found by mutation-testing this script, where "credit only the first member"
 * produced a stack trace and zero FAIL lines, i.e. an assertion proving
 * nothing. Every member assertion below reads through here.
 */
const byName = (totals: ReturnType<typeof foldMonthTotals>) =>
  Object.fromEntries(
    totals.byMember.map((m) => [
      m.assigneeName,
      { tasks: m.tasks, revisions: m.revisions, minutes: m.minutes },
    ]),
  );

// ── splitMinutesAcross ──────────────────────────────────────────────────────

console.log('\n— splitMinutesAcross: whole minutes that still sum —');

eq_('solo takes it all', splitMinutesAcross(185, 1), [185]);
eq_('even split needs no remainder', splitMinutesAcross(180, 2), [90, 90]);
// THE assertion this file exists for. 92.5 is not a minute.
eq_('odd total splits 93/92, not 92.5', splitMinutesAcross(185, 2), [93, 92]);
eq_('remainder lands on the earliest', splitMinutesAcross(100, 3), [34, 33, 33]);
eq_('zero splits to zeroes', splitMinutesAcross(0, 3), [0, 0, 0]);
eq_('no assignees credits nobody', splitMinutesAcross(60, 0), []);

// The property that makes the bars reconcile, over every shape the board can
// actually produce. A single failing pair here is a wrong total on a PDF.
{
  const broken: string[] = [];
  for (let minutes = 0; minutes <= 600; minutes++) {
    for (let n = 1; n <= 8; n++) {
      const parts = splitMinutesAcross(minutes, n);
      const sum = parts.reduce((a, b) => a + b, 0);
      const whole = parts.every((p) => Number.isInteger(p));
      // Nobody's share may differ from anyone else's by more than a minute,
      // or "split evenly" is not what happened.
      const spread = Math.max(...parts) - Math.min(...parts);
      if (sum !== minutes || !whole || parts.length !== n || spread > 1) {
        broken.push(`${minutes}/${n}`);
      }
    }
  }
  eq_('every (minutes, n) sums exactly, stays whole, stays even', broken, []);
}

// ── foldMonthTotals ─────────────────────────────────────────────────────────

const slice = (
  over: Partial<MonthTaskSlice> & Pick<MonthTaskSlice, 'minutes' | 'parentId'>,
): MonthTaskSlice => ({
  categorySlug: 'video-editing',
  categoryName: 'Video Editing',
  siteCategory: 'production',
  assignees: [{ id: 'u1', name: 'Sajad' }],
  ...over,
});

const ALI = { id: 'u1', name: 'Sajad' };
const REZA = { id: 'u2', name: 'Mehdi' };

console.log('\n— foldMonthTotals: counts do not split, minutes do —');
{
  // One 3h shoot, two people on it. The number nobody may get wrong.
  const totals = foldMonthTotals([
    slice({ minutes: 180, parentId: null, assignees: [ALI, REZA] }),
  ]);
  eq_('the studio delivered ONE thing', totals.taskCount, 1);
  eq_('the studio spent 3h, not 6h', totals.totalMinutes, 180);
  eq_('and says so: one shared', totals.sharedCount, 1);
  eq_('both members are credited the delivery, and split the hours', byName(totals), {
    Sajad: { tasks: 1, revisions: 0, minutes: 90 },
    Mehdi: { tasks: 1, revisions: 0, minutes: 90 },
  });
  eq_(
    'the member minutes add back up to the task',
    totals.byMember.reduce((sum, m) => sum + m.minutes, 0),
    180,
  );
  // The category is about the WORK, so it keeps the whole figure — it is not
  // a per-person view and must not be apportioned.
  eq_(
    'the category keeps the whole 3h and counts one delivery',
    totals.byCategory.map((c) => [c.minutes, c.tasks]),
    [[180, 1]],
  );
}
{
  // A solo task must be untouched by any of this — the overwhelming majority
  // of the board, and the regression that would be easiest to miss.
  const totals = foldMonthTotals([
    slice({ minutes: 185, parentId: null, assignees: [ALI] }),
  ]);
  eq_('solo keeps every minute', byName(totals), {
    Sajad: { tasks: 1, revisions: 0, minutes: 185 },
  });
  eq_('solo is not shared', totals.sharedCount, 0);
}
{
  // An odd total across two people, which is where an int split goes wrong.
  const totals = foldMonthTotals([
    slice({ minutes: 185, parentId: null, assignees: [ALI, REZA] }),
  ]);
  eq_('shares are whole minutes', byName(totals), {
    Sajad: { tasks: 1, revisions: 0, minutes: 93 },
    Mehdi: { tasks: 1, revisions: 0, minutes: 92 },
  });
  eq_(
    'and still reconcile with the total',
    totals.byMember.reduce((sum, m) => sum + m.minutes, 0),
    totals.totalMinutes,
  );
}
{
  // A shared REVISION: the two rules meet. Counts split on the parent test
  // (nobody gets a delivery) but do NOT split between people (both get the
  // revision); minutes split between people and never between rounds.
  const totals = foldMonthTotals([
    slice({ minutes: 180, parentId: null, assignees: [ALI, REZA] }),
    slice({ minutes: 60, parentId: 'p1', assignees: [ALI, REZA] }),
  ]);
  eq_('a shared revision is not a second delivery', totals.taskCount, 1);
  eq_('it is counted as a revision, once', totals.revisionCount, 1);
  eq_('its hours are real work and stay in', totals.totalMinutes, 240);
  eq_('both carry the revision and half of both sets of hours', byName(totals), {
    Sajad: { tasks: 1, revisions: 1, minutes: 120 },
    Mehdi: { tasks: 1, revisions: 1, minutes: 120 },
  });
  // sharedCount counts DELIVERABLES, so the revision must not inflate it.
  eq_('shared counts deliverables only', totals.sharedCount, 1);
}
{
  // An offboarded member keeps their line via the name key, exactly as before
  // — this is what stops last month's report losing a row.
  const totals = foldMonthTotals([
    slice({ minutes: 100, parentId: null, assignees: [{ id: null, name: 'Aida' }] }),
    slice({ minutes: 100, parentId: null, assignees: [{ id: null, name: 'Aida' }] }),
  ]);
  eq_('a deleted account aggregates onto one line, under its snapshot', byName(totals), {
    Aida: { tasks: 2, revisions: 0, minutes: 200 },
  });
}

// ── the leaf ────────────────────────────────────────────────────────────────

console.log('\n— vocabulary —');
eq_('solo reads as a name', assigneeSummary([ALI]), 'Sajad');
eq_('a pair names the first and counts the rest', assigneeSummary([ALI, REZA]), 'Sajad +1');
eq_('empty is honest', assigneeSummary([]), 'Unassigned');
eq_('shared means more than one', [isSharedTask([ALI]), isSharedTask([ALI, REZA])], [false, true]);
eq_('dedupe keeps first-seen order', dedupeAssigneeIds(['b', 'a', 'b', ' ', 'a']), ['b', 'a']);

// ── DB: the real WHERE clause ───────────────────────────────────────────────

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

const { Pool } = await import('@neondatabase/serverless');
const { drizzle } = await import('drizzle-orm/neon-serverless');
const { tasks, taskAssignees, taskCategories } = await import('@/db/schema');
const { tasksWhere } = await import('@/db/taskPredicates');

const TAG = 'ZZ-CHECK';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Prefix-and-sweep, not a rollback: neon has no transaction we can lean on
// here, so the tag is the safety line. task_assignees cascades on task delete.
const sweep = async () => {
  await db.delete(tasks).where(like(tasks.title, `${TAG}%`));
  await db.delete(taskCategories).where(eq(taskCategories.slug, 'zz-check-cat-a'));
};

try {
  await sweep();

  const [cat] = await db
    .insert(taskCategories)
    .values({ slug: 'zz-check-cat-a', name: 'ZZ Check Cat', siteCategory: 'production' })
    .returning({ id: taskCategories.id });

  // Two REAL accounts, so the FK holds and user_id is a live value — a fixture
  // with null ids would make every assertion about the user_id clause vacuous.
  const { user } = await import('@/db/auth-schema');
  const people = await db.select({ id: user.id, name: user.name }).from(user).limit(2);
  if (people.length < 2) {
    console.error('need two accounts to test a shared task');
    process.exit(1);
  }
  const [solo, mate] = people;

  const mk = async (title: string, crew: { id: string; name: string }[]) => {
    const [row] = await db
      .insert(tasks)
      .values({
        title: `${TAG} ${title}`,
        categoryId: cat.id,
        status: 'todo',
        estimatedMinutes: 60,
        createdByName: 'ZZ Maker',
      })
      .returning({ id: tasks.id });
    await db.insert(taskAssignees).values(
      crew.map((who) => ({ taskId: row.id, userId: who.id, memberName: who.name })),
    );
    return row.id;
  };

  const soloId = await mk('solo', [solo]);
  const sharedId = await mk('shared', [solo, mate]);
  const otherId = await mk('other', [mate]);
  const ids = [soloId, sharedId, otherId];

  const found = async (assigneeId?: string, q?: string) => {
    const rows = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(and(inArray(tasks.id, ids), tasksWhere(['todo'], { assigneeId, q })));
    return rows.map((r) => r.title.replace(`${TAG} `, '')).sort();
  };

  console.log('\n— the real tasksWhere against seeded rows —');
  // "Is on this task", not "owns it": the shared row must answer to BOTH.
  eq_('first member sees their solo and the shared one', await found(solo.id), ['shared', 'solo']);
  eq_('second member sees the shared one and their own', await found(mate.id), ['other', 'shared']);
  eq_('no filter sees all three', await found(), ['other', 'shared', 'solo']);

  // Search reach: the member name left the tasks row, so this proves the
  // EXISTS replacement really does still find work by who is on it.
  eq_(
    'search finds work by a member name',
    (await found(undefined, mate.name)).sort(),
    ['other', 'shared'],
  );

  // A task must never lose its last member. The bulk remove's guard is a
  // correlated count in the DELETE's own WHERE, so pin it as SQL.
  const guardedDelete = async (taskId: string, userId: string) =>
    (
      await db
        .delete(taskAssignees)
        .where(
          and(
            eq(taskAssignees.taskId, taskId),
            eq(taskAssignees.userId, userId),
            // Byte-identical to setTasksAssigneesBulk's guard.
            sql`(select count(*) from task_assignees a
              where a.task_id = ${taskAssignees.taskId}) > 1`,
          ),
        )
        .returning({ id: taskAssignees.id })
    ).length;

  eq_('removing one of two is allowed', await guardedDelete(sharedId, mate.id), 1);
  eq_('removing the last one is refused', await guardedDelete(soloId, solo.id), 0);
  const stillThere = await db
    .select({ n: taskAssignees.id })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, soloId));
  eq_('so the solo task still has its member', stillThere.length, 1);
} finally {
  await sweep();
  await pool.end();
}

console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
