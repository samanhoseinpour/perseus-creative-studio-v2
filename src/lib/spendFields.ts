/**
 * The client-safe vocabulary for the Money section (/admin/spend and its
 * commitments roster) — the two nouns the section is built on, their chip
 * tones, and the one fold that must never lie.
 *
 * Zero dependencies, like costFields.ts and taskTagFields.ts, so the merged
 * roster imports it without dragging zod or a server module into a client
 * chunk. There is no zod half: this section adds no writes of its own — every
 * edit goes through the existing payroll and costs actions, which keep their
 * own schemas, validation and audit rows.
 *
 * THE SECTION IS A COMPOSITION LAYER, NOT A THIRD DOMAIN. Two nouns, and the
 * difference between them is the whole design:
 *
 *   Commitment — a recurring obligation expressed as monthly CAD. A member's
 *                current term is one; a cost plan is one. A FORECAST.
 *   Outflow    — money that actually left in a given month. A payment line is
 *                one; a cost entry is one. A FACT.
 *
 * They are never summed together and never rendered as one figure. Mixing a
 * forecast into a ledger total is the single mistake this section could make
 * that nothing on screen would reveal.
 *
 * MONEY MATH IS NOT THIS MODULE'S JOB, the costFields.ts rule:
 * src/lib/payrollAmounts.ts stays the one door that parses, formats, converts
 * and prorates, and src/lib/costFields.ts owns the cadence division. The only
 * arithmetic here is addition of cents already in a column, in foldRunRate
 * below — which exists for its NULL handling, not its plus sign, and is pinned
 * by scripts/check-spend.mts.
 */

// ── Commitment kinds ────────────────────────────────────────────────────────

/**
 * What a commitment row is. Two kinds, because there are exactly two tables
 * behind them — a third would mean a third source of recurring obligation, and
 * that is a schema decision, not a label.
 */
export const COMMITMENT_KINDS = ['person', 'plan'] as const;

export type CommitmentKind = (typeof COMMITMENT_KINDS)[number];

export const COMMITMENT_KIND_LABELS: Record<CommitmentKind, string> = {
  person: 'Person',
  plan: 'Cost',
};

/**
 * Chip tints, one per kind. Literal class strings — Tailwind's scanner cannot
 * see a computed name. Deliberately avoids `rose` and `amber`, which the
 * dashboard spends on overdue / attention states elsewhere, and avoids the
 * category tints in costFields.ts so a kind chip and a category chip can sit
 * in the same row without reading as the same axis.
 */
export const COMMITMENT_KIND_TONES: Record<CommitmentKind, string> = {
  person:
    'bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  plan: 'bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
};

export function isCommitmentKind(value: unknown): value is CommitmentKind {
  return (
    typeof value === 'string' &&
    (COMMITMENT_KINDS as readonly string[]).includes(value)
  );
}

// ── Commitment status ───────────────────────────────────────────────────────

/**
 * ONE status vocabulary across both kinds, so the roster can offer one set of
 * filter chips over a mixed list. The two domains keep their own stored
 * vocabularies — this is a projection for display, never a written value:
 *
 *   member 'active'    -> active      plan 'active'    -> active
 *   member 'ended'     -> ended       plan 'paused'    -> paused
 *                                     plan 'cancelled' -> ended
 *
 * A member has no 'paused' and that is correct: someone is either on the
 * payroll or they are not. Nothing is invented to fill the gap.
 */
export const COMMITMENT_STATUSES = ['active', 'paused', 'ended'] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
};

/**
 * Status tints. Literal class strings, and deliberately quiet: a roster that
 * is mostly active should not be a wall of green, so `active` is the only one
 * that carries a hue at all and the two retired states share one neutral. As
 * elsewhere, `rose` and `amber` are reserved for the dashboard's overdue and
 * attention states and never spent here.
 */
export const COMMITMENT_STATUS_TONES: Record<CommitmentStatus, string> = {
  active:
    'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  paused:
    'bg-slate-500/12 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300',
  ended:
    'bg-slate-500/12 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300',
};

export function isCommitmentStatus(value: unknown): value is CommitmentStatus {
  return (
    typeof value === 'string' &&
    (COMMITMENT_STATUSES as readonly string[]).includes(value)
  );
}

/** Only an active commitment is money we expect to keep spending — the
 *  countsTowardRunRate rule in costFields.ts, read across both kinds. */
export function countsTowardCommitment(status: CommitmentStatus): boolean {
  return status === 'active';
}

/** Map a stored payroll member status onto the shared vocabulary. */
export function memberCommitmentStatus(status: string): CommitmentStatus {
  return status === 'ended' ? 'ended' : 'active';
}

/** Map a stored cost plan status onto the shared vocabulary. `cancelled`
 *  becomes `ended` — both mean "we have stopped paying for this, and its
 *  history stays exactly where it is". */
export function planCommitmentStatus(status: string): CommitmentStatus {
  if (status === 'paused') return 'paused';
  if (status === 'cancelled') return 'ended';
  return 'active';
}

// ── Outflow buckets ─────────────────────────────────────────────────────────

/**
 * How one month's outflow is split on the spend screen. `fee` is its own
 * bucket rather than part of `people` because a wire fee is company cost that
 * is NOT part of anybody's salary — folding it into the people figure would
 * make a salary total that no payslip agrees with.
 */
export const OUTFLOW_BUCKETS = ['people', 'fee', 'tools', 'oneoff'] as const;

export type OutflowBucket = (typeof OUTFLOW_BUCKETS)[number];

export const OUTFLOW_BUCKET_LABELS: Record<OutflowBucket, string> = {
  people: 'Salaries',
  fee: 'Wire fees',
  tools: 'Recurring costs',
  oneoff: 'One-offs',
};

// ── The fold ────────────────────────────────────────────────────────────────

/** The shape foldRunRate reads. Deliberately minimal — anything that has a
 *  status and a monthly figure can be folded, which is what lets the same
 *  function serve a people-only, plans-only, or mixed roster. */
export type RunRatePart = {
  status: CommitmentStatus;
  /** Monthly CAD cents, or NULL when it genuinely cannot be known — a
   *  usage-billed plan with no expected figure, or a toman-anchored salary
   *  with no exchange rate on record anywhere. */
  monthlyCadCents: number | null;
};

export type RunRateFold = {
  /** The run-rate itself: active commitments with a known monthly figure. */
  cents: number;
  /** How many active commitments contributed. */
  priced: number;
  /** How many active commitments could NOT contribute, because their monthly
   *  figure is unknown. Surfaced on screen: a forecast that silently omits a
   *  line is worse than one that admits it. */
  unpriced: number;
};

/**
 * Add active commitments into one monthly run-rate.
 *
 * The plus sign is not the point; the NULL handling is. A commitment with an
 * unknown monthly figure is EXCLUDED and COUNTED, never coerced to zero —
 * `?? 0` here would put "we don't know what this costs" into a summable column
 * as "this costs nothing", which is precisely the trap sendPayrollRun exists
 * to prevent on the payroll side and that costFields.ts documents on the costs
 * side. Same trap, one level up, so it gets its own pinned function.
 *
 * Non-active commitments (paused plans, ended members) are out entirely — they
 * are not money we expect to keep spending. They stay ON the roster; only the
 * forecast drops them.
 *
 * This is a FORECAST. It never touches cost_cad_cents or amount_cad_cents, and
 * nothing derived from it is ever written anywhere.
 */
export function foldRunRate(parts: RunRatePart[]): RunRateFold {
  let cents = 0;
  let priced = 0;
  let unpriced = 0;
  for (const part of parts) {
    if (!countsTowardCommitment(part.status)) continue;
    if (part.monthlyCadCents === null || !Number.isFinite(part.monthlyCadCents)) {
      unpriced += 1;
      continue;
    }
    cents += part.monthlyCadCents;
    priced += 1;
  }
  return { cents, priced, unpriced };
}

/**
 * The roster's order: biggest monthly commitment first, because that ordering
 * is the reason the two lists were merged at all — a person and a subscription
 * only compare once they are in one sorted column.
 *
 * Commitments with no known figure sort LAST rather than as zero (they are not
 * cheap, they are unknown), then alphabetically so the tail is still scannable.
 * Status does not participate: an ended member with a big salary belongs in the
 * conversation, and the status chip already says what it is.
 */
export function compareCommitments(
  a: { monthlyCadCents: number | null; name: string },
  b: { monthlyCadCents: number | null; name: string },
): number {
  const av = a.monthlyCadCents;
  const bv = b.monthlyCadCents;
  if (av === null && bv === null) return a.name.localeCompare(b.name);
  if (av === null) return 1;
  if (bv === null) return -1;
  if (av !== bv) return bv - av;
  return a.name.localeCompare(b.name);
}

/**
 * What the roster calls itself, given what the viewer is entitled to see.
 *
 * Titling follows the grant — "gated, not masked", applied to copy. A
 * costs-only viewer must never be shown a whole-sounding heading over half the
 * data, because a partial total under a complete label is a misleading figure,
 * which is worse than a missing one.
 */
export function commitmentsTitle(access: {
  people: boolean;
  plans: boolean;
}): string {
  if (access.people && access.plans) return 'Commitments';
  if (access.people) return 'Payroll members';
  return 'Recurring costs';
}
