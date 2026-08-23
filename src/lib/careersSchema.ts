/**
 * Validation for the /admin/careers forms (job categories + openings). Shared
 * by the dialogs (instant field errors) and the `_actions/careers.ts` server
 * actions (the authoritative parse) — the portfolioSchema.ts split. Never
 * import from public-page code: zod stays out of the marketing chunks.
 *
 * Two rules that are policy, not shape, live here as refinements:
 *  - An 'open' listing needs a full pay range AND a posted date. BC's Pay
 *    Transparency Act requires expected pay on any publicly advertised
 *    posting a BC resident could fill (every remote role), and Google's
 *    JobPosting requires datePosted. The old code only warned in dev; now
 *    the status flip is refused until both are in.
 *  - `validThrough` can't precede `datePosted`, and `payMin` can't exceed
 *    `payMax` — the province flags uninformative bands, so don't hedge with
 *    a reversed one either.
 */
import { z } from 'zod';

import {
  JOB_CADENCE_MAX,
  JOB_CATEGORY_ICON_KEYS,
  JOB_CATEGORY_NAME_MAX,
  JOB_EMPLOYMENT_TYPES,
  JOB_FIT_MAX,
  JOB_LEVEL_MAX,
  JOB_LOCATION_MAX,
  JOB_PAY_MAX_VALUE,
  JOB_PAY_UNITS,
  JOB_SLUG_MAX,
  JOB_SLUG_RE,
  JOB_STATUSES,
  JOB_SUMMARY_MAX,
  JOB_TAG_MAX,
  JOB_TAGS_MAX,
  JOB_TITLE_MAX,
  RESERVED_JOB_SLUGS,
} from '@/lib/careerFields';

/**
 * Zod error → { fieldPath: firstMessage } for the forms' per-field slots
 * (pathless issues land under `_form`). Local twin of portfolioSchema's
 * flattenPortfolioIssues so the careers chunk never pulls that module.
 */
export function flattenCareersIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

const requiredText = (min: number, max: number, missing: string, label: string) =>
  z
    .string()
    .trim()
    .min(min, missing)
    .max(max, `Keep ${label} under ${max} characters.`);

/** True when the key names a day that exists — Feb 31 fails, Feb 29 depends. */
const isRealDay = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
};

/**
 * Empty string → undefined, else a YYYY-MM-DD key that names a real day.
 * Shape alone is not enough: '2026-02-31' passes the regex, survives the
 * string-compare refinements below, and then fails the Postgres `date` cast
 * as a generic server error (the phantom-date rejection taskFilters pins).
 */
const optionalDayKey = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-08-09.')
      .refine(isRealDay, 'That day doesn’t exist — check the month and day.')
      .optional(),
  );

/** Empty/absent → undefined, else a whole dollar figure. */
const optionalDollars = z
  .number({ error: 'Enter a whole-dollar figure.' })
  .int('Enter a whole-dollar figure.')
  .min(0, 'Use zero or a positive figure.')
  .max(JOB_PAY_MAX_VALUE, 'That figure looks wrong — check the unit.')
  .optional();

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Enter a slug.')
  .max(JOB_SLUG_MAX, `Keep the slug under ${JOB_SLUG_MAX} characters.`)
  .regex(JOB_SLUG_RE, 'Lowercase letters, numbers, and dashes only.');

export const jobCategorySchema = z.object({
  name: requiredText(2, JOB_CATEGORY_NAME_MAX, 'Enter the category name.', 'the name'),
  slug: slugSchema,
  icon: z.enum(JOB_CATEGORY_ICON_KEYS, { error: 'Pick an icon.' }),
  // Blank keeps the current slot on edit / appends on create.
  sortIndex: z
    .number({ error: 'Enter a whole number.' })
    .int('Enter a whole number.')
    .min(0, 'Use zero or a positive number.')
    .max(1_000_000, 'Keep the order under 1,000,000.')
    .optional(),
});

export type JobCategoryInput = z.infer<typeof jobCategorySchema>;

export const jobOpeningSchema = z
  .object({
    title: requiredText(2, JOB_TITLE_MAX, 'Enter the role title.', 'the title'),
    slug: slugSchema.refine(
      (slug) => !(RESERVED_JOB_SLUGS as readonly string[]).includes(slug),
      'This slug is reserved for the general-application option.',
    ),
    categoryId: z.uuid({ error: 'Pick a category.' }),
    location: requiredText(2, JOB_LOCATION_MAX, 'Enter the location.', 'the location'),
    employmentType: z.enum(JOB_EMPLOYMENT_TYPES, { error: 'Pick an employment type.' }),
    level: requiredText(2, JOB_LEVEL_MAX, 'Enter the level (e.g. Mid-level).', 'the level'),
    cadence: requiredText(2, JOB_CADENCE_MAX, 'Enter the cadence (e.g. Flexible hours).', 'the cadence'),
    fit: requiredText(10, JOB_FIT_MAX, 'Write who the role suits.', 'the fit line'),
    summary: requiredText(10, JOB_SUMMARY_MAX, 'Write the one-line summary.', 'the summary'),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Remove the empty tag.')
          .max(JOB_TAG_MAX, `Keep each tag under ${JOB_TAG_MAX} characters.`),
      )
      .max(JOB_TAGS_MAX, `Keep it to ${JOB_TAGS_MAX} tags.`)
      .default([]),
    status: z.enum(JOB_STATUSES, { error: 'Pick a status.' }),
    datePosted: optionalDayKey,
    validThrough: optionalDayKey,
    payMin: optionalDollars,
    payMax: optionalDollars,
    payUnit: z.enum(JOB_PAY_UNITS).optional(),
    // Blank keeps the current slot on edit / appends on create.
    sortIndex: z
      .number({ error: 'Enter a whole number.' })
      .int('Enter a whole number.')
      .min(0, 'Use zero or a positive number.')
      .max(1_000_000, 'Keep the order under 1,000,000.')
      .optional(),
  })
  // Pay is all-or-nothing: a half-filled range renders "$30–undefined".
  .refine(
    (d) =>
      (d.payMin === undefined && d.payMax === undefined && d.payUnit === undefined) ||
      (d.payMin !== undefined && d.payMax !== undefined && d.payUnit !== undefined),
    { path: ['payMin'], error: 'Fill in the minimum, maximum, and unit together.' },
  )
  .refine((d) => d.payMin === undefined || d.payMax === undefined || d.payMin <= d.payMax, {
    path: ['payMax'],
    error: 'The maximum must be at least the minimum.',
  })
  .refine(
    (d) => !d.datePosted || !d.validThrough || d.validThrough >= d.datePosted,
    { path: ['validThrough'], error: 'The expiry can’t be before the posted date.' },
  )
  // The Pay Transparency / JobPosting rule: nothing opens without a range
  // and a posted date. Checked last so the field-level messages above win.
  .refine((d) => d.status !== 'open' || d.payMin !== undefined, {
    path: ['payMin'],
    error: 'Add the pay range before opening this role — BC requires it on every public posting.',
  })
  .refine((d) => d.status !== 'open' || !!d.datePosted, {
    path: ['datePosted'],
    error: 'Add the posted date before opening this role.',
  });

export type JobOpeningInput = z.infer<typeof jobOpeningSchema>;

/**
 * What `setOpeningStatus` re-checks against the STORED row before a quick
 * flip to 'open' (the dialog runs the full schema; the roster's menu has no
 * form to show a field error on, so it gets one sentence back).
 */
export function openingCanOpen(row: {
  payMin: number | null;
  payMax: number | null;
  payUnit: string | null;
  datePosted: string | null;
}): string | null {
  const hasPay = row.payMin !== null && row.payMax !== null && row.payUnit !== null;
  if (!hasPay && !row.datePosted) {
    return 'Add a pay range and a posted date before opening this role.';
  }
  if (!hasPay) return 'Add a pay range before opening this role.';
  if (!row.datePosted) return 'Add a posted date before opening this role.';
  return null;
}
