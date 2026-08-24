/**
 * Company-costs self-check — the run-rate arithmetic and the billing calendar,
 * executable.
 *
 * Run:  node --import tsx scripts/check-costs.mts    (no DB, no env)
 *
 * Two pure functions in src/lib/costFields.ts decide numbers nobody can eyeball.
 * `monthlyRunRateCents` divides a billing PERIOD (a yearly seat spread over
 * twelve months) so a mixed set of cadences can be added into one forecast —
 * get it wrong and the run-rate is off by 12x with nothing on screen to say so.
 * `planLandsInMonth` decides which plans appear in "expected but not recorded",
 * which is the whole mechanism for noticing a charge you forgot to file: a
 * plan that silently never lands is a bill that silently never gets recorded,
 * and the month total is quietly short for ever.
 *
 * The schema half is checked too, because both of its refusals exist to stop a
 * plan from becoming invisible: a non-monthly plan with no start date has no
 * anchor to beat from, and a charge filed under a month its own date isn't in
 * moves money between two totals with no error anywhere.
 *
 * There is no test runner in this repo (see CLAUDE.md). Run this after touching
 * costFields.ts or costSchema.ts.
 */
import {
  BILLING_DAY_MAX,
  COST_CADENCES,
  COST_CATEGORIES,
  COST_PLAN_STATUSES,
  costCategoryLabel,
  costCategoryTone,
  countsTowardRunRate,
  isCostCadence,
  isCostCategory,
  isCostPlanStatus,
  monthlyRunRateCents,
  planLandsInMonth,
  type CostPlanWindow,
} from '@/lib/costFields';
import { costEntrySchema, costPlanSchema, flattenCostIssues } from '@/lib/costSchema';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

eq('billing day cap is 28 (February must never be skipped)', BILLING_DAY_MAX, 28);
eq('categories are the six shipped', [...COST_CATEGORIES].length, 6);
eq('subscription is the default kind', COST_CATEGORIES[0], 'subscription');
eq('cadences', [...COST_CADENCES], ['monthly', 'quarterly', 'yearly']);
eq('statuses', [...COST_PLAN_STATUSES], ['active', 'paused', 'cancelled']);

// Unknown values degrade, never throw — the jobCategoryIcons rule. A rollback
// past a retired category must still render a readable row.
eq('unknown category label falls back to the raw value', costCategoryLabel('crypto'), 'crypto');
eq('unknown category tone falls back to "other"', costCategoryTone('crypto'), costCategoryTone('other'));
eq('isCostCategory rejects junk', isCostCategory('crypto'), false);
eq('isCostCadence rejects junk', isCostCadence('weekly'), false);
eq('isCostPlanStatus rejects junk', isCostPlanStatus('archived'), false);

// Only active plans are money we still expect to spend.
eq('active counts toward the run-rate', countsTowardRunRate('active'), true);
eq('paused does not', countsTowardRunRate('paused'), false);
eq('cancelled does not', countsTowardRunRate('cancelled'), false);

/* -------------------------------------------------------------------------- */
/* monthlyRunRateCents — the cadence division                                 */
/* -------------------------------------------------------------------------- */

// The real figure: Claude at CA$299.60/mo.
eq('monthly passes through untouched', monthlyRunRateCents('monthly', 29960), 29960);
eq('quarterly divides by 3', monthlyRunRateCents('quarterly', 30000), 10000);
eq('yearly divides by 12', monthlyRunRateCents('yearly', 24000), 2000);

// Rounding is to whole cents, and the round trip deliberately does NOT close:
// $200/yr reads as $16.67/mo, and twelve of those are $200.04. The run-rate
// answers "what does a month cost", not "what will the year total" — the year
// figure comes from the ledger, which is never rounded.
eq('yearly 200.00 rounds to 16.67/mo', monthlyRunRateCents('yearly', 20000), 1667);
eq('...and 12x that is NOT the annual figure', 1667 * 12, 20004);
eq('quarterly 100.00 rounds to 33.33/mo', monthlyRunRateCents('quarterly', 10000), 3333);
eq('half-cent rounds up, not down', monthlyRunRateCents('yearly', 6), 1);

// A usage-billed plan has no figure, and must contribute NOTHING rather than a
// zero that reads like "this is free".
eq('null in, null out', monthlyRunRateCents('monthly', null), null);
eq('NaN in, null out', monthlyRunRateCents('yearly', Number.NaN), null);
eq('zero is a real figure, not an absence', monthlyRunRateCents('monthly', 0), 0);

/* -------------------------------------------------------------------------- */
/* planLandsInMonth — the billing calendar                                    */
/* -------------------------------------------------------------------------- */

const monthly = (startedOn: string | null, endedOn: string | null = null): CostPlanWindow => ({
  cadence: 'monthly',
  startedOn,
  endedOn,
});

// The real case: Claude is tracked from June 2026, so April and May — months it
// really was billed in — must not appear as "expected but not recorded".
const claude = monthly('2026-06-01');
eq('Claude: May 2026 is before it was tracked', planLandsInMonth(claude, '2026-05'), false);
eq('Claude: June 2026 lands', planLandsInMonth(claude, '2026-06'), true);
eq('Claude: July 2026 lands', planLandsInMonth(claude, '2026-07'), true);
eq('Claude: August 2026 lands', planLandsInMonth(claude, '2026-08'), true);
eq('Claude: December 2027 still lands (no end date)', planLandsInMonth(claude, '2027-12'), true);

// The window is inclusive at BOTH ends, by month — a plan that ended on the
// 3rd still billed that month.
const ended = monthly('2026-01-15', '2026-06-03');
eq('ended plan: its final month is inclusive', planLandsInMonth(ended, '2026-06'), true);
eq('ended plan: the month after is out', planLandsInMonth(ended, '2026-07'), false);
eq('ended plan: its first month is inclusive', planLandsInMonth(ended, '2026-01'), true);
eq('ended plan: the month before is out', planLandsInMonth(ended, '2025-12'), false);

// No start date is allowed for a monthly plan — it just has no lower bound.
eq('monthly with no anchor lands anywhere', planLandsInMonth(monthly(null), '2026-03'), true);

// Quarterly beats every 3 months from the anchor, ACROSS a year boundary.
const quarterly: CostPlanWindow = {
  cadence: 'quarterly',
  startedOn: '2026-02-10',
  endedOn: null,
};
eq('quarterly: anchor month', planLandsInMonth(quarterly, '2026-02'), true);
eq('quarterly: +1 month is a gap', planLandsInMonth(quarterly, '2026-03'), false);
eq('quarterly: +2 months is a gap', planLandsInMonth(quarterly, '2026-04'), false);
eq('quarterly: +3 months lands', planLandsInMonth(quarterly, '2026-05'), true);
eq('quarterly: +12 months lands', planLandsInMonth(quarterly, '2027-02'), true);
eq('quarterly: +11 months does not', planLandsInMonth(quarterly, '2027-01'), false);
eq('quarterly: +14 months lands (Feb + 3)', planLandsInMonth(quarterly, '2027-04'), false);
eq('quarterly: Nov 2026 lands (Feb + 9)', planLandsInMonth(quarterly, '2026-11'), true);

// Yearly lands in its anniversary month only.
const yearly: CostPlanWindow = {
  cadence: 'yearly',
  startedOn: '2026-09-30',
  endedOn: null,
};
eq('yearly: anchor month', planLandsInMonth(yearly, '2026-09'), true);
eq('yearly: the next month is a gap', planLandsInMonth(yearly, '2026-10'), false);
eq('yearly: eleven months on is a gap', planLandsInMonth(yearly, '2027-08'), false);
eq('yearly: the anniversary lands', planLandsInMonth(yearly, '2027-09'), true);

// THE refusal that matters: with no anchor there is no beat, so a non-monthly
// plan claims NO month rather than claiming every month — an eleven-month-long
// false "expected" list would train everyone to ignore it.
eq(
  'quarterly with no anchor claims nothing',
  planLandsInMonth({ cadence: 'quarterly', startedOn: null, endedOn: null }, '2026-05'),
  false,
);
eq(
  'yearly with no anchor claims nothing',
  planLandsInMonth({ cadence: 'yearly', startedOn: null, endedOn: null }, '2026-05'),
  false,
);

// Junk in, false out — never a throw on a page render.
eq('malformed month', planLandsInMonth(claude, 'nonsense'), false);
eq('month 13', planLandsInMonth(claude, '2026-13'), false);
eq('month 00', planLandsInMonth(claude, '2026-00'), false);

/* -------------------------------------------------------------------------- */
/* costPlanSchema                                                             */
/* -------------------------------------------------------------------------- */

const validPlan = {
  name: 'Claude Max',
  vendor: 'Anthropic',
  category: 'subscription' as const,
  cadence: 'monthly' as const,
  status: 'active' as const,
  expectedAmount: '299.60',
  billingDay: 23,
  startedOn: '2026-06-01',
  endedOn: '',
  note: '',
};

const parsedPlan = costPlanSchema.safeParse(validPlan);
eq('plan: the real Claude record parses', parsedPlan.success, true);
eq(
  'plan: 299.60 becomes 29960 cents through the ONE money door',
  parsedPlan.success ? parsedPlan.data.expectedCadCents : null,
  29960,
);

eq(
  'plan: a blank amount is allowed (usage-billed)',
  (() => {
    const r = costPlanSchema.safeParse({ ...validPlan, expectedAmount: '' });
    return r.success ? r.data.expectedCadCents : 'REFUSED';
  })(),
  undefined,
);

// The anchor refusal, scoped to the cadences that need it.
eq(
  'plan: monthly needs no start date',
  costPlanSchema.safeParse({ ...validPlan, startedOn: '' }).success,
  true,
);
for (const cadence of ['quarterly', 'yearly'] as const) {
  const r = costPlanSchema.safeParse({ ...validPlan, cadence, startedOn: '' });
  eq(
    `plan: ${cadence} without a start date is refused`,
    r.success ? null : Boolean(flattenCostIssues(r.error).startedOn),
    true,
  );
  eq(
    `plan: ${cadence} WITH a start date is accepted`,
    costPlanSchema.safeParse({ ...validPlan, cadence }).success,
    true,
  );
}

eq(
  'plan: end before start is refused',
  costPlanSchema.safeParse({ ...validPlan, endedOn: '2026-05-01' }).success,
  false,
);
eq(
  'plan: billing day 29 is refused (February)',
  costPlanSchema.safeParse({ ...validPlan, billingDay: 29 }).success,
  false,
);
eq(
  'plan: billing day 28 is accepted',
  costPlanSchema.safeParse({ ...validPlan, billingDay: 28 }).success,
  true,
);
eq(
  'plan: a negative amount is refused',
  costPlanSchema.safeParse({ ...validPlan, expectedAmount: '-10' }).success,
  false,
);
eq(
  'plan: an amount over the CAD ceiling is refused',
  costPlanSchema.safeParse({ ...validPlan, expectedAmount: '99999' }).success,
  false,
);
for (const bad of ['2026-02-30', '2026-13-01', '2026-04-31']) {
  eq(
    `plan: phantom date ${bad} refused`,
    costPlanSchema.safeParse({ ...validPlan, startedOn: bad }).success,
    false,
  );
}
eq(
  'plan: leap day accepted',
  costPlanSchema.safeParse({ ...validPlan, startedOn: '2028-02-29' }).success,
  true,
);

/* -------------------------------------------------------------------------- */
/* costEntrySchema                                                            */
/* -------------------------------------------------------------------------- */

const validEntry = {
  planId: '',
  month: '2026-06',
  chargedOn: '2026-06-23',
  name: 'Claude Max',
  vendor: 'Anthropic',
  category: 'subscription' as const,
  amount: '295.81',
  billedNote: '',
  invoiceRef: '',
  note: '',
};

const parsedEntry = costEntrySchema.safeParse(validEntry);
eq('entry: the real June charge parses', parsedEntry.success, true);
eq(
  'entry: 295.81 becomes 29581 cents — NOT the plan figure',
  parsedEntry.success ? parsedEntry.data.amountCadCents : null,
  29581,
);

// THE refusal: a charge filed under a month its own date isn't in silently
// moves money between two totals.
const mismatched = costEntrySchema.safeParse({ ...validEntry, month: '2026-07' });
eq(
  'entry: charge date outside the month is refused',
  mismatched.success ? null : Boolean(flattenCostIssues(mismatched.error).chargedOn),
  true,
);
eq(
  'entry: no charge date is fine (the month alone decides)',
  costEntrySchema.safeParse({ ...validEntry, chargedOn: '' }).success,
  true,
);

// An amount is never optional: the summable column has no "unknown" branch.
eq('entry: a blank amount is refused', costEntrySchema.safeParse({ ...validEntry, amount: '' }).success, false);
eq('entry: a zero amount is refused', costEntrySchema.safeParse({ ...validEntry, amount: '0' }).success, false);
eq('entry: junk amount is refused', costEntrySchema.safeParse({ ...validEntry, amount: 'lots' }).success, false);

eq(
  'entry: a malformed month is refused',
  costEntrySchema.safeParse({ ...validEntry, month: '2026-6', chargedOn: '' }).success,
  false,
);
eq(
  'entry: a non-uuid plan id is refused',
  costEntrySchema.safeParse({ ...validEntry, planId: 'claude' }).success,
  false,
);
eq(
  'entry: a real uuid plan id is accepted',
  costEntrySchema.safeParse({
    ...validEntry,
    planId: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  }).success,
  true,
);

// "Billed as" is free text and must never be parsed as money.
eq(
  'entry: "billed as" free text survives',
  (() => {
    const r = costEntrySchema.safeParse({ ...validEntry, billedNote: 'US$20.00' });
    return r.success ? r.data.billedNote : null;
  })(),
  'US$20.00',
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
