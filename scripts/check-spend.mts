/**
 * Money-section self-check — the composition layer's two refusals, executable.
 *
 * Run:  node --import tsx scripts/check-spend.mts    (no DB, no env)
 *
 * /admin/spend adds payroll and costs into one figure, and the two mistakes it
 * could make are both silent:
 *
 * 1. COERCING AN UNKNOWN FIGURE TO ZERO. A usage-billed tool, or a
 *    toman-anchored salary with no exchange rate on record, has no monthly CAD
 *    figure. `?? 0` would put "we don't know what this costs" into the one
 *    summable column as "this costs nothing" — the same trap sendPayrollRun
 *    exists to prevent on the payroll side and that costFields.ts documents on
 *    the costs side. foldRunRate must EXCLUDE and COUNT it instead, so the
 *    screen can admit the gap.
 *
 * 2. SHOWING A PARTIAL TOTAL UNDER A COMPLETE LABEL. The two money grants are
 *    separate on purpose, so cost visibility can be handed to someone without
 *    exposing a salary. A viewer holding one half must never be given a
 *    whole-sounding heading over that half — a misleading figure is worse than
 *    a missing one, and nothing on screen would reveal it.
 *
 * Both are pure leaves in src/lib/spendFields.ts precisely so they can be
 * pinned here (the taskPredicates.ts / costFields.ts precedent). There is no
 * test runner in this repo (see CLAUDE.md). Run this after touching
 * spendFields.ts or the spendData.ts folds.
 */
import {
  COMMITMENT_KINDS,
  COMMITMENT_KIND_TONES,
  COMMITMENT_STATUSES,
  COMMITMENT_STATUS_TONES,
  commitmentsTitle,
  compareCommitments,
  countsTowardCommitment,
  foldRunRate,
  isCommitmentKind,
  isCommitmentStatus,
  memberCommitmentStatus,
  planCommitmentStatus,
  type RunRatePart,
} from '@/lib/spendFields';
import { monthlyRunRateCents } from '@/lib/costFields';
import { costInCadCents } from '@/lib/payrollAmounts';

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

eq('two commitment kinds — a third would be a schema decision', [...COMMITMENT_KINDS], [
  'person',
  'plan',
]);
eq('one shared status vocabulary', [...COMMITMENT_STATUSES], [
  'active',
  'paused',
  'ended',
]);
eq('isCommitmentKind rejects junk', isCommitmentKind('vendor'), false);
eq('isCommitmentStatus rejects junk', isCommitmentStatus('cancelled'), false);

// The two domains keep their own stored vocabularies; these are projections
// for display and must never be written back.
eq('member "ended" projects to ended', memberCommitmentStatus('ended'), 'ended');
eq('member "active" projects to active', memberCommitmentStatus('active'), 'active');
eq(
  'an unknown member status degrades to active rather than throwing',
  memberCommitmentStatus('sabbatical'),
  'active',
);
eq('plan "paused" survives as paused', planCommitmentStatus('paused'), 'paused');
eq(
  'plan "cancelled" projects to ended — both mean "we stopped paying, history stays"',
  planCommitmentStatus('cancelled'),
  'ended',
);
eq('plan "active" projects to active', planCommitmentStatus('active'), 'active');

eq('only active counts toward the run-rate', countsTowardCommitment('active'), true);
eq('paused does not', countsTowardCommitment('paused'), false);
eq('ended does not', countsTowardCommitment('ended'), false);

// Tones are keys into fixed palettes, never computed strings (the Tailwind
// scanner cannot see a computed class name).
eq(
  'every kind has a tone',
  COMMITMENT_KINDS.every((k) => typeof COMMITMENT_KIND_TONES[k] === 'string'),
  true,
);
eq(
  'every status has a tone',
  COMMITMENT_STATUSES.every(
    (s) => typeof COMMITMENT_STATUS_TONES[s] === 'string',
  ),
  true,
);
eq(
  'no tone spends rose or amber (reserved for overdue / attention)',
  [
    ...Object.values(COMMITMENT_KIND_TONES),
    ...Object.values(COMMITMENT_STATUS_TONES),
  ].some((t) => t.includes('rose-') || t.includes('amber-')),
  false,
);

/* -------------------------------------------------------------------------- */
/* foldRunRate — the refusal that matters                                     */
/* -------------------------------------------------------------------------- */

const P = (
  status: RunRatePart['status'],
  monthlyCadCents: number | null,
): RunRatePart => ({ status, monthlyCadCents });

eq('an empty set folds to nothing', foldRunRate([]), {
  cents: 0,
  priced: 0,
  unpriced: 0,
});

eq(
  'active priced commitments add up',
  foldRunRate([P('active', 29_960), P('active', 43_100)]),
  { cents: 73_060, priced: 2, unpriced: 0 },
);

// THE refusal. An unknown figure is excluded and counted — never zero.
eq(
  'an unknown figure is EXCLUDED and COUNTED, never coerced to zero',
  foldRunRate([P('active', 29_960), P('active', null)]),
  { cents: 29_960, priced: 1, unpriced: 1 },
);
eq(
  'a set of nothing-but-unknowns is a run-rate of zero with the gap declared',
  foldRunRate([P('active', null), P('active', null)]),
  { cents: 0, priced: 0, unpriced: 2 },
);
// Guard against the specific regression: had `?? 0` been used, `priced` would
// count the unknown row too, and the reading would claim full coverage.
eq(
  'an unknown row never inflates the priced count',
  foldRunRate([P('active', null)]).priced,
  0,
);
eq(
  'NaN is treated as unknown, not as a number',
  foldRunRate([P('active', Number.NaN)]),
  { cents: 0, priced: 0, unpriced: 1 },
);

// Non-active commitments leave the forecast entirely — they stay on the roster,
// but they are not money we expect to keep spending.
eq(
  'paused and ended are out of the run-rate and out of both counts',
  foldRunRate([P('active', 10_000), P('paused', 50_000), P('ended', 90_000)]),
  { cents: 10_000, priced: 1, unpriced: 0 },
);
eq(
  'an unpriced PAUSED row is not counted as a gap — it is simply not in scope',
  foldRunRate([P('paused', null)]),
  { cents: 0, priced: 0, unpriced: 0 },
);

/* -------------------------------------------------------------------------- */
/* The seam: both halves really do arrive as CAD cents                        */
/* -------------------------------------------------------------------------- */

// This is the fact the whole composition rests on. If either of these ever
// stopped returning CAD cents, the spend total would silently add two
// different units.
const RATE = 123_376_060_000; // toman per CAD x 1e6, off the June 2026 invoice

eq(
  'a CAD-anchored salary costs its face value and needs no rate at all',
  costInCadCents(140_000, 'CAD', null),
  140_000,
);
eq(
  'a toman-anchored salary converts to CAD cents at the rate',
  costInCadCents(35_000_000, 'IRT', RATE),
  Math.round((35_000_000 * 100 * 1_000_000) / RATE),
);
eq(
  'a toman-anchored salary with NO rate is unknown, not free',
  costInCadCents(35_000_000, 'IRT', null),
  null,
);
eq(
  'a yearly plan is spread into a monthly figure',
  monthlyRunRateCents('yearly', 24_000),
  2_000,
);
eq(
  'a usage-billed plan contributes nothing rather than a guess',
  monthlyRunRateCents('monthly', null),
  null,
);

// End to end: one toman salary with no rate, one CAD salary, one yearly plan.
// The right answer is 1400.00 + 200.00/12, with the toman row declared missing.
eq(
  'a mixed roster with one unknown folds correctly',
  foldRunRate([
    P('active', costInCadCents(140_000, 'CAD', null)),
    P('active', costInCadCents(35_000_000, 'IRT', null)),
    P('active', monthlyRunRateCents('yearly', 24_000)),
  ]),
  { cents: 142_000, priced: 2, unpriced: 1 },
);

/* -------------------------------------------------------------------------- */
/* compareCommitments — the ordering the merge exists for                     */
/* -------------------------------------------------------------------------- */

const sorted = (rows: { monthlyCadCents: number | null; name: string }[]) =>
  [...rows].sort(compareCommitments).map((r) => r.name);

eq(
  'biggest monthly commitment first',
  sorted([
    { monthlyCadCents: 29_960, name: 'Claude' },
    { monthlyCadCents: 143_100, name: 'Mahdi' },
    { monthlyCadCents: 2_000, name: 'Notion' },
  ]),
  ['Mahdi', 'Claude', 'Notion'],
);
eq(
  'an unknown figure sorts LAST — it is not cheap, it is unknown',
  sorted([
    { monthlyCadCents: null, name: 'Ads account' },
    { monthlyCadCents: 100, name: 'Domain' },
  ]),
  ['Domain', 'Ads account'],
);
eq(
  'a real zero still outranks an unknown',
  sorted([
    { monthlyCadCents: null, name: 'Unknown' },
    { monthlyCadCents: 0, name: 'Free tier' },
  ]),
  ['Free tier', 'Unknown'],
);
eq(
  'equal figures fall back to name so the list stays scannable',
  sorted([
    { monthlyCadCents: 500, name: 'Zulip' },
    { monthlyCadCents: 500, name: 'Airtable' },
  ]),
  ['Airtable', 'Zulip'],
);
eq(
  'two unknowns are ordered by name rather than left arbitrary',
  sorted([
    { monthlyCadCents: null, name: 'Zapier' },
    { monthlyCadCents: null, name: 'Ads' },
  ]),
  ['Ads', 'Zapier'],
);

/* -------------------------------------------------------------------------- */
/* commitmentsTitle — a partial view never gets a whole-sounding label        */
/* -------------------------------------------------------------------------- */

eq(
  'both grants: the merged heading',
  commitmentsTitle({ people: true, plans: true }),
  'Commitments',
);
eq(
  'payroll only: named for the half it shows',
  commitmentsTitle({ people: true, plans: false }),
  'Payroll members',
);
eq(
  'costs only: named for the half it shows',
  commitmentsTitle({ people: false, plans: true }),
  'Recurring costs',
);
eq(
  'a single-grant viewer is never shown the merged heading',
  [
    commitmentsTitle({ people: true, plans: false }),
    commitmentsTitle({ people: false, plans: true }),
  ].includes('Commitments'),
  false,
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
