import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import PrintButton from '@/components/Admin/reports/PrintButton';
import {
  AwaitingApproval,
  CategoryBars,
  MemberBars,
  ReportTaskTable,
  RetainerBar,
  WeekBars,
} from '@/components/Admin/reports/ReportSections';
import { buildClientMonthReport } from '@/components/Admin/reports/reportData';
import ClientMark from '@/components/Admin/tasks/ClientMark';
import { PRINT_SHEET_CSS } from '@/lib/printSheet';
import { zonedFormat } from '@/lib/calendar';

export const metadata: Metadata = {
  title: 'Print report',
  description: 'Print-ready monthly client report.',
};

// Pinned to the printer's own calendar: the server runs UTC in production, so
// an unpinned format would stamp tomorrow's date on an evening client PDF.
const PREPARED_OPTS: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

/**
 * The print-ready monthly report — @page A4 margins, sections that don't split
 * across pages. Lives under (protected): auth + noindex inherited; the admin
 * chrome (rail + shader) hides itself at print via the layout's `print:hidden`
 * escapes, so browser print-to-PDF yields a clean document to send the client.
 *
 * Two renderings, not one. ON SCREEN it is theme-aware — this page is read in
 * the browser far more often than it is printed, and pinning literal neutrals
 * both ways (the pre-90d7cb7 shape) left near-black ink on a sheet that had
 * itself turned near-black under the dark theme. ON PAPER the `print:` half
 * pins the ink, and PRINT_SHEET_CSS pins the ground; `text-foreground` sent to
 * a printer from dark mode is white on white.
 */
export default async function ClientReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('reports');
  const [{ slug }, sp, tz] = await Promise.all([params, searchParams, viewerZone()]);
  const report = await buildClientMonthReport(tz, slug, firstParam(sp.month));
  if (!report) notFound();

  return (
    <div className="min-h-svh bg-background text-foreground print:bg-transparent print:text-neutral-900">
      {/* Keeps the bar charts (browsers strip background colours at print) and
          pins the sheet's own ground to a literal white, so a dark-theme admin
          doesn't print a near-black A4. Shared with the share link and the
          payslip — the reasoning lives in src/lib/printSheet.ts. */}
      <style>{PRINT_SHEET_CSS}</style>
      {/* Below the admin mobile top bar, not behind it: that bar is
          `fixed inset-x-0 top-0 z-30`, so a bare `top-4` hid the only print
          control on every phone and tablet. adminTopBarTop is the shared
          geometry (Glass.tsx); the extra 1rem is the gap under it. */}
      <div className="fixed right-4 top-[calc(3.5rem+env(safe-area-inset-top)+1rem)] z-20 lg:top-4 print:hidden">
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-12 pb-28 sm:px-10 lg:pb-12 print:max-w-none print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b border-border pb-6 print:border-neutral-200">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Perseus Creative Studio
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground print:text-neutral-500">
              Monthly delivery report
            </p>
          </div>
          <div className="text-right">
            <span className="flex items-center justify-end gap-2.5">
              {(report.client.logoBlobUrl ?? report.client.logoStaticPath) && (
                <ClientMark
                  name={report.client.name}
                  logo={
                    report.client.logoBlobUrl ?? report.client.logoStaticPath
                  }
                  size={36}
                />
              )}
              <h1 className="text-2xl font-semibold tracking-tight">
                {report.client.name}
              </h1>
            </span>
            <p className="mt-0.5 text-sm text-muted-foreground print:text-neutral-500">
              {report.monthLabelText}
            </p>
          </div>
        </header>

        {report.note && (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
              Month highlights
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground print:text-neutral-800">
              {report.note}
            </p>
          </section>
        )}

        <section className="mt-8 grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4 print:grid-cols-4">
          <PrintTile
            label="Tasks completed"
            value={String(report.tiles.tasksCompleted)}
            // Interpretation, not comparison — same rule as the workday line
            // below: it is what makes one video and six hours add up.
            hint={report.tiles.revisionsLabel}
          />
          <PrintTile
            label="Hours delivered"
            value={report.tiles.totalHoursLabel}
            // The month-over-month deltas stay off the PDF, but the workday
            // read is an interpretation rather than a comparison — it's the
            // line that tells a client what "26h 15m" actually bought.
            hint={report.tiles.hoursWorkdays}
          />
          <PrintTile
            label="Turnaround"
            value={report.tiles.turnaroundLabel}
            hint={report.tiles.turnaroundHint}
          />
          <PrintTile
            label="Members involved"
            value={String(report.tiles.membersInvolved)}
          />
        </section>

        {/* The only live state on an otherwise historical document, and the
            only thing here the reader can act on. Current month only. */}
        {report.open && report.open.awaitingApproval > 0 && (
          <AwaitingApproval
            tone="print"
            count={report.open.awaitingApproval}
            titles={report.open.awaitingTitles}
          />
        )}

        {report.retainer && (
          <RetainerBar
            tone="print"
            usedLabel={report.retainer.usedLabel}
            targetLabel={report.retainer.targetLabel}
            pct={report.retainer.pct}
            overLabel={report.retainer.overLabel}
          />
        )}

        {report.hasWork ? (
          <>
            <CategoryBars
              tone="print"
              groups={report.categoryGroups}
              totalLabel={report.categoryTotalLabel}
            />
            <WeekBars tone="print" weeks={report.weeks} />
            {/* No showShare — a per-member percentage split is a staffing
                detail the client didn't ask for. */}
            <MemberBars tone="print" members={report.memberRows} />
            <ReportTaskTable
              tone="print"
              tasks={report.tasks}
              deliverables={report.deliverables}
              stageSummary={report.stageSummary}
            />
          </>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground print:text-neutral-500">
            No delivered work recorded in {report.monthLabelText}.
          </p>
        )}

        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground print:border-neutral-200 print:text-neutral-500">
          Prepared {zonedFormat(tz, PREPARED_OPTS).format(new Date())} · Perseus Creative Studio ·
          teamperseustudio@gmail.com
        </footer>
      </div>
    </div>
  );
}

function PrintTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  /** Interpretation only ('≈ 3.3 work days (8h each)') — never a delta; a
   *  client PDF states the month, it doesn't compare. */
  hint?: string | false;
}) {
  return (
    <div className="rounded-xl border border-border p-4 print:border-neutral-200">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[0.7rem] tabular-nums text-muted-foreground print:text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}
