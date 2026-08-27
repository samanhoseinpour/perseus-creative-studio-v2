import 'server-only';
import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  monitoringChecks,
  monitoringDaily,
  monitoringErrorBuckets,
  monitoringIncidents,
  pushSubscriptions,
  user,
  type MonitoringCheck,
  type MonitoringIncident,
} from '@/db/schema';
import type { NotifyRecipient } from '@/db/adminQueries';
import { sanitizeAreas } from '@/lib/adminAreas';
import type {
  DailyCounter,
  MonitoringEnvironment,
  MonitoringSource,
} from '@/lib/monitoringFields';

/**
 * Read helpers for /admin/monitoring and its evaluator — the costQueries.ts
 * shape: one `server-only` module, no admin/own projection split, because
 * monitoring has exactly one audience (whoever holds the area) and no row
 * here belongs to a person. Writes live in src/db/monitoringStatements.ts.
 *
 * Everything is AGGREGATED in SQL. The page never receives a raw bucket dump:
 * a 30-day chart is thirty numbers, the top groups are ten rows, and the
 * heaviest query below scans one index range and folds it in Postgres.
 */

const ERROR_SOURCES: MonitoringSource[] = ['request', 'action'];

export type BucketSeriesRow = { bucketStart: Date; count: number };

/** Per-bucket totals over a window, request + action sources only. */
export async function bucketSeries(
  environment: MonitoringEnvironment,
  since: Date,
  until: Date,
): Promise<BucketSeriesRow[]> {
  const t = monitoringErrorBuckets;
  return db
    .select({
      bucketStart: t.bucketStart,
      count: sql<number>`sum(${t.count})::int`,
    })
    .from(t)
    .where(
      and(
        eq(t.environment, environment),
        gte(t.bucketStart, since),
        lt(t.bucketStart, until),
        inArray(t.source, ERROR_SOURCES),
      ),
    )
    .groupBy(t.bucketStart)
    .orderBy(t.bucketStart);
}

/** The window's total and the equal window before it, in one round trip. */
export async function errorTotals(
  environment: MonitoringEnvironment,
  previousSince: Date,
  since: Date,
  until: Date,
): Promise<{ current: number; previous: number }> {
  const t = monitoringErrorBuckets;
  const [row] = await db
    .select({
      current: sql<number>`coalesce(sum(case when ${t.bucketStart} >= ${since} then ${t.count} else 0 end), 0)::int`,
      previous: sql<number>`coalesce(sum(case when ${t.bucketStart} < ${since} then ${t.count} else 0 end), 0)::int`,
    })
    .from(t)
    .where(
      and(
        eq(t.environment, environment),
        gte(t.bucketStart, previousSince),
        lt(t.bucketStart, until),
        inArray(t.source, ERROR_SOURCES),
      ),
    );
  return { current: row?.current ?? 0, previous: row?.previous ?? 0 };
}

export type ErrorGroupRow = {
  fingerprint: string;
  source: MonitoringSource;
  scope: string;
  routeType: string | null;
  errorName: string;
  code: string | null;
  component: string | null;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  firstDeployment: string | null;
  lastDeployment: string | null;
  lastDigest: string | null;
  lastRequestId: string | null;
};

/**
 * Error groups over a window, biggest first: one row per fingerprint carrying
 * the window's total, the earliest sighting and the build it first appeared
 * in (window functions), plus the newest bucket's `last_*` columns (DISTINCT
 * ON the fingerprint, newest first). One statement — the tag-strip discipline
 * of never N+1-ing a page.
 */
export async function errorGroups(
  environment: MonitoringEnvironment,
  since: Date,
  until: Date,
  limit: number,
  sources: MonitoringSource[] = ERROR_SOURCES,
): Promise<ErrorGroupRow[]> {
  const t = monitoringErrorBuckets;
  const g = db
    .selectDistinctOn([t.fingerprint], {
      fingerprint: t.fingerprint,
      source: t.source,
      scope: t.scope,
      routeType: t.routeType,
      errorName: t.errorName,
      code: t.code,
      component: t.component,
      count: sql<number>`sum(${t.count}) over (partition by ${t.fingerprint})::int`.as(
        'group_count',
      ),
      firstSeenAt: sql`min(${t.firstSeenAt}) over (partition by ${t.fingerprint})`
        .mapWith(t.firstSeenAt)
        .as('group_first_seen_at'),
      firstDeployment: sql<
        string | null
      >`first_value(${t.firstDeployment}) over (partition by ${t.fingerprint} order by ${t.bucketStart} asc)`.as(
        'group_first_deployment',
      ),
      lastSeenAt: t.lastSeenAt,
      lastDeployment: t.lastDeployment,
      lastDigest: t.lastDigest,
      lastRequestId: t.lastRequestId,
    })
    .from(t)
    .where(
      and(
        eq(t.environment, environment),
        gte(t.bucketStart, since),
        lt(t.bucketStart, until),
        inArray(t.source, sources),
      ),
    )
    .orderBy(t.fingerprint, desc(t.lastSeenAt))
    .as('g');
  return db
    .select()
    .from(g)
    .orderBy(desc(g.count), desc(g.lastSeenAt))
    .limit(limit);
}

export type RouteTotalRow = { scope: string; routeType: string | null; count: number };

/** Request-source errors per route pattern, biggest first. */
export async function routeTotals(
  environment: MonitoringEnvironment,
  since: Date,
  until: Date,
  limit: number,
): Promise<RouteTotalRow[]> {
  const t = monitoringErrorBuckets;
  return db
    .select({
      scope: t.scope,
      routeType: t.routeType,
      count: sql<number>`sum(${t.count})::int`,
    })
    .from(t)
    .where(
      and(
        eq(t.environment, environment),
        gte(t.bucketStart, since),
        lt(t.bucketStart, until),
        eq(t.source, 'request'),
      ),
    )
    .groupBy(t.scope, t.routeType)
    .orderBy(desc(sql`sum(${t.count})`))
    .limit(limit);
}

/** Recorded failures per component since a moment — the "recently failing"
 *  half of a dependency's reading. Every source counts here: a database error
 *  caught in an action is still the database failing. */
export async function observedFailures(
  environment: MonitoringEnvironment,
  since: Date,
): Promise<{ component: string; count: number }[]> {
  const t = monitoringErrorBuckets;
  const rows = await db
    .select({
      component: t.component,
      count: sql<number>`sum(${t.count})::int`,
    })
    .from(t)
    .where(
      and(
        eq(t.environment, environment),
        gte(t.bucketStart, since),
        isNotNull(t.component),
      ),
    )
    .groupBy(t.component);
  return rows.map((r) => ({ component: r.component ?? '', count: r.count }));
}

/** The daily outcome counters from a UTC day key onward — the SLO fold reads
 *  these, never the per-probe history (there is none). */
export async function dailyCounters(sinceDay: string): Promise<DailyCounter[]> {
  const t = monitoringDaily;
  return db
    .select({
      component: t.component,
      day: t.day,
      ok: t.ok,
      failed: t.failed,
      unknown: t.unknown,
      updatedAt: t.updatedAt,
    })
    .from(t)
    .where(gte(t.day, sinceDay))
    .orderBy(t.component, t.day);
}

export async function listChecks(): Promise<MonitoringCheck[]> {
  return db.select().from(monitoringChecks).orderBy(monitoringChecks.component);
}

export async function listOpenIncidents(): Promise<MonitoringIncident[]> {
  const t = monitoringIncidents;
  return db
    .select()
    .from(t)
    .where(eq(t.status, 'open'))
    .orderBy(desc(t.severity), desc(t.lastSeenAt));
}

/** Closed incidents, most recently closed first. */
export async function listResolvedIncidents(limit: number): Promise<MonitoringIncident[]> {
  const t = monitoringIncidents;
  return db
    .select()
    .from(t)
    .where(eq(t.status, 'resolved'))
    .orderBy(desc(t.resolvedAt))
    .limit(limit);
}

/** Closed since a moment — what `decideIncidents` may reopen instead of
 *  duplicating. */
export async function recentlyResolvedIncidents(since: Date): Promise<MonitoringIncident[]> {
  const t = monitoringIncidents;
  return db
    .select()
    .from(t)
    .where(and(eq(t.status, 'resolved'), gte(t.resolvedAt, since)))
    .orderBy(desc(t.resolvedAt));
}

export async function getIncidents(ids: string[]): Promise<MonitoringIncident[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(monitoringIncidents)
    .where(inArray(monitoringIncidents.id, ids));
}

export async function countPushDevices(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(pushSubscriptions);
  return row?.n ?? 0;
}

/** Everyone who can open /admin/monitoring — the owner plus the 'monitoring'
 *  grant (the payrollAdminRecipients shape: filtered in JS over the tiny
 *  roster). Alerts go to exactly the people the deep link would let in. */
export async function monitoringRecipients(): Promise<NotifyRecipient[]> {
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter(
      (r) => r.role === 'owner' || sanitizeAreas(r.areas).includes('monitoring'),
    )
    .map((r) => ({ id: r.id, email: r.email }));
}

/** The Overview's module: the check rows and what is open, in one flight. */
export async function monitoringPulse(): Promise<{
  checks: MonitoringCheck[];
  open: Pick<MonitoringIncident, 'severity'>[];
}> {
  const [checks, open] = await Promise.all([
    listChecks(),
    db
      .select({ severity: monitoringIncidents.severity })
      .from(monitoringIncidents)
      .where(eq(monitoringIncidents.status, 'open')),
  ]);
  return { checks, open };
}
