import type { Metadata } from 'next';
import Link from 'next/link';
import { LuRepeat } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import Button from '@/components/Button';
import { adminLink } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import {
  CostBars,
  CostSection,
  CostTile,
} from '@/components/Admin/costs/CostSections';
import CostMonthBoard, {
  AddEntryButton,
} from '@/components/Admin/costs/CostMonthBoard';
import {
  buildCostMonthView,
  buildPlanOptions,
} from '@/components/Admin/costs/costData';
import { adminMonthRollups } from '@/db/payrollQueries';
import { canAccessArea, requireArea, viewerZone } from '@/lib/adminAccess';
import { monthTokenIn, parseMonthToken } from '@/lib/calendar';
import { formatAmount } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Bills',
  description: 'What the studio spends on itself, month by month.',
};

const BASE = '/admin/costs';

/**
 * The bills month screen — everything the company paid for itself in one month,
 * salaries aside. Labelled "Bills" in the rail and here, because "Costs" now
 * reads as the whole of the company's money and that lives on /admin/spend.
 *
 * requireArea('costs') gates the render; every action the table and dialogs
 * call re-gates itself, because the protected layout's guard doesn't wrap
 * server actions.
 *
 * Request-time rendered: `?month=` drives both the body and the title.
 */
export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireArea('costs', '/admin');
  const { month: raw } = await searchParams;
  const tz = await viewerZone();
  const month = parseMonthToken(raw ?? '') || monthTokenIn(tz);

  // The salary line renders only for someone who already holds payroll, and
  // the read is GATED rather than masked afterwards — the overview page's
  // rule: on neon-http an ungated read is a wasted round trip AND a figure
  // fetched for someone not entitled to it.
  const canPayroll = canAccessArea(profile, 'payroll');
  const [view, planPicker, payrollRollups] = await Promise.all([
    buildCostMonthView(tz, month),
    buildPlanOptions(),
    canPayroll ? adminMonthRollups([month]) : Promise.resolve(null),
  ]);

  // The FEE belongs in this total. It is company cost that is not part of
  // anybody's salary, which is why it is its own bucket on /admin/spend — but
  // the sentence below claims what left "out of the company", and leaving the
  // fee out made this page and Spend print two different figures for the same
  // claim, one click apart (July 2026: 2,743.81 here vs 2,773.81 there).
  const rollup = payrollRollups?.get(month);
  const salaryCents = rollup?.costCadCents ?? 0;
  const feeCents = rollup?.feeCadCents ?? 0;
  const combinedLabel =
    canPayroll && salaryCents > 0
      ? formatAmount(salaryCents + feeCents + view.totalCadCents, 'CAD')
      : null;

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Bills
            </h1>
            <HelpButton topic={ADMIN_HELP.costs} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.monthLabel} ·{' '}
            {view.entries.length === 0
              ? 'nothing recorded yet'
              : `${view.entries.length} ${view.entries.length === 1 ? 'charge' : 'charges'}`}
            {view.expected.length > 0
              ? ` · ${view.expected.length} still expected`
              : ''}
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
          <AddEntryButton plans={planPicker} month={view.month} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CostTile
          label="Spent this month"
          value={view.tiles.totalLabel}
          muted={view.tiles.totalLabel === '—'}
          reading={view.tiles.totalReading ?? undefined}
          hint={view.tiles.totalHint ?? undefined}
        />
        <CostTile
          label="Monthly run-rate"
          value={view.tiles.runRateLabel}
          muted={view.tiles.runRateLabel === '—'}
          reading={view.tiles.runRateReading}
        />
        <CostTile
          label="Active costs"
          value={view.tiles.plansLabel}
          reading={view.tiles.plansReading}
        />
        <CostTile
          label="Year to date"
          value={view.tiles.yearLabel}
          muted={view.tiles.yearLabel === '—'}
          reading={view.tiles.yearReading}
        />
      </div>

      {/* The cross-readout now hands off to the composed view rather than
          restating it: a viewer who can see both halves has a screen that adds
          them up properly, with the split, the run-rate and what is still
          unfiled. The read stays GATED rather than masked afterwards — on
          neon-http an ungated read is a wasted round trip AND a figure fetched
          for someone not entitled to it. */}
      {combinedLabel && (
        <p className="mt-4 px-1 text-xs text-muted-foreground">
          Plus{' '}
          <span className="tabular-nums text-foreground">
            {formatAmount(salaryCents + feeCents, 'CAD')}
          </span>{' '}
          in salaries{feeCents > 0 ? ' and wire fees' : ''} — {combinedLabel} out
          of the company in {view.monthLabel}.{' '}
          <Link
            href={`/admin/spend?month=${view.month}`}
            className={cn('text-foreground', adminLink)}
          >
            See all of it on Spend
          </Link>
          .
        </p>
      )}

      <CostMonthBoard
        entries={view.entries}
        expected={view.expected}
        plans={planPicker}
        month={view.month}
        totalLabel={view.tiles.totalLabel}
      />

      {view.categories.length > 0 && (
        <CostSection title="Where it went" aside={view.monthLabel}>
          <CostBars rows={view.categories} />
        </CostSection>
      )}

      <CostSection title="Bills over time" aside="CAD, this area only">
        <CostBars rows={view.trend} emptyLabel="nothing recorded" />
      </CostSection>

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
    </AdminPage>
  );
}
