import type { InboxView } from '@/db/adminQueries';

/**
 * URL-state contract for the admin inbox lists (/admin/inquiries,
 * /admin/applications): parsing, canonical serialization, and the date-window
 * math shared by the list pages, the CSV export, and the client filter bar.
 * Deliberately a zero-runtime-dependency leaf (referralOptions.ts pattern) so
 * client components can import it without dragging anything server-only into
 * their chunk — the InboxView import above is type-only and erases.
 *
 * Canonical param order: status, q, service, role, source, range, from, to,
 * sort, page. Defaults are dropped from the URL. `range` (rolling preset) and
 * `from`/`to` (custom window) are mutually exclusive — a custom bound wins and
 * zeroes the preset, so the two can never disagree about the window.
 */

export type InboxSort = 'newest' | 'oldest';

export const INBOX_RANGE_PRESETS = [
  { token: 'today', label: 'Today', days: 1 },
  { token: '7d', label: 'Last 7 days', days: 7 },
  { token: '30d', label: 'Last 30 days', days: 30 },
  { token: '90d', label: 'Last 90 days', days: 90 },
] as const;

export type RangeToken = (typeof INBOX_RANGE_PRESETS)[number]['token'];

const RANGE_DAYS: ReadonlyMap<string, number> = new Map(
  INBOX_RANGE_PRESETS.map((p) => [p.token, p.days]),
);

export function isRangeToken(value: string): value is RangeToken {
  return RANGE_DAYS.has(value);
}

/** Everything the list URL can carry besides the existing status tab + page. */
export type InboxListParams = {
  q: string;
  service: string;
  role: string;
  source: string;
  range: RangeToken | '';
  from: string;
  to: string;
  sort: InboxSort;
};

const Q_MAX_LENGTH = 200;
const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shape-valid AND calendar-valid. The round-trip compare is load-bearing:
 * V8 doesn't reject an out-of-range day in the full ISO form — it rolls
 * "2026-02-31" over to March 3 — so NaN-checking alone would let a phantom
 * date through to the query window.
 */
function parseDateParam(value: string): string {
  if (!DATE_RE.test(value)) return '';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10) === value ? value : '';
}

function parseSlugParam(value: string): string {
  return SLUG_RE.test(value) ? value : '';
}

/**
 * Parse the filter params from any URL-ish source — pages pass
 * `(k) => firstParam(sp[k])`, route handlers `(k) => url.searchParams.get(k) ?? ''`.
 * Invalid values fall back to their defaults silently: these are admin working
 * URLs, not SEO surfaces, so there's nothing to redirect or 404 over.
 */
export function parseInboxListParams(
  get: (name: string) => string,
): InboxListParams {
  const from = parseDateParam(get('from'));
  const to = parseDateParam(get('to'));
  const rangeRaw = get('range');
  const sort = get('sort');
  return {
    q: get('q').trim().slice(0, Q_MAX_LENGTH),
    service: parseSlugParam(get('service')),
    role: parseSlugParam(get('role')),
    source: parseSlugParam(get('source')),
    // A custom bound wins over a preset so the URL never carries two windows.
    range: !from && !to && isRangeToken(rangeRaw) ? rangeRaw : '',
    from,
    to,
    sort: sort === 'oldest' ? 'oldest' : 'newest',
  };
}

const DEFAULT_PARAMS: InboxListParams = {
  q: '',
  service: '',
  role: '',
  source: '',
  range: '',
  from: '',
  to: '',
  sort: 'newest',
};

/**
 * Canonical query string (no leading `?`): fixed key order, defaults dropped,
 * `page` appended last and only when > 1. Passing `view: 'inbox'` therefore
 * yields a status-less string — the CSV ExportMenu uses exactly that to stay
 * tab-independent.
 */
export function inboxListQs(
  view: InboxView,
  params: Partial<InboxListParams>,
  page?: number,
): string {
  const p = { ...DEFAULT_PARAMS, ...params };
  const qs = new URLSearchParams();
  if (view !== 'inbox') qs.set('status', view);
  if (p.q) qs.set('q', p.q);
  if (p.service) qs.set('service', p.service);
  if (p.role) qs.set('role', p.role);
  if (p.source) qs.set('source', p.source);
  if (p.from || p.to) {
    if (p.from) qs.set('from', p.from);
    if (p.to) qs.set('to', p.to);
  } else if (p.range) {
    qs.set('range', p.range);
  }
  if (p.sort === 'oldest') qs.set('sort', 'oldest');
  if (page && page > 1) qs.set('page', String(page));
  return qs.toString();
}

/** `since` inclusive, `until` exclusive — ready for `gte`/`lt` on createdAt. */
export type DateWindow = { since?: Date; until?: Date };

/**
 * Resolve the URL's date params into a concrete window. Presets are rolling
 * windows resolved at request time against UTC midnight (a bookmarked
 * `?range=7d` always means "the last 7 days"); `setUTCDate` rollback, never ms
 * math, so day-length quirks can't skew the edge. Custom `from`/`to` are
 * calendar days: `to` is inclusive of that whole day, so `until` is the next
 * UTC midnight. A `from` later than `to` yields an empty window honestly —
 * no swap magic.
 */
export function resolveDateWindow(
  params: Pick<InboxListParams, 'range' | 'from' | 'to'>,
  now: Date = new Date(),
): DateWindow {
  if (params.from || params.to) {
    const window: DateWindow = {};
    if (params.from) window.since = new Date(`${params.from}T00:00:00.000Z`);
    if (params.to) {
      const until = new Date(`${params.to}T00:00:00.000Z`);
      until.setUTCDate(until.getUTCDate() + 1);
      window.until = until;
    }
    return window;
  }
  const days = params.range ? RANGE_DAYS.get(params.range) : undefined;
  if (!days) return {};
  const since = new Date(now);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { since };
}

/**
 * The filter shape the query builder consumes (`submissionsWhere` in
 * adminQueries.ts). Declared here, not there, so the client filter bar can
 * share the params types without an adminQueries value import.
 */
export type InboxFilters = {
  q?: string;
  service?: string;
  role?: string;
  source?: string;
  since?: Date;
  until?: Date;
};

/** Params → query filters for one kind. The other kind's facet is zeroed. */
export function toInboxFilters(
  params: InboxListParams,
  kind: 'project' | 'career',
): InboxFilters {
  const { since, until } = resolveDateWindow(params);
  return {
    q: params.q || undefined,
    service: kind === 'project' ? params.service || undefined : undefined,
    role: kind === 'career' ? params.role || undefined : undefined,
    source: params.source || undefined,
    since,
    until,
  };
}

/** True when anything beyond the status tab + sort narrows the list. */
export function hasActiveInboxFilters(params: InboxListParams): boolean {
  return Boolean(
    params.q ||
      params.service ||
      params.role ||
      params.source ||
      params.range ||
      params.from ||
      params.to,
  );
}
