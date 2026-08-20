import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowUpRight, LuBanknote, LuReceipt } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import EmptyState from '@/components/Admin/EmptyState';
import {
  GlassPanel,
  GlassRim,
  glassCard,
  glassChip,
  glassRowHover,
} from '@/components/Admin/Glass';
import MyPayMonth from '@/components/Admin/payroll/MyPayMonth';
import {
  PayColumns,
  SalarySteps,
} from '@/components/Admin/payroll/PayrollCharts';
import {
  DetailList,
  GrowthSplit,
  PayrollSection,
  PayrollTile,
} from '@/components/Admin/payroll/PayrollSections';
import PayrollStatusBadge from '@/components/Admin/payroll/PayrollStatusBadge';
import { buildOwnPayView } from '@/components/Admin/payroll/payrollData';
import { requireOwnPayroll, viewerZone } from '@/lib/adminAccess';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'My pay',
  description: 'Your monthly pay history.',
};

/**
 * The member's own pay — the ONLY payroll surface a non-admin can open.
 *
 * requireOwnPayroll() bounces anyone without a payroll record or with self-view
 * switched off, and hands back the member id it read from the SESSION. That id is
 * the only thing this page ever queries by: there is no route param to tamper
 * with, and buildOwnPayView reads exclusively through the `own*` projections, so
 * company cost, wire fees, wire refs, and internal notes are never fetched at
 * all — let alone serialized into this page's RSC payload.
 *
 * Written for the person whose money it is, not for whoever runs payroll: the
 * amount leads, the mechanics that produced it sit at the bottom, and the
 * vocabulary is deliberately plain ("your agreed salary", not "the anchor"). The
 * mechanics are demoted, never removed — a member can always see the full
 * working behind their own figure.
 */
export default async function MyPayPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { memberId } = await requireOwnPayroll();
  const { year: rawYear } = await searchParams;
  const requestedYear = /^20\d{2}$/.test(rawYear ?? '')
    ? Number(rawYear)
    : undefined;

  const view = await buildOwnPayView(
    await viewerZone(),
    memberId,
    requestedYear,
  );

  if (!view || !view.current) {
    return (
      <AdminPage>
        <Header />
        <GlassPanel className="mt-6">
          <EmptyState
            icon={LuBanknote}
            title="Nothing to show yet"
            description="Your pay will appear here once a month has been sent."
          />
        </GlassPanel>
      </AdminPage>
    );
  }

  const { current, growth, chart, salary, history, year, allTime, salaryNow } =
    view;
  const showGrowth = Boolean(growth?.paidPctLabel);

  return (
    <AdminPage>
      <Header payslipHref={current.payslipHref} />

      {/* The month, at the size the month deserves — the amount is the headline
          and the chart sits beside it so "what landed" and "how that compares"
          are one glance, not two scrolls. */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <GlassPanel className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {current.monthLabel}
              </span>
              <PayrollStatusBadge status={current.status} audience="member" />
            </div>

            <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-foreground sm:text-5xl">
              {current.paidLabel}
            </p>

            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {current.anchorLabel} agreed
              {current.rateLabel ? ` · ${current.rateLabel}` : ''}
              {current.prorationLabel ? ` · ${current.prorationLabel}` : ''}
            </p>
          </div>

          <MyPayMonth month={current} />
        </GlassPanel>

        <PayColumns title="Pay over time" chart={chart} />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <PayrollTile
          label={`${year.year} so far`}
          value={year.paidLabel ?? '—'}
          reading={year.monthsLabel}
          muted={!year.paidLabel}
        />
        <PayrollTile
          label="Earned all time"
          value={allTime.paidLabel ?? '—'}
          reading={allTime.monthsLabel}
          muted={!allTime.paidLabel}
        />
        <PayrollTile
          label="Your salary now"
          value={salaryNow?.amountLabel ?? '—'}
          reading={salaryNow?.sinceLabel}
          muted={!salaryNow}
        />
      </section>

      {/* GrowthSplit renders nothing without a comparable previous month, so the
          salary track takes the full width rather than leaving a hole.

          Both children are `inset` here — heading inside the glass — so the two
          rectangles start on the same line. PayrollSection's default puts its
          heading ABOVE the panel, which reads fine stacked but dropped this
          panel ~24px below the chart beside it. No `items-start`: the columns
          stretch, so they also END on the same line. */}
      <section
        className={cn('mt-4 grid gap-4', showGrowth && 'lg:grid-cols-2')}
      >
        {showGrowth && growth && <GrowthSplit tone="glass" inset {...growth} />}
        <SalarySteps title="Your salary over time" track={salary} />
      </section>

      <PayrollSection
        tone="glass"
        title="Every month"
        aside={history.length === 1 ? '1 record' : `${history.length} records`}
      >
        {year.years.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {year.years.map((y) => {
              const active = y === year.year;
              return (
                <Link
                  key={y}
                  href={`/admin/my-pay?year=${y}`}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium tabular-nums transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : cn(glassChip, 'hover:text-foreground'),
                  )}
                >
                  {y}
                </Link>
              );
            })}
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing was paid in {year.year}.
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-white/40 dark:divide-white/10">
            {history.map((row) => (
              <li key={row.paymentId}>
                <Link
                  href={row.payslipHref}
                  className={cn(
                    'group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-2 py-2.5',
                    glassRowHover,
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-sm font-medium text-foreground">
                      {row.monthLabel}
                    </span>
                    <PayrollStatusBadge status={row.status} audience="member" />
                  </span>
                  <span className="flex items-baseline gap-2 text-right">
                    <span>
                      <span className="block text-sm tabular-nums text-foreground">
                        {row.paidLabel}
                      </span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {row.anchorLabel}
                        {row.prorationLabel ? ` · ${row.prorationLabel}` : ''}
                      </span>
                    </span>
                    <LuArrowUpRight
                      aria-hidden="true"
                      className="size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="sr-only">View payslip</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PayrollSection>

      {/* The working behind the headline. Last, because a member who trusts the
          number never needs it — and the one who doesn't needs all of it. */}
      <PayrollSection tone="glass" title={`How ${current.monthLabel} was worked out`}>
        <DetailList
          tone="glass"
          rows={[
            { label: 'What landed in your account', value: current.paidLabel },
            {
              label: 'Your agreed salary',
              value: current.anchorLabel,
              note: current.prorationLabel ?? undefined,
            },
            ...(current.rateLabel
              ? [{ label: 'Rate used this month', value: current.rateLabel }]
              : []),
            ...(current.sentLabel
              ? [{ label: 'Sent', value: current.sentLabel }]
              : []),
            ...(current.receivedLabel
              ? [{ label: 'You confirmed', value: current.receivedLabel }]
              : []),
          ]}
        />
      </PayrollSection>

      <p className="mt-6 px-1 text-xs text-muted-foreground">
        Only you and the studio’s payroll admin can see this page. If a figure
        looks wrong, use “Something’s wrong” above — it goes straight to payroll
        with your note.
      </p>
    </AdminPage>
  );
}

function Header({ payslipHref }: { payslipHref?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Private
        </span>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My pay
          </h1>
          <HelpButton topic={ADMIN_HELP['my-pay']} />
        </div>
        <p className="text-sm text-muted-foreground">
          Your monthly pay, what moved it, and confirmation that it arrived.
        </p>
      </div>

      {payslipHref && (
        <Link
          href={payslipHref}
          className={cn(
            glassCard,
            glassRowHover,
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground',
          )}
        >
          <GlassRim />
          <LuReceipt aria-hidden="true" className="size-4" />
          Latest payslip
        </Link>
      )}
    </header>
  );
}
