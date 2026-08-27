/**
 * URL contract for /admin/logs. A client-safe leaf (no `server-only`, no db
 * import) so the filter bar and the server page can share one parser — the
 * split inboxFilters.ts already models.
 *
 * Date windows are NOT re-implemented here: INBOX_RANGE_PRESETS and
 * resolveDateWindow already resolve rolling windows in the viewer's zone, and
 * a second copy of that logic would drift.
 */
import {
  isRangeToken,
  resolveDateWindow,
  type RangeToken,
} from '@/lib/inboxFilters';
import { firstParam, parsePage } from '@/utils/pagination';

/**
 * The verbs, mirroring the activity_action pgEnum. Declared here rather than
 * imported from the schema so the client filter bar never pulls the Drizzle
 * table graph into a browser chunk (the de-barreling rule in CLAUDE.md).
 *
 * If a value is added to the enum, add it here too — the check below is what
 * stops an unknown ?action= reaching Postgres, where an invalid enum cast
 * THROWS rather than matching nothing.
 */
export const ACTIVITY_ACTIONS = [
  'create',
  'update',
  'delete',
  'status',
  'grant',
  'auth',
  'send',
  'export',
  'access',
] as const;

export type ActivityActionToken = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ACTION_LABELS: Record<ActivityActionToken, string> = {
  create: 'Created',
  update: 'Edited',
  delete: 'Deleted',
  status: 'Status',
  grant: 'Access',
  auth: 'Sign-in',
  send: 'Sent',
  export: 'Exported',
  access: 'Viewed',
};

export function isActivityAction(v: string): v is ActivityActionToken {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(v);
}

export type ActivityListParams = {
  page: number;
  q: string;
  actor: string;
  area: string;
  action: ActivityActionToken | '';
  range: RangeToken | '';
  /**
   * One thing's history: `?entity=ticket&entityId=<id>` scopes the feed to
   * every row ever written about that row — the `activity_log_entity_idx`
   * read `listEntityActivity` was built for. Both or neither: an entity with
   * no id (or the reverse) is dropped, never half-applied.
   */
  entity: string;
  entityId: string;
};

/** Better Auth ids are 32-char alphanumerics, app ids are uuids — one loose
 *  shape check keeps garbage out of the query either way. */
const ACTOR_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Areas are free text by design; bound the length so a filter pill can't
 *  become an unbounded ILIKE argument. */
const AREA_RE = /^[a-z-]{1,32}$/;
/** Entity kinds are the lowercase slugs the writers use ('ticket',
 *  'job-opening'); ids share ACTOR_RE's two shapes. */
const ENTITY_RE = /^[a-z-]{1,32}$/;
const ENTITY_ID_RE = ACTOR_RE;

/** The one place a history link is spelled — detail pages and the feed both
 *  build it here, so the URL contract has a single author. */
export function activityHistoryHref(entity: string, entityId: string): string {
  const qs = new URLSearchParams({ entity, entityId });
  return `/admin/logs?${qs.toString()}`;
}

/** The one query clamp, shared by the parser and the filter bar. */
export const ACTIVITY_QUERY_MAX = 200;

export function parseActivityListParams(sp: {
  [key: string]: string | string[] | undefined;
}): ActivityListParams {
  const action = firstParam(sp.action);
  const actor = firstParam(sp.actor);
  const area = firstParam(sp.area);
  const range = firstParam(sp.range);
  const entityRaw = firstParam(sp.entity);
  const entityIdRaw = firstParam(sp.entityId);
  const entityOk = ENTITY_RE.test(entityRaw) && ENTITY_ID_RE.test(entityIdRaw);
  return {
    entity: entityOk ? entityRaw : '',
    entityId: entityOk ? entityIdRaw : '',
    page: parsePage(firstParam(sp.page)),
    // 200, matching every other list surface. It was 100 here alone, which
    // meant one search box silently truncated a long query and the rest did
    // not — invisible, and impossible to tell apart from "no results". The
    // filter bar clamps with the SAME constant: a bar that clamped shorter
    // than the parser re-navigated every 300 ms on a query between the two.
    q: firstParam(sp.q).slice(0, ACTIVITY_QUERY_MAX).trim(),
    actor: ACTOR_RE.test(actor) ? actor : '',
    area: AREA_RE.test(area) ? area : '',
    action: isActivityAction(action) ? action : '',
    range: isRangeToken(range) ? range : '',
  };
}

/** Build a URL for the list, dropping empties so the bare path stays
 *  canonical (?page=1 is never emitted). */
export function activityListQs(
  params: ActivityListParams,
  overrides: Partial<ActivityListParams> = {},
): string {
  const next = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (next.q) qs.set('q', next.q);
  if (next.actor) qs.set('actor', next.actor);
  if (next.area) qs.set('area', next.area);
  if (next.action) qs.set('action', next.action);
  if (next.range) qs.set('range', next.range);
  if (next.entity && next.entityId) {
    qs.set('entity', next.entity);
    qs.set('entityId', next.entityId);
  }
  if (next.page > 1) qs.set('page', String(next.page));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function hasActiveActivityFilters(p: ActivityListParams): boolean {
  return Boolean(p.q || p.actor || p.area || p.action || p.range || p.entity);
}

/** The shape listActivity() consumes. `since` comes from the shared window
 *  resolver; there is no `until` because the feed only ever looks backwards. */
export function toActivityFilters(tz: string, p: ActivityListParams) {
  // from/to are empty: the feed offers rolling presets only. A custom
  // calendar range is a filter for auditing a known incident window — add it
  // by passing the params through, not by duplicating the resolver.
  //
  // Both this window and the feed's day HEADINGS now resolve in `tz`, so a
  // `?range=today` filter and the "Today" heading agree. They used to disagree
  // by the UTC offset: the resolver anchored on UTC midnight while the headings
  // bucketed on the Vancouver day.
  const { since } = resolveDateWindow(tz, { range: p.range, from: '', to: '' });
  return {
    ...(p.q ? { q: p.q } : {}),
    ...(p.actor ? { actorId: p.actor } : {}),
    ...(p.area ? { area: p.area } : {}),
    ...(p.action ? { action: p.action } : {}),
    ...(since ? { since } : {}),
    ...(p.entity && p.entityId ? { entity: p.entity, entityId: p.entityId } : {}),
  };
}
