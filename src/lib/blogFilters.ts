import { BLOG_POST_STATUSES, type BlogPostStatus } from '@/lib/blogFields';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE } from '@/lib/portfolioFields';
import { firstParam } from '@/utils/pagination';

/**
 * URL-state contract for the admin posts list (/admin/blogs): parsing,
 * canonical serialization, and the one status rule every reader of the list
 * has to apply the same way. Same job and shape as inboxFilters.ts /
 * activityFilters.ts, and deliberately a zero-runtime-dependency leaf for the
 * same reason: the filter bar, the list page, the row menu and
 * scripts/check-blogs.mts all import it, so nothing here may pull in zod,
 * drizzle, `server-only` or React. `BLOG_POST_STATUSES` is a value import
 * from the equally client-safe blogFields.ts; `BlogPostStatus` is type-only
 * and erases at build time.
 *
 * Canonical param order: status, q, author, category, sort, page. Defaults
 * are dropped from the URL, so the bare `/admin/blogs` and
 * `/admin/blogs?status=all&sort=updated` never render as two different pages
 * for the same view.
 */

// ── Status tabs ──────────────────────────────────────────────────────────────

/**
 * The tab vocabulary: every stored status, plus the `all` view that opens by
 * default. Built ON `BlogPostStatus` rather than restated by hand, so a
 * status added later to `BLOG_POST_STATUSES` is automatically a legal tab
 * here too — the alternative is a status nothing on the list can ever select.
 */
export type BlogListStatus = 'all' | BlogPostStatus;

export function isBlogListStatus(value: string): value is BlogListStatus {
  return value === 'all' || (BLOG_POST_STATUSES as readonly string[]).includes(value);
}

/**
 * Which statuses a tab means, as the explicit list the query layer applies
 * verbatim (task 13's `listAdminPosts`, never a second inline condition — the
 * two must not drift).
 *
 * `all` is WordPress's "everything but the bin": the view a writer opens by
 * default, not an unfiltered one. Returning `null` here would tell the query
 * layer "no filter," which for `all` would surface trashed posts on the one
 * tab nobody thinks to check for them — so `all` always resolves to the four
 * non-trash statuses, and `trash` stays reachable only as its own tab.
 */
export function blogStatusFilter(status: BlogListStatus): BlogPostStatus[] | null {
  if (status === 'all') {
    return BLOG_POST_STATUSES.filter((s) => s !== 'trash');
  }
  return [status];
}

// ── Sort ──────────────────────────────────────────────────────────────────

export const BLOG_LIST_SORTS = ['updated', 'published', 'title'] as const;

export type BlogListSort = (typeof BLOG_LIST_SORTS)[number];

export function isBlogListSort(value: string): value is BlogListSort {
  return (BLOG_LIST_SORTS as readonly string[]).includes(value);
}

// ── Params ──────────────────────────────────────────────────────────────────

/** Everything the list URL carries. */
export type BlogListParams = {
  status: BlogListStatus;
  q: string;
  author: string;
  category: string;
  sort: BlogListSort;
  page: number;
};

// Matches inboxFilters.ts's own Q_MAX_LENGTH: one cap for every search box in
// the dashboard, so a query long enough to truncate on one list truncates the
// same way everywhere rather than reading as a silent difference in behavior.
const Q_MAX_LENGTH = 200;

/**
 * Author and category are slugs, so they share ONE shape check with the post
 * slug itself: lowercase kebab, capped at `PORTFOLIO_SLUG_MAX`. That is the
 * same combination blogPostSchema.ts builds with zod
 * (`z.string().max(BLOG_SLUG_MAX).regex(PORTFOLIO_SLUG_RE)`); this leaf
 * cannot import that schema without dragging zod into every client that
 * imports this module, so it reaches for the same two zero-dependency
 * constants directly instead of restating either one.
 */
function parseSlugParam(value: string): string {
  return value.length <= PORTFOLIO_SLUG_MAX && PORTFOLIO_SLUG_RE.test(value) ? value : '';
}

/**
 * Sane ceiling on a hand-typed `?page=`, matching the clamp every list query
 * in this dashboard already applies a layer down
 * (`Math.min(Math.max(1, Math.trunc(page)), 1_000_000)` in ticketQueries.ts,
 * activityQueries.ts, adminQueries.ts and taskQueries.ts). Applying the same
 * bound here too means a bookmarked or hand-typed nine-figure page number
 * never even reaches a query builder as anything but an already-sane value.
 */
const MAX_PAGE = 1_000_000;

/**
 * `value` is arbitrary URL text, never trusted as a number outright: it must
 * become a whole page at least 1, both because `Number('')` (the missing-
 * param case) is 0, not `NaN`, and because `Number('abc')` is `NaN`, which
 * fails every comparison including `< 1` — so the finite/integer checks and
 * the floor both have to run before the ceiling does.
 */
function parseBlogPage(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}

/**
 * Parse the list URL from whatever a Next.js page's awaited `searchParams`
 * gives, or from a route handler's own `URLSearchParams` reduced to the same
 * record shape. Never throws: an unknown status or sort, a malformed slug,
 * and a malformed page all fall back to their default rather than erroring,
 * because a bookmarked URL from a future version of this page has to
 * degrade, not 500. `firstParam` takes the first value of a repeated key
 * rather than joining them, so `?status=draft&status=published` reads as
 * `draft`, never `draft,published`.
 */
export function parseBlogListParams(
  sp: Record<string, string | string[] | undefined>,
): BlogListParams {
  const status = firstParam(sp.status);
  const sort = firstParam(sp.sort);
  return {
    status: isBlogListStatus(status) ? status : 'all',
    q: firstParam(sp.q).trim().slice(0, Q_MAX_LENGTH),
    author: parseSlugParam(firstParam(sp.author)),
    category: parseSlugParam(firstParam(sp.category)),
    // 'updated' rather than 'published': drafts and scheduled posts have no
    // publish date to sort on, but every row has a last-touched instant, so
    // it is the one ordering that means something on every tab including the
    // one that opens by default.
    sort: isBlogListSort(sort) ? sort : 'updated',
    page: parseBlogPage(firstParam(sp.page)),
  };
}

const DEFAULT_PARAMS: BlogListParams = {
  status: 'all',
  q: '',
  author: '',
  category: '',
  sort: 'updated',
  page: 1,
};

/**
 * Canonical query string, no leading `?`: fixed key order (status, q, author,
 * category, sort, page), every default dropped. Callers prepend their own
 * `?` when building a full href (the inboxListQs convention) — pass a
 * partial object, as the filter bar does when only one facet changed, and
 * the rest fill in from the defaults, so `blogListQs({ category: 'production' })`
 * alone is a legal call.
 */
export function blogListQs(params: Partial<BlogListParams>): string {
  const p = { ...DEFAULT_PARAMS, ...params };
  const qs = new URLSearchParams();
  if (p.status !== 'all') qs.set('status', p.status);
  if (p.q) qs.set('q', p.q);
  if (p.author) qs.set('author', p.author);
  if (p.category) qs.set('category', p.category);
  if (p.sort !== 'updated') qs.set('sort', p.sort);
  if (p.page > 1) qs.set('page', String(p.page));
  return qs.toString();
}
