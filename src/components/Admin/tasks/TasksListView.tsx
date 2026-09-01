import {
  countTasksByStatus,
  getTaskById,
  listClientMonthUsage,
  listClientTaskDefaults,
  listEstimateHints,
  listTaskCategories,
  listTaskCategoriesWithCounts,
  listTaskTags,
  listTaskTagsWithCounts,
  listTaskTagTypes,
  listTaskTagTypesWithCounts,
  listTaskTemplates,
  listTaskViews,
  listTasks,
  listAssigneeOptions,
  listClientRows,
  resolveTaskFilters,
  type TaskBoardRow,
} from '@/db/taskQueries';
import {
  EMPTY_STATUS_COUNTS,
  INTERNAL_CLIENT_LABEL,
  TASK_STATUS_SLUGS,
  formatDayspan,
  formatMinutes,
  isShipped,
  signedMinutes,
} from '@/lib/taskFields';
import {
  coerceTaskView,
  hasActiveTaskFilters,
  isMonthScoped,
  isPastMonth,
  parseTaskListParams,
  parseTaskMonth,
  resolveTaskView,
  taskScopeQs,
  taskTabsFor,
  type TaskListParams,
  type TaskView,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  daysBetweenDayKeys,
  monthTokenIn,
  monthWindowIn,
  shiftMonthToken,
} from '@/lib/calendar';
import { viewerZone } from '@/lib/adminAccess';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { LuDownload } from 'react-icons/lu';

import { firstParam, parsePage } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import { ALL_MONTHS } from '@/components/Admin/MonthSwitcher';
import TaskMonthBand from './TaskMonthBand';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { GlassPanel } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dueDateLabel, monthLabel, stageDateLabels } from './format';
import TaskBoard from './TaskBoard';
import TaskFilterBar, { type FilterOption } from './TaskFilterBar';
import TasksEmpty from './TasksEmpty';
import TasksHeaderActions from './TasksHeaderActions';
import type { TemplateItem } from './TaskTemplatesDialog';
import TaskTabs from './TaskTabs';
import TasksViewToggle from './TasksViewToggle';
import type {
  PickerOption,
  RowAvatar,
  TaskFormOptions,
  TaskRowData,
} from './types';
import SearchCorrection from '@/components/Admin/SearchCorrection';
import {
  correctIfEmpty,
  taskSearchVocabulary,
} from '@/db/searchVocabulary';

const BASE_PATH = '/admin/tasks';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/**
 * Past this many days in client sign-off, the wait is worth pointing at.
 *
 * A week is the threshold because it is a working week: anything shorter is
 * a client who simply hasn't opened their email yet. On the live board this
 * catches the rows sitting since Aug 17 with nothing chasing them.
 */
const WAITING_NUDGE_DAYS = 7;

/**
 * "How long has this been waiting for sign-off", server-formatted.
 *
 * Only ever on a `needs_approval` row — finished work parked on someone
 * else's decision is the one state where elapsed time is the whole story, and
 * nothing else on the board says it. Day granularity through the existing
 * calendar door, so it agrees with every other date on the page.
 */
function waitingFields(
  row: { waitingSince: Date | null; waitingExact: boolean },
  tz: string,
  todayKey: string,
): { waitingLabel: string; waitingState: '' | 'long' } {
  if (!row.waitingSince) return { waitingLabel: '', waitingState: '' };
  const days = Math.max(
    0,
    daysBetweenDayKeys(dayKeyIn(tz, row.waitingSince), todayKey),
  );
  // Same day reads as "sent today" rather than "0 days waiting", which would
  // look like a stuck counter on work that just left someone's hands.
  const span = days === 0 ? 'today' : formatDayspan(days);
  return {
    // "about" only when the instant came from updated_at — see withWaiting.
    waitingLabel:
      days === 0
        ? 'sent today'
        : `${row.waitingExact ? '' : 'about '}${span} waiting`,
    waitingState: days >= WAITING_NUDGE_DAYS ? 'long' : '',
  };
}

/** Serialize a joined DB row for the client table — strings only (hydration
 *  safety). `avatars` is the server-resolved assignee→face map; deadline
 *  pressure (`dueState`) is stamped here so the client never does date math. */
export function toRowData(
  row: TaskBoardRow,
  tz: string,
  todayKey: string,
  avatars?: Map<string, RowAvatar | null>,
): TaskRowData {
  const dueDate = row.dueDate ?? '';
  const open = !isShipped(row.status);
  // Estimate vs actual, but only once the hours mean something: they are
  // confirmed at the approval step, so needs_approval counts alongside the
  // shipped statuses. Anywhere earlier, actualMinutes is either absent or
  // still being edited.
  const settled = isShipped(row.status) || row.status === 'needs_approval';
  const variance =
    settled && row.actualMinutes != null
      ? row.actualMinutes - row.estimatedMinutes
      : 0;
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? '',
    status: row.status,
    priority: row.priority,
    clientId: row.clientId ?? '',
    clientLabel: row.clientName ?? INTERNAL_CLIENT_LABEL,
    clientLogo: row.clientLogoBlobUrl ?? row.clientLogoStaticPath ?? '',
    categoryId: row.categoryId,
    categoryLabel: row.categoryName,
    tags: row.tags,
    assignees: row.assignees.map((who) => ({
      id: who.id ?? '',
      name: who.name,
      avatar: (who.id ? avatars?.get(who.id) : null) ?? null,
    })),
    estimatedMinutes: row.estimatedMinutes,
    actualMinutes: row.actualMinutes,
    startDate: row.startDate ?? '',
    startLabel: row.startDate ? dueDateLabel(row.startDate, todayKey) : '',
    dueDate,
    dueLabel: dueDate ? dueDateLabel(dueDate, todayKey) : '',
    dueState:
      open && dueDate
        ? dueDate < todayKey
          ? 'overdue'
          : dueDate === todayKey
            ? 'today'
            : ''
        : '',
    // Via the reader's day key, NOT a bare Intl format: the server runs UTC
    // in production, so a 9pm PT completion would otherwise label as
    // tomorrow — outside the very month window that selected the row.
    completedDate: row.completedAt ? dayKeyIn(tz, row.completedAt) : '',
    completedLabel: row.completedAt
      ? dueDateLabel(dayKeyIn(tz, row.completedAt), todayKey)
      : '',
    // The handover day is already a calendar DAY in the column, so unlike the
    // completion instant above there is no zone to resolve it through.
    releasedOn: row.releasedOn ?? '',
    stageDates: stageDateLabels(
      row.status,
      row.completedAt ? dayKeyIn(tz, row.completedAt) : '',
      row.releasedOn ?? '',
      todayKey,
    ),
    varianceLabel: signedMinutes(variance),
    varianceState: variance === 0 ? '' : variance > 0 ? 'over' : 'under',
    links: row.deliverableLinks,
    parentId: row.parentId ?? '',
    parentTitle: row.parentTitle,
    revisionCount: row.revisionCount,
    directRevisionCount: row.directRevisionCount,
    ...waitingFields(row, tz, todayKey),
    // Formatted here like every other duration on the row — the client table
    // never runs the minutes door itself.
    revisionMinutesLabel:
      row.revisionMinutes > 0 ? formatMinutes(row.revisionMinutes) : '',
  };
}

/** The option projections both task views share, resolved server-side —
 *  including the assignee→avatar map (adminIdentity is server-only) and the
 *  retainer burn per client for the VIEWER's current month. */
export async function loadTaskOptions(
  viewer: { id: string; name: string },
  tz: string,
) {
  const usageWindow = monthWindowIn(tz, monthTokenIn(tz));
  const [
    clientRows,
    categories,
    assignees,
    usage,
    clientDefaults,
    estimates,
    tags,
    tagTypes,
  ] = await Promise.all([
      listClientRows(),
      listTaskCategories({ includeArchived: true }),
      listAssigneeOptions(),
      usageWindow ? listClientMonthUsage(usageWindow) : Promise.resolve([]),
      listClientTaskDefaults(),
      listEstimateHints(),
      // ARCHIVED INCLUDED: the picker filters by category client-side, and an
      // archived tag still has to render on the tasks already carrying it.
      listTaskTags({ includeArchived: true }),
      // Archived included for the same reason, and because the manage dialog
      // reads this list to offer restoring a retired type.
      listTaskTagTypes({ includeArchived: true }),
    ]);

  const avatars = new Map<string, RowAvatar | null>(
    assignees.map((a) => [a.id, resolveAdminAvatar(a)]),
  );
  const usageByClient = new Map(usage.map((u) => [u.clientId, u]));

  const assigneeOptions = assignees.map((a) => ({
    value: a.id,
    label: a.name,
    avatar: avatars.get(a.id) ?? null,
  }));
  const formOptions: TaskFormOptions = {
    clients: clientRows.map((c) => {
      const burn = usageByClient.get(c.id);
      return {
        value: c.id,
        label: c.name,
        logo: c.logo,
        ...(burn
          ? {
              hint: `${formatMinutes(burn.doneMinutes)} of ${formatMinutes(burn.retainerMinutes)}`,
              hintOver: burn.doneMinutes > burn.retainerMinutes,
            }
          : {}),
      };
    }),
    categories: categories
      .filter((c) => !c.archived)
      .map((c) => ({ value: c.id, label: c.name })),
    assignees: assigneeOptions,
    tags,
    tagTypes,
    viewer,
    clientDefaults,
    estimates,
  };
  const filterClients: PickerOption[] = [
    { value: 'internal', label: INTERNAL_CLIENT_LABEL, mark: true },
    ...clientRows.map((c) => ({ value: c.slug, label: c.name, logo: c.logo })),
  ];
  const filterCategories: FilterOption[] = categories.map((c) => ({
    value: c.slug,
    label: c.archived ? `${c.name} (archived)` : c.name,
  }));
  return {
    formOptions,
    filterClients,
    filterCategories,
    assigneeOptions,
    avatars,
    tags,
    tagTypes,
  };
}

/**
 * The month switcher's props, composed server-side.
 *
 * Offered on EVERY tab and on the digest, because the month is a scope now and
 * not a filter: it says which month the whole board is about. It used to be
 * offered on the shipped tabs only, which was the long way round to the same
 * safety property — the rule states it directly instead. A finished task
 * belongs to the month it finished; unfinished work is always "now", so it is
 * on the current month's board whatever month it started in, and no month can
 * hide a task somebody is waiting on.
 *
 * It writes `?month=`, its own param, rather than the general date facet.
 * Riding `drange` is what made it read as a duplicate of the Filters date menu,
 * which is exactly what it was.
 */
export function monthSwitcherFor({
  tz,
  now,
  view,
  params,
  month,
  currentMonth,
  digest,
  allLabel,
}: {
  tz: string;
  now: Date;
  view: TaskView;
  params: TaskListParams;
  /** The resolved scope: a YYYY-MM token, or ALL_MONTHS. */
  month: string;
  currentMonth: string;
  digest: boolean;
  /** What "no month" is called HERE. The digest's unscoped state is its
   *  rolling week, not all of history, so the trigger must not claim
   *  otherwise — and it has to match the row in the list. */
  allLabel: string;
}) {
  const active = isMonthScoped(month) ? month : '';

  /**
   * A finished URL for one month token, or for "no month" at ALL_MONTHS.
   *
   * Every destination is resolved HERE, on the server, and handed over as a
   * string. MonthSwitcher is a client component, so passing this function
   * across the boundary is a hard Next.js error rather than a style choice —
   * it is what took `/admin/tasks?status=done` down to the error boundary.
   */
  const hrefFor = (token: string) => {
    // The tab has to survive the jump: stepping back into a past month while
    // standing on "In progress" would land on a tab that month cannot offer.
    const target = coerceTaskView(view, token, currentMonth);
    const qs = taskScopeQs(
      target,
      params,
      { month: token, currentMonth, digest },
      undefined,
    );
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  };

  return {
    month: active || ALL_MONTHS,
    monthLabel: active ? monthLabel(active) : allLabel,
    allLabel,
    currentMonth,
    options: recentMonthOptions(tz, now).map((option) => ({
      ...option,
      href: hrefFor(option.value),
    })),
    // Only meaningful while a month is active — the arrows are disabled at
    // ALL_MONTHS, since "the month before no month" is not a thing.
    prevHref: active ? hrefFor(shiftMonthToken(active, -1)) : undefined,
    nextHref: active ? hrefFor(shiftMonthToken(active, 1)) : undefined,
    allHref: hrefFor(ALL_MONTHS),
  };
}

/** Recent 12 months, newest first — the Done tab's month picker. */
export function recentMonthOptions(tz: string, now: Date): FilterOption[] {
  const current = monthTokenIn(tz, now);
  return Array.from({ length: 12 }, (_, i) => {
    const token = shiftMonthToken(current, -i);
    return { value: token, label: monthLabel(token) };
  });
}

/**
 * Guarantee the ACTIVE value has a row. A filter whose value isn't in the
 * option list reads as "no filter" in the chip — generic label, checkmark on
 * the "All" row — while the server is narrowing the list by it. Reachable
 * from any shared or bookmarked URL: a report month older than the 12 offered,
 * or an assignee whose account has since been deleted.
 */
function withActiveOption(
  options: FilterOption[],
  value: string,
  make: (value: string) => FilterOption,
): FilterOption[] {
  if (!value || options.some((o) => o.value === value)) return options;
  return [make(value), ...options];
}

/** The /admin/tasks list surface — an async server component shell
 *  (InboxListView model): parse → read → serialize slim props → compose. */
export default async function TasksListView({
  sp,
  viewer,
}: {
  sp: SearchParamsRecord;
  viewer: { id: string; name: string };
}) {
  const get = (name: string) => firstParam(sp[name]);
  const params: TaskListParams = parseTaskListParams(get);
  const page = parsePage(get('page'));
  const now = new Date();
  // The reader's own clock, not the studio's — this single value decides the
  // quick-add default, the Today/Tomorrow chips, the overdue tint, the board's
  // due buckets, the month the board is about, and every date label on the page.
  const tz = await viewerZone();
  const todayKey = dayKeyIn(tz, now);
  // Which month this board is about, resolved before anything else reads the
  // view: on a past month the working tabs are not offered, so a bookmarked
  // ?status=open&month=2026-07 has to be coerced HERE, before the tabs and the
  // query see it, or the strip renders with nothing highlighted over a list
  // that can only be empty.
  const currentMonth = monthTokenIn(tz, now);
  const month = parseTaskMonth(get, { digest: false, currentMonth });
  const scope = { month, currentMonth, digest: false };
  const view = coerceTaskView(resolveTaskView(get('status')), month, currentMonth);
  const pastMonth = isPastMonth(month, currentMonth);

  // The filter-independent reads start FIRST so resolveTaskFilters' slug
  // lookups overlap them instead of gating the whole fan-out (each query is
  // its own neon-http round trip). The .catch markers keep a failed read from
  // surfacing as an unhandled rejection if the resolver itself throws.
  const optionsPromise = loadTaskOptions(viewer, tz);
  // Unconditional: the tag and category vocabularies are 'tasks'-gated like
  // the board itself, so everyone who can see this page can manage them. The
  // counts ride along because they are the archive-vs-delete affordance.
  const manageCategoriesPromise = listTaskCategoriesWithCounts();
  const manageTagsPromise = listTaskTagsWithCounts();
  const manageTagTypesPromise = listTaskTagTypesWithCounts();
  const templatesPromise = listTaskTemplates();
  const savedViewsPromise = listTaskViews(viewer.id);
  optionsPromise.catch(() => {});
  manageCategoriesPromise.catch(() => {});
  manageTagsPromise.catch(() => {});
  manageTagTypesPromise.catch(() => {});
  templatesPromise.catch(() => {});
  savedViewsPromise.catch(() => {});

  // ?task=<uuid> — the ⌘K palette's deep link into the edit dialog (tasks
  // have no detail route; the dialog IS the editor). Resolved through this
  // page's own gated read, so the URL grants nothing; getTaskById returns
  // null for malformed/deleted ids and the page renders normally.
  const openId = get('task');

  const filters = await resolveTaskFilters(tz, params, view, month, now);
  const [
    tasksPage,
    counts,
    options,
    manageCategories,
    manageTags,
    manageTagTypes,
    templateRows,
    savedViews,
    openRow,
  ] = await Promise.all([
    filters
      ? listTasks({ view, page, filters, sort: params.sort })
      : Promise.resolve({ rows: [], total: 0, page: 1, totalPages: 1 }),
    filters
      ? countTasksByStatus(filters)
      : // Seeded from the vocabulary, the countTasksByStatus rule: written out,
        // this is a second place a new status has to be remembered.
        Promise.resolve(EMPTY_STATUS_COUNTS),
    optionsPromise,
    manageCategoriesPromise,
    manageTagsPromise,
    manageTagTypesPromise,
    templatesPromise,
    savedViewsPromise,
    openId ? getTaskById(openId) : Promise.resolve(null),
  ]);

  // ── "Did you mean" — the SECOND tier, and only ever on a miss ───────────
  // The exact search above has already run. Only when it found nothing is a
  // vocabulary fetched and a correction attempted, so a working search pays
  // nothing for this. `correctIfEmpty` returns null unless there is genuinely
  // something to say, and `suggestQuery` only offers a correction that
  // actually matches rows — nobody is sent from one empty page to another.
  // `?nocorrect=1` is what the "Search instead for…" link carries. Without it
  // that link would land back here, be corrected again, and read as a button
  // that does nothing. Deliberately NOT part of the taskFilters URL contract:
  // it is a one-shot escape hatch, not a filter, so it never enters a saved
  // view and never survives the next search.
  const correction =
    filters && !get('nocorrect')
      ? await correctIfEmpty(params.q, tasksPage.total, taskSearchVocabulary)
      : null;
  // Re-run through the SAME predicate rather than showing a fuzzy
  // neighbourhood: what is on screen is then exactly what typing the corrected
  // query by hand would give.
  const corrected = correction
    ? await resolveTaskFilters(
        tz,
        { ...params, q: correction.corrected },
        view,
        month,
        now,
      )
    : null;
  const [correctedPage, correctedCounts] = corrected
    ? await Promise.all([
        listTasks({ view, page: 1, filters: corrected, sort: params.sort }),
        countTasksByStatus(corrected),
      ])
    : [null, null];
  const board = correctedPage ?? tasksPage;
  const boardCounts = correctedCounts ?? counts;

  // Slim projection for the client dialog (the barrel/slim-props rule): the
  // logo collapses to one resolved path here rather than shipping both columns.
  const templates: TemplateItem[] = templateRows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    notes: row.notes,
    clientId: row.clientId,
    clientName: row.clientName,
    clientLogo: row.clientLogoBlobUrl ?? row.clientLogoStaticPath ?? '',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    assignees: row.assignees.map((who) => ({
      id: who.id ?? '',
      name: who.name,
      avatar: (who.id ? options.avatars.get(who.id) : null) ?? null,
    })),
    priority: row.priority,
    estimatedMinutes: row.estimatedMinutes,
    repeat: row.repeat,
    repeatDay: row.repeatDay,
    dueOffsetDays: row.dueOffsetDays,
    active: row.active,
  }));

  const rows = board.rows.map((row) =>
    toRowData(row, tz, todayKey, options.avatars),
  );
  const openTask = openRow
    ? toRowData(openRow, tz, todayKey, options.avatars)
    : null;
  // Carries the month, so pagination, the revision parent link, the ?task=
  // strip and the Export anchor all stay in the month on screen — every one of
  // them is built from this one string inside TaskBoard.
  const filterQs = taskScopeQs(view, params, scope);
  // Sort and group are view preferences, not filters — clearing must not
  // silently reset them (TaskFilterBar's Clear button follows the same rule).
  // Neither is the month: it is a scope, so clearing filters must not silently
  // move the reader to a different month.
  const clearQs = taskScopeQs(
    view,
    { sort: params.sort, group: params.group },
    scope,
  );
  // Longest wait on the page, plus how many are waiting at all.
  const waitingSummary = (() => {
    if (view !== 'needs_approval') return '';
    const waiting = rows.filter((row) => row.waitingLabel);
    if (waiting.length === 0) return '';
    const longest = waiting.reduce((worst, row) =>
      row.waitingState === 'long' && worst.waitingState !== 'long'
        ? row
        : worst,
    );
    const scope =
      board.totalPages > 1
        ? `${waiting.length} on this page`
        : `${waiting.length}`;
    const overdueCount = waiting.filter((r) => r.waitingState === 'long').length;
    return overdueCount > 0
      ? `${scope} waiting on client sign-off · ${overdueCount} for over a week (longest: ${longest.title})`
      : `${scope} waiting on client sign-off.`;
  })();

  const monthSwitch = monthSwitcherFor({
    tz,
    now,
    view,
    params,
    month,
    currentMonth,
    digest: false,
    allLabel: 'All time',
  });
  // The month's own size, across every status — not the active tab's, which
  // has its own badge a few pixels below.
  const scopeTotal = TASK_STATUS_SLUGS.reduce(
    (n, slug) => n + boardCounts[slug],
    0,
  );
  const currentHref = (() => {
    const qs = taskScopeQs(
      coerceTaskView(view, currentMonth, currentMonth),
      params,
      { ...scope, month: currentMonth },
    );
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  })();

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tasks
            </h1>
            <HelpButton topic={ADMIN_HELP.tasks} />
          </div>
          <p className="text-sm text-muted-foreground">
            Who&rsquo;s doing what, for which client: the work log behind the
            monthly reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Plain <a>, deliberately not next/link — prefetch would fire the
              export query (ExportMenu's documented rule). Carries the live
              view + filters so the download matches what's on screen. */}
          <a
            href={`${BASE_PATH}/export${filterQs ? `?${filterQs}` : ''}`}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium text-black/85 backdrop-blur-md transition-colors',
              'hover:border-black/30 hover:bg-white/85 hover:text-black',
            )}
          >
            <LuDownload aria-hidden="true" className="size-3.5" />
            Export CSV
          </a>
          <TasksViewToggle
            basePath={BASE_PATH}
            view={view}
            params={params}
            digest={false}
            scope={scope}
          />
          <TasksHeaderActions
            formOptions={options.formOptions}
            templates={templates}
            todayKey={todayKey}
            categories={manageCategories.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              siteCategory: c.siteCategory,
              archived: c.archived,
              taskCount: c.taskCount,
            }))}
            tags={manageTags}
            tagTypes={manageTagTypes}
            // Id-valued (scope is stored as FKs), and ACTIVE only: scoping a
            // tag to a retired category would offer it nowhere.
            scopeCategories={options.formOptions.categories.map((c) => ({
              id: c.value,
              name: c.label,
            }))}
          />
        </div>
      </header>

      <GlassPanel className="mt-6">
        <TaskMonthBand
          basePath={BASE_PATH}
          switcher={monthSwitch}
          total={scopeTotal}
          scoped={isMonthScoped(month)}
          past={pastMonth}
          currentHref={currentHref}
          currentLabel={monthLabel(currentMonth)}
        />
        <TaskTabs
          basePath={BASE_PATH}
          active={view}
          counts={boardCounts}
          params={params}
          tabs={taskTabsFor(month, currentMonth)}
          scope={scope}
        />
        <TaskFilterBar
          basePath={BASE_PATH}
          view={view}
          params={params}
          clientOptions={options.filterClients}
          categoryOptions={options.filterCategories}
          tagOptions={options.tags}
          tagTypes={options.tagTypes}
          assigneeOptions={withActiveOption(
            options.assigneeOptions,
            params.assignee,
            // avatar: null keeps the row's coin (and the list's alignment) —
            // an absent key would mean "this facet has no faces".
            (value) => ({ value, label: 'Former member', avatar: null }),
          )}
          scope={scope}
          viewerId={viewer.id}
          savedViews={savedViews}
        />
        {/* The one place the sign-off backlog is stated as a whole rather
            than a row at a time. On the tab it belongs to only: everywhere
            else it would be a number about work the reader isn't looking at.
            Folded from the rows on this PAGE, so it says "on this page" when
            the tab is paginated rather than implying it counted all 40. */}
        {view === 'needs_approval' && waitingSummary && (
          <p className="border-t border-white/40 px-4 py-2.5 text-xs text-muted-foreground sm:px-5 dark:border-white/10">
            {waitingSummary}
          </p>
        )}
        {correction && (
          <SearchCorrection
            className="px-4 pb-3 sm:px-5"
            corrected={correction.corrected}
            original={params.q}
            // Back to the literal query. `nocorrect` is what stops the page
            // helpfully correcting it straight back again — without it the
            // link is a no-op and reads as broken.
            searchInstead={`${BASE_PATH}?${taskScopeQs(
              view,
              { ...params, q: params.q },
              scope,
            )}&nocorrect=1`}
          />
        )}
        <TaskBoard
          rows={rows}
          view={view}
          basePath={BASE_PATH}
          page={board.page}
          totalPages={board.totalPages}
          filterQs={filterQs}
          openTask={openTask}
          // The quick-add band takes the caret unless something else has a
          // better claim: a ?task= deep link is opening a dialog, or a ⌘K
          // "view all" handoff means the member arrived mid-search.
          quickAddAutoFocus={!openTask && params.q === ''}
          formOptions={options.formOptions}
          templates={templates}
          todayKey={todayKey}
          group={params.group}
          // A past month has no add band: a new task is open, so it would
          // belong to the CURRENT month and vanish from the board it was typed
          // into. The note that replaces it says where to go instead.
          pastMonth={pastMonth}
          monthLabel={isMonthScoped(month) ? monthLabel(month) : ''}
          currentMonthHref={currentHref}
          currentMonthLabel={monthLabel(currentMonth)}
          empty={
            <TasksEmpty
              view={view}
              filtered={filters === null || hasActiveTaskFilters(params, view)}
              clearHref={clearQs ? `${BASE_PATH}?${clearQs}` : BASE_PATH}
              monthLabel={isMonthScoped(month) ? monthLabel(month) : undefined}
              allTimeHref={monthSwitch.allHref}
            />
          }
        />
      </GlassPanel>
    </AdminPage>
  );
}
