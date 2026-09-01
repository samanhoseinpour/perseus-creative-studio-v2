import {
  dayKeyIn,
  dayStartIn,
  DAY_KEY_RE,
  monthFirstKey,
  monthTokenIn,
  monthWindowIn,
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
 * URL-state contract for /admin/tasks (list, calendar and digest views). A
 * zero-runtime-dependency leaf (inboxFilters.ts pattern — taskFields and
 * calendar are themselves leaves) so client components can import it without
 * dragging anything server-only into their chunk.
 *
 * Canonical param order: status, view, month, q, client, category, assignee,
 * priority, tag, tagmode, dfield, drange, from, to, sort, group, page.
 * Defaults are dropped from the URL.
 *
 * `month` is a SCOPE, not a filter: it says which month the whole board is
 * about, on every tab. It is deliberately NOT part of {@link taskListQs} —
 * `task_views.query` stores that string and compares it by equality, so a
 * month inside it would pin a saved view to whichever month it was saved in.
 * {@link taskScopeQs} is the door that carries it; see the block above
 * {@link parseTaskMonth}.
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

// ── The view mode (?view=) ──────────────────────────────────────────────────

/**
 * Which RENDERING of the board this is. All three read the same filtered rows
 * through the same predicate and differ only in how those rows are drawn, plus
 * the three URL details below.
 *
 *  - `list` — the eleven-column table and its phone cards. The default, and
 *    the one mode that writes no `view=` at all.
 *  - `calendar` — a month grid of whichever date field the facet names.
 *  - `digest` — the read-only roll-up of shipped work.
 *
 * This replaced a `digest: boolean` threaded through every serializer. That
 * boolean was never really about the digest: it stood in for three unrelated
 * decisions (what month a bare URL means, whether a backward date field may
 * serialize, whether `page` may), and a third view had no way to answer them
 * independently.
 */
export type TaskViewMode = 'list' | 'digest' | 'calendar';

const TASK_VIEW_MODES = ['list', 'digest', 'calendar'] as const;

/** Any untrusted `?view=` value to a mode; unknown falls to the list. */
export function resolveTaskViewMode(value: string): TaskViewMode {
  return (TASK_VIEW_MODES as readonly string[]).includes(value)
    ? (value as TaskViewMode)
    : 'list';
}

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

/**
 * The tabs a month scope can honestly offer.
 *
 * On a PAST month the working tabs can only ever be empty — unfinished work is
 * always "now", so it is on the current month's board by definition — and four
 * dead tabs read as a broken board rather than as a closed record. So a past
 * month shows what shipped in it and nothing else, which is what makes August
 * read as August's wrap-up sheet.
 *
 * Derived from the vocabulary, never written out: a status added later lands
 * in one branch or the other instead of falling out of both.
 */
export function taskTabsFor(month: string, currentMonth: string): TaskView[] {
  return isPastMonth(month, currentMonth) ? shippedTabs() : [...TASK_VIEWS];
}

/** Every tab that can hold a row whose only date is a completion. Derived from
 *  the vocabulary, never written out. */
function shippedTabs(): TaskView[] {
  return TASK_VIEWS.filter((view) => isShippedView(view) || view === 'all');
}

/**
 * The tabs a CALENDAR can honestly offer, which is a question about the date
 * field rather than the month.
 *
 * The grid windows `dfield`, so keyed on `completed` the four working tabs can
 * only ever be empty: an open task has no completion instant to place it on a
 * day. Every other field places open and shipped work alike, so all eight
 * stand. That is exactly the rule {@link taskTabsFor} applies to a past month,
 * asked from the other end, and it shares the same fallback.
 */
export function calendarTabsFor(field: TaskDateField): TaskView[] {
  return field === 'completed' ? shippedTabs() : [...TASK_VIEWS];
}

/**
 * Coerce a view the current scope cannot show, SERVER-SIDE and before the tabs
 * or the query see it. A bookmarked `?status=open&month=2026-07` would
 * otherwise render a strip with nothing highlighted over a list that can only
 * be empty — the withActiveOption failure, one level up.
 */
export function coerceTaskView(
  view: TaskView,
  month: string,
  currentMonth: string,
): TaskView {
  return coerceTaskViewIn(view, taskTabsFor(month, currentMonth));
}

/** The shared line: a view the offered tabs cannot show falls back to Done.
 *  Factored out so the list's month rule and the calendar's field rule can
 *  never drift into two different answers for the same situation. */
export function coerceTaskViewIn(view: TaskView, tabs: TaskView[]): TaskView {
  return tabs.includes(view) ? view : 'done';
}

// ── The month scope ─────────────────────────────────────────────────────────

/**
 * "No month at all" — the whole log, which is what this board always was.
 *
 * A DELIBERATE duplicate of `ALL_MONTHS` in `@/components/Admin/MonthSwitcher`
 * (the `INTERNAL_CLIENT_LABEL` precedent in taskPredicates.ts): that component
 * is shared with the reports, which have no business importing this module's
 * graph. Change both together, or neither.
 */
export const TASK_MONTH_ALL = 'all';

/** True while the scope names one month (rather than the whole log). */
export function isMonthScoped(month: string): boolean {
  return month !== '' && month !== TASK_MONTH_ALL;
}

/**
 * A month the reader has already left.
 *
 * `currentMonth` is resolved by the caller in the VIEWER's zone, never here —
 * this module names no timezone (see the header). That is not a formality:
 * at 2026-08-31T22:15Z Vancouver is still in August while Tehran is already in
 * September, so the same request is a past month for one reader and the live
 * one for the other. Month tokens are `YYYY-MM`, which sorts lexically.
 */
export function isPastMonth(month: string, currentMonth: string): boolean {
  return isMonthScoped(month) && month < currentMonth;
}

/** The live month: the one scope that lets unfinished work through. */
export function isCurrentMonth(month: string, currentMonth: string): boolean {
  return isMonthScoped(month) && month === currentMonth;
}

/**
 * The month the board is about.
 *
 * THE RULE, and every other decision here falls out of it: **a finished task
 * belongs to the month it finished, and unfinished work is always "now"**. So
 * a past month is a closed record of what shipped in it, while the current
 * month carries what shipped this month plus everything still open, whatever
 * month it started in. Nothing can hide behind a month boundary, which is the
 * invariant the old Done-tab-only switcher was protecting the long way round.
 *
 * Defaults differ by view and each is deliberate: the list and the calendar
 * open on the CURRENT month (the "clean table each month" the studio asked
 * for), the digest opens UNSCOPED because its own default window is a rolling
 * seven days that routinely straddles a month boundary. Picking a month on the
 * digest replaces that window rather than narrowing it, which is what turns it
 * into that month's wrap-up. The calendar does the same replacement, for the
 * same reason and one step further: see {@link calendarDateWindow}.
 *
 * "All time" is the one scope the calendar refuses. A grid has to draw ONE
 * month, so an unscoped calendar would have no cells to put anything in; the
 * month band does not offer it there, and a bookmarked `?month=all` lands on
 * the current month rather than on an empty page.
 *
 * Two legacy spellings resolve onto the scope and neither is ever
 * re-serialized: `?drange=YYYY-MM` (the month's home while it was a date-facet
 * value) and the older `?month=` alias, whose meaning — "the Done tab, that
 * month" — is what this param now means outright.
 */
export function parseTaskMonth(
  get: (name: string) => string,
  { mode, currentMonth }: { mode: TaskViewMode; currentMonth: string },
): string {
  const raw = get('month');
  if (raw === TASK_MONTH_ALL) {
    return mode === 'calendar' ? currentMonth : TASK_MONTH_ALL;
  }
  const named = parseMonthToken(raw) || parseMonthToken(get('drange'));
  if (named) return named;
  return mode === 'digest' ? TASK_MONTH_ALL : currentMonth;
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
 * `drange` carries a preset token and nothing else.
 *
 * It USED to accept a literal `YYYY-MM` as well, which is how the month came
 * to be a filter rather than a scope: the same param the Filters date menu
 * writes. The month now has its own `?month=` param ({@link parseTaskMonth}),
 * so a month token arriving here is a legacy spelling — it is read by the
 * scope parser and dropped from the facet, because the URL must never carry
 * two windows over the same rows.
 */
function parseRangeParam(value: string): string {
  return isRangePreset(value) ? value : '';
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
  return isRangePreset(token);
}

// ── List params ─────────────────────────────────────────────────────────────

/**
 * The board's order, as a closed set of named tokens.
 *
 * ONE param, never a `sort` + `dir` pair. A direction only means something
 * beside another param, so it would be a second thing to keep in agreement,
 * and it would put a new field on {@link TaskListParams}; keeping the whole
 * vocabulary inside `sort` means the canonical param order never moves and
 * every string already stored in `task_views.query` still serializes
 * byte-identically. That matters: SavedViews matches a view by exact string
 * equality and nothing anywhere rewrites those rows.
 *
 * `newest`/`oldest` are the board's own order (when work was logged, or when
 * it finished on a shipped tab). The rest each belong to one column of the
 * table, which is where they are offered from: see TASK_COLUMN_SORTS in
 * taskColumns.ts.
 */
export const TASK_SORTS = [
  'newest',
  'oldest',
  'title-az',
  'title-za',
  'client-az',
  'client-za',
  'category-az',
  'category-za',
  'priority',
  'priority-low',
  'status-early',
  'status-late',
  'time-most',
  'time-least',
  'due',
  'due-late',
] as const;

export type TaskSort = (typeof TASK_SORTS)[number];

export function isTaskSort(value: string): value is TaskSort {
  return (TASK_SORTS as readonly string[]).includes(value);
}

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

  // Legacy alias: `?due=` predates the unified facet. Parsed so old bookmarks
  // and emailed deep links keep working, never re-serialized — taskListQs only
  // ever writes the new vocabulary.
  //
  // `?month=` and a literal `?drange=YYYY-MM` used to be aliases here too. They
  // are now read by parseTaskMonth as the SCOPE instead, and deliberately do
  // not also survive as a date window: one month must never window the same
  // rows twice.
  if (!dfield && !drange && !from && !to) {
    const legacyDue = get('due');
    if (legacyDue === 'overdue' || legacyDue === 'today') {
      dfield = 'due';
      drange = legacyDue;
    } else if (legacyDue === 'week') {
      dfield = 'due';
      drange = 'week';
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
    sort: isTaskSort(sort) ? sort : 'newest',
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
/** Whether the date facet is windowing anything. Exported so the facet's own
 *  trigger can read the same answer the filter count reads, rather than
 *  re-deriving "is this narrowing the board" from the parts and drifting. */
export function hasDateWindow(params: TaskListParams, view: TaskView): boolean {
  if (params.from || params.to) return true;
  if (!params.drange) return false;
  return isRangeAllowed(resolveTaskDateField(params.dfield, view), params.drange);
}

/**
 * Canonical query string (no leading `?`): fixed key order, defaults dropped,
 * `page` appended last and only when > 1. A non-list `mode` serializes the same
 * filters for that view, so the segmented View links carry the working filter
 * set across.
 *
 * **Carries no month, ever.** `task_views.query` stores this exact string and
 * compares it to the live one by equality, so a month in here would pin every
 * saved view to the month it was saved in and quietly stop matching a month
 * later. {@link taskScopeQs} is the door that adds one.
 */
export function taskListQs(
  view: TaskView,
  params: Partial<TaskListParams>,
  page?: number,
  mode?: TaskViewMode,
): string {
  return buildQs(view, params, page, mode ?? 'list', '');
}

/**
 * The scope-carrying door: {@link taskListQs} plus `?month=`, dropped when it
 * is the view's own default (the current month on the list and the calendar,
 * unscoped on the digest) so a bare `/admin/tasks` still means "this month" and
 * keeps meaning it next month.
 *
 * Every link the board composes goes through here — the tabs, the filter bar,
 * pagination, the revision parent link, the `?task=` strip and the export
 * anchor — because a link that drops the scope silently moves the reader to a
 * different month than the one they are looking at.
 */
export function taskScopeQs(
  view: TaskView,
  params: Partial<TaskListParams>,
  scope: { month: string; currentMonth: string; mode?: TaskViewMode },
  page?: number,
): string {
  const mode = scope.mode ?? 'list';
  const fallback = mode === 'digest' ? TASK_MONTH_ALL : scope.currentMonth;
  const month = scope.month === fallback ? '' : scope.month;
  return buildQs(view, params, page, mode, month);
}

function buildQs(
  view: TaskView,
  params: Partial<TaskListParams>,
  page: number | undefined,
  mode: TaskViewMode,
  month: string,
): string {
  const p = { ...DEFAULT_PARAMS, ...params };
  const qs = new URLSearchParams();
  if (view !== 'open') qs.set('status', view);
  if (mode !== 'list') qs.set('view', mode);
  if (month) qs.set('month', month);
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
  // ("Last 7 days" on `completed`) could only fight it. Forward fields still
  // narrow honestly, so those keep working as before. The month used to be the
  // exception here — it REPLACES the window rather than narrowing it — but it
  // is a scope now and rides `month=` above, so no exception is left to make.
  const field = resolveTaskDateField(p.dfield, view);
  // `dfield` rides along only when a window actually serializes — the URL
  // carries a window or nothing, so an inapplicable preset must not strand a
  // dangling `dfield=` (it would claim a facet the query isn't applying).
  const windowed = p.from || p.to || (p.drange && isRangeAllowed(field, p.drange));
  if (mode === 'calendar') {
    // On a calendar the grid IS the range: the month band picks it, so a range
    // here could only fight it (`drange=month` resolves against `now`, which
    // would empty an August grid read in September). The FIELD still
    // serializes, and alone — it decides what the grid is a calendar OF, which
    // is the whole control. Overdue loses nothing by going: overdue chips tint
    // in place, which beats filtering them out of the days that give them
    // meaning.
    if (field !== defaultDateField(view)) qs.set('dfield', field);
  } else if ((mode === 'list' || isForwardDateField(field)) && windowed) {
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
  if (mode === 'list' && page && page > 1) qs.set('page', String(page));
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
  /**
   * The MONTH SCOPE, and deliberately not `completedSince`/`completedUntil`:
   * the date facet already owns those, and the two would collide the moment
   * someone filtered "completed last 7 days" inside a month.
   *
   * Folded into ONE OR'd clause: completed inside the window, OR — only when
   * `monthIncludesOpen`, i.e. the scope is the reader's current month —
   * completed_at IS NULL, which is exactly "still open". A finished task
   * belongs to the month it finished; unfinished work is always now.
   */
  monthSince?: Date;
  monthUntil?: Date;
  monthIncludesOpen?: boolean;
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

  // Presets only. A literal YYYY-MM never reaches here any more: isRangeAllowed
  // refuses it above, because the month is a scope with its own param rather
  // than a value of this facet.
  if (token === 'month' || token === 'lastmonth') {
    const monthTok = shiftMonthToken(
      monthTokenIn(tz, now),
      token === 'lastmonth' ? -1 : 0,
    );
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

/**
 * The calendar's window: the month the grid draws, over the field the grid is
 * a calendar OF.
 *
 * This REPLACES the list's month scope rather than joining it. That scope is
 * one OR'd clause — completed inside the month, or still open — which a grid
 * cannot use: an open task due in October would be in scope with no cell to
 * sit in. The digest set the same precedent when its picked month replaced the
 * rolling week rather than narrowing it. One window, one place.
 *
 * The consequence is wanted rather than tolerated: a past month on the
 * calendar shows the work that was due in it and never shipped, which the list
 * deliberately hides.
 *
 * Forward fields land on day-key bounds (due_date/start_date are `date`
 * columns), backward fields on UTC instants in the READER's zone — the same
 * split resolveTaskDateWindow makes, for the same reason. Null on an unscoped
 * or malformed token, which a caller must read as "draw nothing": leaving the
 * window off would pull the whole log into one month's grid.
 */
export function calendarDateWindow(
  tz: string,
  field: TaskDateField,
  month: string,
): TaskDateWindow | null {
  if (!isMonthScoped(month) || !parseMonthToken(month)) return null;
  if (isForwardDateField(field)) {
    return {
      sinceKey: monthFirstKey(month),
      beforeKey: monthFirstKey(shiftMonthToken(month, 1)),
    };
  }
  return monthWindowIn(tz, month);
}
