import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { costEntries, costPlans } from '@/db/schema';
import type {
  CostCadence,
  CostCategory,
  CostPlanStatus,
} from '@/lib/costFields';

/**
 * Read helpers for /admin/costs, mirroring payrollQueries.ts: one server-only
 * module so the query surface never reaches a client bundle. Writes live in
 * `_actions/costs.ts`.
 *
 * These helpers DON'T authorize — every caller gates with
 * requireArea('costs'). Unlike payroll there is no admin/own projection split,
 * because costs have exactly ONE audience: whoever holds the area sees every
 * column. That is the whole simplification, and it is why a search path or a
 * second reader can be added here later without routing around a privacy
 * mechanism the way one would in payroll.
 */

// Guard id-by-string reads so a malformed ?plan= returns "not found" rather
// than throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type CostPlanRow = {
  id: string;
  name: string;
  vendor: string;
  category: CostCategory;
  cadence: CostCadence;
  status: CostPlanStatus;
  expectedCadCents: number | null;
  billingDay: number | null;
  startedOn: string | null;
  endedOn: string | null;
  note: string | null;
  sortIndex: number;
  updatedAt: Date;
};

export type CostEntryRow = {
  id: string;
  planId: string | null;
  month: string;
  chargedOn: string | null;
  amountCadCents: number;
  name: string;
  vendor: string;
  category: CostCategory;
  billedNote: string | null;
  invoiceRef: string | null;
  note: string | null;
  createdByName: string;
  createdAt: Date;
};

const PLAN_COLUMNS = {
  id: costPlans.id,
  name: costPlans.name,
  vendor: costPlans.vendor,
  category: costPlans.category,
  cadence: costPlans.cadence,
  status: costPlans.status,
  expectedCadCents: costPlans.expectedCadCents,
  billingDay: costPlans.billingDay,
  startedOn: costPlans.startedOn,
  endedOn: costPlans.endedOn,
  note: costPlans.note,
  sortIndex: costPlans.sortIndex,
  updatedAt: costPlans.updatedAt,
};

const ENTRY_COLUMNS = {
  id: costEntries.id,
  planId: costEntries.planId,
  month: costEntries.month,
  chargedOn: costEntries.chargedOn,
  amountCadCents: costEntries.amountCadCents,
  name: costEntries.name,
  vendor: costEntries.vendor,
  category: costEntries.category,
  billedNote: costEntries.billedNote,
  invoiceRef: costEntries.invoiceRef,
  note: costEntries.note,
  createdByName: costEntries.createdByName,
  createdAt: costEntries.createdAt,
};

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

/** Active first, then paused, then cancelled; within a status, sort index then
 *  name. `cache()`d because the month screen and the roster both read it. */
export const listCostPlans = cache(async (): Promise<CostPlanRow[]> => {
  return db
    .select(PLAN_COLUMNS)
    .from(costPlans)
    .orderBy(
      sql`case ${costPlans.status} when 'active' then 0 when 'paused' then 1 else 2 end`,
      asc(costPlans.sortIndex),
      asc(costPlans.name),
    );
});

export const getCostPlan = cache(
  async (planId: string): Promise<CostPlanRow | null> => {
    if (!UUID_RE.test(planId)) return null;
    const [row] = await db
      .select(PLAN_COLUMNS)
      .from(costPlans)
      .where(eq(costPlans.id, planId))
      .limit(1);
    return row ?? null;
  },
);

/** The count behind the delete refusal. `cancelled` is the retirement path;
 *  this is what makes deletion refuse instead of orphaning spend history. */
export async function countPlanEntries(planId: string): Promise<number> {
  if (!UUID_RE.test(planId)) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(costEntries)
    .where(eq(costEntries.planId, planId));
  return row?.n ?? 0;
}

/** The months a plan has actually been charged in — the plan dialog's history. */
export async function listPlanEntries(
  planId: string,
  limit = 24,
): Promise<CostEntryRow[]> {
  if (!UUID_RE.test(planId)) return [];
  return db
    .select(ENTRY_COLUMNS)
    .from(costEntries)
    .where(eq(costEntries.planId, planId))
    .orderBy(desc(costEntries.month))
    .limit(limit);
}

/** Which plans already have a charge filed in this month — the input to the
 *  "expected but not recorded" list. One id set, not N queries. */
export async function planIdsChargedIn(month: string): Promise<Set<string>> {
  if (!MONTH_RE.test(month)) return new Set();
  const rows = await db
    .selectDistinct({ planId: costEntries.planId })
    .from(costEntries)
    .where(and(eq(costEntries.month, month), sql`${costEntries.planId} is not null`));
  return new Set(rows.map((r) => r.planId).filter((id): id is string => id !== null));
}

/* -------------------------------------------------------------------------- */
/* Entries                                                                    */
/* -------------------------------------------------------------------------- */

/** One month's ledger, biggest charge first — the month screen's table. */
export async function listMonthEntries(
  month: string,
): Promise<CostEntryRow[]> {
  if (!MONTH_RE.test(month)) return [];
  return db
    .select(ENTRY_COLUMNS)
    .from(costEntries)
    .where(eq(costEntries.month, month))
    .orderBy(desc(costEntries.amountCadCents), asc(costEntries.vendor));
}

export const getCostEntry = cache(
  async (entryId: string): Promise<CostEntryRow | null> => {
    if (!UUID_RE.test(entryId)) return null;
    const [row] = await db
      .select(ENTRY_COLUMNS)
      .from(costEntries)
      .where(eq(costEntries.id, entryId))
      .limit(1);
    return row ?? null;
  },
);

/** Every month that has at least one charge, newest first — the month picker.
 *  `month` is text 'YYYY-MM', so lexicographic order IS chronological order. */
export async function listCostMonths(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: costEntries.month })
    .from(costEntries)
    .orderBy(desc(costEntries.month));
  return rows.map((r) => r.month);
}

export type CostMonthRollup = {
  month: string;
  totalCadCents: number;
  entries: number;
};

/**
 * Per-month totals for the trend strip and the tiles. One round trip for the
 * whole range; `months` is a bounded window (12 or 13), never unbounded.
 *
 * Every requested month is PRE-SEEDED to zero, the adminMonthRollups idiom, so
 * a gap is structural rather than a missing key the caller has to remember to
 * default.
 */
export async function costMonthRollups(
  months: string[],
): Promise<Map<string, CostMonthRollup>> {
  const valid = months.filter((m) => MONTH_RE.test(m));
  if (valid.length === 0) return new Map();

  const rows = await db
    .select({
      month: costEntries.month,
      entries: sql<number>`count(*)::int`.mapWith(Number),
      total:
        sql<number>`coalesce(sum(${costEntries.amountCadCents}), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(costEntries)
    .where(inArray(costEntries.month, valid))
    .groupBy(costEntries.month);

  const out = new Map<string, CostMonthRollup>();
  for (const month of valid) {
    out.set(month, { month, totalCadCents: 0, entries: 0 });
  }
  for (const row of rows) {
    const bucket = out.get(row.month);
    if (!bucket) continue;
    bucket.totalCadCents = row.total;
    bucket.entries = row.entries;
  }
  return out;
}

export type CostCategoryTotal = {
  category: CostCategory;
  totalCadCents: number;
  entries: number;
};

/** Where one month's money went — the category split strip. */
export async function costCategoryTotals(
  month: string,
): Promise<CostCategoryTotal[]> {
  if (!MONTH_RE.test(month)) return [];
  const rows = await db
    .select({
      category: costEntries.category,
      entries: sql<number>`count(*)::int`.mapWith(Number),
      total:
        sql<number>`coalesce(sum(${costEntries.amountCadCents}), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(costEntries)
    .where(eq(costEntries.month, month))
    .groupBy(costEntries.category);

  return rows
    .map((r) => ({
      category: r.category as CostCategory,
      totalCadCents: r.total,
      entries: r.entries,
    }))
    .sort((a, b) => b.totalCadCents - a.totalCadCents);
}

/** Calendar-year total. `left(month, 4)` rather than a date range: `month` is a
 *  calendar KEY with no instant behind it, so no timezone is involved. */
export async function costYearTotalCents(year: number): Promise<number> {
  if (!Number.isInteger(year) || year < 2000 || year > 2099) return 0;
  const [row] = await db
    .select({
      total:
        sql<number>`coalesce(sum(${costEntries.amountCadCents}), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(costEntries)
    .where(sql`left(${costEntries.month}, 4) = ${String(year)}`);
  return row?.total ?? 0;
}

/** Every charge in a year, oldest month first — the CSV export's reader. */
export async function listYearEntries(year: number): Promise<CostEntryRow[]> {
  if (!Number.isInteger(year) || year < 2000 || year > 2099) return [];
  return db
    .select(ENTRY_COLUMNS)
    .from(costEntries)
    .where(sql`left(${costEntries.month}, 4) = ${String(year)}`)
    .orderBy(asc(costEntries.month), desc(costEntries.amountCadCents));
}

/** One-off costs in a month (no plan behind them), for the roster's footnote. */
export async function countPlanlessEntries(month: string): Promise<number> {
  if (!MONTH_RE.test(month)) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(costEntries)
    .where(and(eq(costEntries.month, month), isNull(costEntries.planId)));
  return row?.n ?? 0;
}

/** Next sort slot, in steps of 10 (the nextOpeningSort convention) so a plan
 *  can be dropped between two others without renumbering the roster. */
export async function nextCostPlanSort(): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${costPlans.sortIndex}), 0)::int`.mapWith(Number) })
    .from(costPlans);
  return (row?.max ?? 0) + 10;
}

export type CostPlanChargeStat = { charges: number; lastMonth: string | null };

/** Charge count + newest charged month for EVERY plan, in one round trip —
 *  the roster renders both per row and an N+1 here would be one HTTPS call per
 *  plan on neon-http. */
export async function costPlanChargeStats(): Promise<
  Map<string, CostPlanChargeStat>
> {
  const rows = await db
    .select({
      planId: costEntries.planId,
      charges: sql<number>`count(*)::int`.mapWith(Number),
      lastMonth: sql<string | null>`max(${costEntries.month})`,
    })
    .from(costEntries)
    .where(sql`${costEntries.planId} is not null`)
    .groupBy(costEntries.planId);

  const out = new Map<string, CostPlanChargeStat>();
  for (const row of rows) {
    if (!row.planId) continue;
    out.set(row.planId, { charges: row.charges, lastMonth: row.lastMonth });
  }
  return out;
}
