'use server';

/**
 * Write actions for company costs (recurring plans + the charges they made).
 * Reads live in `@/db/costQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the `costs` area (`requireArea`), which is an
 * owner-granted SENSITIVE_AREA. Ids are shape-validated before touching
 * Postgres so a malformed one can't 500 on the uuid cast.
 *
 * Cache contract: `revalidatePath('/admin', 'layout')` and nothing else. Costs
 * have no public reader, so there is no tag to update and no sitemap to
 * refresh — the tasks contract, not the careers one. The fresh tree rides back
 * on the action's own POST response, so a client success path must never
 * follow up with `router.refresh()`.
 *
 * `status` is part of the plan form AND has its own quick-flip action — the
 * careers/projects precedent rather than the payroll "separate doors" rule.
 * A plan is one record the admin maintains, and pausing it changes no money;
 * the rule payroll enforces exists because a status there moves a payment
 * through a lifecycle other people act on. Nothing here has that.
 *
 * AUDIT: no CAD figure ever reaches activity_log, in the payload OR the
 * summary. The payload half is enforced — REDACTED_KEY_RE already refuses
 * `amount`/`cents`/`invoice`/`note` keys — but `summary` is NOT scrubbed, so
 * "Recorded a cost for Claude Max" is the shape, never the amount. /admin/logs
 * is a wider audience than the costs area, exactly as it is wider than payroll.
 */
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  countPlanEntries,
  getCostEntry,
  getCostPlan,
  nextCostPlanSort,
} from '@/db/costQueries';
import { costEntries, costPlans } from '@/db/schema';
import { diff } from '@/lib/activityFields';
import { logActivity } from '@/lib/activityLog';
import { requireArea } from '@/lib/adminAccess';
import {
  COST_PLAN_STATUS_LABELS,
  costCategoryLabel,
  isCostPlanStatus,
  type CostPlanStatus,
} from '@/lib/costFields';
import {
  costEntrySchema,
  costPlanSchema,
  flattenCostIssues,
} from '@/lib/costSchema';
import { reportError } from '@/lib/monitoringRecord';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Postgres error code, resolved through the cause chain: drizzle-orm wraps
 * neon-http driver errors in DrizzleQueryError with the NeonDbError (and its
 * `.code`) on `.cause`, so reading `.code` off the thrown error directly is
 * always undefined (the _actions/careers.ts fix).
 */
function pgCode(error: unknown): string | undefined {
  for (
    let current = error;
    typeof current === 'object' && current !== null;
    current = (current as { cause?: unknown }).cause
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';

export type CostMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type CostActionResult = { ok: true } | { ok: false; error: string };

/** No cache tags: costs have no public reader. */
function invalidateCosts() {
  revalidatePath('/admin', 'layout');
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export async function createCostPlan(
  input: unknown,
): Promise<CostMutationResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    const parsed = costPlanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenCostIssues(parsed.error),
      };
    }
    const data = parsed.data;

    const inserted = await db
      .insert(costPlans)
      .values({
        name: data.name,
        vendor: data.vendor,
        category: data.category,
        cadence: data.cadence,
        status: data.status,
        expectedCadCents: data.expectedCadCents ?? null,
        billingDay: data.billingDay ?? null,
        startedOn: data.startedOn ?? null,
        endedOn: data.endedOn ?? null,
        note: data.note ?? null,
        sortIndex: data.sortIndex ?? (await nextCostPlanSort()),
      })
      .returning({ id: costPlans.id });

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-plan',
      entityId: inserted[0].id,
      entityName: data.name,
      action: 'create',
      summary: `Added the recurring cost ${data.name} (${data.vendor})`,
      payload: {
        meta: {
          vendor: data.vendor,
          category: data.category,
          cadence: data.cadence,
          status: data.status,
        },
      },
    });

    invalidateCosts();
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    reportError('[costs] createCostPlan failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateCostPlan(
  id: string,
  input: unknown,
): Promise<CostMutationResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = costPlanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenCostIssues(parsed.error),
      };
    }
    const data = parsed.data;

    const existing = await getCostPlan(id);
    if (!existing) return { ok: false, error: 'server' };

    await db
      .update(costPlans)
      .set({
        name: data.name,
        vendor: data.vendor,
        category: data.category,
        cadence: data.cadence,
        status: data.status,
        expectedCadCents: data.expectedCadCents ?? null,
        billingDay: data.billingDay ?? null,
        startedOn: data.startedOn ?? null,
        endedOn: data.endedOn ?? null,
        note: data.note ?? null,
        ...(data.sortIndex === undefined ? {} : { sortIndex: data.sortIndex }),
        updatedAt: new Date(),
      })
      .where(eq(costPlans.id, id));

    // Money fields are deliberately absent from `changes` — they would come
    // back as '[redacted]' anyway, and the row is the figure's home.
    const changes = diff(
      {
        name: existing.name,
        vendor: existing.vendor,
        category: existing.category,
        cadence: existing.cadence,
        status: existing.status,
      },
      {
        name: data.name,
        vendor: data.vendor,
        category: data.category,
        cadence: data.cadence,
        status: data.status,
      },
    );

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-plan',
      entityId: id,
      entityName: data.name,
      action: existing.status === data.status ? 'update' : 'status',
      summary:
        existing.status === data.status
          ? `Edited the recurring cost ${data.name}`
          : `Set ${data.name} to ${COST_PLAN_STATUS_LABELS[data.status].toLowerCase()}`,
      payload: changes ? { changes } : undefined,
    });

    invalidateCosts();
    return { ok: true, id };
  } catch (error) {
    reportError('[costs] updateCostPlan failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function setCostPlanStatus(
  id: string,
  status: string,
): Promise<CostActionResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'That plan no longer exists.' };
    if (!isCostPlanStatus(status)) {
      return { ok: false, error: 'Unknown status.' };
    }

    const existing = await getCostPlan(id);
    if (!existing) return { ok: false, error: 'That plan no longer exists.' };
    if (existing.status === status) return { ok: true };

    await db
      .update(costPlans)
      .set({ status, updatedAt: new Date() })
      .where(eq(costPlans.id, id));

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-plan',
      entityId: id,
      entityName: existing.name,
      action: 'status',
      summary: `Set ${existing.name} to ${COST_PLAN_STATUS_LABELS[status as CostPlanStatus].toLowerCase()}`,
      payload: { changes: { status: { from: existing.status, to: status } } },
    });

    invalidateCosts();
    return { ok: true };
  } catch (error) {
    reportError('[costs] setCostPlanStatus failed', error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

/**
 * Hard delete, refused while any charge references the plan. `cancelled` is
 * the retirement path (the task-category rule): spend history is the entire
 * value of this table, and a plan that ever billed must stay describable. The
 * `restrict` FK below is the race backstop, not the everyday guard.
 */
export async function deleteCostPlan(id: string): Promise<CostActionResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'That plan no longer exists.' };

    const existing = await getCostPlan(id);
    if (!existing) return { ok: false, error: 'That plan no longer exists.' };

    const charges = await countPlanEntries(id);
    if (charges > 0) {
      return {
        ok: false,
        error: `${existing.name} has ${charges} recorded ${charges === 1 ? 'charge' : 'charges'}. Set it to cancelled instead — that keeps the history.`,
      };
    }

    try {
      await db.delete(costPlans).where(eq(costPlans.id, id));
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'A charge was recorded against it just now. Set it to cancelled instead.',
        };
      }
      throw dbError;
    }

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-plan',
      entityId: id,
      entityName: existing.name,
      action: 'delete',
      summary: `Deleted the recurring cost ${existing.name}`,
      payload: { meta: { vendor: existing.vendor } },
    });

    invalidateCosts();
    return { ok: true };
  } catch (error) {
    reportError('[costs] deleteCostPlan failed', error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Entries                                                                    */
/* -------------------------------------------------------------------------- */

/** Reject a planId that doesn't exist before the FK does, so the dialog gets a
 *  field error rather than a generic failure. */
async function planExists(planId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`1`.mapWith(Number) })
    .from(costPlans)
    .where(eq(costPlans.id, planId))
    .limit(1);
  return Boolean(row);
}

export async function createCostEntry(
  input: unknown,
): Promise<CostMutationResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    const parsed = costEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenCostIssues(parsed.error),
      };
    }
    const data = parsed.data;

    if (data.planId && !(await planExists(data.planId))) {
      return {
        ok: false,
        error: 'validation',
        issues: { planId: 'That plan no longer exists.' },
      };
    }

    const inserted = await db
      .insert(costEntries)
      .values({
        planId: data.planId ?? null,
        month: data.month,
        chargedOn: data.chargedOn ?? null,
        amountCadCents: data.amountCadCents,
        name: data.name,
        vendor: data.vendor,
        category: data.category,
        billedNote: data.billedNote ?? null,
        invoiceRef: data.invoiceRef ?? null,
        note: data.note ?? null,
        createdById: profile.session.user.id,
        createdByName: profile.session.user.name,
      })
      .returning({ id: costEntries.id });

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-entry',
      entityId: inserted[0].id,
      entityName: data.name,
      action: 'create',
      // No figure. Ever.
      summary: `Recorded a ${data.month} cost for ${data.name} (${data.vendor})`,
      payload: {
        meta: {
          month: data.month,
          vendor: data.vendor,
          category: data.category,
        },
      },
    });

    invalidateCosts();
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    reportError('[costs] createCostEntry failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateCostEntry(
  id: string,
  input: unknown,
): Promise<CostMutationResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = costEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenCostIssues(parsed.error),
      };
    }
    const data = parsed.data;

    const existing = await getCostEntry(id);
    if (!existing) return { ok: false, error: 'server' };

    if (data.planId && !(await planExists(data.planId))) {
      return {
        ok: false,
        error: 'validation',
        issues: { planId: 'That plan no longer exists.' },
      };
    }

    await db
      .update(costEntries)
      .set({
        planId: data.planId ?? null,
        month: data.month,
        chargedOn: data.chargedOn ?? null,
        amountCadCents: data.amountCadCents,
        name: data.name,
        vendor: data.vendor,
        category: data.category,
        billedNote: data.billedNote ?? null,
        invoiceRef: data.invoiceRef ?? null,
        note: data.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(costEntries.id, id));

    const changes = diff(
      {
        month: existing.month,
        name: existing.name,
        vendor: existing.vendor,
        category: existing.category,
      },
      {
        month: data.month,
        name: data.name,
        vendor: data.vendor,
        category: data.category,
      },
    );

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-entry',
      entityId: id,
      entityName: data.name,
      action: 'update',
      summary: `Edited the ${data.month} cost for ${data.name}`,
      payload: changes ? { changes } : undefined,
    });

    invalidateCosts();
    return { ok: true, id };
  } catch (error) {
    reportError('[costs] updateCostEntry failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Charges are deleted, not voided — unlike a payment, nobody outside this area
 * has ever seen the row, so there is no reading of it to preserve. The audit
 * row is what survives.
 */
export async function deleteCostEntry(id: string): Promise<CostActionResult> {
  const profile = await requireArea('costs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'That charge no longer exists.' };

    const existing = await getCostEntry(id);
    if (!existing) return { ok: false, error: 'That charge no longer exists.' };

    await db.delete(costEntries).where(eq(costEntries.id, id));

    logActivity(profile, {
      area: 'costs',
      entity: 'cost-entry',
      entityId: id,
      entityName: existing.name,
      action: 'delete',
      summary: `Deleted the ${existing.month} cost for ${existing.name}`,
      payload: {
        meta: {
          month: existing.month,
          vendor: existing.vendor,
          category: costCategoryLabel(existing.category),
        },
      },
    });

    invalidateCosts();
    return { ok: true };
  } catch (error) {
    reportError('[costs] deleteCostEntry failed', error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
