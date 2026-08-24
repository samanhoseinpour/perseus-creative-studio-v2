import type { Metadata } from 'next';
import Link from 'next/link';
import { LuRepeat, LuWallet } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { adminLink, GlassPanel } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import {
  PayrollSection,
  PayrollTile,
  PayrollTrend,
} from '@/components/Admin/payroll/PayrollSections';
import PayrollMonthTable from '@/components/Admin/payroll/PayrollMonthTable';
import PayrollRunActions from '@/components/Admin/payroll/PayrollRunActions';
import { buildAdminMonthView } from '@/components/Admin/payroll/payrollData';
import { costMonthRollups } from '@/db/costQueries';
import {
  canAccessArea,
  requirePayrollAdmin,
  viewerZone,
} from '@/lib/adminAccess';
import { monthTokenIn, parseMonthToken } from '@/lib/calendar';
import { formatAmount } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payroll',
  description: 'Monthly pay for the studio team.',
};

const BASE = '/admin/payroll';

/**
 * The payroll month screen — everyone's pay for one month.
 *
 * requirePayrollAdmin() gates the render; every action the table and buttons call
 * re-gates itself, because the protected layout's guard doesn't wrap server
 * actions and this page hands out ids for other people's payment rows.
 *
 * Request-time rendered: `?month=` drives both the body and the title.
 */
export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requirePayrollAdmin();
  const { month: raw } = await searchParams;
  const tz = await viewerZone();
  const month = parseMonthToken(raw ?? '') || monthTokenIn(tz);

  // The subscriptions line renders only for someone who also holds `costs`,
  // and the read is GATED rather than masked afterwards — the overview page's
  // rule: on neon-http an ungated read is a wasted round trip AND a figure
  // fetched for someone not entitled to it.
  const canCosts = canAccessArea(profile, 'costs');
  const [view, costRollups] = await Promise.all([
    buildAdminMonthView(tz, month),
    canCosts ? costMonthRollups([month]) : Promise.resolve(null),
  ]);
  const costsCents = costRollups?.get(month)?.totalCadCents ?? 0;

  const draftCount = view.progress.draft;
  const spendCount =
    view.progress.sent + view.progress.received + view.progress.flagged;

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Payroll
            </h1>
            <HelpButton topic={ADMIN_HELP.payroll} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.monthLabel} · {spendCount > 0 ? `${view.progress.received} of ${spendCount} confirmed` : 'nothing sent yet'}
            {view.run.invoiceRef ? ` · invoice ${view.run.invoiceRef}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSwitcher
            basePath={BASE}
            month={view.month}
            monthLabel={view.monthLabel}
            currentMonth={view.currentMonth}
            options={view.monthOptions}
          />
          <Link href="/admin/spend/commitments" className="inline-flex">
            <Button
              variant="secondary"
              size="small"
              icon={LuRepeat}
              iconPosition="left"
            >
              Commitments
            </Button>
          </Link>
          <PayrollRunActions
            month={view.month}
            monthLabel={view.monthLabel}
            runExists={view.run.exists}
            rateMicro={view.run.rateMicro}
            invoiceRef={view.run.invoiceRef}
            note={view.run.note}
            draftCount={draftCount}
            totalLabel={view.tiles.salaryLabel}
            missingCount={
              view.missing.filter((m) => m.reason === 'not added yet').length
            }
          />
        </div>
      </header>

      {!view.run.exists ? (
        <GlassPanel className="mt-6">
          <EmptyState
            icon={LuWallet}
            title={`${view.monthLabel} hasn’t been started`}
            description="Starting the month creates a draft line for everyone on the payroll, pre-filled from their standing salary and prorated if they joined or left mid-month. Nothing is sent until you say so."
          />
        </GlassPanel>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PayrollTile
              label="Salary cost"
              value={view.tiles.salaryLabel}
              reading={
                view.tiles.feeLabel !== '—'
                  ? `+ ${view.tiles.feeLabel} in wire fees`
                  : undefined
              }
              hint={view.tiles.salaryHint ?? undefined}
              muted={view.tiles.salaryLabel === '—'}
            />
            <PayrollTile
              label="People paid"
              value={view.tiles.headcountLabel}
              reading={draftCount > 0 ? `${draftCount} still in draft` : undefined}
            />
            <PayrollTile
              label="Rate"
              value={view.tiles.rateLabel}
              reading={view.tiles.rateLabel !== '—' ? 'toman per CAD' : undefined}
              hint={view.tiles.rateHint ?? undefined}
              muted={view.tiles.rateLabel === '—'}
            />
            <PayrollTile
              label="Confirmed"
              value={view.tiles.confirmedLabel}
              reading={view.tiles.confirmedHint}
            />
          </section>

          {/* The cross-readout hands off to the composed view rather than
              restating it — a viewer holding both grants has a screen that adds
              the two halves up properly. The read stays GATED rather than
              masked afterwards (the overview page's rule). */}
          {costsCents > 0 && (
            <p className="mt-4 px-1 text-xs text-muted-foreground">
              Plus{' '}
              <span className="tabular-nums text-foreground">
                {formatAmount(costsCents, 'CAD')}
              </span>{' '}
              in bills and other running costs this month.{' '}
              <Link
                href={`/admin/spend?month=${view.month}`}
                className={cn('text-foreground', adminLink)}
              >
                See all of it on Spend
              </Link>
              .
            </p>
          )}

          {view.rateImpact &&
            (view.rateImpact.cadAnchoredLabel ||
              view.rateImpact.tomanAnchoredLabel) && (
              <PayrollSection
                tone="glass"
                title="What the rate move did"
                aside="vs last month"
              >
                <ul className="flex flex-col gap-2 text-sm text-foreground">
                  {view.rateImpact.cadAnchoredLabel && (
                    <li className="tabular-nums">
                      {view.rateImpact.cadAnchoredLabel}
                    </li>
                  )}
                  {view.rateImpact.tomanAnchoredLabel && (
                    <li className="tabular-nums">
                      {view.rateImpact.tomanAnchoredLabel}
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  These pull in opposite directions and are never summed: a
                  stronger CAD gives CAD-anchored members more toman at no extra
                  cost, and makes a toman-anchored member’s fixed salary cheaper
                  for the studio.
                </p>
              </PayrollSection>
            )}

          <section className="mt-6">
            <GlassPanel>
              {view.lines.length === 0 ? (
                <EmptyState
                  icon={LuWallet}
                  title="No lines in this month"
                  description="Nobody on the payroll had a standing salary covering this month."
                />
              ) : (
                <PayrollMonthTable
                  lines={view.lines}
                  runRateMicro={view.run.rateMicro}
                  month={view.month}
                />
              )}
            </GlassPanel>
          </section>

          {view.missing.length > 0 && (
            <p className="mt-3 px-1 text-xs text-muted-foreground">
              Not in this month:{' '}
              {view.missing.map((m, i) => (
                <span key={m.memberId}>
                  {i > 0 && ', '}
                  <Link
                    href={`${BASE}/${m.memberId}`}
                    className={cn('text-foreground', adminLink)}
                  >
                    {m.memberName}
                  </Link>{' '}
                  ({m.reason})
                </span>
              ))}
              . Set a standing salary on anyone missing one, then use “Add
              missing” above to pull them into {view.monthLabel}.
            </p>
          )}

          <PayrollTrend
            tone="glass"
            title="Company cost over time"
            aside="CAD, salary only"
            rows={view.trend}
          />

          {/* Plain anchors, deliberately not next/link: prefetch would fire the
              export query (the ExportMenu rule). */}
          <p className="mt-4 px-1 text-xs text-muted-foreground">
            Export{' '}
            <a
              href={`${BASE}/export?month=${view.month}`}
              className={cn('text-foreground', adminLink)}
            >
              this month
            </a>{' '}
            or{' '}
            <a
              href={`${BASE}/export?year=${view.month.slice(0, 4)}`}
              className={cn('text-foreground', adminLink)}
            >
              all of {view.month.slice(0, 4)}
            </a>{' '}
            as CSV.
          </p>

          <p className="mt-6 px-1 text-xs text-muted-foreground">
            Wire fees are company cost and never form part of anyone’s salary.
            Members see only their own line, and only once a month is sent.
          </p>
        </>
      )}
    </AdminPage>
  );
}
