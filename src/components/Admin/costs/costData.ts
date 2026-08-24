import 'server-only';

import {
  costCategoryTotals,
  costMonthRollups,
  costPlanChargeStats,
  costYearTotalCents,
  listCostMonths,
  listCostPlans,
  listMonthEntries,
  planIdsChargedIn,
  type CostEntryRow,
  type CostPlanRow,
} from '@/db/costQueries';
import {
  dayLabel,
  monthLabel,
  monthShortLabel,
} from '@/components/Admin/payroll/format';
import type { CostBarRow } from '@/components/Admin/costs/CostSections';
import type {
  CostEntryItem,
  CostExpectedItem,
  CostPlanItem,
  CostPlanOption,
} from '@/components/Admin/costs/types';
import { monthTokenIn, shiftMonthToken } from '@/lib/calendar';
import {
  costCategoryLabel,
  costCategoryTone,
  countsTowardRunRate,
  monthlyRunRateCents,
  planLandsInMonth,
  COST_CADENCE_SUFFIX,
} from '@/lib/costFields';
import {
  formatAmount,
  formatAmountCompact,
  formatAmountValue,
} from '@/lib/payrollAmounts';

/**
 * Turns cost query rows into fully pre-formatted view props — the
 * payrollData.ts / reportData.ts contract. Every number leaves here as a
 * STRING, so client components do no money math and no date math
 * (hydration-safe) and the figures on screen are the figures the server
 * computed.
 *
 * Costs own no money door: every amount is formatted through
 * src/lib/payrollAmounts.ts with 'CAD'. The only arithmetic performed here is
 * addition of cents already in the column, and the cadence division in
 * monthlyRunRateCents (costFields.ts), which is pinned by
 * scripts/check-costs.mts.
 */

export const COST_TREND_MONTHS = 12;

/** The trailing N calendar months ending at `month`, NEWEST first. */
function trailingMonths(month: string, count = COST_TREND_MONTHS): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonthToken(month, -i));
}

/** Bar widths scaled to the biggest row, with a 2% floor so a sliver shows. */
function scaleBars(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => {
    if (max <= 0 || v <= 0) return 0;
    return Math.max(2, Math.round((v / max) * 100));
  });
}

/** '+12.4% vs July 2026' / 'same as July 2026' / null when there's no prior
 *  figure to compare against (a first month has no story to tell). */
function deltaHint(now: number, before: number, prevLabel: string): string | null {
  if (before <= 0) return null;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 0.05) return `same as ${prevLabel}`;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs ${prevLabel}`;
}

const cad = (cents: number) => formatAmount(cents, 'CAD');

/* -------------------------------------------------------------------------- */
/* Month screen                                                               */
/* -------------------------------------------------------------------------- */

export type CostMonthView = {
  month: string;
  monthLabel: string;
  monthOptions: { value: string; label: string }[];
  currentMonth: string;
  entries: CostEntryItem[];
  expected: CostExpectedItem[];
  tiles: {
    totalLabel: string;
    totalReading: string | null;
    totalHint: string | null;
    runRateLabel: string;
    runRateReading: string;
    plansLabel: string;
    plansReading: string;
    yearLabel: string;
    yearReading: string;
  };
  categories: CostBarRow[];
  trend: CostBarRow[];
  /** Raw cents, for the page's payroll cross-readout. Never rendered directly. */
  totalCadCents: number;
};

function entryView(row: CostEntryRow, monthTotal: number): CostEntryItem {
  const share =
    monthTotal > 0 ? Math.round((row.amountCadCents / monthTotal) * 100) : null;
  return {
    id: row.id,
    planId: row.planId,
    name: row.name,
    vendor: row.vendor,
    category: row.category,
    categoryLabel: costCategoryLabel(row.category),
    categoryTone: costCategoryTone(row.category),
    amountLabel: cad(row.amountCadCents),
    // Bare and ungrouped: the edit dialog binds it to a text input, and
    // "1,299.60" would not survive parseAmount's round trip as typed.
    amountValue: formatAmountValue(row.amountCadCents, 'CAD').replace(/,/g, ''),
    month: row.month,
    chargedOn: row.chargedOn ?? '',
    chargedLabel: row.chargedOn ? dayLabel(row.chargedOn) : null,
    billedNote: row.billedNote ?? '',
    invoiceRef: row.invoiceRef ?? '',
    note: row.note ?? '',
    createdByName: row.createdByName,
    shareLabel: share === null || share < 1 ? null : `${share}%`,
  };
}

function billingHint(plan: CostPlanRow): string | null {
  if (plan.billingDay === null) return null;
  const n = plan.billingDay;
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `bills on the ${n}${suffix}`;
}

export async function buildCostMonthView(
  tz: string,
  month: string,
): Promise<CostMonthView> {
  const current = monthTokenIn(tz);
  const months = trailingMonths(month);
  const prev = shiftMonthToken(month, -1);
  const year = Number(month.slice(0, 4));

  const [entries, plans, rollups, categoryRows, charged, knownMonths, yearTotal] =
    await Promise.all([
      listMonthEntries(month),
      listCostPlans(),
      costMonthRollups([...months, prev]),
      costCategoryTotals(month),
      planIdsChargedIn(month),
      listCostMonths(),
      costYearTotalCents(year),
    ]);

  const total = entries.reduce((sum, e) => sum + e.amountCadCents, 0);
  const prevTotal = rollups.get(prev)?.totalCadCents ?? 0;

  // Run-rate: every ACTIVE plan, normalised to a monthly figure. A usage-billed
  // plan (no expected amount) contributes nothing rather than a guess, so the
  // reading says how many were left out — a forecast that silently omits a line
  // is worse than one that admits it.
  const active = plans.filter((p) => countsTowardRunRate(p.status));
  const priced = active.filter((p) => p.expectedCadCents !== null);
  const runRate = priced.reduce(
    (sum, p) => sum + (monthlyRunRateCents(p.cadence, p.expectedCadCents) ?? 0),
    0,
  );
  const unpriced = active.length - priced.length;

  const paused = plans.filter((p) => p.status === 'paused').length;
  const cancelled = plans.filter((p) => p.status === 'cancelled').length;

  const expected: CostExpectedItem[] = active
    .filter((p) => !charged.has(p.id) && planLandsInMonth(p, month))
    .map((p) => ({
      planId: p.id,
      name: p.name,
      vendor: p.vendor,
      category: p.category,
      categoryLabel: costCategoryLabel(p.category),
      categoryTone: costCategoryTone(p.category),
      expectedLabel:
        p.expectedCadCents === null
          ? 'amount varies'
          : `${cad(p.expectedCadCents)}${COST_CADENCE_SUFFIX[p.cadence]}`,
      expectedValue:
        p.expectedCadCents === null
          ? ''
          : formatAmountValue(p.expectedCadCents, 'CAD').replace(/,/g, ''),
      billingHint: billingHint(p),
    }));

  const catValues = categoryRows.map((r) => r.totalCadCents);
  const catWidths = scaleBars(catValues);
  const categories: CostBarRow[] = categoryRows.map((r, i) => ({
    key: r.category,
    label: costCategoryLabel(r.category),
    valueLabel: cad(r.totalCadCents),
    pct: catWidths[i],
    note: `${r.entries} ${r.entries === 1 ? 'charge' : 'charges'}`,
  }));

  const trendValues = months.map((m) => rollups.get(m)?.totalCadCents ?? 0);
  const trendWidths = scaleBars(trendValues);
  const trend: CostBarRow[] = months.map((m, i) => ({
    key: m,
    label: monthShortLabel(m),
    valueLabel:
      trendValues[i] > 0 ? formatAmountCompact(trendValues[i], 'CAD') : '—',
    pct: trendWidths[i],
    current: i === 0,
  }));

  // Months with activity, plus the selected and current ones so the switcher
  // can always reach where you already are.
  const optionMonths = [...new Set([...knownMonths, month, current])]
    // The selected month always survives, even if a ?month= deep link points
    // past today — the switcher's label must never name a month its own
    // dropdown can't show.
    .filter((m) => m <= current || m === month)
    .sort()
    .reverse()
    .slice(0, 24);

  return {
    month,
    monthLabel: monthLabel(month),
    monthOptions: optionMonths.map((m) => ({ value: m, label: monthLabel(m) })),
    currentMonth: current,
    entries: entries.map((e) => entryView(e, total)),
    expected,
    tiles: {
      totalLabel: total > 0 ? cad(total) : '—',
      totalReading:
        entries.length > 0
          ? `${entries.length} ${entries.length === 1 ? 'charge' : 'charges'}`
          : null,
      totalHint: deltaHint(total, prevTotal, monthLabel(prev)),
      runRateLabel: runRate > 0 ? cad(runRate) : '—',
      runRateReading:
        unpriced > 0
          ? `${priced.length} priced, ${unpriced} varies`
          : `${priced.length} active ${priced.length === 1 ? 'plan' : 'plans'}`,
      plansLabel: String(active.length),
      plansReading: [
        paused > 0 ? `${paused} paused` : null,
        cancelled > 0 ? `${cancelled} cancelled` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'all active',
      yearLabel: yearTotal > 0 ? cad(yearTotal) : '—',
      yearReading: `${year} so far`,
    },
    categories,
    trend,
    totalCadCents: total,
  };
}

/* -------------------------------------------------------------------------- */
/* Plans roster                                                               */
/* -------------------------------------------------------------------------- */

export type CostPlansView = {
  items: CostPlanItem[];
  /** The run-rate across active, priced plans — the roster's footer figure. */
  runRateLabel: string;
  runRateReading: string;
  /** The oldest month with any recorded charge — "tracked since June 2026". */
  trackedSinceLabel: string | null;
};

export async function buildCostPlansView(): Promise<CostPlansView> {
  // One query for every plan's charge count and newest month, rather than N —
  // on neon-http an N+1 here is one HTTPS round trip per plan.
  const [plans, stats, months] = await Promise.all([
    listCostPlans(),
    costPlanChargeStats(),
    listCostMonths(),
  ]);

  const items: CostPlanItem[] = plans.map((p) => {
    const stat = stats.get(p.id);
    const runRate = monthlyRunRateCents(p.cadence, p.expectedCadCents);
    return {
      id: p.id,
      name: p.name,
      vendor: p.vendor,
      category: p.category,
      categoryLabel: costCategoryLabel(p.category),
      categoryTone: costCategoryTone(p.category),
      cadence: p.cadence,
      cadenceSuffix: COST_CADENCE_SUFFIX[p.cadence],
      status: p.status,
      expectedValue:
        p.expectedCadCents === null
          ? ''
          : formatAmountValue(p.expectedCadCents, 'CAD').replace(/,/g, ''),
      expectedLabel:
        p.expectedCadCents === null
          ? 'Amount varies'
          : `${cad(p.expectedCadCents)}${COST_CADENCE_SUFFIX[p.cadence]}`,
      // A monthly plan would only repeat the line above.
      runRateLabel:
        p.cadence === 'monthly' || runRate === null ? null : `${cad(runRate)}/mo`,
      billingDay: p.billingDay === null ? '' : String(p.billingDay),
      billingHint: billingHint(p),
      startedOn: p.startedOn ?? '',
      endedOn: p.endedOn ?? '',
      note: p.note ?? '',
      charges: stat?.charges ?? 0,
      lastChargeLabel: stat?.lastMonth ? monthLabel(stat.lastMonth) : null,
    };
  });

  const active = plans.filter((p) => countsTowardRunRate(p.status));
  const priced = active.filter((p) => p.expectedCadCents !== null);
  const runRate = priced.reduce(
    (sum, p) => sum + (monthlyRunRateCents(p.cadence, p.expectedCadCents) ?? 0),
    0,
  );
  const unpriced = active.length - priced.length;

  return {
    items,
    runRateLabel: runRate > 0 ? cad(runRate) : '—',
    runRateReading:
      unpriced > 0
        ? `across ${priced.length} priced ${priced.length === 1 ? 'plan' : 'plans'}, ${unpriced} varies`
        : `across ${priced.length} active ${priced.length === 1 ? 'plan' : 'plans'}`,
    trackedSinceLabel:
      months.length > 0 ? monthLabel(months[months.length - 1]) : null,
  };
}

/**
 * What the entry dialog's plan picker needs — never the whole plan row.
 *
 * Its own reader rather than a projection of buildCostPlansView(): that
 * builder also fetches charge stats and the month list, which the month screen
 * has no use for, and on neon-http each of those is a separate HTTPS round
 * trip. listCostPlans() is cache()d, so the month view has already paid for
 * this one.
 *
 * Cancelled plans are excluded — a charge against something we have stopped
 * paying for is an edit to history, and history is edited from its own row.
 */
export async function buildPlanOptions(): Promise<CostPlanOption[]> {
  const plans = await listCostPlans();
  return plans
    .filter((p) => p.status !== 'cancelled')
    .map((p) => ({
      id: p.id,
      name: p.name,
      vendor: p.vendor,
      category: p.category,
      expectedValue:
        p.expectedCadCents === null
          ? ''
          : formatAmountValue(p.expectedCadCents, 'CAD').replace(/,/g, ''),
    }));
}
