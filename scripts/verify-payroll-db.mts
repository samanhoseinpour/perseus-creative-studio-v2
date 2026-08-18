/**
 * Payroll database check — the real invoices, round-tripped through Neon.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/verify-payroll-db.mts
 *
 * scripts/check-payroll.mts proves the arithmetic in isolation. This proves the
 * DB layer under it, which is where the silent failures live:
 *
 *  - `bigint({ mode: 'number' })` really returns a JS number, not a string. A
 *    toman column that came back as "184800000" would compare, format, and sum
 *    wrongly in ways nothing would flag.
 *  - `coalesce(sum(...))::bigint` + `.mapWith(Number)` sums toman with no float
 *    drift.
 *  - The term-in-force rule (newest term effective on or before the month's LAST
 *    day) resolves Mahdi NP's mid-month start to the right salary.
 *  - The constraints bite: unique(run, member), unique(month), and the
 *    ON DELETE RESTRICT that stops a member with pay history being deleted.
 *  - Draft lines are invisible to the member-visible status filter.
 *
 * SAFE TO RE-RUN: everything it creates is prefixed 'ZZ-VERIFY-' and deleted in a
 * finally block, and it runs cleanup() on the way in too, so a crashed run leaves
 * nothing behind. It touches no row it did not create. Note neon-http has no
 * transactions, hence the prefix-and-sweep approach rather than a rollback.
 *
 * The fixtures are dated 2999, NOT the real invoice months, because
 * `payroll_runs.month` is globally UNIQUE and the 'ZZ-VERIFY-' tag lives in
 * `note` — which no constraint looks at. Seeding a run at a month payroll
 * actually uses collides with the real row and kills the script before a single
 * assertion runs. The year is the only thing that changes: June has 30 days and
 * July 31 in 2999 exactly as in 2026, so every figure below is still the real
 * invoice arithmetic.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, eq, inArray, lte, desc, sql } from 'drizzle-orm';

import {
  payrollMembers, payrollTerms, payrollRuns, payrollPayments, payrollEvents,
} from '@/db/schema';
import {
  parseRate, prorate, suggestPaid, costInCadCents, prorationForMonth,
  monthDayBounds, formatAmount,
} from '@/lib/payrollAmounts';
// The real constant, not four re-typed literals: if 'draft' were ever added to
// it, the member-visibility assertion below must fail rather than keep passing
// against a stale copy. (payrollQueries.ts can't be imported here — it is
// `server-only`, which throws outside the react-server condition.)
import { MEMBER_VISIBLE_STATUSES } from '@/lib/payrollStatus';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

let fails = 0;
const eq_ = (l: string, g: unknown, w: unknown) => {
  const ok = JSON.stringify(g) === JSON.stringify(w);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${l}  got=${JSON.stringify(g)}${ok ? '' : ` want=${JSON.stringify(w)}`}`);
};
const TAG = 'ZZ-VERIFY-';

async function cleanup() {
  const mine = await db.select({ id: payrollMembers.id })
    .from(payrollMembers).where(sql`${payrollMembers.displayName} like ${TAG + '%'}`);
  const ids = mine.map((m) => m.id);
  if (ids.length) {
    await db.delete(payrollEvents).where(inArray(payrollEvents.memberId, ids));
    await db.delete(payrollPayments).where(inArray(payrollPayments.memberId, ids));
    await db.delete(payrollTerms).where(inArray(payrollTerms.memberId, ids));
    await db.delete(payrollMembers).where(inArray(payrollMembers.id, ids));
  }
  await db.delete(payrollRuns).where(sql`${payrollRuns.note} = ${TAG + 'run'}`);
}

try {
  await cleanup();

  // --- members, exactly as the two invoices name them
  const people = [
    { name: TAG + 'Sajad', cur: 'CAD' as const, from: '2999-01-01', joined: null },
    { name: TAG + 'Mehdi', cur: 'CAD' as const, from: '2999-01-01', joined: null },
    { name: TAG + 'Saman', cur: 'CAD' as const, from: '2999-01-01', joined: null },
    { name: TAG + 'MahdiNP', cur: 'IRT' as const, from: '2999-07-19', joined: '2999-07-19' },
  ];
  const inserted = await db.insert(payrollMembers).values(
    people.map((p, i) => ({
      displayName: p.name, payCurrency: 'IRT' as const,
      joinedOn: p.joined, sortIndex: i * 10, selfViewEnabled: true,
    })),
  ).returning({ id: payrollMembers.id, displayName: payrollMembers.displayName });
  const byName = new Map(inserted.map((r) => [r.displayName, r.id]));
  eq_('4 members inserted', inserted.length, 4);

  // --- standing terms. June figures for the CAD trio; MahdiNP fixed in toman.
  const terms = [
    { name: TAG + 'Sajad', cur: 'CAD' as const, amt: 61000, from: '2999-06-01' },
    { name: TAG + 'Mehdi', cur: 'CAD' as const, amt: 69500, from: '2999-06-01' },
    { name: TAG + 'Saman', cur: 'CAD' as const, amt: 90000, from: '2999-06-01' },
    { name: TAG + 'MahdiNP', cur: 'IRT' as const, amt: 35_000_000, from: '2999-07-19' },
  ];
  await db.insert(payrollTerms).values(terms.map((t) => ({
    memberId: byName.get(t.name)!, effectiveFrom: t.from,
    anchorCurrency: t.cur, anchorAmount: t.amt, createdByName: 'verify',
  })));

  // *** THE bigint QUESTION: does 35,000,000 come back as a number or a string? ***
  const [mahdiTerm] = await db.select({ amt: payrollTerms.anchorAmount })
    .from(payrollTerms).where(eq(payrollTerms.memberId, byName.get(TAG + 'MahdiNP')!));
  eq_('bigint anchor_amount is a JS number', typeof mahdiTerm.amt, 'number');
  eq_('bigint value exact', mahdiTerm.amt, 35_000_000);

  // --- runs: June and July, each with its own canonical rate
  const junRate = parseRate('123300.001233')!;
  // The month's canonical rate, as recorded on the real July run...
  const julRate = parseRate('131999.260804')!;
  // ...and the different rate Saman's own wire was quoted at. Storing both is
  // the point: `the rate belongs to a payment, not a month` is the design's most
  // distinctive rule, and payroll_payments.rate_micro is the column that carries
  // it. Without a line override in this fixture that column is never written,
  // never read back, and never asserted anywhere against a database.
  const SAMAN_JUL_LINE_RATE = parseRate('131999.992608')!;
  const runs = await db.insert(payrollRuns).values([
    { month: '2999-06', rateMicro: junRate, invoiceRef: 'DCINV234292', note: TAG + 'run' },
    { month: '2999-07', rateMicro: julRate, invoiceRef: 'DCINV234648', note: TAG + 'run' },
  ]).returning({ id: payrollRuns.id, month: payrollRuns.month, rateMicro: payrollRuns.rateMicro });
  const runByMonth = new Map(runs.map((r) => [r.month, r]));
  eq_('bigint rate_micro is a JS number', typeof runByMonth.get('2999-07')!.rateMicro, 'number');
  eq_('rate_micro exact', runByMonth.get('2999-07')!.rateMicro, 131999260804);

  // --- termsInForce logic: which term governs 2999-07?
  const { last } = monthDayBounds('2999-07');
  const inForce = await db.select({
    memberId: payrollTerms.memberId, from: payrollTerms.effectiveFrom,
    amt: payrollTerms.anchorAmount, cur: payrollTerms.anchorCurrency,
  }).from(payrollTerms)
    .where(and(inArray(payrollTerms.memberId, [...byName.values()]), lte(payrollTerms.effectiveFrom, last)))
    .orderBy(desc(payrollTerms.effectiveFrom));
  const firstPer = new Map<string, typeof inForce[number]>();
  for (const r of inForce) if (!firstPer.has(r.memberId)) firstPer.set(r.memberId, r);
  eq_('MahdiNP July resolves to his Jul-19 term',
      firstPer.get(byName.get(TAG + 'MahdiNP')!)!.amt, 35_000_000);
  eq_('...and it is the toman-anchored one',
      firstPer.get(byName.get(TAG + 'MahdiNP')!)!.cur, 'IRT');

  // --- seed July exactly as startPayrollRun does, then assert against the invoice
  const julyInvoice: Record<string, number> = {
    [TAG + 'Mehdi']: 64_020_000, [TAG + 'Saman']: 184_800_000, [TAG + 'Sajad']: 55_440_000,
  };
  // July's actual per-member CAD (they changed from June)
  const julyAnchors: Record<string, number> = {
    [TAG + 'Mehdi']: 48500, [TAG + 'Saman']: 140000, [TAG + 'Sajad']: 42000,
  };
  const julyRows = [];
  for (const [name, id] of byName) {
    const member = people.find((p) => p.name === name)!;
    const basis = prorationForMonth('2999-07', member.joined, null);
    if (!basis) continue;
    const term = firstPer.get(id)!;
    const anchorStanding = julyAnchors[name] ?? term.amt;
    const anchorCur = term.cur;
    const anchor = prorate(anchorStanding, basis, anchorCur);
    // Saman's wire carried its OWN quoted rate — the per-payment override that
    // is the most distinctive rule in the design, and the only way this column
    // gets exercised at all.
    const lineRate = name.includes('Saman') ? SAMAN_JUL_LINE_RATE : null;
    const paid = suggestPaid(anchor, anchorCur, 'IRT', lineRate ?? julRate) ?? 0;
    const cost = costInCadCents(anchor, anchorCur, lineRate ?? julRate) ?? 0;
    julyRows.push({
      runId: runByMonth.get('2999-07')!.id, memberId: id, month: '2999-07',
      anchorCurrency: anchorCur, anchorAmount: anchor,
      paidCurrency: 'IRT' as const, paidAmount: paid, rateMicro: lineRate,
      // DCINV234648 is 2,335.00 against 2,305.00 of salary — exactly 30.00 of
      // fees, i.e. TWO wires. MahdiNP is toman-anchored and paid domestically:
      // no wire, so no fee. Charging him one would put a company cost inside a
      // salary line, the one thing the fee rule forbids.
      costCadCents: cost,
      feeCadCents: name.includes('Saman') || name.includes('MahdiNP') ? 0 : 1500,
      proratedDays: basis.full ? null : basis.days,
      monthDays: basis.full ? null : basis.monthDays,
      prorationNote: basis.reason, status: 'draft' as const,
    });
  }
  await db.insert(payrollPayments).values(julyRows);

  const back = await db.select({
    name: payrollMembers.displayName, anchor: payrollPayments.anchorAmount,
    paid: payrollPayments.paidAmount, cost: payrollPayments.costCadCents,
    fee: payrollPayments.feeCadCents, lineRate: payrollPayments.rateMicro,
    days: payrollPayments.proratedDays, note: payrollPayments.prorationNote,
  }).from(payrollPayments)
    .innerJoin(payrollMembers, eq(payrollMembers.id, payrollPayments.memberId))
    .where(eq(payrollPayments.month, '2999-07'));

  eq_('July has 4 lines', back.length, 4);
  eq_('paid_amount round-trips as a number', typeof back[0].paid, 'number');
  for (const r of back) {
    if (julyInvoice[r.name] !== undefined) {
      eq_(`invoice DCINV234648 · ${r.name.replace(TAG, '')}`, r.paid, julyInvoice[r.name]);
    }
  }
  const mahdi = back.find((r) => r.name === TAG + 'MahdiNP')!;
  eq_('MahdiNP July prorated to 14,680,000', mahdi.paid, 14_680_000);
  eq_('MahdiNP anchor prorated too', mahdi.anchor, 14_680_000);
  eq_('MahdiNP 13 of 31 days', mahdi.days, 13);
  eq_('MahdiNP proration reason recorded', mahdi.note, 'joined 2999-07-19');

  // --- the per-wire rate override: written, round-tripped, and NOT inherited
  const samanBack = back.find((r) => r.name === TAG + 'Saman')!;
  eq_('line rate_micro round-trips as a number', typeof samanBack.lineRate, 'number');
  eq_('line rate_micro exact (per-wire override)', samanBack.lineRate, 131999992608);
  eq_('a line without its own quote stores NULL, not the run rate',
      back.filter((r) => r.lineRate === null).length, 3);
  // Both rates land on the same delivered figure through the 5,000-toman step —
  // which is exactly why an override must be stored rather than inferred.
  eq_('override still reproduces the invoice line', samanBack.paid, 184_800_000);

  // --- July salary total must be the 2,305 CAD behind the invoice's 2,335
  const cadTrio = back.filter((r) => r.name !== TAG + 'MahdiNP');
  eq_('July CAD-trio salary = 2,305.00', formatAmount(cadTrio.reduce((s, r) => s + r.cost, 0), 'CAD'), 'CAD 2,305.00');
  // 2,335.00 - 2,305.00 = 30.00, i.e. two wires. The toman-anchored member has
  // no wire and must carry no fee.
  eq_('July wire fees = CAD 30.00', formatAmount(back.reduce((s, r) => s + r.fee, 0), 'CAD'), 'CAD 30.00');
  eq_('the toman-anchored member carries no wire fee',
      back.find((r) => r.name === TAG + 'MahdiNP')!.fee, 0);

  // --- bigint SUM aggregate: does coalesce(sum(...))::bigint map to a number?
  const [agg] = await db.select({
    paid: sql<number>`coalesce(sum(${payrollPayments.paidAmount}), 0)::bigint`.mapWith(Number),
    cost: sql<number>`coalesce(sum(${payrollPayments.costCadCents}), 0)::bigint`.mapWith(Number),
  }).from(payrollPayments).where(eq(payrollPayments.month, '2999-07'));
  eq_('bigint SUM maps to a number', typeof agg.paid, 'number');
  eq_('summed toman exact (no float drift)', agg.paid,
      64_020_000 + 184_800_000 + 55_440_000 + 14_680_000);

  // --- a draft must be invisible to the member, a sent line visible.
  // Flip exactly ONE of the four so the filter has something to exclude AND
  // something to admit: asserting 0 against four drafts passes no matter what
  // the filter does, since there is nothing it could have returned.
  await db.update(payrollPayments)
    .set({ status: 'sent' })
    .where(and(eq(payrollPayments.month, '2999-07'),
               eq(payrollPayments.memberId, byName.get(TAG + 'Mehdi')!)));
  const memberVisible = await db.select({ id: payrollPayments.id })
    .from(payrollPayments)
    .where(and(eq(payrollPayments.month, '2999-07'),
               inArray(payrollPayments.status, [...MEMBER_VISIBLE_STATUSES])));
  eq_('the member-visible filter admits the sent line', memberVisible.length, 1);
  const draftsLeft = await db.select({ id: payrollPayments.id })
    .from(payrollPayments)
    .where(and(eq(payrollPayments.month, '2999-07'),
               eq(payrollPayments.status, 'draft')));
  eq_('...and hides the three still in draft', draftsLeft.length, 3);
  eq_('MEMBER_VISIBLE_STATUSES excludes draft',
      (MEMBER_VISIBLE_STATUSES as readonly string[]).includes('draft'), false);

  // --- unique(run_id, member_id) blocks a double line
  let dup = false;
  try {
    await db.insert(payrollPayments).values(julyRows[0]);
  } catch { dup = true; }
  eq_('unique(run,member) blocks a duplicate line', dup, true);

  // --- unique(month) blocks a second run for the same month
  let dupRun = false;
  try {
    await db.insert(payrollRuns).values({ month: '2999-07', note: TAG + 'run' });
  } catch { dupRun = true; }
  eq_('unique(month) blocks a second run', dupRun, true);

  // --- ON DELETE RESTRICT protects a member with history
  let restricted = false;
  try {
    await db.delete(payrollMembers).where(eq(payrollMembers.id, byName.get(TAG + 'Saman')!));
  } catch { restricted = true; }
  eq_('member with pay history cannot be deleted', restricted, true);

  // --- multiple account-less payees allowed (unique user_id is NULLS DISTINCT)
  eq_('4 payees share a NULL user_id', inserted.length, 4);
} finally {
  await cleanup();
  // Count ONLY the fixtures, never whole tables: on a populated database a
  // table count is never 0, so "(all must be 0)" against one is a false alarm
  // that trains the operator to ignore the only line that matters here.
  const [{ n: leftMembers }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(payrollMembers).where(sql`${payrollMembers.displayName} like ${TAG + '%'}`);
  const [{ n: leftPay }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(payrollPayments)
    .where(sql`${payrollPayments.memberId} in (select id from payroll_members where display_name like ${TAG + '%'})`);
  const [{ n: leftRuns }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(payrollRuns).where(sql`${payrollRuns.note} = ${TAG + 'run'}`);
  const leaked = leftMembers + leftPay + leftRuns;
  console.log(
    `\nCLEANED — leftover ${TAG} rows: members=${leftMembers} payments=${leftPay} runs=${leftRuns}` +
      (leaked === 0 ? ' (clean)' : '  *** LEAK — remove these by hand ***'),
  );
  if (leaked > 0) fails++;
  await pool.end();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
