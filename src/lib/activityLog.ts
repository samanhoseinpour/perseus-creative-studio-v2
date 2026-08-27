import 'server-only';
import { lt } from 'drizzle-orm';
import { after } from 'next/server';
import { headers } from 'next/headers';

import { db } from '@/db';
import { activityLog, type ActivityPayload } from '@/db/schema';
import { clip, scrub } from '@/lib/activityFields';
import type { AccessProfile } from '@/lib/adminAccess';
import { logError } from '@/lib/log';
import { recordDependencyFailure } from '@/lib/monitoringRecord';

/**
 * The one door for audit rows — "who did what, when" across every /admin
 * surface, read at /admin/logs.
 *
 * Shaped after logTaskEvents (_actions/tasks.ts) and logPayrollEvents
 * (_actions/payroll.ts) on purpose: synchronous, returns void, body inside
 * after(), failures only log. neon-http has no transactions, so the audit
 * write cannot be tied to the mutation it describes; making it best-effort and
 * queued behind the response is the honest version of that constraint.
 *
 * Call it only in the ok-branch, AFTER the real write succeeded — a mutation
 * that failed must leave no trace suggesting it happened.
 *
 * Redaction lives in @/lib/activityFields (a pure leaf, so it is testable).
 */

export type ActivityAction = (typeof activityLog.$inferInsert)['action'];

export type ActivityInput = {
  /** 'users' | 'tickets' | 'projects' | 'clients' | 'payroll' | 'cron' | … */
  area: string;
  /** 'user' | 'ticket' | 'project' | 'submission' | … */
  entity: string;
  entityId: string | null;
  /** Human label, snapshotted so a deleted row is still describable. */
  entityName: string;
  action: ActivityAction;
  /** One rendered sentence, e.g. "Granted Ali access to tickets". */
  summary: string;
  payload?: ActivityPayload;
};

/**
 * Vercel's per-request id — the jump-off point from an audit row to that
 * request's runtime logs. Not a Next.js API (Next 16 has no official
 * request-id story), just a header Vercel sets. Absent locally, hence the
 * nullable column.
 *
 * headers() throws outside a request scope, so failure is swallowed: a missing
 * correlation id must never cost an audit row.
 */
async function requestId(): Promise<string | null> {
  try {
    return (await headers()).get('x-vercel-id');
  } catch {
    return null;
  }
}

/**
 * Record one or more audit rows for a signed-in actor.
 *
 * Takes the AccessProfile rather than a bare id so actorId and actorName can
 * never be passed inconsistently — the snapshot has to match the reference, or
 * the trail lies about who acted once that person is offboarded.
 */
export function logActivity(
  profile: AccessProfile,
  entries: ActivityInput | ActivityInput[],
): void {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return;
  const { id, name } = profile.session.user;
  write(rows, id, name || 'Unknown');
}

/**
 * Record rows for a known user outside a resolved AccessProfile — the Better
 * Auth hooks, which fire during sign-in and password reset before any admin
 * gate has run. Kept separate from logActivity so the ordinary path still
 * cannot pass a mismatched id/name pair.
 */
export function logActivityAs(
  actor: { id: string | null; name: string },
  entries: ActivityInput | ActivityInput[],
): void {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return;
  write(rows, actor.id, actor.name || 'Unknown');
}

/**
 * Record an audit row with no signed-in actor: cron runs, Better Auth hooks
 * firing outside a session, public writes. `actorName` is the display label
 * ('System', an email for a sign-in attempt) — actorId stays null so the FK
 * never points at a user who didn't act.
 */
export function logSystemActivity(
  actorName: string,
  entries: ActivityInput | ActivityInput[],
): void {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return;
  write(rows, null, actorName);
}

async function insert(
  rows: ActivityInput[],
  actorId: string | null,
  actorName: string,
): Promise<void> {
  try {
    const reqId = await requestId();
    await db.insert(activityLog).values(
      // entityName, summary and actorName are CLIPPED here, not at the call
      // sites. All three are unbounded text columns held for 365 days, and
      // some values are client-supplied with no schema max of their own (a
      // passkey's label is the clearest case). Bounding it in the one door
      // means a future call site cannot reintroduce the problem by forgetting.
      rows.map((row) => ({
        actorId,
        actorName: String(clip(actorName)),
        area: row.area,
        entity: row.entity,
        entityId: row.entityId,
        entityName: String(clip(row.entityName)),
        action: row.action,
        summary: String(clip(row.summary)),
        payload: scrub(row.payload),
        requestId: reqId,
      })),
    );
  } catch (error) {
    logError('[activity] write failed', error, { event: 'activity.write.failed' });
    // A lost audit row is a database failure worth counting: if this fires
    // three times in an hour the database check on /admin/monitoring says so.
    recordDependencyFailure('database', error);
  }
}

/**
 * after() is the preferred path — it keeps the insert off the response's
 * critical path — but it THROWS when there is no request scope to defer into.
 * That matters because this logger is called from Better Auth's hooks during
 * sign-in: an unguarded throw here would turn a failed breadcrumb into a
 * failed login. So the throw is caught and the insert falls back to
 * fire-and-forget.
 *
 * The fallback is deliberately not awaited. Every caller of this module is
 * void-returning by contract, and awaiting would put a Neon round trip in
 * front of the user's mutation to record something the mutation does not
 * depend on.
 */
function write(
  rows: ActivityInput[],
  actorId: string | null,
  actorName: string,
): void {
  try {
    after(() => insert(rows, actorId, actorName));
  } catch {
    void insert(rows, actorId, actorName);
  }
}

/**
 * Retention sweep — called from the daily housekeeping cron. 365 days: long
 * enough to answer "what happened last time we ran this campaign", short
 * enough to be defensible under PIPEDA Principle 5 if a former teammate asks
 * what is held about them.
 *
 * Awaited by its caller, unlike the writes above: the cron has no user
 * waiting, and a silently failing sweep is how a table grows unbounded.
 */
export async function deleteActivityBefore(cutoff: Date): Promise<number> {
  const deleted = await db
    .delete(activityLog)
    .where(lt(activityLog.createdAt, cutoff))
    .returning({ id: activityLog.id });
  return deleted.length;
}
