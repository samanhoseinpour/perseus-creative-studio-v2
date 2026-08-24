/**
 * Seed the company-cost history the studio already has on file: the two tool
 * subscriptions it has been paying since payroll tracking began, and every
 * charge each one actually made from June 2026 onward.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed-costs.mts
 *   or: npm run db:seed-costs
 *
 * Requires migration 0030 (cost_plans + cost_entries) to be applied first.
 *
 * The figures are read off the vendors' own invoice pages and are EMBEDDED
 * here rather than typed into the UI, so the history is reproducible and the
 * one number that matters is impossible to lose: Claude's plan is CA$299.60 a
 * month, but JUNE WAS CHARGED CA$295.81 — a mid-cycle upgrade, which also
 * moved the billing date from the 27th to the 23rd. That gap between the plan
 * and the charge is the whole reason the two tables exist.
 *
 * Claude's April and May charges (CA$29.96, the pre-upgrade plan) are
 * deliberately NOT seeded: cost tracking starts in June to line up with
 * payroll, which is also why the plan carries started_on = 2026-06-01 — with
 * it, those months can never show up as "expected but not recorded".
 *
 * ChatGPT's history begins in July because that is where the vendor's own
 * transaction list begins. If a June charge turns up, add it in /admin/costs
 * rather than here; this seed is the starting point, not the record.
 *
 * Idempotent by design:
 *  - Plans match by (vendor, name). Missing → inserted. Present → SKIPPED
 *    entirely, so re-running never clobbers a price edit, a status flip, or
 *    a note somebody added.
 *  - Charges match by (plan, month). Present → SKIPPED and counted. Nothing
 *    is ever updated, and nothing is ever deleted.
 *  - Rows this seed doesn't know about are listed as strays, never removed —
 *    admin-added costs are expected the moment this ships.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import { costEntries, costPlans } from '@/db/schema';
import {
  isCostCadence,
  isCostCategory,
  isCostPlanStatus,
  planLandsInMonth,
  type CostCadence,
  type CostCategory,
  type CostPlanStatus,
} from '@/lib/costFields';
import { parseAmount } from '@/lib/payrollAmounts';

/** Who the seeded rows are attributed to. The column is NOT NULL and there is
 *  no user to hang this on — the same shape logSystemActivity uses. */
const SEEDED_BY = 'Seed script';

type SeedPlan = {
  name: string;
  vendor: string;
  category: CostCategory;
  cadence: CostCadence;
  status: CostPlanStatus;
  /** As typed on an invoice — parsed through the one money door below. */
  expected: string;
  billingDay: number;
  startedOn: string;
  note: string;
  /** month → what was ACTUALLY charged, with the invoice date. */
  charges: { month: string; chargedOn: string; amount: string }[];
};

const PLANS: SeedPlan[] = [
  {
    name: 'Claude',
    vendor: 'Anthropic',
    category: 'subscription',
    cadence: 'monthly',
    status: 'active',
    expected: '299.60',
    billingDay: 23,
    // Tracking starts in June, so this is the anchor — not the real sign-up
    // date, which was April on the smaller plan.
    startedOn: '2026-06-01',
    note: 'Upgraded mid-June 2026 — the billing date moved from the 27th to the 23rd, and June was prorated.',
    charges: [
      { month: '2026-06', chargedOn: '2026-06-23', amount: '295.81' },
      { month: '2026-07', chargedOn: '2026-07-23', amount: '299.60' },
      { month: '2026-08', chargedOn: '2026-08-23', amount: '299.60' },
    ],
  },
  {
    name: 'ChatGPT Plus',
    vendor: 'OpenAI',
    category: 'subscription',
    cadence: 'monthly',
    status: 'active',
    expected: '28.00',
    billingDay: 15,
    startedOn: '2026-07-01',
    note: '',
    charges: [
      { month: '2026-07', chargedOn: '2026-07-15', amount: '28.00' },
      { month: '2026-08', chargedOn: '2026-08-15', amount: '28.00' },
    ],
  },
];

// ── Validate the seed against its own rules before opening a connection ────
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
{
  const seen = new Set<string>();
  for (const p of PLANS) {
    const key = `${p.vendor}//${p.name}`;
    if (seen.has(key)) throw new Error(`duplicate plan ${key}`);
    seen.add(key);
    if (!isCostCategory(p.category)) throw new Error(`bad category on ${key}`);
    if (!isCostCadence(p.cadence)) throw new Error(`bad cadence on ${key}`);
    if (!isCostPlanStatus(p.status)) throw new Error(`bad status on ${key}`);
    if (p.billingDay < 1 || p.billingDay > 28) throw new Error(`bad billing day on ${key}`);
    if (!DAY_RE.test(p.startedOn)) throw new Error(`bad start date on ${key}`);
    if (parseAmount(p.expected, 'CAD') === null) throw new Error(`bad expected amount on ${key}`);

    const months = new Set<string>();
    for (const c of p.charges) {
      if (!MONTH_RE.test(c.month)) throw new Error(`bad month ${c.month} on ${key}`);
      if (months.has(c.month)) throw new Error(`duplicate month ${c.month} on ${key}`);
      months.add(c.month);
      if (!DAY_RE.test(c.chargedOn)) throw new Error(`bad charge date on ${key}`);
      // The same rule costSchema enforces: a charge filed under a month its
      // own date isn't in silently moves money between two totals.
      if (c.chargedOn.slice(0, 7) !== c.month) {
        throw new Error(`charge date ${c.chargedOn} is not in ${c.month} on ${key}`);
      }
      if (parseAmount(c.amount, 'CAD') === null) throw new Error(`bad amount on ${key} ${c.month}`);
      // Every seeded charge must fall in a month the plan actually bills in,
      // or the month screen would list it as still expected right beside it.
      if (!planLandsInMonth({ cadence: p.cadence, startedOn: p.startedOn, endedOn: null }, c.month)) {
        throw new Error(`${key} does not bill in ${c.month} — check started_on`);
      }
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { costPlans, costEntries } });

const existingPlans = await db.select().from(costPlans);
const existingEntries = await db.select().from(costEntries);
const planByKey = new Map(
  existingPlans.map((r) => [`${r.vendor.toLowerCase()}//${r.name.toLowerCase()}`, r]),
);
const entryKeys = new Set(
  existingEntries.filter((r) => r.planId).map((r) => `${r.planId}//${r.month}`),
);

let plansInserted = 0;
let plansSkipped = 0;
let chargesInserted = 0;
let chargesSkipped = 0;
const processedPlanIds = new Set<string>();

let sortIndex = 10;
for (const p of PLANS) {
  const key = `${p.vendor.toLowerCase()}//${p.name.toLowerCase()}`;
  let planId = planByKey.get(key)?.id ?? null;

  if (planId === null) {
    const [row] = await db
      .insert(costPlans)
      .values({
        name: p.name,
        vendor: p.vendor,
        category: p.category,
        cadence: p.cadence,
        status: p.status,
        expectedCadCents: parseAmount(p.expected, 'CAD'),
        billingDay: p.billingDay,
        startedOn: p.startedOn,
        note: p.note || null,
        sortIndex,
      })
      .returning({ id: costPlans.id });
    planId = row.id;
    plansInserted++;
    console.log(`+ plan  ${p.vendor} ${p.name}`);
  } else {
    plansSkipped++;
    console.log(`· plan  ${p.vendor} ${p.name} (already there — left alone)`);
  }
  processedPlanIds.add(planId);
  sortIndex += 10;

  for (const c of p.charges) {
    if (entryKeys.has(`${planId}//${c.month}`)) {
      chargesSkipped++;
      continue;
    }
    await db.insert(costEntries).values({
      planId,
      month: c.month,
      chargedOn: c.chargedOn,
      amountCadCents: parseAmount(c.amount, 'CAD')!,
      name: p.name,
      vendor: p.vendor,
      category: p.category,
      createdByName: SEEDED_BY,
    });
    chargesInserted++;
    console.log(`  + ${c.month}  CAD ${c.amount}`);
  }
}

// ── Strays — informational, never deleted ─────────────────────────────────
const plansNow = await db
  .select({ id: costPlans.id, name: costPlans.name, vendor: costPlans.vendor })
  .from(costPlans);
const strays = plansNow.filter((r) => !processedPlanIds.has(r.id));
if (strays.length) {
  console.log('\nCosts in the DB but not in this seed (admin-added, as expected):');
  for (const s of strays) console.log(`  - ${s.vendor} ${s.name}`);
}

console.log(
  `\ndone: plans inserted ${plansInserted}, skipped ${plansSkipped} ` +
    `(seed ${PLANS.length}, DB had ${existingPlans.length}); ` +
    `charges inserted ${chargesInserted}, skipped ${chargesSkipped} ` +
    `(seed ${PLANS.reduce((n, p) => n + p.charges.length, 0)})`,
);

await pool.end();
process.exit(0);
