import { listPublishedSummaries, categoryStats, type BlogHero, type PublicPostSummary } from '@/lib/blogStore';

/**
 * Server-side projection layer between the blog store and the client-rendered
 * grid. BlogPost/BlogCard are client components, so they receive a slim
 * serialized card instead of the store's rich summary. Client code may import
 * the *types* from this module (erased at build time), never the values.
 */

export type { BlogHero };

export interface BlogCardData {
  /** The post's uuid; a React key only. */
  id: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  /** Static path (rides <ImgClient> + the blur below) or the media master. */
  imageUrl: string;
  imageBlur?: string;
  /** The two-source hero; BlogCard branches on `type`. */
  hero: BlogHero;
  imageAlt: string;
  /** Display date, e.g. "Feb 8, 2026". */
  date: string;
  /** The STUDIO_TZ publish day key: sorting, `<time dateTime>`, recency. */
  datetime: string;
  category: { slug: string; title: string };
  author: { name: string; role: string; href: string; imageUrl: string; imageBlur?: string };
}

/** One filter chip on /blogs: category identity + count + freshness key. */
export interface BlogFilterCategory {
  slug: string;
  title: string;
  count: number;
  /** Epoch ms of the newest post's day key (0 when unparseable). */
  latestTime: number;
}

const toCard = (p: PublicPostSummary): BlogCardData => ({
  id: p.id,
  slug: p.slug,
  href: p.href,
  title: p.title,
  description: p.description,
  imageUrl: p.imageUrl,
  imageBlur: p.imageBlur,
  hero: p.hero,
  imageAlt: p.imageAlt,
  date: p.date,
  datetime: p.publishedDay,
  category: p.category,
  author: {
    name: p.author.name,
    role: p.author.role,
    href: p.author.href,
    imageUrl: p.author.imageUrl,
    imageBlur: p.author.imageBlur,
  },
});

export interface SelectBlogCardsOptions {
  /** Keep only this category's posts. Unknown slugs yield an empty list. */
  categorySlug?: string;
  /** Curated slugs rendered in the given order (unknown or unpublished
   *  slugs skipped). Wins over `categorySlug`. */
  forcedSlugs?: string[];
  /** Keep only posts tagged with this service. Wins over `categorySlug`. */
  serviceSlug?: string;
  /** Drop one slug (usually the post being read). Applied after curation. */
  excludeSlug?: string;
  /** Cap the list length. Applied last. */
  limit?: number;
}

/** Newest-first card selection over the store's one ordered snapshot. */
export async function selectBlogCards({
  categorySlug,
  serviceSlug,
  forcedSlugs,
  excludeSlug,
  limit,
}: SelectBlogCardsOptions = {}): Promise<BlogCardData[]> {
  const all = await listPublishedSummaries();
  const curated = forcedSlugs?.length
    ? forcedSlugs.map((slug) => all.find((p) => p.slug === slug)).filter((p): p is PublicPostSummary => Boolean(p))
    : null;
  let list =
    curated ??
    (serviceSlug
      ? all.filter((p) => p.serviceSlug === serviceSlug)
      : categorySlug
        ? all.filter((p) => p.category.slug === categorySlug)
        : all);
  if (excludeSlug) list = list.filter((p) => p.slug !== excludeSlug);
  const cards = list.map(toCard);
  return typeof limit === 'number' ? cards.slice(0, Math.max(0, Math.floor(limit))) : cards;
}

/** The filter rail's chips: most-recent activity first, title breaks ties. */
export async function blogFilterCategories(): Promise<BlogFilterCategory[]> {
  const stats = await categoryStats();
  return stats
    .map(({ slug, title, count, latestTime }) => ({ slug, title, count, latestTime }))
    .sort((a, b) => (b.latestTime !== a.latestTime ? b.latestTime - a.latestTime : a.title.localeCompare(b.title)));
}

export async function totalBlogPostCount(): Promise<number> {
  return (await listPublishedSummaries()).length;
}
