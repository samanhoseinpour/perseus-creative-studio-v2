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
  isRangeAllowed,
  isTaskDateField,
  parseTaskListParams,
  resolveTaskDateField,
  resolveTaskView,
} from '@/lib/taskFilters';
import { dayKeyIn, monthWindowIn, parseMonthToken } from '@/lib/calendar';
import { viewerZone } from '@/lib/adminAccess';

/**
 * CSV exports for the task surface (adminExport.ts's shape, kept separate so
 * that module stays submissions-only). Two surfaces:
 *  - /admin/tasks/export — the working list, honoring the URL's view+filters;
 *  - /admin/reports/[slug]/export — one client's month, the report snapshot.
 * Routes self-gate with requireArea and delegate here.
 *
 * Param strictness follows the house rule: an ABSENT filter silently defaults
 * like the list page, but a PRESENT-and-malformed one (`month`, or any of the
 * date facet's `dfield`/`drange`/`from`/`to`) is a 400 — a typo must never
 * silently widen a file someone will believe. The report export REQUIRES a
 * month (it is definitionally a month snapshot).
 */

type Column = { header: string; cell: (row: TaskListRow) => string | null };

/** Shape gate for the facet's custom bounds — calendar validity is the
 *  parser's job, this only rejects an obviously malformed param. */
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * `completed_date` is the calendar day the instant falls on in the EXPORTER's
 * zone — spreadsheet month-grouping without tz math, matching what they saw on
 * screen. (It was `completed_date_pt` while every reader was assumed to be on
 * Pacific time; the suffix would now be a lie.) `completed_at` beside it is the
 * unambiguous ISO instant, so nothing is lost either way.
 */
const tasksColumns = (tz: string): Column[] => [
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
  {
    header: 'completed_date',
    cell: (r) => (r.completedAt ? dayKeyIn(tz, r.completedAt) : null),
  },
  { header: 'notes', cell: (r) => r.notes },
];

// No `notes` here on purpose: this CSV downloads from the client report page
// and travels with the PDF — descriptions are internal working context and
// must not ship to clients (they stay in tasksColumns, the internal export).
const reportColumns = (tz: string): Column[] => [
  { header: 'completed_at', cell: (r) => r.completedAt?.toISOString() ?? null },
  {
    header: 'completed_date',
    cell: (r) => (r.completedAt ? dayKeyIn(tz, r.completedAt) : null),
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

/** `?d=` is the CLIENT's local date for the filename stamp — strictly
 *  validated. The fallback is the exporter's own calendar day, not the UTC
 *  one: no caller currently sends ?d=, and a server-UTC fallback would stamp
 *  tomorrow's date on an evening export. */
function filenameDate(raw: string, tz: string): string {
  return LOCAL_DATE_RE.test(raw) ? raw : dayKeyIn(tz, new Date());
}

export async function exportTasksCsv(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const get = (name: string) => url.searchParams.get(name) ?? '';

  // House rule: an ABSENT filter silently defaults, but a present-and-malformed
  // one is a 400. Everywhere else a typo just widens the view you're looking
  // at; here it would hand you a file you'd believe. Covers the legacy `month`
  // alias and the date facet's own params.
  const monthRaw = get('month');
  if (monthRaw && !parseMonthToken(monthRaw)) {
    return new Response('Bad request', { status: 400 });
  }
  const view = resolveTaskView(get('status'));
  const dfieldRaw = get('dfield');
  if (dfieldRaw && !isTaskDateField(dfieldRaw)) {
    return new Response('Bad request', { status: 400 });
  }
  const drangeRaw = get('drange');
  if (
    drangeRaw &&
    !isRangeAllowed(resolveTaskDateField(dfieldRaw, view), drangeRaw)
  ) {
    return new Response('Bad request', { status: 400 });
  }
  for (const key of ['from', 'to'] as const) {
    const raw = get(key);
    if (raw && !DAY_KEY_RE.test(raw)) {
      return new Response('Bad request', { status: 400 });
    }
  }

  const tz = await viewerZone();
  const params = parseTaskListParams(get);
  const filters = await resolveTaskFilters(tz, params, view);
  // Unknown client/category slug → the list's honest-empty, as a header-only
  // CSV (absent data is not an error; only malformed input is).
  const rows = filters
    ? await listTasksForExport({ view, filters, sort: params.sort })
    : [];

  // A whole-month delivery export names itself by that month; anything else
  // (a preset, a custom range, no window at all) names itself by the tab.
  const exportMonth = parseMonthToken(params.drange);
  const scope = exportMonth && view === 'done' ? exportMonth : view;
  const filename = `perseus-tasks-${scope}-${filenameDate(get('d'), tz)}.csv`;
  return csvResponse(tasksColumns(tz), rows, filename);
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

  const tz = await viewerZone();
  const window = monthWindowIn(tz, month);
  if (!window) return new Response('Bad request', { status: 400 });

  const rows = await listClientMonthTasks(client.id, window);
  return csvResponse(
    reportColumns(tz),
    rows,
    `perseus-report-${client.slug}-${month}.csv`,
  );
}
