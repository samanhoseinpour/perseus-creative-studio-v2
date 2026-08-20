import {
  dayKeyIn,
  dayStartIn,
  DAY_KEY_RE,
  monthFirstKey,
  monthTokenIn,
  monthWindowIn,
  MONTH_TOKEN_RE,
  parseMonthToken,
  shiftDayKey,
  shiftMonthToken,
} from '@/lib/calendar';
import {
  isTaskPriority,
  type TaskPrioritySlug,
  type TaskStatusSlug,
  TASK_STATUS_SLUGS,
} from '@/lib/taskFields';

/**
 * URL-state contract for /admin/tasks (list + digest views). A
 * zero-runtime-dependency leaf (inboxFilters.ts pattern — taskFields and
 * calendar are themselves leaves) so client components can import it without
 * dragging anything server-only into their chunk.
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
 * Every boundary here is resolved in a caller-supplied zone (see
 * `src/lib/calendar.ts`) — for a signed-in render that is the VIEWER's zone, so
 * "due today" and "this month" mean what they mean to the person reading the
 * screen. This module never picks a zone of its own.
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
  return isRangePreset(value) || MONTH_TOKEN_RE.test(value) ? value : '';
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
  if (MONTH_TOKEN_RE.test(token)) return !forward;
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

/**
 * Resolve the facet into a concrete window, or null when nothing is set (or the
 * preset means nothing on this field). Forward fields land on day-key bounds
 * because due_date/start_date are `date` columns; backward fields land on UTC
 * instants via dayStartIn, because completed_at/created_at are timestamptz.
 * Presets are rolling and resolved at request time IN THE VIEWER'S ZONE, so a
 * bookmarked `?drange=week` always means the week around the reader's today —
 * the same clock that stamps the overdue tint, so the filter and the tints can
 * never disagree.
 */
export function resolveTaskDateWindow(
  tz: string,
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
      ...(params.from ? { since: dayStartIn(tz, params.from) } : {}),
      ...(beforeKey ? { until: dayStartIn(tz, beforeKey) } : {}),
    };
  }

  const token = params.drange;
  if (!token || !isRangeAllowed(field, token)) return null;

  if (token === 'none') return { isNull: true };

  const today = dayKeyIn(tz, now);

  if (token === 'overdue') return { beforeKey: today, openOnly: true };

  if (token === 'month' || token === 'lastmonth' || MONTH_TOKEN_RE.test(token)) {
    const monthTok = MONTH_TOKEN_RE.test(token)
      ? token
      : shiftMonthToken(monthTokenIn(tz, now), token === 'lastmonth' ? -1 : 0);
    if (forward) {
      return {
        sinceKey: monthFirstKey(monthTok),
        beforeKey: monthFirstKey(shiftMonthToken(monthTok, 1)),
      };
    }
    return monthWindowIn(tz, monthTok) ?? null;
  }

  const span = token === 'today' ? 1 : token === 'week' ? 7 : 30;
  // Forward: today through the next `span` days. Backward: the last `span`
  // days, today inclusive — which is why the lower bound steps back span - 1.
  const sinceKey = forward ? today : shiftDayKey(today, -(span - 1));
  const beforeKey = shiftDayKey(today, forward ? span : 1);
  return forward
    ? { sinceKey, beforeKey }
    : { since: dayStartIn(tz, sinceKey), until: dayStartIn(tz, beforeKey) };
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
