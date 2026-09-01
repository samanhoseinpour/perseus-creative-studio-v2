import { LuCalendarOff, LuSearchX } from 'react-icons/lu';
import Link from 'next/link';

import {
  CALENDAR_MAX_ROWS,
  countTasksByStatus,
  getTaskById,
  listTaskViews,
  listTasksInWindow,
  resolveTaskFilters,
} from '@/db/taskQueries';
import {
  INTERNAL_CLIENT_LABEL,
  SHIPPED_STATUSES,
  TASK_STATUS_SLUGS,
  formatMinutes,
} from '@/lib/taskFields';
import {
  CALENDAR_FIELD_PHRASE,
  CALENDAR_FIELD_VERB,
  calendarMinutes,
  foldCellChips,
  foldDayCells,
} from '@/lib/taskCalendar';
import {
  TASK_MONTH_ALL,
  calendarTabsFor,
  coerceTaskViewIn,
  hasActiveTaskFilters,
  parseTaskListParams,
  parseTaskMonth,
  resolveTaskDateField,
  resolveTaskView,
  taskScopeQs,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  monthGridKeys,
  monthTokenIn,
  recentSinceIn,
} from '@/lib/calendar';
import { viewerZone } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import CalendarAgenda from './CalendarAgenda';
import CalendarDialogHost from './CalendarDialogHost';
import CalendarGrid from './CalendarGrid';
import type { CalendarCell } from './CalendarChip';
import { monthLabel, monthNameLabel } from './format';
import TaskFilterBar from './TaskFilterBar';
import TaskMonthBand from './TaskMonthBand';
import TaskTabs from './TaskTabs';
import {
  loadTaskOptions,
  monthSwitcherFor,
  toRowData,
  type SearchParamsRecord,
} from './TasksListView';
import TasksViewToggle from './TasksViewToggle';

const BASE_PATH = '/admin/tasks';

/**
 * The board as a month grid.
 *
 * A third RENDERING of the same filtered query, not a third domain: no
 * migration, no new grant, no action of its own, and no second definition of
 * anything the list already defines. It reads through the same
 * resolveTaskFilters, the same tasksWhere and the same tabs.
 *
 * Two things about it are genuinely different from the list, and both follow
 * from a grid having to put every task on a day:
 *
 *  1. `?month=` picks WHICH MONTH THE GRID DRAWS, and that window replaces the
 *     list's month scope rather than joining it (see calendarDateWindow). The
 *     scope's OR'd "still open" arm admits work with no cell to sit in. The
 *     consequence is wanted: a past month here shows what was due in it and
 *     never shipped, which the list deliberately hides.
 *  2. The date FACET is reduced to its field. The month band is the range
 *     control on this view, so the menu offers only what the grid is a
 *     calendar OF: due-or-start draws a planning calendar, Completed turns the
 *     same grid into a record of what shipped.
 *
 * Read-only. A chip is a Link to `?task=`, which CalendarDialogHost turns into
 * the existing editor, so every write still happens where it already did.
 */
export default async function TasksCalendarView({
  sp,
  viewer,
}: {
  sp: SearchParamsRecord;
  viewer: { id: string; name: string };
}) {
  const get = (name: string) => firstParam(sp[name]);
  const params = parseTaskListParams(get);
  const now = new Date();
  // The reader's own clock: it decides which month is current, which day is
  // today, and which instants fall on which day when the grid keys on a
  // timestamptz column.
  const tz = await viewerZone();
  const todayKey = dayKeyIn(tz, now);
  const yesterdayKey = dayKeyIn(tz, recentSinceIn(tz, 2, now));
  const currentMonth = monthTokenIn(tz, now);
  const month = parseTaskMonth(get, { mode: 'calendar', currentMonth });
  const scope = { month, currentMonth, mode: 'calendar' as const };

  // The FIELD decides which tabs are honest here (keyed on Completed, an open
  // task has no instant to place it), so it is resolved before the view is.
  // Reading it off the raw view is stable rather than circular: coercion only
  // ever lands on 'done', whose own default field is 'completed' — the value
  // that caused the coercion.
  const rawView = resolveTaskView(get('status'));
  const field = resolveTaskDateField(params.dfield, rawView);
  const tabs = calendarTabsFor(field);
  const view = coerceTaskViewIn(rawView, tabs);

  const optionsPromise = loadTaskOptions(viewer, tz);
  const savedViewsPromise = listTaskViews(viewer.id);
  optionsPromise.catch(() => {});
  savedViewsPromise.catch(() => {});

  // The palette's deep link, and now also every chip on this grid. Resolved
  // through this page's own gated read, so the URL grants nothing.
  const openId = get('task');

  const filters = await resolveTaskFilters(
    tz,
    params,
    view,
    month,
    now,
    'calendar',
  );
  const [rows, counts, options, savedViews, openRow] = await Promise.all([
    filters
      ? listTasksInWindow({ view, filters })
      : Promise.resolve([]),
    filters
      ? countTasksByStatus(filters, { keepCompletionWindow: true })
      : // Seeded from the vocabulary, the countTasksByStatus rule: a written
        // out object is how a status added later silently gets no badge.
        Promise.resolve(
          Object.fromEntries(TASK_STATUS_SLUGS.map((s) => [s, 0])) as Record<
            (typeof TASK_STATUS_SLUGS)[number],
            number
          >,
        ),
    optionsPromise,
    savedViewsPromise,
    openId ? getTaskById(openId) : Promise.resolve(null),
  ]);

  const shipped = new Set<string>(SHIPPED_STATUSES);
  const byDay = foldDayCells(rows, field, tz, todayKey);
  // This view's own URL. Every chip appends `&task=<id>` to it, so opening one
  // and having the param stripped again both land back on the exact month, tab
  // and filters the reader was looking at.
  const filterQs = taskScopeQs(view, params, scope);
  const taskHref = (id: string) =>
    `${BASE_PATH}?${filterQs ? `${filterQs}&` : ''}task=${id}`;

  // Every task on one day of the grid, filtered to that day and nothing else.
  //
  // Unscoped on purpose. Carrying this month across would re-apply the LIST's
  // month scope on the far side, and on a past month that clause is
  // completed-in-month: an open task due in July would vanish from the very
  // page its own cell just sent the reader to. A single day is its own scope.
  const dayHref = (dayKey: string) => {
    const qs = taskScopeQs(
      view,
      { ...params, dfield: field, drange: '', from: dayKey, to: dayKey },
      { month: TASK_MONTH_ALL, currentMonth, mode: 'list' },
    );
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  };

  const cells: CalendarCell[] = monthGridKeys(month).map((dayKey) => {
    const day = byDay.get(dayKey);
    const ranked = day?.rows ?? [];
    const { shown, hidden } = foldCellChips(ranked);
    return {
      dayKey,
      inMonth: dayKey.slice(0, 7) === month,
      count: ranked.length,
      minutes: day?.minutes ?? 0,
      hours: formatMinutes(day?.minutes ?? 0),
      hidden,
      moreHref: dayHref(dayKey),
      chips: shown.map((row) => ({
        id: row.id,
        title: row.title,
        href: taskHref(row.id),
        clientLabel: row.clientName ?? INTERNAL_CLIENT_LABEL,
        clientLogo: row.clientLogoBlobUrl ?? row.clientLogoStaticPath ?? '',
        clientMark: row.clientId === null,
        status: row.status,
        hours: formatMinutes(calendarMinutes(row)),
        // Mirrors toRowData exactly, and stays strictly due-based: a
        // start-only task is ongoing, never overdue.
        dueState:
          !shipped.has(row.status) && row.dueDate
            ? row.dueDate < todayKey
              ? ('overdue' as const)
              : row.dueDate === todayKey
                ? ('today' as const)
                : ('' as const)
            : ('' as const),
        shipped: shipped.has(row.status),
        revision: row.parentId !== null,
      })),
    };
  });

  const busiest = cells.reduce((most, cell) => Math.max(most, cell.count), 0);
  // The month's own size, across every status — not the active tab's, which
  // has its own badge a few pixels below. The list's band says the same thing
  // the same way.
  const scopeTotal = TASK_STATUS_SLUGS.reduce((n, slug) => n + counts[slug], 0);
  const capped = rows.length === CALENDAR_MAX_ROWS;

  const clearQs = taskScopeQs(
    view,
    { sort: params.sort, group: params.group },
    scope,
  );
  const monthSwitch = monthSwitcherFor({
    tz,
    now,
    view,
    params,
    month,
    currentMonth,
    mode: 'calendar',
    // Never reached: allowAll is false on this band, because a grid draws one
    // month. It is passed because the switcher's props require a label.
    allLabel: 'All time',
  });
  const openTask = openRow
    ? toRowData(openRow, tz, todayKey, options.avatars)
    : null;
  const filtered = filters === null || hasActiveTaskFilters(params, view);

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Team
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tasks
            </h1>
            <HelpButton topic={ADMIN_HELP.tasks} />
          </div>
          <p className="text-sm text-muted-foreground">
            {`${monthLabel(month)}, each task on ${CALENDAR_FIELD_PHRASE[field]}. Tap one to open it.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TasksViewToggle
            basePath={BASE_PATH}
            view={view}
            params={params}
            mode="calendar"
            scope={scope}
          />
        </div>
      </header>

      <GlassPanel className="mt-6">
        {/* The same band in the same place as the list and the digest: one
            band in the shared loading.tsx is only correct if every branch of
            the page draws one. */}
        <TaskMonthBand
          basePath={BASE_PATH}
          switcher={monthSwitch}
          total={scopeTotal}
          scoped
          // A past month is an ordinary, useful state here rather than a
          // closed record: the grid still shows what was due in it and never
          // shipped, so there is nothing to explain away.
          past={false}
          currentHref={BASE_PATH}
          currentLabel={monthLabel(currentMonth)}
          allowAll={false}
          readout={`${scopeTotal} ${scopeTotal === 1 ? 'task' : 'tasks'} ${
            CALENDAR_FIELD_VERB[field]
          } in ${monthNameLabel(month)}`}
        />
        <TaskTabs
          basePath={BASE_PATH}
          active={view}
          counts={counts}
          params={params}
          tabs={tabs}
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
          assigneeOptions={options.assigneeOptions}
          scope={scope}
          viewerId={viewer.id}
          savedViews={savedViews}
          mode="calendar"
        />

        {capped && (
          <p className="border-b border-white/40 px-4 py-2 text-xs text-muted-foreground sm:px-5 dark:border-white/10">
            {`This month holds more than ${CALENDAR_MAX_ROWS} tasks, so the grid is showing the first ${CALENDAR_MAX_ROWS} and the day counts are short. Narrow it with a filter to see the whole picture.`}
          </p>
        )}

        {/* Three different absences, and telling them apart matters: the band
            directly above states the month's whole size, so "nothing here"
            over a band reading 88 would read as a bug. */}
        {busiest === 0 ? (
          filtered ? (
            <EmptyState
              icon={LuSearchX}
              title="No matches"
              description="No tasks match the current search and filters in this month."
              action={
                <Link
                  href={clearQs ? `${BASE_PATH}?${clearQs}` : BASE_PATH}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                    adminLink,
                  )}
                >
                  Clear filters
                </Link>
              }
            />
          ) : scopeTotal === 0 ? (
            <EmptyState
              icon={LuCalendarOff}
              title={`Nothing ${CALENDAR_FIELD_VERB[field]} in ${monthNameLabel(month)}`}
              description="Pick another month above, or change which date the grid follows in the Filters menu."
            />
          ) : (
            <EmptyState
              icon={LuCalendarOff}
              title="Nothing on this tab"
              // Reuses the band's own phrasing verbatim, because the band is
              // three lines above saying the month holds N and this has to
              // agree with it rather than read as a contradiction.
              description={`${scopeTotal} ${
                scopeTotal === 1 ? 'task' : 'tasks'
              } ${CALENDAR_FIELD_VERB[field]} in ${monthNameLabel(month)}, all of them on other tabs.`}
            />
          )
        ) : (
          <>
            <CalendarGrid cells={cells} todayKey={todayKey} busiest={busiest} />
            <CalendarAgenda
              cells={cells}
              todayKey={todayKey}
              yesterdayKey={yesterdayKey}
            />
          </>
        )}
      </GlassPanel>

      <CalendarDialogHost
        openTask={openTask}
        options={options.formOptions}
        todayKey={todayKey}
        basePath={BASE_PATH}
        filterQs={filterQs}
      />
    </AdminPage>
  );
}
