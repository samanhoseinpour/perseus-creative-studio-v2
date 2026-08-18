import type { Metadata } from 'next';
import { LuBanknote } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel } from '@/components/Admin/Glass';
import MyPayMonth from '@/components/Admin/payroll/MyPayMonth';
import {
  DetailList,
  GrowthSplit,
  PayrollSection,
  PayrollTile,
  PayrollTrend,
} from '@/components/Admin/payroll/PayrollSections';
import PayrollStatusBadge from '@/components/Admin/payroll/PayrollStatusBadge';
import { buildOwnPayView } from '@/components/Admin/payroll/payrollData';
import { requireOwnPayroll } from '@/lib/adminAccess';

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

  const view = await buildOwnPayView(memberId, requestedYear);

  if (!view || !view.current) {
    return (
      <AdminPage width="narrow">
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

  const { current, growth, trend, history, year, terms } = view;

  return (
    <AdminPage width="narrow">
      <Header />

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <PayrollTile
          label={`${current.monthLabel} received`}
          value={current.paidLabel}
          reading={current.rateLabel ?? undefined}
          hint={current.prorationLabel ?? undefined}
        />
        <PayrollTile
          label={`${year.year} so far`}
          value={year.paidLabel ?? '—'}
          reading={year.monthsLabel}
          muted={!year.paidLabel}
        />
      </section>

      <MyPayMonth month={current} />

      {growth && <GrowthSplit tone="glass" {...growth} />}

      <PayrollSection tone="glass" title={`${current.monthLabel} breakdown`}>
        <DetailList
          tone="glass"
          rows={[
            { label: 'Amount received', value: current.paidLabel },
            {
              label: 'Your salary figure',
              value: current.anchorLabel,
              note: current.prorationLabel ?? undefined,
            },
            ...(current.rateLabel
              ? [{ label: 'Exchange rate applied', value: current.rateLabel }]
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

      <PayrollTrend
        tone="glass"
        title="Your pay over time"
        aside={view.payCurrencyLabel}
        rows={trend}
      />

      {history.length > 1 && (
        <PayrollSection
          tone="glass"
          title="Every month"
          aside={`${history.length} records`}
        >
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {history.map((row) => (
              <li
                key={row.paymentId}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-foreground">
                    {row.monthLabel}
                  </span>
                  <PayrollStatusBadge status={row.status} audience="member" />
                </div>
                <div className="text-right">
                  <span className="text-sm tabular-nums text-foreground">
                    {row.paidLabel}
                  </span>
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {row.anchorLabel}
                    {row.prorationLabel ? ` · ${row.prorationLabel}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </PayrollSection>
      )}

      {terms.length > 0 && (
        <PayrollSection tone="glass" title="Your salary history">
          <DetailList
            tone="glass"
            rows={terms.map((t) => ({
              label: t.label,
              value: t.amountLabel,
            }))}
          />
        </PayrollSection>
      )}

      <p className="mt-6 px-1 text-xs text-muted-foreground">
        Only you and the studio’s payroll admin can see this page. If a figure
        looks wrong, use “Something’s wrong” above — it goes straight to payroll
        with your note.
      </p>
    </AdminPage>
  );
}

function Header() {
  return (
    <header className="mb-6 flex flex-col gap-1.5">
      <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Private
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        My pay
      </h1>
      <p className="text-sm text-muted-foreground">
        Your monthly pay, what moved it, and confirmation that it arrived.
      </p>
    </header>
  );
}
