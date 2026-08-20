/**
 * The one payroll money door — parsing, formatting, conversion, proration, and
 * growth math. Deliberately a zero-dependency, client-safe leaf (the same split
 * as taskFields.ts / adminAreas.ts): the admin entry dialog and the member
 * self-view both need it, while the authorization gates and queries that
 * consume it live in `server-only` modules.
 *
 * INVARIANT: every amount crossing this module's boundary is an INTEGER in
 * minor units of a known currency — cents for CAD, whole toman for IRT. There
 * is no float money anywhere in the payroll feature, and no decimal library in
 * the repo. Parse at the edge, format at the edge, do integer math in between.
 *
 * The rate is toman-per-CAD scaled by RATE_SCALE (1e6), so 131,999.260804
 * round-trips exactly as 131999260804 — comfortably inside 2^53, which is why
 * the bigint columns use `mode: 'number'`.
 */

import { daysBetweenDayKeys, shiftDayKey } from '@/lib/calendar';

export type PayrollCurrency = 'CAD' | 'IRT';

export const PAYROLL_CURRENCIES = ['CAD', 'IRT'] as const;

export function isPayrollCurrency(value: unknown): value is PayrollCurrency {
  return value === 'CAD' || value === 'IRT';
}

type CurrencyMeta = {
  /** Minor units per major unit — 100 cents per CAD, 1 toman per toman. */
  minorPerUnit: number;
  decimals: number;
  /** Short label used after the number ("CAD 1,400.00" / "184,800,000 toman"). */
  label: string;
  /**
   * Granularity the exchange DELIVERS on, in minor units. Measured, not
   * guessed: at 5,000 toman every line of both sample invoices reproduces
   * exactly (75,215,000 / 85,700,000 / 110,970,000 / 64,020,000 / 184,800,000 /
   * 55,440,000), while 10,000 misses two of them.
   */
  roundTo: number;
  /**
   * Granularity a PRORATED salary is rounded to. Coarser than delivery, and a
   * separate number because it is a different actor's decision: the exchange
   * rounds what it wires, Perseus rounds what it owes. Mahdi NP's first month
   * (35,000,000 x 13/31 = 14,677,419) was paid as 14,680,000 — a 10,000
   * multiple; 5,000 would have produced 14,675,000.
   */
  prorationRoundTo: number;
  /**
   * Sanity ceiling in minor units — not a business rule, a fat-finger guard.
   * Typing a toman figure into the CAD field (35000000 -> $350,000/month) is the
   * realistic mistake this catches, and it is silent without a cap.
   */
  maxMinor: number;
};

export const CURRENCIES: Record<PayrollCurrency, CurrencyMeta> = {
  CAD: {
    minorPerUnit: 100,
    decimals: 2,
    label: 'CAD',
    roundTo: 1,
    prorationRoundTo: 1,
    maxMinor: 5_000_000, // CAD 50,000 / month
  },
  IRT: {
    minorPerUnit: 1,
    decimals: 0,
    label: 'toman',
    roundTo: 5_000,
    prorationRoundTo: 10_000,
    maxMinor: 10_000_000_000, // 10 billion toman / month
  },
};

/** Within the currency's fat-finger guard, and positive. */
export function isAmountInRange(
  minor: number,
  currency: PayrollCurrency,
): boolean {
  return (
    Number.isSafeInteger(minor) &&
    minor > 0 &&
    minor <= CURRENCIES[currency].maxMinor
  );
}

/** Human-readable ceiling for a validation message. */
export function maxAmountLabel(currency: PayrollCurrency): string {
  return formatAmount(CURRENCIES[currency].maxMinor, currency);
}

/** Rate fixed-point scale. rateMicro = tomanPerCad * RATE_SCALE. */
export const RATE_SCALE = 1_000_000;

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

// Persian (۰-۹) and Arabic-Indic (٠-٩) digits, plus the Arabic thousands
// separator — these figures get pasted out of Iranian banking apps and Telegram
// messages, and a silent parse failure on "۱۸۴٬۸۰۰٬۰۰۰" would be a bad day.
const EASTERN_DIGITS = /[۰-۹٠-٩]/g;

function asciiDigits(raw: string): string {
  return raw.replace(EASTERN_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Strip grouping separators and whitespace, keep digits / sign / one dot. */
function normalizeNumeric(raw: string): string {
  return asciiDigits(raw)
    .replace(/[٬,  \s'_]/g, '')
    .replace(/٫/g, '.')
    .trim();
}

const NUMERIC_RE = /^-?\d*\.?\d*$/;

/**
 * Parse a typed amount into minor units, or null when unusable. Accepts
 * "1400", "1,400.50", "184,800,000", "۳۵٬۰۰۰٬۰۰۰". Rejects negatives: pay is
 * never negative, and a stray minus should surface as a validation error rather
 * than quietly invert a salary.
 */
export function parseAmount(
  raw: string,
  currency: PayrollCurrency,
): number | null {
  const cleaned = normalizeNumeric(raw);
  if (cleaned === '' || cleaned === '.' || !NUMERIC_RE.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  const minor = Math.round(value * CURRENCIES[currency].minorPerUnit);
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * Parse a typed exchange rate (toman per CAD) into rateMicro, or null. Accepts
 * "132000", "131,999.260804", "۱۳۲۰۰۰". Zero is rejected — it would silently
 * zero out every converted amount.
 */
export function parseRate(raw: string): number | null {
  const cleaned = normalizeNumeric(raw);
  if (cleaned === '' || cleaned === '.' || !NUMERIC_RE.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const micro = Math.round(value * RATE_SCALE);
  return Number.isSafeInteger(micro) && micro > 0 ? micro : null;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

// Fixed locale, server and client alike — the inbox/format.ts hydration rule.
const GROUPED = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });
const CAD_DECIMAL = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Bare grouped number, no currency label: "1,400.00" / "184,800,000". */
export function formatAmountValue(
  minor: number,
  currency: PayrollCurrency,
): string {
  const meta = CURRENCIES[currency];
  if (meta.decimals === 0) return GROUPED.format(minor / meta.minorPerUnit);
  return CAD_DECIMAL.format(minor / meta.minorPerUnit);
}

/** Labelled amount: "CAD 1,400.00" / "184,800,000 toman". */
export function formatAmount(
  minor: number,
  currency: PayrollCurrency,
): string {
  const value = formatAmountValue(minor, currency);
  return currency === 'CAD' ? `CAD ${value}` : `${value} toman`;
}

/** Compact labelled amount for tight cells: "$1,400.00" / "184.8M toman". */
export function formatAmountCompact(
  minor: number,
  currency: PayrollCurrency,
): string {
  if (currency === 'CAD') return `$${formatAmountValue(minor, 'CAD')}`;
  if (minor >= 1_000_000) {
    const millions = minor / 1_000_000;
    const digits = millions >= 100 ? 1 : 2;
    return `${Number(millions.toFixed(digits))}M toman`;
  }
  return `${GROUPED.format(minor)} toman`;
}

const RATE_DECIMAL = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

/** "131,999.9926" — the rate as toman per CAD. */
export function formatRate(rateMicro: number): string {
  return RATE_DECIMAL.format(rateMicro / RATE_SCALE);
}

/** Signed percentage for the growth cards: "+66.5%" / "-3.2%" / "0.0%". */
export function formatPercent(pct: number, digits = 1): string {
  const rounded = Number(pct.toFixed(digits));
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(digits)}%`;
}

/**
 * The mean of same-currency minor units, rounded to a whole minor unit. Null for
 * an empty list, so callers render "—" rather than a zero that reads as "you
 * were paid nothing on average".
 *
 * Lives here rather than in a view-model because it is money arithmetic, and
 * this file is the single door for that. Deliberately does NOT round to delivery
 * granularity: an average is a reading of history, not an amount anyone wires,
 * and snapping it to the nearest 5,000 toman would misstate the mean.
 */
export function averageMinor(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round(total / values.length);
}

/* -------------------------------------------------------------------------- */
/* Conversion                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Round `minor` to a currency's granularity. 'delivery' is what the exchange
 * wires; 'proration' is the coarser step used when reducing a standing salary to
 * a partial month. See CurrencyMeta for why they differ.
 */
export function roundToGranularity(
  minor: number,
  currency: PayrollCurrency,
  mode: 'delivery' | 'proration' = 'delivery',
): number {
  const meta = CURRENCIES[currency];
  const step = mode === 'proration' ? meta.prorationRoundTo : meta.roundTo;
  return step <= 1 ? Math.round(minor) : Math.round(minor / step) * step;
}

/**
 * Convert between the two payroll currencies at `rateMicro` (toman per CAD).
 * Same currency short-circuits (rate = 1 by definition, and no rate is needed).
 * Returns null when a rate is required but unknown — callers surface that as
 * "enter this month's rate" rather than showing a zero.
 *
 * Rounds to the TARGET currency's delivery granularity, so a CAD->toman
 * conversion lands on the 5,000-toman boundary the exchange actually wires.
 *
 * NOTE the rate belongs to a PAYMENT, not a month. The exchange quotes each
 * wire separately: the June invoice's four lines ran 123,300.00 to 123,376.06
 * toman per CAD, a 0.062% spread. A payment therefore carries its own optional
 * rate and falls back to its run's canonical monthly rate, which is what the
 * rate trend and the growth split are built on.
 */
export function convert(
  minor: number,
  from: PayrollCurrency,
  to: PayrollCurrency,
  rateMicro: number | null,
): number | null {
  if (from === to) return minor;
  if (!rateMicro || rateMicro <= 0) return null;
  // CAD cents -> toman: (cents / 100) * (rateMicro / 1e6)
  const raw =
    from === 'CAD'
      ? (minor * rateMicro) / (CURRENCIES.CAD.minorPerUnit * RATE_SCALE)
      : (minor * CURRENCIES.CAD.minorPerUnit * RATE_SCALE) / rateMicro;
  return roundToGranularity(raw, to);
}

/**
 * The delivered amount to pre-fill for a payment. Identical to convert(), named
 * for its role at the call site: the result is a SUGGESTION the payroll admin
 * can overwrite with the exchange's exact figure. What gets stored is what
 * actually happened, not what we computed.
 */
export function suggestPaid(
  anchorMinor: number,
  anchorCurrency: PayrollCurrency,
  payCurrency: PayrollCurrency,
  rateMicro: number | null,
): number | null {
  return convert(anchorMinor, anchorCurrency, payCurrency, rateMicro);
}

/**
 * The company's CAD cost of a salary, excluding the wire fee. CAD anchors cost
 * their face value; toman anchors cost whatever the rate made them cost.
 */
export function costInCadCents(
  anchorMinor: number,
  anchorCurrency: PayrollCurrency,
  rateMicro: number | null,
): number | null {
  return convert(anchorMinor, anchorCurrency, 'CAD', rateMicro);
}

/* -------------------------------------------------------------------------- */
/* Proration                                                                  */
/* -------------------------------------------------------------------------- */

/** Days in a YYYY-MM month. Pure calendar math — no timezone involvement. */
export function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m) return 0;
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** First and last calendar day keys of a YYYY-MM month. */
export function monthDayBounds(month: string): { first: string; last: string } {
  const days = daysInMonth(month);
  return {
    first: `${month}-01`,
    last: `${month}-${String(days).padStart(2, '0')}`,
  };
}

export type ProrationBasis = {
  /** Days actually paid. */
  days: number;
  /** Days in the month. */
  monthDays: number;
  /** True when the member was present for the whole month. */
  full: boolean;
  /** Why it is partial, ready for the payslip line. */
  reason: string | null;
};

/**
 * How much of `month` a member was on the payroll for, from their join/end
 * dates. Both bounds are INCLUSIVE — the convention that reproduces the figure
 * Perseus calculated by hand: Mahdi NP joined Jul 19 and was paid 13/31 of
 * 35,000,000 = 14,680,000 toman, not 12/31.
 *
 * Returns null when the member wasn't on the payroll during the month at all.
 */
export function prorationForMonth(
  month: string,
  joinedOn: string | null,
  endedOn: string | null,
): ProrationBasis | null {
  const monthDays = daysInMonth(month);
  if (monthDays === 0) return null;
  const { first, last } = monthDayBounds(month);

  const start = joinedOn && joinedOn > first ? joinedOn : first;
  const end = endedOn && endedOn < last ? endedOn : last;
  if (start > end) return null;

  // +1 for an inclusive span.
  const days = daysBetweenDayKeys(start, end) + 1;
  if (days <= 0) return null;

  const reasons: string[] = [];
  if (start !== first) reasons.push(`joined ${start}`);
  if (end !== last) reasons.push(`ended ${end}`);

  return {
    days,
    monthDays,
    full: days >= monthDays,
    reason: reasons.length > 0 ? reasons.join(', ') : null,
  };
}

/**
 * A standing monthly salary reduced to a partial month, rounded to the
 * currency's delivery granularity. A full month returns the standing amount
 * untouched, so no rounding artifact can creep into a normal month.
 */
export function prorate(
  standingMinor: number,
  basis: ProrationBasis,
  currency: PayrollCurrency,
): number {
  if (basis.full || basis.monthDays === 0) return standingMinor;
  return roundToGranularity(
    (standingMinor * basis.days) / basis.monthDays,
    currency,
    'proration',
  );
}

/** The day after a member's last paid day — used when closing out a term. */
export function dayAfter(key: string): string {
  return shiftDayKey(key, 1);
}

/* -------------------------------------------------------------------------- */
/* Growth                                                                     */
/* -------------------------------------------------------------------------- */

export type GrowthPoint = {
  anchorMinor: number;
  anchorCurrency: PayrollCurrency;
  paidMinor: number;
  rateMicro: number | null;
  /** True when the month was prorated — a short month is not a pay cut. */
  partial: boolean;
};

export type GrowthSplit = {
  /** Change in what the member is paid, in their delivery currency. */
  paidPct: number | null;
  /** Change attributable to their own pay figure. */
  anchorPct: number | null;
  /** Change attributable to the exchange rate. */
  ratePct: number | null;
  /**
   * True when paidPct is exactly (1+anchorPct)(1+ratePct)-1, i.e. the split is
   * arithmetic rather than approximate. False when the delivered amount was
   * overridden away from anchor x rate (rounding, a manual top-up), in which
   * case the components are still correct but don't compose exactly.
   */
  exact: boolean;
  /** Either month was partial, so the comparison needs a caveat. */
  partial: boolean;
};

const pctChange = (from: number, to: number): number | null =>
  from === 0 ? null : ((to - from) / from) * 100;

/**
 * Decompose month-over-month change into pay movement and rate movement.
 *
 * Because paid = anchor x rate, growth is multiplicative and splits exactly:
 *   (1 + d_anchor)(1 + d_rate) - 1 = d_paid
 *
 * Verified against the real invoices — Saman, June to July 2026: anchor
 * 900 -> 1400 CAD (+55.56%), rate 123,300 -> 132,000 (+7.06%), paid
 * 110,970,000 -> 184,800,000 toman (+66.53%), and 1.5556 x 1.0706 - 1 =
 * +66.53%. That is what lets the member view say "your toman rose 66.5%:
 * 55.6% from your pay, 7.1% from the exchange rate" instead of one opaque
 * number.
 */
export function growthSplit(
  prev: GrowthPoint | null,
  curr: GrowthPoint | null,
): GrowthSplit {
  const empty: GrowthSplit = {
    paidPct: null,
    anchorPct: null,
    ratePct: null,
    exact: false,
    partial: false,
  };
  if (!prev || !curr) return empty;

  const partial = prev.partial || curr.partial;
  const paidPct = pctChange(prev.paidMinor, curr.paidMinor);

  // Comparing anchors only means anything in the same currency — a member who
  // switched from a CAD anchor to a toman anchor has no comparable figure.
  const sameAnchor = prev.anchorCurrency === curr.anchorCurrency;
  const anchorPct = sameAnchor
    ? pctChange(prev.anchorMinor, curr.anchorMinor)
    : null;
  const ratePct =
    prev.rateMicro && curr.rateMicro
      ? pctChange(prev.rateMicro, curr.rateMicro)
      : null;

  // Does the split actually compose? It won't if the delivered amount was
  // overridden, so we say so rather than presenting a tidy fiction.
  let exact = false;
  if (paidPct !== null && anchorPct !== null && ratePct !== null) {
    const composed =
      ((1 + anchorPct / 100) * (1 + ratePct / 100) - 1) * 100;
    exact = Math.abs(composed - paidPct) < 0.05;
  }

  return { paidPct, anchorPct, ratePct, exact, partial };
}

/**
 * Effective rate a payment actually settled at, in rateMicro terms — derived
 * from the two stored amounts, so it stays true even when the delivered figure
 * was overridden. Use it to show what a line really settled at; use the stored
 * rate for what was quoted.
 */
export function effectiveRateMicro(
  anchorMinor: number,
  anchorCurrency: PayrollCurrency,
  paidMinor: number,
  paidCurrency: PayrollCurrency,
): number | null {
  if (anchorCurrency === paidCurrency) return null;
  const cadMinor = anchorCurrency === 'CAD' ? anchorMinor : paidMinor;
  const tomanMinor = anchorCurrency === 'CAD' ? paidMinor : anchorMinor;
  if (cadMinor <= 0) return null;
  return Math.round(
    (tomanMinor * CURRENCIES.CAD.minorPerUnit * RATE_SCALE) / cadMinor,
  );
}
