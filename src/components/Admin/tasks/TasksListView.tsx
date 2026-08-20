import {
  countTasksByStatus,
  getTaskById,
  listClientMonthUsage,
  listClientTaskDefaults,
  listEstimateHints,
  listTaskCategories,
  listTaskCategoriesWithCounts,
  listTaskTemplates,
  listTaskViews,
  listTasks,
  listAssigneeOptions,
  listClientRows,
  resolveTaskFilters,
  type TaskListRow,
} from '@/db/taskQueries';
import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  signedMinutes,
} from '@/lib/taskFields';
import {
  hasActiveTaskFilters,
  parseTaskListParams,
  resolveTaskView,
  taskListQs,
  type TaskListParams,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  monthTokenIn,
  monthWindowIn,
  parseMonthToken,
  shiftMonthToken,
} from '@/lib/calendar';
import { viewerZone } from '@/lib/adminAccess';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { LuDownload } from 'react-icons/lu';

import { firstParam, parsePage } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { GlassPanel } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dueDateLabel, monthLabel } from './format';
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

const BASE_PATH = '/admin/tasks';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Serialize a joined DB row for the client table — strings only (hydration
 *  safety). `avatars` is the server-resolved assignee→face map; deadline
 *  pressure (`dueState`) is stamped here so the client never does date math. */
export function toRowData(
  row: TaskListRow,
  tz: string,
  todayKey: string,
  avatars?: Map<string, RowAvatar | null>,
): TaskRowData {
  const dueDate = row.dueDate ?? '';
  const open = row.status !== 'done';
  // Estimate vs actual, but only once the hours mean something: they are
  // confirmed at the approval step, so needs_approval counts alongside done.
  // Anywhere earlier, actualMinutes is either absent or still being edited.
  const settled = row.status === 'done' || row.status === 'needs_approval';
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
    assigneeId: row.assigneeId ?? '',
    assigneeName: row.assigneeName,
    assigneeAvatar:
      (row.assigneeId ? avatars?.get(row.assigneeId) : null) ?? null,
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
    completedLabel: row.completedAt
      ? dueDateLabel(dayKeyIn(tz, row.completedAt), todayKey)
      : '',
    varianceLabel: signedMinutes(variance),
    varianceState: variance === 0 ? '' : variance > 0 ? 'over' : 'under',
    deliverableUrl: row.deliverableUrl ?? '',
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
  const [clientRows, categories, assignees, usage, clientDefaults, estimates] =
    await Promise.all([
      listClientRows(),
      listTaskCategories({ includeArchived: true }),
      listAssigneeOptions(),
      usageWindow ? listClientMonthUsage(usageWindow) : Promise.resolve([]),
      listClientTaskDefaults(),
      listEstimateHints(),
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
  return { formOptions, filterClients, filterCategories, assigneeOptions, avatars };
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
  // The reader's own clock, not the studio's — this single value decides the
  // quick-add default, the Today/Tomorrow chips, the overdue tint, the board's
  // due buckets, and every date label on the page.
  const tz = await viewerZone();
  const todayKey = dayKeyIn(tz, now);

  // The filter-independent reads start FIRST so resolveTaskFilters' slug
  // lookups overlap them instead of gating the whole fan-out (each query is
  // its own neon-http round trip). The .catch markers keep a failed read from
  // surfacing as an unhandled rejection if the resolver itself throws.
  const optionsPromise = loadTaskOptions(viewer, tz);
  const manageCategoriesPromise = superadmin
    ? listTaskCategoriesWithCounts()
    : Promise.resolve(null);
  const templatesPromise = listTaskTemplates();
  const savedViewsPromise = listTaskViews(viewer.id);
  optionsPromise.catch(() => {});
  manageCategoriesPromise.catch(() => {});
  templatesPromise.catch(() => {});
  savedViewsPromise.catch(() => {});

  // ?task=<uuid> — the ⌘K palette's deep link into the edit dialog (tasks
  // have no detail route; the dialog IS the editor). Resolved through this
  // page's own gated read, so the URL grants nothing; getTaskById returns
  // null for malformed/deleted ids and the page renders normally.
  const openId = get('task');

  const filters = await resolveTaskFilters(tz, params, view);
  const [
    tasksPage,
    counts,
    options,
    manageCategories,
    templateRows,
    savedViews,
    openRow,
  ] = await Promise.all([
    filters
      ? listTasks({ view, page, filters, sort: params.sort })
      : Promise.resolve({ rows: [], total: 0, page: 1, totalPages: 1 }),
    filters
      ? countTasksByStatus(filters)
      : Promise.resolve({
          todo: 0,
          in_progress: 0,
          needs_approval: 0,
          done: 0,
        }),
    optionsPromise,
    manageCategoriesPromise,
    templatesPromise,
    savedViewsPromise,
    openId ? getTaskById(openId) : Promise.resolve(null),
  ]);

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
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    priority: row.priority,
    estimatedMinutes: row.estimatedMinutes,
    repeat: row.repeat,
    repeatDay: row.repeatDay,
    dueOffsetDays: row.dueOffsetDays,
    active: row.active,
  }));

  const rows = tasksPage.rows.map((row) =>
    toRowData(row, tz, todayKey, options.avatars),
  );
  const openTask = openRow
    ? toRowData(openRow, tz, todayKey, options.avatars)
    : null;
  const filterQs = taskListQs(view, params);
  // Sort and group are view preferences, not filters — clearing must not
  // silently reset them (TaskFilterBar's Clear button follows the same rule).
  const clearQs = taskListQs(view, {
    sort: params.sort,
    group: params.group,
  });

  return (
    <AdminPage>
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
            templates={templates}
            todayKey={todayKey}
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
          assigneeOptions={withActiveOption(
            options.assigneeOptions,
            params.assignee,
            // avatar: null keeps the row's coin (and the list's alignment) —
            // an absent key would mean "this facet has no faces".
            (value) => ({ value, label: 'Former member', avatar: null }),
          )}
          monthOptions={withActiveOption(
            recentMonthOptions(tz, now),
            // Only a month token belongs in this list — a preset token like
            // 'lastmonth' would otherwise be synthesized into a bogus row.
            parseMonthToken(params.drange),
            (value) => ({ value, label: monthLabel(value) }),
          )}
          viewerId={viewer.id}
          savedViews={savedViews}
        />
        <TaskBoard
          rows={rows}
          view={view}
          basePath={BASE_PATH}
          page={tasksPage.page}
          totalPages={tasksPage.totalPages}
          filterQs={filterQs}
          openTask={openTask}
          formOptions={options.formOptions}
          templates={templates}
          todayKey={todayKey}
          group={params.group}
          empty={
            <TasksEmpty
              view={view}
              filtered={filters === null || hasActiveTaskFilters(params, view)}
              clearHref={clearQs ? `${BASE_PATH}?${clearQs}` : BASE_PATH}
            />
          }
        />
      </GlassPanel>
    </AdminPage>
  );
}
