import {
  isTaskPriority,
  type TaskPrioritySlug,
  type TaskStatusSlug,
  TASK_STATUS_SLUGS,
} from '@/lib/taskFields';

/**
 * URL-state contract for /admin/tasks (list + digest views) plus the
 * America/Vancouver calendar math shared by the list page, the digest, both
 * CSV exports, and /admin/reports' month switcher. A zero-runtime-dependency
 * leaf (inboxFilters.ts pattern — taskFields is itself a leaf) so client
 * components can import it without dragging anything server-only into their
 * chunk.
 *
 * Canonical param order: status, view, q, client, category, assignee,
 * priority, month, sort, page. Defaults are dropped from the URL. `month` is a reporting
 * concept: it is parsed and carried on every view, but only the Done view
 * applies it (as a completedAt window) — working views are not date-filtered
 * in v1.
 *
 * Why Vancouver, not UTC: "August" in every report means the studio's August.
 * A task completed Aug 31 at 21:30 PT is 04:30 UTC on Sep 1 — a UTC window
 * would leak it into September. All month/day boundaries below are computed in
 * America/Vancouver via Intl (no tz library), DST-correct.
 */

// ── Views (status tabs) ─────────────────────────────────────────────────────

export type TaskView = 'open' | 'todo' | 'in_progress' | 'done' | 'all';

/** 'open' (todo + in progress) is the default tab — the working set. */
export const TASK_VIEW_STATUSES: Record<TaskView, readonly TaskStatusSlug[]> = {
  open: ['todo', 'in_progress'],
  todo: ['todo'],
  in_progress: ['in_progress'],
  done: ['done'],
  all: TASK_STATUS_SLUGS,
};

const TASK_VIEWS = ['open', 'todo', 'in_progress', 'done', 'all'] as const;

export function resolveTaskView(value: string): TaskView {
  return (TASK_VIEWS as readonly string[]).includes(value)
    ? (value as TaskView)
    : 'open';
}

// ── List params ─────────────────────────────────────────────────────────────

export type TaskSort = 'newest' | 'oldest' | 'due' | 'priority';

/** Everything the list URL carries besides the status tab + page + view. */
export type TaskListParams = {
  q: string;
  /** Client slug, or the literal 'internal' for no-client work. */
  client: string;
  category: string;
  /** Assignee user id — Better Auth ids are opaque text, not uuids. The
   *  "Mine" chip writes the viewer's real id so URLs stay shareable. */
  assignee: string;
  /** Priority facet — a slug or '' for all. */
  priority: TaskPrioritySlug | '';
  /** Validated YYYY-MM token (Done view only applies it). */
  month: string;
  sort: TaskSort;
};

const Q_MAX_LENGTH = 200;
const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function parseSlugParam(value: string): string {
  return SLUG_RE.test(value) ? value : '';
}

/**
 * Parse the filter params from any URL-ish source — pages pass
 * `(k) => firstParam(sp[k])`, route handlers `(k) => url.searchParams.get(k) ?? ''`.
 * Invalid values fall back to defaults silently (admin working URLs — nothing
 * to redirect or 404 over).
 */
export function parseTaskListParams(
  get: (name: string) => string,
): TaskListParams {
  const client = get('client');
  const priority = get('priority');
  const sort = get('sort');
  return {
    q: get('q').trim().slice(0, Q_MAX_LENGTH),
    client: client === 'internal' ? client : parseSlugParam(client),
    category: parseSlugParam(get('category')),
    assignee: USER_ID_RE.test(get('assignee')) ? get('assignee') : '',
    priority: isTaskPriority(priority) ? priority : '',
    month: parseMonthToken(get('month')),
    sort:
      sort === 'oldest' || sort === 'due' || sort === 'priority'
        ? sort
        : 'newest',
  };
}

const DEFAULT_PARAMS: TaskListParams = {
  q: '',
  client: '',
  category: '',
  assignee: '',
  priority: '',
  month: '',
  sort: 'newest',
};

/**
 * Canonical query string (no leading `?`): fixed key order, defaults dropped,
 * `page` appended last and only when > 1. `digest: true` serializes the same
 * filters for the digest view (which ignores page/sort) so the List↔Digest
 * segmented links carry the working filter set across.
 */
export function taskListQs(
  view: TaskView,
  params: Partial<TaskListParams>,
  page?: number,
  digest?: boolean,
): string {
  const p = { ...DEFAULT_PARAMS, ...params };
  const qs = new URLSearchParams();
  if (view !== 'open') qs.set('status', view);
  if (digest) qs.set('view', 'digest');
  if (p.q) qs.set('q', p.q);
  if (p.client) qs.set('client', p.client);
  if (p.category) qs.set('category', p.category);
  if (p.assignee) qs.set('assignee', p.assignee);
  if (p.priority) qs.set('priority', p.priority);
  if (p.month) qs.set('month', p.month);
  if (p.sort !== 'newest') qs.set('sort', p.sort);
  if (!digest && page && page > 1) qs.set('page', String(page));
  return qs.toString();
}

/** True when anything beyond the status tab + sort narrows the list. */
export function hasActiveTaskFilters(params: TaskListParams): boolean {
  return Boolean(
    params.q ||
      params.client ||
      params.category ||
      params.assignee ||
      params.priority ||
      params.month,
  );
}

/**
 * The filter shape the query builder consumes (tasksWhere in taskQueries.ts).
 * Declared here, not there, so client components can share the type without
 * an adminQueries-style value import. Slugs become ids in the async
 * resolveTaskFilters hop (taskQueries) — this leaf stays sync and DB-free.
 */
export type TaskFilters = {
  q?: string;
  /** Resolved client uuid, or 'internal' for the null-client facet. */
  clientId?: string;
  categoryId?: string;
  assigneeId?: string;
  priority?: TaskPrioritySlug;
  completedSince?: Date;
  completedUntil?: Date;
};

// ── America/Vancouver calendar math ─────────────────────────────────────────

const VANCOUVER_TZ = 'America/Vancouver';

/** Years 2000–2099 keep the regex honest without being a real constraint. */
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** Canonical YYYY-MM token, or '' when malformed (silent-default rule). */
export function parseMonthToken(value: string): string {
  return MONTH_RE.test(value) ? value : '';
}

const PARTS_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: VANCOUVER_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function vancouverParts(at: Date): Record<string, string> {
  return Object.fromEntries(
    PARTS_FORMAT.formatToParts(at).map((p) => [p.type, p.value]),
  );
}

/** The tz's UTC offset in minutes at a given UTC instant (negative for
 *  Vancouver: -420 PDT / -480 PST). */
function tzOffsetMinutes(at: Date): number {
  const p = vancouverParts(at);
  const asUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    // h23 should never emit "24", but some ICU builds have; %24 is inert
    // belt-and-braces.
    +p.hour % 24,
    +p.minute,
    +p.second,
  );
  return (asUtc - at.getTime()) / 60_000;
}

/**
 * UTC instant of Vancouver-local midnight on (year, month, day) — month is
 * 1-based; out-of-range day/month values normalize through Date.UTC (so
 * (2026, 13, 1) is Jan 1 2027, which the month-window math leans on).
 *
 * Two-pass offset correction: guess local-midnight-as-UTC, correct by the
 * offset at the guess, re-correct once at the corrected instant. Vancouver's
 * offset shifts at 02:00 local — never at midnight — so the second pass
 * always lands exactly.
 */
function vancouverMidnightUtc(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - tzOffsetMinutes(new Date(guess)) * 60_000;
  const second = guess - tzOffsetMinutes(new Date(first)) * 60_000;
  return new Date(second);
}

/**
 * `since` inclusive, `until` exclusive — ready for gte/lt on completedAt.
 * Null when the token is malformed (callers default silently or 400, per
 * surface). DST months come out 1h short/long by design — they are.
 */
export function vancouverMonthWindow(
  token: string,
): { since: Date; until: Date } | null {
  if (!MONTH_RE.test(token)) return null;
  const [year, month] = token.split('-').map(Number);
  return {
    since: vancouverMidnightUtc(year, month, 1),
    until: vancouverMidnightUtc(year, month + 1, 1),
  };
}

/** The CURRENT Vancouver month as a YYYY-MM token. */
export function monthToken(now: Date = new Date()): string {
  const p = vancouverParts(now);
  return `${p.year}-${p.month}`;
}

/** Pure string math for prev/next month links — no tz involvement. */
export function shiftMonthToken(token: string, delta: number): string {
  if (!MONTH_RE.test(token)) return token;
  const [year, month] = token.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** YYYY-MM-DD in Vancouver — digest day-grouping keys, the CSV's
 *  completed_date_pt column, and due-date "today" comparisons. */
export function vancouverDayKey(at: Date): string {
  const p = vancouverParts(at);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Vancouver midnight (days - 1) days back — the digest's rolling window. */
export function vancouverRecentSince(
  days: number,
  now: Date = new Date(),
): Date {
  const p = vancouverParts(now);
  return vancouverMidnightUtc(+p.year, +p.month, +p.day - (days - 1));
}
