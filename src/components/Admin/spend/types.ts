import type { MemberDialogMember } from '@/components/Admin/payroll/MemberDialog';
import type { CostPlanItem } from '@/components/Admin/costs/types';
import type { CommitmentKind, CommitmentStatus } from '@/lib/spendFields';

/**
 * The slim, serializable row shapes the Money section's client islands take —
 * the costs/types.ts split, and for the same reason: spendData.ts is
 * `server-only`, so the roster imports its props from here rather than from
 * the builder.
 *
 * Every amount is a pre-formatted LABEL; no client here ever holds cents or
 * does money math, and every date arrives as an already-formatted string, so
 * nothing needs `new Date()` in the browser.
 *
 * Note what a commitment row CARRIES: the exact payload each existing dialog
 * already expects. The merged roster mounts MemberDialog / TermDialog /
 * PlanDialog unchanged and never learns how to write anything itself — only
 * the LIST is merged, so every edit keeps its own action, its own validation
 * and its own audit row.
 */

type CommitmentBase = {
  /** The member id or the plan id — unique within its kind, and the two kinds
   *  are namespaced by `key` below for React and for deep links. */
  id: string;
  /** '<kind>:<id>' — a list key that stays unique across a merged list. */
  key: string;
  kind: CommitmentKind;
  kindLabel: string;
  kindTone: string;
  /** Who or what: a person's name, a plan's name. */
  name: string;
  /** The agreement in its own terms — "35,000,000 toman", "CA$299.60/mo". */
  termLabel: string;
  /** The comparable figure: monthly CAD, pre-formatted. '—' when unknown. */
  monthlyLabel: string;
  /**
   * Why the monthly figure reads as it does — "at August's rate" for a
   * toman-anchored salary, "amount varies" for a usage-billed plan, "needs a
   * rate" when nothing can be computed at all. Never omitted when the figure
   * is a forecast rather than a face value.
   */
  monthlyNote: string | null;
  status: CommitmentStatus;
  statusLabel: string;
  /** Second line: dates, vendor, last activity. */
  metaLabel: string;
  /** Optional deep link out to the domain's own detail page. */
  href: string | null;
};

/** A person we pay every month. Carries the member payload both payroll
 *  dialogs need, plus the currency TermDialog defaults to. */
export type PersonCommitment = CommitmentBase & {
  kind: 'person';
  member: MemberDialogMember;
};

/** A recurring cost. Carries the whole plan item, because PlanDialog edits
 *  every field on it. */
export type PlanCommitment = CommitmentBase & {
  kind: 'plan';
  plan: CostPlanItem;
};

/** A discriminated union so the roster's two row bodies are type-safe and a
 *  plan row can never be handed to a payroll dialog. */
export type CommitmentItem = PersonCommitment | PlanCommitment;

/** One bar in the spend screen's split or trend strips. */
export type SpendBarRow = {
  key: string;
  label: string;
  valueLabel: string;
  /** 0–100, scaled to the biggest row (2% floor so a sliver stays visible). */
  pct: number;
  current?: boolean;
  note?: string;
};

/**
 * One month in the combined trend. Two segments, both scaled to the same
 * maximum TOTAL, so the bar's overall width reads as the month's whole outflow
 * while the split inside it stays visible. One `pct` could not carry that.
 */
export type SpendTrendRow = {
  key: string;
  label: string;
  valueLabel: string;
  /** 0–100 of the biggest month's total. The two sum to the month's width. */
  peoplePct: number;
  toolsPct: number;
  /** Screen-reader text for the whole row — the bar is never the only carrier. */
  reading: string;
  current?: boolean;
};

/**
 * One thing the month is still waiting on — a person with no line yet, or a
 * plan that bills this month with no charge filed.
 *
 * The two halves keep different affordances because they are genuinely
 * different acts: a missing payroll line is created on the payroll screen
 * (it needs a rate and a run), while a missing charge is filed right here from
 * the plan's expected figure.
 */
export type NotFiledItem =
  | {
      kind: 'person';
      id: string;
      name: string;
      /** Why they are not in the month — "no standing salary", "not added yet". */
      reason: string;
      href: string;
    }
  | {
      kind: 'plan';
      id: string;
      name: string;
      vendor: string;
      category: string;
      categoryLabel: string;
      categoryTone: string;
      expectedLabel: string;
      /** '' when the plan is usage-billed and has no expected figure. */
      expectedValue: string;
      billingHint: string | null;
    };
