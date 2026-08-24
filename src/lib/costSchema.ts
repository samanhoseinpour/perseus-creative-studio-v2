/**
 * Validation for the /admin/costs forms. Shared by the client dialogs (instant
 * field errors) and the `_actions/costs.ts` server actions (the authoritative
 * parse) — the payrollSchema.ts / careersSchema.ts split. Never import from
 * public-page code: zod stays out of the marketing chunks.
 *
 * Amounts arrive as STRINGS, the payroll convention: that is how the dialogs
 * hold numeric state, and a typed "295.81" must survive to a single parse door.
 * Both schemas transform them into integer CAD cents via parseAmount() from
 * payrollAmounts.ts, so a parsed payload is already the shape the columns want
 * and no action does its own arithmetic. Costs have NO money door of their own.
 */
import { z } from 'zod';

import {
  COST_CADENCES,
  COST_CATEGORIES,
  COST_NAME_MAX,
  COST_NOTE_MAX,
  COST_PLAN_STATUSES,
  COST_REF_MAX,
  COST_VENDOR_MAX,
  BILLING_DAY_MAX,
} from '@/lib/costFields';
import {
  isAmountInRange,
  maxAmountLabel,
  parseAmount,
} from '@/lib/payrollAmounts';

/**
 * Zod error → { fieldPath: firstMessage } for the dialogs' per-field slots
 * (pathless issues land under `_form`). Local twin of flattenPayrollIssues so
 * the costs chunk never pulls another domain's schema module for one helper.
 */
export function flattenCostIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/* -------------------------------------------------------------------------- */
/* Field primitives                                                           */
/* -------------------------------------------------------------------------- */

const DATE_RE = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** True when the key names a day that exists — Feb 31 fails, Feb 29 depends. */
const isRealDay = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
};

/**
 * Same Date round-trip payrollSchema does, and for the same reason: DATE_RE
 * allows 01-31 in every month, so without it '2026-02-30' reaches the `date`
 * column and comes back as an opaque Postgres 22008.
 */
const optionalDayKey = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .refine((v) => v === undefined || DATE_RE.test(v), {
      message: `${label} must be a valid date.`,
    })
    .refine((v) => v === undefined || isRealDay(v), {
      message: `${label} must be a real date.`,
    });

/** Empty string → undefined, else trimmed text under a cap. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((v) => (v === '' ? undefined : v))
    .optional();

export const costMonthToken = z
  .string()
  .trim()
  .refine((v) => MONTH_RE.test(v), 'Pick a month.');

/**
 * Resolve a typed CAD amount into cents, pushing a field-scoped issue when it
 * doesn't parse or busts payrollAmounts' fat-finger ceiling. Returns null so
 * the caller can bail with z.NEVER.
 */
function resolveCad(
  raw: string,
  ctx: z.RefinementCtx,
  path: string,
): number | null {
  const cents = parseAmount(raw, 'CAD');
  if (cents === null) {
    ctx.addIssue({ code: 'custom', path: [path], message: 'Enter a valid amount.' });
    return null;
  }
  if (!isAmountInRange(cents, 'CAD')) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: `Must be between 0 and ${maxAmountLabel('CAD')}.`,
    });
    return null;
  }
  return cents;
}

/* -------------------------------------------------------------------------- */
/* Plan — the standing commitment                                             */
/* -------------------------------------------------------------------------- */

/**
 * `expectedAmount` is OPTIONAL because a usage-billed plan (an ads account, a
 * metered API) genuinely has no fixed figure. Such a plan simply contributes
 * nothing to the run-rate rather than contributing a guess.
 */
export const costPlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Enter a name.')
      .max(COST_NAME_MAX, `Name must be ${COST_NAME_MAX} characters or fewer.`),
    vendor: z
      .string()
      .trim()
      .min(2, 'Enter who bills you.')
      .max(
        COST_VENDOR_MAX,
        `Vendor must be ${COST_VENDOR_MAX} characters or fewer.`,
      ),
    category: z.enum(COST_CATEGORIES),
    cadence: z.enum(COST_CADENCES),
    status: z.enum(COST_PLAN_STATUSES),
    expectedAmount: z.string().trim().optional(),
    billingDay: z
      .number()
      .int()
      .min(1, 'Billing day must be between 1 and 28.')
      .max(BILLING_DAY_MAX, 'Billing day must be between 1 and 28.')
      .optional(),
    startedOn: optionalDayKey('Start date'),
    endedOn: optionalDayKey('End date'),
    note: optionalText(COST_NOTE_MAX, 'Note'),
    sortIndex: z.number().int().min(0).max(9999).optional(),
  })
  .transform((v, ctx) => {
    const raw = v.expectedAmount ?? '';
    if (raw === '') return { ...v, expectedCadCents: undefined };
    const cents = resolveCad(raw, ctx, 'expectedAmount');
    if (cents === null) return z.NEVER;
    return { ...v, expectedCadCents: cents };
  })
  .refine((v) => !v.startedOn || !v.endedOn || v.endedOn >= v.startedOn, {
    message: 'End date can’t be before the start date.',
    path: ['endedOn'],
  })
  /**
   * A quarterly or yearly plan is refused without a start date, because that is
   * the ANCHOR planLandsInMonth() beats from — with no anchor there is no way
   * to know which month it bills in, and the plan would silently never appear
   * in "expected but not recorded". Monthly plans need no anchor, so the rule
   * is scoped rather than blanket (the careers open-requires-pay precedent).
   */
  .refine((v) => v.cadence === 'monthly' || Boolean(v.startedOn), {
    message: 'A quarterly or yearly plan needs a start date — it says which month it bills in.',
    path: ['startedOn'],
  });

export type CostPlanInput = z.output<typeof costPlanSchema>;

/* -------------------------------------------------------------------------- */
/* Entry — one charge that actually happened                                  */
/* -------------------------------------------------------------------------- */

/**
 * `amount` is REQUIRED and lands in the one summable column. There is no
 * "unknown" branch on purpose — payroll's hard-won lesson is that a null
 * coerced to 0 reads as "cost nothing" in a total that someone will trust.
 *
 * `planId` is optional: a one-off cost (a domain renewal, a hardware buy) is an
 * entry with no plan, which is what makes this a ledger rather than a
 * subscription tracker.
 */
export const costEntrySchema = z
  .object({
    planId: z
      .string()
      .trim()
      .uuid('Pick a valid plan.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    month: costMonthToken,
    chargedOn: optionalDayKey('Charge date'),
    name: z
      .string()
      .trim()
      .min(2, 'Enter what this was for.')
      .max(COST_NAME_MAX, `Name must be ${COST_NAME_MAX} characters or fewer.`),
    vendor: z
      .string()
      .trim()
      .min(2, 'Enter who billed you.')
      .max(
        COST_VENDOR_MAX,
        `Vendor must be ${COST_VENDOR_MAX} characters or fewer.`,
      ),
    category: z.enum(COST_CATEGORIES),
    amount: z.string().trim().min(1, 'Enter the amount charged.'),
    /** Free text, e.g. "US$20.00" — a reference note for a vendor that bills in
     *  another currency. Never parsed, never summed: the CAD figure is what
     *  actually left the bank and is the only thing this app adds up. */
    billedNote: optionalText(COST_REF_MAX, 'Billed as'),
    invoiceRef: optionalText(COST_REF_MAX, 'Invoice reference'),
    note: optionalText(COST_NOTE_MAX, 'Note'),
  })
  .transform((v, ctx) => {
    const cents = resolveCad(v.amount, ctx, 'amount');
    if (cents === null) return z.NEVER;
    return { ...v, amountCadCents: cents };
  })
  /**
   * The charge date must sit in the month it is filed under. They are two
   * columns (the bucket and the invoice date) precisely so a real off-cycle
   * charge can be filed deliberately — but a mismatch is far more often a
   * mistyped month, and a charge in the wrong month is the one error that
   * silently moves money between two totals.
   */
  .refine((v) => !v.chargedOn || v.chargedOn.slice(0, 7) === v.month, {
    message: 'The charge date isn’t in that month.',
    path: ['chargedOn'],
  });

export type CostEntryInput = z.output<typeof costEntrySchema>;
