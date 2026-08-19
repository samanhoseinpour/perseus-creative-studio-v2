import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import PrintButton from '@/components/Admin/reports/PrintButton';
import {
  DetailList,
  GrowthSplit,
  PayrollSection,
} from '@/components/Admin/payroll/PayrollSections';
import PayrollStatusBadge from '@/components/Admin/payroll/PayrollStatusBadge';
import { buildPayslip } from '@/components/Admin/payroll/payrollData';
import { requirePayrollAccess } from '@/lib/adminAccess';
import { SITE_URL } from '@/constants';
import { parseMonthToken } from '@/lib/taskFilters';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payslip',
  description: 'A single month’s pay statement.',
};

/**
 * The payslip — ONE member, ONE month, printable.
 *
 * The only payroll surface both audiences share, so the gate is the combined one:
 * requirePayrollAccess() lets a payroll admin open anyone's and a member open
 * their own, and bounces everything else. Crucially it returns `own`, and that
 * flag picks the PROJECTION: a member's own copy is built from the `own*` queries,
 * so the company-cost and wire-reference rows are never fetched, not merely
 * hidden by a conditional.
 *
 * Print comes from the browser (PrintButton → window.print()); the (protected)
 * layout already drops the sidebar and top bar under `print:hidden`. The sheet
 * uses the reports print tone, which is theme-aware ON SCREEN and pins literal
 * neutrals under `print:` — it is read in the browser far more often than it is
 * printed, and pinning the ink both ways left it near-black on the dark theme.
 */
export default async function PayslipPage({
  params,
}: {
  params: Promise<{ memberId: string; month: string }>;
}) {
  const { memberId, month: rawMonth } = await params;
  const month = parseMonthToken(rawMonth);
  if (!month) notFound();

  // Authorization resolves BEFORE the row read — the résumé-route idiom.
  const { payrollAdmin, own } = await requirePayrollAccess(memberId);
  const slip = await buildPayslip(memberId, month, own ? 'member' : 'admin');
  if (!slip) notFound();

  const backHref = own ? '/admin/my-pay' : `/admin/payroll/${memberId}`;
  const backLabel = own ? 'My pay' : slip.memberName;

  return (
    <AdminPage width="narrow">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
        <PrintButton />
      </div>

      {/* A document, not a dashboard card: a flat surface rather than glass, so
          it still reads as a sheet. Theme tokens on screen; the `print:` half
          pins the literal ink, because `text-foreground` sent to a printer from
          dark mode is white-on-white. `print-color-adjust: exact` below keeps
          the bars — browsers strip background colour when printing. */}
      <style>{`@media print { @page { size: A4; margin: 16mm } * { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <article className="rounded-2xl border border-border bg-background p-8 text-foreground print:rounded-none print:border-0 print:bg-transparent print:p-0 print:text-neutral-900">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6 print:border-neutral-200">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground print:text-neutral-500">
              Perseus Creative Studio
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground print:text-neutral-900">
              {slip.memberName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground print:text-neutral-500">
              Pay statement · {slip.monthLabel}
            </p>
          </div>
          <div className="text-right">
            <PayrollStatusBadge
              status={slip.status}
              audience={own ? 'member' : 'admin'}
              className={cn(
                'border-foreground/20 bg-foreground/[0.06] text-muted-foreground',
                'print:border-neutral-300 print:bg-neutral-100 print:text-neutral-700',
              )}
            />
          </div>
        </header>

        <PayrollSection tone="print" title="This month">
          <DetailList tone="print" rows={slip.rows} />
        </PayrollSection>

        {slip.growth && <GrowthSplit tone="print" {...slip.growth} />}

        {slip.flagNote && (
          <PayrollSection tone="print" title="Reported problem">
            <p className="text-sm text-foreground print:text-neutral-700">
            {slip.flagNote}
          </p>
          </PayrollSection>
        )}

        {payrollAdmin && !own && slip.internalRows.length > 0 && (
          <PayrollSection tone="print" title="Internal — not for the member">
            <DetailList tone="print" rows={slip.internalRows} />
          </PayrollSection>
        )}

        <footer className="mt-10 border-t border-border pt-4 text-[0.7rem] text-muted-foreground print:border-neutral-200 print:text-neutral-500">
          <p>
            {own
              ? 'Your own statement. If a figure looks wrong, report it from My pay and payroll will follow up.'
              : 'Internal statement. The section above is for reconciliation and is omitted from the member’s own copy.'}
          </p>
          <p className="mt-1">{SITE_URL.replace(/^https?:\/\//, '')}</p>
        </footer>
      </article>
    </AdminPage>
  );
}
