'use server';

/**
 * Write actions for payroll (members + standing terms + monthly runs + payment
 * lines + status changes). Reads live in `@/db/payrollQueries`.
 *
 * SECURITY — this is the most sensitive surface in the app, so state the rules
 * once and hold them everywhere:
 *
 *  - The protected layout's guard does NOT wrap server actions. Every action
 *    here gates itself: `requirePayrollAdmin()` for anything touching the roster,
 *    the amounts, or somebody else's line; `requireOwnPayroll()` for the two
 *    member-facing transitions. Gates run OUTSIDE the try, so their redirect()
 *    throw propagates instead of being swallowed as a server error.
 *  - Member actions re-derive the member id from the SESSION and match it in the
 *    SQL `where`. A payment id from the client is never trusted to belong to the
 *    caller; ownPaymentForUpdate() proves it, and returns null indistinguishably
 *    for "doesn't exist" and "not yours".
 *  - Status and amounts move through SEPARATE doors. No edit action accepts a
 *    status, and no status action accepts an amount (the tasks convention), so
 *    saving a figure can never mark money as sent, and confirming receipt can
 *    never alter what was owed.
 *  - Every transition is checked by `checkTransition()` from payrollStatus.ts
 *    server-side, whatever the UI offered.
 *
 * Money: amounts arrive as strings and are parsed exclusively by the zod schemas
 * in payrollSchema.ts, which delegate to payrollAmounts.ts. Nothing in this file
 * does arithmetic on a raw input.
 *
 * Cache contract: payroll has no public reader, so mutations need only the house
 * `revalidatePath('/admin', 'layout')` — no updateTag, and client success paths
 * must NOT follow with router.refresh() (the re-rendered route already rides back
 * on the action's POST response).
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import { SITE_URL } from '@/constants';
import { db } from '@/db';
import { payrollAdminEmails } from '@/db/adminQueries';
import {
  payrollEvents,
  payrollMembers,
  payrollPayments,
  payrollRuns,
  payrollTerms,
  type NewPayrollEvent,
} from '@/db/schema';
import {
  adminGetPayment,
  adminGetRun,
  adminGetRunFresh,
  listRunRecipients,
  ownPaymentForUpdate,
  seedCandidates,
} from '@/db/payrollQueries';
import {
  requireOwnPayroll,
  requirePayrollAdmin,
} from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { NOTIFY_FROM, sendMail } from '@/lib/mail';
import {
  costInCadCents,
  prorate,
  suggestPaid,
  type PayrollCurrency,
} from '@/lib/payrollAmounts';
import {
  flattenPayrollIssues,
  payrollFlagNoteSchema,
  payrollMemberSchema,
  payrollPaymentSchema,
  payrollRunSchema,
  payrollStatusSchema,
  payrollTermSchema,
} from '@/lib/payrollSchema';
import { checkTransition, type PayrollPaymentStatus } from '@/lib/payrollStatus';
import { logError } from '@/lib/log';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

export type PayrollMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type PayrollActionResult =
  | { ok: true; updated?: number }
  | { ok: false; error: string };

/** Postgres unique-violation. neon-http hangs PG fields off error.cause. */
function pgCode(error: unknown): string | undefined {
  let cursor: unknown = error;
  for (let i = 0; i < 4 && cursor; i += 1) {
    const code = (cursor as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return undefined;
}
const isUniqueViolation = (error: unknown) => pgCode(error) === '23505';

/** Payroll is internal-only: layout-scope refresh keeps every list honest. */
function invalidatePayroll() {
  revalidatePath('/admin', 'layout');
}

/**
 * Best-effort audit write, queued behind the response (after()) exactly like
 * logTaskEvents — neon-http has no transactions to tie the two writes together,
 * and a pay edit must never fail because its breadcrumb did. A failure logs.
 */
function logPayrollEvents(rows: NewPayrollEvent[]) {
  if (rows.length === 0) return;
  after(async () => {
    try {
      await db.insert(payrollEvents).values(rows);
    } catch (error) {
      logError('[payroll] activity write failed', error);
    }
  });
}

type ChangeMap = Record<string, { from?: unknown; to?: unknown }>;

function diff(
  before: Record<string, unknown>,
  after_: Record<string, unknown>,
  keys: string[],
): ChangeMap {
  const changes: ChangeMap = {};
  for (const key of keys) {
    if (before[key] !== after_[key]) {
      changes[key] = { from: before[key], to: after_[key] };
    }
  }
  return changes;
}

/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

export async function createPayrollMember(
  input: unknown,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  const parsed = payrollMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenPayrollIssues(parsed.error),
    };
  }
  const v = parsed.data;

  try {
    const [row] = await db
      .insert(payrollMembers)
      .values({
        userId: v.userId ?? null,
        displayName: v.displayName,
        status: v.status,
        joinedOn: v.joinedOn ?? null,
        endedOn: v.endedOn ?? null,
        selfViewEnabled: v.selfViewEnabled,
        payCurrency: v.payCurrency,
        notes: v.notes ?? null,
        sortIndex: v.sortIndex ?? 0,
      })
      .returning({ id: payrollMembers.id });

    logPayrollEvents([
      {
        memberId: row.id,
        memberName: v.displayName,
        month: '',
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'created',
        payload: { selfViewEnabled: v.selfViewEnabled },
      },
    ]);

    // The coarse companion row. NOTHING numeric ever crosses into
    // activity_log from this file: payroll_events already holds the amounts
    // for the payroll-admin audience, and /admin/logs is a wider one.
    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollMember',
      entityId: row.id,
      entityName: v.displayName,
      action: 'create',
      summary: `Added ${v.displayName} to payroll`,
      payload: { meta: { selfViewEnabled: v.selfViewEnabled } },
    });

    invalidatePayroll();
    return { ok: true, id: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: 'validation',
        issues: { userId: 'That account is already a payroll member.' },
      };
    }
    logError('[payroll] createPayrollMember failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updatePayrollMember(
  memberId: string,
  input: unknown,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(memberId)) return { ok: false, error: 'server' };
  const parsed = payrollMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenPayrollIssues(parsed.error),
    };
  }
  const v = parsed.data;

  try {
    const [before] = await db
      .select({
        displayName: payrollMembers.displayName,
        status: payrollMembers.status,
        joinedOn: payrollMembers.joinedOn,
        endedOn: payrollMembers.endedOn,
        selfViewEnabled: payrollMembers.selfViewEnabled,
        payCurrency: payrollMembers.payCurrency,
        userId: payrollMembers.userId,
      })
      .from(payrollMembers)
      .where(eq(payrollMembers.id, memberId))
      .limit(1);
    if (!before) return { ok: false, error: 'server' };

    const next = {
      userId: v.userId ?? null,
      displayName: v.displayName,
      status: v.status,
      joinedOn: v.joinedOn ?? null,
      endedOn: v.endedOn ?? null,
      selfViewEnabled: v.selfViewEnabled,
      payCurrency: v.payCurrency,
      notes: v.notes ?? null,
      sortIndex: v.sortIndex ?? 0,
    };

    // .returning() guards the edit-vs-delete race (the users-page rule).
    const updated = await db
      .update(payrollMembers)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(payrollMembers.id, memberId))
      .returning({ id: payrollMembers.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    const changes = diff(before, next, [
      'displayName',
      'status',
      'joinedOn',
      'endedOn',
      'selfViewEnabled',
      'payCurrency',
      'userId',
    ]);
    if (Object.keys(changes).length > 0) {
      logPayrollEvents([
        {
          memberId,
          memberName: v.displayName,
          month: '',
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'updated',
          payload: { changes },
        },
      ]);
    }
    invalidatePayroll();
    return { ok: true, id: memberId };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: 'validation',
        issues: { userId: 'That account is already a payroll member.' },
      };
    }
    logError('[payroll] updatePayrollMember failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Toggle one member's self-view. Its own action rather than a field on the member
 * form, because it's the switch Saman reaches for most and it deserves an audit
 * row of its own rather than being buried in an "updated" diff.
 */
export async function setPayrollSelfView(
  memberId: string,
  enabled: boolean,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(memberId)) return { ok: false, error: 'Invalid member.' };

  try {
    const updated = await db
      .update(payrollMembers)
      .set({ selfViewEnabled: enabled, updatedAt: new Date() })
      .where(eq(payrollMembers.id, memberId))
      .returning({
        id: payrollMembers.id,
        displayName: payrollMembers.displayName,
      });
    if (updated.length === 0) {
      return { ok: false, error: 'That member no longer exists.' };
    }
    logPayrollEvents([
      {
        memberId,
        memberName: updated[0].displayName,
        month: '',
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'updated',
        payload: { changes: { selfViewEnabled: { to: enabled } } },
      },
    ]);

    // A privacy switch — it decides whether a person can see their own pay
    // at all, so it belongs in the trail a superadmin reads.
    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollMember',
      entityId: memberId,
      entityName: updated[0].displayName,
      action: 'grant',
      summary: `${enabled ? 'Enabled' : 'Disabled'} own-pay access for ${updated[0].displayName}`,
      payload: { meta: { selfViewEnabled: enabled } },
    });

    invalidatePayroll();
    return { ok: true };
  } catch (error) {
    logError('[payroll] setPayrollSelfView failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * Delete a member. Refused once they have ANY payment history: the FK is
 * ON DELETE RESTRICT and this turns that 500 into a sentence explaining that
 * ending someone is the operation they want, not deleting them.
 */
export async function deletePayrollMember(
  memberId: string,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(memberId)) return { ok: false, error: 'Invalid member.' };

  try {
    const [{ paid } = { paid: 0 }] = await db
      .select({ paid: sql<number>`count(*)::int`.mapWith(Number) })
      .from(payrollPayments)
      .where(eq(payrollPayments.memberId, memberId));
    if (paid > 0) {
      return {
        ok: false,
        error:
          'This member has pay history. Set an end date and mark them ended instead — deleting would erase the record.',
      };
    }

    const deleted = await db
      .delete(payrollMembers)
      .where(eq(payrollMembers.id, memberId))
      .returning({ displayName: payrollMembers.displayName });
    if (deleted.length === 0) {
      return { ok: false, error: 'That member no longer exists.' };
    }
    logPayrollEvents([
      {
        memberId: null,
        memberName: deleted[0].displayName,
        month: '',
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'deleted',
        payload: null,
      },
    ]);

    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollMember',
      entityId: memberId,
      entityName: deleted[0].displayName,
      action: 'delete',
      summary: `Removed ${deleted[0].displayName} from payroll`,
    });

    invalidatePayroll();
    return { ok: true };
  } catch (error) {
    logError('[payroll] deletePayrollMember failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Terms                                                                      */
/* -------------------------------------------------------------------------- */

/** Add a standing salary effective from a date. A raise is a new term. */
export async function addPayrollTerm(
  memberId: string,
  input: unknown,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(memberId)) return { ok: false, error: 'server' };
  const parsed = payrollTermSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenPayrollIssues(parsed.error),
    };
  }
  const v = parsed.data;

  try {
    const [member] = await db
      .select({ displayName: payrollMembers.displayName })
      .from(payrollMembers)
      .where(eq(payrollMembers.id, memberId))
      .limit(1);
    if (!member) return { ok: false, error: 'server' };

    const [row] = await db
      .insert(payrollTerms)
      .values({
        memberId,
        effectiveFrom: v.effectiveFrom,
        anchorCurrency: v.anchorCurrency,
        anchorAmount: v.anchorAmount,
        note: v.note ?? null,
        createdById: profile.session.user.id,
        createdByName: profile.session.user.name,
      })
      .returning({ id: payrollTerms.id });

    logPayrollEvents([
      {
        memberId,
        memberName: member.displayName,
        month: v.effectiveFrom.slice(0, 7),
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'updated',
        payload: {
          term: {
            effectiveFrom: v.effectiveFrom,
            currency: v.anchorCurrency,
            amount: v.anchorAmount,
          },
        },
      },
    ]);
    // Records THAT the standing salary changed and from when — never to what.
    // The figure lives in payroll_terms and payroll_events, both of which are
    // read only by surfaces that already gate on the payroll audience.
    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollTerm',
      entityId: row.id,
      entityName: member.displayName,
      action: 'update',
      summary: `Set a new standing salary for ${member.displayName}, effective ${v.effectiveFrom}`,
      payload: { meta: { effectiveFrom: v.effectiveFrom } },
    });

    invalidatePayroll();
    return { ok: true, id: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          effectiveFrom: 'There is already a term starting on that date.',
        },
      };
    }
    logError('[payroll] addPayrollTerm failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function deletePayrollTerm(
  termId: string,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(termId)) return { ok: false, error: 'Invalid term.' };

  try {
    const deleted = await db
      .delete(payrollTerms)
      .where(eq(payrollTerms.id, termId))
      .returning({
        memberId: payrollTerms.memberId,
        effectiveFrom: payrollTerms.effectiveFrom,
      });
    if (deleted.length === 0) {
      return { ok: false, error: 'That term no longer exists.' };
    }
    logPayrollEvents([
      {
        memberId: deleted[0].memberId,
        memberName: '—',
        month: deleted[0].effectiveFrom.slice(0, 7),
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'deleted',
        payload: { term: { effectiveFrom: deleted[0].effectiveFrom } },
      },
    ]);

    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollTerm',
      entityId: null,
      entityName: `term from ${deleted[0].effectiveFrom}`,
      action: 'delete',
      summary: `Deleted the standing salary effective ${deleted[0].effectiveFrom}`,
      payload: { meta: { effectiveFrom: deleted[0].effectiveFrom } },
    });

    invalidatePayroll();
    return { ok: true };
  } catch (error) {
    logError('[payroll] deletePayrollTerm failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Runs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Open a month and seed one DRAFT line per member who was on the payroll during
 * it, prefilled from their standing term and auto-prorated from their join/end
 * dates. Idempotent on the month (payroll_runs.month is unique); re-running only
 * adds lines for members who don't have one yet, so a member added later can be
 * pulled into an open month without disturbing the lines already entered.
 */
export async function startPayrollRun(
  month: string,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  if (!MONTH_RE.test(month)) return { ok: false, error: 'server' };

  try {
    // Fresh, not cache()d: this path reads, inserts, and may read again.
    let run = await adminGetRunFresh(month);
    if (!run) {
      try {
        const [created] = await db
          .insert(payrollRuns)
          .values({ month })
          .returning({ id: payrollRuns.id });
        run = { ...created, month, rateMicro: null, invoiceRef: null, note: null, sentAt: null, sentByName: null };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Raced with another tab — adopt the winner.
        run = await adminGetRunFresh(month);
        if (!run) throw error;
      }
    }

    const candidates = await seedCandidates(month);
    const existing = await db
      .select({ memberId: payrollPayments.memberId })
      .from(payrollPayments)
      .where(eq(payrollPayments.month, month));
    const have = new Set(existing.map((r) => r.memberId));

    const rows = candidates
      .filter((c) => !have.has(c.member.id) && c.basis && c.term)
      .map((c) => {
        const term = c.term!;
        const basis = c.basis!;
        const anchorAmount = prorate(
          term.anchorAmount,
          basis,
          term.anchorCurrency,
        );
        const rate = run!.rateMicro;
        const paid =
          suggestPaid(
            anchorAmount,
            term.anchorCurrency,
            c.member.payCurrency,
            rate,
          ) ?? 0;
        const cost =
          costInCadCents(anchorAmount, term.anchorCurrency, rate) ?? 0;
        return {
          runId: run!.id,
          memberId: c.member.id,
          month,
          anchorCurrency: term.anchorCurrency,
          anchorAmount,
          paidCurrency: c.member.payCurrency,
          paidAmount: paid,
          costCadCents: cost,
          feeCadCents: 0,
          proratedDays: basis.full ? null : basis.days,
          monthDays: basis.full ? null : basis.monthDays,
          prorationNote: basis.reason,
          status: 'draft' as const,
        };
      });

    if (rows.length > 0) {
      await db.insert(payrollPayments).values(rows);
      logPayrollEvents(
        rows.map((r) => {
          const name =
            candidates.find((c) => c.member.id === r.memberId)?.member
              .displayName ?? '—';
          return {
            memberId: r.memberId,
            memberName: name,
            month,
            actorId: profile.session.user.id,
            actorName: profile.session.user.name,
            kind: 'created' as const,
            payload: {
              seeded: true,
              anchorAmount: r.anchorAmount,
              anchorCurrency: r.anchorCurrency,
              proratedDays: r.proratedDays,
            },
          };
        }),
      );
    }

    invalidatePayroll();
    return { ok: true, id: run.id };
  } catch (error) {
    logError('[payroll] startPayrollRun failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Save the month's header (canonical rate, invoice ref, note).
 *
 * Changing the rate REPRICES only lines still in draft — a line already sent is
 * a record of money that moved and must not shift under a later correction.
 */
export async function savePayrollRun(
  input: unknown,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  const parsed = payrollRunSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenPayrollIssues(parsed.error),
    };
  }
  const v = parsed.data;

  try {
    const before = await adminGetRunFresh(v.month);
    if (!before) {
      return {
        ok: false,
        error: 'validation',
        issues: { _form: 'Start this month before saving its details.' },
      };
    }

    await db
      .update(payrollRuns)
      .set({
        rateMicro: v.rateMicro ?? null,
        invoiceRef: v.invoiceRef ?? null,
        note: v.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, before.id));

    const rateChanged = (before.rateMicro ?? null) !== (v.rateMicro ?? null);
    if (rateChanged && v.rateMicro) {
      await repriceDrafts(before.id, v.rateMicro);
    }

    logPayrollEvents([
      {
        memberId: null,
        memberName: '—',
        month: v.month,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'updated',
        payload: {
          run: {
            changes: diff(
              { rateMicro: before.rateMicro, invoiceRef: before.invoiceRef },
              { rateMicro: v.rateMicro ?? null, invoiceRef: v.invoiceRef ?? null },
              ['rateMicro', 'invoiceRef'],
            ),
            repriced: rateChanged,
          },
        },
      },
    ]);
    invalidatePayroll();
    return { ok: true, id: before.id };
  } catch (error) {
    logError('[payroll] savePayrollRun failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Re-derive paid/cost for the run's DRAFT lines at a new rate. */
async function repriceDrafts(runId: string, rateMicro: number) {
  const drafts = await db
    .select({
      id: payrollPayments.id,
      anchorCurrency: payrollPayments.anchorCurrency,
      anchorAmount: payrollPayments.anchorAmount,
      paidCurrency: payrollPayments.paidCurrency,
      lineRate: payrollPayments.rateMicro,
    })
    .from(payrollPayments)
    .where(
      and(
        eq(payrollPayments.runId, runId),
        eq(payrollPayments.status, 'draft'),
        // A line with its own quoted rate opted out of the monthly one.
        isNull(payrollPayments.rateMicro),
      ),
    );

  for (const d of drafts) {
    const anchorCurrency = d.anchorCurrency as PayrollCurrency;
    const paidCurrency = d.paidCurrency as PayrollCurrency;
    const paid =
      suggestPaid(d.anchorAmount, anchorCurrency, paidCurrency, rateMicro) ?? 0;
    const cost = costInCadCents(d.anchorAmount, anchorCurrency, rateMicro) ?? 0;
    await db
      .update(payrollPayments)
      .set({ paidAmount: paid, costCadCents: cost, updatedAt: new Date() })
      .where(eq(payrollPayments.id, d.id));
  }
}

/**
 * Submit the month: every DRAFT line becomes `sent` and is stamped. This is the
 * action that means "the money left", so it refuses a run that can't be honest
 * about what was paid — no rate, or a line with nothing in its paid column.
 *
 * Notification emails carry NO figures, by design: a member's own amount lives in
 * the dashboard, not in their inbox or Resend's logs.
 */
export async function sendPayrollRun(
  month: string,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  if (!MONTH_RE.test(month)) return { ok: false, error: 'Invalid month.' };

  try {
    const run = await adminGetRun(month);
    if (!run) return { ok: false, error: 'That month hasn’t been started.' };

    const drafts = await db
      .select({
        id: payrollPayments.id,
        memberId: payrollPayments.memberId,
        memberName: payrollMembers.displayName,
        paidAmount: payrollPayments.paidAmount,
        anchorCurrency: payrollPayments.anchorCurrency,
        paidCurrency: payrollPayments.paidCurrency,
        lineRate: payrollPayments.rateMicro,
      })
      .from(payrollPayments)
      .innerJoin(
        payrollMembers,
        eq(payrollMembers.id, payrollPayments.memberId),
      )
      .where(
        and(
          eq(payrollPayments.runId, run.id),
          eq(payrollPayments.status, 'draft'),
        ),
      );

    if (drafts.length === 0) {
      return { ok: false, error: 'Nothing left to send in this month.' };
    }

    // A line needs a rate unless it is CAD anchored AND CAD paid: the rate is
    // what states the delivered amount when the currencies differ, and what
    // states the company's CAD cost whenever the anchor isn't already CAD.
    // Missing the second half is how a toman-anchored member (IRT -> IRT, so
    // the currencies match and the old check passed) was sent with
    // cost_cad_cents frozen at the `?? 0` startPayrollRun wrote when no rate
    // existed — permanently, since repriceDrafts only touches drafts and
    // nothing recomputes cost after the send.
    const needsRate = (d: { anchorCurrency: string; paidCurrency: string }) =>
      d.anchorCurrency !== 'CAD' || d.anchorCurrency !== d.paidCurrency;
    const unpriced = drafts.filter(
      (d) => d.paidAmount <= 0 || (needsRate(d) && !(d.lineRate ?? run.rateMicro)),
    );
    if (unpriced.length > 0) {
      const names = unpriced.map((d) => d.memberName).join(', ');
      return {
        ok: false,
        error: `Enter the amount paid (and this month’s rate) first — missing for ${names}.`,
      };
    }

    const now = new Date();
    const ids = drafts.map((d) => d.id);
    const updated = await db
      .update(payrollPayments)
      .set({ status: 'sent', sentAt: now, updatedAt: now })
      .where(
        and(
          inArray(payrollPayments.id, ids),
          // Re-assert the precondition: another tab may have moved a line
          // between the select above and this write.
          eq(payrollPayments.status, 'draft'),
        ),
      )
      .returning({ id: payrollPayments.id });

    await db
      .update(payrollRuns)
      .set({
        sentAt: now,
        sentById: profile.session.user.id,
        sentByName: profile.session.user.name,
        updatedAt: now,
      })
      .where(eq(payrollRuns.id, run.id));

    // Log the lines that actually moved, not the ones we read a moment ago: the
    // write re-asserts `status = 'draft'`, so another tab can leave `drafts` a
    // superset of `updated`. The audit trail for money should not claim a
    // transition that the database refused.
    const moved = new Set(updated.map((u) => u.id));
    logPayrollEvents(
      drafts
        .filter((d) => moved.has(d.id))
        .map((d) => ({
          memberId: d.memberId,
          memberName: d.memberName,
          month,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'status' as const,
          payload: { from: 'draft', to: 'sent', bulk: true },
        })),
    );

    // Emails ride after() so the admin isn't waiting on Resend, and one failed
    // send never blocks the rest (the due-reminders idiom).
    after(async () => {
      const recipients = await listRunRecipients(
        month,
        updated.map((u) => u.id),
      );
      const label = monthLabel(month);
      for (const r of recipients) {
        try {
          await sendMail({
            from: NOTIFY_FROM,
            to: r.email,
            subject: `Your ${label} payment has been sent`,
            text: [
              `Hi ${r.name.split(' ')[0]},`,
              '',
              `Your ${label} payment has been sent.`,
              '',
              'Open your dashboard to see the details and confirm you received it:',
              `${SITE_URL}/admin/my-pay`,
              '',
              '— Perseus Creative Studio',
            ].join('\n'),
          });
        } catch (error) {
          logError('[payroll] send notice failed', error, {
            recipient: r.email,
          });
        }
      }
    });

    // The month's money going out — the single most consequential payroll
    // act. Count of lines only; not one figure.
    logActivity(profile, {
      area: 'payroll',
      entity: 'payrollRun',
      entityId: null,
      entityName: monthLabel(month),
      action: 'send',
      summary: `Sent the ${monthLabel(month)} payroll run (${updated.length} lines)`,
      payload: { count: updated.length },
    });

    invalidatePayroll();
    return { ok: true, updated: updated.length };
  } catch (error) {
    logError('[payroll] sendPayrollRun failed', error);
    return { ok: false, error: 'Send failed — try again.' };
  }
}

/** "August 2026" — one formatter, fixed locale (the inbox/format.ts rule). */
const MONTH_FORMAT = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
function monthLabel(month: string): string {
  return MONTH_FORMAT.format(new Date(`${month}-01T00:00:00Z`));
}

/* -------------------------------------------------------------------------- */
/* Payment lines — the EDIT door (never touches status)                       */
/* -------------------------------------------------------------------------- */

/**
 * Save one line's figures. Recomputes costCadCents from the anchor and the
 * effective rate, so the company-cost column can never drift from the amounts
 * beside it.
 */
export async function savePayrollPayment(
  paymentId: string,
  input: unknown,
): Promise<PayrollMutationResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(paymentId)) return { ok: false, error: 'server' };
  const parsed = payrollPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenPayrollIssues(parsed.error),
    };
  }
  const v = parsed.data;

  try {
    const before = await adminGetPayment(paymentId);
    if (!before) return { ok: false, error: 'server' };
    const run = await adminGetRun(before.month);

    const effectiveRate = v.rateMicro ?? run?.rateMicro ?? null;
    const cost =
      costInCadCents(v.anchorAmount, v.anchorCurrency, effectiveRate) ?? 0;

    const next = {
      anchorCurrency: v.anchorCurrency,
      anchorAmount: v.anchorAmount,
      paidCurrency: v.paidCurrency,
      paidAmount: v.paidAmount,
      rateMicro: v.rateMicro ?? null,
      costCadCents: cost,
      feeCadCents: v.feeCadCents,
      proratedDays: v.proratedDays ?? null,
      monthDays: v.monthDays ?? null,
      prorationNote: v.prorationNote ?? null,
      wireRef: v.wireRef ?? null,
      adminNote: v.adminNote ?? null,
    };

    const updated = await db
      .update(payrollPayments)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(payrollPayments.id, paymentId))
      .returning({ id: payrollPayments.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    const changes = diff(before as unknown as Record<string, unknown>, next, [
      'anchorCurrency',
      'anchorAmount',
      'paidCurrency',
      'paidAmount',
      'rateMicro',
      'feeCadCents',
      'proratedDays',
      'wireRef',
    ]);
    if (Object.keys(changes).length > 0) {
      logPayrollEvents([
        {
          paymentId,
          memberId: before.memberId,
          memberName: before.memberName,
          month: before.month,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'updated',
          payload: { changes },
        },
      ]);
    }
    invalidatePayroll();
    return { ok: true, id: paymentId };
  } catch (error) {
    logError('[payroll] savePayrollPayment failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Remove a line from a month. Only while it's still a draft. */
export async function deletePayrollPayment(
  paymentId: string,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  if (!UUID_RE.test(paymentId)) return { ok: false, error: 'Invalid payment.' };

  try {
    const deleted = await db
      .delete(payrollPayments)
      .where(
        and(
          eq(payrollPayments.id, paymentId),
          // Anything past draft is a record of money that moved — void it, don't
          // delete it.
          eq(payrollPayments.status, 'draft'),
        ),
      )
      .returning({
        memberId: payrollPayments.memberId,
        month: payrollPayments.month,
      });
    if (deleted.length === 0) {
      return {
        ok: false,
        error: 'Only a draft line can be removed. Void it instead.',
      };
    }
    logPayrollEvents([
      {
        memberId: deleted[0].memberId,
        memberName: '—',
        month: deleted[0].month,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'deleted',
        payload: null,
      },
    ]);
    invalidatePayroll();
    return { ok: true };
  } catch (error) {
    logError('[payroll] deletePayrollPayment failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Payment lines — the STATUS door (never touches amounts)                    */
/* -------------------------------------------------------------------------- */

async function applyStatus(opts: {
  paymentId: string;
  from: PayrollPaymentStatus;
  to: PayrollPaymentStatus;
  note?: string;
  actorId: string;
  actorName: string;
  memberId: string;
  memberName: string;
  month: string;
  onBehalf: boolean;
}): Promise<PayrollActionResult> {
  const now = new Date();
  const set: Record<string, unknown> = { status: opts.to, updatedAt: now };
  if (opts.to === 'received') set.receivedAt = now;
  if (opts.to === 'sent') {
    set.sentAt = now;
    // A re-send restarts the confirmation clock, so the nudge cron can chase it
    // again rather than treating it as already chased.
    set.nudgedAt = null;
    set.receivedAt = null;
  }
  if (opts.to === 'flagged' && opts.note) set.memberNote = opts.note;

  const updated = await db
    .update(payrollPayments)
    .set(set)
    .where(
      and(
        eq(payrollPayments.id, opts.paymentId),
        // Optimistic-concurrency guard: the row must still be where we read it.
        eq(payrollPayments.status, opts.from),
      ),
    )
    .returning({ id: payrollPayments.id });

  if (updated.length === 0) {
    return {
      ok: false,
      error: 'That payment changed in another tab — reload and try again.',
    };
  }

  logPayrollEvents([
    {
      paymentId: opts.paymentId,
      memberId: opts.memberId,
      memberName: opts.memberName,
      month: opts.month,
      actorId: opts.actorId,
      actorName: opts.actorName,
      kind: 'status',
      payload: {
        from: opts.from,
        to: opts.to,
        ...(opts.onBehalf ? { onBehalf: true } : {}),
        ...(opts.note ? { note: opts.note } : {}),
      },
    },
  ]);
  invalidatePayroll();
  return { ok: true };
}

/**
 * The member's own door: confirm receipt, or flag a problem.
 *
 * The member id comes from the session, and ownPaymentForUpdate() matches it in
 * SQL — a payment id belonging to someone else resolves to null, identically to
 * one that doesn't exist.
 */
export async function setOwnPaymentStatus(
  paymentId: string,
  input: unknown,
): Promise<PayrollActionResult> {
  const { profile, memberId } = await requireOwnPayroll();
  const parsed = payrollStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };

  try {
    const payment = await ownPaymentForUpdate(paymentId, memberId);
    if (!payment) return { ok: false, error: 'That payment isn’t available.' };

    const check = checkTransition(payment.status, parsed.data.status, {
      payrollAdmin: false,
      own: true,
    });
    if (!check.ok) return { ok: false, error: check.error };

    let note: string | undefined;
    if (check.requiresNote) {
      const noteParsed = payrollFlagNoteSchema.safeParse(parsed.data.note ?? '');
      if (!noteParsed.success) {
        return { ok: false, error: noteParsed.error.issues[0].message };
      }
      note = noteParsed.data;
    }

    const [member] = await db
      .select({ displayName: payrollMembers.displayName })
      .from(payrollMembers)
      .where(eq(payrollMembers.id, memberId))
      .limit(1);

    const result = await applyStatus({
      paymentId,
      from: payment.status,
      to: parsed.data.status,
      note,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name,
      memberId,
      memberName: member?.displayName ?? profile.session.user.name,
      month: payment.month,
      onBehalf: false,
    });

    // A flag needs a human to see it; the confirmation path stays quiet. It
    // goes to whoever can actually act on it: the owner plus every account
    // holding the 'payroll' grant.
    if (result.ok && parsed.data.status === 'flagged') {
      after(async () => {
        try {
          const admins = await payrollAdminEmails();
          if (admins.length === 0) return;
          await sendMail({
            to: admins,
            subject: `Payroll flagged: ${member?.displayName ?? 'a member'} — ${monthLabel(payment.month)}`,
            text: [
              `${member?.displayName ?? 'A member'} reported a problem with their ${monthLabel(payment.month)} payment.`,
              '',
              note ? `They said: ${note}` : '',
              '',
              `${SITE_URL}/admin/payroll?month=${payment.month}`,
            ]
              .filter(Boolean)
              .join('\n'),
          });
        } catch (error) {
          logError('[payroll] flag notice failed', error);
        }
      });
    }
    return result;
  } catch (error) {
    logError('[payroll] setOwnPaymentStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * The admin's door. `onBehalf` is recorded whenever an admin marks a payment
 * received for somebody else, so the audit log never reads as if the member
 * confirmed it themselves.
 */
export async function setPaymentStatus(
  paymentId: string,
  input: unknown,
): Promise<PayrollActionResult> {
  const profile = await requirePayrollAdmin();
  const parsed = payrollStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  if (!UUID_RE.test(paymentId)) return { ok: false, error: 'Invalid payment.' };

  try {
    const payment = await adminGetPayment(paymentId);
    if (!payment) return { ok: false, error: 'That payment no longer exists.' };

    const own = profile.payrollMemberId === payment.memberId;
    const check = checkTransition(payment.status, parsed.data.status, {
      payrollAdmin: true,
      own,
    });
    if (!check.ok) return { ok: false, error: check.error };

    let note: string | undefined;
    if (check.requiresNote) {
      const noteParsed = payrollFlagNoteSchema.safeParse(parsed.data.note ?? '');
      if (!noteParsed.success) {
        return { ok: false, error: noteParsed.error.issues[0].message };
      }
      note = noteParsed.data;
    }

    return applyStatus({
      paymentId,
      from: payment.status,
      to: parsed.data.status,
      note,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name,
      memberId: payment.memberId,
      memberName: payment.memberName,
      month: payment.month,
      onBehalf: parsed.data.status === 'received' && !own,
    });
  } catch (error) {
    logError('[payroll] setPaymentStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}
