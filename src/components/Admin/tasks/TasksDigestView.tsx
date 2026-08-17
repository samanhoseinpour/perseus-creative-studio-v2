import { LuLink, LuSquareCheckBig, LuSearchX } from 'react-icons/lu';
import Link from 'next/link';

import { listRecentDone, resolveTaskFilters } from '@/db/taskQueries';
import { INTERNAL_CLIENT_LABEL, formatMinutes } from '@/lib/taskFields';
import {
  hasActiveTaskFilters,
  parseTaskListParams,
  resolveTaskView,
  taskListQs,
  vancouverDayKey,
  vancouverRecentSince,
} from '@/lib/taskFilters';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { digestDayLabel } from './format';
import TaskFilterBar from './TaskFilterBar';
import { loadTaskOptions, recentMonthOptions, type SearchParamsRecord } from './TasksListView';
import TasksViewToggle from './TasksViewToggle';

const BASE_PATH = '/admin/tasks';
const DIGEST_DAYS = 7;
/** Rows arrive newest-completed first, so hitting the cap silently drops the
 *  window's OLDEST days — and the boundary day would report a partial tally as
 *  if it were complete. High enough that a real week never reaches it; when it
 *  does, the view says so instead of quietly lying. */
const DIGEST_MAX_ROWS = 500;

type DigestItem = {
  id: string;
  title: string;
  clientLabel: string;
  categoryLabel: string;
  hoursLabel: string;
  deliverableUrl: string;
};

type DigestMember = {
  key: string;
  name: string;
  /** Server-resolved face (loadTaskOptions' avatar map); null → initials. */
  avatar: import('./types').RowAvatar | null;
  minutes: number;
  items: DigestItem[];
};

type DigestDay = {
  dayKey: string;
  label: string;
  taskCount: number;
  minutes: number;
  members: DigestMember[];
};

/**
 * The daily digest — the team's old Telegram ritual, auto-generated: done
 * tasks from the last week grouped Today / Yesterday / date, then by member.
 * Read-only by design (edits live in the List view); grouping happens here on
 * the server via Vancouver day keys, so the client receives strings only.
 */
export default async function TasksDigestView({
  sp,
  viewer,
}: {
  sp: SearchParamsRecord;
  viewer: { id: string; name: string };
}) {
  const get = (name: string) => firstParam(sp[name]);
  const view = resolveTaskView(get('status'));
  const params = parseTaskListParams(get);
  const now = new Date();
  const todayKey = vancouverDayKey(now);
  // Calendar math, not now-24h: the spring-forward day is 23h long, so a
  // fixed-ms subtraction mislabels "Yesterday" in the first hour after the
  // DST switch. vancouverRecentSince(2) is Vancouver midnight one day back.
  const yesterdayKey = vancouverDayKey(vancouverRecentSince(2, now));

  // Options are filter-independent, so listRecentDone starts the moment the
  // filters resolve and overlaps the options wave instead of waiting on it.
  const optionsPromise = loadTaskOptions(viewer);
  optionsPromise.catch(() => {});
  const filters = await resolveTaskFilters(params, view);
  const [rows, options] = await Promise.all([
    filters
      ? listRecentDone({
          since: vancouverRecentSince(DIGEST_DAYS, now),
          filters,
          limit: DIGEST_MAX_ROWS,
        })
      : Promise.resolve([]),
    optionsPromise,
  ]);

  // Fold: day → member → items. Rows arrive newest-first, so insertion order
  // IS display order for days; members sort by minutes within a day.
  const days = new Map<string, DigestDay>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const dayKey = vancouverDayKey(row.completedAt);
    const minutes = row.actualMinutes ?? row.estimatedMinutes;
    let day = days.get(dayKey);
    if (!day) {
      day = {
        dayKey,
        label: digestDayLabel(dayKey, todayKey, yesterdayKey),
        taskCount: 0,
        minutes: 0,
        members: [],
      };
      days.set(dayKey, day);
    }
    day.taskCount += 1;
    day.minutes += minutes;

    const memberKey = row.assigneeId ?? `name:${row.assigneeName}`;
    let member = day.members.find((m) => m.key === memberKey);
    if (!member) {
      member = {
        key: memberKey,
        name: row.assigneeName,
        avatar:
          (row.assigneeId ? options.avatars.get(row.assigneeId) : null) ?? null,
        minutes: 0,
        items: [],
      };
      day.members.push(member);
    }
    member.minutes += minutes;
    member.items.push({
      id: row.id,
      title: row.title,
      clientLabel: row.clientName ?? INTERNAL_CLIENT_LABEL,
      categoryLabel: row.categoryName,
      hoursLabel: formatMinutes(minutes),
      deliverableUrl: row.deliverableUrl ?? '',
    });
  }
  const dayList = [...days.values()];
  for (const day of dayList) day.members.sort((a, b) => b.minutes - a.minutes);

  const filtered = filters === null || hasActiveTaskFilters(params);
  const clearQs = taskListQs(view, {}, undefined, true);

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
            The last {DIGEST_DAYS} days of shipped work, day by day — the
            digest, minus the typing.
          </p>
        </div>
        <TasksViewToggle
          basePath={BASE_PATH}
          view={view}
          params={params}
          digest
        />
      </header>

      <GlassPanel className="mt-6">
        <TaskFilterBar
          basePath={BASE_PATH}
          view={view}
          params={params}
          clientOptions={options.filterClients}
          categoryOptions={options.filterCategories}
          assigneeOptions={options.assigneeOptions}
          monthOptions={recentMonthOptions(now)}
          viewerId={viewer.id}
          digest
        />
        {rows.length === DIGEST_MAX_ROWS && (
          <p className="border-t border-white/40 px-4 py-2.5 text-xs text-muted-foreground sm:px-5 dark:border-white/10">
            Showing the {DIGEST_MAX_ROWS} most recent completions — the earliest
            days of this window are cut off. Narrow it with a filter, or use the
            List view.
          </p>
        )}
        {dayList.length === 0 && (
          <>
            {filtered ? (
              <EmptyState
                icon={LuSearchX}
                title="No matches"
                description="Nothing finished in the window matches the current filters."
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
            ) : (
              <EmptyState
                icon={LuSquareCheckBig}
                title="Nothing shipped this week"
                description="Tasks marked done appear here, grouped by day and member."
              />
            )}
          </>
        )}
      </GlassPanel>

      {dayList.map((day) => (
        <section key={day.dayKey} className="mt-6">
          <h2 className="mb-3 flex items-baseline justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {day.label}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {day.taskCount} task{day.taskCount === 1 ? '' : 's'} ·{' '}
              {formatMinutes(day.minutes)}
            </span>
          </h2>
          <GlassPanel>
            {day.members.map((member, mi) => (
              <div
                key={member.key}
                className={cn(
                  mi > 0 && 'border-t border-white/40 dark:border-white/10',
                )}
              >
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AdminAvatar
                      name={member.name}
                      size={28}
                      {...(member.avatar ?? {})}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {member.items.length} task
                    {member.items.length === 1 ? '' : 's'} ·{' '}
                    {formatMinutes(member.minutes)}
                  </span>
                </div>
                <ul className="px-4 pt-1.5 pb-3.5 sm:px-5">
                  {member.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline gap-2 py-1 pl-9"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-sm text-foreground">
                            {item.title}
                          </span>
                          {item.deliverableUrl && (
                            <a
                              href={item.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open deliverable for ${item.title}`}
                              className="-m-1.5 ml-0 inline-flex p-1.5 align-middle text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <LuLink aria-hidden="true" className="size-3" />
                            </a>
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.clientLabel} · {item.categoryLabel}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {item.hoursLabel}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </GlassPanel>
        </section>
      ))}
    </AdminPage>
  );
}
