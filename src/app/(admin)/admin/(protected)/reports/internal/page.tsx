import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft, LuSquareCheckBig } from 'react-icons/lu';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import {
  CategoryBars,
  InternalKpiPanel,
  MemberBars,
  ReportTaskTable,
  ReportTile,
  TrendBars,
  WeekBars,
} from '@/components/Admin/reports/ReportSections';
import { buildInternalMonthReport } from '@/components/Admin/reports/reportData';
import ClientMark from '@/components/Admin/tasks/ClientMark';
import { TagMixStrip } from '@/components/Admin/tasks/TaskTagChip';
import { tagMixFor } from '@/db/taskQueries';
import { monthWindowIn } from '@/lib/calendar';
import { INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { cn } from '@/lib/utils';

/** Tags named in the month's mix strip — the digest's DIGEST_MIX_MAX rule:
 *  past a handful it stops being a readout and becomes the vocabulary
 *  printed sideways. */
const INTERNAL_MIX_MAX = 10;

export const metadata: Metadata = {
  title: `${INTERNAL_CLIENT_LABEL} — internal`,
  description: 'Monthly internal studio work.',
};

/**
 * The null-client month: everything logged as Perseus (internal) studio
 * work — the roster row's destination. No retainer, highlights note, CSV, or
 * print here: those are client-deliverable concerns; this page is the team
 * looking at itself. A STATIC segment, so Next's route precedence shadows
 * the [slug] route — a client row could never claim this URL even if one
 * were slugged 'internal' (client creation additionally reserves the slug).
 */
export default async function InternalReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('reports');
  const sp = await searchParams;
  const tz = await viewerZone();
  const report = await buildInternalMonthReport(tz, firstParam(sp.month));
  if (!report) notFound();

  // Read HERE rather than through buildInternalMonthReport, and that is the
  // point: reportData.ts is shared verbatim with the client month report, its
  // print sheet and the /share link, so a tag mix threaded through it would
  // be one prop away from a client's PDF. This page asks for it directly.
  const window = monthWindowIn(tz, report.month);
  const tagMix = window
    ? (
        await tagMixFor(['done'], {
          clientId: 'internal',
          completedSince: window.since,
          completedUntil: window.until,
        })
      )
        .slice(0, INTERNAL_MIX_MAX)
        .map(({ id, name, tone, n }) => ({
          tag: { id, slug: id, name, tone },
          n,
        }))
    : [];

  const hasWork = report.tiles.tasksCompleted > 0;

  return (
    <AdminPage width="table">
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
            <ClientMark name={INTERNAL_CLIENT_LABEL} logo={null} mark size={40} />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {INTERNAL_CLIENT_LABEL}
            </h1>
          </span>
          <p className="text-sm text-muted-foreground">
            Internal studio work — {report.monthLabelText}
          </p>
        </div>
        <MonthSwitcher
          basePath="/admin/reports/internal"
          month={report.month}
          monthLabel={report.monthLabelText}
          currentMonth={report.currentMonth}
          options={report.monthOptions}
        />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportTile
          label="Tasks completed"
          value={String(report.tiles.tasksCompleted)}
          hint={report.tiles.tasksDelta}
        />
        <ReportTile
          label="Hours logged"
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

      {hasWork ? (
        <>
          <CategoryBars
            tone="glass"
            groups={report.categoryGroups}
            totalLabel={report.categoryTotalLabel}
          />
          <WeekBars tone="glass" weeks={report.weeks} />
          <MemberBars tone="glass" members={report.memberRows} showShare />
          <ReportTaskTable tone="glass" tasks={report.tasks} />
          {/* This whole page is the studio view, so the panel is at home here
              — it's the client-facing surfaces it must never reach. The tag
              mix rides the same rule (TagMixStrip takes no `tone`). */}
          <TagMixStrip
            label="What shipped"
            mix={tagMix}
            className="mt-6 rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10"
          />
          <InternalKpiPanel {...report.internalKpis} open={report.open} />
        </>
      ) : (
        <GlassPanel as="section" className="mt-6">
          <EmptyState
            icon={LuSquareCheckBig}
            title={`No internal work in ${report.monthLabelText}`}
            description={`Tasks logged under ${INTERNAL_CLIENT_LABEL} and marked done in this month will build this view.`}
          />
        </GlassPanel>
      )}

      {report.trend.some((point) => point.pct > 0) && (
        <TrendBars tone="glass" rows={report.trend} />
      )}
    </AdminPage>
  );
}
