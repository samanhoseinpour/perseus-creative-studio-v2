import type { CostPlanStatus } from '@/lib/costFields';

/**
 * The slim, serializable row shapes the costs client islands take — the
 * careers types.ts split, and for the same reason: costData.ts is
 * `server-only`, so the dialogs and the roster import their props from here
 * instead of from the builder.
 *
 * Every amount is either a pre-formatted LABEL or a bare, ungrouped VALUE the
 * dialog binds straight to a text input; no client ever holds cents or does
 * money math. Every date is a YYYY-MM-DD calendar key passed through as a
 * string, so nothing here needs `new Date()` in the browser. Optional columns
 * arrive as '' rather than null so an input can bind to them directly.
 */

export type CostEntryItem = {
  id: string;
  planId: string | null;
  name: string;
  vendor: string;
  category: string;
  categoryLabel: string;
  categoryTone: string;
  amountLabel: string;
  amountValue: string;
  month: string;
  chargedOn: string;
  chargedLabel: string | null;
  billedNote: string;
  invoiceRef: string;
  note: string;
  createdByName: string;
  /** Share of the month's total, e.g. '48%'. Null under 1%. */
  shareLabel: string | null;
};

/** An active plan that bills in the selected month with nothing recorded yet. */
export type CostExpectedItem = {
  planId: string;
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

export type CostPlanItem = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  categoryLabel: string;
  categoryTone: string;
  cadence: string;
  cadenceSuffix: string;
  status: CostPlanStatus;
  expectedValue: string;
  expectedLabel: string;
  /** The same figure expressed monthly, so a yearly plan is comparable. Null
   *  for a monthly plan, where it would just repeat the line above. */
  runRateLabel: string | null;
  billingDay: string;
  billingHint: string | null;
  startedOn: string;
  endedOn: string;
  note: string;
  charges: number;
  lastChargeLabel: string | null;
};

/** What the entry dialog's plan picker needs — never the whole plan. */
export type CostPlanOption = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  expectedValue: string;
};

/** What the "Add" button beside an expected plan seeds the dialog with. */
export type CostEntryPrefill = {
  planId: string;
  name: string;
  vendor: string;
  category: string;
  amount: string;
};
