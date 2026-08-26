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
 * 3. TWO SCREENS QUOTING DIFFERENT TOTALS FOR ONE MONTH. /admin/spend's
 *    headline tile and the Overview's Money card both state a month's outflow,
 *    from the same two rollups but with different detail in hand: the page has
 *    the cost ledger split into planned charges and one-offs, the dashboard
 *    only has the month's total. foldOutflow takes both shapes and must return
 *    the SAME figure for the same money — otherwise the dashboard home
 *    contradicts the page it links to, and whichever a reader saw first is the
 *    one they will believe.
 *
 * All three are pure leaves in src/lib/spendFields.ts precisely so they can be
 * pinned here (the taskPredicates.ts / costFields.ts precedent). There is no
 * test runner in this repo (see CLAUDE.md). Run this after touching
 * spendFields.ts or the spendData.ts folds.
 */
import {
  COMMITMENT_KINDS,
  COMMITMENT_KIND_TONES,
  COMMITMENT_STATUSES,
  COMMITMENT_STATUS_TONES,
  OUTFLOW_BUCKETS,
  OUTFLOW_BUCKET_FILLS,
  OUTFLOW_BUCKET_LABELS,
  SPEND_LINE_CAP,
  VARIANCE_LEVEL_CENTS,
  commitmentsTitle,
  compareCommitments,
  countsTowardCommitment,
  foldLineCap,
  foldOutflow,
  foldRunRate,
  isCommitmentKind,
  isCommitmentStatus,
  memberCommitmentStatus,
  planCommitmentStatus,
  sharePct,
  spendVariance,
  trimTrailingEmpty,
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

/* -------------------------------------------------------------------------- */
/* Where-it-went lines                                                        */
/* -------------------------------------------------------------------------- */

// The month's aggregate bars say how much left; the lines under them say who
// and what. Three ways that can lie, all of them silent, all pinned here.

// 1. A SHARE THAT ISN'T ONE. Same refusal as foldRunRate, one level down: a
//    figure that cannot be stated is omitted, never printed as a zero.
eq('a share of the bucket', sharePct(1400_00, 2446_21), 57);
eq('an empty bucket has no denominator', sharePct(1400_00, 0), null);
eq('a zero row has no share', sharePct(0, 2446_21), null);
eq('sub-1% folds away rather than printing 0%', sharePct(10, 100_000), null);
eq('exactly 1% survives', sharePct(1_000, 100_000), 1);
eq('a row that is the whole bucket', sharePct(500, 500), 100);
eq('junk never reaches the page as a percentage', sharePct(NaN, 100), null);
eq(
  'shares of a real month add to about 100',
  [
    sharePct(1400_00, 2446_21),
    sharePct(700_00, 2446_21),
    sharePct(346_21, 2446_21),
  ].reduce((sum, p) => sum + (p ?? 0), 0),
  100,
);

// 2. A SILENT TRUNCATION. A capped list that doesn't say it was capped reads as
//    the whole of the bucket, which on a money screen is a wrong total. The
//    remainder must carry its AMOUNT so visible + hidden still reconciles.
eq('a list inside the cap is not folded', foldLineCap([5, 4, 3]), {
  visible: 3,
  hidden: 0,
  hiddenCents: 0,
});
eq('exactly at the cap is not folded', foldLineCap(Array(SPEND_LINE_CAP).fill(1)), {
  visible: SPEND_LINE_CAP,
  hidden: 0,
  hiddenCents: 0,
});
eq('one over the cap folds a single row', foldLineCap([...Array(SPEND_LINE_CAP).fill(10), 7]), {
  visible: SPEND_LINE_CAP,
  hidden: 1,
  hiddenCents: 7,
});
{
  const cents = [900, 800, 700, 600, 500, 400, 300, 200, 100, 50];
  const fold = foldLineCap(cents);
  const shown = cents.slice(0, fold.visible).reduce((a, b) => a + b, 0);
  eq(
    'visible rows plus the remainder still add to the bucket',
    shown + fold.hiddenCents,
    cents.reduce((a, b) => a + b, 0),
  );
  eq('the fold hides the SMALLEST rows, so the caller must sort first', fold.hiddenCents, 150);
}

// 3. A TREND THAT CLOSES A GAP. Trimming the oldest empty months is cosmetic;
//    dropping an empty month INSIDE the range would erase a real fact.
eq(
  'the oldest run of empty months goes',
  trimTrailingEmpty([500, 400, 300, 0, 0, 0], 3),
  3,
);
// Chosen so a "drop every empty month" implementation gives a DIFFERENT answer:
// two months have money, four rows survive. An earlier version of this case
// ([500, 0, 300, 0, 0] -> 3) could not tell the two apart, because the floor
// happened to land on the same number.
eq(
  'an empty month inside the range stays',
  trimTrailingEmpty([500, 0, 0, 300, 0, 0], 3),
  4,
);
eq(
  'interior zeros survive even with nothing trailing to trim',
  trimTrailingEmpty([500, 0, 0, 0, 300], 3),
  5,
);
eq('a full series is untouched', trimTrailingEmpty([5, 4, 3, 2, 1], 3), 5);
eq(
  'the floor holds when almost everything is empty',
  trimTrailingEmpty([100, 0, 0, 0, 0, 0], 3),
  3,
);
eq('an all-empty series still keeps the floor', trimTrailingEmpty([0, 0, 0, 0], 3), 3);
eq('a series shorter than the floor is left alone', trimTrailingEmpty([0], 3), 1);
eq('an empty series does not underflow', trimTrailingEmpty([], 3), 0);

/* -------------------------------------------------------------------------- */
/* Variance — a forecast beside a fact                                        */
/* -------------------------------------------------------------------------- */

// The section's founding rule is that a commitment and an outflow are never
// SUMMED. Comparing them is allowed and is the useful reading, so the shape of
// the comparison is what has to be pinned: a difference, signed by a word, and
// null wherever one side isn't there to compare against.
eq('under the committed run-rate', spendVariance(2_400_00, 2_600_00), {
  direction: 'below',
  diffCents: 200_00,
});
eq('over the committed run-rate', spendVariance(2_800_00, 2_600_00), {
  direction: 'above',
  diffCents: 200_00,
});
eq('a cent of rounding drift is level, not "above"', spendVariance(2_600_01, 2_600_00), {
  direction: 'level',
  diffCents: 0,
});
eq(
  'the level band is under a dollar either way',
  spendVariance(2_600_00 + VARIANCE_LEVEL_CENTS, 2_600_00)?.direction,
  'above',
);
eq('nothing committed: no comparison to state', spendVariance(2_400_00, 0), null);
eq('nothing spent: no comparison to state', spendVariance(0, 2_600_00), null);
eq('the diff is never negative — direction carries the sign', spendVariance(1, 500_00)?.diffCents, 499_99);
eq('junk never produces a variance', spendVariance(NaN, 2_600_00), null);

/* -------------------------------------------------------------------------- */
/* foldOutflow — one total, two input shapes                                  */
/* -------------------------------------------------------------------------- */

// The whole point: /admin/spend passes the cost ledger SPLIT (it holds the
// entries), the Overview passes it WHOLE (it holds only the rollup). The same
// money must produce the same total, or the dashboard home contradicts the page
// its own card links to.
const SPLIT = foldOutflow({
  peopleCents: 1_194_000,
  feeCents: 3_000,
  toolsCents: 200_000,
  oneoffCents: 41_200,
});
const WHOLE = foldOutflow({
  peopleCents: 1_194_000,
  feeCents: 3_000,
  toolsCents: 241_200,
  oneoffCents: null,
});
eq('the split ledger totals the month', SPLIT.totalCents, 1_438_200);
eq('the whole ledger reaches the same total', WHOLE.totalCents, SPLIT.totalCents);
eq('and the same bills figure', WHOLE.billsCents, SPLIT.billsCents);

// A caller holding no split must not be able to draw a "Recurring costs" bar
// over a figure that also contains one-offs — the flag is how it knows.
eq('a split ledger says so', SPLIT.billsSplit, true);
eq('an unsplit one admits it', WHOLE.billsSplit, false);
eq(
  'an unsplit ledger reports no one-offs rather than inventing them',
  WHOLE.cents.oneoff,
  0,
);

// A wire fee is company cost OUTSIDE anybody's salary. Folding it into the
// people figure would produce a salary total no payslip agrees with — so it
// stays its own bucket while still counting toward the month.
eq('the fee never joins the salary figure', SPLIT.cents.people, 1_194_000);
eq('but it does leave the company', SPLIT.totalCents - SPLIT.cents.fee, 1_435_200);

// Every bucket adds up, whichever way the ledger arrived.
eq(
  'the buckets reconcile with the total',
  OUTFLOW_BUCKETS.reduce((sum, k) => sum + SPLIT.cents[k], 0),
  SPLIT.totalCents,
);

eq('an empty month is zero, not a gap', foldOutflow({
  peopleCents: 0,
  feeCents: 0,
  toolsCents: 0,
  oneoffCents: null,
}).totalCents, 0);

eq('every bucket has a label', OUTFLOW_BUCKETS.every((k) => typeof OUTFLOW_BUCKET_LABELS[k] === 'string'), true);
eq('every bucket has a fill', OUTFLOW_BUCKETS.every((k) => typeof OUTFLOW_BUCKET_FILLS[k] === 'string'), true);
// Ink, never a hue: the admin theme carries no chroma of its own, and a bucket
// is a category, not a state — the one thing colour here would be carrying.
eq(
  'the ramp spends no colour',
  Object.values(OUTFLOW_BUCKET_FILLS).every((f) => f.startsWith('bg-foreground')),
  true,
);
// Four distinct shades, or two buckets are indistinguishable on the spine.
eq(
  'and no two buckets share a shade',
  new Set(Object.values(OUTFLOW_BUCKET_FILLS)).size,
  OUTFLOW_BUCKETS.length,
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
