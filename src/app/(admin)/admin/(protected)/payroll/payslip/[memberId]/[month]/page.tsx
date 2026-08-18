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
 * layout already drops the sidebar and top bar under `print:hidden`, and the
 * page uses the reports print tone — literal neutrals so `dark:` can't apply.
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

      {/* Literal neutrals, not tokens: this block is what comes out of the
          printer, and `dark:` must never reach it. */}
      <article className="rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-900 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Perseus Creative Studio
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
              {slip.memberName}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Pay statement · {slip.monthLabel}
            </p>
          </div>
          <div className="text-right">
            <PayrollStatusBadge
              status={slip.status}
              audience={own ? 'member' : 'admin'}
              className={cn(
                'border-neutral-300 bg-neutral-100 text-neutral-700',
                'dark:border-neutral-300 dark:bg-neutral-100',
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
            <p className="text-sm text-neutral-700">{slip.flagNote}</p>
          </PayrollSection>
        )}

        {payrollAdmin && !own && slip.internalRows.length > 0 && (
          <PayrollSection tone="print" title="Internal — not for the member">
            <DetailList tone="print" rows={slip.internalRows} />
          </PayrollSection>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-4 text-[0.7rem] text-neutral-500">
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
