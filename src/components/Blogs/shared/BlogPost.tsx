'use client';

import {
  ClearFilters,
  Container,
  FilterRail,
  PaginationScroll,
  ResultCount,
} from '@/components';
import BlogCard from './BlogCard';
import { blogPosts, BLOG_PAGE_SIZE } from '@/constants/blogs';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuFlame as Flame,
  LuSparkles as Sparkles,
  LuTag as Tag,
} from 'react-icons/lu';
import { getCategoryIcon } from '@/utils/categoryIcon';
import { getPageNumbers } from '@/utils/pagination';

// The listing grid is at most 4 columns (xl:grid-cols-4), so the
// above-the-fold first row is up to 4 cards. idx 0 keeps `priority` as the one
// designated LCP; idx 1–3 get `loading="eager"` instead. Those cards are equal
// in size, so any of them can win the LCP race on a wide viewport — and a
// *lazy* image winning is exactly what trips Next's "image was the LCP" dev
// warning. `loading="eager"` is the fix Next's own warning points to, and it
// keeps `priority` reserved for a single image the way Next recommends. Only
// applies when `prioritizeFirst` marks the grid as above the fold (the /blogs
// index); the related-post grids on detail pages stay fully lazy.
const FIRST_ROW_COLUMNS = 4;

// Static per-category aggregates. `blogPosts` is a build-time constant,
// so counts and latest-post timestamps don't change at runtime — compute
// them once at module load instead of on every component mount. Freshness
// (a time-relative boolean) is still derived inside the component so it
// reflects the current `Date.now()`.
const CATEGORY_STATS = (() => {
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
    // Most-recent activity first; gives a continuous recency gradient
    // instead of a hard fresh/stale split. Alphabetical breaks ties so
    // categories without a parseable `datetime` stay deterministic.
    if (b.latestTime !== a.latestTime) return b.latestTime - a.latestTime;
    return a.title.localeCompare(b.title);
  });
})();

const TOTAL_POST_COUNT = blogPosts.length;

// Calibrated for ~2–3 posts/day publishing cadence. Narrow enough that
// stale categories stand out by lacking an indicator.
const HOT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type BlogPostProps = {
  limit?: number;

  // Controls whether the category chips (filter UI) are rendered.
  showFilters?: boolean;

  // Controls whether the list is actually filtered by the `category` search param.
  // If false, it always renders all posts, but category badges can still link to the blog list page.
  enableFiltering?: boolean;

  // When filtering is disabled (or when you render this component outside `/blogs`),
  // category links should point to the canonical blog list route.
  filterBasePath?: string;

  // When `enableFiltering` is false (e.g. blog detail page), you can force a category.
  forcedCategorySlug?: string;

  // Curated list of post slugs to render in order. Wins over
  // `forcedCategorySlug` when set — used by the "Related Articles" section
  // when a post defines an explicit `relatedPosts` list.
  forcedSlugs?: string[];

  // Exclude a specific post from the list (usually the current post on the detail page).
  excludeSlug?: string;

  // Server-provided URL state for the blog index. Avoids a useSearchParams()
  // CSR bailout so crawlers receive article links in the initial HTML.
  initialCategory?: string;
  initialPage?: number;

  // When true, the first card's image is rendered with `priority` so it can be
  // the LCP candidate (used on /blogs, where the grid is above the fold).
  // Leave false on the blog detail page where the article hero owns LCP.
  prioritizeFirst?: boolean;
};

const BlogPost = ({
  limit,
  showFilters = true,
  enableFiltering = true,
  filterBasePath = '/blogs',
  forcedCategorySlug,
  forcedSlugs,
  excludeSlug,
  initialCategory = '',
  initialPage = 1,
  prioritizeFirst = false,
}: BlogPostProps) => {
  const pathname = usePathname();

  // The filter lives in the URL: /blogs?category=<category-slug>
  // When `enableFiltering` is false (e.g. blog detail page), use `forcedCategorySlug`.
  const activeCategory = enableFiltering
    ? initialCategory || 'all'
    : (forcedCategorySlug ?? 'all');

  // Filtering is "active" only when a real category is selected on /blogs — the
  // forced-category contexts (related posts) have nothing for the reader to clear.
  const filtering = enableFiltering && activeCategory !== 'all';

  // Pagination lives in the URL too: /blogs?page=N. Disabled when filtering
  // is off (related-posts contexts) or when a hard `limit` is supplied.
  const paginationEnabled = enableFiltering && typeof limit !== 'number';
  const requestedPage = Math.max(1, Math.floor(initialPage));

  const { categories, totalCount } = useMemo(() => {
    // Two-tier recency signal, decoupled from sort:
    //   hot   = posted in the last 7 days  (amber dot)
    //   fresh = posted in the last 30 days (emerald dot)
    // `isHot` implies `isFresh`; the chip renders the higher tier only.
    const now = Date.now();
    const cats = CATEGORY_STATS.map(({ slug, title, count, latestTime }) => {
      const age = latestTime > 0 ? now - latestTime : Infinity;
      return {
        slug,
        title,
        count,
        isHot: age < HOT_WINDOW_MS,
        isFresh: age < FRESH_WINDOW_MS,
      };
    });

    return { categories: cats, totalCount: TOTAL_POST_COUNT };
  }, []);

  const createHref = (categorySlug: string | null) => {
    const basePath = enableFiltering ? pathname : filterBasePath;

    // If filtering is enabled, preserve the active category filter.
    // Otherwise, build a clean link to the canonical blog list page.
    const params = new URLSearchParams();

    if (enableFiltering) {
      if (activeCategory !== 'all') params.set('category', activeCategory);
    }

    const nextCategory =
      !categorySlug || categorySlug === 'all' ? 'all' : categorySlug;

    // Treat missing/"all" as no filter.
    if (nextCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Page links preserve the active category filter but rewrite the page number.
  // Page 1 omits the `page` param so the canonical URL stays clean. URLs are
  // emitted without a `#posts` fragment so crawlers (Semrush etc.) don't see
  // the fragment-bearing URLs as canonicalised duplicates — scroll-to-grid
  // UX is handled client-side by the effect below.
  const createPageHref = (pageNum: number) => {
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (pageNum > 1) params.set('page', String(pageNum));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const basePosts = useMemo(() => {
    // Sort newest -> oldest using the ISO `datetime` field, then by `id`
    // (higher id first) as a tie-breaker so posts sharing a date order
    // deterministically by insertion recency.
    const sortedPosts = [...blogPosts].sort((a, b) => {
      const bt = Date.parse(b.datetime);
      const at = Date.parse(a.datetime);

      const bTime = Number.isFinite(bt) ? bt : 0;
      const aTime = Number.isFinite(at) ? at : 0;

      if (bTime !== aTime) return bTime - aTime;

      return b.id - a.id;
    });

    // Curated `forcedSlugs` wins: render those specific posts in the
    // requested order, skipping any that don't exist. Falls back to the
    // category-filtered chronology when no curated list is supplied.
    const curated = forcedSlugs?.length
      ? (forcedSlugs
          .map((slug) => sortedPosts.find((p) => p.slug === slug))
          .filter(Boolean) as typeof sortedPosts)
      : null;

    const baseList =
      curated ??
      (activeCategory !== 'all'
        ? sortedPosts.filter((p) => p.category.slug === activeCategory)
        : sortedPosts);

    return baseList.filter((p) =>
      excludeSlug ? p.slug !== excludeSlug : true,
    );
  }, [activeCategory, excludeSlug, forcedSlugs]);

  const posts = useMemo(() => {
    const count =
      typeof limit === 'number'
        ? Math.max(0, Math.floor(limit))
        : basePosts.length;

    return count === basePosts.length ? basePosts : basePosts.slice(0, count);
  }, [basePosts, limit]);

  // Pagination math. When pagination is off the page window equals `posts`
  // and `totalPages` collapses to 1, so the UI below renders untouched.
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE))
    : 1;
  const activePage = Math.min(requestedPage, totalPages);
  const paginatedPosts = paginationEnabled
    ? posts.slice((activePage - 1) * BLOG_PAGE_SIZE, activePage * BLOG_PAGE_SIZE)
    : posts;

  return (
    <section className="pb-16">
      <Container>
        {showFilters && (
          <>
            <div className="mb-4">
              <FilterRail activeSlug={activeCategory}>
              <Link
                href={createHref(null)}
                aria-label={`All posts, ${totalCount} total`}
                data-active={activeCategory === 'all'}
                className={`inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-black text-white'
                    : 'bg-black/10 text-black hover:bg-black/20'
                }`}
              >
                <Tag
                  className={`h-3 w-3 ${
                    activeCategory === 'all' ? 'opacity-90' : 'opacity-60'
                  }`}
                  aria-hidden="true"
                />
                <span aria-hidden="true" className="leading-none">
                  All
                </span>
                <span
                  aria-hidden="true"
                  className={`leading-none tabular-nums ${
                    activeCategory === 'all'
                      ? 'text-white/60'
                      : 'text-black/50'
                  }`}
                >
                  {totalCount}
                </span>
              </Link>

              {categories.map(({ slug, title, count, isHot, isFresh }) => {
                const Icon = getCategoryIcon(slug);
                const isActive = activeCategory === slug;

                // Tiered: hot (≤2d, flame) trumps fresh (≤7d, sparkles).
                const indicator = isHot
                  ? {
                      Icon: Flame,
                      label: 'New post in the last 2 days',
                      color: isActive
                        ? 'text-amber-300 dark:text-amber-700'
                        : 'text-amber-500',
                    }
                  : isFresh
                    ? {
                        Icon: Sparkles,
                        label: 'New post in the last 7 days',
                        color: isActive
                          ? 'text-emerald-300 dark:text-emerald-700'
                          : 'text-emerald-500',
                      }
                    : null;

                const countLabel = count === 1 ? '1 post' : `${count} posts`;
                const recencyLabel = isHot
                  ? ', new in the last 2 days'
                  : isFresh
                    ? ', new in the last 7 days'
                    : '';
                const ariaLabel = `${title}, ${countLabel}${recencyLabel}`;

                return (
                  <Link
                    key={slug}
                    href={createHref(slug)}
                    aria-label={ariaLabel}
                    data-active={isActive}
                    className={`inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] transition-colors ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-black/10 text-black hover:bg-black/20'
                    }`}
                  >
                    <Icon
                      className={`h-3 w-3 ${
                        isActive ? 'opacity-90' : 'opacity-60'
                      }`}
                      aria-hidden="true"
                    />
                    <span aria-hidden="true" className="leading-none">
                      {title}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`leading-none tabular-nums ${
                        isActive ? 'text-white/60' : 'text-black/50'
                      }`}
                    >
                      {count}
                    </span>
                    {indicator && (
                      <span
                        aria-hidden="true"
                        title={indicator.label}
                        className="inline-flex"
                      >
                        <indicator.Icon
                          aria-hidden="true"
                          className={`h-3 w-3 ${indicator.color}`}
                        />
                      </span>
                    )}
                  </Link>
                );
              })}
              </FilterRail>
            </div>

            <hr className="my-4 border-black/30" />
          </>
        )}

        {posts.length === 0 ? (
          <div className="py-16 text-center sm:py-24">
            <p className="text-sm font-semibold text-black/60">
              {enableFiltering
                ? 'No posts found yet'
                : 'No related posts found for this blog.'}
            </p>
            {filtering && (
              <>
                <p className="mt-3 text-sm text-black/60">
                  Nothing’s filed under this filter yet — clear it to see every
                  post.
                </p>
                <ClearFilters
                  href={createHref(null)}
                  variant="solid"
                  className="mt-6"
                />
              </>
            )}
          </div>
        ) : (
          <>
          <div id="posts" className="mt-8 scroll-mt-24">
            <PaginationScroll page={initialPage} targetId="posts" />
            {paginationEnabled && (
              <div className="mb-6 flex items-center justify-between gap-3">
                <ResultCount
                  page={activePage}
                  pageSize={BLOG_PAGE_SIZE}
                  total={posts.length}
                  noun="post"
                />
                {filtering && <ClearFilters href={createHref(null)} />}
              </div>
            )}
          <div className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedPosts.map((post, idx) => (
              <div key={post.id}>
                <BlogCard
                  post={post}
                  priority={prioritizeFirst && idx === 0}
                  eager={prioritizeFirst && idx > 0 && idx < FIRST_ROW_COLUMNS}
                  categoryHref={createHref}
                />
              </div>
            ))}
          </div>
          </div>

          {paginationEnabled && totalPages > 1 && (
            <nav
              aria-label="Blog pagination"
              className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
            >
              {activePage > 1 && (
                <Link
                  href={createPageHref(activePage - 1)}
                  scroll={false}
                  rel="prev"
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-black/20"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                  <span>Prev</span>
                </Link>
              )}

              {getPageNumbers(activePage, totalPages).map((p, i) =>
                p === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${i}`}
                    aria-hidden="true"
                    className="px-1 text-[10px] text-black/40"
                  >
                    …
                  </span>
                ) : p === activePage ? (
                  <span
                    key={p}
                    aria-current="page"
                    aria-label={`Page ${p}, current`}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-background-contrast-black px-2 text-[10px] tabular-nums text-on-media"
                  >
                    {p}
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={createPageHref(p)}
                    scroll={false}
                    aria-label={`Page ${p}`}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/10 px-2 text-[10px] tabular-nums text-black transition-colors hover:bg-black/20"
                  >
                    {p}
                  </Link>
                ),
              )}

              {activePage < totalPages && (
                <Link
                  href={createPageHref(activePage + 1)}
                  scroll={false}
                  rel="next"
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-black/20"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
          </>
        )}
      </Container>
    </section>
  );
};

export default BlogPost;
