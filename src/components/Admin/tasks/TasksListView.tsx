import {
  countTasksByStatus,
  listClientMonthUsage,
  listTaskCategories,
  listTaskCategoriesWithCounts,
  listTasks,
  listAssigneeOptions,
  listClientRows,
  resolveTaskFilters,
  type TaskListRow,
} from '@/db/taskQueries';
import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  timeInputValue,
} from '@/lib/taskFields';
import {
  hasActiveTaskFilters,
  monthToken,
  parseTaskListParams,
  resolveTaskView,
  shiftMonthToken,
  taskListQs,
  vancouverDayKey,
  vancouverMonthWindow,
  type TaskListParams,
} from '@/lib/taskFilters';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { LuDownload } from 'react-icons/lu';

import { firstParam, parsePage } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dueDateLabel, monthLabel } from './format';
import TaskBoard from './TaskBoard';
import TaskFilterBar, { type FilterOption } from './TaskFilterBar';
import TasksEmpty from './TasksEmpty';
import TasksHeaderActions from './TasksHeaderActions';
import TaskTabs from './TaskTabs';
import TasksViewToggle from './TasksViewToggle';
import type {
  PickerOption,
  RowAvatar,
  TaskFormOptions,
  TaskRowData,
} from './types';

const BASE_PATH = '/admin/tasks';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Serialize a joined DB row for the client table — strings only (hydration
 *  safety). `avatars` is the server-resolved assignee→face map; deadline
 *  pressure (`dueState`) is stamped here so the client never does date math. */
export function toRowData(
  row: TaskListRow,
  todayKey: string,
  avatars?: Map<string, RowAvatar | null>,
): TaskRowData {
  const dueDate = row.dueDate ?? '';
  const open = row.status !== 'done';
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
    assigneeId: row.assigneeId ?? '',
    assigneeName: row.assigneeName,
    assigneeAvatar:
      (row.assigneeId ? avatars?.get(row.assigneeId) : null) ?? null,
    estimatedMinutes: row.estimatedMinutes,
    actualMinutes: row.actualMinutes,
    estHours: timeInputValue(row.estimatedMinutes),
    actualHours: timeInputValue(row.actualMinutes),
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
    // Via the Vancouver day key, NOT a bare Intl format: the server runs UTC
    // in production, so a 9pm PT completion would otherwise label as
    // tomorrow — outside the very month window that selected the row.
    completedLabel: row.completedAt
      ? dueDateLabel(vancouverDayKey(row.completedAt), todayKey)
      : '',
    deliverableUrl: row.deliverableUrl ?? '',
  };
}

/** The option projections both task views share, resolved server-side —
 *  including the assignee→avatar map (adminIdentity is server-only) and the
 *  current Vancouver month's retainer burn per client. */
export async function loadTaskOptions(viewer: { id: string; name: string }) {
  const usageWindow = vancouverMonthWindow(monthToken());
  const [clientRows, categories, assignees, usage] = await Promise.all([
    listClientRows(),
    listTaskCategories({ includeArchived: true }),
    listAssigneeOptions(),
    usageWindow ? listClientMonthUsage(usageWindow) : Promise.resolve([]),
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
    viewer,
  };
  const filterClients: PickerOption[] = [
    { value: 'internal', label: INTERNAL_CLIENT_LABEL, bare: true },
    ...clientRows.map((c) => ({ value: c.slug, label: c.name, logo: c.logo })),
  ];
  const filterCategories: FilterOption[] = categories.map((c) => ({
    value: c.slug,
    label: c.archived ? `${c.name} (archived)` : c.name,
  }));
  return { formOptions, filterClients, filterCategories, assigneeOptions, avatars };
}

/** Recent 12 months, newest first — the Done tab's month picker. */
export function recentMonthOptions(now: Date): FilterOption[] {
  const current = monthToken(now);
  return Array.from({ length: 12 }, (_, i) => {
    const token = shiftMonthToken(current, -i);
    return { value: token, label: monthLabel(token) };
  });
}

/** The /admin/tasks list surface — an async server component shell
 *  (InboxListView model): parse → read → serialize slim props → compose. */
export default async function TasksListView({
  sp,
  viewer,
  superadmin,
}: {
  sp: SearchParamsRecord;
  viewer: { id: string; name: string };
  superadmin: boolean;
}) {
  const get = (name: string) => firstParam(sp[name]);
  const view = resolveTaskView(get('status'));
  const params: TaskListParams = parseTaskListParams(get);
  const page = parsePage(get('page'));
  const now = new Date();
  const todayKey = vancouverDayKey(now);

  // The filter-independent reads start FIRST so resolveTaskFilters' slug
  // lookups overlap them instead of gating the whole fan-out (each query is
  // its own neon-http round trip). The .catch markers keep a failed read from
  // surfacing as an unhandled rejection if the resolver itself throws.
  const optionsPromise = loadTaskOptions(viewer);
  const manageCategoriesPromise = superadmin
    ? listTaskCategoriesWithCounts()
    : Promise.resolve(null);
  optionsPromise.catch(() => {});
  manageCategoriesPromise.catch(() => {});

  const filters = await resolveTaskFilters(params, view);
  const [tasksPage, counts, options, manageCategories] = await Promise.all([
    filters
      ? listTasks({ view, page, filters, sort: params.sort })
      : Promise.resolve({ rows: [], total: 0, page: 1, totalPages: 1 }),
    filters
      ? countTasksByStatus(filters)
      : Promise.resolve({ todo: 0, in_progress: 0, done: 0 }),
    optionsPromise,
    manageCategoriesPromise,
  ]);

  const rows = tasksPage.rows.map((row) =>
    toRowData(row, todayKey, options.avatars),
  );
  const filterQs = taskListQs(view, params);
  const clearQs = taskListQs(view, {});

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Who&rsquo;s doing what, for which client — the work log behind the
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
              'dark:border-white/15 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/20 dark:hover:text-white',
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
          />
          <TasksHeaderActions
            formOptions={options.formOptions}
            categories={
              manageCategories?.map((c) => ({
                id: c.id,
                slug: c.slug,
                name: c.name,
                siteCategory: c.siteCategory,
                archived: c.archived,
                taskCount: c.taskCount,
              })) ?? undefined
            }
          />
        </div>
      </header>

      <GlassPanel className="mt-6">
        <TaskTabs
          basePath={BASE_PATH}
          active={view}
          counts={counts}
          params={params}
        />
        <TaskFilterBar
          basePath={BASE_PATH}
          view={view}
          params={params}
          clientOptions={options.filterClients}
          categoryOptions={options.filterCategories}
          assigneeOptions={options.assigneeOptions}
          monthOptions={recentMonthOptions(now)}
          viewerId={viewer.id}
        />
        <TaskBoard
          rows={rows}
          view={view}
          basePath={BASE_PATH}
          page={tasksPage.page}
          totalPages={tasksPage.totalPages}
          filterQs={filterQs}
          formOptions={options.formOptions}
          todayKey={todayKey}
          group={params.group}
          empty={
            <TasksEmpty
              view={view}
              filtered={filters === null || hasActiveTaskFilters(params)}
              clearHref={clearQs ? `${BASE_PATH}?${clearQs}` : BASE_PATH}
            />
          }
        />
      </GlassPanel>
    </AdminPage>
  );
}
