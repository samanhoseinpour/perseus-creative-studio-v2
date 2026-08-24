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
 *  - isRangeAllowed: Overdue refused off the due-bearing fields, month tokens
 *    refused on forward fields.
 *  - parseTaskListParams (junk fallbacks, legacy ?due=/?month= aliases,
 *    custom bounds beating presets, the phantom-date rejection, priority
 *    'none') and taskListQs round-trips (canonical order, defaults dropped).
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
  defaultDateField,
  hasActiveTaskFilters,
  isRangeAllowed,
  isUntaggedFilter,
  parseTaskListParams,
  resolveTaskDateField,
  resolveTaskDateWindow,
  resolveTaskView,
  taskListQs,
  TASK_VIEW_STATUSES,
  type TaskDateField,
  type TaskFilters,
  type TaskListParams,
  type TaskView,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  dayStartIn,
  monthTokenIn,
  monthWindowIn,
  shiftDayKey,
  shiftMonthToken,
} from '@/lib/calendar';
import type { TaskPrioritySlug, TaskStatusSlug } from '@/lib/taskFields';
import {
  TASK_TAG_MAX_IN_FILTER,
  UNTAGGED,
} from '@/lib/taskTagFields';
import {
  clients,
  taskCategories,
  taskTagLinks,
  taskTags,
  taskTagTypes,
  tasks,
} from '@/db/schema';
import { tasksWhere } from '@/db/taskPredicates';

let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`,
  );
};

const VAN = 'America/Vancouver';
const TEH = 'Asia/Tehran';

const parseQS = (qs: string): TaskListParams => {
  const sp = new URLSearchParams(qs);
  return parseTaskListParams((k) => sp.get(k) ?? '');
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
  completed: { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: false, none: true,  '2026-07': true },
  created:   { today: true, week: true, d30: true, month: true, lastmonth: true, overdue: false, none: false, '2026-07': true },
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
  eq_('literal month token on completed',
    resolveTaskDateWindow(VAN, 'completed', p('2026-06'), NOW),
    monthWindowIn(VAN, '2026-06'));
  eq_('overdue = strictly before today, open work only',
    resolveTaskDateWindow(VAN, 'date', p('overdue'), NOW),
    { beforeKey: '2026-08-20', openOnly: true });
  eq_('overdue refused on start → no window at all',
    resolveTaskDateWindow(VAN, 'start', p('overdue'), NOW),
    null);
  eq_('month token refused on a forward field → null',
    resolveTaskDateWindow(VAN, 'due', p('2026-07'), NOW),
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
  eq_('legacy month=YYYY-MM → completed', parseQS('month=2026-07'),
    { ...empty, dfield: 'completed', drange: '2026-07' });
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
  eq_('done view: completed is the default there',
    taskListQs('done', { drange: '2026-07' }), 'status=done&drange=2026-07');
  eq_('done view: the composite is NON-default there and serializes',
    taskListQs('done', { dfield: 'date', drange: 'today' }), 'status=done&dfield=date&drange=today');
  eq_('digest drops a backward-field window (its window IS its rolling days)',
    taskListQs('open', { dfield: 'completed', drange: '2026-07' }, undefined, true), 'view=digest');
  eq_('digest keeps a composite (forward) window',
    taskListQs('open', { drange: 'today' }, undefined, true), 'view=digest&drange=today');
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
    ['done', { drange: '2026-07' }],
    ['open', { q: 'ubc vs bet', client: 'internal', priority: 'none' }],
    ['needs_approval', { assignee: 'NwZRPqB8fx0qHIHdSJ7NpA4vRtnSw0vn', drange: 'today' }],
    ['open', { from: '2026-08-01', to: '2026-08-10', group: 'due', sort: 'priority' }],
    ['open', { tags: ['reels', 'vertical'] }],
    ['open', { tags: ['reels', 'talking-head', 'vertical'], tagMode: 'all' }],
    ['open', { tags: [UNTAGGED] }],
    ['done', { tags: ['blog-post'], category: 'seo', drange: '2026-07' }],
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
const CATEGORY_NAME = 'ZZ-CHECK Cat';
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
const tagNameFor = (slug: string) => `ZZ-CHECK ${slug.slice(-1).toUpperCase()}`;

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
  });
  const FIXTURES: Fx[] = [
    def('ubc-van', { status: 'needs_approval', start: tVan }),
    def('ubc-teh', { status: 'needs_approval', start: tTeh }),
    // Tag shapes: A only, A+B, B only, all three, and (everything else) none.
    // Chosen so `any` and `all` return DIFFERENT sets — a check where the two
    // modes agree proves nothing about either.
    def('due-today', { due: tVan, tags: ['zz-check-tag-a', 'zz-check-tag-b'] }),
    def('span', { status: 'in_progress', start: shiftDayKey(tVan, -2), due: shiftDayKey(tVan, 2), tags: ['zz-check-tag-a'] }),
    def('no-dates', { tags: ['zz-check-tag-b'] }),
    def('overdue-open', { due: shiftDayKey(tVan, -3) }),
    def('overdue-done', { status: 'done', due: shiftDayKey(tVan, -3), completedAt: now }),
    def('ongoing', { start: shiftDayKey(tVan, -10) }),
    def('due-soon', { due: shiftDayKey(tVan, 5) }),
    def('due-far', { due: shiftDayKey(tVan, 40) }),
    def('done-today', { status: 'done', start: tVan, completedAt: now }),
    def('done-lastmonth', { status: 'done', completedAt: lastMonthMid }),
    def('high', { priority: 'high', tags: ['zz-check-tag-a', 'zz-check-tag-b', 'zz-check-tag-c'] }),
    def('pct', { title: `${TAG} 100%_special` }),
    def('pct-decoy', { title: `${TAG} 100Xspecial` }),
    def('internal', { internal: true }),
    def('noted', { notes: NOTES_TEXT }),
    def('second-cat', { cat2: true }),
  ];

  const inserted = await db
    .insert(tasks)
    .values(
      FIXTURES.map((fx) => ({
        title: fx.title,
        clientId: fx.internal ? null : zzClient.id,
        categoryId: fx.cat2 ? cat2.id : cat.id,
        status: fx.status,
        priority: fx.priority,
        assigneeId: null,
        assigneeName: ASSIGNEE_NAME,
        createdById: null,
        createdByName: CREATOR_NAME,
        estimatedMinutes: 60,
        actualMinutes: fx.status === 'done' ? 60 : null,
        notes: fx.notes,
        startDate: fx.start,
        dueDate: fx.due,
        completedAt: fx.completedAt,
        createdAt: fx.createdAt,
        updatedAt: fx.createdAt,
      })),
    )
    .returning({ id: tasks.id, title: tasks.title });
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
    const needle = q.toLowerCase();
    const hay = [
      fx.title,
      fx.notes ?? '',
      fx.internal ? 'Perseus' : CLIENT_NAME,
      ASSIGNEE_NAME,
      fx.cat2 ? CATEGORY_2_NAME : CATEGORY_NAME,
      ...fx.tags.map((slug) => tagNameFor(slug)),
      // CREATOR_NAME is deliberately absent: created_by_name is NOT searched.
    ];
    return hay.some((h) => h.toLowerCase().includes(needle));
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
    if (f.assigneeId) return false; // no fixture carries one
    // Two categories now, so this is load-bearing rather than decorative.
    if (f.categoryId && f.categoryId !== (fx.cat2 ? cat2.id : cat.id)) return false;
    if (f.priority === 'none') {
      if (fx.priority !== null) return false;
    } else if (f.priority) {
      if (fx.priority !== f.priority) return false;
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
    if (f.dueOpenOnly && fx.status === 'done') return false;
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
    return f;
  };

  const runCase = async (tz: string, label: string, qsStr: string): Promise<string[]> => {
    const sp = new URLSearchParams(qsStr);
    const view = resolveTaskView(sp.get('status') ?? '');
    const params = parseTaskListParams((k) => sp.get(k) ?? '');
    if (!params.q.includes(TAG)) throw new Error(`unscoped case: ${label}`);
    const f = await resolveLocal(tz, params, view);
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

    await runCase(tz, 'No date (both columns null)', `drange=none&q=${TAG}`);
    await runCase(tz, 'Next 7 days', `drange=week&q=${TAG}`);
    await runCase(tz, 'Next 30 days', `drange=d30&q=${TAG}`);
    await runCase(tz, 'This month (composite)', `drange=month&q=${TAG}`);
    await runCase(tz, 'Done: completed today', `status=done&drange=today&q=${TAG}`);
    await runCase(tz, 'Done: last month preset', `status=done&drange=lastmonth&q=${TAG}`);
    await runCase(tz, 'Done: literal month token', `status=done&drange=${lastTok}&q=${TAG}`);
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

    // Tab badges: countTasksByStatus strips completed windows (a delivery
    // month is a within-tab view) but KEEPS sched/due/start/created windows.
    for (const [caseLabel, qsStr] of [
      ['badges under a composite Today window', `drange=today&q=${TAG}`],
      ['badges under a completed window (stripped)', `status=done&drange=lastmonth&q=${TAG}`],
    ] as const) {
      const sp = new URLSearchParams(qsStr);
      const view = resolveTaskView(sp.get('status') ?? '');
      const f = (await resolveLocal(tz, parseTaskListParams((k) => sp.get(k) ?? ''), view))!;
      const monthless: TaskFilters = {
        ...f,
        completedSince: undefined,
        completedUntil: undefined,
      };
      const rows = await db
        .select({ status: tasks.status, n: count() })
        .from(tasks)
        .where(tasksWhere(TASK_VIEW_STATUSES.all, monthless))
        .groupBy(tasks.status);
      const got: Record<string, number> = { todo: 0, in_progress: 0, needs_approval: 0, done: 0 };
      for (const row of rows) got[row.status] = row.n;
      const want: Record<string, number> = { todo: 0, in_progress: 0, needs_approval: 0, done: 0 };
      for (const fx of FIXTURES) {
        if (matches(fx, TASK_VIEW_STATUSES.all, monthless)) want[fx.status] += 1;
      }
      eq_(`[${zone}] ${caseLabel}`, got, want);
    }
  }
} finally {
  await sweep();
  await pool.end();
}

console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
