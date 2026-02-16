'use client';

import { BorderBeam, Container, ImageKit, TextShimmer } from '@/app/components';
import { blogPosts } from '@/app/constants/blogs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import Fuse from 'fuse.js';
import {
  ArrowUpRight,
  Calendar,
  Globe,
  Megaphone,
  Tag,
  Video,
  type LucideIcon,
} from 'lucide-react';

type Blog = (typeof blogPosts)[number];

type MatchIndex = readonly [number, number];

type HighlightMatch = {
  value: string;
  indices: readonly MatchIndex[];
};

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  website: Globe,
  'digital-marketing': Megaphone,
  'videography-and-photography': Video,
};

function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICON_MAP[slug] ?? Tag;
}

function mergeIndices(indices: readonly MatchIndex[]): MatchIndex[] {
  if (!indices.length) return [];
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const merged: MatchIndex[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const [mStart, mEnd] = merged[merged.length - 1];

    if (start <= mEnd + 1) {
      merged[merged.length - 1] = [mStart, Math.max(mEnd, end)];
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}

function renderHighlightedText(text: string, match?: HighlightMatch) {
  if (!match || !match.indices?.length) return text;

  const merged = mergeIndices(match.indices);
  const parts: React.ReactNode[] = [];

  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) parts.push(text.slice(cursor, start));
    parts.push(
      <span key={`${start}-${end}`} className="rounded-sm bg-black/10 px-0.5">
        {text.slice(start, end + 1)}
      </span>,
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return parts;
}

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

  // Exclude a specific post from the list (usually the current post on the detail page).
  excludeSlug?: string;
};

const BlogPost = ({
  limit,
  showFilters = true,
  enableFiltering = true,
  filterBasePath = '/blogs',
  forcedCategorySlug,
  excludeSlug,
}: BlogPostProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Search lives in the URL: /blogs?query=<text>
  // We only respect it when filtering is enabled (i.e. on /blogs).
  const activeQuery = enableFiltering
    ? (searchParams.get('query') ?? '').trim()
    : '';

  const [searchValue, setSearchValue] = useState(activeQuery);

  // Keep input in sync when URL changes (back/forward, chip clicks, etc.)
  useEffect(() => {
    if (!enableFiltering) return;
    setSearchValue(activeQuery);
  }, [enableFiltering, activeQuery]);

  // Update the URL as the user types (debounced) so we don't spam router.replace.
  useEffect(() => {
    if (!enableFiltering) return;

    const next = searchValue.trim();

    // No-op if the URL already matches the input.
    if (next === activeQuery) return;

    const id = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (next) params.set('query', next);
      else params.delete('query');

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(id);
  }, [
    searchValue,
    enableFiltering,
    activeQuery,
    pathname,
    router,
    searchParams,
  ]);

  // The filter lives in the URL: /blogs?category=<category-slug>
  // When `enableFiltering` is false (e.g. blog detail page), use `forcedCategorySlug`.
  const activeCategory = enableFiltering
    ? (searchParams.get('category') ?? 'all')
    : (forcedCategorySlug ?? 'all');

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of blogPosts) {
      map.set(post.category.slug, post.category.title);
    }

    return Array.from(map, ([slug, title]) => ({ slug, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, []);

  const createHref = (categorySlug: string | null) => {
    const basePath = enableFiltering ? pathname : filterBasePath;

    // If filtering is enabled, preserve existing params (nice UX on /blogs).
    // Otherwise, build a clean link to the canonical blog list page.
    const params = enableFiltering
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();

    const nextCategory =
      !categorySlug || categorySlug === 'all' ? 'all' : categorySlug;

    // If the user is switching categories, clear the search query.
    // (Search is scoped to the current category in your UX.)
    if (enableFiltering && nextCategory !== activeCategory) {
      params.delete('query');
    }

    // Treat missing/"all" as no filter.
    if (nextCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const basePosts = useMemo(() => {
    // Sort newest -> oldest using the ISO `datetime` field.
    const sortedPosts = [...blogPosts].sort((a, b) => {
      const bt = Date.parse(b.datetime);
      const at = Date.parse(a.datetime);

      const bTime = Number.isFinite(bt) ? bt : 0;
      const aTime = Number.isFinite(at) ? at : 0;

      return bTime - aTime;
    });

    const categoryFiltered =
      activeCategory !== 'all'
        ? sortedPosts.filter((p) => p.category.slug === activeCategory)
        : sortedPosts;

    return categoryFiltered.filter((p) =>
      excludeSlug ? p.slug !== excludeSlug : true,
    );
  }, [activeCategory, excludeSlug]);

  // Smart search: fuzzy match + relevance ranking
  const fuse = useMemo(() => {
    return new Fuse<Blog>(basePosts as Blog[], {
      includeScore: true,
      threshold: 0.35, // lower = stricter, higher = fuzzier
      ignoreLocation: true,
      useExtendedSearch: true,
      includeMatches: true,
      minMatchCharLength: 2,
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'description', weight: 0.25 },
        { name: 'category.title', weight: 0.15 },
        { name: 'category.slug', weight: 0.1 },
        { name: 'author.name', weight: 0.05 },
      ],
    });
  }, [basePosts]);

  const searchMeta = useMemo(() => {
    const q = activeQuery.trim();
    if (!q) return null;

    // Limit results to keep UI snappy on large lists.
    return fuse.search(q).slice(0, 50);
  }, [activeQuery, fuse]);

  const matchMap = useMemo(() => {
    const map = new Map<
      string,
      { title?: HighlightMatch; description?: HighlightMatch }
    >();
    if (!searchMeta) return map;

    for (const r of searchMeta) {
      const id = String((r.item as Blog).id);
      const titleMatch = r.matches?.find((m) => m.key === 'title');
      const descMatch = r.matches?.find((m) => m.key === 'description');

      map.set(id, {
        title: titleMatch
          ? {
              value: String(titleMatch.value ?? r.item.title),
              indices: (titleMatch.indices ?? []) as readonly MatchIndex[],
            }
          : undefined,
        description: descMatch
          ? {
              value: String(descMatch.value ?? r.item.description),
              indices: (descMatch.indices ?? []) as readonly MatchIndex[],
            }
          : undefined,
      });
    }

    return map;
  }, [searchMeta]);

  const posts = useMemo(() => {
    const count =
      typeof limit === 'number'
        ? Math.max(0, Math.floor(limit))
        : basePosts.length;

    const q = activeQuery.trim();

    if (!q) {
      return count === basePosts.length ? basePosts : basePosts.slice(0, count);
    }

    const results = searchMeta ?? [];

    // Blend relevance (Fuse score) with recency (newer is better).
    // final = relevanceWeight*score + recencyWeight*normalizedAge
    // Lower final is better.
    const now = Date.now();
    const relevanceWeight = 0.75;
    const recencyWeight = 0.25;

    const ranked = results
      .slice()
      .sort((a, b) => {
        const as = a.score ?? 1;
        const bs = b.score ?? 1;

        const ad = Date.parse(a.item.datetime);
        const bd = Date.parse(b.item.datetime);

        const aAgeDays = Number.isFinite(ad)
          ? (now - ad) / (1000 * 60 * 60 * 24)
          : 3650;
        const bAgeDays = Number.isFinite(bd)
          ? (now - bd) / (1000 * 60 * 60 * 24)
          : 3650;

        // Normalize age to ~0..10 range so it doesn't dominate the Fuse score.
        const aAge = Math.min(10, Math.max(0, aAgeDays / 365));
        const bAge = Math.min(10, Math.max(0, bAgeDays / 365));

        const aFinal = relevanceWeight * as + recencyWeight * aAge;
        const bFinal = relevanceWeight * bs + recencyWeight * bAge;

        if (aFinal !== bFinal) return aFinal - bFinal;

        // Tie-break: newest wins.
        return (Number.isFinite(bd) ? bd : 0) - (Number.isFinite(ad) ? ad : 0);
      })
      .map((r) => r.item);

    return count === ranked.length ? ranked : ranked.slice(0, count);
  }, [activeQuery, basePosts, limit, searchMeta]);

  const suggestions = useMemo(() => {
    if (!enableFiltering) return null;

    const q = searchValue.trim();
    if (q.length < 2) return null;

    // Top post suggestions
    // - Prefer the same Fuse results used by the grid (searchMeta)
    // - If there are no results (e.g. user typed nonsense), run a looser fallback search
    // - If that still yields nothing, fall back to newest posts
    let topPosts = (searchMeta ?? []).slice(0, 5).map((r) => r.item);

    if (!topPosts.length) {
      const fallbackFuse = new Fuse<Blog>(basePosts as Blog[], {
        includeScore: true,
        threshold: 0.6, // much fuzzier than the main grid search
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'description', weight: 0.25 },
          { name: 'category.title', weight: 0.1 },
          { name: 'author.name', weight: 0.05 },
        ],
      });

      topPosts = fallbackFuse
        .search(q)
        .slice(0, 5)
        .map((r) => r.item);
    }

    if (!topPosts.length) {
      topPosts = basePosts.slice(0, 5);
    }

    // Category suggestions: fuzzy-match against category titles/slugs.
    const catFuse = new Fuse(categories, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: ['title', 'slug'],
    });

    const topCategories = catFuse
      .search(q)
      .slice(0, 4)
      .map((r) => r.item);

    return {
      topPosts,
      topCategories,
    };
  }, [basePosts, categories, enableFiltering, searchMeta, searchValue]);

  const showTopMatchesInSuggestions = enableFiltering && posts.length === 0;

  return (
    <section className="pb-16">
      <Container>
        {showFilters && (
          <>
            {enableFiltering && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex-1">
                  <PlaceholdersAndVanishInput
                    placeholders={[
                      'Search articles…',
                      'Try: Strategy, Branding, SEO, Web Design…',
                      'Search by Title, Topic, or Author…',
                      'Use quotes for exact matches: "Content Strategy"',
                      'Filter ideas: B2B, Ecommerce, SaaS, Startups…',
                      'Vancouver Digital Marketing',
                      'Landing Page Redesign',
                      'Social Media Audit',
                      'Website Funnel Optimization',
                      'Case Studies',
                      '2026 Trends',
                    ]}
                    value={searchValue}
                    onValueChange={setSearchValue}
                    onChange={(e) => {
                      // state is handled via onValueChange
                      void e;
                    }}
                    enableVanish={false}
                    showSubmitButton={false}
                  />
                </div>
              </div>
            )}

            {enableFiltering &&
            suggestions &&
            (suggestions.topCategories.length ||
              (showTopMatchesInSuggestions && suggestions.topPosts.length)) ? (
              <div className="mb-4 rounded-2xl border border-black/10 bg-background-contrast p-3">
                {showTopMatchesInSuggestions && suggestions.topPosts.length ? (
                  <div>
                    <p className="text-[10px] text-black/60">Top matches</p>
                    <div className="mt-2 grid gap-2">
                      {suggestions.topPosts.map((p) => (
                        <Link
                          key={p.id}
                          href={p.href}
                          className="flex items-center justify-between gap-2 rounded-xl bg-background-contrast-black/5 px-3 py-2 text-[10px] text-black hover:bg-background-contrast-black/10"
                        >
                          <TextShimmer as="h3" className="line-clamp-1">
                            {p.title}
                          </TextShimmer>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggestions.topCategories.length ? (
                  <div
                    className={
                      showTopMatchesInSuggestions && suggestions.topPosts.length
                        ? 'mt-4'
                        : ''
                    }
                  >
                    <p className="text-[10px] text-black/60">Categories</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestions.topCategories.map((c) => {
                        const Icon = getCategoryIcon(c.slug);
                        return (
                          <Link
                            key={c.slug}
                            href={createHref(c.slug)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-[10px] text-black hover:bg-background-contrast-black/15"
                          >
                            <Icon
                              className="h-3 w-3 opacity-60"
                              aria-hidden="true"
                            />
                            <span className="leading-none">{c.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href={createHref(null)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-background-contrast-black text-white'
                    : 'bg-background-contrast-black/10 text-black'
                }`}
              >
                <Tag
                  className={`h-3 w-3 ${
                    activeCategory === 'all' ? 'opacity-90' : 'opacity-60'
                  }`}
                  aria-hidden="true"
                />
                <span className="leading-none">All</span>
              </Link>

              {categories.map(({ slug, title }) => {
                const Icon = getCategoryIcon(slug);
                return (
                  <Link
                    key={slug}
                    href={createHref(slug)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] transition-colors ${
                      activeCategory === slug
                        ? 'bg-background-contrast-black text-white'
                        : 'bg-background-contrast-black/10 text-black'
                    }`}
                  >
                    <Icon
                      className={`h-3 w-3 ${
                        activeCategory === slug ? 'opacity-90' : 'opacity-60'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="leading-none">{title}</span>
                  </Link>
                );
              })}
            </div>

            <hr className="my-4 border-black/30" />
          </>
        )}

        {posts.length === 0 ? (
          <div className="mt-8">
            <h3>
              {enableFiltering
                ? `No results for “${activeQuery}”. Try a broader keyword or one of these suggestions.`
                : 'No related posts found for this blog.'}
            </h3>

            {enableFiltering ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('query');
                    const qs = params.toString();
                    router.replace(qs ? `${pathname}?${qs}` : pathname, {
                      scroll: false,
                    });
                  }}
                  className="cursor-pointer rounded-full bg-background-contrast-black/10 px-4 py-2 text-[10px] text-black hover:bg-background-contrast-black/15"
                >
                  Clear search
                </button>

                <Link
                  href={pathname}
                  className="rounded-full bg-background-contrast-black px-4 py-2 text-[10px] text-white hover:bg-background-contrast-black/90"
                >
                  Show all posts
                </Link>

                {[
                  'SEO',
                  'Videography',
                  'Website',
                  'Digital Marketing',
                  'Vancouver',
                ].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      // Reset category to ALL so the suggestion can actually return results.
                      const params = new URLSearchParams(
                        searchParams.toString(),
                      );
                      params.delete('category');
                      params.set('query', term);
                      const qs = params.toString();

                      setSearchValue(term);
                      router.replace(qs ? `${pathname}?${qs}` : pathname, {
                        scroll: false,
                      });
                    }}
                    className="cursor-pointer rounded-full bg-background-contrast-black/5 px-3 py-2 text-[10px] text-black hover:bg-background-contrast-black/10"
                  >
                    {term}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
            {posts.map((post) => (
              <div key={post.id}>
                <article
                  className={`flex h-full flex-col items-start justify-start rounded-2xl backdrop-blur-2xl bg-background-contrast`}
                >
                  <div className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl">
                    <Link href={post.href}>
                      <ImageKit
                        alt={post.title}
                        src={post.imageUrl}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="rounded-2xl object-cover bg-background-contrast-black"
                      />
                    </Link>
                  </div>

                  <div className="max-w-xl flex min-h-0 flex-1 flex-col px-4 py-6">
                    <div className="flex items-center gap-x-4 text-[8px]">
                      <span className="inline-flex items-center gap-1 text-black">
                        <Calendar
                          className="h-3 w-3 opacity-60"
                          aria-hidden="true"
                        />
                        <time dateTime={post.datetime} className="text-black">
                          {post.date}
                        </time>
                      </span>

                      <Link
                        href={createHref(post.category.slug)}
                        className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-black"
                      >
                        {(() => {
                          const Icon = getCategoryIcon(post.category.slug);
                          return (
                            <Icon
                              className="h-3 w-3 opacity-60"
                              aria-hidden="true"
                            />
                          );
                        })()}
                        <span className="leading-none">
                          {post.category.title}
                        </span>
                      </Link>
                    </div>

                    <div className="group relative">
                      <h3 className="mt-3 line-clamp-2 text-sm leading-sm font-semibold text-black">
                        <Link href={post.href}>
                          <span className="absolute inset-0" />
                          {activeQuery
                            ? renderHighlightedText(
                                post.title,
                                matchMap.get(String(post.id))?.title,
                              )
                            : post.title}
                        </Link>
                      </h3>
                      <p className="mt-5 line-clamp-3 text-xs leading-xs text-black/70">
                        {activeQuery
                          ? renderHighlightedText(
                              post.description,
                              matchMap.get(String(post.id))?.description,
                            )
                          : post.description}
                      </p>
                    </div>

                    <div className="relative mt-auto pt-6 flex items-center gap-x-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-background shrink-0">
                        <ImageKit
                          alt={`${post.author.name} avatar`}
                          src={post.author.imageUrl}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover p-0.5"
                        />
                      </div>

                      <div>
                        <p className="font-semibold text-black text-[10px]">
                          <Link href={post.author.href}>
                            <span className="absolute inset-0" />
                            {post.author.name}
                          </Link>
                        </p>
                        <p className="text-black/70 text-[8px]">
                          {post.author.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <BorderBeam duration={12} size={200} />
                </article>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
};

export default BlogPost;
