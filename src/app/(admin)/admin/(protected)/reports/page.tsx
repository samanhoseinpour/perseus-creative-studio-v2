import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { listReportClients } from '@/db/taskQueries';
import { formatMinutes } from '@/lib/taskFields';
import {
  monthToken,
  parseMonthToken,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel } from '@/components/Admin/Glass';
import { monthLabel } from '@/components/Admin/tasks/format';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import ReportClientPicker, {
  type ReportClientItem,
} from '@/components/Admin/reports/ReportClientPicker';
import { recentMonths } from '@/components/Admin/reports/reportData';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Monthly hours and deliverables per client.',
};

/** The client picker: every client with the selected month's tallies —
 *  active accounts first (by hours), quiet ones folded into a tail. */
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

  const roster = await listReportClients(window);
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

      <GlassPanel className="mt-6">
        <ReportClientPicker items={items} month={month} />
      </GlassPanel>
    </AdminPage>
  );
}
