import 'server-only';

import {
  adminListMembers,
  adminListLinkableAccounts,
  adminListMonthPayments,
  adminListRunMonths,
  adminMonthRollups,
  lastPaidByMember,
  latestRunRate,
  seedCandidates,
  termsInForce,
  type PayrollMemberRow,
  type PayrollTermRow,
} from '@/db/payrollQueries';
import {
  costMonthRollups,
  listCostMonths,
  listCostPlans,
  listMonthEntries,
  planIdsChargedIn,
  type CostPlanRow,
} from '@/db/costQueries';
import {
  buildCostPlansView,
  buildPlanOptions,
} from '@/components/Admin/costs/costData';
import type { LinkableAccount } from '@/components/Admin/payroll/MemberDialog';
import type {
  CostPlanItem,
  CostPlanOption,
} from '@/components/Admin/costs/types';
import {
  dayLabel,
  monthLabel,
  monthShortLabel,
} from '@/components/Admin/payroll/format';
import type {
  CommitmentItem,
  NotFiledItem,
  SpendBarRow,
  SpendTrendRow,
} from '@/components/Admin/spend/types';
import { monthTokenIn, shiftMonthToken } from '@/lib/calendar';
import {
  COST_CADENCE_LABELS,
  costCategoryLabel,
  costCategoryTone,
  monthlyRunRateCents,
  planLandsInMonth,
} from '@/lib/costFields';
import {
  costInCadCents,
  formatAmount,
  formatAmountCompact,
  formatAmountValue,
} from '@/lib/payrollAmounts';
import {
  COMMITMENT_KIND_LABELS,
  COMMITMENT_KIND_TONES,
  COMMITMENT_STATUS_LABELS,
  commitmentsTitle,
  compareCommitments,
  foldRunRate,
  memberCommitmentStatus,
  planCommitmentStatus,
  type RunRatePart,
} from '@/lib/spendFields';

/**
 * The Money section's view-model builders — the payrollData.ts / costData.ts
 * contract: every number leaves here as a STRING, so client components do no
 * money math and no date math (hydration-safe) and the figures on screen are
 * the figures the server computed.
 *
 * THIS MODULE COMPOSES; IT DOES NOT QUERY. Every read below goes through an
 * existing door — the `admin*` readers in payrollQueries.ts and the readers in
 * costQueries.ts. It issues no SQL of its own against the payroll tables, on
 * purpose: payroll's whole privacy design is the own-vs-admin projection split,
 * and a third projection opened here would route around it exactly the way a
 * search path would (which is why payroll is not in the ⌘K palette either).
 *
 * The section has two nouns and they are never added together:
 *
 *   Commitment — a recurring obligation as monthly CAD. A FORECAST.
 *   Outflow    — money that actually left in a month. A FACT.
 *
 * Both settle in CAD cents already (payroll_payments.cost_cad_cents and
 * cost_entries.amount_cad_cents were each built as "the one summable column"),
 * which is what makes this composition arithmetic-free at the seam: there is no
 * conversion to do, only addition of cents already sitting in a column.
 *
 * Money math still belongs to src/lib/payrollAmounts.ts, and the cadence
 * division to src/lib/costFields.ts. Nothing here parses or formats an amount
 * by hand.
 */

export const SPEND_TREND_MONTHS = 12;

/** The trailing N calendar months ending at `month`, NEWEST first. */
function trailingMonths(month: string, count = SPEND_TREND_MONTHS): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonthToken(month, -i));
}

/** Bar widths scaled to the biggest row, with a 2% floor so a sliver shows. */
function scaleBars(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => {
    if (max <= 0 || v <= 0) return 0;
    return Math.max(2, Math.round((v / max) * 100));
  });
}

/** '+12.4% vs July 2026' / 'same as July 2026' / null when there is no prior
 *  figure to compare against (the costData.ts helper, same wording). */
function deltaHint(
  now: number,
  before: number,
  prevLabel: string,
): string | null {
  if (before <= 0) return null;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 0.05) return `same as ${prevLabel}`;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs ${prevLabel}`;
}

const cad = (cents: number) => formatAmount(cents, 'CAD');

/** '—' for an unknown figure, never '$0.00'. The one place that decision is
 *  made, so no caller can accidentally render a null as free. */
const cadOrDash = (cents: number | null) => (cents === null ? '—' : cad(cents));

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/* -------------------------------------------------------------------------- */
/* Commitments — the forecast half                                            */
/* -------------------------------------------------------------------------- */

/** Which halves the viewer is entitled to. Resolved by requireCommitments(). */
export type SpendAccess = { people: boolean; plans: boolean };

/** A commitment reduced to what the fold and the sort need. */
type RawCommitment = RunRatePart & { name: string };

/**
 * A member's monthly cost to the company in CAD cents, or null when it cannot
 * be known.
 *
 * Null has two causes and both must STAY null rather than becoming zero: no
 * standing salary on record, and a toman-anchored salary with no exchange rate
 * anywhere in the payroll history. `costInCadCents` already returns null for
 * the second (a CAD anchor short-circuits and needs no rate at all), so the
 * "omit, never zero" behaviour is inherited rather than reimplemented here.
 */
function rawMember(
  member: PayrollMemberRow,
  term: PayrollTermRow | null,
  rateMicro: number | null,
): RawCommitment {
  return {
    status: memberCommitmentStatus(member.status),
    monthlyCadCents: term
      ? costInCadCents(term.anchorAmount, term.anchorCurrency, rateMicro)
      : null,
    name: member.displayName,
  };
}

/** A plan's monthly figure — its cadence divided by costFields.ts, which
 *  already returns null for a usage-billed plan with no expected amount. */
function rawPlan(row: CostPlanRow): RawCommitment {
  return {
    status: planCommitmentStatus(row.status),
    monthlyCadCents: monthlyRunRateCents(row.cadence, row.expectedCadCents),
    name: row.name,
  };
}

/** Why a member's monthly figure reads as it does. Null only when the figure
 *  is a plain face value with no forecasting behind it (a CAD anchor). */
function memberMonthlyNote(
  term: PayrollTermRow | null,
  rate: { month: string; rateMicro: number } | null,
): string | null {
  if (!term) return 'no salary set';
  if (term.anchorCurrency === 'CAD') return null;
  return rate ? `at the ${monthLabel(rate.month)} rate` : 'needs a rate';
}

/**
 * The raw ingredients every Money surface needs, read through existing doors.
 *
 * `termsInForce` resolves every member's current term in a SINGLE query — the
 * reason the merged roster is not the N+1 that /admin/payroll/members was (one
 * `listMemberTerms` per member, and on neon-http each is its own HTTPS round
 * trip). Each half is read only when its grant is held: an ungated read is a
 * wasted round trip AND a figure fetched for someone not entitled to it.
 */
async function readCommitmentParts(tz: string, access: SpendAccess) {
  const month = monthTokenIn(tz);

  const [members, rate, plans] = await Promise.all([
    access.people ? adminListMembers() : Promise.resolve([]),
    access.people ? latestRunRate() : Promise.resolve(null),
    access.plans ? listCostPlans() : Promise.resolve([]),
  ]);

  const terms = access.people
    ? await termsInForce(
        members.map((m) => m.id),
        month,
      )
    : new Map<string, PayrollTermRow>();

  const raws: RawCommitment[] = [
    ...members.map((m) => rawMember(m, terms.get(m.id) ?? null, rate?.rateMicro ?? null)),
    ...plans.map(rawPlan),
  ];

  return { month, members, terms, rate, plans, raws };
}

/** How the run-rate reads, given a fold. One phrasing, so the spend tile and
 *  the roster footer can never word the same number differently. */
function runRateStrings(fold: ReturnType<typeof foldRunRate>) {
  return {
    runRateLabel: fold.cents > 0 ? cad(fold.cents) : '—',
    runRateReading:
      fold.unpriced > 0
        ? `across ${fold.priced} priced, ${fold.unpriced} without a figure`
        : `across ${plural(fold.priced, 'active commitment', 'active commitments')}`,
  };
}

/** The sentence that stops a forecast reading as a fact. Null when no
 *  toman-anchored salary is active and the rate played no part at all. */
function rateNoteFor(
  members: PayrollMemberRow[],
  terms: Map<string, PayrollTermRow>,
  rate: { month: string; rateMicro: number } | null,
): string | null {
  const tomanActive = members.some(
    (m) =>
      memberCommitmentStatus(m.status) === 'active' &&
      terms.get(m.id)?.anchorCurrency === 'IRT',
  );
  if (!tomanActive) return null;
  return rate
    ? `Toman salaries are shown at the ${monthLabel(rate.month)} rate — a forecast, not a settled figure.`
    : 'Toman salaries have no exchange rate on record yet, so they are left out of the run-rate rather than counted as nothing.';
}

function personCommitment(
  member: PayrollMemberRow,
  term: PayrollTermRow | null,
  rate: { month: string; rateMicro: number } | null,
  lastPaid: string | undefined,
): { item: CommitmentItem; cents: number | null } {
  const raw = rawMember(member, term, rate?.rateMicro ?? null);
  const meta = [
    member.joinedOn ? `Joined ${dayLabel(member.joinedOn)}` : 'No join date',
    member.endedOn ? `ended ${dayLabel(member.endedOn)}` : null,
    lastPaid ? `last paid ${monthLabel(lastPaid)}` : 'never paid',
    member.accountEmail ?? 'no linked account',
  ].filter(Boolean) as string[];

  return {
    cents: raw.monthlyCadCents,
    item: {
      kind: 'person',
      id: member.id,
      key: `person:${member.id}`,
      kindLabel: COMMITMENT_KIND_LABELS.person,
      kindTone: COMMITMENT_KIND_TONES.person,
      name: member.displayName,
      termLabel: term
        ? formatAmount(term.anchorAmount, term.anchorCurrency)
        : 'No standing salary',
      monthlyLabel: cadOrDash(raw.monthlyCadCents),
      monthlyNote: memberMonthlyNote(term, rate),
      status: raw.status,
      statusLabel: COMMITMENT_STATUS_LABELS[raw.status],
      metaLabel: meta.join(' · '),
      href: `/admin/payroll/${member.id}`,
      member: {
        id: member.id,
        displayName: member.displayName,
        userId: member.userId,
        status: member.status,
        joinedOn: member.joinedOn,
        endedOn: member.endedOn,
        selfViewEnabled: member.selfViewEnabled,
        payCurrency: member.payCurrency,
        notes: member.notes,
        sortIndex: member.sortIndex,
      },
    },
  };
}

function planCommitment(
  item: CostPlanItem,
  row: CostPlanRow,
): { item: CommitmentItem; cents: number | null } {
  const raw = rawPlan(row);
  const meta = [
    item.vendor,
    COST_CADENCE_LABELS[row.cadence],
    item.billingHint,
    item.charges === 0
      ? 'no charges yet'
      : `${plural(item.charges, 'charge', 'charges')}${item.lastChargeLabel ? `, last ${item.lastChargeLabel}` : ''}`,
  ].filter(Boolean) as string[];

  return {
    cents: raw.monthlyCadCents,
    item: {
      kind: 'plan',
      id: item.id,
      key: `plan:${item.id}`,
      kindLabel: COMMITMENT_KIND_LABELS.plan,
      kindTone: COMMITMENT_KIND_TONES.plan,
      name: item.name,
      termLabel: item.expectedLabel,
      monthlyLabel: cadOrDash(raw.monthlyCadCents),
      // A monthly plan's monthly figure IS its face value — no forecast, so no
      // note. Anything else is a billing period divided, and says so.
      monthlyNote:
        raw.monthlyCadCents === null
          ? 'amount varies'
          : row.cadence !== 'monthly'
            ? `${COST_CADENCE_LABELS[row.cadence].toLowerCase()} bill, spread`
            : null,
      status: raw.status,
      statusLabel: COMMITMENT_STATUS_LABELS[raw.status],
      metaLabel: meta.join(' · '),
      href: null,
      plan: item,
    },
  };
}

export type CommitmentsView = {
  /** Titled for what it actually shows — never a whole-sounding heading over
   *  half the data. See commitmentsTitle in spendFields.ts. */
  title: string;
  people: boolean;
  plans: boolean;
  items: CommitmentItem[];
  /** MemberDialog's account picker. Empty when the viewer has no payroll. */
  accounts: LinkableAccount[];
  runRateLabel: string;
  runRateReading: string;
  /** The rate the toman salaries were expressed at, spelled out — a forecast
   *  must never read as a settled figure. Null when it played no part. */
  rateNote: string | null;
  counts: { person: number; plan: number };
};

export async function buildCommitmentsView(
  tz: string,
  access: SpendAccess,
): Promise<CommitmentsView> {
  const { members, terms, rate, plans, raws } = await readCommitmentParts(
    tz,
    access,
  );

  const [accounts, lastPaid, planItems] = await Promise.all([
    access.people ? adminListLinkableAccounts() : Promise.resolve([]),
    access.people
      ? lastPaidByMember()
      : Promise.resolve(new Map<string, string>()),
    access.plans
      ? buildCostPlansView().then((v) => v.items)
      : Promise.resolve([] as CostPlanItem[]),
  ]);

  const planRows = new Map(plans.map((p) => [p.id, p]));
  const built = [
    ...members.map((m) =>
      personCommitment(m, terms.get(m.id) ?? null, rate, lastPaid.get(m.id)),
    ),
    ...planItems.flatMap((p) => {
      const row = planRows.get(p.id);
      return row ? [planCommitment(p, row)] : [];
    }),
  ];

  // Biggest monthly commitment first — that ordering IS the reason the two
  // lists were merged, since a person and a subscription only compare once they
  // share a sorted column. Sorted on the CENTS the row was built from, never on
  // its label, so an unknown figure sorts last instead of tying with a real
  // zero (and so two rows that happen to share a name can't swap figures).
  const items: CommitmentItem[] = built
    .sort((a, b) =>
      compareCommitments(
        { monthlyCadCents: a.cents, name: a.item.name },
        { monthlyCadCents: b.cents, name: b.item.name },
      ),
    )
    .map((b) => b.item);

  return {
    title: commitmentsTitle(access),
    people: access.people,
    plans: access.plans,
    items,
    accounts,
    ...runRateStrings(foldRunRate(raws)),
    rateNote: access.people ? rateNoteFor(members, terms, rate) : null,
    counts: { person: members.length, plan: planItems.length },
  };
}

/* -------------------------------------------------------------------------- */
/* Spend month — the fact half                                                */
/* -------------------------------------------------------------------------- */

export type SpendMonthView = {
  month: string;
  monthLabel: string;
  monthOptions: { value: string; label: string }[];
  currentMonth: string;
  tiles: {
    totalLabel: string;
    totalReading: string;
    totalHint: string | null;
    peopleLabel: string;
    peopleReading: string;
    toolsLabel: string;
    toolsReading: string;
    runRateLabel: string;
    runRateReading: string;
  };
  split: SpendBarRow[];
  trend: SpendTrendRow[];
  notFiled: NotFiledItem[];
  /** EntryDialog's plan picker, for filing a missing charge in place. */
  planOptions: CostPlanOption[];
  /** Draft payroll lines in this month — money not yet counted as gone. */
  draftCount: number;
  rateNote: string | null;
};

export async function buildSpendMonthView(
  tz: string,
  month: string,
): Promise<SpendMonthView> {
  const current = monthTokenIn(tz);
  const months = trailingMonths(month);
  const prev = shiftMonthToken(month, -1);
  const window = [...months, prev];

  // The commitment parts are read rather than the whole roster view: the
  // run-rate tile needs the fold, not the display rows, and buildCommitmentsView
  // would add four round trips (accounts, last-paid, charge stats, month list)
  // this screen has no use for. Both surfaces fold the SAME raws, so the two
  // pages cannot disagree about the number.
  const [
    payRollups,
    costRollups,
    entries,
    candidates,
    payments,
    charged,
    planOptions,
    costMonths,
    runMonths,
    parts,
  ] = await Promise.all([
    adminMonthRollups(window),
    costMonthRollups(window),
    listMonthEntries(month),
    seedCandidates(month),
    adminListMonthPayments(month),
    planIdsChargedIn(month),
    buildPlanOptions(),
    listCostMonths(),
    adminListRunMonths(),
    readCommitmentParts(tz, { people: true, plans: true }),
  ]);

  const here = payRollups.get(month);
  const peopleCents = here?.costCadCents ?? 0;
  const feeCents = here?.feeCadCents ?? 0;
  // Split the ledger by whether a plan stands behind the charge. `plan_id` is
  // nullable precisely so a one-off (a domain renewal, a hardware buy) is just
  // an entry — that nullability is what makes this a cost ledger rather than a
  // subscription tracker, so it earns its own line here.
  const planned = entries.filter((e) => e.planId !== null);
  const oneoffs = entries.filter((e) => e.planId === null);
  const toolsCents = planned.reduce((sum, e) => sum + e.amountCadCents, 0);
  const oneoffCents = oneoffs.reduce((sum, e) => sum + e.amountCadCents, 0);

  const total = peopleCents + feeCents + toolsCents + oneoffCents;
  const prevPay = payRollups.get(prev);
  const prevTotal =
    (prevPay?.costCadCents ?? 0) +
    (prevPay?.feeCadCents ?? 0) +
    (costRollups.get(prev)?.totalCadCents ?? 0);

  const splitSource = [
    {
      key: 'people',
      label: 'Salaries',
      cents: peopleCents,
      note: `${plural(here?.headcount ?? 0, 'person', 'people')} paid`,
    },
    {
      key: 'fee',
      label: 'Wire fees',
      cents: feeCents,
      note: 'company cost, outside salaries',
    },
    {
      key: 'tools',
      label: 'Recurring costs',
      cents: toolsCents,
      note: plural(planned.length, 'charge', 'charges'),
    },
    {
      key: 'oneoff',
      label: 'One-offs',
      cents: oneoffCents,
      note: plural(oneoffs.length, 'charge', 'charges'),
    },
  ];
  const splitWidths = scaleBars(splitSource.map((s) => s.cents));
  const split: SpendBarRow[] = splitSource.map((s, i) => ({
    key: s.key,
    label: s.label,
    valueLabel: s.cents > 0 ? cad(s.cents) : '—',
    pct: splitWidths[i],
    note: s.note,
  }));

  // The stacked trend: both segments scaled against the biggest month's TOTAL,
  // so a bar's whole width is that month's outflow and the seam inside it is
  // where the money went.
  const monthTotals = months.map((m) => {
    const pay = payRollups.get(m);
    const people = (pay?.costCadCents ?? 0) + (pay?.feeCadCents ?? 0);
    const tools = costRollups.get(m)?.totalCadCents ?? 0;
    return { month: m, people, tools, total: people + tools };
  });
  const maxTotal = Math.max(0, ...monthTotals.map((t) => t.total));
  const pctOf = (v: number) =>
    maxTotal <= 0 || v <= 0 ? 0 : Math.max(1, Math.round((v / maxTotal) * 100));
  const trend: SpendTrendRow[] = monthTotals.map((t, i) => ({
    key: t.month,
    label: monthShortLabel(t.month),
    valueLabel: t.total > 0 ? formatAmountCompact(t.total, 'CAD') : '—',
    peoplePct: pctOf(t.people),
    toolsPct: pctOf(t.tools),
    reading:
      t.total > 0
        ? `${monthLabel(t.month)}: ${cad(t.total)} — ${cad(t.people)} people, ${cad(t.tools)} running costs`
        : `${monthLabel(t.month)}: nothing recorded`,
    current: i === 0,
  }));

  // "Not filed yet" — payroll's missing members and costs' expected plans as
  // ONE list. This is the ergonomic that makes the screen worth opening: the
  // single place that says what this month is still waiting on.
  const have = new Set(payments.map((p) => p.memberId));
  const notFiled: NotFiledItem[] = [
    ...candidates
      .filter((c) => !have.has(c.member.id))
      .map(
        (c): NotFiledItem => ({
          kind: 'person',
          id: c.member.id,
          name: c.member.displayName,
          reason: !c.basis
            ? 'not on the payroll this month'
            : !c.term
              ? 'no standing salary set'
              : 'not added yet',
          href: `/admin/payroll?month=${month}`,
        }),
      ),
    ...parts.plans
      .filter(
        (p) =>
          p.status === 'active' &&
          !charged.has(p.id) &&
          planLandsInMonth(p, month),
      )
      .map(
        (p): NotFiledItem => ({
          kind: 'plan',
          id: p.id,
          name: p.name,
          vendor: p.vendor,
          category: p.category,
          categoryLabel: costCategoryLabel(p.category),
          categoryTone: costCategoryTone(p.category),
          expectedLabel:
            p.expectedCadCents === null
              ? 'amount varies'
              : cad(p.expectedCadCents),
          // Bare and ungrouped: the dialog binds it to a text input, and
          // "1,299.60" would not survive parseAmount's round trip as typed.
          expectedValue:
            p.expectedCadCents === null
              ? ''
              : formatAmountValue(p.expectedCadCents, 'CAD').replace(/,/g, ''),
          billingHint:
            p.billingDay === null ? null : `bills on day ${p.billingDay}`,
        }),
      ),
  ];

  // Months with activity on either side, plus the selected and current ones so
  // the switcher can always reach where you already are.
  const optionMonths = [
    ...new Set([...costMonths, ...runMonths, month, current]),
  ]
    // The selected month always survives, even if a ?month= deep link points
    // past today — the switcher's label must never name a month its own
    // dropdown can't show.
    .filter((m) => m <= current || m === month)
    .sort()
    .reverse()
    .slice(0, 24);

  const draftCount = here?.counts.draft ?? 0;

  return {
    month,
    monthLabel: monthLabel(month),
    monthOptions: optionMonths.map((m) => ({ value: m, label: monthLabel(m) })),
    currentMonth: current,
    tiles: {
      totalLabel: total > 0 ? cad(total) : '—',
      // The draft asymmetry, stated. Payroll excludes drafts from spend while a
      // cost entry has no status at all, so without this line the People figure
      // would not reconcile with /admin/payroll and would read as a bug.
      totalReading:
        draftCount > 0
          ? `${plural(draftCount, 'payroll draft', 'payroll drafts')} not counted yet`
          : 'salaries, fees and every bill',
      totalHint: deltaHint(total, prevTotal, monthLabel(prev)),
      peopleLabel: peopleCents > 0 ? cad(peopleCents) : '—',
      peopleReading:
        feeCents > 0
          ? `+ ${cad(feeCents)} in wire fees`
          : `${plural(here?.headcount ?? 0, 'person', 'people')} paid`,
      toolsLabel:
        toolsCents + oneoffCents > 0 ? cad(toolsCents + oneoffCents) : '—',
      toolsReading:
        oneoffCents > 0
          ? `${cad(oneoffCents)} of it one-off`
          : plural(entries.length, 'charge', 'charges'),
      ...runRateStrings(foldRunRate(parts.raws)),
    },
    split,
    trend,
    notFiled,
    planOptions,
    draftCount,
    rateNote: rateNoteFor(parts.members, parts.terms, parts.rate),
  };
}
