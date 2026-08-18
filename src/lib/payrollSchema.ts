/**
 * Validation for the /admin payroll forms. Shared by the client dialogs
 * (instant field errors) and the `_actions/payroll.ts` server actions (the
 * authoritative parse) — the usersSchema.ts / portfolioSchema.ts split. Never
 * import from public-page code: zod stays out of the marketing chunks.
 *
 * Amounts arrive as STRINGS, because that is how the admin forms hold numeric
 * state (the ClientDialog "Order" field convention) and because a typed
 * "184,800,000" must survive to a single parse door. Each schema transforms
 * them into integer minor units via parseAmount() from payrollAmounts.ts, so a
 * parsed payload is already in the shape the DB columns want and no action does
 * its own arithmetic.
 */
import { z } from 'zod';

import {
  isAmountInRange,
  maxAmountLabel,
  parseAmount,
  parseRate,
  PAYROLL_CURRENCIES,
  type PayrollCurrency,
} from '@/lib/payrollAmounts';
import { PAYROLL_PAYMENT_STATUSES } from '@/lib/payrollStatus';

export const PAYROLL_NAME_MAX = 120;
export const PAYROLL_NOTE_MAX = 500;
export const PAYROLL_REF_MAX = 64;
/** A flag reason has to say something useful, so it has a floor as well. */
export const PAYROLL_FLAG_NOTE_MIN = 4;
/** Cents. A "wire fee" over CAD 500 is a typo, not a fee. */
const FEE_CAP_CENTS = 50_000;

/**
 * Zod error → { fieldPath: firstMessage } for the dialogs' per-field slots
 * (pathless issues land under `_form`). Local twin of flattenPortfolioIssues so
 * the payroll chunk never pulls another domain's schema module for one helper.
 */
export function flattenPayrollIssues(
  error: z.ZodError,
): Record<string, string> {
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

/** Empty string → undefined, else trimmed text under a cap. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((v) => (v === '' ? undefined : v))
    .optional();

const DATE_RE = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** True when the key names a day that exists — Feb 31 fails, Feb 29 depends. */
const isRealDay = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
};

/** A calendar day key. Rejects Feb 31 via the Date round-trip, not just shape. */
const dayKey = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => DATE_RE.test(v), `${label} must be a valid date.`)
    .refine(isRealDay, `${label} must be a real date.`);

// Same two checks as dayKey. joinedOn/endedOn drive proration, so an impossible
// day here is not cosmetic: without the round-trip '2026-02-30' passes the regex
// (DATE_RE allows 01-31 in every month), reaches the `date` column, and comes
// back as a Postgres 22008 the action can only report as a generic failure.
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

export const monthToken = z
  .string()
  .trim()
  .refine((v) => MONTH_RE.test(v), 'Pick a month.');

const currency = z.enum(PAYROLL_CURRENCIES);

/** A typed amount, still a string — paired with its currency at object level. */
const amountText = z.string().trim().min(1, 'Enter an amount.');

/**
 * Resolve a typed amount into minor units, pushing a field-scoped issue when it
 * doesn't parse or busts the fat-finger ceiling. Returns null on failure so the
 * caller can bail with z.NEVER.
 */
function resolveAmount(
  raw: string,
  cur: PayrollCurrency,
  ctx: z.RefinementCtx,
  path: string,
): number | null {
  const minor = parseAmount(raw, cur);
  if (minor === null) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: 'Enter a valid amount.',
    });
    return null;
  }
  if (!isAmountInRange(minor, cur)) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: `Must be between 0 and ${maxAmountLabel(cur)}.`,
    });
    return null;
  }
  return minor;
}

/* -------------------------------------------------------------------------- */
/* Member                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A payee. `userId` is optional on purpose: pay history has to outlive a deleted
 * account (offboarding hard-deletes the `user` row), and a payee can be recorded
 * before they ever have a login.
 */
export const payrollMemberSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Enter the member’s name.')
      .max(
        PAYROLL_NAME_MAX,
        `Name must be ${PAYROLL_NAME_MAX} characters or fewer.`,
      ),
    // Better Auth ids are 32-char alphanumerics, NOT uuids — the users-page rule.
    userId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid account.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    status: z.enum(['active', 'ended']),
    joinedOn: optionalDayKey('Join date'),
    endedOn: optionalDayKey('End date'),
    selfViewEnabled: z.boolean(),
    payCurrency: currency,
    notes: optionalText(PAYROLL_NOTE_MAX, 'Notes'),
    sortIndex: z.number().int().min(0).max(9999).optional(),
  })
  .refine(
    (v) => !v.joinedOn || !v.endedOn || v.endedOn >= v.joinedOn,
    { message: 'End date can’t be before the join date.', path: ['endedOn'] },
  )
  .refine((v) => v.status !== 'ended' || Boolean(v.endedOn), {
    message: 'An ended member needs an end date.',
    path: ['endedOn'],
  });

export type PayrollMemberInput = z.output<typeof payrollMemberSchema>;

/* -------------------------------------------------------------------------- */
/* Standing term                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A standing monthly salary effective from a date. The next term supersedes this
 * one, so there is no end date to get wrong.
 */
export const payrollTermSchema = z
  .object({
    effectiveFrom: dayKey('Effective date'),
    anchorCurrency: currency,
    anchorAmount: amountText,
    note: optionalText(PAYROLL_NOTE_MAX, 'Note'),
  })
  .transform((v, ctx) => {
    const minor = resolveAmount(
      v.anchorAmount,
      v.anchorCurrency,
      ctx,
      'anchorAmount',
    );
    if (minor === null) return z.NEVER;
    return { ...v, anchorAmount: minor };
  });

export type PayrollTermInput = z.output<typeof payrollTermSchema>;

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The month's header: its canonical exchange rate plus the exchange's invoice
 * number. The rate is optional because a month is often opened as a draft before
 * the rate is known.
 */
export const payrollRunSchema = z
  .object({
    month: monthToken,
    /** Toman per CAD, as typed. Empty = not known yet. */
    rate: z.string().trim(),
    invoiceRef: optionalText(PAYROLL_REF_MAX, 'Invoice reference'),
    note: optionalText(PAYROLL_NOTE_MAX, 'Note'),
  })
  .transform((v, ctx) => {
    let rateMicro: number | undefined;
    if (v.rate !== '') {
      const parsed = parseRate(v.rate);
      if (parsed === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['rate'],
          message: 'Enter a valid rate (toman per CAD).',
        });
        return z.NEVER;
      }
      rateMicro = parsed;
    }
    const { rate: _rate, ...rest } = v;
    return { ...rest, rateMicro };
  });

export type PayrollRunInput = z.output<typeof payrollRunSchema>;

/* -------------------------------------------------------------------------- */
/* Payment line                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One member's line for one month. Note this schema NEVER carries a status — the
 * edit door and the status door are separate, as they are for tasks, so saving an
 * amount can't accidentally mark money as sent.
 */
export const payrollPaymentSchema = z
  .object({
    anchorCurrency: currency,
    anchorAmount: amountText,
    paidCurrency: currency,
    /** Empty until the money is actually sent. */
    paidAmount: z.string().trim(),
    /** Per-wire rate override; empty inherits the run's monthly rate. */
    rate: z.string().trim(),
    /** Company-borne wire fee in CAD. Outside anybody's salary. */
    feeCad: z.string().trim(),
    proratedDays: z.number().int().min(1).max(31).optional(),
    monthDays: z.number().int().min(28).max(31).optional(),
    prorationNote: optionalText(PAYROLL_NOTE_MAX, 'Proration note'),
    wireRef: optionalText(PAYROLL_REF_MAX, 'Wire reference'),
    adminNote: optionalText(PAYROLL_NOTE_MAX, 'Internal note'),
  })
  .transform((v, ctx) => {
    const anchorAmount = resolveAmount(
      v.anchorAmount,
      v.anchorCurrency,
      ctx,
      'anchorAmount',
    );
    if (anchorAmount === null) return z.NEVER;

    let paidAmount = 0;
    if (v.paidAmount !== '') {
      const resolved = resolveAmount(
        v.paidAmount,
        v.paidCurrency,
        ctx,
        'paidAmount',
      );
      if (resolved === null) return z.NEVER;
      paidAmount = resolved;
    }

    let rateMicro: number | undefined;
    if (v.rate !== '') {
      const parsed = parseRate(v.rate);
      if (parsed === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['rate'],
          message: 'Enter a valid rate (toman per CAD).',
        });
        return z.NEVER;
      }
      rateMicro = parsed;
    }

    // The fee is a CAD company cost and may legitimately be zero.
    let feeCadCents = 0;
    if (v.feeCad !== '') {
      const parsed = parseAmount(v.feeCad, 'CAD');
      if (parsed === null || parsed > FEE_CAP_CENTS) {
        ctx.addIssue({
          code: 'custom',
          path: ['feeCad'],
          message: 'Enter a valid fee in CAD.',
        });
        return z.NEVER;
      }
      feeCadCents = parsed;
    }

    // Day counts only mean something together.
    if ((v.proratedDays === undefined) !== (v.monthDays === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['proratedDays'],
        message: 'Give both the days paid and the days in the month.',
      });
      return z.NEVER;
    }
    if (
      v.proratedDays !== undefined &&
      v.monthDays !== undefined &&
      v.proratedDays > v.monthDays
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['proratedDays'],
        message: 'Days paid can’t exceed the days in the month.',
      });
      return z.NEVER;
    }

    const { rate: _rate, feeCad: _feeCad, ...rest } = v;
    return { ...rest, anchorAmount, paidAmount, rateMicro, feeCadCents };
  });

export type PayrollPaymentInput = z.output<typeof payrollPaymentSchema>;

/* -------------------------------------------------------------------------- */
/* Status change                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The status door. `note` is required for a flag (checkTransition reports which
 * transitions need one) and is what the member writes to explain the problem.
 */
export const payrollStatusSchema = z.object({
  status: z.enum(PAYROLL_PAYMENT_STATUSES),
  note: z
    .string()
    .trim()
    .max(PAYROLL_NOTE_MAX, `Keep it under ${PAYROLL_NOTE_MAX} characters.`)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type PayrollStatusInput = z.output<typeof payrollStatusSchema>;

/** The note a flag must carry — checked where the transition is known. */
export const payrollFlagNoteSchema = z
  .string()
  .trim()
  .min(PAYROLL_FLAG_NOTE_MIN, 'Tell us what’s wrong so it can be fixed.')
  .max(PAYROLL_NOTE_MAX, `Keep it under ${PAYROLL_NOTE_MAX} characters.`);
