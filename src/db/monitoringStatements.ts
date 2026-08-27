import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import type * as schema from './schema';
import {
  monitoringChecks,
  monitoringDaily,
  monitoringErrorBuckets,
  monitoringIncidents,
} from './schema';
import {
  isFailingStatus,
  type CheckKind,
  type CheckStatus,
  type CheckOutcomeRow,
  type ErrorBucketRow,
  type IncidentSignal,
  type Severity,
} from '@/lib/monitoringFields';

/**
 * Every WRITE the monitoring layer makes, as a function of a passed-in drizzle
 * instance. Guard-free on purpose — the taskPredicates.ts precedent: this
 * module is never client-imported, and it takes `db` as a parameter rather
 * than importing `@/db` so that scripts/check-monitoring.mts --db can run the
 * REAL statements through its own Pool-backed client, with no `--conditions`
 * flag and no `server-only` import. The `server-only` binding to the app's
 * `db` lives in src/db/monitoringQueries.ts.
 *
 * Every statement is a single round trip and atomic on its own, which is the
 * whole design constraint: neon-http has no transactions, Vercel documents
 * that a cron can be invoked twice for one slot, and nothing here may rely on
 * a read-then-write. The upserts fold their counters in SQL, the partial
 * unique index collapses concurrent opens onto one row, and the alert claims
 * are conditional UPDATE … RETURNING — the payroll-nudge `nudged_at` pattern.
 */

export type MonitoringDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/* -------------------------------------------------------------------------- */
/* Error buckets                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `count + 1` on conflict, atomically; `first_deployment` is set on insert
 * and never touched again; the `last_*` columns follow the newest sighting,
 * keeping the previous value when the new one is null.
 */
export async function upsertErrorBucket(
  db: MonitoringDb,
  row: ErrorBucketRow,
  at: Date = new Date(),
): Promise<void> {
  const t = monitoringErrorBuckets;
  await db
    .insert(t)
    .values({ ...row, count: 1, firstSeenAt: at, lastSeenAt: at })
    .onConflictDoUpdate({
      target: [t.bucketStart, t.environment, t.fingerprint],
      set: {
        count: sql`${t.count} + 1`,
        lastSeenAt: sql`greatest(${t.lastSeenAt}, excluded.last_seen_at)`,
        lastDeployment: sql`coalesce(excluded.last_deployment, ${t.lastDeployment})`,
        lastDigest: sql`coalesce(excluded.last_digest, ${t.lastDigest})`,
        lastRequestId: sql`coalesce(excluded.last_request_id, ${t.lastRequestId})`,
      },
    });
}

/* -------------------------------------------------------------------------- */
/* Checks                                                                     */
/* -------------------------------------------------------------------------- */

/** One row per component. The streak and the last-ok/last-failed stamps are
 *  folded HERE, in the SET clause, from the previous row's own columns. */
export async function upsertCheck(
  db: MonitoringDb,
  row: CheckOutcomeRow,
): Promise<void> {
  const t = monitoringChecks;
  const failing = isFailingStatus(row.status);
  const passing = row.status === 'ok';
  await db
    .insert(t)
    .values({
      component: row.component,
      kind: row.kind,
      status: row.status,
      checkedAt: row.checkedAt,
      durationMs: row.durationMs,
      lastOkAt: passing ? row.checkedAt : null,
      lastFailedAt: failing ? row.checkedAt : null,
      consecutiveFailures: failing ? 1 : 0,
      errorName: row.errorName,
      detail: row.detail,
      firstSeenAt: row.checkedAt,
      updatedAt: row.checkedAt,
    })
    .onConflictDoUpdate({
      target: t.component,
      set: {
        kind: row.kind,
        status: row.status,
        checkedAt: row.checkedAt,
        durationMs: row.durationMs,
        errorName: row.errorName,
        detail: row.detail,
        updatedAt: row.checkedAt,
        lastOkAt: passing ? row.checkedAt : sql`${t.lastOkAt}`,
        lastFailedAt: failing ? row.checkedAt : sql`${t.lastFailedAt}`,
        consecutiveFailures: failing ? sql`${t.consecutiveFailures} + 1` : 0,
      },
    });
}

/** A placeholder for a component the monitor knows about but has never
 *  observed — a cron that has not run since it shipped. Insert-only, so
 *  `first_seen_at` is the moment the monitor first looked, which is what
 *  cronHealth judges "pending" against. */
export async function ensureCheck(
  db: MonitoringDb,
  component: string,
  kind: CheckKind,
  now: Date,
): Promise<void> {
  await db
    .insert(monitoringChecks)
    .values({
      component,
      kind,
      status: 'unknown',
      checkedAt: now,
      detail: kind === 'cron' ? 'No run recorded yet' : 'Not checked yet',
      firstSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: monitoringChecks.component });
}

/** One outcome onto the day's counters — the SLO denominator. Atomic `+ 1`
 *  on conflict, so a duplicate cron invocation counts each probe once per
 *  call rather than clobbering. */
export async function bumpDaily(
  db: MonitoringDb,
  component: string,
  day: string,
  status: CheckStatus,
  now: Date = new Date(),
): Promise<void> {
  const t = monitoringDaily;
  const column = status === 'ok' ? 'ok' : status === 'failed' ? 'failed' : 'unknown';
  await db
    .insert(t)
    .values({
      component,
      day,
      ok: column === 'ok' ? 1 : 0,
      failed: column === 'failed' ? 1 : 0,
      unknown: column === 'unknown' ? 1 : 0,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [t.component, t.day],
      set: {
        ok: column === 'ok' ? sql`${t.ok} + 1` : sql`${t.ok}`,
        failed: column === 'failed' ? sql`${t.failed} + 1` : sql`${t.failed}`,
        unknown: column === 'unknown' ? sql`${t.unknown} + 1` : sql`${t.unknown}`,
        updatedAt: now,
      },
    });
}

/* -------------------------------------------------------------------------- */
/* Incidents                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Open a condition, or fold onto the row that is already open for it. The
 * partial unique index `(kind, key) WHERE status = 'open'` is the conflict
 * target, so `targetWhere` MUST repeat its predicate verbatim or Postgres
 * raises 42P10 (the recurring-tasks lesson). `inserted` says whether THIS call
 * created the row — the `xmax = 0` idiom — which is what decides who claims
 * the alert. Severity only ever rises on conflict; a warning that turned
 * critical is escalated, a critical that calmed to a warning stays critical
 * until it resolves.
 */
export async function openIncident(
  db: MonitoringDb,
  signal: IncidentSignal,
  now: Date,
): Promise<{ id: string; inserted: boolean }> {
  const t = monitoringIncidents;
  const [row] = await db
    .insert(t)
    .values({
      kind: signal.kind,
      key: signal.key,
      component: signal.component,
      severity: signal.severity,
      status: 'open',
      title: signal.title,
      detail: signal.detail,
      startedAt: now,
      lastSeenAt: now,
      occurrenceCount: 1,
      deployment: signal.deployment,
      lastRequestId: signal.lastRequestId,
      lastDigest: signal.lastDigest,
    })
    .onConflictDoUpdate({
      target: [t.kind, t.key],
      targetWhere: eq(t.status, 'open'),
      set: {
        lastSeenAt: now,
        occurrenceCount: sql`${t.occurrenceCount} + 1`,
        detail: sql`excluded.detail`,
        severity: sql`case when excluded.severity = 'critical' then excluded.severity else ${t.severity} end`,
        deployment: sql`coalesce(${t.deployment}, excluded.deployment)`,
        lastRequestId: sql`coalesce(excluded.last_request_id, ${t.lastRequestId})`,
        lastDigest: sql`coalesce(excluded.last_digest, ${t.lastDigest})`,
      },
    })
    .returning({ id: t.id, inserted: sql<boolean>`(xmax = 0)` });
  return row;
}

/** A condition that is still true: bump the row, and escalate when asked. */
export async function touchIncident(
  db: MonitoringDb,
  id: string,
  signal: IncidentSignal,
  escalate: boolean,
  now: Date,
): Promise<boolean> {
  const t = monitoringIncidents;
  const rows = await db
    .update(t)
    .set({
      lastSeenAt: now,
      occurrenceCount: sql`${t.occurrenceCount} + 1`,
      detail: signal.detail,
      ...(escalate ? { severity: 'critical' as const } : {}),
      lastRequestId: sql`coalesce(${signal.lastRequestId}, ${t.lastRequestId})`,
      lastDigest: sql`coalesce(${signal.lastDigest}, ${t.lastDigest})`,
    })
    .where(and(eq(t.id, id), eq(t.status, 'open')))
    .returning({ id: t.id });
  return rows.length > 0;
}

/**
 * A key that resolved moments ago and is back: reopen the SAME row rather
 * than opening another. `alerted_at` is deliberately kept, so a flapping
 * condition is announced once, and `recovery_notified_at` is kept too, so it
 * is not announced resolved twice. A concurrent invocation that already
 * opened a fresh row makes this violate the partial unique index — that is
 * caught and reported as "did not reopen", the honest reading.
 */
export async function reopenIncident(
  db: MonitoringDb,
  id: string,
  signal: IncidentSignal,
  now: Date,
): Promise<boolean> {
  const t = monitoringIncidents;
  try {
    const rows = await db
      .update(t)
      .set({
        status: 'open',
        resolvedAt: null,
        severity: signal.severity,
        title: signal.title,
        detail: signal.detail,
        lastSeenAt: now,
        occurrenceCount: sql`${t.occurrenceCount} + 1`,
      })
      .where(and(eq(t.id, id), eq(t.status, 'resolved')))
      .returning({ id: t.id });
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Close a condition. Exactly one caller wins, even under a duplicate run. */
export async function resolveIncident(
  db: MonitoringDb,
  id: string,
  now: Date,
): Promise<boolean> {
  const t = monitoringIncidents;
  const rows = await db
    .update(t)
    .set({ status: 'resolved', resolvedAt: now })
    .where(and(eq(t.id, id), eq(t.status, 'open')))
    .returning({ id: t.id });
  return rows.length > 0;
}

/**
 * Claim the right to send the alert for an incident: once on open, and once
 * more if it later escalates to critical. Two concurrent claims serialise on
 * the row lock and the second re-reads `alerted_at` as set — one winner.
 */
export async function claimAlert(
  db: MonitoringDb,
  id: string,
  severity: Severity,
): Promise<boolean> {
  const t = monitoringIncidents;
  const rows = await db
    .update(t)
    .set({ alertedAt: sql`now()`, alertedSeverity: severity })
    .where(
      and(
        eq(t.id, id),
        or(
          isNull(t.alertedAt),
          severity === 'critical'
            ? sql`${t.alertedSeverity} is distinct from 'critical'`
            : sql`false`,
        ),
      ),
    )
    .returning({ id: t.id });
  return rows.length > 0;
}

/** Claim the recovery notice — only for an incident that was announced, and
 *  only once per row. */
export async function claimRecovery(db: MonitoringDb, id: string): Promise<boolean> {
  const t = monitoringIncidents;
  const rows = await db
    .update(t)
    .set({ recoveryNotifiedAt: sql`now()` })
    .where(
      and(
        eq(t.id, id),
        eq(t.status, 'resolved'),
        isNotNull(t.alertedAt),
        isNull(t.recoveryNotifiedAt),
      ),
    )
    .returning({ id: t.id });
  return rows.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Retention                                                                  */
/* -------------------------------------------------------------------------- */

function rowCount(result: unknown): number {
  const count = (result as { rowCount?: number | null }).rowCount;
  return typeof count === 'number' ? count : 0;
}

/** Bounded deletes — a batch at a time, by ctid, so a backlog can never turn
 *  into one unbounded statement in a request path. Returns the rows removed. */
export async function sweepBuckets(
  db: MonitoringDb,
  cutoff: Date,
  limit: number,
): Promise<number> {
  const result = await db.execute(
    sql`delete from ${monitoringErrorBuckets} where ctid = any(array(select ctid from ${monitoringErrorBuckets} where ${monitoringErrorBuckets.bucketStart} < ${cutoff} limit ${limit}))`,
  );
  return rowCount(result);
}

export async function sweepDaily(
  db: MonitoringDb,
  cutoffDay: string,
  limit: number,
): Promise<number> {
  const t = monitoringDaily;
  const result = await db.execute(
    sql`delete from ${t} where ctid = any(array(select ctid from ${t} where ${t.day} < ${cutoffDay} limit ${limit}))`,
  );
  return rowCount(result);
}

export async function sweepResolvedIncidents(
  db: MonitoringDb,
  cutoff: Date,
  limit: number,
): Promise<number> {
  const t = monitoringIncidents;
  const result = await db.execute(
    sql`delete from ${t} where ctid = any(array(select ctid from ${t} where ${t.status} = 'resolved' and ${t.resolvedAt} < ${cutoff} limit ${limit}))`,
  );
  return rowCount(result);
}
