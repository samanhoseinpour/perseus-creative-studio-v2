import 'server-only';

import {
  adminGetMember,
  adminGetRun,
  adminListMemberPayments,
  adminListMonthPayments,
  adminMonthRollups,
  listMemberTerms,
  memberPayYears,
  memberYearTotals,
  ownGetMember,
  ownGetPayment,
  ownListPayments,
  ownListTerms,
  seedCandidates,
  type AdminPaymentRow,
  type OwnPaymentRow,
  type PayrollMemberRow,
  type PayrollTermRow,
} from '@/db/payrollQueries';
import {
  averageMinor,
  CURRENCIES,
  effectiveRateMicro,
  formatAmount,
  formatAmountCompact,
  formatPercent,
  formatRate,
  growthSplit,
  RATE_SCALE,
  type GrowthPoint,
  type PayrollCurrency,
} from '@/lib/payrollAmounts';
import { countsAsSpend, type PayrollPaymentStatus } from '@/lib/payrollStatus';
import { monthToken, shiftMonthToken } from '@/lib/taskFilters';

import {
  dayLabel,
  humanizeProrationNote,
  maybeStamp,
  monthLabel,
  monthShortLabel,
} from './format';
import type { GrowthSplitProps, PayrollTrendRow } from './PayrollSections';

/**
 * Turns payroll query rows into fully pre-formatted view props — the
 * reportData.ts contract. Every number leaves here as a STRING, so client
 * components do no money math and no date math (hydration-safe), and the printed
 * payslip shows byte-identical figures to the dashboard.
 *
 * Two audiences, two builders. `buildOwnPayView` reads exclusively through the
 * `own*` queries, which project away cost, fees, wire refs, and internal notes;
 * it never receives an AdminPaymentRow, so there is no wide object in scope that
 * a careless spread could serialize into a member's page.
 */

export const TREND_MONTHS = 12;

/** The trailing N calendar months ending at `month`, NEWEST first. */
function trailingMonths(month: string, count = TREND_MONTHS): string[] {
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

function partialLabel(
  proratedDays: number | null,
  monthDays: number | null,
): string | undefined {
  if (!proratedDays || !monthDays) return undefined;
  return `${proratedDays} of ${monthDays} days`;
}

/* -------------------------------------------------------------------------- */
/* Shared chart shapes                                                        */
/* -------------------------------------------------------------------------- */

export type PayChart = {
  /** OLDEST first — a column chart reads left to right, unlike the bar strip. */
  columns: PayrollTrendRow[];
  currencyLabel: string;
  /** Where to rule the dashed mean, 0-100 on the same scale as the columns. */
  averagePct: number | null;
  averageLabel: string | null;
};

/**
 * Turns the trailing-N month series both builders already compute into a column
 * chart. `months`/`values` arrive newest-first (trailingMonths order) and come
 * out oldest-first; the average is taken over months that were actually PAID, so
 * a member who joined in July isn't averaged against four months of zero.
 */
function buildPayChart(
  months: string[],
  values: number[],
  currency: PayrollCurrency,
  byMonth: Map<string, { proratedDays: number | null; monthDays: number | null }>,
): PayChart {
  const widths = scaleBars(values);
  const max = Math.max(0, ...values);
  const average = averageMinor(values.filter((v) => v > 0));

  const columns: PayrollTrendRow[] = months.map((m, i) => {
    const row = byMonth.get(m);
    return {
      month: m,
      label: monthShortLabel(m),
      valueLabel:
        values[i] > 0 ? formatAmountCompact(values[i], currency) : '—',
      pct: widths[i],
      current: i === 0,
      partialLabel: row
        ? partialLabel(row.proratedDays, row.monthDays)
        : undefined,
    };
  });

  return {
    columns: columns.reverse(),
    currencyLabel: CURRENCIES[currency].label,
    // Linear on the same axis as the bars — deliberately NOT through scaleBars,
    // whose 2% floor would lift a near-zero mean off the baseline and overstate it.
    averagePct:
      average !== null && max > 0 ? Math.round((average / max) * 100) : null,
    averageLabel:
      average !== null ? formatAmountCompact(average, currency) : null,
  };
}

export type SalaryStep = {
  key: string;
  /** When this figure took effect. */
  label: string;
  amountLabel: string;
  /** 0-100, scaled to the largest term. */
  pct: number;
  /** Change vs the step before it; null for the first. */
  changeLabel: string | null;
};

export type SalaryTrack = {
  /** OLDEST first, so the steps climb left to right. */
  steps: SalaryStep[];
  currencyLabel: string;
  /**
   * False when the terms span more than one anchor currency: two currencies
   * share no axis, so the caller falls back to the plain list. Also false with
   * nothing to draw.
   */
  chartable: boolean;
  /** '2 raises' — null when nothing ever moved. */
  raisesLabel: string | null;
};

/** The standing-salary history as a step series. Accepts own* or admin* terms. */
function buildSalaryTrack(
  terms: {
    effectiveFrom: string;
    anchorCurrency: PayrollCurrency;
    anchorAmount: number;
  }[],
): SalaryTrack {
  // Terms arrive newest-first from both queries.
  const ordered = [...terms].reverse();
  const currency = ordered[0]?.anchorCurrency ?? 'IRT';
  const singleCurrency = ordered.every((t) => t.anchorCurrency === currency);
  const widths = scaleBars(ordered.map((t) => t.anchorAmount));

  const steps: SalaryStep[] = ordered.map((t, i) => {
    const before = ordered[i - 1];
    const comparable = before && before.anchorCurrency === t.anchorCurrency;
    return {
      key: t.effectiveFrom,
      label: dayLabel(t.effectiveFrom),
      amountLabel: formatAmount(t.anchorAmount, t.anchorCurrency),
      pct: widths[i],
      changeLabel:
        comparable && before.anchorAmount > 0
          ? formatPercent(
              ((t.anchorAmount - before.anchorAmount) / before.anchorAmount) *
                100,
            )
          : null,
    };
  });

  const raises = ordered.filter(
    (t, i) =>
      i > 0 &&
      ordered[i - 1].anchorCurrency === t.anchorCurrency &&
      t.anchorAmount > ordered[i - 1].anchorAmount,
  ).length;

  return {
    steps,
    currencyLabel: CURRENCIES[currency].label,
    chartable: singleCurrency && steps.length > 0,
    raisesLabel: raises === 0 ? null : raises === 1 ? '1 raise' : `${raises} raises`,
  };
}

/* -------------------------------------------------------------------------- */
/* Member self-view                                                           */
/* -------------------------------------------------------------------------- */

export type OwnMonthDetail = {
  paymentId: string;
  month: string;
  monthLabel: string;
  status: PayrollPaymentStatus;
  /** What landed, e.g. '184,800,000 toman'. */
  paidLabel: string;
  /** Their contractual figure, e.g. 'CAD 1,400.00'. */
  anchorLabel: string;
  /** Null when the anchor and payout currency match (no conversion happened). */
  rateLabel: string | null;
  /** '13 of 31 days · joined Jul 19, 2026' — only for a partial month. */
  prorationLabel: string | null;
  sentLabel: string | null;
  receivedLabel: string | null;
  flagNote: string | null;
  /** Which actions the owner can take right now. */
  canConfirm: boolean;
  canFlag: boolean;
  /**
   * This month's payslip. The route re-derives the audience from the session via
   * requirePayrollAccess(), so a member following their own link gets the member
   * projection — the id in the URL grants nothing.
   */
  payslipHref: string;
};

export type OwnPayView = {
  memberName: string;
  payCurrencyLabel: string;
  /** The newest month with a record, or null when there is nothing yet. */
  current: OwnMonthDetail | null;
  growth: Omit<GrowthSplitProps, 'tone'> | null;
  chart: PayChart;
  salary: SalaryTrack;
  /** The SELECTED year's months, newest first. */
  history: OwnMonthDetail[];
  year: {
    year: number;
    years: number[];
    paidLabel: string | null;
    anchorLabel: string | null;
    monthsLabel: string;
  };
  /** Every month ever paid, across years and currencies. */
  allTime: { paidLabel: string | null; monthsLabel: string };
  /** The standing figure in force now — the newest term. */
  salaryNow: { amountLabel: string; sinceLabel: string } | null;
  terms: { effectiveFrom: string; label: string; amountLabel: string }[];
};

function toOwnDetail(row: OwnPaymentRow, memberId: string): OwnMonthDetail {
  const prorationBits = [
    partialLabel(row.proratedDays, row.monthDays),
    humanizeProrationNote(row.prorationNote),
  ].filter(Boolean);

  return {
    paymentId: row.id,
    month: row.month,
    monthLabel: monthLabel(row.month),
    status: row.status,
    paidLabel: formatAmount(row.paidAmount, row.paidCurrency),
    anchorLabel: formatAmount(row.anchorAmount, row.anchorCurrency),
    rateLabel: row.rateMicro
      ? `${formatRate(row.rateMicro)} toman per CAD`
      : null,
    prorationLabel: prorationBits.length > 0 ? prorationBits.join(' · ') : null,
    sentLabel: maybeStamp(row.sentAt),
    receivedLabel: maybeStamp(row.receivedAt),
    flagNote: row.memberNote,
    // Mirrors availableTransitions() for the member actor; the action re-checks
    // server-side regardless of what the UI offered.
    canConfirm: row.status === 'sent' || row.status === 'flagged',
    canFlag: row.status === 'sent',
    payslipHref: `/admin/payroll/payslip/${memberId}/${row.month}`,
  };
}

function toGrowthPoint(row: OwnPaymentRow): GrowthPoint {
  return {
    anchorMinor: row.anchorAmount,
    anchorCurrency: row.anchorCurrency,
    paidMinor: row.paidAmount,
    rateMicro: row.rateMicro,
    partial: Boolean(row.proratedDays && row.monthDays),
  };
}

export async function buildOwnPayView(
  memberId: string,
  requestedYear?: number,
): Promise<OwnPayView | null> {
  // own* on every read: the member row and the term history are projected too,
  // so the admin's private notes about this person and the name of whoever set
  // their salary are never fetched onto their own page — not merely unread.
  const [member, rows, terms] = await Promise.all([
    ownGetMember(memberId),
    ownListPayments(memberId),
    ownListTerms(memberId),
  ]);
  if (!member) return null;

  const paid = rows.filter((r) => r.status !== 'void');
  const current = paid[0] ?? null;
  const previous = paid[1] ?? null;

  // Compare against the immediately preceding month only when it really is the
  // preceding month — a gap would make "vs last month" a lie.
  const contiguous =
    current && previous && shiftMonthToken(current.month, -1) === previous.month
      ? previous
      : null;

  const split = growthSplit(
    contiguous ? toGrowthPoint(contiguous) : null,
    current ? toGrowthPoint(current) : null,
  );

  const months = current ? trailingMonths(current.month) : [];
  const byMonth = new Map(paid.map((r) => [r.month, r]));
  const values = months.map((m) => byMonth.get(m)?.paidAmount ?? 0);

  const years = await memberPayYears(memberId);
  const year =
    requestedYear && years.includes(requestedYear)
      ? requestedYear
      : (years[0] ?? Number(monthToken().slice(0, 4)));
  const totals = await memberYearTotals(memberId, year);

  const payCurrency = member.payCurrency;

  // All-time, straight off the rows already in hand — no extra query.
  const allTimeByCurrency: Partial<Record<PayrollCurrency, number>> = {};
  for (const r of paid) {
    allTimeByCurrency[r.paidCurrency] =
      (allTimeByCurrency[r.paidCurrency] ?? 0) + r.paidAmount;
  }

  return {
    memberName: member.displayName,
    payCurrencyLabel: CURRENCIES[payCurrency].label,
    current: current ? toOwnDetail(current, memberId) : null,
    growth: contiguous
      ? {
          againstLabel: `vs ${monthLabel(contiguous.month)}`,
          paidPctLabel:
            split.paidPct === null ? null : formatPercent(split.paidPct),
          anchorPctLabel:
            split.anchorPct === null ? null : formatPercent(split.anchorPct),
          ratePctLabel:
            split.ratePct === null ? null : formatPercent(split.ratePct),
          currencyLabel: CURRENCIES[payCurrency].label,
          exact: split.exact,
          partial: split.partial,
        }
      : null,
    // The chart and the growth split always describe the NEWEST month; only the
    // list and the year tile below follow the year chips.
    chart: buildPayChart(months, values, payCurrency, byMonth),
    salary: buildSalaryTrack(terms),
    history: paid
      .filter((r) => r.month.startsWith(String(year)))
      .map((r) => toOwnDetail(r, memberId)),
    year: {
      year,
      years,
      paidLabel: summarizeByCurrency(totals.paidByCurrency),
      anchorLabel: summarizeByCurrency(totals.anchorByCurrency),
      monthsLabel:
        totals.months === 1 ? '1 month' : `${totals.months} months`,
    },
    allTime: {
      paidLabel: summarizeByCurrency(allTimeByCurrency),
      monthsLabel: paid.length === 1 ? '1 month' : `${paid.length} months`,
    },
    salaryNow: terms[0]
      ? {
          amountLabel: formatAmount(terms[0].anchorAmount, terms[0].anchorCurrency),
          sinceLabel: `since ${dayLabel(terms[0].effectiveFrom)}`,
        }
      : null,
    terms: terms.map((t) => ({
      effectiveFrom: t.effectiveFrom,
      label: `From ${dayLabel(t.effectiveFrom)}`,
      amountLabel: formatAmount(t.anchorAmount, t.anchorCurrency),
    })),
  };
}

/** 'CAD 12,600.00 + 1,570,000,000 toman' when a member switched mid-year. */
function summarizeByCurrency(
  totals: Partial<Record<PayrollCurrency, number>>,
): string | null {
  const parts = (Object.keys(totals) as PayrollCurrency[])
    .filter((c) => (totals[c] ?? 0) > 0)
    .map((c) => formatAmount(totals[c]!, c));
  return parts.length > 0 ? parts.join(' + ') : null;
}

/* -------------------------------------------------------------------------- */
/* Admin month screen                                                         */
/* -------------------------------------------------------------------------- */

export type AdminLineView = {
  paymentId: string;
  memberId: string;
  memberName: string;
  month: string;
  monthLabel: string;
  status: PayrollPaymentStatus;
  anchorCurrency: PayrollCurrency;
  paidCurrency: PayrollCurrency;
  /** Raw minor units — the inline editor needs numbers, not labels. */
  anchorAmount: number;
  paidAmount: number;
  lineRateMicro: number | null;
  feeCadCents: number;
  proratedDays: number | null;
  monthDays: number | null;
  prorationNote: string | null;
  wireRef: string | null;
  adminNote: string | null;
  /** Pre-formatted for the read-only cells. */
  anchorLabel: string;
  paidLabel: string;
  costLabel: string;
  feeLabel: string;
  effectiveRateLabel: string | null;
  prorationLabel: string | null;
  sentLabel: string | null;
  receivedLabel: string | null;
  memberNote: string | null;
};

export type AdminMonthView = {
  month: string;
  monthLabel: string;
  monthOptions: { value: string; label: string }[];
  currentMonth: string;
  run: {
    exists: boolean;
    rateMicro: number | null;
    rateLabel: string | null;
    invoiceRef: string | null;
    note: string | null;
    sentLabel: string | null;
    sentByName: string | null;
  };
  lines: AdminLineView[];
  /** Members eligible for the month with no line yet — the "add" affordance. */
  missing: { memberId: string; memberName: string; reason: string }[];
  tiles: {
    salaryLabel: string;
    salaryHint: string | null;
    feeLabel: string;
    headcountLabel: string;
    rateLabel: string;
    rateHint: string | null;
    confirmedLabel: string;
    confirmedHint: string;
  };
  /** Rate-move impact, split by who actually absorbs it. */
  rateImpact: {
    cadAnchoredLabel: string | null;
    tomanAnchoredLabel: string | null;
  } | null;
  trend: PayrollTrendRow[];
  progress: { draft: number; sent: number; received: number; flagged: number; void: number };
};

function lineView(row: AdminPaymentRow, runRate: number | null): AdminLineView {
  const rate = row.rateMicro ?? runRate;
  const effective = effectiveRateMicro(
    row.anchorAmount,
    row.anchorCurrency,
    row.paidAmount,
    row.paidCurrency,
  );
  const prorationBits = [
    partialLabel(row.proratedDays, row.monthDays),
    humanizeProrationNote(row.prorationNote),
  ].filter(Boolean);

  return {
    paymentId: row.id,
    memberId: row.memberId,
    memberName: row.memberName,
    month: row.month,
    monthLabel: monthLabel(row.month),
    status: row.status,
    anchorCurrency: row.anchorCurrency,
    paidCurrency: row.paidCurrency,
    anchorAmount: row.anchorAmount,
    paidAmount: row.paidAmount,
    lineRateMicro: row.rateMicro,
    feeCadCents: row.feeCadCents,
    proratedDays: row.proratedDays,
    monthDays: row.monthDays,
    prorationNote: row.prorationNote,
    wireRef: row.wireRef,
    adminNote: row.adminNote,
    anchorLabel: formatAmount(row.anchorAmount, row.anchorCurrency),
    paidLabel:
      row.paidAmount > 0
        ? formatAmount(row.paidAmount, row.paidCurrency)
        : '—',
    costLabel: formatAmount(row.costCadCents, 'CAD'),
    feeLabel: row.feeCadCents > 0 ? formatAmount(row.feeCadCents, 'CAD') : '—',
    effectiveRateLabel: effective
      ? `${formatRate(effective)} /CAD`
      : rate && row.anchorCurrency !== row.paidCurrency
        ? `${formatRate(rate)} /CAD`
        : null,
    prorationLabel: prorationBits.length > 0 ? prorationBits.join(' · ') : null,
    sentLabel: maybeStamp(row.sentAt),
    receivedLabel: maybeStamp(row.receivedAt),
    memberNote: row.memberNote,
  };
}

export async function buildAdminMonthView(
  month: string,
): Promise<AdminMonthView> {
  const current = monthToken();
  const months = trailingMonths(month, TREND_MONTHS);

  const [run, rows, rollups, candidates] = await Promise.all([
    adminGetRun(month),
    adminListMonthPayments(month),
    adminMonthRollups([...months, shiftMonthToken(month, -1)]),
    seedCandidates(month),
  ]);

  const runRate = run?.rateMicro ?? null;
  const lines = rows.map((r) => lineView(r, runRate));
  const have = new Set(rows.map((r) => r.memberId));
  const missing = candidates
    .filter((c) => !have.has(c.member.id))
    .map((c) => ({
      memberId: c.member.id,
      memberName: c.member.displayName,
      reason: !c.basis
        ? 'not on the payroll this month'
        : !c.term
          ? 'no standing salary set'
          : 'not added yet',
    }));

  const here = rollups.get(month);
  const prevMonth = shiftMonthToken(month, -1);
  const prev = rollups.get(prevMonth);

  const salary = here?.costCadCents ?? 0;
  const prevSalary = prev?.costCadCents ?? 0;
  const spendLines = rows.filter((r) => countsAsSpend(r.status));

  const values = months.map((m) => rollups.get(m)?.costCadCents ?? 0);
  const widths = scaleBars(values);
  const trend: PayrollTrendRow[] = months.map((m, i) => ({
    month: m,
    label: monthShortLabel(m),
    valueLabel: values[i] > 0 ? formatAmountCompact(values[i], 'CAD') : '—',
    pct: widths[i],
    current: i === 0,
  }));

  return {
    month,
    monthLabel: monthLabel(month),
    monthOptions: months.map((m) => ({ value: m, label: monthLabel(m) })),
    currentMonth: current,
    run: {
      exists: Boolean(run),
      rateMicro: runRate,
      rateLabel: runRate ? formatRate(runRate) : null,
      invoiceRef: run?.invoiceRef ?? null,
      note: run?.note ?? null,
      sentLabel: maybeStamp(run?.sentAt ?? null),
      sentByName: run?.sentByName ?? null,
    },
    lines,
    missing,
    tiles: {
      salaryLabel: salary > 0 ? formatAmount(salary, 'CAD') : '—',
      salaryHint: deltaHint(salary, prevSalary, monthLabel(prevMonth)),
      feeLabel:
        (here?.feeCadCents ?? 0) > 0
          ? formatAmount(here!.feeCadCents, 'CAD')
          : '—',
      headcountLabel: String(spendLines.length),
      rateLabel: runRate ? formatRate(runRate) : '—',
      rateHint: ratePctHint(runRate, prev?.rateMicro ?? null, monthLabel(prevMonth)),
      confirmedLabel: `${here?.counts.received ?? 0} of ${spendLines.length}`,
      confirmedHint:
        (here?.counts.flagged ?? 0) > 0
          ? `${here!.counts.flagged} flagged`
          : 'receipts confirmed',
    },
    rateImpact: buildRateImpact(rows, runRate, prev?.rateMicro ?? null),
    trend,
    progress: here?.counts ?? {
      draft: 0,
      sent: 0,
      received: 0,
      flagged: 0,
      void: 0,
    },
  };
}

function deltaHint(
  now: number,
  before: number,
  prevLabel: string,
): string | null {
  if (before === 0) return null;
  if (now === before) return `same as ${prevLabel}`;
  const pct = ((now - before) / before) * 100;
  return `${formatPercent(pct)} vs ${prevLabel}`;
}

function ratePctHint(
  now: number | null,
  before: number | null,
  prevLabel: string,
): string | null {
  if (!now || !before) return null;
  const pct = ((now - before) / before) * 100;
  return `${formatPercent(pct, 2)} vs ${prevLabel}`;
}

/**
 * What the month's rate move actually did — and to WHOM. The two effects run in
 * opposite directions and must never be added together:
 *
 *  - CAD-anchored members: a stronger CAD means MORE toman for them at no extra
 *    cost to the company.
 *  - toman-anchored members: the same move makes their fixed toman CHEAPER for
 *    the company, and changes nothing for them.
 */
function buildRateImpact(
  rows: AdminPaymentRow[],
  rate: number | null,
  prevRate: number | null,
): AdminMonthView['rateImpact'] {
  if (!rate || !prevRate || rate === prevRate) return null;

  let cadAnchoredTomanDelta = 0;
  let tomanAnchoredCadDelta = 0;
  for (const row of rows) {
    if (!countsAsSpend(row.status)) continue;
    if (row.anchorCurrency === 'CAD' && row.paidCurrency === 'IRT') {
      const atPrev = (row.anchorAmount * prevRate) / (100 * RATE_SCALE);
      cadAnchoredTomanDelta += row.paidAmount - atPrev;
    } else if (row.anchorCurrency === 'IRT') {
      const atPrev = (row.anchorAmount * 100 * RATE_SCALE) / prevRate;
      tomanAnchoredCadDelta += row.costCadCents - atPrev;
    }
  }

  const sign = (n: number) => (n > 0 ? '+' : '−');
  return {
    cadAnchoredLabel:
      Math.abs(cadAnchoredTomanDelta) >= 1
        ? `${sign(cadAnchoredTomanDelta)}${formatAmountCompact(Math.round(Math.abs(cadAnchoredTomanDelta)), 'IRT')} for CAD-anchored members`
        : null,
    tomanAnchoredLabel:
      Math.abs(tomanAnchoredCadDelta) >= 100
        ? `${sign(tomanAnchoredCadDelta)}${formatAmount(Math.round(Math.abs(tomanAnchoredCadDelta)), 'CAD')} company cost for toman-anchored members`
        : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Admin member detail                                                        */
/* -------------------------------------------------------------------------- */

export type AdminMemberView = {
  member: PayrollMemberRow;
  joinedLabel: string | null;
  endedLabel: string | null;
  terms: (PayrollTermRow & { fromLabel: string; amountLabel: string })[];
  history: AdminLineView[];
  /** The same two visuals the member sees on /admin/my-pay, same figures. */
  chart: PayChart;
  salary: SalaryTrack;
  totals: { yearLabel: string; paidLabel: string | null; costLabel: string }[];
};

export async function buildAdminMemberView(
  memberId: string,
): Promise<AdminMemberView | null> {
  const [member, terms, history] = await Promise.all([
    adminGetMember(memberId),
    listMemberTerms(memberId),
    adminListMemberPayments(memberId),
  ]);
  if (!member) return null;

  const lines = history.map((r) => lineView(r, r.rateMicro));
  const anchorMonth = history[0]?.month ?? monthToken();
  const months = trailingMonths(anchorMonth);
  const byMonth = new Map(history.map((r) => [r.month, r]));
  const values = months.map((m) => {
    const row = byMonth.get(m);
    return row && countsAsSpend(row.status) ? row.paidAmount : 0;
  });

  const years = [...new Set(history.map((r) => r.month.slice(0, 4)))].sort(
    (a, b) => Number(b) - Number(a),
  );
  const totals = years.map((y) => {
    const rows = history.filter(
      (r) => r.month.startsWith(y) && countsAsSpend(r.status),
    );
    const paidByCurrency: Partial<Record<PayrollCurrency, number>> = {};
    let cost = 0;
    for (const r of rows) {
      paidByCurrency[r.paidCurrency] =
        (paidByCurrency[r.paidCurrency] ?? 0) + r.paidAmount;
      cost += r.costCadCents;
    }
    return {
      yearLabel: y,
      paidLabel: summarizeByCurrency(paidByCurrency),
      costLabel: formatAmount(cost, 'CAD'),
    };
  });

  return {
    member,
    joinedLabel: member.joinedOn ? dayLabel(member.joinedOn) : null,
    endedLabel: member.endedOn ? dayLabel(member.endedOn) : null,
    terms: terms.map((t) => ({
      ...t,
      fromLabel: dayLabel(t.effectiveFrom),
      amountLabel: formatAmount(t.anchorAmount, t.anchorCurrency),
    })),
    history: lines,
    chart: buildPayChart(months, values, member.payCurrency, byMonth),
    salary: buildSalaryTrack(terms),
    totals,
  };
}

/* -------------------------------------------------------------------------- */
/* Payslip                                                                    */
/* -------------------------------------------------------------------------- */

export type PayslipView = {
  memberName: string;
  monthLabel: string;
  month: string;
  status: PayrollPaymentStatus;
  rows: { label: string; value: string; note?: string }[];
  growth: Omit<GrowthSplitProps, 'tone'> | null;
  flagNote: string | null;
  /** Admin-only extras; empty for a member's own copy. */
  internalRows: { label: string; value: string }[];
};

/**
 * One member, one month. `audience` decides the projection, and the read path
 * differs with it: a member's own slip is built from the `own*` query so the
 * admin-only columns are never even fetched.
 */
export async function buildPayslip(
  memberId: string,
  month: string,
  audience: 'admin' | 'member',
): Promise<PayslipView | null> {
  // The audience picks the member projection too, not just the payment one — an
  // admin's private notes about someone must not be fetched to render that
  // person's own payslip.
  const member =
    audience === 'member'
      ? await ownGetMember(memberId)
      : await adminGetMember(memberId);
  if (!member) return null;

  if (audience === 'member') {
    const [row, prevRow] = await Promise.all([
      ownGetPayment(memberId, month),
      ownGetPayment(memberId, shiftMonthToken(month, -1)),
    ]);
    if (!row) return null;
    const detail = toOwnDetail(row, memberId);
    const split = growthSplit(
      prevRow ? toGrowthPoint(prevRow) : null,
      toGrowthPoint(row),
    );
    return {
      memberName: member.displayName,
      monthLabel: detail.monthLabel,
      month,
      status: row.status,
      rows: slipRows(detail),
      growth: prevRow
        ? {
            againstLabel: `vs ${monthLabel(prevRow.month)}`,
            paidPctLabel:
              split.paidPct === null ? null : formatPercent(split.paidPct),
            anchorPctLabel:
              split.anchorPct === null ? null : formatPercent(split.anchorPct),
            ratePctLabel:
              split.ratePct === null ? null : formatPercent(split.ratePct),
            currencyLabel: CURRENCIES[row.paidCurrency].label,
            exact: split.exact,
            partial: split.partial,
          }
        : null,
      flagNote: row.memberNote,
      internalRows: [],
    };
  }

  const history = await adminListMemberPayments(memberId);
  const row = history.find((r) => r.month === month);
  if (!row) return null;
  const run = await adminGetRun(month);
  const view = lineView(row, run?.rateMicro ?? null);

  return {
    memberName: member.displayName,
    monthLabel: monthLabel(month),
    month,
    status: row.status,
    rows: [
      { label: 'Amount received', value: view.paidLabel },
      {
        label: 'Salary figure',
        value: view.anchorLabel,
        note: view.prorationLabel ?? undefined,
      },
      ...(view.effectiveRateLabel
        ? [{ label: 'Exchange rate applied', value: view.effectiveRateLabel }]
        : []),
      ...(view.sentLabel ? [{ label: 'Sent', value: view.sentLabel }] : []),
      ...(view.receivedLabel
        ? [{ label: 'Confirmed received', value: view.receivedLabel }]
        : []),
    ],
    growth: null,
    flagNote: row.memberNote,
    internalRows: [
      { label: 'Company cost (CAD)', value: view.costLabel },
      { label: 'Wire fee (CAD)', value: view.feeLabel },
      { label: 'Wire reference', value: row.wireRef ?? '—' },
      { label: 'Invoice reference', value: run?.invoiceRef ?? '—' },
    ],
  };
}

function slipRows(detail: OwnMonthDetail) {
  return [
    { label: 'Amount received', value: detail.paidLabel },
    {
      label: 'Salary figure',
      value: detail.anchorLabel,
      note: detail.prorationLabel ?? undefined,
    },
    ...(detail.rateLabel
      ? [{ label: 'Exchange rate applied', value: detail.rateLabel }]
      : []),
    ...(detail.sentLabel ? [{ label: 'Sent', value: detail.sentLabel }] : []),
    ...(detail.receivedLabel
      ? [{ label: 'Confirmed received', value: detail.receivedLabel }]
      : []),
  ];
}
