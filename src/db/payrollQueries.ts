import 'server-only';
import { cache } from 'react';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import {
  payrollEvents,
  payrollMembers,
  payrollPayments,
  payrollRuns,
  payrollTerms,
} from '@/db/schema';
import {
  monthDayBounds,
  prorationForMonth,
  type PayrollCurrency,
  type ProrationBasis,
} from '@/lib/payrollAmounts';
import { countsAsSpend, type PayrollPaymentStatus } from '@/lib/payrollStatus';

/**
 * Read helpers for /admin payroll, mirroring ticketQueries.ts: one server-only
 * module so the query surface never reaches a client bundle. Writes live in
 * `_actions/payroll.ts`.
 *
 * These helpers DON'T authorize — but they are split by audience, and that split
 * is the privacy mechanism rather than a convention:
 *
 *   admin*  — every column, every member. Callers gate with requirePayrollAdmin().
 *   own*    — ONE member's rows, scoped by a memberId the caller got from
 *             requireOwnPayroll() (i.e. from the session, never from a URL), and
 *             projected through OWN_PAYMENT_COLUMNS so cost, fees, wire refs, and
 *             internal notes are absent from the row object entirely. A field that
 *             was never selected can't leak through a spread, a log line, or a
 *             serialized RSC prop.
 *
 * Never widen an `own*` projection to reuse it for an admin screen; add an
 * `admin*` function instead.
 */

// Guard id-by-string reads so a malformed /admin/payroll/[memberId] URL returns
// "not found" instead of throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

/* -------------------------------------------------------------------------- */
/* Shared shapes                                                              */
/* -------------------------------------------------------------------------- */

export type PayrollMemberRow = {
  id: string;
  userId: string | null;
  displayName: string;
  status: 'active' | 'ended';
  joinedOn: string | null;
  endedOn: string | null;
  selfViewEnabled: boolean;
  payCurrency: PayrollCurrency;
  notes: string | null;
  sortIndex: number;
  /** Resolved from the linked account, when there is one. */
  accountEmail: string | null;
  accountName: string | null;
};

export type PayrollTermRow = {
  id: string;
  memberId: string;
  effectiveFrom: string;
  anchorCurrency: PayrollCurrency;
  anchorAmount: number;
  note: string | null;
  createdByName: string;
  createdAt: Date;
};

/** Everything about one line. Admin audience only. */
export type AdminPaymentRow = {
  id: string;
  runId: string;
  memberId: string;
  memberName: string;
  month: string;
  anchorCurrency: PayrollCurrency;
  anchorAmount: number;
  paidCurrency: PayrollCurrency;
  paidAmount: number;
  /** The line's own rate, null when it inherits the run's. */
  rateMicro: number | null;
  costCadCents: number;
  feeCadCents: number;
  proratedDays: number | null;
  monthDays: number | null;
  prorationNote: string | null;
  status: PayrollPaymentStatus;
  sentAt: Date | null;
  receivedAt: Date | null;
  nudgedAt: Date | null;
  wireRef: string | null;
  memberNote: string | null;
  adminNote: string | null;
};

/**
 * One line as its OWNER may see it. Note what is absent by construction:
 * costCadCents, feeCadCents, wireRef, adminNote, and the member's `notes`.
 *
 * `rateMicro` is present only when the rate actually determined their pay — i.e.
 * when the anchor and payout currencies differ. For a toman-anchored member the
 * rate played no part in their figure, and publishing it would hand them the
 * company's CAD cost basis (toman / rate) for nothing in return.
 */
export type OwnPaymentRow = {
  id: string;
  month: string;
  anchorCurrency: PayrollCurrency;
  anchorAmount: number;
  paidCurrency: PayrollCurrency;
  paidAmount: number;
  rateMicro: number | null;
  proratedDays: number | null;
  monthDays: number | null;
  prorationNote: string | null;
  status: PayrollPaymentStatus;
  sentAt: Date | null;
  receivedAt: Date | null;
  memberNote: string | null;
};

/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

const memberColumns = {
  id: payrollMembers.id,
  userId: payrollMembers.userId,
  displayName: payrollMembers.displayName,
  status: payrollMembers.status,
  joinedOn: payrollMembers.joinedOn,
  endedOn: payrollMembers.endedOn,
  selfViewEnabled: payrollMembers.selfViewEnabled,
  payCurrency: payrollMembers.payCurrency,
  notes: payrollMembers.notes,
  sortIndex: payrollMembers.sortIndex,
  accountEmail: user.email,
  accountName: user.name,
};

/** The whole roster, active first, then by the admin's sort order. */
export const adminListMembers = cache(async (): Promise<PayrollMemberRow[]> => {
  const rows = await db
    .select(memberColumns)
    .from(payrollMembers)
    .leftJoin(user, eq(user.id, payrollMembers.userId))
    .orderBy(
      asc(payrollMembers.status),
      asc(payrollMembers.sortIndex),
      asc(payrollMembers.displayName),
    );
  return rows as PayrollMemberRow[];
});

export const adminGetMember = cache(
  async (memberId: string): Promise<PayrollMemberRow | null> => {
    if (!UUID_RE.test(memberId)) return null;
    const [row] = await db
      .select(memberColumns)
      .from(payrollMembers)
      .leftJoin(user, eq(user.id, payrollMembers.userId))
      .where(eq(payrollMembers.id, memberId))
      .limit(1);
    return (row as PayrollMemberRow | undefined) ?? null;
  },
);

/**
 * The member row as its OWNER may see it — the two fields their own screens
 * actually render. Note what is absent by construction: `notes` (the payroll
 * admin's private notes ABOUT this person), the linked account's email, and the
 * roster's bookkeeping columns.
 *
 * This exists because the projection split only protects anything if the
 * member-facing builders use it. Reaching for adminGetMember on the member path
 * and then hand-picking two fields at the render site leaves the wide row in
 * scope, one careless spread away from publishing an admin's notes about a
 * member to that member.
 */
export type OwnMemberRow = {
  displayName: string;
  payCurrency: PayrollCurrency;
};

export const ownGetMember = cache(
  async (memberId: string): Promise<OwnMemberRow | null> => {
    if (!UUID_RE.test(memberId)) return null;
    const [row] = await db
      .select({
        displayName: payrollMembers.displayName,
        payCurrency: payrollMembers.payCurrency,
      })
      .from(payrollMembers)
      .where(eq(payrollMembers.id, memberId))
      .limit(1);
    return (row as OwnMemberRow | undefined) ?? null;
  },
);

/** Accounts with no payroll member row yet — the "link an account" picker. */
export const adminListLinkableAccounts = cache(
  async (): Promise<{ id: string; name: string; email: string }[]> => {
    return db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .leftJoin(payrollMembers, eq(payrollMembers.userId, user.id))
      .where(isNull(payrollMembers.id))
      .orderBy(asc(user.name));
  },
);

/* -------------------------------------------------------------------------- */
/* Terms                                                                      */
/* -------------------------------------------------------------------------- */

const termColumns = {
  id: payrollTerms.id,
  memberId: payrollTerms.memberId,
  effectiveFrom: payrollTerms.effectiveFrom,
  anchorCurrency: payrollTerms.anchorCurrency,
  anchorAmount: payrollTerms.anchorAmount,
  note: payrollTerms.note,
  createdByName: payrollTerms.createdByName,
  createdAt: payrollTerms.createdAt,
};

/**
 * One member's salary history as its OWNER may see it: when it changed and to
 * what, without the admin-authored `note` or the name of the admin who set it.
 */
export type OwnTermRow = {
  effectiveFrom: string;
  anchorCurrency: PayrollCurrency;
  anchorAmount: number;
};

export const ownListTerms = cache(
  async (memberId: string): Promise<OwnTermRow[]> => {
    if (!UUID_RE.test(memberId)) return [];
    const rows = await db
      .select({
        effectiveFrom: payrollTerms.effectiveFrom,
        anchorCurrency: payrollTerms.anchorCurrency,
        anchorAmount: payrollTerms.anchorAmount,
      })
      .from(payrollTerms)
      .where(eq(payrollTerms.memberId, memberId))
      .orderBy(desc(payrollTerms.effectiveFrom));
    return rows as OwnTermRow[];
  },
);

/** Every term for one member, newest first — the raise history. */
export const listMemberTerms = cache(
  async (memberId: string): Promise<PayrollTermRow[]> => {
    if (!UUID_RE.test(memberId)) return [];
    const rows = await db
      .select(termColumns)
      .from(payrollTerms)
      .where(eq(payrollTerms.memberId, memberId))
      .orderBy(desc(payrollTerms.effectiveFrom));
    return rows as PayrollTermRow[];
  },
);

/**
 * The standing term in force for each of `memberIds` during `month`.
 *
 * "In force" means the newest term effective on or before the month's LAST day,
 * not its first — a term starting mid-month governs that month, and proration
 * handles the part of it the member wasn't there for. That is the only reading
 * that reproduces Mahdi NP's July: his term starts 2026-07-19, and July must
 * resolve to it (35,000,000 toman) before being cut to 13/31.
 */
export async function termsInForce(
  memberIds: string[],
  month: string,
): Promise<Map<string, PayrollTermRow>> {
  if (memberIds.length === 0 || !MONTH_RE.test(month)) return new Map();
  const { last } = monthDayBounds(month);

  const rows = await db
    .select(termColumns)
    .from(payrollTerms)
    .where(
      and(
        inArray(payrollTerms.memberId, memberIds),
        lte(payrollTerms.effectiveFrom, last),
      ),
    )
    // Newest-first, so the first row seen per member is the one in force.
    .orderBy(desc(payrollTerms.effectiveFrom));

  const byMember = new Map<string, PayrollTermRow>();
  for (const row of rows as PayrollTermRow[]) {
    if (!byMember.has(row.memberId)) byMember.set(row.memberId, row);
  }
  return byMember;
}

/* -------------------------------------------------------------------------- */
/* Runs                                                                       */
/* -------------------------------------------------------------------------- */

export type PayrollRunRow = {
  id: string;
  month: string;
  rateMicro: number | null;
  invoiceRef: string | null;
  note: string | null;
  sentAt: Date | null;
  sentByName: string | null;
};

const runColumns = {
  id: payrollRuns.id,
  month: payrollRuns.month,
  rateMicro: payrollRuns.rateMicro,
  invoiceRef: payrollRuns.invoiceRef,
  note: payrollRuns.note,
  sentAt: payrollRuns.sentAt,
  sentByName: payrollRuns.sentByName,
};

async function readRun(month: string): Promise<PayrollRunRow | null> {
  if (!MONTH_RE.test(month)) return null;
  const [row] = await db
    .select(runColumns)
    .from(payrollRuns)
    .where(eq(payrollRuns.month, month))
    .limit(1);
  return row ?? null;
}

/** Request-deduped read for pages/layouts. */
export const adminGetRun = cache(readRun);

/**
 * Uncached read for server actions that read, write, then need to read again.
 * cache() memoizes per REQUEST, so a create-then-recover path calling the cached
 * variant twice would get the pre-insert answer the second time — which is
 * exactly the unique-violation recovery in startPayrollRun.
 */
export const adminGetRunFresh = readRun;

/** Months that have a run, newest first — the month switcher's options. */
export const adminListRunMonths = cache(async (): Promise<string[]> => {
  const rows = await db
    .select({ month: payrollRuns.month })
    .from(payrollRuns)
    .orderBy(desc(payrollRuns.month));
  return rows.map((r) => r.month);
});

/**
 * The newest month's exchange rate that anyone actually recorded, or null when
 * no run has ever carried one.
 *
 * Exists for the commitments roster, which has to express a toman-anchored
 * salary as monthly CAD so it can sit beside a subscription in one sorted
 * column. That is a FORECAST — the roster labels it with the month it came
 * from and never presents it as a settled figure — and a null here means the
 * member's monthly figure is OMITTED rather than shown as zero.
 *
 * It lives in this module rather than in the spend layer on purpose: the spend
 * layer composes payroll's existing readers and issues no SQL of its own
 * against payroll tables, so that the own-vs-admin projection split stays the
 * single place a payroll read can be widened. One scalar, one round trip.
 *
 * `month` is text 'YYYY-MM', so lexicographic ordering IS chronological.
 */
export const latestRunRate = cache(
  async (): Promise<{ month: string; rateMicro: number } | null> => {
    const [row] = await db
      .select({ month: payrollRuns.month, rateMicro: payrollRuns.rateMicro })
      .from(payrollRuns)
      .where(isNotNull(payrollRuns.rateMicro))
      .orderBy(desc(payrollRuns.month))
      .limit(1);
    return row?.rateMicro ? { month: row.month, rateMicro: row.rateMicro } : null;
  },
);

/* -------------------------------------------------------------------------- */
/* Payments — admin audience                                                  */
/* -------------------------------------------------------------------------- */

const ADMIN_PAYMENT_COLUMNS = {
  id: payrollPayments.id,
  runId: payrollPayments.runId,
  memberId: payrollPayments.memberId,
  memberName: payrollMembers.displayName,
  month: payrollPayments.month,
  anchorCurrency: payrollPayments.anchorCurrency,
  anchorAmount: payrollPayments.anchorAmount,
  paidCurrency: payrollPayments.paidCurrency,
  paidAmount: payrollPayments.paidAmount,
  rateMicro: payrollPayments.rateMicro,
  costCadCents: payrollPayments.costCadCents,
  feeCadCents: payrollPayments.feeCadCents,
  proratedDays: payrollPayments.proratedDays,
  monthDays: payrollPayments.monthDays,
  prorationNote: payrollPayments.prorationNote,
  status: payrollPayments.status,
  sentAt: payrollPayments.sentAt,
  receivedAt: payrollPayments.receivedAt,
  nudgedAt: payrollPayments.nudgedAt,
  wireRef: payrollPayments.wireRef,
  memberNote: payrollPayments.memberNote,
  adminNote: payrollPayments.adminNote,
};

/** Every line in one month, in roster order. */
export const adminListMonthPayments = cache(
  async (month: string): Promise<AdminPaymentRow[]> => {
    if (!MONTH_RE.test(month)) return [];
    const rows = await db
      .select(ADMIN_PAYMENT_COLUMNS)
      .from(payrollPayments)
      .innerJoin(
        payrollMembers,
        eq(payrollMembers.id, payrollPayments.memberId),
      )
      .where(eq(payrollPayments.month, month))
      .orderBy(
        asc(payrollMembers.sortIndex),
        asc(payrollMembers.displayName),
      );
    return rows as AdminPaymentRow[];
  },
);

/** One member's whole history, newest first. Admin audience. */
export const adminListMemberPayments = cache(
  async (memberId: string): Promise<AdminPaymentRow[]> => {
    if (!UUID_RE.test(memberId)) return [];
    const rows = await db
      .select(ADMIN_PAYMENT_COLUMNS)
      .from(payrollPayments)
      .innerJoin(
        payrollMembers,
        eq(payrollMembers.id, payrollPayments.memberId),
      )
      .where(eq(payrollPayments.memberId, memberId))
      .orderBy(desc(payrollPayments.month));
    return rows as AdminPaymentRow[];
  },
);

export const adminGetPayment = cache(
  async (paymentId: string): Promise<AdminPaymentRow | null> => {
    if (!UUID_RE.test(paymentId)) return null;
    const [row] = await db
      .select(ADMIN_PAYMENT_COLUMNS)
      .from(payrollPayments)
      .innerJoin(
        payrollMembers,
        eq(payrollMembers.id, payrollPayments.memberId),
      )
      .where(eq(payrollPayments.id, paymentId))
      .limit(1);
    return (row as AdminPaymentRow | undefined) ?? null;
  },
);

/* -------------------------------------------------------------------------- */
/* Payments — owner audience                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately narrower than ADMIN_PAYMENT_COLUMNS. Do not add to it: cost,
 * fees, wire refs, and internal notes are company data, and a column that is
 * never selected cannot leak.
 */
const OWN_PAYMENT_COLUMNS = {
  id: payrollPayments.id,
  month: payrollPayments.month,
  anchorCurrency: payrollPayments.anchorCurrency,
  anchorAmount: payrollPayments.anchorAmount,
  paidCurrency: payrollPayments.paidCurrency,
  paidAmount: payrollPayments.paidAmount,
  lineRateMicro: payrollPayments.rateMicro,
  runRateMicro: payrollRuns.rateMicro,
  proratedDays: payrollPayments.proratedDays,
  monthDays: payrollPayments.monthDays,
  prorationNote: payrollPayments.prorationNote,
  status: payrollPayments.status,
  sentAt: payrollPayments.sentAt,
  receivedAt: payrollPayments.receivedAt,
  memberNote: payrollPayments.memberNote,
};

type OwnPaymentSelect = {
  id: string;
  month: string;
  anchorCurrency: PayrollCurrency;
  anchorAmount: number;
  paidCurrency: PayrollCurrency;
  paidAmount: number;
  lineRateMicro: number | null;
  runRateMicro: number | null;
  proratedDays: number | null;
  monthDays: number | null;
  prorationNote: string | null;
  status: PayrollPaymentStatus;
  sentAt: Date | null;
  receivedAt: Date | null;
  memberNote: string | null;
};

/** Collapse the line/run rate pair, and withhold it when it didn't apply. */
function toOwnRow(row: OwnPaymentSelect): OwnPaymentRow {
  const { lineRateMicro, runRateMicro, ...rest } = row;
  const conversionApplied = row.anchorCurrency !== row.paidCurrency;
  return {
    ...rest,
    rateMicro: conversionApplied ? (lineRateMicro ?? runRateMicro) : null,
  };
}

/**
 * One member's own history, newest first — and ONLY statuses a member may see, so
 * a month still being drafted can't surface a half-typed figure.
 *
 * `memberId` must come from requireOwnPayroll(), i.e. from the session. The
 * equality lands in SQL rather than a post-filter, so an id mix-up returns
 * nothing instead of somebody else's pay.
 */
export const ownListPayments = cache(
  async (memberId: string): Promise<OwnPaymentRow[]> => {
    if (!UUID_RE.test(memberId)) return [];
    const rows = await db
      .select(OWN_PAYMENT_COLUMNS)
      .from(payrollPayments)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payrollPayments.runId))
      .where(
        and(
          eq(payrollPayments.memberId, memberId),
          // Never 'draft' — see MEMBER_VISIBLE_STATUSES.
          inArray(payrollPayments.status, [
            'sent',
            'received',
            'flagged',
            'void',
          ]),
        ),
      )
      .orderBy(desc(payrollPayments.month));
    return (rows as OwnPaymentSelect[]).map(toOwnRow);
  },
);

/** One of the owner's own months. Same scoping rules as ownListPayments. */
export const ownGetPayment = cache(
  async (memberId: string, month: string): Promise<OwnPaymentRow | null> => {
    if (!UUID_RE.test(memberId) || !MONTH_RE.test(month)) return null;
    const [row] = await db
      .select(OWN_PAYMENT_COLUMNS)
      .from(payrollPayments)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payrollPayments.runId))
      .where(
        and(
          eq(payrollPayments.memberId, memberId),
          eq(payrollPayments.month, month),
          inArray(payrollPayments.status, [
            'sent',
            'received',
            'flagged',
            'void',
          ]),
        ),
      )
      .limit(1);
    return row ? toOwnRow(row as OwnPaymentSelect) : null;
  },
);

/**
 * Ownership check for the status door — does this payment belong to this member,
 * and what state is it in? Returns null when the payment doesn't exist OR isn't
 * theirs; the caller cannot tell those apart, which is the point.
 */
export async function ownPaymentForUpdate(
  paymentId: string,
  memberId: string,
): Promise<{ id: string; status: PayrollPaymentStatus; month: string } | null> {
  if (!UUID_RE.test(paymentId) || !UUID_RE.test(memberId)) return null;
  const [row] = await db
    .select({
      id: payrollPayments.id,
      status: payrollPayments.status,
      month: payrollPayments.month,
    })
    .from(payrollPayments)
    .where(
      and(
        eq(payrollPayments.id, paymentId),
        eq(payrollPayments.memberId, memberId),
      ),
    )
    .limit(1);
  return (row as { id: string; status: PayrollPaymentStatus; month: string } | undefined) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Rollups                                                                    */
/* -------------------------------------------------------------------------- */

export type MonthRollup = {
  month: string;
  /** Company salary cost in CAD cents, excluding fees. */
  costCadCents: number;
  feeCadCents: number;
  /** Members paid (lines that represent money out). */
  headcount: number;
  rateMicro: number | null;
  /** Lines by status, for the "3 of 4 confirmed" progress line. */
  counts: Record<PayrollPaymentStatus, number>;
};

const EMPTY_COUNTS = (): Record<PayrollPaymentStatus, number> => ({
  draft: 0,
  sent: 0,
  received: 0,
  flagged: 0,
  void: 0,
});

/**
 * Per-month company totals for the trend strip and the stat tiles. One round trip
 * for the whole range; `months` is a bounded window (12 or 13), never unbounded.
 *
 * Draft and void lines are excluded from money totals (countsAsSpend) but still
 * counted in `counts`, so a month in preparation shows its progress without
 * inflating spend.
 */
export async function adminMonthRollups(
  months: string[],
): Promise<Map<string, MonthRollup>> {
  const valid = months.filter((m) => MONTH_RE.test(m));
  if (valid.length === 0) return new Map();

  const rows = await db
    .select({
      month: payrollPayments.month,
      status: payrollPayments.status,
      lines: sql<number>`count(*)::int`.mapWith(Number),
      cost: sql<number>`coalesce(sum(${payrollPayments.costCadCents}), 0)::bigint`.mapWith(
        Number,
      ),
      fee: sql<number>`coalesce(sum(${payrollPayments.feeCadCents}), 0)::bigint`.mapWith(
        Number,
      ),
    })
    .from(payrollPayments)
    .where(inArray(payrollPayments.month, valid))
    .groupBy(payrollPayments.month, payrollPayments.status);

  const rates = await db
    .select({ month: payrollRuns.month, rateMicro: payrollRuns.rateMicro })
    .from(payrollRuns)
    .where(inArray(payrollRuns.month, valid));
  const rateByMonth = new Map(rates.map((r) => [r.month, r.rateMicro]));

  const out = new Map<string, MonthRollup>();
  for (const month of valid) {
    out.set(month, {
      month,
      costCadCents: 0,
      feeCadCents: 0,
      headcount: 0,
      rateMicro: rateByMonth.get(month) ?? null,
      counts: EMPTY_COUNTS(),
    });
  }
  for (const row of rows) {
    const bucket = out.get(row.month);
    if (!bucket) continue;
    bucket.counts[row.status as PayrollPaymentStatus] = row.lines;
    if (countsAsSpend(row.status as PayrollPaymentStatus)) {
      bucket.costCadCents += row.cost;
      bucket.feeCadCents += row.fee;
      bucket.headcount += row.lines;
    }
  }
  return out;
}

export type YearTotals = {
  year: number;
  /** Totals per delivery currency — a member could switch mid-year. */
  paidByCurrency: Partial<Record<PayrollCurrency, number>>;
  anchorByCurrency: Partial<Record<PayrollCurrency, number>>;
  months: number;
};

/**
 * One member's calendar-year totals. Used by both audiences, so it selects only
 * amounts a member may see and no cost/fee columns at all.
 */
export async function memberYearTotals(
  memberId: string,
  year: number,
): Promise<YearTotals> {
  const empty: YearTotals = {
    year,
    paidByCurrency: {},
    anchorByCurrency: {},
    months: 0,
  };
  if (!UUID_RE.test(memberId) || !Number.isInteger(year)) return empty;

  const rows = await db
    .select({
      paidCurrency: payrollPayments.paidCurrency,
      anchorCurrency: payrollPayments.anchorCurrency,
      paid: sql<number>`coalesce(sum(${payrollPayments.paidAmount}), 0)::bigint`.mapWith(
        Number,
      ),
      anchor: sql<number>`coalesce(sum(${payrollPayments.anchorAmount}), 0)::bigint`.mapWith(
        Number,
      ),
      months: sql<
        string[]
      >`array_agg(distinct ${payrollPayments.month})`,
    })
    .from(payrollPayments)
    .where(
      and(
        eq(payrollPayments.memberId, memberId),
        gte(payrollPayments.month, `${year}-01`),
        lte(payrollPayments.month, `${year}-12`),
        inArray(payrollPayments.status, ['sent', 'received', 'flagged']),
      ),
    )
    .groupBy(payrollPayments.paidCurrency, payrollPayments.anchorCurrency);

  const totals = { ...empty };
  // `months` is counted across the whole year, NOT folded from the per-group
  // counts: count(distinct month) is scoped to its own (paid, anchor) group, so
  // a member who switched currency mid-year — the case YearTotals exists to
  // handle — produces two rows of 6 that a Math.max would report as 6 months.
  const monthsSeen = new Set<string>();
  for (const row of rows) {
    const pc = row.paidCurrency as PayrollCurrency;
    const ac = row.anchorCurrency as PayrollCurrency;
    totals.paidByCurrency[pc] = (totals.paidByCurrency[pc] ?? 0) + row.paid;
    totals.anchorByCurrency[ac] =
      (totals.anchorByCurrency[ac] ?? 0) + row.anchor;
    for (const m of row.months) monthsSeen.add(m);
  }
  totals.months = monthsSeen.size;
  return totals;
}

/** Years this member has any visible pay in, newest first — the year picker. */
export async function memberPayYears(memberId: string): Promise<number[]> {
  if (!UUID_RE.test(memberId)) return [];
  const rows = await db
    .selectDistinct({
      year: sql<string>`left(${payrollPayments.month}, 4)`,
    })
    .from(payrollPayments)
    .where(
      and(
        eq(payrollPayments.memberId, memberId),
        inArray(payrollPayments.status, ['sent', 'received', 'flagged', 'void']),
      ),
    );
  return rows
    .map((r) => Number(r.year))
    .filter((y) => Number.isInteger(y))
    .sort((a, b) => b - a);
}

/**
 * The newest month each member has actually been paid for. The roster's
 * "last paid" line, which is how a member who was silently missed gets spotted.
 */
export async function lastPaidByMember(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      memberId: payrollPayments.memberId,
      month: sql<string>`max(${payrollPayments.month})`,
    })
    .from(payrollPayments)
    .where(inArray(payrollPayments.status, ['sent', 'received', 'flagged']))
    .groupBy(payrollPayments.memberId);
  return new Map(rows.map((r) => [r.memberId, r.month]));
}

/* -------------------------------------------------------------------------- */
/* Seeding a month                                                            */
/* -------------------------------------------------------------------------- */

export type SeedCandidate = {
  member: PayrollMemberRow;
  term: PayrollTermRow | null;
  /** Null when they weren't on the payroll during the month at all. */
  basis: ProrationBasis | null;
};

/**
 * Who belongs in `month`, with the term in force and their proration basis —
 * everything "Start this month" needs to write draft lines.
 *
 * A member is a candidate when their join/end window overlaps the month, which is
 * why an ended member still appears in their final month and an unstarted hire
 * doesn't appear early.
 */
export async function seedCandidates(month: string): Promise<SeedCandidate[]> {
  if (!MONTH_RE.test(month)) return [];
  const { first, last } = monthDayBounds(month);

  const rows = await db
    .select(memberColumns)
    .from(payrollMembers)
    .leftJoin(user, eq(user.id, payrollMembers.userId))
    .where(
      and(
        // Started on or before the month ended…
        or(isNull(payrollMembers.joinedOn), lte(payrollMembers.joinedOn, last)),
        // …and hadn't left before it began.
        or(isNull(payrollMembers.endedOn), gte(payrollMembers.endedOn, first)),
      ),
    )
    .orderBy(asc(payrollMembers.sortIndex), asc(payrollMembers.displayName));

  const members = rows as PayrollMemberRow[];
  const terms = await termsInForce(
    members.map((m) => m.id),
    month,
  );

  return members.map((member) => ({
    member,
    term: terms.get(member.id) ?? null,
    basis: prorationForMonth(month, member.joinedOn, member.endedOn),
  }));
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

export type PayrollEventRow = {
  id: string;
  kind: 'created' | 'updated' | 'status' | 'note' | 'deleted';
  actorName: string;
  memberName: string;
  month: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
};

/** One line's audit trail. Admin audience — payloads carry amounts. */
export const adminListPaymentEvents = cache(
  async (paymentId: string, limit = 50): Promise<PayrollEventRow[]> => {
    if (!UUID_RE.test(paymentId)) return [];
    const rows = await db
      .select({
        id: payrollEvents.id,
        kind: payrollEvents.kind,
        actorName: payrollEvents.actorName,
        memberName: payrollEvents.memberName,
        month: payrollEvents.month,
        payload: payrollEvents.payload,
        createdAt: payrollEvents.createdAt,
      })
      .from(payrollEvents)
      .where(eq(payrollEvents.paymentId, paymentId))
      .orderBy(desc(payrollEvents.createdAt))
      .limit(limit);
    return rows as PayrollEventRow[];
  },
);

/** Recent payroll activity across everyone. Admin audience. */
export const adminRecentEvents = cache(
  async (limit = 30): Promise<PayrollEventRow[]> => {
    const rows = await db
      .select({
        id: payrollEvents.id,
        kind: payrollEvents.kind,
        actorName: payrollEvents.actorName,
        memberName: payrollEvents.memberName,
        month: payrollEvents.month,
        payload: payrollEvents.payload,
        createdAt: payrollEvents.createdAt,
      })
      .from(payrollEvents)
      .orderBy(desc(payrollEvents.createdAt))
      .limit(limit);
    return rows as PayrollEventRow[];
  },
);

/* -------------------------------------------------------------------------- */
/* Cron support                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Payments sent before `before` that nobody has confirmed and nobody has been
 * nudged about — the daily reminder's work list. Joined to the account so a
 * member without a login (or with self-view off) is never emailed about a
 * dashboard they can't open.
 */
export async function listUnconfirmedForNudge(before: Date): Promise<
  {
    paymentId: string;
    month: string;
    email: string;
    name: string;
  }[]
> {
  const rows = await db
    .select({
      paymentId: payrollPayments.id,
      month: payrollPayments.month,
      email: user.email,
      name: user.name,
    })
    .from(payrollPayments)
    .innerJoin(payrollMembers, eq(payrollMembers.id, payrollPayments.memberId))
    .innerJoin(user, eq(user.id, payrollMembers.userId))
    .where(
      and(
        eq(payrollPayments.status, 'sent'),
        lte(payrollPayments.sentAt, before),
        isNull(payrollPayments.nudgedAt),
        eq(payrollMembers.selfViewEnabled, true),
      ),
    )
    .orderBy(asc(payrollPayments.sentAt));
  return rows;
}

/** Recipients for a just-sent run: linked accounts with self-view on. */
export async function listRunRecipients(
  month: string,
  paymentIds: string[],
): Promise<{ email: string; name: string }[]> {
  if (!MONTH_RE.test(month)) return [];
  // Scoped to the lines this send actually moved, NOT every 'sent' line in the
  // month. Adding a member to an already-sent month and pressing Send again is a
  // supported workflow, and a month-wide query would re-notify everyone whose
  // line was still unconfirmed — a second "your pay has been sent" for money
  // that did not move again, sparing only the people who had already confirmed.
  const ids = paymentIds.filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return [];
  return db
    .select({ email: user.email, name: user.name })
    .from(payrollPayments)
    .innerJoin(payrollMembers, eq(payrollMembers.id, payrollPayments.memberId))
    .innerJoin(user, eq(user.id, payrollMembers.userId))
    .where(
      and(
        eq(payrollPayments.month, month),
        inArray(payrollPayments.id, ids),
        eq(payrollPayments.status, 'sent'),
        eq(payrollMembers.selfViewEnabled, true),
      ),
    );
}
