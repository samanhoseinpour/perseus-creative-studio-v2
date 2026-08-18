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
 * priority, dfield, drange, from, to, sort, group, page. Defaults are dropped
 * from the URL.
 *
 * The date facet is one control over four columns: `dfield` picks which task
 * date to window (due / start / completed / created) and `drange` + `from`/`to`
 * pick the window. It replaces the old `due` (three deadline presets, working
 * views only) and `month` (Done view only) params, which are still PARSED as
 * legacy aliases but never re-serialized.
 *
 * `group` is a display preference, not a filter — it never narrows the list and
 * survives "Clear filters".
 *
 * Why Vancouver, not UTC: "August" in every report means the studio's August.
 * A task completed Aug 31 at 21:30 PT is 04:30 UTC on Sep 1 — a UTC window
 * would leak it into September. All month/day boundaries below are computed in
 * America/Vancouver via Intl (no tz library), DST-correct.
 */

// ── Views (status tabs) ─────────────────────────────────────────────────────

export type TaskView =
  | 'open'
  | 'todo'
  | 'in_progress'
  | 'needs_approval'
  | 'done'
  | 'all';

/** 'open' (everything not done — todo + in progress + needs approval) is the
 *  default tab: the working set, including tasks awaiting client sign-off. */
export const TASK_VIEW_STATUSES: Record<TaskView, readonly TaskStatusSlug[]> = {
  open: ['todo', 'in_progress', 'needs_approval'],
  todo: ['todo'],
  in_progress: ['in_progress'],
  needs_approval: ['needs_approval'],
  done: ['done'],
  all: TASK_STATUS_SLUGS,
};

const TASK_VIEWS = [
  'open',
  'todo',
  'in_progress',
  'needs_approval',
  'done',
  'all',
] as const;

export function resolveTaskView(value: string): TaskView {
  return (TASK_VIEWS as readonly string[]).includes(value)
    ? (value as TaskView)
    : 'open';
}

// ── The date facet ──────────────────────────────────────────────────────────

/** Which of the four task dates the facet windows. */
export type TaskDateField = 'due' | 'start' | 'completed' | 'created';

const TASK_DATE_FIELDS = ['due', 'start', 'completed', 'created'] as const;

export function isTaskDateField(value: string): value is TaskDateField {
  return (TASK_DATE_FIELDS as readonly string[]).includes(value);
}

/**
 * due/start look FORWARD (deadlines you are working toward); completed/created
 * look BACK (things that already happened). The same preset token mirrors: on
 * `due` "week" is the next seven days, on `completed` it is the last seven.
 * Labels flip with it, so the menu never reads backwards.
 */
export function isForwardDateField(field: TaskDateField): boolean {
  return field === 'due' || field === 'start';
}

/**
 * The Done tab is about delivery, every other tab about work still owed — so
 * each gets the date its rows actually carry. Because the effective field is
 * derived from the view, `dfield` stays out of the URL until it disagrees.
 */
export function defaultDateField(view: TaskView): TaskDateField {
  return view === 'done' ? 'completed' : 'due';
}

export function resolveTaskDateField(
  value: string,
  view: TaskView,
): TaskDateField {
  return isTaskDateField(value) ? value : defaultDateField(view);
}

const TASK_RANGE_PRESETS = [
  'today',
  'week',
  'd30',
  'month',
  'lastmonth',
  'overdue',
  'none',
] as const;

export type TaskRangePreset = (typeof TASK_RANGE_PRESETS)[number];

function isRangePreset(value: string): value is TaskRangePreset {
  return (TASK_RANGE_PRESETS as readonly string[]).includes(value);
}

/**
 * `drange` carries a preset token OR a literal YYYY-MM month token — the month
 * form is what keeps the Done tab's twelve-month picker alive inside the facet
 * instead of making a routine monthly lookup a custom-range chore.
 */
function parseRangeParam(value: string): string {
  return isRangePreset(value) || MONTH_RE.test(value) ? value : '';
}

/**
 * Not every preset means something on every field: a completion cannot be
 * "overdue", `created_at` is never null, and a bare month is a reporting window
 * rather than a deadline. One predicate governs the menu, the trigger label,
 * and the window resolver, so a token can never narrow the list while the chip
 * claims nothing is set (the withActiveOption lesson, applied to presets).
 */
export function isRangeAllowed(field: TaskDateField, token: string): boolean {
  if (!token) return true;
  const forward = isForwardDateField(field);
  if (token === 'overdue') return forward;
  if (token === 'none') return field !== 'created';
  if (MONTH_RE.test(token)) return !forward;
  return isRangePreset(token);
}

// ── List params ─────────────────────────────────────────────────────────────

export type TaskSort = 'newest' | 'oldest' | 'due' | 'priority';

/** List grouping — a view preference (section headers), never a filter.
 *  'due' buckets by deadline pressure, which is what "my day" is: the same
 *  board, sectioned into Overdue / Today / This week / Later / No date. */
export type TaskGroupBy = '' | 'client' | 'member' | 'due';

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
  /** Date facet: which column. '' means "whatever this view defaults to", so
   *  switching tabs re-points the facet instead of stranding it. */
  dfield: TaskDateField | '';
  /** Date facet: a preset token or a YYYY-MM month token. */
  drange: string;
  /** Custom window bounds as day keys, inclusive of both named days. */
  from: string;
  to: string;
  sort: TaskSort;
  group: TaskGroupBy;
};

/** Exported because the search box must clamp with the SAME rule the parser
 *  applies: a client that keeps sending a longer string than the URL can carry
 *  never sees its own value echoed back, so its settle check never settles. */
export const Q_MAX_LENGTH = 200;
const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSlugParam(value: string): string {
  return SLUG_RE.test(value) ? value : '';
}

/**
 * Shape-valid AND calendar-valid (inboxFilters' parseDateParam, verbatim). The
 * round-trip compare is load-bearing: V8 doesn't reject an out-of-range day in
 * the full ISO form — it rolls "2026-02-31" over to March 3 — so NaN-checking
 * alone would let a phantom date through to the query window.
 */
function parseDayKeyParam(value: string): string {
  if (!DAY_KEY_RE.test(value)) return '';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10) === value ? value : '';
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
  const group = get('group');

  const from = parseDayKeyParam(get('from'));
  const to = parseDayKeyParam(get('to'));
  let dfield = get('dfield');
  // A custom bound wins over a preset so the URL never carries two windows
  // (inboxFilters' rule) — the facet writes one or the other, never both.
  let drange = from || to ? '' : parseRangeParam(get('drange'));

  // Legacy aliases: `?due=` and `?month=` predate the unified facet. Parsed so
  // old bookmarks and emailed deep links keep working, never re-serialized —
  // taskListQs only ever writes the new vocabulary.
  if (!dfield && !drange && !from && !to) {
    const legacyDue = get('due');
    const legacyMonth = parseMonthToken(get('month'));
    if (legacyDue === 'overdue' || legacyDue === 'today') {
      dfield = 'due';
      drange = legacyDue;
    } else if (legacyDue === 'week') {
      dfield = 'due';
      drange = 'week';
    } else if (legacyMonth) {
      dfield = 'completed';
      drange = legacyMonth;
    }
  }

  return {
    q: get('q').trim().slice(0, Q_MAX_LENGTH),
    client: client === 'internal' ? client : parseSlugParam(client),
    category: parseSlugParam(get('category')),
    assignee: USER_ID_RE.test(get('assignee')) ? get('assignee') : '',
    priority: isTaskPriority(priority) ? priority : '',
    dfield: isTaskDateField(dfield) ? dfield : '',
    drange,
    from,
    to,
    sort:
      sort === 'oldest' || sort === 'due' || sort === 'priority'
        ? sort
        : 'newest',
    group:
      group === 'client' || group === 'member' || group === 'due' ? group : '',
  };
}

const DEFAULT_PARAMS: TaskListParams = {
  q: '',
  client: '',
  category: '',
  assignee: '',
  priority: '',
  dfield: '',
  drange: '',
  from: '',
  to: '',
  sort: 'newest',
  group: '',
};

/**
 * True when the date facet is actually windowing something on this view — an
 * inapplicable preset (say `overdue` carried onto the Done tab) narrows
 * nothing, so it must not count as active either.
 */
function hasDateWindow(params: TaskListParams, view: TaskView): boolean {
  if (params.from || params.to) return true;
  if (!params.drange) return false;
  return isRangeAllowed(resolveTaskDateField(params.dfield, view), params.drange);
}

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

  // The digest's window IS its rolling N days, so a past-facing field can only
  // fight it — the same reason `month` used to be suppressed here. Forward
  // fields still narrow honestly, so those keep working.
  const field = resolveTaskDateField(p.dfield, view);
  const dateOk = !digest || isForwardDateField(field);
  if (dateOk && (p.drange || p.from || p.to)) {
    if (field !== defaultDateField(view)) qs.set('dfield', field);
    if (p.from || p.to) {
      if (p.from) qs.set('from', p.from);
      if (p.to) qs.set('to', p.to);
    } else if (isRangeAllowed(field, p.drange)) {
      qs.set('drange', p.drange);
    }
  }

  if (p.sort !== 'newest') qs.set('sort', p.sort);
  if (p.group) qs.set('group', p.group);
  if (!digest && page && page > 1) qs.set('page', String(page));
  return qs.toString();
}

/** True when anything beyond the status tab + sort narrows the list —
 *  `group` is excluded on purpose (it reorders, never narrows). */
export function hasActiveTaskFilters(
  params: TaskListParams,
  view: TaskView = 'open',
): boolean {
  return Boolean(
    params.q ||
      params.client ||
      params.category ||
      params.assignee ||
      params.priority ||
      hasDateWindow(params, view),
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
  /** completed_at / created_at are timestamptz — real instants. */
  completedSince?: Date;
  completedUntil?: Date;
  createdSince?: Date;
  createdUntil?: Date;
  /** due_date / start_date are `date` columns — inclusive / exclusive day keys
   *  (YYYY-MM-DD sorts lexically, so these are plain string compares). */
  dueSince?: string;
  dueBefore?: string;
  startSince?: string;
  startBefore?: string;
  /** The "No date" option — the column IS NULL. */
  dueIsNull?: boolean;
  startIsNull?: boolean;
  /**
   * Deadline pressure excludes finished work. Set ONLY by the `overdue` preset:
   * before the unified facet every due window carried this implicitly, which
   * was right while `due` could only mean pressure — but with an explicit field
   * it would silently hide completed rows from an honest "due in August" range.
   */
  dueOpenOnly?: boolean;
};

/** `since` inclusive, `until` exclusive — the two shapes the columns need. */
export type TaskDateWindow = {
  sinceKey?: string;
  beforeKey?: string;
  since?: Date;
  until?: Date;
  isNull?: boolean;
  openOnly?: boolean;
};

/** First day of a YYYY-MM token as a day key. */
function monthFirstKey(token: string): string {
  return `${token}-01`;
}

/**
 * Resolve the facet into a concrete window, or null when nothing is set (or the
 * preset means nothing on this field). Forward fields land on day-key bounds
 * because due_date/start_date are `date` columns; backward fields land on UTC
 * instants via vancouverDayStart, because completed_at/created_at are
 * timestamptz. Presets are rolling and resolved at request time, so a
 * bookmarked `?drange=week` always means the week around today.
 */
export function resolveTaskDateWindow(
  field: TaskDateField,
  params: Pick<TaskListParams, 'drange' | 'from' | 'to'>,
  now: Date = new Date(),
): TaskDateWindow | null {
  const forward = isForwardDateField(field);

  if (params.from || params.to) {
    // `to` names a day the user means to include, so the exclusive bound is the
    // day after it — never ms math, which DST would skew.
    const beforeKey = params.to ? shiftDayKey(params.to, 1) : '';
    if (forward) {
      return {
        ...(params.from ? { sinceKey: params.from } : {}),
        ...(beforeKey ? { beforeKey } : {}),
      };
    }
    return {
      ...(params.from ? { since: vancouverDayStart(params.from) } : {}),
      ...(beforeKey ? { until: vancouverDayStart(beforeKey) } : {}),
    };
  }

  const token = params.drange;
  if (!token || !isRangeAllowed(field, token)) return null;

  if (token === 'none') return { isNull: true };

  const today = vancouverDayKey(now);

  if (token === 'overdue') return { beforeKey: today, openOnly: true };

  if (token === 'month' || token === 'lastmonth' || MONTH_RE.test(token)) {
    const monthTok = MONTH_RE.test(token)
      ? token
      : shiftMonthToken(monthToken(now), token === 'lastmonth' ? -1 : 0);
    if (forward) {
      return {
        sinceKey: monthFirstKey(monthTok),
        beforeKey: monthFirstKey(shiftMonthToken(monthTok, 1)),
      };
    }
    return vancouverMonthWindow(monthTok) ?? null;
  }

  const span = token === 'today' ? 1 : token === 'week' ? 7 : 30;
  // Forward: today through the next `span` days. Backward: the last `span`
  // days, today inclusive — which is why the lower bound steps back span - 1.
  const sinceKey = forward ? today : shiftDayKey(today, -(span - 1));
  const beforeKey = shiftDayKey(today, forward ? span : 1);
  return forward
    ? { sinceKey, beforeKey }
    : { since: vancouverDayStart(sinceKey), until: vancouverDayStart(beforeKey) };
}

/** Fold a resolved window onto the TaskFilters keys for its column. */
export function applyTaskDateWindow(
  filters: TaskFilters,
  field: TaskDateField,
  window: TaskDateWindow,
): void {
  if (field === 'due') {
    if (window.isNull) filters.dueIsNull = true;
    if (window.sinceKey) filters.dueSince = window.sinceKey;
    if (window.beforeKey) filters.dueBefore = window.beforeKey;
    if (window.openOnly) filters.dueOpenOnly = true;
  } else if (field === 'start') {
    if (window.isNull) filters.startIsNull = true;
    if (window.sinceKey) filters.startSince = window.sinceKey;
    if (window.beforeKey) filters.startBefore = window.beforeKey;
  } else if (field === 'completed') {
    if (window.since) filters.completedSince = window.since;
    if (window.until) filters.completedUntil = window.until;
  } else {
    if (window.since) filters.createdSince = window.since;
    if (window.until) filters.createdUntil = window.until;
  }
}

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

/** Pure calendar math on a YYYY-MM-DD key — Date.UTC normalizes overflow, so
 *  shifting Aug 28 by +7 lands on Sep 4. No timezone involvement: keys are
 *  calendar values (the due-window upper bounds). */
export function shiftDayKey(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
}

/** Whole days from one YYYY-MM-DD key to another (negative when `to` is
 *  earlier). Both sides parse as UTC midnights, so DST can't shave or add an
 *  hour and round the difference the wrong way — the same reason the columns
 *  are `date` and not `timestamptz`. */
export function daysBetweenDayKeys(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

/** YYYY-MM-DD in Vancouver — digest day-grouping keys, the CSV's
 *  completed_date_pt column, and due-date "today" comparisons. */
export function vancouverDayKey(at: Date): string {
  const p = vancouverParts(at);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Vancouver midnight of a YYYY-MM-DD day key, as the UTC instant — ready
 *  for gte/lt on completedAt (the weekly digest's Mon–Sun window). */
export function vancouverDayStart(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return vancouverMidnightUtc(year, month, day);
}

/** Vancouver midnight (days - 1) days back — the digest's rolling window. */
export function vancouverRecentSince(
  days: number,
  now: Date = new Date(),
): Date {
  const p = vancouverParts(now);
  return vancouverMidnightUtc(+p.year, +p.month, +p.day - (days - 1));
}
