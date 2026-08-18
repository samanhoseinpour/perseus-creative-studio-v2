/**
 * Payroll self-check — the invoice fixtures, executable.
 *
 * Run:  node --import tsx scripts/check-payroll.mts
 *
 * Covers three things that have no other safety net: the money math
 * (payrollAmounts.ts), the form/action validation (payrollSchema.ts), and the
 * status matrix (payrollStatus.ts) — including the privacy-critical rules that a
 * draft never reaches a member and that only the owner or a payroll admin can
 * move a payment.
 *
 * There is no test runner in this repo (see CLAUDE.md), and payroll is the one
 * feature where a silent arithmetic regression would be both invisible and
 * expensive. So the two real Donya invoices Perseus was actually billed for are
 * pinned here as assertions:
 *
 *   DCINV234292 (2026-07-02, June pay)  — 4 lines, 2,573 CAD
 *   DCINV234648 (2026-07-28, July pay)  — 3 lines, 2,335 CAD
 *
 * plus Mahdi NP's prorated first month (joined 2026-07-19, 35,000,000 toman
 * standing, paid 14,680,000) and the growth decomposition the member view is
 * built on. If any assertion here fails, src/lib/payrollAmounts.ts no longer
 * reproduces money that really moved — fix the code, not the fixture.
 *
 * Note each invoice line carries its OWN quoted rate: the "Rate" column is
 * CAD-per-toman and "Inv. rate" is exactly its inverse. June's four lines ran
 * 123,300.00 to 123,376.06 toman/CAD, which is why a payment can override its
 * run's monthly rate.
 */
import {
  parseAmount, parseRate, formatAmount, formatAmountCompact, formatRate, formatPercent,
  suggestPaid, costInCadCents, prorationForMonth, prorate, daysInMonth,
  growthSplit, effectiveRateMicro, roundToGranularity,
} from '@/lib/payrollAmounts';
import {
  payrollTermSchema, payrollRunSchema, payrollPaymentSchema, payrollMemberSchema,
  flattenPayrollIssues,
} from '@/lib/payrollSchema';
import {
  checkTransition, availableTransitions, isMemberVisible, countsAsSpend,
} from '@/lib/payrollStatus';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

// ---- parsing
eq('parse CAD 1,400.00', parseAmount('1,400.00', 'CAD'), 140000);
eq('parse CAD 1400', parseAmount('1400', 'CAD'), 140000);
eq('parse IRT 184,800,000', parseAmount('184,800,000', 'IRT'), 184800000);
eq('parse IRT persian digits', parseAmount('۳۵٬۰۰۰٬۰۰۰', 'IRT'), 35000000);
eq('parse arabic-indic', parseAmount('٣٥٠٠٠٠٠٠', 'IRT'), 35000000);
eq('parse reject negative', parseAmount('-5', 'CAD'), null);
eq('parse reject junk', parseAmount('abc', 'CAD'), null);
eq('parse empty', parseAmount('', 'CAD'), null);
eq('parseRate 131,999.260804', parseRate('131,999.260804'), 131999260804);
eq('parseRate reject 0', parseRate('0'), null);

// ---- both invoices, line by line, each at its OWN quoted rate (the "Rate"
// column is CAD-per-toman; "Inv. rate" is exactly its inverse, per wire).
const R = (cadPerToman: number) => Math.round((1 / cadPerToman) * 1e6);
const invoiceLines: [string, number, number, number][] = [
  ['Jun Sajad  610', 61000, R(0.0000081101), 75215000],
  ['Jun Mehdi  695', 69500, R(0.0000081097), 85700000],
  ['Jun Aida   308', 30800, R(0.0000081053), 38000000],
  ['Jun Saman  900', 90000, R(0.0000081103), 110970000],
  ['Jul Mehdi  485', 48500, R(0.0000075758), 64020000],
  ['Jul Saman 1400', 140000, R(0.0000075757), 184800000],
  ['Jul Sajad  420', 42000, R(0.0000075758), 55440000],
];
for (const [label, cadCents, rate, want] of invoiceLines) {
  eq(`invoice ${label} CAD`, suggestPaid(cadCents, 'CAD', 'IRT', rate), want);
}
// July company cost off invoice DCINV234648: 2,305 CAD salary + 30 CAD fees
const julSalaryCents = 48500 + 140000 + 42000;
eq('Jul salary total CAD 2,305', julSalaryCents, 230500);
eq('Jul invoice total CAD 2,335', julSalaryCents + 3000, 233500);
const jun = R(0.0000081103);
const jul = R(0.0000075757);

// ---- Mahdi NP: toman-anchored, joined 2026-07-19, standing 35,000,000
eq('daysInMonth 2026-07', daysInMonth('2026-07'), 31);
eq('daysInMonth 2026-02', daysInMonth('2026-02'), 28);
eq('daysInMonth 2028-02 (leap)', daysInMonth('2028-02'), 29);
const b = prorationForMonth('2026-07', '2026-07-19', null)!;
eq('Mahdi Jul basis', { d: b.days, m: b.monthDays, full: b.full }, { d: 13, m: 31, full: false });
eq('Mahdi Jul prorated', prorate(35000000, b, 'IRT'), 14680000);
const bAug = prorationForMonth('2026-08', '2026-07-19', null)!;
eq('Mahdi Aug full', bAug.full, true);
eq('Mahdi Aug amount', prorate(35000000, bAug, 'IRT'), 35000000);
eq('pre-join month is null', prorationForMonth('2026-06', '2026-07-19', null), null);
// leaver: ended mid-month
const bEnd = prorationForMonth('2026-07', null, '2026-07-15')!;
eq('leaver Jul 1-15', { d: bEnd.days, full: bEnd.full }, { d: 15, full: false });

// ---- company cost for the toman-anchored member
eq('Mahdi Jul CAD cost ~111 CAD', Math.abs(costInCadCents(14680000, 'IRT', jul)! - 11121) <= 2, true);
eq('CAD anchor costs face value', costInCadCents(140000, 'CAD', jul), 140000);

// ---- CAD-only member (future Canadian hire): rate irrelevant
eq('CAD->CAD needs no rate', suggestPaid(140000, 'CAD', 'CAD', null), 140000);
eq('missing rate -> null', suggestPaid(140000, 'CAD', 'IRT', null), null);

// ---- growth split, Saman June -> July
const g = growthSplit(
  { anchorMinor: 90000, anchorCurrency: 'CAD', paidMinor: 110970000, rateMicro: jun, partial: false },
  { anchorMinor: 140000, anchorCurrency: 'CAD', paidMinor: 184800000, rateMicro: jul, partial: false },
);
eq('paidPct  +66.53', Number(g.paidPct!.toFixed(2)), 66.53);
eq('anchorPct +55.56', Number(g.anchorPct!.toFixed(2)), 55.56);
eq('ratePct   +7.06', Number(g.ratePct!.toFixed(2)), 7.06);
eq('split is exact', g.exact, true);
eq('not partial', g.partial, false);

// ---- growth split, Mahdi Jul(partial) -> Aug(full): toman anchor, no rate effect on him
const gm = growthSplit(
  { anchorMinor: 14680000, anchorCurrency: 'IRT', paidMinor: 14680000, rateMicro: jul, partial: true },
  { anchorMinor: 35000000, anchorCurrency: 'IRT', paidMinor: 35000000, rateMicro: parseRate('140000'), partial: false },
);
eq('Mahdi flagged partial', gm.partial, true);
eq('Mahdi anchorPct == paidPct', Number(gm.anchorPct!.toFixed(2)) === Number(gm.paidPct!.toFixed(2)), true);

// ---- no prior month
eq('no prev -> nulls', growthSplit(null, { anchorMinor: 1, anchorCurrency: 'CAD', paidMinor: 1, rateMicro: 1, partial: false }).paidPct, null);

// ---- effective per-line rate is derived and lands near the invoice's printed one
const effM = effectiveRateMicro(48500, 'CAD', 64020000, 'IRT')!;
eq('Jul Mehdi effective rate ~131,999.99', Math.abs(effM / 1e6 - 131999.99) < 0.02, true);

// ---- formatting
eq('fmt CAD', formatAmount(140000, 'CAD'), 'CAD 1,400.00');
eq('fmt IRT', formatAmount(184800000, 'IRT'), '184,800,000 toman');
eq('fmt compact IRT', formatAmountCompact(184800000, 'IRT'), '184.8M toman');
eq('fmt compact CAD', formatAmountCompact(140000, 'CAD'), '$1,400.00');
eq('fmt rate', formatRate(jul), '132,001.0032');
eq('fmt rate (Mehdi Jul)', formatRate(R(0.0000075758)), '131,999.2608');
eq('fmt pct +', formatPercent(66.5312), '+66.5%');
eq('fmt pct -', formatPercent(-3.21), '-3.2%');
eq('fmt pct 0', formatPercent(0), '0.0%');
eq('delivery rounds to 5k', roundToGranularity(14677419, 'IRT'), 14675000);
eq('proration rounds to 10k', roundToGranularity(14677419, 'IRT', 'proration'), 14680000);
eq('round CAD is exact', roundToGranularity(48500, 'CAD'), 48500);
eq('CAD proration is exact too', roundToGranularity(48500, 'CAD', 'proration'), 48500);


// ---------------------------------------------------------------- schemas
// term: string amount -> minor units
const t = payrollTermSchema.safeParse({ effectiveFrom: '2026-07-19', anchorCurrency: 'IRT', anchorAmount: '35,000,000', note: '' });
eq('term parses', t.success, true);
eq('term -> minor', t.success && t.data.anchorAmount, 35000000);
eq('term note undefined', t.success && t.data.note, undefined);

const tCad = payrollTermSchema.safeParse({ effectiveFrom: '2026-06-01', anchorCurrency: 'CAD', anchorAmount: '1,400.00', note: 'raise' });
eq('CAD term -> cents', tCad.success && tCad.data.anchorAmount, 140000);

// fat-finger: toman figure in a CAD field
const fat = payrollTermSchema.safeParse({ effectiveFrom: '2026-06-01', anchorCurrency: 'CAD', anchorAmount: '35000000', note: '' });
eq('fat-finger rejected', fat.success, false);
eq('...on the right field', !fat.success && Object.keys(flattenPayrollIssues(fat.error)), ['anchorAmount']);

// impossible date
eq('Feb 31 rejected', payrollTermSchema.safeParse({ effectiveFrom: '2026-02-31', anchorCurrency: 'CAD', anchorAmount: '10', note: '' }).success, false);

// run: optional rate
const r1 = payrollRunSchema.safeParse({ month: '2026-08', rate: '', invoiceRef: '', note: '' });
eq('run w/o rate', r1.success && r1.data.rateMicro, undefined);
const r2 = payrollRunSchema.safeParse({ month: '2026-07', rate: '131,999.260804', invoiceRef: 'DCINV234648', note: '' });
eq('run rate -> micro', r2.success && r2.data.rateMicro, 131999260804);
eq('run keeps invoiceRef', r2.success && r2.data.invoiceRef, 'DCINV234648');
eq('bad month rejected', payrollRunSchema.safeParse({ month: '2026-13', rate: '', invoiceRef: '', note: '' }).success, false);

// payment: no status field can sneak through the edit door
const p = payrollPaymentSchema.safeParse({
  anchorCurrency: 'CAD', anchorAmount: '485', paidCurrency: 'IRT', paidAmount: '64,020,000',
  rate: '131999.260804', feeCad: '15', prorationNote: '', wireRef: 'DCEWI80398', adminNote: '',
});
eq('payment parses', p.success, true);
eq('anchor cents', p.success && p.data.anchorAmount, 48500);
eq('paid toman', p.success && p.data.paidAmount, 64020000);
eq('fee cents', p.success && p.data.feeCadCents, 1500);
eq('per-line rate', p.success && p.data.rateMicro, 131999260804);
eq('NO status key', p.success && 'status' in p.data, false);

// unpaid draft line
const d = payrollPaymentSchema.safeParse({ anchorCurrency: 'CAD', anchorAmount: '420', paidCurrency: 'IRT', paidAmount: '', rate: '', feeCad: '', prorationNote: '', wireRef: '', adminNote: '' });
eq('draft paid=0', d.success && d.data.paidAmount, 0);
eq('draft rate undefined', d.success && d.data.rateMicro, undefined);
eq('draft fee 0', d.success && d.data.feeCadCents, 0);

// half-specified proration
const half = payrollPaymentSchema.safeParse({ anchorCurrency: 'IRT', anchorAmount: '14,680,000', paidCurrency: 'IRT', paidAmount: '', rate: '', feeCad: '', proratedDays: 13, prorationNote: '', wireRef: '', adminNote: '' });
eq('half proration rejected', half.success, false);
const both = payrollPaymentSchema.safeParse({ anchorCurrency: 'IRT', anchorAmount: '14,680,000', paidCurrency: 'IRT', paidAmount: '', rate: '', feeCad: '', proratedDays: 13, monthDays: 31, prorationNote: 'joined 2026-07-19', wireRef: '', adminNote: '' });
eq('both days ok', both.success, true);
const inverted = payrollPaymentSchema.safeParse({ anchorCurrency: 'IRT', anchorAmount: '1000', paidCurrency: 'IRT', paidAmount: '', rate: '', feeCad: '', proratedDays: 40, monthDays: 31, prorationNote: '', wireRef: '', adminNote: '' });
eq('days>month rejected', inverted.success, false);
eq('absurd fee rejected', payrollPaymentSchema.safeParse({ anchorCurrency: 'CAD', anchorAmount: '100', paidCurrency: 'CAD', paidAmount: '', rate: '', feeCad: '9999', prorationNote: '', wireRef: '', adminNote: '' }).success, false);

// member
const m = payrollMemberSchema.safeParse({ displayName: 'Mahdi NP', userId: '', status: 'active', joinedOn: '2026-07-19', endedOn: '', selfViewEnabled: true, payCurrency: 'IRT', notes: '' });
eq('member parses', m.success, true);
eq('blank userId -> undefined', m.success && m.data.userId, undefined);
eq('ended needs end date', payrollMemberSchema.safeParse({ displayName: 'X Y', userId: '', status: 'ended', joinedOn: '2026-01-01', endedOn: '', selfViewEnabled: true, payCurrency: 'IRT', notes: '' }).success, false);
eq('end before join rejected', payrollMemberSchema.safeParse({ displayName: 'X Y', userId: '', status: 'ended', joinedOn: '2026-05-01', endedOn: '2026-01-01', selfViewEnabled: true, payCurrency: 'IRT', notes: '' }).success, false);


// ---------------------------------------------------------------- status matrix
const ADMIN = { payrollAdmin: true, own: false };
const OWNER = { payrollAdmin: false, own: true };
const OTHER = { payrollAdmin: false, own: false };

eq('admin: draft -> sent', checkTransition('draft', 'sent', ADMIN).ok, true);
eq('member CANNOT send a draft', checkTransition('draft', 'sent', OWNER).ok, false);
eq('member confirms own sent', checkTransition('sent', 'received', OWNER).ok, true);
eq('stranger cannot confirm', checkTransition('sent', 'received', OTHER).ok, false);
eq('flag requires a note', (() => { const c = checkTransition('sent', 'flagged', OWNER); return c.ok && c.requiresNote; })(), true);
eq('confirm needs no note', (() => { const c = checkTransition('sent', 'received', OWNER); return c.ok && c.requiresNote; })(), false);
eq('admin may confirm on behalf', checkTransition('sent', 'received', ADMIN).ok, true);
eq('no draft -> received shortcut', checkTransition('draft', 'received', ADMIN).ok, false);
eq('member cannot void', checkTransition('received', 'void', OWNER).ok, false);
eq('admin may void received', checkTransition('received', 'void', ADMIN).ok, true);
eq('same status is a no-op', checkTransition('sent', 'sent', ADMIN).ok, false);
eq('member sees no draft actions', availableTransitions('draft', OWNER), []);
eq('member actions on sent', availableTransitions('sent', OWNER), ['received', 'flagged']);

// a draft must never reach a member; a sent one must
eq('draft hidden from member', isMemberVisible('draft'), false);
eq('sent visible to member', isMemberVisible('sent'), true);
eq('draft is not spend', countsAsSpend('draft'), false);
eq('void is not spend', countsAsSpend('void'), false);
eq('sent is spend', countsAsSpend('sent'), true);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
