import 'server-only';
import { cache } from 'react';
import { and, count, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { likePattern } from '@/db/adminQueries';
import { activityLog } from '@/db/schema';
import type { ActivityPayload } from '@/db/schema';

/**
 * Read helpers for /admin/logs. Writes live in src/lib/activityLog.ts — the
 * same read/write split adminQueries.ts has from _actions/inbox.ts.
 *
 * There is no `own*` projection here, unlike payrollQueries.ts, because the
 * whole surface is superadmin-only: every column is already visible to every
 * caller. If /admin/logs is ever opened to a wider audience, this is the file
 * that grows the split — not the render site.
 */

export const ACTIVITY_PER_PAGE = 40;

export type ActivityRow = {
  id: string;
  actorId: string | null;
  actorName: string;
  area: string;
  entity: string;
  entityId: string | null;
  entityName: string;
  action: string;
  summary: string;
  payload: ActivityPayload | null;
  requestId: string | null;
  createdAt: Date;
};

export type ActivityPage = {
  rows: ActivityRow[];
  total: number;
  page: number;
  totalPages: number;
};

export type ActivityFilters = {
  actorId?: string;
  area?: string;
  action?: string;
  /** Free text over the rendered summary and the entity label. */
  q?: string;
  /** Inclusive lower bound, from the ?since= preset. */
  since?: Date;
};

function activityWhere(filters: ActivityFilters = {}) {
  const clauses = [
    filters.actorId ? eq(activityLog.actorId, filters.actorId) : undefined,
    filters.area ? eq(activityLog.area, filters.area) : undefined,
    // `action` is a pgEnum column; an unknown string would make Postgres throw
    // on the cast rather than return nothing, so the caller validates against
    // ACTIVITY_ACTIONS before it reaches here.
    filters.action
      ? eq(activityLog.action, filters.action as ActivityRow['action'] & never)
      : undefined,
    filters.since ? gte(activityLog.createdAt, filters.since) : undefined,
    filters.q
      ? or(
          // likePattern, not a raw template: it escapes % and _ so a search
          // for "100%" doesn't become a wildcard that matches everything.
          ilike(activityLog.summary, likePattern(filters.q)),
          ilike(activityLog.entityName, likePattern(filters.q)),
        )
      : undefined,
  ].filter(Boolean);
  return clauses.length > 0 ? and(...clauses) : undefined;
}

/**
 * One page of the feed. Uses the house window-count idiom (adminQueries.ts):
 * the filtered total rides every row as `count(*) over ()::int` instead of a
 * separate COUNT awaited first — on neon-http each query is its own HTTPS
 * round trip. Only a stale out-of-range ?page= pays extra queries, and the
 * page is capped BEFORE the offset reaches Postgres so an absurd value can't
 * overflow int8 and 500 the render.
 */
export async function listActivity({
  page,
  perPage = ACTIVITY_PER_PAGE,
  filters,
}: {
  page: number;
  perPage?: number;
  filters?: ActivityFilters;
}): Promise<ActivityPage> {
  const where = activityWhere(filters);

  const fetchPage = (p: number) =>
    db
      .select({
        id: activityLog.id,
        actorId: activityLog.actorId,
        actorName: activityLog.actorName,
        area: activityLog.area,
        entity: activityLog.entity,
        entityId: activityLog.entityId,
        entityName: activityLog.entityName,
        action: activityLog.action,
        summary: activityLog.summary,
        payload: activityLog.payload,
        requestId: activityLog.requestId,
        createdAt: activityLog.createdAt,
        total: sql<number>`count(*) over ()::int`,
      })
      .from(activityLog)
      .where(where)
      .orderBy(desc(activityLog.createdAt))
      .limit(perPage)
      .offset((p - 1) * perPage);

  const requested = Math.min(Math.max(1, Math.trunc(page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(activityLog)
      .where(where);
    total = n;
    safePage = Math.min(requested, Math.max(1, Math.ceil(n / perPage)));
    if (safePage !== requested) pageRows = await fetchPage(safePage);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = pageRows.map(({ total, ...row }) => {
    void total; // the window count is not a row field
    return row as ActivityRow;
  });
  return { rows, total, page: safePage, totalPages };
}

/**
 * The distinct actors and areas present in the table, for the filter pills.
 * Cheap at this volume and it beats a hard-coded list: an area added by a
 * future feature shows up in the filter the moment it writes its first row.
 *
 * React cache() so the page and its filter bar share one flight.
 */
export const getActivityFacets = cache(
  async (): Promise<{
    actors: { id: string | null; name: string }[];
    areas: string[];
  }> => {
    const [actorRows, areaRows] = await Promise.all([
      // groupBy(actorId), NOT selectDistinct over the (id, name) PAIR:
      // actorName is a write-time snapshot and people rename themselves on
      // /admin/profile, so the pair version renders the same person twice in
      // the filter. max(name) picks one deterministically; the null-actor
      // (cron/system) bucket is preserved as its own row.
      db
        .select({
          id: activityLog.actorId,
          name: sql<string>`max(${activityLog.actorName})`,
        })
        .from(activityLog)
        .groupBy(activityLog.actorId)
        .orderBy(sql`max(${activityLog.actorName})`),
      db
        .selectDistinct({ area: activityLog.area })
        .from(activityLog)
        .orderBy(activityLog.area),
    ]);
    return {
      actors: actorRows,
      areas: areaRows.map((r) => r.area),
    };
  },
);

/**
 * The per-entity history strip — "what happened to THIS row?". Served by
 * activity_log_entity_idx. Not wired into a screen yet; it is the reader a
 * detail page reaches for when one is added, and exists so that page does not
 * invent its own query.
 */
export const listEntityActivity = cache(
  async (
    entity: string,
    entityId: string,
    limit = 20,
  ): Promise<ActivityRow[]> => {
    const rows = await db
      .select()
      .from(activityLog)
      .where(
        and(eq(activityLog.entity, entity), eq(activityLog.entityId, entityId)),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    return rows as ActivityRow[];
  },
);

/** Rows older than `cutoff` — the sweep's dry-run counterpart, used by the
 *  retention note on the screen so the policy is visible, not folklore. */
export async function countActivityBefore(cutoff: Date): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(activityLog)
    .where(lt(activityLog.createdAt, cutoff));
  return n;
}
