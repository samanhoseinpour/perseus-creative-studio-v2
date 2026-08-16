import 'server-only';

import {
  getReportClientBySlug,
  listClientMonthTasks,
  listTasksForExport,
  resolveTaskFilters,
  type TaskListRow,
} from '@/db/taskQueries';
import { toCsv } from '@/lib/csv';
import {
  INTERNAL_CLIENT_LABEL,
  minutesToDecimalHours,
} from '@/lib/taskFields';
import {
  parseMonthToken,
  parseTaskListParams,
  resolveTaskView,
  vancouverDayKey,
  vancouverMonthWindow,
} from '@/lib/taskFilters';

/**
 * CSV exports for the task surface (adminExport.ts's shape, kept separate so
 * that module stays submissions-only). Two surfaces:
 *  - /admin/tasks/export — the working list, honoring the URL's view+filters;
 *  - /admin/reports/[slug]/export — one client's month, the report snapshot.
 * Routes self-gate with requireArea and delegate here.
 *
 * Param strictness follows the house rule: an ABSENT or shape-invalid filter
 * silently defaults like the list page, but a PRESENT-and-malformed `month`
 * is a 400 — a typo must never silently widen the dataset. The report export
 * REQUIRES a month (it is definitionally a month snapshot).
 */

type Column = { header: string; cell: (row: TaskListRow) => string | null };

/** Null passthrough over the taskFields decimal door (no local ×60 math —
 *  the conversion-door contract applies to exports too). */
const hours = (minutes: number | null): string | null =>
  minutes === null ? null : minutesToDecimalHours(minutes);

const SHARED_COLUMNS: Column[] = [
  { header: 'title', cell: (r) => r.title },
  { header: 'client', cell: (r) => r.clientName ?? INTERNAL_CLIENT_LABEL },
  { header: 'category', cell: (r) => r.categoryName },
  { header: 'site_category', cell: (r) => r.siteCategory },
  { header: 'assignee', cell: (r) => r.assigneeName },
];

const TASKS_COLUMNS: Column[] = [
  { header: 'id', cell: (r) => r.id },
  { header: 'created_at', cell: (r) => r.createdAt.toISOString() },
  { header: 'status', cell: (r) => r.status },
  { header: 'priority', cell: (r) => r.priority },
  ...SHARED_COLUMNS,
  { header: 'estimated_hours', cell: (r) => hours(r.estimatedMinutes) },
  { header: 'actual_hours', cell: (r) => hours(r.actualMinutes) },
  { header: 'start_date', cell: (r) => r.startDate },
  { header: 'due_date', cell: (r) => r.dueDate },
  { header: 'deliverable_url', cell: (r) => r.deliverableUrl },
  { header: 'completed_at', cell: (r) => r.completedAt?.toISOString() ?? null },
  // Vancouver calendar day — spreadsheet month-grouping without tz math.
  {
    header: 'completed_date_pt',
    cell: (r) => (r.completedAt ? vancouverDayKey(r.completedAt) : null),
  },
  { header: 'notes', cell: (r) => r.notes },
];

// No `notes` here on purpose: this CSV downloads from the client report page
// and travels with the PDF — descriptions are internal working context and
// must not ship to clients (they stay in TASKS_COLUMNS, the internal export).
const REPORT_COLUMNS: Column[] = [
  { header: 'completed_at', cell: (r) => r.completedAt?.toISOString() ?? null },
  {
    header: 'completed_date_pt',
    cell: (r) => (r.completedAt ? vancouverDayKey(r.completedAt) : null),
  },
  ...SHARED_COLUMNS,
  { header: 'actual_hours', cell: (r) => hours(r.actualMinutes) },
  { header: 'estimated_hours', cell: (r) => hours(r.estimatedMinutes) },
  { header: 'deliverable_url', cell: (r) => r.deliverableUrl },
];

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function csvResponse(
  columns: Column[],
  rows: TaskListRow[],
  filename: string,
): Response {
  const csv = toCsv(
    columns.map((c) => c.header),
    rows.map((row) => columns.map((c) => c.cell(row))),
  );
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/** `?d=` is the CLIENT's local date for the filename stamp (a Vancouver
 *  evening ≠ UTC tomorrow) — strictly validated. The fallback is the STUDIO
 *  calendar day, not the UTC one: no caller currently sends ?d=, and a
 *  server-UTC fallback would stamp tomorrow's date on evening exports. */
function filenameDate(raw: string): string {
  return LOCAL_DATE_RE.test(raw) ? raw : vancouverDayKey(new Date());
}

export async function exportTasksCsv(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const get = (name: string) => url.searchParams.get(name) ?? '';

  const monthRaw = get('month');
  if (monthRaw && !parseMonthToken(monthRaw)) {
    return new Response('Bad request', { status: 400 });
  }

  const view = resolveTaskView(get('status'));
  const params = parseTaskListParams(get);
  const filters = await resolveTaskFilters(params, view);
  // Unknown client/category slug → the list's honest-empty, as a header-only
  // CSV (absent data is not an error; only malformed input is).
  const rows = filters
    ? await listTasksForExport({ view, filters, sort: params.sort })
    : [];

  const scope = params.month && view === 'done' ? params.month : view;
  const filename = `perseus-tasks-${scope}-${filenameDate(get('d'))}.csv`;
  return csvResponse(TASKS_COLUMNS, rows, filename);
}

export async function exportClientReportCsv(
  request: Request,
  slug: string,
): Promise<Response> {
  const url = new URL(request.url);
  const month = parseMonthToken(url.searchParams.get('month') ?? '');
  if (!month) return new Response('Bad request', { status: 400 });

  // Slug shape is guarded inside getReportClientBySlug; both malformed and
  // unknown resolve to null → 404 (a report URL names an entity).
  const client = await getReportClientBySlug(slug);
  if (!client) return new Response('Not found', { status: 404 });

  const window = vancouverMonthWindow(month);
  if (!window) return new Response('Bad request', { status: 400 });

  const rows = await listClientMonthTasks(client.id, window);
  return csvResponse(
    REPORT_COLUMNS,
    rows,
    `perseus-report-${client.slug}-${month}.csv`,
  );
}
