import 'server-only';
import { cache } from 'react';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { clients, reportNotes, taskCategories, tasks } from '@/db/schema';
import type { TaskCategory } from '@/db/schema';
import { user } from '@/db/auth-schema';
import type { ProjectCategoryField } from '@/lib/portfolioFields';
import type { TaskPrioritySlug, TaskStatusSlug } from '@/lib/taskFields';
import {
  TASK_VIEW_STATUSES,
  shiftDayKey,
  vancouverDayKey,
  vancouverMonthWindow,
  type TaskFilters,
  type TaskListParams,
  type TaskSort,
  type TaskView,
} from '@/lib/taskFilters';

/**
 * Read helpers for the admin task surface (/admin/tasks + /admin/reports),
 * mirroring adminQueries.ts: one server-only module so the query surface
 * never reaches a client bundle. Writes live in `_actions/tasks.ts`.
 *
 * NOTE: these helpers don't authorize — pages and route handlers gate with
 * requireArea('tasks' | 'reports') before calling in. All-tasks visibility is
 * the design (trusted 7-person team), so nothing here scopes by viewer.
 */

// Guard id-by-string reads so a malformed id returns "not found" instead of
// throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Slug shape for client/category lookups (portfolioFields' PORTFOLIO_SLUG_RE
 *  is stricter about edges; URL params were already shape-checked upstream). */
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

export const TASKS_PER_PAGE = 25;

/** LIKE metacharacters escaped so a stray % / _ can't become a wildcard. */
const likePattern = (q: string) =>
  `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/**
 * Params → resolved query filters: the one slug→id hop (unique-index lookups).
 * Archived categories still resolve — history stays filterable; only the
 * create/edit paths reject them. Returns null when a provided slug matches no
 * row, so callers can render an honest empty page instead of silently
 * dropping the filter. The month window applies only on the Done view (it
 * windows completedAt, which working views don't have).
 */
export async function resolveTaskFilters(
  params: TaskListParams,
  view: TaskView,
): Promise<TaskFilters | null> {
  const filters: TaskFilters = {
    q: params.q || undefined,
    assigneeId: params.assignee || undefined,
    priority: params.priority || undefined,
  };

  const clientSlug =
    params.client && params.client !== 'internal' ? params.client : null;
  if (clientSlug && !SLUG_RE.test(clientSlug)) return null;
  if (params.category && !SLUG_RE.test(params.category)) return null;

  // The two slug→id hops are independent unique-index reads — resolved
  // together so a client+category filter costs one round trip of wall time
  // instead of two stacked ones (neon-http: every query is its own HTTPS
  // round trip, and this resolver gates the page's whole query fan-out).
  const [clientRows, categoryRows] = await Promise.all([
    clientSlug
      ? db
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.slug, clientSlug))
          .limit(1)
      : null,
    params.category
      ? db
          .select({ id: taskCategories.id })
          .from(taskCategories)
          .where(eq(taskCategories.slug, params.category))
          .limit(1)
      : null,
  ]);

  if (params.client === 'internal') {
    filters.clientId = 'internal';
  } else if (clientSlug) {
    const row = clientRows?.[0];
    if (!row) return null;
    filters.clientId = row.id;
  }

  if (params.category) {
    const row = categoryRows?.[0];
    if (!row) return null;
    filters.categoryId = row.id;
  }

  if (view === 'done' && params.month) {
    const window = vancouverMonthWindow(params.month);
    if (window) {
      filters.completedSince = window.since;
      filters.completedUntil = window.until;
    }
  }

  // Deadline windows anchor on the Vancouver today at read time — the same
  // clock that stamps dueState on rows, so the filter and the tints agree.
  if (params.due) {
    const today = vancouverDayKey(new Date());
    if (params.due === 'overdue') {
      filters.dueBefore = today;
    } else if (params.due === 'today') {
      filters.dueSince = today;
      filters.dueBefore = shiftDayKey(today, 1);
    } else {
      filters.dueSince = today;
      filters.dueBefore = shiftDayKey(today, 7);
    }
  }

  return filters;
}

/**
 * The one WHERE clause for task reads — list page, tab counts, digest, and
 * CSV export all compose through here so their filter semantics can't drift.
 * Every clause is on tasks columns only (search is title-only by design),
 * which keeps the count query join-free.
 */
function tasksWhere(statuses: readonly TaskStatusSlug[], f: TaskFilters = {}) {
  const clauses = [inArray(tasks.status, [...statuses])];
  if (f.q) clauses.push(ilike(tasks.title, likePattern(f.q)));
  if (f.clientId === 'internal') {
    clauses.push(isNull(tasks.clientId));
  } else if (f.clientId) {
    clauses.push(eq(tasks.clientId, f.clientId));
  }
  if (f.categoryId) clauses.push(eq(tasks.categoryId, f.categoryId));
  if (f.assigneeId) clauses.push(eq(tasks.assigneeId, f.assigneeId));
  if (f.priority) clauses.push(eq(tasks.priority, f.priority));
  if (f.completedSince) clauses.push(gte(tasks.completedAt, f.completedSince));
  if (f.completedUntil) clauses.push(lt(tasks.completedAt, f.completedUntil));
  // Date-column string compares (YYYY-MM-DD sorts lexically); NULL due dates
  // fall out of any window naturally.
  if (f.dueSince) clauses.push(gte(tasks.dueDate, f.dueSince));
  if (f.dueBefore) clauses.push(lt(tasks.dueDate, f.dueBefore));
  return and(...clauses);
}

/** The joined row every task view renders. `notes` rides along so the edit
 *  dialog can seed without a second fetch (a page is only ever 25 rows). */
export type TaskListRow = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatusSlug;
  priority: TaskPrioritySlug | null;
  clientId: string | null;
  clientName: string | null;
  clientSlug: string | null;
  /** Blob upload wins over the seeded static path (portfolio rule); both null
   *  for quick-created clients — render the initials fallback. */
  clientLogoBlobUrl: string | null;
  clientLogoStaticPath: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  siteCategory: ProjectCategoryField;
  assigneeId: string | null;
  assigneeName: string;
  estimatedMinutes: number;
  actualMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  deliverableUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const taskListSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  status: tasks.status,
  priority: tasks.priority,
  clientId: tasks.clientId,
  clientName: clients.name,
  clientSlug: clients.slug,
  clientLogoBlobUrl: clients.logoBlobUrl,
  clientLogoStaticPath: clients.logoStaticPath,
  categoryId: tasks.categoryId,
  categoryName: taskCategories.name,
  categorySlug: taskCategories.slug,
  siteCategory: taskCategories.siteCategory,
  assigneeId: tasks.assigneeId,
  assigneeName: tasks.assigneeName,
  estimatedMinutes: tasks.estimatedMinutes,
  actualMinutes: tasks.actualMinutes,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
  deliverableUrl: tasks.deliverableUrl,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

function taskOrder(view: TaskView, sort: TaskSort) {
  // 'due' surfaces deadline pressure: soonest due first, undated last,
  // newest-created as the tiebreak. 'priority' ranks high→low with no-priority
  // last, deadline pressure as the tiebreak. Otherwise the Done view orders by
  // when work finished, working views by when it was logged.
  if (sort === 'due') {
    return [sql`${tasks.dueDate} asc nulls last`, desc(tasks.createdAt)];
  }
  if (sort === 'priority') {
    return [
      sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 when 'low' then 2 else 3 end`,
      sql`${tasks.dueDate} asc nulls last`,
      desc(tasks.createdAt),
    ];
  }
  const dir = sort === 'oldest' ? asc : desc;
  return view === 'done' ? [dir(tasks.completedAt)] : [dir(tasks.createdAt)];
}

export type TasksPage = {
  rows: TaskListRow[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of tasks for a status tab, filtered and sorted. `page` is clamped
 * to the available range (listSubmissions precedent): an out-of-bounds
 * `?page=` returns the last page rather than an empty view.
 */
export async function listTasks({
  view,
  page,
  perPage = TASKS_PER_PAGE,
  filters,
  sort = 'newest',
}: {
  view: TaskView;
  page: number;
  perPage?: number;
  filters?: TaskFilters;
  sort?: TaskSort;
}): Promise<TasksPage> {
  const where = tasksWhere(TASK_VIEW_STATUSES[view], filters);

  // One round trip in the common case (listSubmissions pattern): the filtered
  // total rides every row as a window count instead of a COUNT query awaited
  // first — this chain sets /admin/tasks TTFB on every render. Only a stale
  // out-of-range ?page= pays the rare clamp re-fetch below.
  const fetchPage = (p: number) =>
    db
      .select({
        ...taskListSelection,
        total: sql<number>`count(*) over ()::int`,
      })
      .from(tasks)
      .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(where)
      .orderBy(...taskOrder(view, sort))
      .limit(perPage)
      .offset((p - 1) * perPage);

  // Upper cap BEFORE the first fetch — an absurd ?page= would otherwise
  // overflow the int8 OFFSET and 500 the render (listSubmissions rule).
  const requested = Math.min(Math.max(1, Math.trunc(page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    // Past the end (or the filtered set emptied): clamp to the real last
    // page. The count stays join-free — tasksWhere is tasks-columns-only.
    const [{ n }] = await db.select({ n: count() }).from(tasks).where(where);
    total = n;
    safePage = Math.min(requested, Math.max(1, Math.ceil(n / perPage)));
    if (safePage !== requested) pageRows = await fetchPage(safePage);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = pageRows.map(({ total, ...row }) => {
    void total; // the window count is not a row field
    return row;
  });
  return { rows, total, page: safePage, totalPages };
}

/**
 * Per-status counts for the tab badges — one GROUP BY folded in JS
 * (getTicketStatusCounts pattern). The month window is stripped so every tab
 * counts the same filtered universe: the Done tab's month narrowing is a
 * within-tab view, not a different dataset.
 */
export async function countTasksByStatus(
  filters: TaskFilters = {},
): Promise<Record<TaskStatusSlug, number>> {
  const monthless: TaskFilters = {
    ...filters,
    completedSince: undefined,
    completedUntil: undefined,
  };
  const rows = await db
    .select({ status: tasks.status, n: count() })
    .from(tasks)
    .where(tasksWhere(TASK_VIEW_STATUSES.all, monthless))
    .groupBy(tasks.status);

  const counts: Record<TaskStatusSlug, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
  };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/** A single joined task by id, or null if the id is malformed / missing. */
export async function getTaskById(id: string): Promise<TaskListRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(eq(tasks.id, id))
    .limit(1);
  return row ?? null;
}

/** Everything matching the working view — the CSV export (no pagination). */
export async function listTasksForExport({
  view,
  filters,
  sort = 'newest',
}: {
  view: TaskView;
  filters?: TaskFilters;
  sort?: TaskSort;
}): Promise<TaskListRow[]> {
  return db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(tasksWhere(TASK_VIEW_STATUSES[view], filters))
    .orderBy(...taskOrder(view, sort));
}

/**
 * The digest source: done tasks since a Vancouver-midnight cutoff, newest
 * first, sharing the list's facet filters (month stripped — the digest's
 * window IS `since`). Day + member grouping happens in the page via
 * vancouverDayKey (fold-in-JS pattern, no SQL AT TIME ZONE).
 */
export async function listRecentDone({
  since,
  filters = {},
  limit = 200,
}: {
  since: Date;
  filters?: TaskFilters;
  limit?: number;
}): Promise<TaskListRow[]> {
  return db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(
      tasksWhere(['done'], {
        ...filters,
        completedSince: since,
        completedUntil: undefined,
      }),
    )
    .orderBy(desc(tasks.completedAt))
    .limit(limit);
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportClient = {
  id: string;
  slug: string;
  name: string;
  retainerMinutes: number | null;
  logoBlobUrl: string | null;
  logoStaticPath: string | null;
};

/** Client header for /admin/reports/[slug] — null on a malformed or unknown
 *  slug (the page notFound()s). */
export async function getReportClientBySlug(
  slug: string,
): Promise<ReportClient | null> {
  if (!SLUG_RE.test(slug)) return null;
  const [row] = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      retainerMinutes: clients.retainerMinutes,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
    })
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * One client's done tasks inside a month window, oldest first — one SELECT
 * riding tasks_client_completed_idx; the page folds totals with
 * foldMonthTotals (a month is at most a few hundred rows).
 */
export async function listClientMonthTasks(
  clientId: string,
  window: { since: Date; until: Date },
): Promise<TaskListRow[]> {
  return db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(
      tasksWhere(['done'], {
        clientId,
        completedSince: window.since,
        completedUntil: window.until,
      }),
    )
    .orderBy(asc(tasks.completedAt));
}

/** The month's highlights note for one client — '' when none saved. */
export async function getReportNote(
  clientId: string,
  month: string,
): Promise<string> {
  if (!UUID_RE.test(clientId)) return '';
  const [row] = await db
    .select({ body: reportNotes.body })
    .from(reportNotes)
    .where(
      and(eq(reportNotes.clientId, clientId), eq(reportNotes.month, month)),
    )
    .limit(1);
  return row?.body ?? '';
}

/**
 * Every completion instant for one client — the month switcher derives its
 * "months with activity" list by folding these through monthToken (fold in
 * JS, not SQL date_trunc, to keep the Vancouver boundary in one place).
 */
export async function listClientActivityDates(clientId: string): Promise<Date[]> {
  if (!UUID_RE.test(clientId)) return [];
  const rows = await db
    .select({ completedAt: tasks.completedAt })
    .from(tasks)
    .where(and(eq(tasks.clientId, clientId), eq(tasks.status, 'done')))
    .orderBy(desc(tasks.completedAt));
  return rows.flatMap((r) => (r.completedAt ? [r.completedAt] : []));
}

export type ReportRosterRow = ReportClient & {
  doneMinutes: number;
  doneTasks: number;
  members: number;
};

/**
 * The /admin/reports index roster: every client + the window's done
 * minutes/tasks/member tallies + retainer. The window and status conditions
 * live in the JOIN's ON-clause (one left join, no row multiplication —
 * listAdminUsers' documented rule); a client with no activity keeps zeros.
 */
export async function listReportClients(window: {
  since: Date;
  until: Date;
}): Promise<ReportRosterRow[]> {
  const rows = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      retainerMinutes: clients.retainerMinutes,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
      doneMinutes: sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
        Number,
      ),
      doneTasks: count(tasks.id),
      members: countDistinct(
        sql`coalesce(${tasks.assigneeId}, ${tasks.assigneeName})`,
      ),
    })
    .from(clients)
    .leftJoin(
      tasks,
      and(
        eq(tasks.clientId, clients.id),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    )
    .groupBy(clients.id)
    .orderBy(asc(clients.name));
  return rows;
}

// ── Chrome / pickers ────────────────────────────────────────────────────────

/** Whole-team open count (todo + in progress) — the sidebar badge and the
 *  overview tile. Team-global by design: every 'tasks' holder sees all tasks.
 *  React cache(): layout + dashboard home share one flight per request. */
export const countOpenTasks = cache(async (): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .where(inArray(tasks.status, ['todo', 'in_progress']));
  return row?.n ?? 0;
});

/** The category vocabulary, picker-ordered. Create/edit pickers exclude
 *  archived entries; the filter dropdown and the manager include them. */
export async function listTaskCategories({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<TaskCategory[]> {
  return db
    .select()
    .from(taskCategories)
    .where(includeArchived ? undefined : eq(taskCategories.archived, false))
    .orderBy(asc(taskCategories.sortIndex), asc(taskCategories.name));
}

export type TaskCategoryWithCount = TaskCategory & { taskCount: number };

/** The manager's view: every category with its task tally (drives the
 *  archive-vs-delete affordance). */
export async function listTaskCategoriesWithCounts(): Promise<
  TaskCategoryWithCount[]
> {
  const rows = await db
    .select({ category: taskCategories, taskCount: count(tasks.id) })
    .from(taskCategories)
    .leftJoin(tasks, eq(tasks.categoryId, taskCategories.id))
    .groupBy(taskCategories.id)
    .orderBy(asc(taskCategories.sortIndex), asc(taskCategories.name));
  return rows.map((r) => ({ ...r.category, taskCount: r.taskCount }));
}

/** Slim roster for the assignee picker, A→Z (listClientOptions' twin —
 *  listAdminUsers is heavier than a picker needs). `email` + `image` ride
 *  along for resolveAdminAvatar so member names can carry faces. */
export async function listAssigneeOptions(): Promise<
  { id: string; name: string; email: string; image: string | null }[]
> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .orderBy(asc(user.name));
}

/** The client roster for the task surface's two projections — form pickers
 *  (id-valued) and the filter bar (slug-valued) — in one read. `logo` is the
 *  resolved display source (blob upload wins over the seeded static path);
 *  null for quick-created clients — initials fallback. */
export async function listClientRows(): Promise<
  { id: string; slug: string; name: string; logo: string | null }[]
> {
  const rows = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
    })
    .from(clients)
    .orderBy(asc(clients.name));
  return rows.map(({ logoBlobUrl, logoStaticPath, ...row }) => ({
    ...row,
    logo: logoBlobUrl ?? logoStaticPath,
  }));
}

export type ClientMonthUsage = {
  clientId: string;
  retainerMinutes: number;
  doneMinutes: number;
};

/**
 * Current-window done minutes for every client WITH a retainer — the burn
 * hint beside client pickers ("14 h of 20 h this month"). Same
 * ON-clause-join + coalesce shape as listReportClients; clients without a
 * retainer are excluded (no target, nothing to hint).
 */
export async function listClientMonthUsage(window: {
  since: Date;
  until: Date;
}): Promise<ClientMonthUsage[]> {
  const rows = await db
    .select({
      clientId: clients.id,
      retainerMinutes: clients.retainerMinutes,
      doneMinutes: sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
        Number,
      ),
    })
    .from(clients)
    .leftJoin(
      tasks,
      and(
        eq(tasks.clientId, clients.id),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    )
    .where(isNotNull(clients.retainerMinutes))
    .groupBy(clients.id);
  return rows.flatMap((r) =>
    r.retainerMinutes == null
      ? []
      : [{ ...r, retainerMinutes: r.retainerMinutes }],
  );
}
