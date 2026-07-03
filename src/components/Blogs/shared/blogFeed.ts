import {
  BLOG_AUTHORS,
  blogPosts,
  type BlogPost as BlogPostRecord,
} from '@/constants/blogs';

/**
 * Server-side projection layer between the (large) blogPosts registry and the
 * client-rendered grid. BlogPost/BlogCard are client components, so importing
 * the registry there ships every word of it as JavaScript in the shared chunk
 * on every page. Instead, server callers select + slim the posts here and hand
 * the client a small serialized prop — the same pattern lib/navigation.ts uses
 * for the navbar mega-panels. Client code may import the *types* from this
 * module (erased at build time), never the values.
 */

export interface BlogCardData {
  id: number;
  slug: string;
  href: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  /** Display date, e.g. "February 21, 2026". */
  date: string;
  /** ISO datetime — drives sorting and the recency badge. */
  datetime: string;
  category: { slug: string; title: string };
  author: { name: string; role: string; href: string; imageUrl: string };
}

/** One filter chip on /blogs: category identity + count + freshness key. */
export interface BlogFilterCategory {
  slug: string;
  title: string;
  count: number;
  /** Epoch ms of the newest post (0 when no parseable datetime). */
  latestTime: number;
}

const toBlogCardData = (post: BlogPostRecord): BlogCardData => {
  const author = BLOG_AUTHORS[post.authorSlug];
  return {
    id: post.id,
    slug: post.slug,
    href: post.href,
    title: post.title,
    description: post.description,
    imageUrl: post.imageUrl,
    imageAlt: post.imageAlt,
    date: post.date,
    datetime: post.datetime,
    category: { slug: post.category.slug, title: post.category.title },
    author: {
      name: author.name,
      role: author.role,
      href: author.href,
      imageUrl: author.imageUrl,
    },
  };
};

// Newest -> oldest by ISO `datetime`, then by `id` (higher first) so posts
// sharing a date order deterministically by insertion recency — the same
// comparator the grid used when it sorted client-side.
const SORTED_CARDS: BlogCardData[] = [...blogPosts]
  .sort((a, b) => {
    const bt = Date.parse(b.datetime);
    const at = Date.parse(a.datetime);
    const bTime = Number.isFinite(bt) ? bt : 0;
    const aTime = Number.isFinite(at) ? at : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.id - a.id;
  })
  .map(toBlogCardData);

export const TOTAL_BLOG_POST_COUNT = blogPosts.length;

// Per-category aggregates for the filter rail. `blogPosts` is a build-time
// constant, so counts and latest-post timestamps are computed once at module
// load. Freshness (a time-relative boolean) stays client-side so it reflects
// the reader's `Date.now()`.
export const BLOG_FILTER_CATEGORIES: BlogFilterCategory[] = (() => {
  const map = new Map<
    string,
    { title: string; count: number; latestTime: number }
  >();

  for (const post of blogPosts) {
    const t = Date.parse(post.datetime);
    const time = Number.isFinite(t) ? t : 0;
    const existing = map.get(post.category.slug);

    if (existing) {
      existing.count += 1;
      if (time > existing.latestTime) existing.latestTime = time;
    } else {
      map.set(post.category.slug, {
        title: post.category.title,
        count: 1,
        latestTime: time,
      });
    }
  }

  return Array.from(map, ([slug, { title, count, latestTime }]) => ({
    slug,
    title,
    count,
    latestTime,
  })).sort((a, b) => {
    // Most-recent activity first; alphabetical breaks ties so categories
    // without a parseable `datetime` stay deterministic.
    if (b.latestTime !== a.latestTime) return b.latestTime - a.latestTime;
    return a.title.localeCompare(b.title);
  });
})();

export interface SelectBlogCardsOptions {
  /** Keep only this category's posts. Unknown slugs yield an empty list. */
  categorySlug?: string;
  /**
   * Curated slugs rendered in the given order (skipping unknowns). Wins over
   * `categorySlug` — used by "Related Articles" when a post sets
   * `relatedPosts`.
   */
  forcedSlugs?: string[];
  /** Drop one slug (usually the post being read). Applied after curation. */
  excludeSlug?: string;
  /** Cap the list length. Applied last. */
  limit?: number;
}

/** Newest-first card selection — the server-side twin of the grid's old
 *  client-side curation logic (identical semantics + ordering). */
export function selectBlogCards({
  categorySlug,
  forcedSlugs,
  excludeSlug,
  limit,
}: SelectBlogCardsOptions = {}): BlogCardData[] {
  const curated = forcedSlugs?.length
    ? forcedSlugs
        .map((slug) => SORTED_CARDS.find((p) => p.slug === slug))
        .filter((p): p is BlogCardData => Boolean(p))
    : null;

  let list =
    curated ??
    (categorySlug
      ? SORTED_CARDS.filter((p) => p.category.slug === categorySlug)
      : SORTED_CARDS);

  if (excludeSlug) list = list.filter((p) => p.slug !== excludeSlug);

  return typeof limit === 'number'
    ? list.slice(0, Math.max(0, Math.floor(limit)))
    : list;
}
