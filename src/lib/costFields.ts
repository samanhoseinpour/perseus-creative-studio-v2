/**
 * The client-safe vocabulary for /admin/costs — categories, cadences, plan
 * statuses, the chip palette, and the two pure predicates the month screen
 * runs.
 *
 * Zero dependencies, like taskTagFields.ts and careerFields.ts, so the roster,
 * both dialogs and the month screen can import it without dragging zod into a
 * client chunk. The zod half lives in costSchema.ts (the portfolioSchema split).
 *
 * MONEY IS NOT THIS MODULE'S JOB. Costs own no arithmetic on amounts:
 * src/lib/payrollAmounts.ts stays the one door that parses, formats and caps
 * CAD, and everything here calls it with 'CAD'. The single exception is
 * monthlyRunRateCents below, which divides a cadence rather than a currency —
 * it converts a billing PERIOD, not a unit, and is pinned by
 * scripts/check-costs.mts.
 */

// ── Limits ──────────────────────────────────────────────────────────────────

export const COST_NAME_MAX = 80;
export const COST_VENDOR_MAX = 80;
export const COST_NOTE_MAX = 500;
export const COST_REF_MAX = 64;

/**
 * Billing day is capped at 28, the tasks.repeat_day rule: a plan billing on
 * the 31st would silently skip February, and "the 30th" is not a date every
 * month has. Vendors that bill on the 29th-31st are recorded at 28 — the field
 * exists to sort and to hint, never to compute a due date.
 */
export const BILLING_DAY_MAX = 28;

// ── Categories ──────────────────────────────────────────────────────────────

/**
 * What kind of spend this is. Subscriptions are the only category in use today;
 * the rest are here so the next kind of cost needs no migration and no rename
 * sweep — the tickets.area precedent, one step stricter (a pgEnum, because the
 * value drives a chip colour and a grouped roster).
 */
export const COST_CATEGORIES = [
  'subscription',
  'software',
  'ads',
  'hardware',
  'service',
  'other',
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  subscription: 'Subscription',
  software: 'Software',
  ads: 'Ad spend',
  hardware: 'Hardware',
  service: 'Service',
  other: 'Other',
};

/**
 * Chip tints, one per category. Literal class strings — Tailwind's scanner
 * cannot see a computed name. Deliberately avoids `rose` and `amber`, which
 * the dashboard spends on overdue / attention states elsewhere.
 */
export const COST_CATEGORY_TONES: Record<CostCategory, string> = {
  subscription:
    'bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  software: 'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  ads: 'bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300',
  hardware:
    'bg-slate-500/12 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300',
  service:
    'bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
  other: 'bg-lime-500/12 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300',
};

export function isCostCategory(value: unknown): value is CostCategory {
  return (
    typeof value === 'string' &&
    (COST_CATEGORIES as readonly string[]).includes(value)
  );
}

/** Never throws on a value this build doesn't know (the jobCategoryIcons rule):
 *  a rollback past a retired category still renders a readable row. */
export function costCategoryLabel(value: string): string {
  return isCostCategory(value) ? COST_CATEGORY_LABELS[value] : value;
}

export function costCategoryTone(value: string): string {
  return isCostCategory(value)
    ? COST_CATEGORY_TONES[value]
    : COST_CATEGORY_TONES.other;
}

// ── Cadence ─────────────────────────────────────────────────────────────────

export const COST_CADENCES = ['monthly', 'quarterly', 'yearly'] as const;

export type CostCadence = (typeof COST_CADENCES)[number];

export const COST_CADENCE_LABELS: Record<CostCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/** "/mo", "/quarter", "/yr" — the suffix beside an expected amount. */
export const COST_CADENCE_SUFFIX: Record<CostCadence, string> = {
  monthly: '/mo',
  quarterly: '/quarter',
  yearly: '/yr',
};

export function isCostCadence(value: unknown): value is CostCadence {
  return (
    typeof value === 'string' &&
    (COST_CADENCES as readonly string[]).includes(value)
  );
}

/** How many months one billing period covers. */
const CADENCE_MONTHS: Record<CostCadence, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

// ── Plan status ─────────────────────────────────────────────────────────────

/**
 * active    — we pay for it; it counts toward the run-rate and is offered in
 *             "expected but not recorded".
 * paused    — temporarily not billing (a seat parked, a season off). Kept out
 *             of the run-rate, kept in the roster.
 * cancelled — the retirement path, the task-category `archived` rule. A
 *             cancelled plan keeps every charge it ever made; deleting one is
 *             refused while any charge references it.
 */
export const COST_PLAN_STATUSES = ['active', 'paused', 'cancelled'] as const;

export type CostPlanStatus = (typeof COST_PLAN_STATUSES)[number];

export const COST_PLAN_STATUS_LABELS: Record<CostPlanStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export function isCostPlanStatus(value: unknown): value is CostPlanStatus {
  return (
    typeof value === 'string' &&
    (COST_PLAN_STATUSES as readonly string[]).includes(value)
  );
}

/** Only active plans are money we expect to keep spending. */
export function countsTowardRunRate(status: CostPlanStatus): boolean {
  return status === 'active';
}

// ── The two predicates ──────────────────────────────────────────────────────

/**
 * A plan's cost expressed as a monthly figure, so a yearly Notion seat and a
 * monthly Claude seat can be added together into one run-rate.
 *
 * This is a FORECAST, never a ledger figure: an annual charge still lands in
 * the single month it was billed in (cost_entries is the truth), and nothing
 * here ever writes to amount_cad_cents. Rounds to whole cents — a $200/yr plan
 * reads as $16.67/mo, and twelve of those do not add back to $200. That is
 * accepted: the run-rate answers "what does a month cost us", not "what will
 * the year total".
 */
export function monthlyRunRateCents(
  cadence: CostCadence,
  cents: number | null,
): number | null {
  if (cents === null || !Number.isFinite(cents)) return null;
  return Math.round(cents / CADENCE_MONTHS[cadence]);
}

/** 'YYYY-MM' -> a comparable integer. Pure string math, no zone (the
 *  calendar.ts rule: a month token is a calendar KEY, not an instant). */
function monthIndex(token: string): number | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(token)) return null;
  const [year, month] = token.split('-').map(Number);
  return year * 12 + (month - 1);
}

export type CostPlanWindow = {
  cadence: CostCadence;
  /** 'YYYY-MM-DD' or null. Also the ANCHOR for a non-monthly cadence. */
  startedOn: string | null;
  endedOn: string | null;
};

/**
 * Does this plan bill in the given month?
 *
 * Monthly plans land in every month of their window. Quarterly and yearly ones
 * land only on the beat set by `startedOn` — which is why costSchema.ts refuses
 * a non-monthly plan without a start date: with no anchor there is no way to
 * know which month it bills in, and guessing "every month" would put a yearly
 * invoice on eleven months' worth of expected lists.
 *
 * Used only to build the "expected but not recorded" list. It never gates a
 * write: a charge can be recorded against any plan in any month, because
 * vendors do off-cycle things (a mid-month upgrade, a true-up) and a predicate
 * refusing the real invoice would be worse than no predicate.
 */
export function planLandsInMonth(plan: CostPlanWindow, month: string): boolean {
  const target = monthIndex(month);
  if (target === null) return false;

  const start = plan.startedOn ? monthIndex(plan.startedOn.slice(0, 7)) : null;
  if (start !== null && target < start) return false;

  const end = plan.endedOn ? monthIndex(plan.endedOn.slice(0, 7)) : null;
  if (end !== null && target > end) return false;

  if (plan.cadence === 'monthly') return true;

  // Non-monthly needs the anchor. No anchor, no claim.
  if (start === null) return false;
  return (target - start) % CADENCE_MONTHS[plan.cadence] === 0;
}
