import { CATEGORIES, getServiceDetail } from '@/constants/services';
import { blogPosts, type BlogPost } from '@/constants/blogs';

export interface NavLinkGroup {
  title: string;
  href?: string;
  links: { name: string; href: string }[];
}

// Service groups are derived from the registry and gated through
// getServiceDetail — the same check the services sitemap uses — so neither
// the navbar mega-panel nor the footer can ever link a service URL that
// 404s. Server-side only: the registry must not enter the client bundle;
// client components receive this as a small serialized prop instead.
export const serviceGroups: NavLinkGroup[] = Object.values(CATEGORIES).map(
  (cat) => ({
    title: cat.title,
    href: `/services/${cat.slug}`,
    links: cat.services
      .filter((svc) => getServiceDetail(cat.slug, svc.slug))
      .map((svc) => ({
        name: svc.title,
        href: `/services/${cat.slug}/${svc.slug}`,
      })),
  }),
);

export interface BlogPanelLink {
  title: string;
  href: string;
  /** Compact dateline for the index rows, e.g. "Feb 21". */
  dateLabel: string;
}

export interface BlogPanelCategory {
  name: string;
  href: string;
  /** Total posts on file in this category (not the capped panel length). */
  count: number;
  /** The latest post — the column's cover. */
  featured: {
    title: string;
    href: string;
    image: string;
    imageAlt: string;
    /** Full display date, e.g. "February 21, 2026". */
    date: string;
  };
  /** The next few headlines after the featured, newest-first, capped. */
  more: BlogPanelLink[];
}

export interface BlogPanelData {
  categories: BlogPanelCategory[];
  total: number;
}

// Freshness key mirroring the sitemap's postDate(): updatedAt > datetime > date.
const postTime = (p: BlogPost) =>
  new Date(p.updatedAt ?? p.datetime ?? p.date).getTime();

// Featured cover + up to this many headline rows = at most 5 posts surfaced
// per category in the mega-panel's journal index.
const BLOG_PANEL_MORE = 4;

// Compact dateline for the index rows, e.g. "Feb 21". The featured post keeps
// the post's full display `date`; the rows below use this terser form.
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Blogs mega-panel ("the journal index"): every category as a column — its
// latest post as a cover, then the next few headlines as a ruled contents
// list. Columns ordered by category size (the lone thin category lands last).
// Derived from blogPosts so a new post or category shows up in the navbar
// without any edit here.
export const blogPanel: BlogPanelData = (() => {
  const byCategory = new Map<string, BlogPost[]>();
  for (const post of blogPosts) {
    const list = byCategory.get(post.category.slug) ?? [];
    list.push(post);
    byCategory.set(post.category.slug, list);
  }

  const categories = [...byCategory.values()]
    .sort((a, b) => b.length - a.length)
    .map((posts) => {
      const latest = posts.reduce((a, b) => (postTime(b) > postTime(a) ? b : a));
      return {
        name: latest.category.title,
        href: `/blogs?category=${latest.category.slug}`,
        post: {
          title: latest.title,
          href: latest.href,
          image: latest.imageUrl,
          imageAlt: latest.imageAlt,
          date: latest.date,
        },
      };
    });

  return { categories, total: blogPosts.length };
})();
