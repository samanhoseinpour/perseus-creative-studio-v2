import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft, LuDownload, LuPrinter } from 'react-icons/lu';

import { SITE_URL } from '@/constants';
import { getActiveReportShare } from '@/db/taskQueries';
import { requireArea } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { LuSquareCheckBig } from 'react-icons/lu';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import ReportHighlights from '@/components/Admin/reports/ReportHighlights';
import ReportShareDialog from '@/components/Admin/reports/ReportShareDialog';
import RetainerDialog from '@/components/Admin/reports/RetainerDialog';
import {
  CategoryBars,
  MemberBars,
  ReportTaskTable,
  ReportTile,
  RetainerBar,
  TrendBars,
} from '@/components/Admin/reports/ReportSections';
import { buildClientMonthReport } from '@/components/Admin/reports/reportData';
import ClientMark from '@/components/Admin/tasks/ClientMark';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Report',
  description: 'Monthly client report.',
};

const buttonish =
  'inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium text-black/85 backdrop-blur-md transition-colors hover:border-black/30 hover:bg-white/85 hover:text-black dark:border-white/15 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/20 dark:hover:text-white';

/** One client's month: tiles, service rollup, member split, retainer,
 *  delivered-work table — with CSV + print-ready exports. */
export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('reports');
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const report = await buildClientMonthReport(slug, firstParam(sp.month));
  if (!report) notFound();
  const activeShare = await getActiveReportShare(report.client.id, report.month);

  const basePath = `/admin/reports/${report.client.slug}`;
  const hasWork = report.tiles.tasksCompleted > 0;

  return (
    <AdminPage>
      <Link
        href="/admin/reports"
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft aria-hidden="true" className="size-3.5" />
        All clients
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Reports
          </span>
          <span className="flex items-center gap-3">
            <ClientMark
              name={report.client.name}
              logo={report.client.logoBlobUrl ?? report.client.logoStaticPath}
              size={40}
            />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {report.client.name}
            </h1>
          </span>
          <p className="text-sm text-muted-foreground">
            Monthly report — {report.monthLabelText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportShareDialog
            clientId={report.client.id}
            month={report.month}
            monthLabelText={report.monthLabelText}
            clientName={report.client.name}
            share={
              activeShare
                ? {
                    id: activeShare.id,
                    url: `${SITE_URL}/share/reports/${activeShare.token}`,
                  }
                : null
            }
          />
          <RetainerDialog
            clientId={report.client.id}
            clientName={report.client.name}
            retainerMinutes={report.client.retainerMinutes}
          />
          {/* Plain <a>, not next/link — prefetch would fire the export. */}
          <a
            href={`${basePath}/export?month=${report.month}`}
            className={buttonish}
          >
            <LuDownload aria-hidden="true" className="size-3.5" />
            CSV
          </a>
          <Link
            href={`${basePath}/print?month=${report.month}`}
            target="_blank"
            className={cn(
              buttonish,
              'border-foreground/10 bg-foreground text-background hover:bg-foreground/90 hover:text-background dark:bg-foreground dark:text-background dark:hover:bg-foreground/90',
            )}
          >
            <LuPrinter aria-hidden="true" className="size-3.5" />
            Print report
          </Link>
          <MonthSwitcher
            basePath={basePath}
            month={report.month}
            monthLabel={report.monthLabelText}
            currentMonth={report.currentMonth}
            options={report.monthOptions}
          />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportTile
          label="Tasks completed"
          value={String(report.tiles.tasksCompleted)}
          hint={report.tiles.tasksDelta}
        />
        <ReportTile
          label="Hours delivered"
          value={report.tiles.totalHoursLabel}
          reading={report.tiles.hoursWorkdays}
          hint={report.tiles.hoursDelta}
        />
        <ReportTile
          label="Typical turnaround"
          value={report.tiles.turnaroundLabel}
          hint={report.tiles.turnaroundHint}
        />
        <ReportTile
          label="Members involved"
          value={String(report.tiles.membersInvolved)}
        />
      </section>

      <ReportHighlights
        clientId={report.client.id}
        month={report.month}
        monthLabelText={report.monthLabelText}
        note={report.note}
      />

      {report.retainer && (
        <RetainerBar
          tone="glass"
          usedLabel={report.retainer.usedLabel}
          targetLabel={report.retainer.targetLabel}
          pct={report.retainer.pct}
          overLabel={report.retainer.overLabel}
        />
      )}

      {hasWork ? (
        <>
          <CategoryBars
            tone="glass"
            groups={report.categoryGroups}
            totalLabel={report.categoryTotalLabel}
          />
          <ReportTaskTable tone="glass" tasks={report.tasks} />
          <MemberBars tone="glass" members={report.memberRows} showShare />
        </>
      ) : (
        <GlassPanel as="section" className="mt-6">
          <EmptyState
            icon={LuSquareCheckBig}
            title={`Nothing delivered in ${report.monthLabelText}`}
            description="Tasks marked done in this month will build the report."
          />
        </GlassPanel>
      )}

      {/* History renders even when the selected month is empty — an empty
          month with a live trend is exactly the view worth explaining. */}
      {report.trend.some((point) => point.pct > 0) && (
        <TrendBars tone="glass" rows={report.trend} />
      )}
    </AdminPage>
  );
}
