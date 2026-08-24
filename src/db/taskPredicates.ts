import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { tasks } from '@/db/schema';
import type { TaskStatusSlug } from '@/lib/taskFields';
import type { TaskFilters } from '@/lib/taskFilters';

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
    const like = likePattern(f.q);
    // Search reaches every field the row DISPLAYS, not just the two it stores
    // as text — typing a client, a member, a category or a tag has to find the
    // work the list is visibly showing under that name. Title/notes/assignee
    // are on-table (assignee_name is the NOT NULL snapshot the deletion policy
    // already keeps); the other three are correlated EXISTS subqueries for the
    // tag facet's reason below — a join would multiply rows per match and
    // quietly break both counts. Each is a PK lookup against a table of tens
    // of rows, so the ILIKE seq-scan this already pays stays the cost.
    clauses.push(
      or(
        ilike(tasks.title, like),
        ilike(tasks.notes, like),
        ilike(tasks.assigneeName, like),
        sql`exists (select 1 from clients c
              where c.id = ${tasks.clientId} and c.name ilike ${like})`,
        // The Client column renders null as "Perseus" (ClientCombobox's
        // INTERNAL_OPTION), so the search has to answer to the label on
        // screen — there is no row to match it against.
        sql`(${tasks.clientId} is null and ${INTERNAL_CLIENT_LABEL}::text ilike ${like})`,
        sql`exists (select 1 from task_categories tc
              where tc.id = ${tasks.categoryId} and tc.name ilike ${like})`,
        sql`exists (select 1 from task_tag_links l
              join task_tags t on t.id = l.tag_id
              where l.task_id = ${tasks.id} and t.name ilike ${like})`,
      )!,
    );
  }
  if (f.clientId === 'internal') {
    clauses.push(isNull(tasks.clientId));
  } else if (f.clientId) {
    clauses.push(eq(tasks.clientId, f.clientId));
  }
  if (f.categoryId) clauses.push(eq(tasks.categoryId, f.categoryId));
  if (f.assigneeId) clauses.push(eq(tasks.assigneeId, f.assigneeId));
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
  // tints — so "Overdue" keeps done rows out (without it, Overdue on the All
  // tab listed finished tasks with a past due date, untinted, contradicting
  // the filter's own name). This rides `overdue` alone, not every due window:
  // an explicit "due in August" range must be free to include what shipped.
  if (f.dueOpenOnly) clauses.push(ne(tasks.status, 'done'));
  return and(...clauses);
}
