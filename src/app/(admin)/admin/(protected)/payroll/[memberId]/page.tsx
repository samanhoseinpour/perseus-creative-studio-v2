import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft, LuPrinter } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import { adminLink, glassChip, GlassPanel } from '@/components/Admin/Glass';
import {
  PayColumns,
  SalarySteps,
} from '@/components/Admin/payroll/PayrollCharts';
import {
  DetailList,
  PayrollSection,
  PayrollTile,
} from '@/components/Admin/payroll/PayrollSections';
import PayrollStatusBadge from '@/components/Admin/payroll/PayrollStatusBadge';
import { buildAdminMemberView } from '@/components/Admin/payroll/payrollData';
import { requirePayrollAdmin, viewerZone } from '@/lib/adminAccess';
import { CURRENCIES } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payroll member',
  description: 'One member’s pay history.',
};

/**
 * One member's full record — every month, the raise history, and annual totals.
 * Admin audience: this is the only payroll page that shows company cost beside a
 * named person, which is exactly why it sits behind requirePayrollAdmin().
 */
export default async function PayrollMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  await requirePayrollAdmin();
  const { memberId } = await params;
  const view = await buildAdminMemberView(await viewerZone(), memberId);
  if (!view) notFound();

  const { member, history, terms, chart, salary, totals } = view;
  const currentTerm = terms[0] ?? null;
  const latest = history[0] ?? null;

  return (
    <AdminPage>
      {/* Straight to the merged roster, not through the /admin/payroll/members
          redirect that still stands for old bookmarks — a back link should not
          cost a second request. */}
      <Link
        href={`/admin/spend/commitments?member=${member.id}`}
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Commitments
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {member.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Paid in {CURRENCIES[member.payCurrency].label}
            {view.joinedLabel ? ` · joined ${view.joinedLabel}` : ''}
            {view.endedLabel ? ` · ended ${view.endedLabel}` : ''}
            {member.accountEmail ? ` · ${member.accountEmail}` : ' · no account'}
          </p>
        </div>
        {latest && (
          <Link
            href={`/admin/payroll/payslip/${member.id}/${latest.month}`}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
              adminLink,
            )}
          >
            <LuPrinter className="h-3.5 w-3.5" aria-hidden="true" />
            Latest payslip
          </Link>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <PayrollTile
          label="Standing salary"
          value={currentTerm?.amountLabel ?? '—'}
          reading={currentTerm ? `from ${currentTerm.fromLabel}` : undefined}
          muted={!currentTerm}
        />
        <PayrollTile
          label="Self-view"
          value={member.selfViewEnabled && member.userId ? 'On' : 'Off'}
          reading={
            !member.userId
              ? 'no linked account'
              : member.selfViewEnabled
                ? 'they can see their own pay'
                : 'hidden from them'
          }
          muted={!member.selfViewEnabled || !member.userId}
        />
        <PayrollTile
          label="Months paid"
          value={String(history.length)}
          reading={member.status === 'ended' ? 'ended' : 'active'}
        />
      </section>

      {member.notes && (
        <PayrollSection tone="glass" title="Internal notes">
          <p className="text-sm text-muted-foreground">{member.notes}</p>
        </PayrollSection>
      )}

      {/* The same two visuals the member sees on /admin/my-pay, built from the
          same figures — so a conversation about someone's pay is had over one
          picture rather than two that have to be reconciled. */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <PayColumns title="Paid over time" chart={chart} />
        <SalarySteps title="Salary over time" track={salary} showList={false} />
      </section>

      {terms.length > 0 && (
        <PayrollSection
          tone="glass"
          title="Salary history"
          aside={terms.length === 1 ? '1 term' : `${terms.length} terms`}
        >
          <DetailList
            tone="glass"
            rows={terms.map((t) => ({
              label: `From ${t.fromLabel}`,
              value: t.amountLabel,
              note: t.note ? `${t.note} · set by ${t.createdByName}` : `set by ${t.createdByName}`,
            }))}
          />
        </PayrollSection>
      )}

      {totals.length > 0 && (
        <PayrollSection tone="glass" title="Annual totals">
          <DetailList
            tone="glass"
            rows={totals.map((t) => ({
              label: t.yearLabel,
              value: t.paidLabel ?? '—',
              note: `${t.costLabel} company cost`,
            }))}
          />
        </PayrollSection>
      )}

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Every month
        </h2>
        <GlassPanel>
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {history.map((row) => (
              <li
                key={row.paymentId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/payroll?month=${row.month}`}
                      className={cn('text-sm font-medium text-foreground', adminLink)}
                    >
                      {row.monthLabel}
                    </Link>
                    <PayrollStatusBadge status={row.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.anchorLabel}
                    {row.effectiveRateLabel ? ` @ ${row.effectiveRateLabel}` : ''}
                    {row.prorationLabel ? ` · ${row.prorationLabel}` : ''}
                  </p>
                  {row.memberNote && (
                    <p className="mt-0.5 text-xs text-destructive">
                      Flagged: {row.memberNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="block text-sm tabular-nums text-foreground">
                      {row.paidLabel}
                    </span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {row.costLabel} cost
                    </span>
                  </div>
                  <Link
                    href={`/admin/payroll/payslip/${member.id}/${row.month}`}
                    aria-label={`Payslip for ${row.monthLabel}`}
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                      glassChip,
                    )}
                  >
                    <LuPrinter className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>
    </AdminPage>
  );
}
