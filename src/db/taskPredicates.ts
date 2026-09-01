import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { clients, taskCategories, tasks } from '@/db/schema';
import { searchTokens } from '@/lib/searchTerms';
import {
  SHIPPED_STATUSES,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  isShippedView,
  type TaskFilters,
  type TaskSort,
  type TaskView,
} from '@/lib/taskFilters';

/**
 * The task WHERE builder, split out of taskQueries.ts for one reason: this is
 * the module scripts/verify-task-filters-db.mts imports to prove the filters
 * against a real Postgres — and taskQueries is `server-only`, which throws
 * outside the react-server condition. Like schema.ts, this file carries no
 * guard because it holds no connection: it builds predicates, it can't run
 * them. Nothing client-side may import it (it would drag drizzle + the schema
 * into a client chunk); its only consumers are taskQueries, adminQueries'
 * re-export, and the check script.
 */

/** Escapes % and _ so a search literal can't act as a wildcard. Lives here
 *  (not adminQueries, its old home) because this guard-free leaf must not
 *  reach into a `server-only` module; adminQueries re-exports it. */
export const likePattern = (q: string) =>
  `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/**
 * The ONE search predicate every /admin surface composes: an AND of ORs, where
 * each token gets its own OR over whatever fields that surface shows.
 *
 * Lives beside `likePattern` for the same reason — this is the guard-free leaf
 * the DB self-check can import, and `adminQueries` re-exports both so no query
 * module has to know that.
 *
 * The shape is the whole fix. Wrapping the WHOLE typed string in `%…%` and
 * testing it field by field looks forgiving and is not: "arshia real th" could
 * not find "Arshia Real Estate TH", because a contiguous substring cannot skip
 * the word in the middle, and a term belonging to a different field from its
 * neighbour could never match at all. Neither is a typo — typo tolerance is a
 * separate tier that only runs once this one has already returned nothing.
 *
 * Returns `undefined` for an empty query so a caller can drop it into an
 * existing clause list unchanged. That matters: a query of pure whitespace
 * must WIDEN to everything, never collapse to a pattern that matches nothing.
 */
export function searchAllTokens(
  raw: string,
  reach: (like: string) => (SQL | undefined)[],
): SQL | undefined {
  const tokens = searchTokens(raw);
  if (tokens.length === 0) return undefined;
  return and(...tokens.map((token) => or(...reach(likePattern(token)))));
}

/**
 * What the Client column shows for a null client. A DELIBERATE duplicate of
 * `INTERNAL_CLIENT_LABEL` in `@/lib/taskFields` — which is the canonical home
 * and stays so; change both together, or neither.
 *
 * It is copied rather than imported because taskFields is not the leaf it
 * looks like: it value-imports portfolioFields → ticketFields → adminNav →
 * `react-icons/lu`, so importing it here would pull React and a ~790 KB icon
 * barrel into the query path — and into `scripts/check-task-filters.mts`, a
 * plain-Node script whose graph has no React in it today. The existing
 * `import type { TaskStatusSlug }` above is free only because it is erased at
 * compile time. `likePattern` below was moved here for the same reason, and
 * `taskFilters.ts` keeps its own `'internal'` literal under the same
 * constraint.
 */
const INTERNAL_CLIENT_LABEL = 'Perseus';

/**
 * Every field a task row DISPLAYS, as a list of alternatives for ONE search
 * term. Exported so the ⌘K palette's task search composes the same reach: it
 * used to look at title and notes only, so a palette search for a member name
 * found nothing while "View all in Tasks" — handing the same string to this
 * predicate — then found plenty.
 *
 * Title and notes are on-table; the other four ride correlated EXISTS
 * subqueries for the tag facet's reason — a join would multiply rows per match
 * and quietly break both `count(*) over ()` on the list and the join-free
 * tab-badge COUNT. Each is a PK lookup against a table of tens of rows, so the
 * ILIKE seq-scan this already pays stays the cost.
 *
 * The member name used to be the cheap branch here, an on-table snapshot
 * needing no subquery. It moved to task_assignees with the rest of the
 * assignee data rather than being denormalised back onto the row: two places
 * to ask who is on a task is exactly the drift a single door exists to
 * prevent, and the reach is identical.
 */
export function taskSearchReach(like: string) {
  return [
    ilike(tasks.title, like),
    ilike(tasks.notes, like),
    sql`exists (select 1 from task_assignees a
          where a.task_id = ${tasks.id} and a.member_name ilike ${like})`,
    sql`exists (select 1 from clients c
          where c.id = ${tasks.clientId} and c.name ilike ${like})`,
    // The Client column renders null as "Perseus" (ClientCombobox's
    // INTERNAL_OPTION), so the search has to answer to the label on screen —
    // there is no row to match it against.
    sql`(${tasks.clientId} is null and ${INTERNAL_CLIENT_LABEL}::text ilike ${like})`,
    sql`exists (select 1 from task_categories tc
          where tc.id = ${tasks.categoryId} and tc.name ilike ${like})`,
    sql`exists (select 1 from task_tag_links l
          join task_tags t on t.id = l.tag_id
          where l.task_id = ${tasks.id} and t.name ilike ${like})`,
  ];
}

/**
 * The one WHERE clause for task reads — list page, tab counts, digest, CSV
 * export, and the DB self-check all compose through here so their filter
 * semantics can't drift. The top-level shape is tasks-columns-only: anything
 * off-table rides a correlated EXISTS, never a join, so `count(*) over ()` on
 * the list and the join-free tab-badge COUNT both keep working. Comments
 * deliberately stay out of `q` (they'd need a task_events join/EXISTS); the ⌘K
 * palette searches them separately and deep-links straight to the task instead.
 */
export function tasksWhere(
  statuses: readonly TaskStatusSlug[],
  f: TaskFilters = {},
) {
  const clauses = [inArray(tasks.status, [...statuses])];
  if (f.q) {
    // ONE CLAUSE PER TOKEN, and every one of them must land somewhere. The
    // query used to be wrapped whole in `%…%` and tested field by field, which
    // is stricter than it reads: "arshia real th" could not find "Arshia Real
    // Estate TH", because a contiguous substring cannot skip the word in the
    // middle. Word order, an extra word, and a term belonging to a DIFFERENT
    // field from its neighbour all failed the same way, and none of them is a
    // typo — see searchTerms.ts and scripts/check-search-terms.mts.
    //
    // An AND of ORs is what makes a member name and a title word typeable in
    // one breath: each token is free to match a different field.
    for (const term of searchTokens(f.q)) {
      clauses.push(or(...taskSearchReach(likePattern(term)))!);
    }
  }
  if (f.clientId === 'internal') {
    clauses.push(isNull(tasks.clientId));
  } else if (f.clientId) {
    clauses.push(eq(tasks.clientId, f.clientId));
  }
  if (f.categoryId) clauses.push(eq(tasks.categoryId, f.categoryId));
  // "Is on this task", not "owns it" — a task can carry several members, so
  // the facet rides an EXISTS for the tag facet's reason below rather than a
  // join. The URL contract is unchanged: ?assignee= is still one id.
  if (f.assigneeId)
    clauses.push(
      sql`exists (select 1 from task_assignees a
            where a.task_id = ${tasks.id} and a.user_id = ${f.assigneeId})`,
    );
  // 'none' is the "no flag set" facet — priority is nullable by design (most
  // routine tasks never need one), so unflagged rows deserve a filter too.
  if (f.priority === 'none') clauses.push(isNull(tasks.priority));
  else if (f.priority) clauses.push(eq(tasks.priority, f.priority));
  // The tag facet rides EXISTS subqueries, never a join — a join would
  // multiply rows per tag and quietly break both `count(*) over ()` on the
  // list and the join-free COUNT the tab badges depend on. The correlated
  // subquery leaves the top-level shape exactly as it was.
  if (f.untagged) {
    clauses.push(
      sql`not exists (select 1 from task_tag_links l where l.task_id = ${tasks.id})`,
    );
  } else if (f.tagIds && f.tagIds.length > 0) {
    const ids = sql.join(
      f.tagIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    clauses.push(
      f.tagMode === 'all'
        ? // Exact because (task_id, tag_id) is the PK: there can be no
          // duplicate rows to inflate the count past the ids asked for.
          sql`(select count(*) from task_tag_links l
                where l.task_id = ${tasks.id} and l.tag_id in (${ids}))
              = ${f.tagIds.length}`
        : sql`exists (select 1 from task_tag_links l
                where l.task_id = ${tasks.id} and l.tag_id in (${ids}))`,
    );
  }
  // ── The MONTH SCOPE ───────────────────────────────────────────────────────
  // Which month this board is about, and the one clause that is not a filter:
  // a finished task belongs to the month it finished, unfinished work is
  // always "now". So a past month narrows to what completed inside it, while
  // the current month ALSO lets every open row through (completed_at IS NULL
  // is exactly "still open" — done/delivered/posted stamp it, everything
  // earlier leaves it null, and leaving 'done' nulls it again).
  //
  // Tasks-columns-only like everything else at this level, so `count(*) over ()`
  // on the list and the join-free tab-badge COUNT both keep working.
  if (f.monthSince && f.monthUntil) {
    const shipped = and(
      gte(tasks.completedAt, f.monthSince),
      lt(tasks.completedAt, f.monthUntil),
    )!;
    clauses.push(
      f.monthIncludesOpen ? or(shipped, isNull(tasks.completedAt))! : shipped,
    );
  }
  // timestamptz columns take real instants...
  if (f.completedSince) clauses.push(gte(tasks.completedAt, f.completedSince));
  if (f.completedUntil) clauses.push(lt(tasks.completedAt, f.completedUntil));
  if (f.createdSince) clauses.push(gte(tasks.createdAt, f.createdSince));
  if (f.createdUntil) clauses.push(lt(tasks.createdAt, f.createdUntil));
  // ...while due_date/start_date are `date` columns: plain string compares
  // (YYYY-MM-DD sorts lexically). NULL dates fall out of any window naturally,
  // which is exactly why "No date" needs its own explicit clause.
  if (f.dueSince) clauses.push(gte(tasks.dueDate, f.dueSince));
  if (f.dueBefore) clauses.push(lt(tasks.dueDate, f.dueBefore));
  if (f.dueIsNull) clauses.push(isNull(tasks.dueDate));
  if (f.startSince) clauses.push(gte(tasks.startDate, f.startSince));
  if (f.startBefore) clauses.push(lt(tasks.startDate, f.startBefore));
  if (f.startIsNull) clauses.push(isNull(tasks.startDate));
  // The composite `date` facet: the row's own date is its due date, or its
  // start date when no due is set — exactly what the Dates column displays.
  // COALESCE keeps it one sargable-enough expression at this table's volume
  // (the ILIKE above already seq-scans by design).
  const sched = sql`coalesce(${tasks.dueDate}, ${tasks.startDate})`;
  if (f.schedSince) clauses.push(sql`${sched} >= ${f.schedSince}`);
  if (f.schedBefore) clauses.push(sql`${sched} < ${f.schedBefore}`);
  if (f.schedIsNull) {
    clauses.push(isNull(tasks.dueDate), isNull(tasks.startDate));
  }
  // Deadline PRESSURE is about work still owed, which is also what dueState
  // tints — so "Overdue" keeps SHIPPED rows out (without it, Overdue on the All
  // tab listed finished tasks with a past due date, untinted, contradicting
  // the filter's own name). The whole shipped set, not just 'done': a delivered
  // or posted task is even further past owing anything. This rides `overdue`
  // alone, not every due window: an explicit "due in August" range must be free
  // to include what shipped.
  if (f.dueOpenOnly) clauses.push(notInArray(tasks.status, [...SHIPPED_STATUSES]));
  return and(...clauses);
}


// ── Order ───────────────────────────────────────────────────────────────────

/**
 * The board's ORDER BY, for one of the tokens in TASK_SORTS.
 *
 * Here rather than in taskQueries for tasksWhere's reason: this module is
 * guard-free, so scripts/check-task-filters.mts can run the REAL ordering
 * against seeded rows. That is the whole point of it living here. A wrong
 * ORDER BY draws a complete, plausible board with every row in the wrong
 * place, exactly the way a wrong WHERE draws a plausible empty day, and
 * nothing on screen says so.
 *
 * Three rules every branch keeps:
 *
 * It ends on the id. Without a unique last key, rows sharing a sort value (a
 * bulk edit, a seeded month, every task with no due date) have no defined
 * order, and OFFSET paging can then show one row on two pages, or on none.
 *
 * Unknown sorts LAST in BOTH directions: `nulls last` on the dates, the
 * `else` arm of the priority CASE. So the two directions of a column are not
 * mirrors of each other, deliberately. Reversing "soonest due" must not
 * promote every undated task to the top of the board. On the ASC arms that
 * clause only restates Postgres's own default and is written out to say so;
 * on the DESC arm it is load-bearing, because DESC defaults to NULLS FIRST —
 * drop it there and every undated task leads the board.
 *
 * Text goes through `lower()`, so the answer does not depend on the database's
 * collation, and the client's arm coalesces to the label the Client column
 * actually renders for a task with no client.
 *
 * Every expression reads `tasks` or one of the two 1:1 joins listTasks and
 * listTasksForExport already carry (taskCategories inner, clients left) — see
 * TASK_COLUMN_SORTS for why no column offering a sort is many-per-task, which
 * is what keeps a correlated subquery out of the ORDER BY.
 */
export function taskOrder(view: TaskView, sort: TaskSort): SQL[] {
  const id = desc(tasks.id);
  const scheduled = sql`${tasks.dueDate} asc nulls last`;
  // The stage ladder in its declared order, built from the vocabulary rather
  // than typed out, so a status added later cannot be left with no rank (it
  // would silently sort as if it were the last one).
  const stage = sql`case ${tasks.status} ${sql.join(
    TASK_STATUS_SLUGS.map((slug, i) => sql`when ${slug} then ${i}`),
    sql` `,
  )} else ${TASK_STATUS_SLUGS.length} end`;
  // What the Time column shows, and the valuation every report already uses.
  const minutes = sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`;
  const clientName = sql`lower(coalesce(${clients.name}, ${INTERNAL_CLIENT_LABEL}))`;

  switch (sort) {
    case 'title-az':
      return [sql`lower(${tasks.title}) asc`, id];
    case 'title-za':
      return [sql`lower(${tasks.title}) desc`, id];
    case 'client-az':
      return [sql`${clientName} asc`, id];
    case 'client-za':
      return [sql`${clientName} desc`, id];
    case 'category-az':
      return [sql`lower(${taskCategories.name}) asc`, id];
    case 'category-za':
      return [sql`lower(${taskCategories.name}) desc`, id];
    case 'status-early':
      return [sql`${stage} asc`, id];
    case 'status-late':
      return [sql`${stage} desc`, id];
    case 'time-most':
      return [sql`${minutes} desc`, id];
    case 'time-least':
      return [sql`${minutes} asc`, id];
    case 'due':
      // Deadline pressure: soonest due first, undated last, newest-created as
      // the tiebreak.
      return [scheduled, desc(tasks.createdAt), id];
    case 'due-late':
      return [sql`${tasks.dueDate} desc nulls last`, desc(tasks.createdAt), id];
    case 'priority':
      // High to low, unflagged last, deadline pressure as the tiebreak.
      return [
        sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 when 'low' then 2 else 3 end`,
        scheduled,
        desc(tasks.createdAt),
        id,
      ];
    case 'priority-low':
      // Low to high, and unflagged STILL last — it is not a priority below
      // low, it is the absence of one.
      return [
        sql`case ${tasks.priority} when 'low' then 0 when 'medium' then 1 when 'high' then 2 else 3 end`,
        scheduled,
        desc(tasks.createdAt),
        id,
      ];
    default: {
      // The board's own order: the SHIPPED views (Done, Delivered, Posted) by
      // when work finished, the working views by when it was logged.
      const dir = sort === 'oldest' ? asc : desc;
      return isShippedView(view)
        ? [dir(tasks.completedAt), id]
        : [dir(tasks.createdAt), id];
    }
  }
}
