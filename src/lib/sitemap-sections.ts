import { blogPosts, BLOG_AUTHORS } from '@/constants/blogs';
import { CATEGORIES, allServiceDetailParams } from '@/constants/services';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { SITE_URL } from '@/constants';
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
  /** The URLs this section contains. */
  build: () => SitemapUrl[];
  /** Freshest content date, for the index `<lastmod>`. */
  lastmod: () => Date;
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
  // Default each page's lastmod to the fixed date; an entry's own `lastmod`
  // (spread last) still wins if one is set.
  build: () =>
    CORE_PAGES.map((u) => ({ lastmod: STATIC_PAGES_LASTMOD, ...u })),
  lastmod: () => new Date(STATIC_PAGES_LASTMOD),
};

export const servicesSection: SitemapSection = {
  path: '/sitemaps/services.xml',
  label: 'Services',
  build: () => {
    const now = new Date();
    const categories: SitemapUrl[] = Object.values(CATEGORIES).map((c) => ({
      path: `/services/${c.slug}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    }));
    const details: SitemapUrl[] = allServiceDetailParams().map(
      ({ category, service }) => ({
        path: `/services/${category}/${service}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.6,
      }),
    );
    return [...categories, ...details];
  },
  lastmod: () => new Date(),
};

export const projectsSection: SitemapSection = {
  path: '/sitemaps/projects.xml',
  label: 'Projects',
  build: () => {
    const now = new Date();
    const hub: SitemapUrl[] = [
      { path: '/projects', lastmod: now, changefreq: 'monthly', priority: 0.8 },
    ];
    const categories: SitemapUrl[] = Object.values(PROJECT_CATEGORIES).map(
      (c) => ({
        path: `/projects/${c.slug}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      }),
    );
    // Per-case-study detail URLs (/projects/<category>/<project>) are omitted
    // while the project detail layer is torn down — re-add on rebuild.
    return [...hub, ...categories];
  },
  lastmod: () => new Date(),
};

export const blogsSection: SitemapSection = {
  path: '/sitemaps/blogs.xml',
  label: 'Blogs',
  build: () =>
    blogPosts.map((post) => ({
      path: `/blogs/${post.slug}`,
      lastmod: postDate(post),
      changefreq: 'monthly',
      priority: 0.6,
    })),
  lastmod: () => latestPostDate(),
};

export const authorsSection: SitemapSection = {
  path: '/sitemaps/authors.xml',
  label: 'Authors',
  build: () =>
    Object.values(BLOG_AUTHORS).map((author) => ({
      path: author.href,
      lastmod: latestPostDate(author.slug),
      changefreq: 'monthly',
      priority: 0.4,
    })),
  lastmod: () => latestPostDate(),
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
export function navFor(currentPath?: string): SitemapNav {
  const active = SITEMAP_SECTIONS.filter((s) => s.build().length > 0);
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
