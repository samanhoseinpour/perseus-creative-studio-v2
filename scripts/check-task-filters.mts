/**
 * Task-filter self-check — the URL contract, the date-facet window resolver,
 * and (with --db) the real WHERE clause against a real Postgres.
 *
 * Run:  node --import tsx scripts/check-task-filters.mts
 *       node --env-file=.env.local --import tsx scripts/check-task-filters.mts --db
 *
 * The pure part needs no DB and no env. It pins:
 *  - THE REGRESSION (2026-08-20): bare `?drange=today` must window the
 *    composite `date` field — COALESCE(due_date, start_date) — because
 *    quick-add's default task shape is start-only, and a due-only "Today"
 *    hid a task whose Dates column visibly read today.
 *  - Every field × preset window in BOTH America/Vancouver and Asia/Tehran
 *    (the two-clocks contract: one instant, two different todays), plus the
 *    Vancouver DST transitions (23h and 25h days on the backward windows).
 *  - applyTaskDateWindow's key routing — 'date' + Overdue lands on the DUE
 *    keys (a start-only task is ongoing, never overdue), never the sched keys.
 *  - isRangeAllowed: Overdue refused off the due-bearing fields, and a literal
 *    YYYY-MM refused on EVERY field — the month is a scope now, not a value of
 *    this facet.
 *  - THE MONTH SCOPE (`?month=`): its per-view defaults, both legacy spellings
 *    resolving onto it, the tab list a past month can honestly offer, and the
 *    two-clocks edge — at 2026-08-31T22:15Z Vancouver is still in August while
 *    Tehran is already in September, so "is this the current month?" (the one
 *    branch that lets unfinished work through) must DISAGREE across the two.
 *  - That `month` never appears in taskListQs output: task_views stores that
 *    string and compares by equality, so a month in it would pin every saved
 *    view to the month it was saved in.
 *  - parseTaskListParams (junk fallbacks, the legacy ?due= alias, custom bounds
 *    beating presets, the phantom-date rejection, priority 'none') and
 *    taskListQs round-trips (canonical order, defaults dropped).
 *
 * The --db part seeds fixture tasks covering every discriminating date shape,
 * runs the REAL tasksWhere (src/db/taskPredicates.ts — guard-free precisely
 * so this script can import it) for every view × filter × zone combination,
 * and compares returned id sets against an independent JS oracle.
 *
 * SAFE TO RE-RUN: every row it writes is title-prefixed 'ZZ-CHECK', swept on
 * the way in and in a `finally`; every assertion query carries q='ZZ-CHECK'
 * so real rows can never enter an expected set. Slug→id resolution mirrors
 * resolveTaskFilters (which is `server-only` and can't be imported here);
 * the date logic itself runs through the real pure helpers.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, count, eq, inArray, like } from 'drizzle-orm';

import {
  applyTaskDateWindow,
  coerceTaskView,
  countActiveTaskFilters,
  defaultDateField,
  hasActiveTaskFilters,
  isCurrentMonth,
  isMonthScoped,
  isPastMonth,
  isRangeAllowed,
  isUntaggedFilter,
  parseTaskListParams,
  parseTaskMonth,
  resolveTaskDateField,
  resolveTaskDateWindow,
  resolveTaskView,
  taskListQs,
  taskScopeQs,
  taskTabsFor,
  isShippedView,
  isTaskSort,
  TASK_MONTH_ALL,
  TASK_SORTS,
  TASK_VIEW_STATUSES,
  type TaskDateField,
  type TaskFilters,
  type TaskListParams,
  type TaskViewMode,
  type TaskView,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  dayNoonIn,
  dayStartIn,
  monthTokenIn,
  monthWindowIn,
  shiftDayKey,
  shiftMonthToken,
} from '@/lib/calendar';
import {
  isShipped,
  TASK_STATUS_SLUGS,
  type TaskPrioritySlug,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  TASK_TAG_MAX_IN_FILTER,
  UNTAGGED,
} from '@/lib/taskTagFields';
import {
  columnForSort,
  taskSortLabel,
  TASK_COLUMNS,
  TASK_COLUMN_SORTS,
  TASK_SORT_DIRECTION,
  TASK_SORT_SHORT_LABELS,
} from '@/lib/taskColumns';
import {
  clients,
  taskAssignees,
  taskCategories,
  taskTagLinks,
  taskTags,
  taskTagTypes,
  tasks,
} from '@/db/schema';
import { taskOrder, tasksWhere } from '@/db/taskPredicates';
import { searchTokens } from '@/lib/searchTerms';

let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`,
  );
};

/** A predicate that must hold. `eq_(label, x, true)` says the same thing, but
 *  prints `got=false` with no hint of what was being asked. */
const ok_ = (label: string, got: boolean) => eq_(label, got, true);

const VAN = 'America/Vancouver';
const TEH = 'Asia/Tehran';

const parseQS = (qs: string): TaskListParams => {
  const sp = new URLSearchParams(qs);
  return parseTaskListParams((k) => sp.get(k) ?? '');
};

/** The month scope for a URL, as the pages resolve it. */
const monthQS = (
  qs: string,
  {
    mode = 'list',
    currentMonth = '2026-08',
  }: { mode?: TaskViewMode; currentMonth?: string } = {},
): string => {
  const sp = new URLSearchParams(qs);
  return parseTaskMonth((k) => sp.get(k) ?? '', { mode, currentMonth });
};

// One instant, two todays: Aug 20 19:15 in Vancouver, Aug 21 05:45 in Tehran.
const NOW = new Date('2026-08-21T02:15:00.000Z');

// ── The regression ──────────────────────────────────────────────────────────

console.log('\n— the regression: bare drange=today windows due-or-start —');
{
  const params = parseQS('status=needs_approval&drange=today');
  const view: TaskView = 'needs_approval';
  const field = resolveTaskDateField(params.dfield, view);
  eq_('bare dfield resolves to the composite field', field, 'date');

  const winVan = resolveTaskDateWindow(VAN, field, params, NOW);
  eq_('today window, Vancouver reader', winVan, {
    sinceKey: '2026-08-20',
    beforeKey: '2026-08-21',
  });
  const winTeh = resolveTaskDateWindow(TEH, field, params, NOW);
  eq_('today window, Tehran reader (next calendar day)', winTeh, {
    sinceKey: '2026-08-21',
    beforeKey: '2026-08-22',
  });

  const filters: TaskFilters = {};
  applyTaskDateWindow(filters, field, winVan!);
  eq_('composite window lands on sched keys, not due keys', filters, {
    schedSince: '2026-08-20',
    schedBefore: '2026-08-21',
  });
}

// ── Field defaults ──────────────────────────────────────────────────────────

console.log('\n— field defaults per view —');
for (const view of ['open', 'todo', 'in_progress', 'needs_approval', 'all'] as const) {
  eq_(`default field on ${view}`, defaultDateField(view), 'date');
}
eq_('default field on done', defaultDateField('done'), 'completed');
eq_('junk dfield falls back to the view default', resolveTaskDateField('sched', 'open'), 'date');
eq_('explicit dfield=due still honored', resolveTaskDateField('due', 'open'), 'due');

// ── isRangeAllowed matrix ───────────────────────────────────────────────────

console.log('\n— isRangeAllowed matrix —');
const FIELDS: TaskDateField[] = ['date', 'due', 'start', 'completed', 'created'];
const ALLOWED: Record<TaskDateField, Record<string, boolean>> = {
  date:      { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: true,  none: true,  '2026-07': false },
  due:       { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: true,  none: true,  '2026-07': false },
  start:     { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: false, none: true,  '2026-07': false },
  // A literal YYYY-MM is refused on EVERY field, backward ones included. It
  // used to be allowed here, which is precisely how the month came to behave
  // like a filter: it was one. `dfield=created` therefore loses its month
  // window, deliberately — a custom from/to range still covers that, and the
  // scope owns "which month" now.
  completed: { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: false, none: true,  '2026-07': false },
  created:   { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: false, none: false, '2026-07': false },
};
for (const field of FIELDS) {
  for (const [token, want] of Object.entries(ALLOWED[field])) {
    eq_(`${field} × ${token}`, isRangeAllowed(field, token), want);
  }
  eq_(`${field} × '' (no token)`, isRangeAllowed(field, ''), true);
  eq_(`${field} × junk token`, isRangeAllowed(field, 'sometime'), false);
}

// ── applyTaskDateWindow key routing ─────────────────────────────────────────

console.log('\n— applyTaskDateWindow key routing —');
{
  const overdueOnDate: TaskFilters = {};
  applyTaskDateWindow(overdueOnDate, 'date', { beforeKey: '2026-08-20', openOnly: true });
  eq_('date + Overdue → strictly due-based (never sched keys)', overdueOnDate, {
    dueBefore: '2026-08-20',
    dueOpenOnly: true,
  });

  const noneOnDate: TaskFilters = {};
  applyTaskDateWindow(noneOnDate, 'date', { isNull: true });
  eq_('date + No date → both-null flag', noneOnDate, { schedIsNull: true });

  const dueWin: TaskFilters = {};
  applyTaskDateWindow(dueWin, 'due', { sinceKey: '2026-08-01', beforeKey: '2026-09-01' });
  eq_('due window → due keys only', dueWin, { dueSince: '2026-08-01', dueBefore: '2026-09-01' });

  const startWin: TaskFilters = {};
  applyTaskDateWindow(startWin, 'start', { sinceKey: '2026-08-01', beforeKey: '2026-09-01' });
  eq_('start window → start keys only', startWin, { startSince: '2026-08-01', startBefore: '2026-09-01' });

  const a = new Date('2026-08-01T07:00:00.000Z');
  const b = new Date('2026-09-01T07:00:00.000Z');
  const completedWin: TaskFilters = {};
  applyTaskDateWindow(completedWin, 'completed', { since: a, until: b });
  eq_('completed window → instant keys', completedWin, { completedSince: a, completedUntil: b });
  const createdWin: TaskFilters = {};
  applyTaskDateWindow(createdWin, 'created', { since: a, until: b });
  eq_('created window → instant keys', createdWin, { createdSince: a, createdUntil: b });
}

// ── Window resolver: presets, months, custom, DST ───────────────────────────

console.log('\n— window resolver —');
{
  const p = (drange: string) => ({ drange, from: '', to: '' });

  eq_('week forward = today through +6 (7 days incl. today)',
    resolveTaskDateWindow(VAN, 'date', p('week'), NOW),
    { sinceKey: '2026-08-20', beforeKey: '2026-08-27' });
  eq_('d30 forward',
    resolveTaskDateWindow(VAN, 'due', p('d30'), NOW),
    { sinceKey: '2026-08-20', beforeKey: '2026-09-19' });
  eq_('week backward = last 7 days incl. today, viewer-zone instants',
    resolveTaskDateWindow(VAN, 'completed', p('week'), NOW),
    { since: dayStartIn(VAN, '2026-08-14'), until: dayStartIn(VAN, '2026-08-21') });
  eq_('month forward on the composite field',
    resolveTaskDateWindow(VAN, 'date', p('month'), NOW),
    { sinceKey: '2026-08-01', beforeKey: '2026-09-01' });
  eq_('lastmonth backward = the real July window',
    resolveTaskDateWindow(VAN, 'completed', p('lastmonth'), NOW),
    monthWindowIn(VAN, '2026-07'));
  // The month left this facet entirely. Refused on a BACKWARD field too, not
  // just the forward ones — a literal token reaching the resolver at all would
  // mean the URL was carrying two windows over the same rows.
  eq_('literal month token no longer windows completed → null',
    resolveTaskDateWindow(VAN, 'completed', p('2026-06'), NOW),
    null);
  eq_('overdue = strictly before today, open work only',
    resolveTaskDateWindow(VAN, 'date', p('overdue'), NOW),
    { beforeKey: '2026-08-20', openOnly: true });
  eq_('overdue refused on start → no window at all',
    resolveTaskDateWindow(VAN, 'start', p('overdue'), NOW),
    null);
  eq_('month token refused on a forward field → null',
    resolveTaskDateWindow(VAN, 'due', p('2026-07'), NOW),
    null);
  eq_('month token refused on created → null',
    resolveTaskDateWindow(VAN, 'created', p('2026-07'), NOW),
    null);
  eq_('none → isNull window',
    resolveTaskDateWindow(VAN, 'date', p('none'), NOW),
    { isNull: true });

  eq_('custom to is INCLUSIVE (exclusive bound is the day after)',
    resolveTaskDateWindow(VAN, 'date', { drange: '', from: '2026-08-01', to: '2026-08-10' }, NOW),
    { sinceKey: '2026-08-01', beforeKey: '2026-08-11' });
  eq_('custom range on a backward field lands on viewer-zone instants',
    resolveTaskDateWindow(VAN, 'completed', { drange: '', from: '2026-08-01', to: '2026-08-10' }, NOW),
    { since: dayStartIn(VAN, '2026-08-01'), until: dayStartIn(VAN, '2026-08-11') });
  eq_('open-ended custom range (from only)',
    resolveTaskDateWindow(VAN, 'date', { drange: '', from: '2026-08-01', to: '' }, NOW),
    { sinceKey: '2026-08-01' });

  // DST: the backward "today" window is a real day in the viewer's zone —
  // 23 real hours on spring-forward, 25 on fall-back, always 24 in Tehran
  // (which no longer observes DST; check-calendar pins that fact itself).
  const hoursOf = (w: { since?: Date; until?: Date } | null) =>
    w?.since && w.until ? (w.until.getTime() - w.since.getTime()) / 3_600_000 : NaN;
  eq_('Vancouver spring-forward day is 23h',
    hoursOf(resolveTaskDateWindow(VAN, 'completed', p('today'), new Date('2026-03-08T20:00:00.000Z'))),
    23);
  eq_('Vancouver fall-back day is 25h',
    hoursOf(resolveTaskDateWindow(VAN, 'completed', p('today'), new Date('2026-11-01T20:00:00.000Z'))),
    25);
  eq_('Tehran day is always 24h (no DST)',
    hoursOf(resolveTaskDateWindow(TEH, 'completed', p('today'), new Date('2026-03-22T12:00:00.000Z'))),
    24);
}

// ── parseTaskListParams ─────────────────────────────────────────────────────

console.log('\n— parseTaskListParams —');
{
  const empty = parseQS('');
  eq_('empty URL → all defaults', empty, {
    q: '', client: '', category: '', assignee: '', priority: '',
    tags: [], tagMode: 'any',
    dfield: '', drange: '', from: '', to: '', sort: 'newest', group: '',
  });

  eq_('priority none accepted', parseQS('priority=none').priority, 'none');
  eq_('priority junk rejected', parseQS('priority=urgent').priority, '');
  eq_('dfield date accepted explicitly', parseQS('dfield=date&drange=today').dfield, 'date');
  eq_('dfield junk rejected', parseQS('dfield=sched&drange=today').dfield, '');
  eq_('custom bounds beat a preset (drange dropped)',
    parseQS('drange=today&from=2026-08-01'),
    { ...empty, from: '2026-08-01' });
  eq_('phantom calendar date rejected (V8 would roll it to March)',
    parseQS('from=2026-02-31').from, '');
  eq_('q clamped to 200 chars', parseQS(`q=${'a'.repeat(300)}`).q.length, 200);
  eq_('client internal passes the slug gate', parseQS('client=internal').client, 'internal');
  eq_('client bad slug rejected', parseQS('client=Bad_Slug').client, '');
  eq_('assignee id shape kept', parseQS('assignee=NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn').assignee, 'NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn');
  eq_('assignee junk rejected', parseQS('assignee=a b!').assignee, '');

  // Legacy aliases keep meaning what they said: ?due= was a DUE filter.
  eq_('legacy due=today → explicit due field', parseQS('due=today'),
    { ...empty, dfield: 'due', drange: 'today' });
  eq_('legacy due=overdue', parseQS('due=overdue'),
    { ...empty, dfield: 'due', drange: 'overdue' });
  eq_('legacy due=week', parseQS('due=week'),
    { ...empty, dfield: 'due', drange: 'week' });
  // ?month= and a literal ?drange= are the SCOPE's spellings now, and must
  // not ALSO survive as a date window: one month windowing the same rows twice
  // is the shape this whole change removes.
  eq_('?month= leaves the date facet untouched', parseQS('month=2026-07'), empty);
  eq_('a literal ?drange= month drops out of the facet',
    parseQS('drange=2026-07'), empty);
  eq_('?month= alongside a real preset keeps the preset',
    parseQS('month=2026-07&drange=today'), { ...empty, drange: 'today' });
  eq_('legacy ignored when the new facet is present',
    parseQS('due=today&drange=week'),
    { ...empty, drange: 'week' });

  // ── the tag facet ─────────────────────────────────────────────────────
  // Sorting is LOAD-BEARING, not tidiness: task_views stores the canonical
  // query string and compares it to the live one by equality, so an unsorted
  // list would make a saved view fail to match itself depending on which
  // chip the member ticked first.
  eq_('tags sorted + deduped', parseQS('tag=vertical,reels,vertical').tags,
    ['reels', 'vertical']);
  eq_('tag junk slugs dropped', parseQS('tag=reels,Bad_Slug,,vertical').tags,
    ['reels', 'vertical']);
  eq_('tag capped at TASK_TAG_MAX_IN_FILTER',
    parseQS(`tag=${Array.from({ length: 20 }, (_, i) => `t${i}`).join(',')}`).tags.length,
    TASK_TAG_MAX_IN_FILTER);
  eq_('untagged sentinel is exclusive', parseQS('tag=none,reels').tags, [UNTAGGED]);
  eq_('isUntaggedFilter recognises it', isUntaggedFilter(parseQS('tag=none').tags), true);
  eq_('isUntaggedFilter is false for a real tag named none-ish',
    isUntaggedFilter(parseQS('tag=none,none').tags.concat('reels')), false);
  eq_('tagmode all parsed', parseQS('tag=a,b&tagmode=all').tagMode, 'all');
  eq_('tagmode junk falls back to any', parseQS('tag=a,b&tagmode=most').tagMode, 'any');
}

// ── taskListQs canonicalization + round-trips ───────────────────────────────

console.log('\n— taskListQs —');
{
  eq_('bare today keeps dfield out of the URL (composite is the default)',
    taskListQs('open', { drange: 'today' }), 'drange=today');
  eq_('explicit due field serializes',
    taskListQs('open', { dfield: 'due', drange: 'today' }), 'dfield=due&drange=today');
  eq_('done view: the composite is NON-default there and serializes',
    taskListQs('done', { dfield: 'date', drange: 'today' }), 'status=done&dfield=date&drange=today');
  // A backward PRESET still goes: "Last 7 days" on `completed` could only
  // fight the digest's own rolling window, which is what it already is.
  eq_('digest drops a backward-field PRESET (its window IS its rolling days)',
    taskListQs('open', { dfield: 'completed', drange: 'week' }, undefined, 'digest'), 'view=digest');
  eq_('digest drops a backward-field custom range too',
    taskListQs('open', { dfield: 'completed', from: '2026-07-01', to: '2026-07-31' }, undefined, 'digest'), 'view=digest');
  // The month used to be the exception here — it REPLACES the digest's rolling
  // window rather than narrowing it — but it rides `month=` now, so there is
  // no exception left to make and a stray token must simply be dropped.
  eq_('digest drops a literal month from the facet too',
    taskListQs('open', { dfield: 'completed', drange: '2026-07' }, undefined, 'digest'), 'view=digest');
  eq_('digest keeps a composite (forward) window',
    taskListQs('open', { drange: 'today' }, undefined, 'digest'), 'view=digest&drange=today');
  eq_('inapplicable preset is not serialized (overdue on start)',
    taskListQs('open', { dfield: 'start', drange: 'overdue' }), '');
  eq_('priority none serializes', taskListQs('open', { priority: 'none' }), 'priority=none');
  eq_('tags serialize in canonical order after priority',
    taskListQs('open', { priority: 'high', tags: ['reels', 'vertical'] }),
    'priority=high&tag=reels%2Cvertical');
  eq_('tagmode=any is the default and is dropped',
    taskListQs('open', { tags: ['reels', 'vertical'], tagMode: 'any' }),
    'tag=reels%2Cvertical');
  eq_('tagmode=all serializes with two or more tags',
    taskListQs('open', { tags: ['reels', 'vertical'], tagMode: 'all' }),
    'tag=reels%2Cvertical&tagmode=all');
  eq_('tagmode=all on ONE tag is meaningless and is dropped',
    taskListQs('open', { tags: ['reels'], tagMode: 'all' }), 'tag=reels');
  eq_('tagmode=all on the untagged sentinel is dropped',
    taskListQs('open', { tags: [UNTAGGED], tagMode: 'all' }), 'tag=none');
  eq_('taskListQs survives a Partial with no tags key at all',
    taskListQs('open', { sort: 'due', group: 'client' }), 'sort=due&group=client');
  eq_('page only when > 1', taskListQs('open', {}, 1), '');
  eq_('custom bounds serialize, preset suppressed',
    taskListQs('open', { drange: 'today', from: '2026-08-01', to: '2026-08-10' }),
    'from=2026-08-01&to=2026-08-10');

  // Round-trip law over canonical param sets: parse(serialize(p)) === p.
  const CASES: [TaskView, Partial<TaskListParams>][] = [
    ['open', { drange: 'today' }],
    ['open', { dfield: 'due', drange: 'overdue' }],
    ['open', { dfield: 'start', drange: 'week' }],
    ['all', { dfield: 'created', drange: 'd30' }],
    ['done', { drange: 'lastmonth' }],
    ['open', { q: 'ubc vs bet', client: 'internal', priority: 'none' }],
    ['needs_approval', { assignee: 'NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn', drange: 'today' }],
    ['open', { from: '2026-08-01', to: '2026-08-10', group: 'due', sort: 'priority' }],
    ['open', { tags: ['reels', 'vertical'] }],
    ['open', { tags: ['reels', 'talking-head', 'vertical'], tagMode: 'all' }],
    ['open', { tags: [UNTAGGED] }],
    ['done', { tags: ['blog-post'], category: 'seo', drange: 'lastmonth' }],
  ];
  for (const [view, partial] of CASES) {
    const qs = taskListQs(view, partial);
    const back = parseQS(qs);
    const want = { ...parseQS(''), ...partial };
    eq_(`round-trip ${view} ?${qs}`, back, want);
  }

  eq_('inapplicable window does not count as an active filter',
    hasActiveTaskFilters(parseQS('dfield=start&drange=overdue'), 'open'), false);
  eq_('an applicable window does',
    hasActiveTaskFilters(parseQS('drange=today'), 'open'), true);
  eq_('a tag facet counts as active',
    hasActiveTaskFilters(parseQS('tag=reels'), 'open'), true);
  eq_('the untagged facet counts as active',
    hasActiveTaskFilters(parseQS('tag=none'), 'open'), true);

  // countActiveTaskFilters — the badge on the phone's "Filters" button. It must
  // agree with hasActiveTaskFilters about what a filter IS (a board narrowed by
  // an uncounted facet reads as an empty day), and must not double-count the
  // date facet, which is one control on screen however the URL spells it.
  eq_('no filters counts zero', countActiveTaskFilters(parseQS(''), 'open'), 0);
  eq_('q is NOT counted — it has its own always-visible field',
    countActiveTaskFilters(parseQS('q=reels'), 'open'), 0);
  eq_('sort and group are preferences, not filters',
    countActiveTaskFilters(parseQS('sort=priority&group=client'), 'open'), 0);
  eq_('drange counts once',
    countActiveTaskFilters(parseQS('drange=today'), 'open'), 1);
  eq_('dfield + drange is still ONE facet',
    countActiveTaskFilters(parseQS('dfield=start&drange=today'), 'open'), 1);
  eq_('from + to is still ONE facet',
    countActiveTaskFilters(parseQS('from=2026-08-01&to=2026-08-10'), 'open'), 1);
  eq_('an inapplicable window counts zero, exactly as it is not "active"',
    countActiveTaskFilters(parseQS('dfield=start&drange=overdue'), 'open'), 0);
  eq_('several tags are one tag facet',
    countActiveTaskFilters(parseQS('tag=reels,vertical&tagmode=all'), 'open'), 1);
  eq_('the untagged sentinel counts',
    countActiveTaskFilters(parseQS('tag=none'), 'open'), 1);
  eq_('every facet at once',
    countActiveTaskFilters(
      parseQS('client=vela&category=seo&assignee=NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn&priority=high&tag=reels&drange=today'),
      'open',
    ), 6);

  // The one invariant tying the pair together, stated rather than re-derived:
  // `q` is the ONLY thing hasActiveTaskFilters treats as a filter that the
  // count leaves out. Any other divergence — a facet added to one and not the
  // other — fails here, which is the whole reason the count lives beside it.
  for (const qs of [
    '', 'q=reels', 'q=reels&client=vela', 'client=vela', 'category=seo',
    'assignee=NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn', 'priority=none', 'tag=none',
    'tag=reels,vertical', 'drange=today', 'from=2026-08-01',
    'dfield=start&drange=overdue', 'sort=oldest', 'group=due',
    // A scope is not a filter: it must neither count nor read as active, or
    // "Clear filters" would offer to clear the month the board is about.
    'month=2026-07', 'month=all',
  ]) {
    const p = parseQS(qs);
    eq_(`active === counted-or-searching for ?${qs || '<none>'}`,
      hasActiveTaskFilters(p, 'open'),
      countActiveTaskFilters(p, 'open') > 0 || p.q !== '');
  }
}

// ── The sort vocabulary ─────────────────────────────────────────────────────

console.log('\n— the sort vocabulary —');
{
  // Column sorting rides the EXISTING `sort` param rather than a `sort`+`dir`
  // pair, which is what keeps every string already stored in `task_views.query`
  // valid: TaskListParams gains no field, the canonical param order never
  // moves, and a default sort still serializes to nothing. SavedViews matches a
  // view by exact string equality and nothing rewrites those rows, so these
  // three are a data-migration guard, not a formatting test.
  eq_('the default sort is still dropped', taskListQs('open', { sort: 'newest' }), '');
  eq_('a bare board is still an empty string', taskListQs('open', {}), '');
  eq_('the pre-existing spelling is byte-identical',
    taskListQs('open', { sort: 'due', group: 'client' }), 'sort=due&group=client');

  // Swept over the vocabulary rather than spot-checked, so a token added later
  // is forced through every rule below instead of inheriting one.
  for (const sort of TASK_SORTS) {
    const qs = taskListQs('open', { sort });
    eq_(`?sort=${sort} round-trips`, parseQS(qs).sort, sort);
    ok_(`${sort} is its own token`, isTaskSort(sort));
    // Sort is a PREFERENCE: it reorders, it never narrows. If it ever counted,
    // "Clear filters" would offer to clear it and the phone's badge would say
    // a board is filtered when it is only sorted.
    eq_(`${sort} is not a filter`, countActiveTaskFilters(parseQS(qs), 'open'), 0);
    eq_(`${sort} does not read as active`, hasActiveTaskFilters(parseQS(qs), 'open'), false);
    ok_(`${sort} has a direction`, TASK_SORT_DIRECTION[sort] === 'ascending' || TASK_SORT_DIRECTION[sort] === 'descending');
    ok_(`${sort} has words`, TASK_SORT_SHORT_LABELS[sort].length > 0);
  }

  eq_('junk falls back to the default', parseQS('sort=sideways').sort, 'newest');
  eq_('so does a near miss', parseQS('sort=title-AZ').sort, 'newest');

  // A token belongs to exactly one column, or it is one of the two board
  // orders. Two claimants would light two headers' arrows for one order; none
  // would make a token unreachable from the table it is supposed to be sorted
  // from.
  for (const sort of TASK_SORTS) {
    const claimants = TASK_COLUMNS.filter((c) => TASK_COLUMN_SORTS[c].includes(sort));
    const board = sort === 'newest' || sort === 'oldest';
    eq_(`${sort} is claimed by ${board ? 'no' : 'exactly one'} column`,
      claimants.length, board ? 0 : 1);
    eq_(`columnForSort agrees about ${sort}`,
      columnForSort(sort), board ? null : claimants[0]);
  }

  // The board's own order belongs to no column on purpose: it reads
  // created_at on a working tab and completed_at on a shipped one, and neither
  // is a column on screen.
  eq_('newest lights no header', columnForSort('newest'), null);
  eq_('oldest lights no header', columnForSort('oldest'), null);

  // Every offered token is a real one — a column offering a token the parser
  // would silently drop is a menu row that does nothing.
  for (const column of TASK_COLUMNS) {
    for (const sort of TASK_COLUMN_SORTS[column]) {
      ok_(`${column} offers the real token ${sort}`, isTaskSort(sort));
    }
    // A column offers two orders or none: one direction with no way back is a
    // sort you cannot undo without reaching for another control.
    ok_(`${column} offers a pair or nothing`,
      TASK_COLUMN_SORTS[column].length === 0 || TASK_COLUMN_SORTS[column].length === 2);
    // And the pair points opposite ways. Both members reading 'ascending' is a
    // copy-paste that draws the same arrow for both rows and reports the same
    // aria-sort for both, with the board visibly reordering underneath it.
    const [first, second] = TASK_COLUMN_SORTS[column];
    if (first && second) {
      ok_(`${column}'s two orders point opposite ways`,
        TASK_SORT_DIRECTION[first] !== TASK_SORT_DIRECTION[second]);
    }
  }

  // The one-value-per-row rule, asserted as a REFUSAL rather than left implied.
  // A task carries several tags and can be worked by several members, so
  // ordering by "the first one alphabetically" would file a shoot two people
  // went on under whichever name sorts first. It is also what keeps every
  // ORDER BY on `tasks` plus the two 1:1 joins, with no correlated subquery.
  eq_('Tags offers no sort', TASK_COLUMN_SORTS.tags, []);
  eq_('Member offers no sort', TASK_COLUMN_SORTS.member, []);

  // One order, one set of words. The chip and the header read the same map, so
  // a duplicate here would be two menu rows that look like two orders and are
  // one.
  const labels = TASK_SORTS.map(taskSortLabel);
  eq_('every order reads differently', new Set(labels).size, labels.length);
  eq_('a column names itself in the chip', taskSortLabel('client-az'), 'Client · A → Z');
  eq_('the board orders do not', taskSortLabel('newest'), 'Newest');
}

// ── The month scope ─────────────────────────────────────────────────────────

console.log('\n— the month scope —');
{
  // Defaults differ by view, and both are deliberate. The list opens on the
  // CURRENT month (the clean table each month); the digest opens UNSCOPED,
  // because its rolling seven days routinely straddles a month boundary and
  // clipping it to the calendar month would empty that page every 1st.
  eq_('list defaults to the current month', monthQS(''), '2026-08');
  eq_('digest defaults to unscoped',
    monthQS('', { mode: 'digest' }), TASK_MONTH_ALL);
  eq_('an explicit month wins on both views', monthQS('month=2026-05'), '2026-05');
  eq_('all time is expressible', monthQS('month=all'), TASK_MONTH_ALL);
  eq_('junk falls back to the view default', monthQS('month=2026-13'), '2026-08');
  eq_('a phantom month is junk', monthQS('month=0000-00'), '2026-08');

  // Both legacy spellings resolve onto the scope, so every bookmark, emailed
  // link and saved view minted while the month was a date-facet value keeps
  // landing on the month it named.
  eq_('legacy ?drange=YYYY-MM resolves onto the scope',
    monthQS('status=done&drange=2026-07'), '2026-07');
  eq_('legacy ?drange month reaches the DIGEST scope too',
    monthQS('view=digest&dfield=completed&drange=2026-07', { mode: 'digest' }),
    '2026-07');
  eq_('an explicit month beats a legacy drange',
    monthQS('month=2026-05&drange=2026-07'), '2026-05');
  eq_('month=all beats a legacy drange (it is an explicit answer)',
    monthQS('month=all&drange=2026-07'), TASK_MONTH_ALL);

  // taskScopeQs: the default is dropped so a bare /admin/tasks means "this
  // month" and goes on meaning it next month.
  const scope = (month: string, mode: TaskViewMode = 'list') =>
    ({ month, currentMonth: '2026-08', mode });
  eq_('the current month is dropped from the URL',
    taskScopeQs('open', {}, scope('2026-08')), '');
  eq_('another month serializes right after status',
    taskScopeQs('done', {}, scope('2026-07')), 'status=done&month=2026-07');
  eq_('all time is explicit',
    taskScopeQs('open', {}, scope(TASK_MONTH_ALL)), 'month=all');
  eq_('the month sits between view and the filters',
    taskScopeQs('done', { q: 'reels' }, scope('2026-07'), 2),
    'status=done&month=2026-07&q=reels&page=2');
  eq_('on the digest, unscoped is the default and is dropped',
    taskScopeQs('open', {}, scope(TASK_MONTH_ALL, 'digest')), 'view=digest');
  eq_('on the digest, the CURRENT month is not the default and serializes',
    taskScopeQs('open', {}, scope('2026-08', 'digest')), 'view=digest&month=2026-08');
  eq_('a scope URL round-trips back to its own month',
    monthQS(taskScopeQs('done', { q: 'reels' }, scope('2026-07'))), '2026-07');

  // THE SAVED-VIEW RULE. task_views.query stores taskListQs' output and
  // compares it to the live one by string equality, so a month inside it
  // would pin a saved view to the month it was saved in and quietly stop
  // matching a month later. Swept, not spot-checked: this is the kind of thing
  // a later convenience re-adds by accident.
  const SWEEP: [TaskView, Partial<TaskListParams>][] = [
    ['open', {}],
    ['open', { drange: 'today' }],
    ['done', { drange: 'lastmonth' }],
    ['all', { dfield: 'created', drange: 'd30' }],
    ['done', { tags: ['blog-post'], category: 'seo', sort: 'oldest' }],
    ['needs_approval', { q: 'reels', client: 'internal', group: 'due' }],
    ['posted', { from: '2026-08-01', to: '2026-08-10' }],
  ];
  for (const [view, partial] of SWEEP) {
    ok_(`no month in taskListQs for ${view} ?${taskListQs(view, partial)}`,
      !taskListQs(view, partial).includes('month='));
  }
  ok_('not even when the params object carries one',
    !taskListQs('done', { ...parseQS('month=2026-07&drange=today') }).includes('month='));
  ok_('and not in digest mode either',
    !taskListQs('open', {}, undefined, 'digest').includes('month='));

  // Which tabs a scope can honestly offer. A past month can only ever show
  // what shipped in it, so the four working tabs are not offered — and a
  // bookmarked ?status=open on one has to be coerced before the strip renders
  // with nothing highlighted over a list that can only be empty.
  eq_('the current month offers every tab',
    taskTabsFor('2026-08', '2026-08').length, TASK_STATUS_SLUGS.length + 2);
  eq_('all time offers every tab',
    taskTabsFor(TASK_MONTH_ALL, '2026-08').length, TASK_STATUS_SLUGS.length + 2);
  eq_('a past month offers the shipped tabs and All only',
    taskTabsFor('2026-07', '2026-08'),
    ['done', 'delivered', 'posted', 'all']);
  // Swept over the vocabulary rather than written out: a status added later is
  // forced through this decision instead of inheriting one.
  for (const view of TASK_STATUS_SLUGS) {
    const offered = taskTabsFor('2026-07', '2026-08').includes(view as TaskView);
    eq_(`past month offers ${view} === it is shipped`, offered, isShipped(view));
    eq_(`coerce ${view} on a past month`,
      coerceTaskView(view as TaskView, '2026-07', '2026-08'),
      isShipped(view) ? view : 'done');
    eq_(`no coercion for ${view} on the current month`,
      coerceTaskView(view as TaskView, '2026-08', '2026-08'), view);
  }
  eq_('the composite Open tab is coerced too',
    coerceTaskView('open', '2026-07', '2026-08'), 'done');
  eq_('All survives a past month', coerceTaskView('all', '2026-07', '2026-08'), 'all');

  eq_('all time is not a month', isMonthScoped(TASK_MONTH_ALL), false);
  eq_('neither is the empty scope', isMonthScoped(''), false);
  eq_('all time is never past', isPastMonth(TASK_MONTH_ALL, '2026-08'), false);
  eq_('a future month is not past', isPastMonth('2026-09', '2026-08'), false);
  eq_('December sorts before the next January',
    isPastMonth('2026-12', '2027-01'), true);

  // ── TWO CLOCKS, and this is the one that matters ────────────────────────
  // `monthIncludesOpen` is the single branch that lets unfinished work through.
  // It is a function of the READER's zone, and nothing on screen would
  // contradict it if it were not: at 22:15Z on Aug 31 Vancouver is still in
  // August while Tehran is already in September, so the same token is the live
  // month for one of them and a closed record for the other. If this ever
  // stops disagreeing, the scope has quietly been pinned to one clock.
  const EDGE = new Date('2026-08-31T22:15:00.000Z');
  eq_('Vancouver is still in August at the edge instant',
    monthTokenIn(VAN, EDGE), '2026-08');
  eq_('Tehran is already in September at the same instant',
    monthTokenIn(TEH, EDGE), '2026-09');
  ok_('August is the CURRENT month for a Vancouver reader',
    isCurrentMonth('2026-08', monthTokenIn(VAN, EDGE)));
  ok_('...and a PAST one for a Tehran reader at the same instant',
    isPastMonth('2026-08', monthTokenIn(TEH, EDGE)));
  ok_('the two readers disagree, which is the contract',
    isCurrentMonth('2026-08', monthTokenIn(VAN, EDGE)) !==
      isCurrentMonth('2026-08', monthTokenIn(TEH, EDGE)));
  eq_('and the tab list follows the same clock',
    taskTabsFor('2026-08', monthTokenIn(TEH, EDGE)),
    ['done', 'delivered', 'posted', 'all']);
}

// ── The DB round trip (--db) ────────────────────────────────────────────────

if (!process.argv.includes('--db')) {
  console.log(
    `\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure checks; add --db with --env-file=.env.local for the Postgres round trip)`,
  );
  process.exit(fails === 0 ? 0 : 1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing — run with --env-file=.env.local');
  process.exit(1);
}

console.log('\n— DB round trip (real tasksWhere against seeded fixtures) —');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const TAG = 'ZZ-CHECK';

// Prefix-and-sweep, not a rollback: neon-http/-serverless has no transactions
// here we can lean on, so the tag is the safety line (verify-payroll-db rule).
const sweep = async () => {
  // Tasks FIRST: task_tag_links cascades on task delete, which is what makes
  // the tags below deletable at all (their side of that FK is restrict).
  await db.delete(tasks).where(like(tasks.title, `${TAG}%`));
  await db.delete(taskTags).where(like(taskTags.slug, 'zz-check-tag-%'));
  // Types after their tags — task_tags.type_id is restrict, on purpose.
  await db.delete(taskTagTypes).where(like(taskTagTypes.slug, 'zz-check-type-%'));
  await db.delete(taskCategories).where(inArray(taskCategories.slug, ['zz-check-cat', 'zz-check-cat-2']));
  await db.delete(clients).where(eq(clients.slug, 'zz-check-client'));
};

// The names search has to find, spelled once so the oracle and the fixtures
// can't disagree about them. Each is distinct enough that a query aimed at one
// cannot accidentally substring another (e.g. 'ZZ-CHECK A' is not inside
// 'ZZ-CHECK Cat' — the check below would be worthless if it were).
const CLIENT_NAME = 'ZZ-CHECK Client';
// 'Bucket', not 'Cat'. Search is TOKENIZED now, so a name has to stay
// discriminating word by word: 'ZZ-CHECK Cat' split into ['zz-check','cat'],
// and 'cat' is a substring of the 'second-cat' fixture's own TITLE — so the
// category probe silently matched the one row it exists to exclude.
const CATEGORY_NAME = 'ZZ-CHECK Bucket';
const ASSIGNEE_NAME = 'ZZ Check';
// Deliberately NOT the assignee's name. Search covers assignee_name and
// explicitly does NOT cover created_by_name, and while the two fixtures
// shared one string every assertion about the assignee clause was vacuous —
// it would have passed just as well against the wrong column.
const CREATOR_NAME = 'ZZ Maker';
// A second category, so the category EXISTS has to be CORRELATED to pass:
// with one category for every fixture, dropping `tc.id = tasks.category_id`
// changed nothing observable.
const CATEGORY_2_NAME = 'ZZ-CHECK Other';
// One fixture's notes. The notes branch of the OR had no coverage at all —
// deleting `ilike(tasks.notes, …)` left every assertion green.
const NOTES_TEXT = 'ZZ-CHECK noted marginalia';
// 'TagA'/'TagB', not 'A'/'B'. A one-character token is DROPPED by the
// tokenizer whenever a real term survives beside it (it would match almost
// every row), so 'ZZ-CHECK A' reduced to just ['zz-check'] and the tag probe
// quietly became "return everything" — green, and worthless.
const tagNameFor = (slug: string) => `ZZ-CHECK Tag${slug.slice(-1).toUpperCase()}`;

type Fx = {
  key: string;
  title: string;
  status: TaskStatusSlug;
  priority: TaskPrioritySlug | null;
  start: string | null;
  due: string | null;
  completedAt: Date | null;
  internal: boolean;
  createdAt: Date;
  /** Fixture tag SLUGS. Empty is itself a case — the untagged facet. */
  tags: string[];
  /** Only one fixture carries notes — enough to pin that branch of the OR. */
  notes: string | null;
  /** Only one fixture sits in the second category — the correlation probe. */
  cat2: boolean;
  /** Logged and confirmed hours. Stamped by index below rather than by hand,
   *  because no FILTER reads them and every ORDER BY over the Time column
   *  does. */
  minutes: number;
  actual: number | null;
};

try {
  await sweep(); // a crashed earlier run leaves nothing behind

  const now = new Date();
  const tVan = dayKeyIn(VAN, now);
  const tTeh = dayKeyIn(TEH, now);
  const lastTok = shiftMonthToken(monthTokenIn(VAN, now), -1);
  // The 15th at noon UTC — inside last month in every zone on Earth.
  const lastMonthMid = new Date(
    dayStartIn('UTC', `${lastTok}-15`).getTime() + 12 * 3_600_000,
  );

  const [cat] = await db
    .insert(taskCategories)
    .values({ slug: 'zz-check-cat', name: CATEGORY_NAME, siteCategory: 'production' })
    .returning({ id: taskCategories.id });
  const [cat2] = await db
    .insert(taskCategories)
    .values({ slug: 'zz-check-cat-2', name: CATEGORY_2_NAME, siteCategory: 'production' })
    .returning({ id: taskCategories.id });
  const [zzClient] = await db
    .insert(clients)
    .values({ slug: 'zz-check-client', name: CLIENT_NAME })
    .returning({ id: clients.id });

  // Every discriminating date shape. Dates anchor on Vancouver's today; the
  // oracle recomputes expectations from the resolved window, so the Tehran
  // pass stays correct even when the two todays differ at run time. The two
  // ubc rows exist so the NAMED regression assertion holds in each zone.
  const def = (
    key: string,
    fx: Partial<Omit<Fx, 'key' | 'title' | 'createdAt'>> & { title?: string },
  ): Fx => ({
    key,
    title: fx.title ?? `${TAG} ${key}`,
    status: fx.status ?? 'todo',
    priority: fx.priority ?? null,
    start: fx.start ?? null,
    due: fx.due ?? null,
    completedAt: fx.completedAt ?? null,
    internal: fx.internal ?? false,
    createdAt: now,
    tags: fx.tags ?? [],
    notes: fx.notes ?? null,
    cat2: fx.cat2 ?? false,
    minutes: 60,
    actual: null,
  });
  const FIXTURES: Fx[] = [
    def('ubc-van', { status: 'needs_approval', start: tVan }),
    def('ubc-teh', { status: 'needs_approval', start: tTeh }),
    // Tag shapes: A only, A+B, B only, all three, and (everything else) none.
    // Chosen so `any` and `all` return DIFFERENT sets — a check where the two
    // modes agree proves nothing about either.
    def('due-today', { due: tVan, tags: ['zz-check-tag-a', 'zz-check-tag-b'] }),
    def('span', { status: 'in_progress', start: shiftDayKey(tVan, -2), due: shiftDayKey(tVan, 2), tags: ['zz-check-tag-a'] }),
    def('no-dates', { priority: 'low', tags: ['zz-check-tag-b'] }),
    def('overdue-open', { due: shiftDayKey(tVan, -3) }),
    def('overdue-done', { status: 'done', due: shiftDayKey(tVan, -3), completedAt: now }),
    def('ongoing', { start: shiftDayKey(tVan, -10) }),
    def('due-soon', { priority: 'medium', due: shiftDayKey(tVan, 5) }),
    def('due-far', { due: shiftDayKey(tVan, 40) }),
    def('done-today', { status: 'done', start: tVan, completedAt: now }),
    def('done-lastmonth', { status: 'done', completedAt: lastMonthMid }),
    // The two stages past done. They carry a completedAt exactly as a done row
    // does — that IS the contract — so they must land in every window and
    // every report a done row lands in, and must stay OUT of Overdue despite
    // the past due date on the delivered one.
    def('handed-over', { status: 'delivered', completedAt: now }),
    def('handed-over-late', {
      status: 'delivered',
      due: shiftDayKey(tVan, -3),
      completedAt: now,
    }),
    def('published', { status: 'posted', completedAt: now }),
    def('published-lastmonth', { status: 'posted', completedAt: lastMonthMid }),
    // A BACKDATED completion, anchored exactly the way setTaskStatus anchors
    // one — and on the 1st, the discriminating day: with day-start anchoring a
    // Tehran-picked 1st falls OUT of this month's completed window for a
    // Vancouver reader. This proves the midday choice against the real WHERE
    // rather than against a formatted label (check-calendar.mts covers the
    // key math itself).
    def('done-backdated-first', {
      status: 'done',
      completedAt: dayNoonIn(TEH, `${monthTokenIn(VAN, now)}-01`),
    }),
    def('high', { priority: 'high', tags: ['zz-check-tag-a', 'zz-check-tag-b', 'zz-check-tag-c'] }),
    def('pct', { title: `${TAG} 100%_special` }),
    def('pct-decoy', { title: `${TAG} 100Xspecial` }),
    def('internal', { internal: true }),
    def('noted', { notes: NOTES_TEXT }),
    def('second-cat', { cat2: true }),
  ];

  // Ordering needs values that DISCRIMINATE, and the fixtures above are
  // deliberately uniform on the two axes no filter reads: every row was
  // created in the same instant and logged the same hour, which would leave
  // every Time and every Newest/Oldest assertion below collapsing onto the id
  // tiebreak and passing without testing anything. Staggered here rather than
  // by hand above so the filter cases keep reading as filter cases, and every
  // created stamp stays inside today, so no window assertion moves.
  FIXTURES.forEach((fx, i) => {
    fx.createdAt = new Date(now.getTime() - i * 60_000);
    fx.minutes = 30 + i * 15;
    // Only a finished task has confirmed hours, which is what makes the Time
    // column a coalesce rather than a column.
    fx.actual = fx.status === 'done' ? 500 + i * 20 : null;
  });

  const inserted = await db
    .insert(tasks)
    .values(
      FIXTURES.map((fx) => ({
        title: fx.title,
        clientId: fx.internal ? null : zzClient.id,
        categoryId: fx.cat2 ? cat2.id : cat.id,
        status: fx.status,
        priority: fx.priority,
        createdById: null,
        createdByName: CREATOR_NAME,
        estimatedMinutes: fx.minutes,
        actualMinutes: fx.actual,
        notes: fx.notes,
        startDate: fx.start,
        dueDate: fx.due,
        completedAt: fx.completedAt,
        createdAt: fx.createdAt,
        updatedAt: fx.createdAt,
      })),
    )
    .returning({ id: tasks.id, title: tasks.title });

  // Members live in their own table now, so the search-reach fixtures have to
  // carry a row each. user_id stays NULL — the deletion policy's snapshot
  // shape, and it keeps this script free of a dependency on which real
  // accounts exist. The ?assignee= clause is covered by
  // check-task-assignees.mts, which seeds live ids for exactly that reason.
  await db.insert(taskAssignees).values(
    inserted.map((row) => ({
      taskId: row.id,
      userId: null,
      memberName: ASSIGNEE_NAME,
    })),
  );
  const idByTitle = new Map(inserted.map((r) => [r.title, r.id]));
  const idOf = (key: string) => {
    const fx = FIXTURES.find((f) => f.key === key)!;
    return idByTitle.get(fx.title)!;
  };
  /** Every fixture id — the search cases scope by these instead of by `q`. */
  const fixtureIds = inserted.map((r) => r.id);

  // The tag vocabulary + the links. All three are swept with the tasks above.
  // Types first: a tag cannot be inserted without one.
  const typeRows = await db
    .insert(taskTagTypes)
    .values(
      ['format', 'content', 'workflow'].map((slug, i) => ({
        slug: `zz-check-type-${slug}`,
        name: `ZZ ${slug}`,
        tone: (['sky', 'emerald', 'violet'] as const)[i],
        sortIndex: (i + 1) * 10,
      })),
    )
    .returning({ id: taskTagTypes.id });
  const tagSlugs = [...new Set(FIXTURES.flatMap((fx) => fx.tags))].sort();
  const tagRows = await db
    .insert(taskTags)
    .values(
      tagSlugs.map((slug, i) => ({
        slug,
        name: tagNameFor(slug),
        typeId: typeRows[i % typeRows.length].id,
        sortIndex: (i + 1) * 10,
      })),
    )
    .returning({ id: taskTags.id, slug: taskTags.slug });
  const tagIdBySlug = new Map(tagRows.map((r) => [r.slug, r.id]));
  await db.insert(taskTagLinks).values(
    FIXTURES.flatMap((fx) =>
      fx.tags.map((slug) => ({
        taskId: idByTitle.get(fx.title)!,
        tagId: tagIdBySlug.get(slug)!,
      })),
    ),
  );

  // Search reaches six places, so the oracle has to as well: the two text
  // columns, the assignee-name snapshot, the client's name (or the 'Perseus'
  // literal the Client column shows for a null client), the category's name,
  // and any tag's name. Fixtures carry no notes, which is itself the case
  // that proves a NULL column can't swallow the OR.
  const matchesQ = (fx: Fx, q: string): boolean => {
    const hay = [
      fx.title,
      fx.notes ?? '',
      fx.internal ? 'Perseus' : CLIENT_NAME,
      ASSIGNEE_NAME,
      fx.cat2 ? CATEGORY_2_NAME : CATEGORY_NAME,
      ...fx.tags.map((slug) => tagNameFor(slug)),
      // CREATOR_NAME is deliberately absent: created_by_name is NOT searched.
    ].map((h) => h.toLowerCase());
    // An AND of ORs, restated: EVERY token must land in at least one field,
    // but not necessarily the same field as its neighbour. That last clause is
    // the whole point of tokenizing — it is what lets a member name and a
    // title word be typed in one breath. `searchTokens` itself is pinned
    // separately in scripts/check-search-terms.mts, so what this restates is
    // the predicate SHAPE, which is the half tasksWhere owns.
    return searchTokens(q).every((token) => hay.some((h) => h.includes(token)));
  };

  // The independent oracle: TaskFilters semantics re-stated over the fixture
  // definitions in plain JS. If tasksWhere and this ever disagree, one of
  // them is wrong about what a filter means — which is the whole check.
  const matches = (fx: Fx, statuses: readonly TaskStatusSlug[], f: TaskFilters): boolean => {
    if (!statuses.includes(fx.status)) return false;
    if (f.q && !matchesQ(fx, f.q)) return false;
    if (f.clientId === 'internal') {
      if (!fx.internal) return false;
    } else if (f.clientId) {
      if (fx.internal) return false;
    }
    // Every fixture's member row has a NULL user_id, so an id filter matches
    // nothing here by construction. The clause itself is proven against live
    // ids in check-task-assignees.mts --db rather than left vacuous.
    if (f.assigneeId) return false;
    // Two categories now, so this is load-bearing rather than decorative.
    if (f.categoryId && f.categoryId !== (fx.cat2 ? cat2.id : cat.id)) return false;
    if (f.priority === 'none') {
      if (fx.priority !== null) return false;
    } else if (f.priority) {
      if (fx.priority !== f.priority) return false;
    }
    // THE MONTH SCOPE, re-stated: completed inside the window, OR — only on
    // the reader's current month — not completed at all. A past month is a
    // closed record; unfinished work is always "now".
    if (f.monthSince && f.monthUntil) {
      const shipped =
        fx.completedAt !== null &&
        fx.completedAt >= f.monthSince &&
        fx.completedAt < f.monthUntil;
      const open = fx.completedAt === null;
      if (!shipped && !(f.monthIncludesOpen && open)) return false;
    }
    if (f.completedSince && !(fx.completedAt && fx.completedAt >= f.completedSince)) return false;
    if (f.completedUntil && !(fx.completedAt && fx.completedAt < f.completedUntil)) return false;
    if (f.createdSince && fx.createdAt < f.createdSince) return false;
    if (f.createdUntil && fx.createdAt >= f.createdUntil) return false;
    if (f.dueSince && !(fx.due && fx.due >= f.dueSince)) return false;
    if (f.dueBefore && !(fx.due && fx.due < f.dueBefore)) return false;
    if (f.dueIsNull && fx.due !== null) return false;
    if (f.startSince && !(fx.start && fx.start >= f.startSince)) return false;
    if (f.startBefore && !(fx.start && fx.start < f.startBefore)) return false;
    if (f.startIsNull && fx.start !== null) return false;
    const sched = fx.due ?? fx.start;
    if (f.schedSince && !(sched && sched >= f.schedSince)) return false;
    if (f.schedBefore && !(sched && sched < f.schedBefore)) return false;
    if (f.schedIsNull && sched !== null) return false;
    // Mirrors taskPredicates.ts's `notInArray(status, SHIPPED_STATUSES)`, and
    // must move with it: a delivered or posted row is even further past owing
    // anything than a done one, so Overdue keeps the whole set out.
    if (f.dueOpenOnly && isShipped(fx.status)) return false;
    // The tag facet, re-stated over the fixture definitions. `untagged` and
    // `tagIds` are mutually exclusive by the parser's own rule, so this
    // mirrors that shape rather than trying to combine them.
    if (f.untagged && fx.tags.length > 0) return false;
    if (f.tagIds && f.tagIds.length > 0) {
      const own = new Set(fx.tags.map((slug) => tagIdBySlug.get(slug)!));
      const hit = f.tagIds.filter((id) => own.has(id)).length;
      if (f.tagMode === 'all' ? hit !== f.tagIds.length : hit === 0) return false;
    }
    return true;
  };

  // Mirrors resolveTaskFilters (which is `server-only` and unimportable here):
  // the two slug→id lookups re-stated; the date logic is the REAL pure code.
  const resolveLocal = async (
    tz: string,
    params: TaskListParams,
    view: TaskView,
    month: string = TASK_MONTH_ALL,
  ): Promise<TaskFilters | null> => {
    const f: TaskFilters = {
      q: params.q || undefined,
      assigneeId: params.assignee || undefined,
      priority: params.priority || undefined,
    };
    if (params.client === 'internal') {
      f.clientId = 'internal';
    } else if (params.client) {
      const [row] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.slug, params.client))
        .limit(1);
      if (!row) return null;
      f.clientId = row.id;
    }
    if (params.category) {
      const [row] = await db
        .select({ id: taskCategories.id })
        .from(taskCategories)
        .where(eq(taskCategories.slug, params.category))
        .limit(1);
      if (!row) return null;
      f.categoryId = row.id;
    }
    if (isUntaggedFilter(params.tags)) {
      f.untagged = true;
    } else if (params.tags.length > 0) {
      const rows = await db
        .select({ id: taskTags.id })
        .from(taskTags)
        .where(inArray(taskTags.slug, params.tags));
      if (rows.length !== params.tags.length) return null;
      f.tagIds = rows.map((r) => r.id);
      f.tagMode = params.tagMode;
    }
    const field = resolveTaskDateField(params.dfield, view);
    const window = resolveTaskDateWindow(tz, field, params, now);
    if (window) applyTaskDateWindow(f, field, window);
    // The scope, mirroring resolveTaskFilters — including that the
    // current-month test is taken in THIS reader's zone, which is the branch
    // the two-clocks assertions above are about.
    if (isMonthScoped(month)) {
      const w = monthWindowIn(tz, month);
      if (w) {
        f.monthSince = w.since;
        f.monthUntil = w.until;
        f.monthIncludesOpen = isCurrentMonth(month, monthTokenIn(tz, now));
      }
    }
    return f;
  };

  const runCase = async (tz: string, label: string, qsStr: string): Promise<string[]> => {
    const sp = new URLSearchParams(qsStr);
    const params = parseTaskListParams((k) => sp.get(k) ?? '');
    if (!params.q.includes(TAG)) throw new Error(`unscoped case: ${label}`);
    // A case with no `month=` runs UNSCOPED, which is NOT the list page's own
    // default (that is the current month). Deliberate: every case below is
    // about the date FACET, and intersecting each with a month would make
    // several of them vacuous on both sides — "Done: last month preset" under
    // a current-month scope is the empty set agreeing with the empty set. The
    // scope gets its own cases, which name their month.
    const currentMonth = monthTokenIn(tz, now);
    const month = sp.get('month')
      ? parseTaskMonth((k) => sp.get(k) ?? '', { mode: 'list', currentMonth })
      : TASK_MONTH_ALL;
    const view = coerceTaskView(
      resolveTaskView(sp.get('status') ?? ''),
      month,
      currentMonth,
    );
    const f = await resolveLocal(tz, params, view, month);
    if (!f) throw new Error(`unexpectedly unresolved: ${label}`);
    const statuses = TASK_VIEW_STATUSES[view];
    const rows = await db.select({ id: tasks.id }).from(tasks).where(tasksWhere(statuses, f));
    const got = rows.map((r) => r.id).sort();
    const want = FIXTURES.filter((fx) => matches(fx, statuses, f))
      .map((fx) => idByTitle.get(fx.title)!)
      .sort();
    eq_(`[${tz === VAN ? 'Van' : 'Teh'}] ${label}`, got, want);
    return got;
  };

  for (const tz of [VAN, TEH]) {
    const zone = tz === VAN ? 'Van' : 'Teh';
    await runCase(tz, 'everything on All', `status=all&q=${TAG}`);

    // THE regression, asserted by NAME as well as by oracle: the start-only
    // needs_approval task dated this zone's today must be in the Today view.
    const regression = await runCase(
      tz, 'Today on Needs approval (the screenshot)', `status=needs_approval&drange=today&q=${TAG}`,
    );
    eq_(
      `[${zone}] start-only task dated today IS in Today`,
      regression.includes(idOf(tz === VAN ? 'ubc-van' : 'ubc-teh')),
      true,
    );

    await runCase(tz, 'Today on Open (composite)', `drange=today&q=${TAG}`);
    await runCase(tz, 'Due today, explicitly', `dfield=due&drange=today&status=all&q=${TAG}`);
    await runCase(tz, 'Start today, explicitly', `dfield=start&drange=today&status=all&q=${TAG}`);

    const overdue = await runCase(tz, 'Overdue (due-based, open only)', `drange=overdue&q=${TAG}`);
    eq_(`[${zone}] past start-only task is NOT overdue`, overdue.includes(idOf('ongoing')), false);
    eq_(`[${zone}] done task with past due is NOT overdue`, overdue.includes(idOf('overdue-done')), false);

    // Overdue on the ALL tab, which is the only view where dueOpenOnly does
    // any work of its own: on `open` the status filter has already removed
    // every shipped row, so an assertion there passes whatever the predicate
    // says. This is the case that made the filter contradict its own name —
    // finished tasks with a past due date, listed and untinted — and with
    // three shipped statuses each one has to be refused separately.
    const overdueAll = await runCase(
      tz, 'Overdue on the All tab', `drange=overdue&status=all&q=${TAG}`,
    );
    for (const key of ['overdue-done', 'handed-over-late'] as const) {
      eq_(
        `[${zone}] shipped '${key}' with a past due is NOT overdue on All`,
        overdueAll.includes(idOf(key)),
        false,
      );
    }
    eq_(
      `[${zone}] an OPEN task with a past due IS overdue on All`,
      overdueAll.includes(idOf('overdue-open')),
      true,
    );

    await runCase(tz, 'No date (both columns null)', `drange=none&q=${TAG}`);
    await runCase(tz, 'Next 7 days', `drange=week&q=${TAG}`);
    await runCase(tz, 'Next 30 days', `drange=d30&q=${TAG}`);
    await runCase(tz, 'This month (composite)', `drange=month&q=${TAG}`);
    await runCase(tz, 'Done: completed today', `status=done&drange=today&q=${TAG}`);
    await runCase(tz, 'Done: last month preset', `status=done&drange=lastmonth&q=${TAG}`);
    // ── THE MONTH SCOPE ───────────────────────────────────────────────────
    // A finished task belongs to the month it finished; unfinished work is
    // always "now". Both halves are asserted by NAME as well as by oracle,
    // because an oracle that made the same mistake as the predicate would
    // agree with it perfectly.
    const scopedAll = await runCase(
      tz, 'Scope: the current month, every status',
      `status=all&month=${monthTokenIn(tz, now)}&q=${TAG}`,
    );
    eq_(
      `[${zone}] an OPEN task is on the current month's board`,
      scopedAll.includes(idOf('ongoing')),
      true,
    );
    eq_(
      `[${zone}] so is one completed this month`,
      scopedAll.includes(idOf('done-today')),
      true,
    );
    eq_(
      `[${zone}] but NOT one completed last month`,
      scopedAll.includes(idOf('done-lastmonth')),
      false,
    );

    const scopedLast = await runCase(
      tz, 'Scope: a past month, every status',
      `status=all&month=${lastTok}&q=${TAG}`,
    );
    eq_(
      `[${zone}] a past month holds what shipped in it`,
      scopedLast.includes(idOf('done-lastmonth')),
      true,
    );
    eq_(
      `[${zone}] including a posted one`,
      scopedLast.includes(idOf('published-lastmonth')),
      true,
    );
    // The load-bearing refusal, and the reason the working tabs are not
    // offered on a past month: open work is NOT stranded there, it is on the
    // current board. An oracle bug and a predicate bug would have to agree to
    // hide this one, so it is named rather than left to the set compare.
    eq_(
      `[${zone}] an OPEN task is NOT stranded in a past month`,
      scopedLast.includes(idOf('ongoing')),
      false,
    );
    eq_(
      `[${zone}] nor is one completed this month`,
      scopedLast.includes(idOf('done-today')),
      false,
    );
    // Strictly narrower, both ways: a past month is a subset of all time, and
    // the two scopes are disjoint on the open rows.
    const unscopedAll = await runCase(tz, 'Scope: all time', `status=all&q=${TAG}`);
    eq_(
      `[${zone}] every scoped row is in the unscoped set`,
      scopedLast.every((id) => unscopedAll.includes(id)) &&
        scopedAll.every((id) => unscopedAll.includes(id)),
      true,
    );
    eq_(
      `[${zone}] and a scope really does narrow it`,
      scopedLast.length < unscopedAll.length && scopedAll.length < unscopedAll.length,
      true,
    );

    // A backdated completion anchored the way setTaskStatus anchors one must
    // land in THIS month's window for BOTH readers. On the 1st this is the
    // whole ballgame: with day-start anchoring, a Tehran member's pick is
    // 20:30Z on the last day of the previous month, so a Vancouver reader
    // loses the row out of the month it was deliberately filed into.
    //
    // Re-expressed through the SCOPE rather than the retired `drange=YYYY-MM`
    // spelling, deliberately kept as its own case: it is the only end-to-end
    // proof of the midday-anchor contract, and folding it into the generic
    // month cases above would lose the fixture that makes it a proof.
    const thisMonth = await runCase(
      tz, 'Done: this month, incl. a backdated 1st',
      `status=done&month=${monthTokenIn(VAN, now)}&q=${TAG}`,
    );
    eq_(
      `[${zone}] a Tehran-backdated 1st is inside this month`,
      thisMonth.includes(idOf('done-backdated-first')),
      true,
    );
    await runCase(tz, 'Created in last 30', `dfield=created&drange=d30&status=all&q=${TAG}`);
    await runCase(tz, 'Client slug', `client=zz-check-client&status=all&q=${TAG}`);
    await runCase(tz, 'Internal (null client)', `client=internal&status=all&q=${TAG}`);
    await runCase(tz, 'Category slug', `category=zz-check-cat&status=all&q=${TAG}`);
    await runCase(tz, 'Priority high', `priority=high&status=all&q=${TAG}`);
    await runCase(tz, 'No priority', `priority=none&status=all&q=${TAG}`);

    // ── the tag facet ─────────────────────────────────────────────────────
    // The EXISTS/NOT EXISTS subqueries in tasksWhere, against the oracle. The
    // any/all pair is the point: a filter that silently returns the wrong
    // rows looks exactly like an empty day, and `all` degrading to `any` is
    // precisely the failure that would go unnoticed.
    const anyAB = await runCase(
      tz, 'tags any (A or B)', `tag=zz-check-tag-a,zz-check-tag-b&status=all&q=${TAG}`,
    );
    const allAB = await runCase(
      tz, 'tags all (A and B)',
      `tag=zz-check-tag-a,zz-check-tag-b&tagmode=all&status=all&q=${TAG}`,
    );
    eq_(`[${zone}] all is strictly narrower than any`, allAB.length < anyAB.length, true);
    eq_(`[${zone}] a task with only A is in any but NOT in all`,
      [anyAB.includes(idOf('span')), allAB.includes(idOf('span'))], [true, false]);
    eq_(`[${zone}] a task with A+B is in both`,
      [anyAB.includes(idOf('due-today')), allAB.includes(idOf('due-today'))], [true, true]);

    await runCase(tz, 'tags single (A)', `tag=zz-check-tag-a&status=all&q=${TAG}`);
    await runCase(
      tz, 'tags all, three of them',
      `tag=zz-check-tag-a,zz-check-tag-b,zz-check-tag-c&tagmode=all&status=all&q=${TAG}`,
    );

    const untagged = await runCase(tz, 'untagged', `tag=none&status=all&q=${TAG}`);
    eq_(`[${zone}] untagged excludes every tagged fixture`,
      untagged.some((id) => [idOf('due-today'), idOf('span'), idOf('no-dates'), idOf('high')].includes(id)),
      false);
    eq_(`[${zone}] untagged includes an untagged fixture`,
      untagged.includes(idOf('ongoing')), true);

    // Tags compose with the other facets rather than replacing them.
    await runCase(
      tz, 'tags + priority together', `tag=zz-check-tag-a&priority=high&status=all&q=${TAG}`,
    );
    await runCase(tz, 'tags on the Open view only', `tag=zz-check-tag-a&q=${TAG}`);

    // An unknown tag slug is the honest-empty contract, not a silently
    // widened result — which is what a partial match under `all` would be.
    const unknownTag = await resolveLocal(
      tz, parseQS(`tag=zz-check-tag-a,zz-check-tag-nope&q=${TAG}`), 'all',
    );
    eq_(`[${zone}] unknown tag slug → unresolved (honest empty)`, unknownTag, null);
    await runCase(
      tz, 'Custom range, inclusive to',
      `from=${shiftDayKey(tVan, -2)}&to=${tVan}&status=all&q=${TAG}`,
    );

    // likePattern: % and _ in the query are literals, never wildcards.
    const pct = await runCase(
      tz, 'search with %_ stays literal',
      `status=all&q=${encodeURIComponent(`${TAG} 100%_special`)}`,
    );
    eq_(`[${zone}] literal search finds exactly the real title`, pct, [idOf('pct')]);
    eq_(`[${zone}] wildcard decoy is NOT matched`, pct.includes(idOf('pct-decoy')), false);

    // ── Search reach ────────────────────────────────────────────────────
    // These cannot go through runCase: it scopes every case by q='ZZ-CHECK',
    // and the whole point here is to search by something OTHER than the
    // title. Scoping is by fixture id instead, which is stricter anyway —
    // a real row could never enter an expected set even if it matched.
    const searchCase = async (label: string, q: string, wantKeys: string[]) => {
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            tasksWhere(TASK_VIEW_STATUSES.all, { q }),
            inArray(tasks.id, fixtureIds),
          ),
        );
      eq_(`[${zone}] search ${label}`, rows.map((r) => r.id).sort(),
          wantKeys.map(idOf).sort());
      // ...and the JS oracle has to agree about the same query, or the two
      // definitions of "what q means" have drifted apart.
      eq_(
        `[${zone}] search ${label} (oracle agrees)`,
        FIXTURES.filter((fx) => matchesQ(fx, q)).map((fx) => fx.key).sort(),
        [...wantKeys].sort(),
      );
    };
    const allKeys = FIXTURES.map((fx) => fx.key);

    // Client NAME, not slug — the thing the row visibly says. The internal
    // fixture has no client, so it must fall out.
    await searchCase('by client name', CLIENT_NAME,
      allKeys.filter((k) => k !== 'internal'));
    // The null-client label. It is a literal in the predicate because there
    // is no row to match it against, so it needs its own assertion.
    await searchCase('by the Perseus label', 'perseus', ['internal']);
    // Category and assignee reach every fixture — they all share both.
    // Every fixture EXCEPT the correlation probe, which lives in the other
    // category — the exclusion is the point (before the second category
    // existed this read `allKeys` and could not have detected a mistake).
    await searchCase('by category name', CATEGORY_NAME,
      allKeys.filter((k) => k !== 'second-cat'));
    await searchCase('by member name', 'zz check', allKeys);
    // Tag names reach exactly the tagged rows. Tags A and B are the usable
    // probes: 'ZZ-CHECK C' is a substring of the CATEGORY name 'ZZ-CHECK Cat',
    // so searching it correctly returns every fixture — which is real search
    // behaviour, but proves nothing about the tag clause. Two tags, because
    // one could pass by accident if the clause ignored which tag was asked
    // for; A and B are carried by overlapping-but-different fixture sets.
    await searchCase('by tag name (A)', tagNameFor('zz-check-tag-a'),
      FIXTURES.filter((fx) => fx.tags.includes('zz-check-tag-a')).map((fx) => fx.key));
    await searchCase('by tag name (B, a different set)', tagNameFor('zz-check-tag-b'),
      FIXTURES.filter((fx) => fx.tags.includes('zz-check-tag-b')).map((fx) => fx.key));
    // ── The strictness bug, against the real WHERE ────────────────────────
    // Everything above is a SINGLE term, which the old whole-string predicate
    // answered just as well. These three cannot pass under it at all, and
    // they are the reason the tokenizer exists.
    //
    // (1) Two tokens that land in DIFFERENT fields. 'client' is only in the
    // client name, 'taga' only in a tag name, so no single field — and
    // therefore no single `%…%` — contains both. This is the shape of the
    // report that started it: "arshia real th" over "Arshia Real Estate TH"
    // with the member typed in the same breath.
    await searchCase('two tokens landing in different fields', 'client taga',
      FIXTURES.filter((fx) => !fx.internal && fx.tags.includes('zz-check-tag-a'))
        .map((fx) => fx.key));
    // (2) Order must not matter. A member types what they remember first.
    await searchCase('the same two tokens, reversed', 'taga client',
      FIXTURES.filter((fx) => !fx.internal && fx.tags.includes('zz-check-tag-a'))
        .map((fx) => fx.key));
    // (3) A GAP inside one field — the literal reported failure. The titles
    // are "ZZ-CHECK due-today" and "ZZ-CHECK done-today"; the query skips the
    // "-CHECK due-"/"-CHECK done-" in the middle exactly as "arshia real th"
    // skipped "Estate". `%zz today%` matches neither.
    await searchCase('tokens with a gap between them in one field', 'zz today',
      ['due-today', 'done-today']);

    // The notes branch. Only one fixture has notes, and the text appears in no
    // title, so this can ONLY pass through `ilike(tasks.notes, …)`.
    await searchCase('by notes', 'noted marginalia', ['noted']);
    // ...while the other fifteen have notes = NULL, proving a NULL column does
    // not swallow the OR (an AND over the same shape would return nothing).
    await searchCase('a NULL notes column still matches on other columns',
      CLIENT_NAME, allKeys.filter((k) => k !== 'internal'));

    // created_by_name is deliberately NOT searched. While the fixtures gave the
    // creator and the assignee one shared string, every assignee assertion
    // above would have passed against the wrong column.
    await searchCase('does NOT reach created_by_name', CREATOR_NAME, []);

    // The category EXISTS has to be CORRELATED. With one category for all
    // fixtures, dropping `tc.id = tasks.category_id` was unobservable; the
    // second category makes an uncorrelated subquery return everything.
    await searchCase('by the second category name (correlation probe)',
      CATEGORY_2_NAME, ['second-cat']);

    await searchCase('no match is still no match', 'zz-check-nothing-matches', []);

    // Unknown slug resolves to null — the honest-empty contract.
    const unknown = await resolveLocal(
      tz, parseQS(`client=zz-check-nope&q=${TAG}`), 'all',
    );
    eq_(`[${zone}] unknown client slug → unresolved (honest empty)`, unknown, null);

    // Tab badges. countTasksByStatus strips the date FACET's completed window
    // (an open task "completed in the last 7 days" is structurally zero, so
    // every working tab would read empty over a full list) but KEEPS the month
    // SCOPE — the badges have to answer for the month the board is about, or
    // they contradict the list directly underneath them.
    //
    // These re-state that split rather than calling countTasksByStatus, which
    // is `server-only`. That is exactly why the past-month case below asserts
    // ZEROES BY NAME: without it, dropping the scope in production would leave
    // this block green, since a restated hack agrees with itself.
    for (const [caseLabel, qsStr] of [
      ['badges under a composite Today window', `drange=today&q=${TAG}`],
      ['badges under a completed window (stripped)', `status=done&drange=lastmonth&q=${TAG}`],
      ['badges under the current month scope', `status=all&month=${monthTokenIn(tz, now)}&q=${TAG}`],
      ['badges under a past month scope', `status=all&month=${lastTok}&q=${TAG}`],
    ] as const) {
      const sp = new URLSearchParams(qsStr);
      const currentMonth = monthTokenIn(tz, now);
      const month = sp.get('month')
        ? parseTaskMonth((k) => sp.get(k) ?? '', { mode: 'list', currentMonth })
        : TASK_MONTH_ALL;
      const view = coerceTaskView(
        resolveTaskView(sp.get('status') ?? ''),
        month,
        currentMonth,
      );
      const f = (await resolveLocal(
        tz,
        parseTaskListParams((k) => sp.get(k) ?? ''),
        view,
        month,
      ))!;
      const scoped: TaskFilters = {
        ...f,
        completedSince: undefined,
        completedUntil: undefined,
      };
      const rows = await db
        .select({ status: tasks.status, n: count() })
        .from(tasks)
        .where(tasksWhere(TASK_VIEW_STATUSES.all, scoped))
        .groupBy(tasks.status);
      // Seeded from the vocabulary, NOT written out. These two are typed
      // Record<string, number>, so a missing key is not a type error — a
      // status added later would simply never be compared, and the assertion
      // would keep passing while the badge it stands for was wrong.
      const zeroes = (): Record<string, number> =>
        Object.fromEntries(TASK_STATUS_SLUGS.map((slug) => [slug, 0]));
      const got: Record<string, number> = zeroes();
      for (const row of rows) got[row.status] = row.n;
      const want: Record<string, number> = zeroes();
      for (const fx of FIXTURES) {
        if (matches(fx, TASK_VIEW_STATUSES.all, scoped)) want[fx.status] += 1;
      }
      eq_(`[${zone}] ${caseLabel}`, got, want);
      // Swept from the vocabulary, not written out: on a past month every
      // status that is not shipped MUST read zero, which is the whole reason
      // those four tabs are not offered there.
      if (isPastMonth(month, currentMonth)) {
        for (const slug of TASK_STATUS_SLUGS) {
          if (isShipped(slug)) continue;
          eq_(`[${zone}] past month badge for '${slug}' is zero`, got[slug], 0);
        }
      }
    }
  }

  // ── The board's ORDER BY, against the real taskOrder ────────────────────
  //
  // A wrong ORDER BY draws a complete, plausible board with every row in the
  // wrong place, and nothing on screen says so — the ordering twin of a wrong
  // WHERE drawing a plausible empty day. So every token in the vocabulary is
  // run through the real builder here and compared against a comparator
  // written independently in JS.
  //
  // Text keys are compared in JS rather than by asking Postgres, which makes
  // this the one assertion here that could in principle disagree with the
  // database's collation. The fixture titles were checked against both
  // plausible collations (byte order and en_US, which ignores punctuation at
  // the primary level) and order identically under each. If one of these
  // starts failing after a fixture is added, look first for two titles that
  // differ only by a hyphen, a space or a percent sign.
  console.log('\n— ordering —');
  {
    type Row = { id: string; fx: Fx };
    const rowsFor = (view: TaskView): Row[] =>
      FIXTURES.filter((fx) => TASK_VIEW_STATUSES[view].includes(fx.status)).map(
        (fx) => ({ id: idOf(fx.key), fx }),
      );
    const keys = (rows: Row[] | string[]) =>
      (rows as (Row | string)[]).map((r) =>
        typeof r === 'string'
          ? FIXTURES.find((fx) => idOf(fx.key) === r)!.key
          : r.fx.key,
      );

    // The board's order, as the list page asks for it: the same two 1:1 joins
    // listTasks carries, so a joined column in the ORDER BY resolves here
    // exactly as it does in production.
    const boardOrder = async (view: TaskView, sort: TaskSort) => {
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
        .leftJoin(clients, eq(tasks.clientId, clients.id))
        .where(
          and(
            inArray(tasks.id, fixtureIds),
            inArray(tasks.status, [...TASK_VIEW_STATUSES[view]]),
          ),
        )
        .orderBy(...taskOrder(view, sort));
      return rows.map((r) => r.id);
    };

    // ── the independent comparator ──
    // Descending on the id, last, always: without a unique final key rows
    // sharing a sort value have no defined order, and OFFSET paging can then
    // show one row on two pages or on none.
    const idDesc = (a: Row, b: Row) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
    const chain =
      (...cmps: ((a: Row, b: Row) => number)[]) =>
      (a: Row, b: Row) => {
        for (const cmp of cmps) {
          const n = cmp(a, b);
          if (n !== 0) return n;
        }
        return 0;
      };
    const num = (f: (fx: Fx) => number, dir: 1 | -1) => (a: Row, b: Row) =>
      dir * (f(a.fx) - f(b.fx));
    const text = (f: (fx: Fx) => string, dir: 1 | -1) => (a: Row, b: Row) => {
      const x = f(a.fx).toLowerCase();
      const y = f(b.fx).toLowerCase();
      return x === y ? 0 : dir * (x < y ? -1 : 1);
    };
    /** A day key or nothing. Nothing sorts LAST whichever way the column
     *  reads: an undated task is not due before everything, it is not due. */
    const day = (f: (fx: Fx) => string | null, dir: 1 | -1) => (a: Row, b: Row) => {
      const x = f(a.fx);
      const y = f(b.fx);
      if (!x && !y) return 0;
      if (!x) return 1;
      if (!y) return -1;
      return x === y ? 0 : dir * (x < y ? -1 : 1);
    };
    const rank = (order: readonly string[]) => (fx: Fx) => {
      const i = fx.priority === null ? -1 : order.indexOf(fx.priority);
      // The absence of a priority is not a priority below the lowest, so it
      // takes the tail in both directions.
      return i === -1 ? order.length : i;
    };
    const dueThenLogged = [
      day((fx) => fx.due, 1),
      num((fx) => fx.createdAt.getTime(), -1),
      idDesc,
    ];
    const clientName = (fx: Fx) => (fx.internal ? 'Perseus' : CLIENT_NAME);
    const categoryName = (fx: Fx) => (fx.cat2 ? CATEGORY_2_NAME : CATEGORY_NAME);

    const cmpFor = (view: TaskView, sort: TaskSort) => {
      switch (sort) {
        case 'title-az': return chain(text((fx) => fx.title, 1), idDesc);
        case 'title-za': return chain(text((fx) => fx.title, -1), idDesc);
        case 'client-az': return chain(text(clientName, 1), idDesc);
        case 'client-za': return chain(text(clientName, -1), idDesc);
        case 'category-az': return chain(text(categoryName, 1), idDesc);
        case 'category-za': return chain(text(categoryName, -1), idDesc);
        case 'status-early': return chain(num((fx) => TASK_STATUS_SLUGS.indexOf(fx.status), 1), idDesc);
        case 'status-late': return chain(num((fx) => TASK_STATUS_SLUGS.indexOf(fx.status), -1), idDesc);
        case 'time-most': return chain(num((fx) => fx.actual ?? fx.minutes, -1), idDesc);
        case 'time-least': return chain(num((fx) => fx.actual ?? fx.minutes, 1), idDesc);
        case 'due': return chain(...dueThenLogged);
        case 'due-late': return chain(day((fx) => fx.due, -1), num((fx) => fx.createdAt.getTime(), -1), idDesc);
        case 'priority': return chain(num(rank(['high', 'medium', 'low']), 1), ...dueThenLogged);
        case 'priority-low': return chain(num(rank(['low', 'medium', 'high']), 1), ...dueThenLogged);
        default: {
          const dir = sort === 'oldest' ? 1 : -1;
          // Every shipped fixture carries a completion instant, so this arm
          // never meets a null — which is why the comparator does not model
          // Postgres putting NULLS FIRST under DESC.
          return isShippedView(view)
            ? chain(num((fx) => fx.completedAt!.getTime(), dir), idDesc)
            : chain(num((fx) => fx.createdAt.getTime(), dir), idDesc);
        }
      }
    };

    for (const view of ['all', 'done'] as const) {
      for (const sort of TASK_SORTS) {
        const got = await boardOrder(view, sort);
        const want = [...rowsFor(view)].sort(cmpFor(view, sort));
        eq_(`[${view}] ?sort=${sort}`, keys(got), keys(want));
      }
    }

    // ── the properties, stated in their own words ──
    // Everything above compares one ordering against another ordering. These
    // say what the orderings MEAN, so a mistake made in both places at once
    // still has somewhere to fail.

    // Reversing a column reverses the rows it can order, and leaves the
    // unknown tail exactly where it was. If `nulls last` were dropped from
    // one arm, every undated task would jump to the top of the board.
    const soonest = await boardOrder('all', 'due');
    const latest = await boardOrder('all', 'due-late');
    const undated = new Set(FIXTURES.filter((fx) => !fx.due).map((fx) => idOf(fx.key)));
    eq_('undated tasks are last under Soonest',
      soonest.slice(-undated.size).every((id) => undated.has(id)), true);
    eq_('...and still last under Latest, not first',
      latest.slice(-undated.size).every((id) => undated.has(id)), true);
    // Reversing a column reverses the DATES, not the rows: within one date the
    // secondary keys still read the same way, so a tie group keeps its
    // internal order in both directions. Asserting the rows reversed outright
    // is the tempting version and it is wrong, which is worth stating here
    // because the failure it produces looks exactly like a broken ORDER BY.
    const dueSeq = (order: string[]) => {
      const out: string[] = [];
      for (const id of order) {
        const d = FIXTURES.find((fx) => idOf(fx.key) === id)!.due;
        if (d && out.at(-1) !== d) out.push(d);
      }
      return out;
    };
    eq_('the due dates come back in the opposite order',
      dueSeq(latest), [...dueSeq(soonest)].reverse());
    // The tie group: three fixtures share the oldest deadline, and they hold
    // their order whichever way the column reads. Without the id at the end of
    // both branches this is where OFFSET paging would start dropping rows.
    const tied = (order: string[]) => {
      const first = dueSeq(soonest)[0];
      return keys(order.filter((id) =>
        FIXTURES.find((fx) => idOf(fx.key) === id)!.due === first));
    };
    ok_('the tied rows are a group of more than one', tied(soonest).length > 1);
    eq_('a tie keeps its order in both directions', tied(latest), tied(soonest));

    const unflagged = new Set(
      FIXTURES.filter((fx) => fx.priority === null).map((fx) => idOf(fx.key)),
    );
    for (const sort of ['priority', 'priority-low'] as const) {
      const got = await boardOrder('all', sort);
      eq_(`unflagged tasks are last under ?sort=${sort}`,
        got.slice(-unflagged.size).every((id) => unflagged.has(id)), true);
    }
    // ...and the flagged ones really do swap ends, so the two directions are
    // not one order under two names.
    const flaggedHigh = (await boardOrder('all', 'priority')).filter((id) => !unflagged.has(id));
    const flaggedLow = (await boardOrder('all', 'priority-low')).filter((id) => !unflagged.has(id));
    eq_('High first and Low first disagree about which end is which',
      [keys(flaggedHigh)[0], keys(flaggedHigh).at(-1)],
      [keys(flaggedLow).at(-1), keys(flaggedLow)[0]]);

    // A shipped tab orders by when work FINISHED, a working tab by when it was
    // logged. The fixtures disagree about those two (a task completed last
    // month was created just now), so an arm reading the wrong column cannot
    // pass this.
    const newestDone = await boardOrder('done', 'newest');
    const byCreated = [...rowsFor('done')]
      .sort(chain(num((fx) => fx.createdAt.getTime(), -1), idDesc))
      .map((r) => r.id);
    eq_('the Done tab is not ordered by when the task was logged',
      newestDone.join() === byCreated.join(), false);
    eq_('the newest completion leads the Done tab',
      keys(newestDone)[0],
      keys([...rowsFor('done')].sort(chain(num((fx) => fx.completedAt!.getTime(), -1), idDesc)))[0]);

    // Same question asked twice gets the same answer. This is the OFFSET
    // paging guarantee: pages 1 and 2 are two queries, and rows sharing a sort
    // value must not shuffle between them.
    for (const sort of ['time-most', 'title-az', 'newest'] as const) {
      const first = await boardOrder('all', sort);
      const second = await boardOrder('all', sort);
      eq_(`?sort=${sort} is stable across reads`, first.join(), second.join());
    }
  }
} finally {
  await sweep();
  await pool.end();
}

console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
