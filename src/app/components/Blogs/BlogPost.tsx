'use client';

import { BorderBeam, Container, ImageKit, TextShimmer } from '@/app/components';
import { blogPosts } from '@/app/constants/blogs';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

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

    // Treat missing/"all" as no filter.
    if (!categorySlug || categorySlug === 'all') {
      params.delete('category');
    } else {
      params.set('category', categorySlug);
    }

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const posts = useMemo(() => {
    // Sort newest -> oldest using the ISO `datetime` field.
    const sortedPosts = [...blogPosts].sort((a, b) => {
      const bt = Date.parse(b.datetime);
      const at = Date.parse(a.datetime);

      // Handle invalid dates defensively.
      const bTime = Number.isFinite(bt) ? bt : 0;
      const aTime = Number.isFinite(at) ? at : 0;

      return bTime - aTime;
    });

    const filteredPosts = (
      activeCategory !== 'all'
        ? sortedPosts.filter((p) => p.category.slug === activeCategory)
        : sortedPosts
    ).filter((p) => (excludeSlug ? p.slug !== excludeSlug : true));

    const count =
      typeof limit === 'number'
        ? Math.max(0, Math.floor(limit))
        : filteredPosts.length;

    // After sorting newest-first, take the first `count` posts.
    return count === filteredPosts.length
      ? filteredPosts
      : filteredPosts.slice(0, count);
  }, [activeCategory, limit, enableFiltering, forcedCategorySlug, excludeSlug]);

  return (
    <section className="pb-16">
      <Container>
        {showFilters && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href={createHref(null)}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-background-contrast text-white'
                    : 'bg-background-contrast-white text-black'
                }`}
              >
                All
              </Link>

              {categories.map(({ slug, title }) => (
                <Link
                  key={slug}
                  href={createHref(slug)}
                  className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                    activeCategory === slug
                      ? 'bg-background-contrast text-white'
                      : 'bg-background-contrast-white text-black'
                  }`}
                >
                  {title}
                </Link>
              ))}
            </div>

            <hr className="my-4 border-white/30" />
          </>
        )}

        {posts.length === 0 ? (
          <TextShimmer>No related posts found for this blog.</TextShimmer>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 lg:grid-cols-4 mt-8">
            {posts.map((post) => (
              <div key={post.id}>
                <article
                  className={`flex h-full flex-col items-start justify-start rounded-2xl backdrop-blur-2xl bg-black dark:bg-white/10`}
                >
                  <div className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl">
                    <Link href={post.href}>
                      <ImageKit
                        alt={post.title}
                        src={post.imageUrl}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="rounded-2xl object-cover bg-background-contrast-white"
                      />
                    </Link>
                  </div>

                  <div className="max-w-xl flex min-h-0 flex-1 flex-col px-4 py-6">
                    <div className="flex items-center gap-x-4 text-[8px]">
                      <time dateTime={post.datetime} className="text-white">
                        {post.date}
                      </time>

                      <Link
                        href={createHref(post.category.slug)}
                        className="relative z-10 rounded-full bg-background-contrast px-3 py-1 font-semibold text-white"
                      >
                        {post.category.title}
                      </Link>
                    </div>

                    <div className="group relative">
                      <h3 className="mt-3 line-clamp-2 text-sm leading-sm font-semibold text-white">
                        <Link href={post.href}>
                          <span className="absolute inset-0" />
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-5 line-clamp-3 text-xs leading-xs text-white/70">
                        {post.description}
                      </p>
                    </div>

                    <div className="relative mt-auto pt-6 flex items-center gap-x-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-background-contrast-white shrink-0">
                        <ImageKit
                          alt={`${post.author.name} avatar`}
                          src={post.author.imageUrl}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover p-0.5"
                        />
                      </div>

                      <div>
                        <p className="font-semibold text-white text-[10px]">
                          <Link href={post.author.href}>
                            <span className="absolute inset-0" />
                            {post.author.name}
                          </Link>
                        </p>
                        <p className="text-white/70 text-[8px]">
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
