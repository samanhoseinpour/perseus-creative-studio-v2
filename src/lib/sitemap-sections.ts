import { blogPosts, BLOG_AUTHORS } from '@/constants/blogs';
import {
  CATEGORIES,
  allServiceDetailParams,
  getServiceDetail,
} from '@/constants/services';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { SITE_URL } from '@/constants';
import { listProjectDetailParams } from '@/lib/projectsStore';
import { resolveImageUrl } from '@/utils/images';
import type { SitemapUrl, SitemapNav } from './sitemap';

/**
 * Single source of truth for the site's child sitemaps. Both the sitemap index
 * (`/sitemap.xml`) and each child route (`/sitemaps/*.xml`) derive from this
 * list, so a section's URLs, label, and the index's per-label count can never
 * drift apart. Adding a sitemap = add one entry here + a one-line route.
 */
export interface SitemapSection {
  /** Child sitemap path, e.g. `/sitemaps/blogs.xml`. */
  path: string;
  /** Human content-type name shown in the browser view. */
  label: string;
  /** The URLs this section contains. Async because the projects section reads
   *  the DB-backed projectsStore; the registry-fed sections just wrap their
   *  sync bodies. */
  build: () => Promise<SitemapUrl[]>;
  /** Freshest content date, for the index `<lastmod>`. */
  lastmod: () => Promise<Date>;
}

function postDate(p: (typeof blogPosts)[number]): string {
  return p.updatedAt ?? p.datetime ?? p.date;
}

/** Most recent post date across all posts, or an author's posts when scoped. */
function latestPostDate(authorSlug?: string): Date {
  const posts = authorSlug
    ? blogPosts.filter((p) => p.authorSlug === authorSlug)
    : blogPosts;
  const times = posts
    .map((p) => new Date(postDate(p)).getTime())
    .filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : new Date();
}

/**
 * Last meaningful content change for the static hub/legal pages. Bump this
 * (or set a per-page `lastmod` below) when one of them actually changes — using
 * a fixed date instead of build time keeps every deploy from falsely signalling
 * "this page changed" to crawlers.
 */
const STATIC_PAGES_LASTMOD = '2026-06-06';

/** Newest of a non-empty set of 'YYYY-MM-DD' strings (lexical order works). */
function maxDate(dates: readonly string[]): string {
  return dates.reduce((a, b) => (b > a ? b : a));
}

/** Freshest `seo.lastUpdated` across the whole services registry. */
function latestServicesDate(): string {
  return maxDate([
    ...Object.values(CATEGORIES).map((c) => c.seo.lastUpdated),
    ...allServiceDetailParams().map(
      ({ category, service }) =>
        getServiceDetail(category, service)!.seo.lastUpdated,
    ),
  ]);
}

/**
 * Hub pages whose freshness follows their children derive a real date instead
 * of inheriting the static fallback — a hub "changed" when its content did,
 * not when the file holding its copy was last touched.
 */
function corePageLastmod(path: string): string | Date {
  if (path === '/services') return latestServicesDate();
  if (path === '/blogs') return latestPostDate();
  if (path === '/blogs/authors') return latestPostDate();
  return STATIC_PAGES_LASTMOD;
}

const buildCorePages = (): SitemapUrl[] =>
  CORE_PAGES.map((u) => ({ lastmod: corePageLastmod(u.path), ...u }));

// Static / core hub + legal pages. Each inherits STATIC_PAGES_LASTMOD unless it
// sets its own `lastmod`.
const CORE_PAGES: SitemapUrl[] = [
  { path: '/', changefreq: 'yearly', priority: 1 },
  { path: '/services', changefreq: 'monthly', priority: 0.9 },
  { path: '/blogs', changefreq: 'weekly', priority: 0.8 },
  { path: '/about', changefreq: 'yearly', priority: 0.7 },
  { path: '/contact', changefreq: 'yearly', priority: 0.5 },
  { path: '/frequently-asked-questions', changefreq: 'monthly', priority: 0.5 },
  { path: '/blogs/authors', changefreq: 'monthly', priority: 0.5 },
  { path: '/contact/careers', changefreq: 'monthly', priority: 0.4 },
  { path: '/license', changefreq: 'yearly', priority: 0.3 },
  { path: '/privacy-policy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms-of-service', changefreq: 'yearly', priority: 0.3 },
];

export const pagesSection: SitemapSection = {
  path: '/sitemaps/pages.xml',
  label: 'Pages',
  // Default each page's lastmod via corePageLastmod (fixed date, or derived
  // from children for hubs); an entry's own `lastmod` (spread last) still wins.
  build: async () => buildCorePages(),
  lastmod: async () => {
    const times = buildCorePages()
      .map((u) => new Date(u.lastmod ?? STATIC_PAGES_LASTMOD).getTime())
      .filter((t) => !Number.isNaN(t));
    return new Date(Math.max(...times));
  },
};

export const servicesSection: SitemapSection = {
  path: '/sitemaps/services.xml',
  label: 'Services',
  build: async () => {
    // Real editorial dates from each record's seo.lastUpdated — never build
    // time, which would falsely signal "changed" on every deploy.
    const newestDetailByCategory = new Map<string, string>();
    const details: SitemapUrl[] = allServiceDetailParams().map(
      ({ category, service }) => {
        const date = getServiceDetail(category, service)!.seo.lastUpdated;
        const prev = newestDetailByCategory.get(category);
        if (!prev || date > prev) newestDetailByCategory.set(category, date);
        return {
          path: `/services/${category}/${service}`,
          lastmod: date,
          changefreq: 'monthly',
          priority: 0.6,
        };
      },
    );
    // A category page "changed" when its own copy or any child service did.
    const categories: SitemapUrl[] = Object.values(CATEGORIES).map((c) => ({
      path: `/services/${c.slug}`,
      lastmod: maxDate([
        c.seo.lastUpdated,
        ...(newestDetailByCategory.has(c.slug)
          ? [newestDetailByCategory.get(c.slug)!]
          : []),
      ]),
      changefreq: 'monthly',
      priority: 0.7,
    }));
    return [...categories, ...details];
  },
  lastmod: async () => new Date(latestServicesDate()),
};

export const projectsSection: SitemapSection = {
  path: '/sitemaps/projects.xml',
  label: 'Projects',
  build: async () => {
    // Every live case study (public AND detail-ready — the same set the route
    // prerenders and the cards link to), with its real last-edit date. The
    // /admin actions revalidate this child on every project write.
    const params = await listProjectDetailParams();
    // Hub/category rows follow their newest child instead of build time; a
    // category with no live case studies falls back to the static date.
    const newest = (lastmods: string[]): string =>
      lastmods.length ? maxDate(lastmods) : STATIC_PAGES_LASTMOD;
    const hub: SitemapUrl[] = [
      {
        path: '/projects',
        lastmod: newest(params.map((p) => p.lastmod)),
        changefreq: 'monthly',
        priority: 0.8,
      },
    ];
    const categories: SitemapUrl[] = Object.values(PROJECT_CATEGORIES).map(
      (c) => ({
        path: `/projects/${c.slug}`,
        lastmod: newest(
          params.filter((p) => p.category === c.slug).map((p) => p.lastmod),
        ),
        changefreq: 'monthly',
        priority: 0.7,
      }),
    );
    const details: SitemapUrl[] = params.map((p) => ({
      path: `/projects/${p.category}/${p.project}`,
      lastmod: p.lastmod,
      changefreq: 'monthly',
      priority: 0.6,
    }));
    return [...hub, ...categories, ...details];
  },
  lastmod: async () => {
    const params = await listProjectDetailParams();
    return params.length
      ? new Date(maxDate(params.map((p) => p.lastmod)))
      : new Date(STATIC_PAGES_LASTMOD);
  },
};

export const blogsSection: SitemapSection = {
  path: '/sitemaps/blogs.xml',
  label: 'Blogs',
  build: async () =>
    blogPosts.map((post) => ({
      path: `/blogs/${post.slug}`,
      lastmod: postDate(post),
      changefreq: 'monthly',
      priority: 0.6,
      images: [{ loc: resolveImageUrl(post.imageUrl), title: post.imageAlt }],
    })),
  lastmod: async () => latestPostDate(),
};

export const authorsSection: SitemapSection = {
  path: '/sitemaps/authors.xml',
  label: 'Authors',
  build: async () =>
    Object.values(BLOG_AUTHORS).map((author) => ({
      path: author.href,
      lastmod: latestPostDate(author.slug),
      changefreq: 'monthly',
      priority: 0.4,
    })),
  lastmod: async () => latestPostDate(),
};

/** Ordered list the index iterates; child routes import their own section. */
export const SITEMAP_SECTIONS: SitemapSection[] = [
  pagesSection,
  servicesSection,
  projectsSection,
  blogsSection,
  authorsSection,
];

/**
 * Build the nav context for the human-facing XSL view. Pass the current child
 * sitemap's path; omit it for the index itself. Only non-empty sections appear,
 * so prev/next never point at an omitted sitemap.
 */
export async function navFor(currentPath?: string): Promise<SitemapNav> {
  const lengths = await Promise.all(
    SITEMAP_SECTIONS.map(async (s) => (await s.build()).length),
  );
  const active = SITEMAP_SECTIONS.filter((_, i) => lengths[i] > 0);
  const items = active.map((s) => ({ label: s.label, path: s.path }));
  const i = currentPath ? active.findIndex((s) => s.path === currentPath) : -1;
  return {
    home: SITE_URL,
    index: '/sitemap.xml',
    current: i >= 0 ? items[i].label : 'Index',
    items,
    prev: i > 0 ? items[i - 1] : undefined,
    next: i >= 0 && i < items.length - 1 ? items[i + 1] : undefined,
  };
}
