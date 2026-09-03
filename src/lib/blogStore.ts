import 'server-only';
import { unstable_cache } from 'next/cache';

import { SITE_URL } from '@/constants';
import {
  fetchAuthors,
  fetchCategories,
  fetchPublishedPostRow,
  fetchPublishedPostRows,
  type PublishedPostRow,
} from '@/db/blogQueries';
import type {
  BlogEntity,
  BlogFaq,
  BlogLocation,
  BlogMediaVariants,
  BlogRobotsExtra,
  BlogSource,
} from '@/db/schema';
import type { BlogDoc } from '@/lib/blogBody';
import { STUDIO_TZ, dayKeyIn, zonedFormat } from '@/lib/calendar';
import { blurFor } from '@/lib/imageBlur';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE } from '@/lib/portfolioFields';

/**
 * The public read layer for the blog: the async, DB-backed replacement for
 * the `blogPosts` / `BLOG_AUTHORS` registry. Every consumer (post page, hub,
 * author pages, cards, navbar panel, sitemaps, the feedback admin page's
 * titles) reads through here.
 *
 * Caching: one coarse snapshot (every published post joined to its published
 * revision, category and author) backs every listing, plus a per-slug detail
 * read. TTL 86400 like projectsStore: unstable_cache lowers a route's
 * revalidate to the smallest TTL read during its render, and Navbar reads
 * the blog panel on EVERY marketing route. Tags are the real invalidation
 * path (step 2's actions call updateTag); a gap re-import is followed by
 * `vercel cache invalidate --tag blogs`.
 *
 * Cached values round-trip through JSON: dates are STUDIO_TZ day keys
 * (strings), never Date. The public site is a viewerless surface, so every
 * date it emits is derived in STUDIO_TZ.
 */

export const BLOGS_TAG = 'blogs';
export const blogTag = (slug: string) => `blog:${slug}`;
export const blogCategoryTag = (slug: string) => `blog-category:${slug}`;
export const blogAuthorTag = (slug: string) => `blog-author:${slug}`;

const TTL_SECONDS = 86400;

// ── View models ─────────────────────────────────────────────────────────────

export type BlogHero =
  | { type: 'static'; src: string }
  | { type: 'media'; variants: BlogMediaVariants; blurDataUrl: string | null };

/** The src a hero renders/announces: the static path or the media master. */
export const heroSrc = (hero: BlogHero): string =>
  hero.type === 'static' ? hero.src : hero.variants.full.url;

export type PublicAuthor = {
  slug: string;
  name: string;
  kind: 'person' | 'organization';
  role: string;
  bio: string;
  href: string;
  /** Static path (rides <Img> + blurFor) or the media master URL. */
  imageUrl: string;
  imageBlur?: string;
  ogImage: string | null;
  sameAs: string[];
  knowsAbout: string[];
  tags: string[];
  location: BlogLocation | null;
  sortIndex: number;
};

export type PublicCategory = {
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sortIndex: number;
};

export type PublicPostSummary = {
  id: string;
  slug: string;
  href: string;
  legacyId: number | null;
  title: string;
  description: string;
  hero: BlogHero;
  imageUrl: string;
  imageBlur?: string;
  imageAlt: string;
  /** Display label, e.g. "Feb 8, 2026" (short month, en-US, STUDIO_TZ). */
  date: string;
  /** STUDIO_TZ day keys. Every emitted date reads these, never an instant. */
  publishedDay: string;
  /** content_modified_at ?? published_at, as a day key: dateModified,
   *  sitemap lastmod, the navbar freshness key. */
  modifiedDay: string;
  /** The "Updated" byline gate: modifiedDay !== publishedDay. */
  showsUpdated: boolean;
  category: { slug: string; title: string };
  authorSlug: string;
  author: { slug: string; name: string; role: string; href: string; imageUrl: string; imageBlur?: string };
  serviceSlug: string | null;
  wordCount: number;
  robotsIndex: boolean;
  canonicalOverride: string | null;
  relatedSlugs: string[];
};

export type PublishedPost = PublicPostSummary & {
  body: BlogDoc;
  bodyText: string;
  heroCaption: string | null;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  sources: BlogSource[];
  entities: BlogEntity[];
  seo: {
    title: string;
    description: string;
    /** `${SITE_URL}/blogs/${slug}`: every JSON-LD @id anchors here. */
    selfUrl: string;
    /** The override when set, else selfUrl: <link rel=canonical> and og:url. */
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    /** The OG image source (og_image ?? hero), for heroOgUrl(). */
    ogImage: BlogHero;
    twitterCard: string;
    robots: { index: boolean; follow: boolean };
    robotsExtra: BlogRobotsExtra | null;
    focusKeywords: string[];
    emitLegacyMetaKeywords: boolean;
  };
  author: PublicAuthor;
  customSchema: unknown;
  llmsInclude: boolean;
};

export const selfUrl = (slug: string) => `${SITE_URL}/blogs/${slug}`;

// ── Row → view shaping ──────────────────────────────────────────────────────

const DATE_LABEL = zonedFormat(STUDIO_TZ, { month: 'short', day: 'numeric', year: 'numeric' }, 'en-US');

function toHero(staticPath: string | null, media: { variants: BlogMediaVariants; blurDataUrl: string | null } | null): BlogHero {
  if (media) return { type: 'media', variants: media.variants, blurDataUrl: media.blurDataUrl };
  return { type: 'static', src: staticPath ?? '' };
}

function heroBlur(hero: BlogHero): string | undefined {
  return hero.type === 'static' ? blurFor(hero.src) : (hero.blurDataUrl ?? undefined);
}

function toAuthor(row: PublishedPostRow['author']): PublicAuthor {
  const hero = toHero(row.imageStaticPath, row.imageMedia);
  return {
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    role: row.role,
    bio: row.bio,
    href: `/blogs/authors/${row.slug}`,
    imageUrl: heroSrc(hero),
    imageBlur: heroBlur(hero),
    ogImage: row.ogImageStaticPath,
    sameAs: row.sameAs,
    knowsAbout: row.knowsAbout,
    tags: row.tags,
    location: row.location ?? null,
    sortIndex: row.sortIndex,
  };
}

function toCategory(row: PublishedPostRow['category']): PublicCategory {
  return {
    slug: row.slug,
    title: row.title,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    sortIndex: row.sortIndex,
  };
}

function toSummary(row: PublishedPostRow): PublicPostSummary {
  const r = row.revision;
  const s = r.snapshot;
  const publishedAt = r.publishedAt ?? row.createdAt;
  const modifiedAt = r.contentModifiedAt ?? publishedAt;
  const publishedDay = dayKeyIn(STUDIO_TZ, publishedAt);
  const modifiedDay = dayKeyIn(STUDIO_TZ, modifiedAt);
  const hero = toHero(s.hero.staticPath, s.hero.media);
  const author = toAuthor(row.author);
  return {
    id: row.id,
    slug: r.slug,
    href: `/blogs/${r.slug}`,
    legacyId: row.legacyId,
    title: r.title,
    description: s.description,
    hero,
    imageUrl: heroSrc(hero),
    imageBlur: heroBlur(hero),
    imageAlt: s.hero.alt,
    date: DATE_LABEL.format(publishedAt),
    publishedDay,
    modifiedDay,
    showsUpdated: r.contentModifiedAt !== null && modifiedDay !== publishedDay,
    category: { slug: row.category.slug, title: row.category.title },
    authorSlug: author.slug,
    author: {
      slug: author.slug,
      name: author.name,
      role: author.role,
      href: author.href,
      imageUrl: author.imageUrl,
      imageBlur: author.imageBlur,
    },
    serviceSlug: s.serviceSlug,
    wordCount: r.wordCount,
    robotsIndex: r.robotsIndex,
    canonicalOverride: s.seo.canonicalOverride,
    relatedSlugs: s.relatedSlugs,
  };
}

function toPublished(row: PublishedPostRow): PublishedPost {
  const s = row.revision.snapshot;
  const summary = toSummary(row);
  const ogImage = s.seo.ogImage ? toHero(s.seo.ogImage.staticPath, s.seo.ogImage.media) : summary.hero;
  return {
    ...summary,
    body: s.body,
    bodyText: s.bodyText,
    heroCaption: s.hero.caption,
    keyTakeaways: s.keyTakeaways,
    faqs: s.faqs,
    sources: s.sources,
    entities: s.entities,
    seo: {
      title: s.seo.title,
      description: s.seo.description,
      selfUrl: selfUrl(summary.slug),
      canonicalUrl: s.seo.canonicalOverride ?? selfUrl(summary.slug),
      ogTitle: s.seo.ogTitle,
      ogDescription: s.seo.ogDescription,
      ogImage,
      twitterCard: s.seo.twitterCard,
      robots: { index: s.seo.robotsIndex, follow: s.seo.robotsFollow },
      robotsExtra: s.seo.robotsExtra,
      focusKeywords: s.seo.focusKeywords,
      emitLegacyMetaKeywords: s.seo.emitLegacyMetaKeywords,
    },
    author: toAuthor(row.author),
    customSchema: s.customSchema,
    llmsInclude: s.llmsInclude,
  };
}

// ── The snapshot ────────────────────────────────────────────────────────────

type BlogSnapshot = {
  /** Ordered ONCE by publicOrder in SQL; every reader consumes this order. */
  posts: PublicPostSummary[];
  categories: PublicCategory[];
  authors: PublicAuthor[];
};

const loadSnapshot = unstable_cache(
  async (): Promise<BlogSnapshot> => {
    const [rows, categories, authors] = await Promise.all([
      fetchPublishedPostRows(),
      fetchCategories(),
      fetchAuthors(),
    ]);
    return {
      posts: rows.map(toSummary),
      categories: categories.map(toCategory),
      authors: authors.map(toAuthor),
    };
  },
  ['blog-snapshot-v1'],
  { tags: [BLOGS_TAG], revalidate: TTL_SECONDS },
);

// ── Readers ─────────────────────────────────────────────────────────────────

export async function listPublishedSummaries(): Promise<PublicPostSummary[]> {
  return (await loadSnapshot()).posts;
}

export type CategoryStat = {
  slug: string;
  title: string;
  count: number;
  /** Epoch ms of the newest post's day key (UTC midnight), the filter rail's
   *  freshness key, exactly Date.parse(datetime) as before. */
  latestTime: number;
  latestKey: string;
  latestTitle: string;
  distinctAuthors: number;
  wordTotal: number;
};

/** Per category with at least one public post, in first-appearance order. */
export async function categoryStats(): Promise<CategoryStat[]> {
  const { posts } = await loadSnapshot();
  const map = new Map<string, CategoryStat & { authors: Set<string> }>();
  for (const p of posts) {
    const existing = map.get(p.category.slug);
    if (existing) {
      existing.count += 1;
      existing.wordTotal += p.wordCount;
      existing.authors.add(p.authorSlug);
      if (p.publishedDay > existing.latestKey) {
        existing.latestKey = p.publishedDay;
        existing.latestTitle = p.title;
        existing.latestTime = Date.parse(p.publishedDay);
      }
    } else {
      map.set(p.category.slug, {
        slug: p.category.slug,
        title: p.category.title,
        count: 1,
        latestTime: Date.parse(p.publishedDay),
        latestKey: p.publishedDay,
        latestTitle: p.title,
        distinctAuthors: 1,
        wordTotal: p.wordCount,
        authors: new Set([p.authorSlug]),
      });
    }
  }
  return [...map.values()].map(({ authors, ...stat }) => ({ ...stat, distinctAuthors: authors.size }));
}

/** Route params for every published post. An EMPTY corpus fails a production
 *  build on purpose: an un-imported database must never ship an empty blog. */
export async function listPublishedParams(): Promise<{ blog: string }[]> {
  const { posts } = await loadSnapshot();
  if (posts.length === 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      'blogStore: no published posts in the database. Run `node --env-file=.env.local --import tsx scripts/import-blogs.mts --apply` before building; an empty blog must never ship.',
    );
  }
  return posts.map((p) => ({ blog: p.slug }));
}

const isSlugShaped = (slug: string) => slug.length <= PORTFOLIO_SLUG_MAX && PORTFOLIO_SLUG_RE.test(slug);

/** One post's full view model. Reached only for a slug that passes the shape
 *  gate AND is in the snapshot, so an unknown slug never costs a Neon round
 *  trip or writes a Data Cache entry. */
export async function getPublishedPost(slug: string): Promise<PublishedPost | null> {
  if (!isSlugShaped(slug)) return null;
  const { posts } = await loadSnapshot();
  if (!posts.some((p) => p.slug === slug)) return null;
  return unstable_cache(
    async () => {
      const row = await fetchPublishedPostRow(slug);
      return row ? toPublished(row) : null;
    },
    ['blog-post-v1', slug],
    { tags: [BLOGS_TAG, blogTag(slug)], revalidate: TTL_SECONDS },
  )();
}

export async function listCategories(): Promise<PublicCategory[]> {
  return (await loadSnapshot()).categories;
}

export async function listAuthors(): Promise<PublicAuthor[]> {
  return (await loadSnapshot()).authors;
}

export async function getAuthor(slug: string): Promise<PublicAuthor | null> {
  if (!isSlugShaped(slug)) return null;
  return (await loadSnapshot()).authors.find((a) => a.slug === slug) ?? null;
}

/** Every author (sort_index order) with their published posts in publicOrder. */
export async function listAuthorsWithPosts(): Promise<{ author: PublicAuthor; posts: PublicPostSummary[] }[]> {
  const { authors, posts } = await loadSnapshot();
  return authors.map((author) => ({ author, posts: posts.filter((p) => p.authorSlug === author.slug) }));
}

/** Newest modifiedDay across the site, or an author's posts: the sitemap
 *  <lastmod> for /blogs, /blogs/authors and each author. UTC midnight of the
 *  key, exactly what `new Date('YYYY-MM-DD')` produced before. */
export async function latestPostDate(authorSlug?: string): Promise<Date> {
  const { posts } = await loadSnapshot();
  const keys = posts.filter((p) => !authorSlug || p.authorSlug === authorSlug).map((p) => p.modifiedDay);
  return keys.length ? new Date(keys.reduce((a, b) => (b > a ? b : a))) : new Date();
}

/** Prev (older) and next (newer) within the post's category, over the one
 *  ordered snapshot. */
export async function neighbours(slug: string): Promise<{ prev: PublicPostSummary | null; next: PublicPostSummary | null }> {
  const { posts } = await loadSnapshot();
  const me = posts.find((p) => p.slug === slug);
  if (!me) return { prev: null, next: null };
  const inCategory = posts.filter((p) => p.category.slug === me.category.slug);
  const i = inCategory.findIndex((p) => p.slug === slug);
  return {
    next: i > 0 ? inCategory[i - 1] : null,
    prev: i >= 0 && i < inCategory.length - 1 ? inCategory[i + 1] : null,
  };
}

/** A sitemap lists canonical, indexable URLs only. Identical today: every
 *  post is index:true with a self canonical. */
export const sitemapEligible = (p: PublicPostSummary): boolean =>
  p.robotsIndex && (p.canonicalOverride === null || p.canonicalOverride === selfUrl(p.slug));
