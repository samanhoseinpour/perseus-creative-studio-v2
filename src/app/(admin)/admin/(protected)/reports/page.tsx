import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import { internalMonthRollup, listReportClients } from '@/db/taskQueries';
import { INTERNAL_CLIENT_LABEL, formatMinutes } from '@/lib/taskFields';
import {
  monthToken,
  parseMonthToken,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel, glassRowHover } from '@/components/Admin/Glass';
import { monthLabel } from '@/components/Admin/tasks/format';
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

  const [roster, internal, studioTrend] = await Promise.all([
    listReportClients(window),
    internalMonthRollup(window),
    buildTrend(month),
  ]);

  // Studio strip: client work + internal work — everything delivered in the
  // month, summed in JS from rows already fetched (no extra query).
  const clientMinutes = roster.reduce((sum, c) => sum + c.doneMinutes, 0);
  const clientTasks = roster.reduce((sum, c) => sum + c.doneTasks, 0);
  const totalMinutes = clientMinutes + internal.doneMinutes;
  const totalTasks = clientTasks + internal.doneTasks;
  const activeClients = roster.filter((c) => c.doneTasks > 0).length;

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
          hint={
            internal.doneMinutes > 0
              ? `incl. ${formatMinutes(internal.doneMinutes)} internal`
              : undefined
          }
        />
        <ReportTile label="Tasks completed" value={String(totalTasks)} />
        <ReportTile label="Active clients" value={String(activeClients)} />
      </section>

      <GlassPanel className="mt-6">
        {/* The studio's own row, pinned above the searchable roster — not a
            client, so it sits outside the picker's filter/search. Inverted
            coin (ink on surface) so it reads as the house, not an account. */}
        <ul className="border-b border-white/40 dark:border-white/10">
          <li className={glassRowHover}>
            <Link
              href={`/admin/reports/internal?month=${month}`}
              className="flex items-center gap-3.5 px-4 py-3 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6rem] font-semibold text-background"
              >
                P
              </span>
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
