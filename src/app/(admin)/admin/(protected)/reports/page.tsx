import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import {
  internalMonthRollup,
  listActiveSharesForMonth,
  listReportClients,
} from '@/db/taskQueries';
import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  formatWorkDays,
} from '@/lib/taskFields';
import {
  monthToken,
  parseMonthToken,
  vancouverDayKey,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel, glassRowHover } from '@/components/Admin/Glass';
import ClientMark from '@/components/Admin/tasks/ClientMark';
import { monthLabel, shortDayLabel } from '@/components/Admin/tasks/format';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import ReportClientPicker, {
  type ReportClientItem,
} from '@/components/Admin/reports/ReportClientPicker';
import {
  ReportTile,
  TrendBars,
} from '@/components/Admin/reports/ReportSections';
import { buildTrend, recentMonths } from '@/components/Admin/reports/reportData';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Monthly hours and deliverables per client.',
};

/** Vancouver-day wording for a live share link, '' when there is none. The
 *  DATE only — the token stays out of the roster entirely. */
function shareLabel(
  share: { createdAt: Date; createdByName: string } | undefined,
): string {
  if (!share) return '';
  return `Link shared ${shortDayLabel(vancouverDayKey(share.createdAt))} by ${share.createdByName}`;
}

/** The client picker: a studio summary strip, the pinned Perseus (internal)
 *  row, every client with the selected month's tallies — active accounts
 *  first (by hours), quiet ones folded into a tail — and the studio's
 *  12-month delivery trend. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('reports');
  const sp = await searchParams;
  const now = new Date();
  const currentMonth = monthToken(now);
  const month = parseMonthToken(firstParam(sp.month)) || currentMonth;
  const window = vancouverMonthWindow(month)!;

  const [roster, internal, studioTrend, shares] = await Promise.all([
    listReportClients(window),
    internalMonthRollup(window),
    buildTrend(month),
    listActiveSharesForMonth(month),
  ]);

  // Studio strip: client work + internal work — everything delivered in the
  // month, summed in JS from rows already fetched (no extra query).
  const clientMinutes = roster.reduce((sum, c) => sum + c.doneMinutes, 0);
  const clientTasks = roster.reduce((sum, c) => sum + c.doneTasks, 0);
  const totalMinutes = clientMinutes + internal.doneMinutes;
  const totalTasks = clientTasks + internal.doneTasks;
  const activeClients = roster.filter((c) => c.doneTasks > 0).length;

  // Retainer accounts that need attention this month: over their target, or
  // (past the first week, so a fresh month isn't flagged on day 2) still well
  // under it. Only accounts WITH a target can be at risk — which is why the
  // no-target count sits beside it as its own prompt.
  const retainerClients = roster.filter((c) => c.retainerMinutes !== null);
  const dayOfMonth = Number(vancouverDayKey(now).slice(8));
  const overBurn = retainerClients.filter(
    (c) => c.doneMinutes > c.retainerMinutes!,
  ).length;
  const underBurn =
    month === currentMonth && dayOfMonth < 8
      ? 0
      : retainerClients.filter(
          (c) => c.doneMinutes < c.retainerMinutes! * 0.5,
        ).length;
  const noTarget = roster.length - retainerClients.length;

  // Only counts clients still on the roster — a share for a deleted client
  // cascades away with it, so the map can't outrun the list.
  const sharedCount = roster.filter((c) => shares.has(c.id)).length;

  // Active accounts first, biggest month first; quiet ones stay A→Z.
  const sorted = [...roster].sort((a, b) => {
    const aActive = a.doneTasks > 0;
    const bActive = b.doneTasks > 0;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.doneMinutes - a.doneMinutes || a.name.localeCompare(b.name);
  });
  const items: ReportClientItem[] = sorted.map((client) => ({
    slug: client.slug,
    name: client.name,
    logoSrc: client.logoBlobUrl ?? client.logoStaticPath ?? '',
    tasksLabel: `${client.doneTasks} task${client.doneTasks === 1 ? '' : 's'}`,
    hoursLabel:
      client.doneTasks > 0 ? formatMinutes(client.doneMinutes) : '—',
    membersLabel:
      client.doneTasks > 0
        ? `${client.members} member${client.members === 1 ? '' : 's'}`
        : '',
    hasActivity: client.doneTasks > 0,
    // Retainer burn for the roster bars — under-served retainers surface at
    // a glance without opening each report.
    retainerLabel:
      client.retainerMinutes !== null
        ? `${formatMinutes(client.doneMinutes)} of ${formatMinutes(client.retainerMinutes)}`
        : '',
    retainerPct: client.retainerMinutes
      ? Math.min(
          100,
          Math.round((client.doneMinutes / client.retainerMinutes) * 100),
        )
      : 0,
    retainerOver:
      client.retainerMinutes !== null &&
      client.doneMinutes > client.retainerMinutes,
    sharedLabel: shareLabel(shares.get(client.id)),
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Reports
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Monthly hours and deliverables per client.
          </p>
        </div>
        <MonthSwitcher
          basePath="/admin/reports"
          month={month}
          monthLabel={monthLabel(month)}
          currentMonth={currentMonth}
          options={recentMonths(12, now)}
        />
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <ReportTile
          label="Hours delivered"
          value={totalMinutes > 0 ? formatMinutes(totalMinutes) : '—'}
          reading={formatWorkDays(totalMinutes)}
          hint={
            internal.doneMinutes > 0
              ? `incl. ${formatMinutes(internal.doneMinutes)} internal`
              : undefined
          }
        />
        <ReportTile
          label="Tasks completed"
          value={String(totalTasks)}
          hint={
            // Retainer health, or the reason there isn't any yet. With no
            // account carrying a target, the burn bars below are all blank and
            // nothing explains why.
            retainerClients.length === 0
              ? `no retainer targets set${noTarget > 0 ? ` (${noTarget} clients)` : ''}`
              : [
                  overBurn > 0 && `${overBurn} over target`,
                  underBurn > 0 && `${underBurn} under half`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'all retainers on track'
          }
        />
        <ReportTile
          label="Active clients"
          value={String(activeClients)}
          hint={
            // Where the month stands on getting out the door. Without it the
            // only way to know whether a client had been sent their month was
            // to open each report in turn.
            sharedCount > 0
              ? `${sharedCount} shared with ${sharedCount === 1 ? 'its client' : 'their clients'}`
              : activeClients > 0
                ? 'none shared yet'
                : undefined
          }
        />
      </section>

      <GlassPanel className="mt-6">
        {/* The studio's own row, pinned above the searchable roster — not a
            client, so it sits outside the picker's filter/search. Wordmark
            coin so it reads as the house, not an account. */}
        <ul className="border-b border-white/40 dark:border-white/10">
          <li className={glassRowHover}>
            <Link
              href={`/admin/reports/internal?month=${month}`}
              className="flex items-center gap-3.5 px-4 py-3 sm:px-5"
            >
              <ClientMark
                name={INTERNAL_CLIENT_LABEL}
                logo={null}
                mark
                size={32}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {INTERNAL_CLIENT_LABEL}
                </span>
                <span className="text-[0.65rem] text-muted-foreground">
                  Internal studio work
                </span>
              </span>
              <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                {internal.doneTasks} task{internal.doneTasks === 1 ? '' : 's'}
              </span>
              <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
                {internal.doneTasks > 0
                  ? formatMinutes(internal.doneMinutes)
                  : '—'}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
                {internal.doneTasks > 0
                  ? `${internal.members} member${internal.members === 1 ? '' : 's'}`
                  : ''}
              </span>
              <LuArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        </ul>
        <ReportClientPicker items={items} month={month} />
      </GlassPanel>

      {studioTrend.some((point) => point.pct > 0) && (
        <TrendBars
          tone="glass"
          rows={studioTrend}
          title="Studio delivery over time"
        />
      )}
    </AdminPage>
  );
}
