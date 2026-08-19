import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireArea } from '@/lib/adminAccess';
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

export const metadata: Metadata = {
  title: 'Print report',
  description: 'Print-ready monthly client report.',
};

// Pinned to the studio's calendar: the server runs UTC in production, so an
// evening print would otherwise stamp tomorrow's date on the client PDF.
const PREPARED = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Vancouver',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

/**
 * The print-ready monthly report — ink on white, literal neutrals so dark
 * mode never applies, @page A4 margins, sections that don't split across
 * pages. Lives under (protected): auth + noindex inherited; the admin
 * chrome (rail + shader) hides itself at print via the layout's
 * `print:hidden` escapes, so browser print-to-PDF yields a clean document
 * to send the client.
 */
export default async function ClientReportPrintPage({
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

  return (
    <div className="min-h-svh bg-background text-foreground print:bg-transparent print:text-neutral-900">
      {/* print-color-adjust: browsers strip background colors when printing
          ("Background graphics" is off by default in every browser), which
          would erase all the report's bar charts — they are pure
          background-color divs. Scoped to print so screen rendering keeps
          browser defaults. */}
      <style>{`@media print { @page { size: A4; margin: 16mm } * { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <PrintButton />

      <div className="mx-auto max-w-3xl px-10 py-12 print:max-w-none print:px-0 print:py-0">
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

        <section className="mt-8 grid grid-cols-4 gap-3 break-inside-avoid">
          <PrintTile
            label="Tasks completed"
            value={String(report.tiles.tasksCompleted)}
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

        {report.tiles.tasksCompleted > 0 ? (
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
            />
          </>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground print:text-neutral-500">
            No delivered work recorded in {report.monthLabelText}.
          </p>
        )}

        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground print:border-neutral-200 print:text-neutral-500">
          Prepared {PREPARED.format(new Date())} · Perseus Creative Studio ·
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
