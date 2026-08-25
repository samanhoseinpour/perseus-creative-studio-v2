import type { Metadata } from 'next';
import Link from 'next/link';
import { LuReceipt, LuRepeat, LuWallet } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import Button from '@/components/Button';
import { adminLink } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/MonthSwitcher';
import {
  SpendLegend,
  SpendLines,
  SpendSection,
  SpendSplit,
  SpendTile,
  SpendTrend,
} from '@/components/Admin/spend/SpendSections';
import SpendNotFiled from '@/components/Admin/spend/SpendNotFiled';
import { buildSpendMonthView } from '@/components/Admin/spend/spendData';
import { requireSpendOverview, viewerZone } from '@/lib/adminAccess';
import { monthTokenIn, parseMonthToken } from '@/lib/calendar';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Spend',
  description: 'Everything leaving the company in one month.',
};

const BASE = '/admin/spend';

/**
 * The one money view — salaries and bills in a single total, and the recurring
 * commitments behind them.
 *
 * requireSpendOverview() gates the render, and it requires BOTH money grants:
 * this is the only screen that claims to show the whole, so a viewer holding
 * one half would read a partial total under a complete label. That is a
 * correctness rule before it is a privacy one — a misleading figure is worse
 * than a missing one, and nothing on screen would reveal it. Someone holding a
 * single grant still has their own month screen and the commitments roster,
 * each titled for what it actually shows.
 *
 * The page answers two questions and never blurs them: what LEFT this month (a
 * fact, from the two ledgers) and what we are COMMITTED to monthly (a forecast,
 * from the two standing tables).
 *
 * Request-time rendered: `?month=` drives both the body and the title.
 */
export default async function SpendPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireSpendOverview();
  const { month: raw } = await searchParams;
  const tz = await viewerZone();
  const month = parseMonthToken(raw ?? '') || monthTokenIn(tz);

  const view = await buildSpendMonthView(tz, month);

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Spend
            </h1>
            <HelpButton topic={ADMIN_HELP.spend} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.monthLabel} · everything out of the company
            {view.notFiled.length > 0
              ? ` · ${view.notFiled.length} still to file`
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
          <Link href={`${BASE}/commitments`} className="inline-flex">
            <Button
              variant="secondary"
              size="small"
              icon={LuRepeat}
              iconPosition="left"
            >
              Commitments
            </Button>
          </Link>
        </div>
      </header>

      {/* Six columns, not five: the headline figure takes two of them. Five
          equal tiles put "CAD 12,803.81" at text-4xl into a ~230px box, which
          is the kind of layout that only breaks on the month the number grows.
          The other four keep their old width. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SpendTile
          label="Out this month"
          value={view.tiles.totalLabel}
          muted={view.tiles.totalLabel === '—'}
          reading={view.tiles.totalReading}
          hint={view.tiles.totalHint ?? undefined}
          emphasis
          className="xl:col-span-2"
        />
        <SpendTile
          label="People"
          value={view.tiles.peopleLabel}
          muted={view.tiles.peopleLabel === '—'}
          reading={view.tiles.peopleReading}
        />
        <SpendTile
          label="Running costs"
          value={view.tiles.toolsLabel}
          muted={view.tiles.toolsLabel === '—'}
          reading={view.tiles.toolsReading}
        />
        <SpendTile
          label="Monthly run-rate"
          value={view.tiles.runRateLabel}
          muted={view.tiles.runRateLabel === '—'}
          reading={view.tiles.runRateReading}
        />
        <SpendTile
          label={`${view.month.slice(0, 4)} so far`}
          value={view.tiles.yearLabel}
          muted={view.tiles.yearLabel === '—'}
          reading={view.tiles.yearReading}
        />
      </div>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        The first three are what actually left in {view.monthLabel}. The
        run-rate is a forecast of what a month costs, from{' '}
        <Link
          href={`${BASE}/commitments`}
          className={cn('text-foreground', adminLink)}
        >
          the commitments
        </Link>{' '}
        — the two are never added together.
        {view.rateNote ? ` ${view.rateNote}` : ''}
      </p>

      {view.varianceReading && (
        // A forecast beside a fact, stated as a difference. Both sides are the
        // recurring part only, which is why it is worded rather than tiled: a
        // tile would invite reading it as another total.
        <p className="mt-2 px-1 text-xs text-foreground/70">
          {view.varianceReading}
        </p>
      )}

      <SpendSection title="Where it went" aside={view.monthLabel}>
        <SpendSplit rows={view.split} />
        {/* The same money named. Kept inside one section rather than given its
            own: the buckets and the lines under them are one reading, and a
            heading between them would invite adding the two together. */}
        <div className="mt-5 border-t border-white/40 pt-5 dark:border-white/10">
          <SpendLines groups={view.lines} />
        </div>
        {view.categories.length > 1 && (
          <div className="mt-5 border-t border-white/40 pt-5 dark:border-white/10">
            <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bills by kind
            </h3>
            <SpendSplit rows={view.categories} />
          </div>
        )}
      </SpendSection>

      <SpendNotFiled
        items={view.notFiled}
        plans={view.planOptions}
        month={view.month}
      />

      <SpendSection
        title="Out of the company over time"
        aside={`CAD, since ${view.trendSinceLabel}`}
      >
        <SpendTrend rows={view.trend} />
        <div className="mt-4 border-t border-white/40 pt-3 dark:border-white/10">
          <SpendLegend />
        </div>
      </SpendSection>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={`/admin/payroll?month=${view.month}`} className="inline-flex">
          <Button
            variant="secondary"
            size="small"
            icon={LuWallet}
            iconPosition="left"
          >
            Payroll
          </Button>
        </Link>
        <Link href={`/admin/costs?month=${view.month}`} className="inline-flex">
          <Button
            variant="secondary"
            size="small"
            icon={LuReceipt}
            iconPosition="left"
          >
            Bills
          </Button>
        </Link>
      </div>

      <p className="mt-6 px-1 text-xs text-muted-foreground">
        Salaries count from the month they were sent, so payroll still in draft
        is not in the total above — that is why this figure can differ from what
        the payroll screen is preparing. Wire fees are company cost and never
        form part of anyone’s salary.
      </p>
    </AdminPage>
  );
}
