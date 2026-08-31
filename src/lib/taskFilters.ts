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
  OPEN_STATUSES,
  type TaskPrioritySlug,
  type TaskStatusSlug,
  TASK_STATUS_SLUGS,
} from '@/lib/taskFields';
import {
  TASK_TAG_MAX_IN_FILTER,
  UNTAGGED,
} from '@/lib/taskTagFields';

/**
 * URL-state contract for /admin/tasks (list + digest views). A
 * zero-runtime-dependency leaf (inboxFilters.ts pattern — taskFields and
 * calendar are themselves leaves) so client components can import it without
 * dragging anything server-only into their chunk.
 *
 * Canonical param order: status, view, q, client, category, assignee,
 * priority, tag, tagmode, dfield, drange, from, to, sort, group, page.
 * Defaults are dropped from the URL.
 *
 * The date facet is one control over the task dates: `dfield` picks which
 * date to window — `date` (due ?? start, the working-tab default), due, start,
 * completed, created — and `drange` + `from`/`to` pick the window. It replaces
 * the old `due` (three deadline presets, working views only) and `month` (Done
 * view only) params, which are still PARSED as legacy aliases but never
 * re-serialized.
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
  | 'delivered'
  | 'posted'
  | 'all';

/** 'open' (everything still owed — todo + in progress + needs approval) is the
 *  default tab: the working set, including tasks awaiting client sign-off.
 *  Both composite tabs read the vocabulary rather than listing statuses, so a
 *  status added later lands in one of them instead of falling out of both. */
export const TASK_VIEW_STATUSES: Record<TaskView, readonly TaskStatusSlug[]> = {
  open: OPEN_STATUSES,
  todo: ['todo'],
  in_progress: ['in_progress'],
  needs_approval: ['needs_approval'],
  done: ['done'],
  delivered: ['delivered'],
  posted: ['posted'],
  all: TASK_STATUS_SLUGS,
};

const TASK_VIEWS = [
  'open',
  'todo',
  'in_progress',
  'needs_approval',
  'done',
  'delivered',
  'posted',
  'all',
] as const;

export function resolveTaskView(value: string): TaskView {
  return (TASK_VIEWS as readonly string[]).includes(value)
    ? (value as TaskView)
    : 'open';
}

/**
 * A tab showing work that has already shipped — Done, Delivered or Posted.
 *
 * Three things key off it and each is about delivery being a FACT about a
 * month: those tabs order by completed_at, their date facet defaults to
 * `completed`, and they are the only tabs offered the month switcher. 'all'
 * is deliberately not one: it mixes in-flight work, which must never be
 * hidden behind a month.
 */
export function isShippedView(view: TaskView): boolean {
  return view === 'done' || view === 'delivered' || view === 'posted';
}

// ── The date facet ──────────────────────────────────────────────────────────

/**
 * Which task date the facet windows. `'date'` is the composite the Dates
 * column actually displays as a row's date: the due date, or the start date
 * when no due is set (`COALESCE(due_date, start_date)`). It exists because
 * quick-add's default shape is start-only — under a due-only default the
 * board's most common task could never match ANY date preset, which is how
 * "Today" hid a task whose Dates cell visibly read today (2026-08-20).
 */
export type TaskDateField = 'date' | 'due' | 'start' | 'completed' | 'created';

const TASK_DATE_FIELDS = ['date', 'due', 'start', 'completed', 'created'] as const;

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
  return field === 'date' || field === 'due' || field === 'start';
}

/**
 * The shipped tabs are about delivery, every other tab about work still owed —
 * so each gets the date its rows actually carry: `completed` on Done,
 * Delivered and Posted, and the composite `date` (due ?? start) everywhere
 * else, so "Today" means "tasks dated today" — exactly what the Dates column
 * shows — rather than silently "due today", which excluded every start-only
 * task (the quick-add default shape). Because the effective field is derived
 * from the view, `dfield` stays out of the URL until it disagrees.
 */
export function defaultDateField(view: TaskView): TaskDateField {
  return isShippedView(view) ? 'completed' : 'date';
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
  // Overdue means a MISSED DEADLINE, so only due-bearing fields offer it: on
  // `start` it would really mean "started before today" — an ongoing task,
  // not an overdue one — while wearing a label that says otherwise.
  if (token === 'overdue') return field === 'due' || field === 'date';
  if (token === 'none') return field !== 'created';
  if (MONTH_TOKEN_RE.test(token)) return !isForwardDateField(field);
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
  /** Priority facet — a slug, 'none' for unflagged tasks (the date facet's
   *  "No date" pattern), or '' for all. */
  priority: TaskPrioritySlug | 'none' | '';
  /**
   * Tag facet — tag slugs, deduped and sorted so the canonical string is
   * stable (saved views compare by string equality, so `reels,vertical` and
   * `vertical,reels` must not be two different views). The single-element
   * ['none'] is the UNTAGGED sentinel and is exclusive — the same grammar as
   * `priority=none` and the date facet's "No date".
   */
  tags: string[];
  /** 'all' narrows to tasks carrying EVERY listed tag; 'any' (the default)
   *  to those carrying at least one. Ignored while `tags` is empty or
   *  untagged. */
  tagMode: 'any' | 'all';
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
 * `?tag=reels,vertical` → a canonical slug list: junk dropped, deduped,
 * SORTED, capped. The sort is load-bearing, not tidiness — `task_views`
 * stores the canonical query string and compares it to the live one by
 * equality, so an unsorted list would make "Reels + Vertical" fail to match
 * itself depending on which chip was ticked first.
 *
 * The UNTAGGED sentinel is exclusive: mixing "no tags" with "has this tag" is
 * a contradiction, so it wins and everything else is discarded.
 */
function parseTagsParam(value: string): string[] {
  if (!value) return [];
  const parts = value.split(',');
  if (parts.includes(UNTAGGED)) return [UNTAGGED];
  return [...new Set(parts.filter((slug) => SLUG_RE.test(slug)))]
    .sort()
    .slice(0, TASK_TAG_MAX_IN_FILTER);
}

/** True when the facet means "tasks carrying no tag at all". */
export function isUntaggedFilter(tags: readonly string[]): boolean {
  return tags.length === 1 && tags[0] === UNTAGGED;
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
    priority:
      priority === 'none' || isTaskPriority(priority) ? priority : '',
    tags: parseTagsParam(get('tag')),
    tagMode: get('tagmode') === 'all' ? 'all' : 'any',
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
  tags: [],
  tagMode: 'any',
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
  // `?? []` because taskListQs takes a Partial and callers legitimately build
  // one from scratch (Clear filters sends only sort + group).
  const tags = p.tags ?? [];
  if (tags.length > 0) {
    qs.set('tag', tags.join(','));
    // Only meaningful with two or more real tags: "match all" against one tag
    // is "match any", and against the untagged sentinel it is nonsense — a
    // dangling tagmode= would claim a facet the query isn't applying (the
    // same rule that keeps a stranded dfield out of the URL).
    if (p.tagMode === 'all' && tags.length > 1 && !isUntaggedFilter(tags)) {
      qs.set('tagmode', 'all');
    }
  }

  // The digest's default window is its rolling N days, so a past-facing PRESET
  // ("Last 7 days" on `completed`) could only fight it. A literal month is the
  // exception, and the reason is that it REPLACES the window rather than
  // narrowing it: picking August turns the digest into August's wrap-up, which
  // is the whole point of the month switcher in the header. Forward fields
  // still narrow honestly, so those keep working as before.
  const field = resolveTaskDateField(p.dfield, view);
  const dateOk =
    !digest || isForwardDateField(field) || MONTH_TOKEN_RE.test(p.drange);
  // `dfield` rides along only when a window actually serializes — the URL
  // carries a window or nothing, so an inapplicable preset must not strand a
  // dangling `dfield=` (it would claim a facet the query isn't applying).
  const windowed = p.from || p.to || (p.drange && isRangeAllowed(field, p.drange));
  if (dateOk && windowed) {
    if (field !== defaultDateField(view)) qs.set('dfield', field);
    if (p.from || p.to) {
      if (p.from) qs.set('from', p.from);
      if (p.to) qs.set('to', p.to);
    } else {
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
      params.tags?.length ||
      hasDateWindow(params, view),
  );
}

/**
 * How many facets are narrowing the list — the same list
 * {@link hasActiveTaskFilters} tests, counted instead of OR'd, so the badge on
 * the phone's "Filters" button can never disagree with the "Clear filters"
 * button about what a filter is.
 *
 * `q` is deliberately EXCLUDED: it is the one facet with its own always-visible
 * field at every width, so it is never behind the disclosure the count stands
 * for. `sort` and `group` stay out for the reason they do above — they are view
 * preferences, which is also why Clear preserves them.
 *
 * The whole date facet counts ONCE however it is expressed: `dfield` +
 * `drange`, or `from`/`to`, are one control on screen, and counting the parts
 * would report "3 filters" for one picked month.
 */
export function countActiveTaskFilters(
  params: TaskListParams,
  view: TaskView = 'open',
): number {
  return (
    (params.client ? 1 : 0) +
    (params.category ? 1 : 0) +
    (params.assignee ? 1 : 0) +
    (params.priority ? 1 : 0) +
    (params.tags?.length ? 1 : 0) +
    (hasDateWindow(params, view) ? 1 : 0)
  );
}

/**
 * The filter shape the query builder consumes (tasksWhere in
 * taskPredicates.ts). Declared here, not there, so client components can
 * share the type without an adminQueries-style value import. Slugs become ids
 * in the async resolveTaskFilters hop (taskQueries) — this leaf stays sync
 * and DB-free.
 */
export type TaskFilters = {
  q?: string;
  /** Resolved client uuid, or 'internal' for the null-client facet. */
  clientId?: string;
  categoryId?: string;
  assigneeId?: string;
  /** 'none' filters to unflagged tasks (priority IS NULL). */
  priority?: TaskPrioritySlug | 'none';
  /** Resolved tag uuids. Empty/absent = no tag facet. */
  tagIds?: string[];
  /** 'all' requires every id in `tagIds`; anything else requires one. */
  tagMode?: 'any' | 'all';
  /** The untagged facet — the task has no tag link at all. */
  untagged?: boolean;
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
  /** The composite `date` facet: windows over COALESCE(due_date, start_date),
   *  the date the Dates column displays as the row's own. Same inclusive /
   *  exclusive day-key shape as the due/start bounds. */
  schedSince?: string;
  schedBefore?: string;
  /** "No date" on the composite facet — BOTH columns are null. */
  schedIsNull?: boolean;
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
  if (field === 'date') {
    // Overdue stays STRICTLY due-based even on the composite facet — a
    // start-only task is ongoing, never overdue — so the filter can never
    // disagree with the dueState tint. Everything else windows the coalesce.
    if (window.openOnly) {
      if (window.beforeKey) filters.dueBefore = window.beforeKey;
      filters.dueOpenOnly = true;
      return;
    }
    if (window.isNull) filters.schedIsNull = true;
    if (window.sinceKey) filters.schedSince = window.sinceKey;
    if (window.beforeKey) filters.schedBefore = window.beforeKey;
  } else if (field === 'due') {
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
