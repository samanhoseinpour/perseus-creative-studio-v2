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
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  clients,
  reportNotes,
  reportShares,
  taskCategories,
  taskEvents,
  taskTemplates,
  taskViews,
  tasks,
} from '@/db/schema';
import type { TaskCategory, TaskEvent } from '@/db/schema';
import { user } from '@/db/auth-schema';
import { sanitizeAreas } from '@/lib/adminAreas';
import type { ProjectCategoryField } from '@/lib/portfolioFields';
import type {
  TaskPrioritySlug,
  TaskRepeatSlug,
  TaskStatusSlug,
} from '@/lib/taskFields';
import {
  TASK_VIEW_STATUSES,
  shiftDayKey,
  vancouverDayKey,
  vancouverDayStart,
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
  // A deadline window is about work still owed, which is also what dueState
  // tints — so done rows stay out of it. Without this, "Overdue" on the All
  // tab listed finished tasks with a past due date, untinted, contradicting
  // the filter's own name.
  if (f.dueSince || f.dueBefore) clauses.push(ne(tasks.status, 'done'));
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
  //
  // Every branch ends on the id: without a unique last key, rows sharing a
  // timestamp (a bulk edit, a seeded month) have no defined order, and
  // OFFSET paging can then show one row on two pages — or on none.
  if (sort === 'due') {
    return [
      sql`${tasks.dueDate} asc nulls last`,
      desc(tasks.createdAt),
      desc(tasks.id),
    ];
  }
  if (sort === 'priority') {
    return [
      sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 when 'low' then 2 else 3 end`,
      sql`${tasks.dueDate} asc nulls last`,
      desc(tasks.createdAt),
      desc(tasks.id),
    ];
  }
  const dir = sort === 'oldest' ? asc : desc;
  return view === 'done'
    ? [dir(tasks.completedAt), desc(tasks.id)]
    : [dir(tasks.createdAt), desc(tasks.id)];
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
    needs_approval: 0,
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
 * window IS `since`, plus the optional `until` the weekly digest email uses
 * for its exact Mon–Sun week). Day + member grouping happens in the caller
 * via vancouverDayKey (fold-in-JS pattern, no SQL AT TIME ZONE).
 */
export async function listRecentDone({
  since,
  until,
  filters = {},
  limit = 200,
}: {
  since: Date;
  until?: Date;
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
        completedUntil: until,
      }),
    )
    .orderBy(desc(tasks.completedAt))
    .limit(limit);
}

export type DueReminderRow = {
  assigneeId: string;
  email: string;
  name: string;
  title: string;
  clientName: string | null;
  dueDate: string;
};

/**
 * Open tasks due today or overdue, joined to LIVE accounts (deleted
 * assignees have no inbox) — the daily reminder cron's read. Per-assignee
 * grouping happens in the caller.
 */
export async function listOpenDueByAssignee(
  todayKey: string,
): Promise<DueReminderRow[]> {
  const rows = await db
    .select({
      assigneeId: user.id,
      email: user.email,
      name: user.name,
      title: tasks.title,
      clientName: clients.name,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(user, eq(tasks.assigneeId, user.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(
      and(
        // Deliberately narrower than the "open" view: needs_approval is
        // excluded — a task waiting on client sign-off isn't actionable by
        // the member, so its due date must not nag them.
        inArray(tasks.status, ['todo', 'in_progress']),
        isNotNull(tasks.dueDate),
        lte(tasks.dueDate, todayKey),
      ),
    )
    .orderBy(asc(tasks.dueDate));
  return rows.flatMap((r) => (r.dueDate ? [{ ...r, dueDate: r.dueDate }] : []));
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

/** Client header by id — the share page's entry point (a token row holds
 *  client_id, not a slug). */
export async function getReportClientById(
  id: string,
): Promise<ReportClient | null> {
  if (!UUID_RE.test(id)) return null;
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
    .where(eq(clients.id, id))
    .limit(1);
  return row ?? null;
}

/** Share-token shape: base64url of 24 random bytes (mintReportShare). */
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export type ReportShareRow = {
  id: string;
  clientId: string;
  month: string;
  token: string;
  createdAt: Date;
};

const reportShareSelection = {
  id: reportShares.id,
  clientId: reportShares.clientId,
  month: reportShares.month,
  token: reportShares.token,
  createdAt: reportShares.createdAt,
};

/** The active (unrevoked) share for one client-month, or null. */
export async function getActiveReportShare(
  clientId: string,
  month: string,
): Promise<ReportShareRow | null> {
  if (!UUID_RE.test(clientId)) return null;
  const [row] = await db
    .select(reportShareSelection)
    .from(reportShares)
    .where(
      and(
        eq(reportShares.clientId, clientId),
        eq(reportShares.month, month),
        isNull(reportShares.revokedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Resolve a public share token → its active share row. Malformed, unknown,
 *  and revoked all collapse to null — the share page 404s identically for
 *  each, so tokens can't be probed apart. */
export async function getReportShareByToken(
  token: string,
): Promise<ReportShareRow | null> {
  if (!SHARE_TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select(reportShareSelection)
    .from(reportShares)
    .where(and(eq(reportShares.token, token), isNull(reportShares.revokedAt)))
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

/** Where one account's still-open work stands RIGHT NOW — not a month slice.
 *  `awaitingTitles` is capped: the callout names a few and counts the rest. */
export type ClientOpenSnapshot = {
  todo: number;
  inProgress: number;
  awaitingApproval: number;
  overdue: number;
  awaitingTitles: string[];
};

const OPEN_SNAPSHOT_TITLE_CAP = 5;

/**
 * Live open-work state for one client (or `'internal'`) — the source of both
 * the client-facing "waiting on your approval" callout and the admin-only
 * carry-over line. Deliberately NOT windowed: it answers "what is still owed",
 * which is a present-tense question, so the report surfaces render it only
 * while viewing the current month.
 *
 * One SELECT over the open statuses; the fold is JS, matching every other
 * report aggregate (a client's open list is a handful of rows).
 */
export async function listClientOpenSnapshot(
  clientId: string,
): Promise<ClientOpenSnapshot> {
  const empty: ClientOpenSnapshot = {
    todo: 0,
    inProgress: 0,
    awaitingApproval: 0,
    overdue: 0,
    awaitingTitles: [],
  };
  if (clientId !== 'internal' && !UUID_RE.test(clientId)) return empty;

  const rows = await db
    .select({
      status: tasks.status,
      title: tasks.title,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(tasksWhere(['todo', 'in_progress', 'needs_approval'], { clientId }))
    .orderBy(asc(tasks.dueDate));

  const today = vancouverDayKey(new Date());
  return rows.reduce((acc, row) => {
    if (row.status === 'todo') acc.todo += 1;
    else if (row.status === 'in_progress') acc.inProgress += 1;
    else {
      acc.awaitingApproval += 1;
      if (acc.awaitingTitles.length < OPEN_SNAPSHOT_TITLE_CAP) {
        acc.awaitingTitles.push(row.title);
      }
    }
    // Lexical compare on YYYY-MM-DD, the same rule dueState uses; a null due
    // date is never overdue.
    if (row.dueDate && row.dueDate < today) acc.overdue += 1;
    return acc;
  }, empty);
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
 * `'internal'` selects null-client studio work (tasksWhere's sentinel).
 */
export async function listClientActivityDates(clientId: string): Promise<Date[]> {
  const internal = clientId === 'internal';
  if (!internal && !UUID_RE.test(clientId)) return [];
  const rows = await db
    .select({ completedAt: tasks.completedAt })
    .from(tasks)
    .where(
      and(
        internal ? isNull(tasks.clientId) : eq(tasks.clientId, clientId),
        eq(tasks.status, 'done'),
      ),
    )
    .orderBy(desc(tasks.completedAt));
  return rows.flatMap((r) => (r.completedAt ? [r.completedAt] : []));
}

/** The narrow projection the trend folds read — completion instant plus the
 *  two minute columns, nothing else (a 12-month span can be a few thousand
 *  rows studio-wide; keep the wire weight down). */
export type DoneSlice = {
  completedAt: Date | null;
  actualMinutes: number | null;
  estimatedMinutes: number;
};

/**
 * Done-task slices since a cutoff, for the 12-month delivery trends. Month
 * bucketing happens in JS via vancouverDayKey (the calendar-door rule — no
 * SQL AT TIME ZONE). `clientId`: a uuid narrows to that client (rides
 * tasks_client_completed_idx), `'internal'` to null-client studio work,
 * omitted = studio-wide.
 */
export async function listDoneSlices({
  clientId,
  since,
}: {
  clientId?: string;
  since: Date;
}): Promise<DoneSlice[]> {
  if (clientId && clientId !== 'internal' && !UUID_RE.test(clientId)) return [];
  const clauses = [eq(tasks.status, 'done'), gte(tasks.completedAt, since)];
  if (clientId === 'internal') clauses.push(isNull(tasks.clientId));
  else if (clientId) clauses.push(eq(tasks.clientId, clientId));
  return db
    .select({
      completedAt: tasks.completedAt,
      actualMinutes: tasks.actualMinutes,
      estimatedMinutes: tasks.estimatedMinutes,
    })
    .from(tasks)
    .where(and(...clauses));
}

/** The leaderboard's projection: listDoneSlices' twin, plus the member
 *  identity and the due date the on-time rate needs. */
export type MemberDoneSlice = {
  completedAt: Date | null;
  assigneeId: string | null;
  assigneeName: string;
  actualMinutes: number | null;
  estimatedMinutes: number;
  dueDate: string | null;
};

/**
 * Done-task slices for the studio leaderboard — one read per surface covering
 * the viewed month, the month before it (personal deltas + the reigning
 * champion) and the past-champion strip, all bucketed in JS by
 * vancouverDayKey (the calendar-door rule — no SQL AT TIME ZONE). Rides
 * tasks_completed_idx; no assignee predicate, so no new index.
 *
 * `limit` is a runaway guard, not a page size: rows come back newest-first, so
 * if it ever bites it is the OLDEST months that fall off — the leaderboard
 * drops those past-champion entries rather than printing a partial month as a
 * real one (see dropTruncatedMonths in leaderboardData.ts).
 */
export async function listMemberDoneSlices({
  since,
  until,
  limit = 4000,
}: {
  since: Date;
  until?: Date;
  limit?: number;
}): Promise<MemberDoneSlice[]> {
  const clauses = [eq(tasks.status, 'done'), gte(tasks.completedAt, since)];
  if (until) clauses.push(lt(tasks.completedAt, until));
  return db
    .select({
      completedAt: tasks.completedAt,
      assigneeId: tasks.assigneeId,
      assigneeName: tasks.assigneeName,
      actualMinutes: tasks.actualMinutes,
      estimatedMinutes: tasks.estimatedMinutes,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(and(...clauses))
    .orderBy(desc(tasks.completedAt))
    .limit(limit);
}

/**
 * Present-tense needs_approval tally per member — the leaderboard's "awaiting
 * sign-off" note. Deliberately unwindowed: a task waiting on a client is
 * current state, not a fact about the month it was worked in. Grouped on the
 * same two columns the member key is built from, so a deleted account's
 * snapshot rows still land on their line.
 */
export async function countAwaitingApprovalByMember(): Promise<
  { assigneeId: string | null; assigneeName: string; tasks: number }[]
> {
  return db
    .select({
      assigneeId: tasks.assigneeId,
      assigneeName: tasks.assigneeName,
      tasks: count(tasks.id),
    })
    .from(tasks)
    .where(eq(tasks.status, 'needs_approval'))
    .groupBy(tasks.assigneeId, tasks.assigneeName);
}

/** The null-client (internal) rollup for one window — the roster's Perseus
 *  row and the studio summary strip. Same coalesce/countDistinct shape as
 *  listReportClients, aggregated in one row. */
export async function internalMonthRollup(window: {
  since: Date;
  until: Date;
}): Promise<{ doneMinutes: number; doneTasks: number; members: number }> {
  const [row] = await db
    .select({
      doneMinutes:
        sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
          Number,
        ),
      doneTasks: count(tasks.id),
      members: countDistinct(
        sql`coalesce(${tasks.assigneeId}, ${tasks.assigneeName})`,
      ),
    })
    .from(tasks)
    .where(
      and(
        isNull(tasks.clientId),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    );
  return row ?? { doneMinutes: 0, doneTasks: 0, members: 0 };
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

// ── Activity ────────────────────────────────────────────────────────────────

/** One task's activity feed, newest first — the edit dialog reads the last
 *  `limit` events via the gate-first getTaskActivity action. */
export async function listTaskEvents(
  taskId: string,
  limit = 100,
): Promise<TaskEvent[]> {
  if (!UUID_RE.test(taskId)) return [];
  return db
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(desc(taskEvents.createdAt))
    .limit(limit);
}

/** id→name for the client ids an activity feed references. Deleted rows drop
 *  out — the formatter falls back to a generic label. */
export async function clientNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(inArray(clients.id, valid));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** id→name for the category ids an activity feed references. */
export async function categoryNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select({ id: taskCategories.id, name: taskCategories.name })
    .from(taskCategories)
    .where(inArray(taskCategories.id, valid));
  return new Map(rows.map((r) => [r.id, r.name]));
}

// ── Chrome / pickers ────────────────────────────────────────────────────────

/** The viewer's open count (everything not done, assigned to them) — the
 *  sidebar badge and the overview tile. Includes needs_approval: the member
 *  still owns closing the task out once the client signs off. Personal, not
 *  team-global: the badge is a "you have work" signal, and someone else's
 *  task badging everyone's sidebar trained the team to ignore it. Team-wide
 *  numbers live inside /admin/tasks (tabs and tallies stay global). Rides
 *  tasks_assignee_created_idx. React cache() keys by argument, so layout +
 *  dashboard home still share one flight per request. */
export const countOpenTasks = cache(
  async (assigneeId: string): Promise<number> => {
    const [row] = await db
      .select({ n: count() })
      .from(tasks)
      .where(
        and(
          inArray(tasks.status, ['todo', 'in_progress', 'needs_approval']),
          eq(tasks.assigneeId, assigneeId),
        ),
      );
    return row?.n ?? 0;
  },
);

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

export type TaskRosterRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  superadmin: boolean;
  /** Holds the tasks area explicitly — the working team, which is who the
   *  leaderboard lists when they've completed nothing yet. */
  onTaskTeam: boolean;
};

/**
 * The leaderboard's roster read: every account with enough to resolve an
 * avatar, plus the two flags that decide who appears with a zero. Areas are
 * filtered in JS over the whole (tiny) roster via sanitizeAreas — the
 * taskAreaEmails/listAdminUsers pattern, no jsonb predicate.
 *
 * `onTaskTeam` is the EXPLICIT grant, not the implicit superadmin one: a
 * superadmin who has never been assigned a task shouldn't pad the board with a
 * zero row (the org account least of all), but anyone who completes work still
 * ranks — ranked rows come from the task rows themselves, never from here.
 */
export async function listTaskRoster(): Promise<TaskRosterRow[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      areas: user.areas,
    })
    .from(user)
    .orderBy(asc(user.name));

  return rows.map(({ role, areas, ...rest }) => ({
    ...rest,
    superadmin: role === 'superadmin',
    onTaskTeam: role !== 'superadmin' && sanitizeAreas(areas).includes('tasks'),
  }));
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

// ── Templates ───────────────────────────────────────────────────────────────

/** A template joined to the labels its list row renders. */
export type TaskTemplateRow = {
  id: string;
  name: string;
  title: string;
  notes: string | null;
  clientId: string | null;
  clientName: string | null;
  clientLogoBlobUrl: string | null;
  clientLogoStaticPath: string | null;
  categoryId: string;
  categoryName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: TaskPrioritySlug | null;
  estimatedMinutes: number;
  repeat: TaskRepeatSlug;
  repeatDay: number | null;
  dueOffsetDays: number | null;
  active: boolean;
};

const templateSelection = {
  id: taskTemplates.id,
  name: taskTemplates.name,
  title: taskTemplates.title,
  notes: taskTemplates.notes,
  clientId: taskTemplates.clientId,
  clientName: clients.name,
  clientLogoBlobUrl: clients.logoBlobUrl,
  clientLogoStaticPath: clients.logoStaticPath,
  categoryId: taskTemplates.categoryId,
  categoryName: taskCategories.name,
  assigneeId: taskTemplates.assigneeId,
  assigneeName: user.name,
  priority: taskTemplates.priority,
  estimatedMinutes: taskTemplates.estimatedMinutes,
  repeat: taskTemplates.repeat,
  repeatDay: taskTemplates.repeatDay,
  dueOffsetDays: taskTemplates.dueOffsetDays,
  active: taskTemplates.active,
};

/** Every template, repeating ones first then alphabetical — the manager list
 *  and the composer's "From template" picker read the same rows. */
export async function listTaskTemplates(): Promise<TaskTemplateRow[]> {
  return db
    .select(templateSelection)
    .from(taskTemplates)
    .innerJoin(taskCategories, eq(taskTemplates.categoryId, taskCategories.id))
    .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
    .leftJoin(user, eq(taskTemplates.assigneeId, user.id))
    .orderBy(
      // Scheduled templates run themselves and are the ones worth auditing;
      // hand-spawned ones are a menu, so they read best alphabetically.
      sql`case when ${taskTemplates.repeat} = 'none' then 1 else 0 end`,
      asc(taskTemplates.name),
    );
}

export async function getTaskTemplate(
  id: string,
): Promise<TaskTemplateRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select(templateSelection)
    .from(taskTemplates)
    .innerJoin(taskCategories, eq(taskTemplates.categoryId, taskCategories.id))
    .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
    .leftJoin(user, eq(taskTemplates.assigneeId, user.id))
    .where(eq(taskTemplates.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Active templates whose schedule falls on `dayKey` — the recurring cron's
 * one read. Matching happens in JS against the caller's already-computed
 * Vancouver weekday and day-of-month rather than in SQL, for the same reason
 * every other calendar decision here does: one timezone door, and no
 * `AT TIME ZONE` scattered through the query layer.
 */
export async function listTemplatesDueOn(
  weekday: number,
  dayOfMonth: number,
): Promise<TaskTemplateRow[]> {
  const rows = await db
    .select(templateSelection)
    .from(taskTemplates)
    .innerJoin(taskCategories, eq(taskTemplates.categoryId, taskCategories.id))
    .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
    .leftJoin(user, eq(taskTemplates.assigneeId, user.id))
    .where(
      and(
        eq(taskTemplates.active, true),
        ne(taskTemplates.repeat, 'none'),
        // An archived category can't be minted into — the create form
        // wouldn't offer it, so a cron shouldn't sneak past that rule.
        eq(taskCategories.archived, false),
      ),
    );
  return rows.filter((row) =>
    row.repeat === 'weekly'
      ? row.repeatDay === weekday
      : row.repeatDay === dayOfMonth,
  );
}

/** How many templates reference a category — the archive/delete guard, same
 *  shape as the tasks in-use count. */
export async function countTemplatesInCategory(
  categoryId: string,
): Promise<number> {
  if (!UUID_RE.test(categoryId)) return 0;
  const [row] = await db
    .select({ total: count() })
    .from(taskTemplates)
    .where(eq(taskTemplates.categoryId, categoryId));
  return row?.total ?? 0;
}

// ── Saved views ─────────────────────────────────────────────────────────────

export type TaskViewItem = {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  /** True when the viewer owns it — only an owner may rename or delete. */
  mine: boolean;
  ownerName: string;
};

/** This member's saved views plus every shared one, own views first then
 *  oldest-first within each group (a stable, non-surprising order). */
export async function listTaskViews(userId: string): Promise<TaskViewItem[]> {
  const rows = await db
    .select({
      id: taskViews.id,
      userId: taskViews.userId,
      ownerName: taskViews.ownerName,
      name: taskViews.name,
      query: taskViews.query,
      shared: taskViews.shared,
    })
    .from(taskViews)
    .where(or(eq(taskViews.userId, userId), eq(taskViews.shared, true)))
    .orderBy(asc(taskViews.createdAt));

  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      query: row.query,
      shared: row.shared,
      mine: row.userId === userId,
      ownerName: row.ownerName,
    }))
    .sort((a, b) => Number(b.mine) - Number(a.mine));
}

// ── Form autocomplete ───────────────────────────────────────────────────────
// Two small maps the task page hands to the composer so picking a client can
// fill in what history already knows. Both are precomputed server-side with
// the rest of the options — a per-keystroke round trip for a *default* would
// cost more than the default is worth.

/** The category most recently used on each client, keyed by client id.
 *  `'internal'` keys the null-client (Perseus) row. */
export type ClientTaskDefaults = Record<string, { categoryId: string }>;

/**
 * The last category each client's work was filed under. DISTINCT ON is the
 * Postgres-native "latest row per group" — one index-ordered pass, no window
 * function and no N+1. Archived categories are excluded: suggesting a
 * category the create form can't offer would silently do nothing.
 */
export async function listClientTaskDefaults(): Promise<ClientTaskDefaults> {
  const rows = await db
    .selectDistinctOn([tasks.clientId], {
      clientId: tasks.clientId,
      categoryId: tasks.categoryId,
    })
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .where(eq(taskCategories.archived, false))
    .orderBy(tasks.clientId, desc(tasks.createdAt));

  return Object.fromEntries(
    rows.map((row) => [
      row.clientId ?? 'internal',
      { categoryId: row.categoryId },
    ]),
  );
}

/** Median minutes for a kind of work, plus how many tasks that median rests
 *  on. Keys are `${clientId|'internal'}:${categoryId}`, with a bare
 *  `${categoryId}` fallback for work this client hasn't done before. */
export type EstimateHints = Record<string, { minutes: number; sample: number }>;

/** Below this, a "typical" number is one person's guess, not a pattern. */
const ESTIMATE_MIN_SAMPLE = 3;
/** Half a year — old enough to have a pattern, recent enough to reflect how
 *  the studio works now. */
const ESTIMATE_WINDOW_DAYS = 180;

/**
 * Typical durations by client+category and by category alone, from completed
 * work in the last half-year. Median via percentile_cont, not average: one
 * ten-hour shoot in a set of thirty-minute edits would drag a mean into a
 * suggestion nobody would accept.
 *
 * Two grouped SELECTs over the same window, merged in JS. Both are bounded by
 * (clients × categories), so this stays a small map even at many times the
 * current volume.
 */
export async function listEstimateHints(): Promise<EstimateHints> {
  const since = vancouverDayStart(
    shiftDayKey(vancouverDayKey(new Date()), -ESTIMATE_WINDOW_DAYS),
  );
  // The value a task actually took — the same `actual ?? estimate` resolution
  // every report aggregate uses, so a suggestion agrees with the numbers the
  // member sees elsewhere.
  const minutes = sql<number>`percentile_cont(0.5) within group (order by coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes}))`;
  const done = and(eq(tasks.status, 'done'), gte(tasks.completedAt, since));

  const [pairs, categoriesOnly] = await Promise.all([
    db
      .select({
        clientId: tasks.clientId,
        categoryId: tasks.categoryId,
        minutes: minutes.mapWith(Number),
        sample: count(tasks.id),
      })
      .from(tasks)
      .where(done)
      .groupBy(tasks.clientId, tasks.categoryId)
      .having(gte(count(tasks.id), ESTIMATE_MIN_SAMPLE)),
    db
      .select({
        categoryId: tasks.categoryId,
        minutes: minutes.mapWith(Number),
        sample: count(tasks.id),
      })
      .from(tasks)
      .where(done)
      .groupBy(tasks.categoryId)
      .having(gte(count(tasks.id), ESTIMATE_MIN_SAMPLE)),
  ]);

  const hints: EstimateHints = {};
  for (const row of categoriesOnly) {
    hints[row.categoryId] = {
      minutes: Math.round(row.minutes),
      sample: row.sample,
    };
  }
  // Client-specific keys are namespaced by the ':' and so can't collide with
  // the bare category ids above; the more specific key wins at lookup time.
  for (const row of pairs) {
    hints[`${row.clientId ?? 'internal'}:${row.categoryId}`] = {
      minutes: Math.round(row.minutes),
      sample: row.sample,
    };
  }
  return hints;
}
