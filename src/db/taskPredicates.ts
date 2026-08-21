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
 * The one WHERE clause for task reads — list page, tab counts, digest, CSV
 * export, and the DB self-check all compose through here so their filter
 * semantics can't drift. Every clause is on tasks columns only (search covers
 * title + notes — both on-table, so the count query stays join-free). Comments
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
    clauses.push(or(ilike(tasks.title, like), ilike(tasks.notes, like))!);
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
