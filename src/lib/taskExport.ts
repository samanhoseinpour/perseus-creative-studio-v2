import 'server-only';

import {
  getReportClientBySlug,
  listClientMonthTasks,
  listTasksForExport,
  resolveTaskFilters,
  type TaskListRow,
  type TaskBoardRow,
} from '@/db/taskQueries';
import { toCsv } from '@/lib/csv';
import {
  INTERNAL_CLIENT_LABEL,
  minutesToDecimalHours,
  type TaskLink,
} from '@/lib/taskFields';
import {
  TASK_MONTH_ALL,
  coerceTaskView,
  isMonthScoped,
  isRangeAllowed,
  isShippedView,
  isTaskDateField,
  parseTaskListParams,
  parseTaskMonth,
  resolveTaskDateField,
  resolveTaskView,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  monthTokenIn,
  monthWindowIn,
  parseMonthToken,
} from '@/lib/calendar';
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

/** Generic over the row so the internal export can add columns the report
 *  export structurally cannot reach — `tags` only exists on
 *  TaskBoardRow, and listClientMonthTasks does not return that type. */
type Column<R = TaskListRow> = {
  header: string;
  cell: (row: R) => string | null;
};

/** Shape gate for the facet's custom bounds — calendar validity is the
 *  parser's job, this only rejects an obviously malformed param. */
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Null passthrough over the taskFields decimal door (no local ×60 math —
 *  the conversion-door contract applies to exports too). */
const hours = (minutes: number | null): string | null =>
  minutes === null ? null : minutesToDecimalHours(minutes);

/** A task's deliverable links as one cell. Null rather than '' at zero, so an
 *  empty cell reads the same as every other absent value on the sheet. */
const joinLinks = (links: TaskLink[]): string | null =>
  links.length === 0 ? null : links.map((link) => link.url).join('; ');

const SHARED_COLUMNS: Column[] = [
  { header: 'title', cell: (r) => r.title },
  { header: 'client', cell: (r) => r.clientName ?? INTERNAL_CLIENT_LABEL },
  { header: 'category', cell: (r) => r.categoryName },
  { header: 'site_category', cell: (r) => r.siteCategory },
  // Plural, and semicolon-joined for the `tags` column's reason: the value has
  // to read in one cell without leaning on the quoting. A task can be crewed
  // by several people, and a spreadsheet that shows only the first name is a
  // worse answer than one that shows all of them.
  {
    header: 'assignees',
    // Semicolons, NOT assigneeNames' commas: that formatter is for prose (a
    // report cell, an aria-label) and a comma inside a CSV value forces the
    // whole field to be quoted, which is exactly what the `tags` column below
    // avoids by joining the same way.
    cell: (r) =>
      r.assignees.length ? r.assignees.map((a) => a.name).join('; ') : null,
  },
];

/**
 * `completed_date` is the calendar day the instant falls on in the EXPORTER's
 * zone — spreadsheet month-grouping without tz math, matching what they saw on
 * screen. (It was `completed_date_pt` while every reader was assumed to be on
 * Pacific time; the suffix would now be a lie.) `completed_at` beside it is the
 * unambiguous ISO instant, so nothing is lost either way.
 */
const tasksColumns = (tz: string): Column<TaskBoardRow>[] => [
  { header: 'id', cell: (r) => r.id },
  { header: 'created_at', cell: (r) => r.createdAt.toISOString() },
  { header: 'status', cell: (r) => r.status },
  { header: 'priority', cell: (r) => r.priority },
  ...SHARED_COLUMNS,
  { header: 'estimated_hours', cell: (r) => hours(r.estimatedMinutes) },
  { header: 'actual_hours', cell: (r) => hours(r.actualMinutes) },
  { header: 'start_date', cell: (r) => r.startDate },
  { header: 'due_date', cell: (r) => r.dueDate },
  // Plural since a task carries a LIST now. Semicolons, not commas, so the
  // value reads in one cell without leaning on the quoting (the `tags` column
  // below does the same). Bare urls, no names: a spreadsheet wants the value
  // it can click, and the names are visible everywhere in the app.
  { header: 'deliverable_urls', cell: (r) => joinLinks(r.deliverableLinks) },
  // Empty on a deliverable, the revised task's title on a revision. Without
  // it a spreadsheet counting rows disagrees with every "tasks delivered"
  // figure in the app, with nothing on the sheet to explain the gap.
  { header: 'revision_of', cell: (r) => r.parentTitle || null },
  // Days parked in client sign-off, blank on every other status. Internal
  // only — it measures the CLIENT's response time, which is exactly the kind
  // of thing that must never travel back to them on a report.
  {
    header: 'waiting_days',
    cell: (r) =>
      r.waitingSince
        ? String(
            Math.max(
              0,
              Math.round(
                (Date.now() - r.waitingSince.getTime()) / 86_400_000,
              ),
            ),
          )
        : null,
  },
  { header: 'completed_at', cell: (r) => r.completedAt?.toISOString() ?? null },
  {
    header: 'completed_date',
    cell: (r) => (r.completedAt ? dayKeyIn(tz, r.completedAt) : null),
  },
  // The day the client got it, on a delivered or posted row. Already a
  // calendar day in the column, so unlike completed_at it needs no zone —
  // which is also why there is only one of it and not an instant/day pair.
  { header: 'released_on', cell: (r) => r.releasedOn },
  // Internal-only, like `notes` below it: tags are the studio's craft
  // vocabulary, not something a client asked for. Semicolons, not commas, so
  // the value reads in one cell without leaning on the quoting.
  {
    header: 'tags',
    cell: (r) => (r.tags.length ? r.tags.map((t) => t.name).join('; ') : null),
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
  // Beside the `stage` column below, which says WHICH kind of day this is.
  { header: 'released_on', cell: (r) => r.releasedOn },
  ...SHARED_COLUMNS,
  // The stage the work has reached: done, delivered or posted. This file used
  // to carry no status column at all, on the grounds that it was done-only by
  // construction — true when 'done' was the whole of "shipped", and no longer.
  // The rows are still every shipped status and nothing else, so the column
  // says how far along each is rather than whether it counts.
  { header: 'stage', cell: (r) => r.status },
  // A flag rather than the revised task's title, because this sheet is built
  // from listClientMonthTasks — the BASE row, deliberately, so nothing
  // internal can reach a client surface. Resolving a title would mean
  // widening that reader, and the flag already does the one job needed here:
  // reconciling the row count with the report's "tasks completed" tile.
  { header: 'revision', cell: (r) => (r.parentId ? 'yes' : null) },
  { header: 'actual_hours', cell: (r) => hours(r.actualMinutes) },
  { header: 'estimated_hours', cell: (r) => hours(r.estimatedMinutes) },
  { header: 'deliverable_urls', cell: (r) => joinLinks(r.deliverableLinks) },
];

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function csvResponse<R>(
  columns: Column<R>[],
  rows: R[],
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
  if (monthRaw && monthRaw !== TASK_MONTH_ALL && !parseMonthToken(monthRaw)) {
    return new Response('Bad request', { status: 400 });
  }
  const requested = resolveTaskView(get('status'));
  const dfieldRaw = get('dfield');
  if (dfieldRaw && !isTaskDateField(dfieldRaw)) {
    return new Response('Bad request', { status: 400 });
  }
  const drangeRaw = get('drange');
  if (
    drangeRaw &&
    // A literal YYYY-MM is the month's OLD spelling, from back when it was a
    // value of the date facet. The facet refuses it now and the scope parser
    // below reads it instead, so it has to be tolerated HERE rather than 400'd
    // — every export URL bookmarked or saved before the month became a scope
    // still carries it, and rejecting them is not a typo caught, it is a file
    // someone used to be able to download.
    !parseMonthToken(drangeRaw) &&
    !isRangeAllowed(resolveTaskDateField(dfieldRaw, requested), drangeRaw)
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
  // The same scope the board resolves, so a download matches the screen it was
  // started from. An ABSENT month defaults exactly as the list page does — to
  // the current month — which is what makes the default correct rather than
  // merely quiet: taskScopeQs drops the month from the URL precisely when it is
  // that default, so the two agree by construction.
  const currentMonth = monthTokenIn(tz, new Date());
  const month = parseTaskMonth(get, { digest: false, currentMonth });
  const view = coerceTaskView(requested, month, currentMonth);
  const filters = await resolveTaskFilters(tz, params, view, month);
  // Unknown client/category slug → the list's honest-empty, as a header-only
  // CSV (absent data is not an error; only malformed input is).
  const rows = filters
    ? await listTasksForExport({ view, filters, sort: params.sort })
    : [];

  // A whole-month delivery export names itself by that month; anything else
  // (All time, or a working tab, whose rows are "now" rather than a month)
  // names itself by the tab. Read from the SCOPE, not from `params.drange`:
  // the month stopped living there when it stopped being a filter, and left
  // where it was this would silently rename every month export.
  const scope = isMonthScoped(month) && isShippedView(view) ? month : view;
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
