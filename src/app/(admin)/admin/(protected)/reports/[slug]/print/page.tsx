import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireArea } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import PrintButton from '@/components/Admin/reports/PrintButton';
import {
  CategoryBars,
  MemberBars,
  ReportTaskTable,
  RetainerBar,
} from '@/components/Admin/reports/ReportSections';
import { buildClientMonthReport } from '@/components/Admin/reports/reportData';
import ClientMark from '@/components/Admin/tasks/ClientMark';

export const metadata: Metadata = {
  title: 'Print report',
  description: 'Print-ready monthly client report.',
};

const PREPARED = new Intl.DateTimeFormat('en-US', {
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
    <div className="min-h-svh bg-white text-neutral-900">
      <style>{`@media print { @page { size: A4; margin: 16mm } }`}</style>
      <PrintButton />

      <div className="mx-auto max-w-3xl px-10 py-12 print:max-w-none print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Perseus Creative Studio
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
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
            <p className="mt-0.5 text-sm text-neutral-500">
              {report.monthLabelText}
            </p>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-3 gap-4 break-inside-avoid">
          <PrintTile
            label="Tasks completed"
            value={String(report.tiles.tasksCompleted)}
          />
          <PrintTile label="Hours delivered" value={report.tiles.totalHoursLabel} />
          <PrintTile
            label="Members involved"
            value={String(report.tiles.membersInvolved)}
          />
        </section>

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
            <MemberBars tone="print" members={report.memberRows} />
            <ReportTaskTable tone="print" tasks={report.tasks} />
          </>
        ) : (
          <p className="mt-8 text-sm text-neutral-500">
            No delivered work recorded in {report.monthLabelText}.
          </p>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          Prepared {PREPARED.format(new Date())} · Perseus Creative Studio ·
          teamperseustudio@gmail.com
        </footer>
      </div>
    </div>
  );
}

function PrintTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
