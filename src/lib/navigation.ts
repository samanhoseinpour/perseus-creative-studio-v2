import { CATEGORIES, getServiceDetail } from '@/constants/services';
import { blogPosts, type BlogPost } from '@/constants/blogs';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { latestYear, yearRange, pad2 } from '@/components/Projects/utils';

export interface NavLinkGroup {
  title: string;
  href?: string;
  links: { name: string; href: string }[];
}

// Primary navigation, in order. The single source of truth for both the
// desktop centered row and the mobile sheet — so a destination (e.g. Services)
// can never be present on one and missing from the other. Items with a `panel`
// open a mega-panel on desktop (hover/focus) and an accordion section on mobile;
// the rest navigate straight to their hub.
export type PanelName = 'services' | 'projects' | 'blogs';

export interface NavItem {
  label: string;
  href: string;
  panel?: PanelName;
}

export const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services', panel: 'services' },
  { label: 'Projects', href: '/projects', panel: 'projects' },
  { label: 'Blogs', href: '/blogs', panel: 'blogs' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Active-route test, shared by the desktop row and the mobile sheet so both
// mark "you are here" the same way. Home matches only the exact root; every
// other destination matches its whole subtree (so /projects/branding still
// lights the Projects entry). Path-based only — query-state hubs like
// /blogs?category= resolve to their bare path here.
export const isActiveRoute = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

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
      // Newest-first within the category (same freshness key as the sitemap).
      const sorted = [...posts].sort((a, b) => postTime(b) - postTime(a));
      const featured = sorted[0];
      return {
        name: featured.category.title,
        href: `/blogs?category=${featured.category.slug}`,
        count: sorted.length,
        featured: {
          title: featured.title,
          href: featured.href,
          image: featured.imageUrl,
          imageAlt: featured.imageAlt,
          date: featured.date,
        },
        more: sorted.slice(1, 1 + BLOG_PANEL_MORE).map((p) => ({
          title: p.title,
          href: p.href,
          dateLabel: dateLabel(p.datetime),
        })),
      };
    });

  return { categories, total: blogPosts.length };
})();

// ───────────────────────────────────────────────────────────────────────────
// Projects mega-panel ("the reel"): the latest few covers from every category,
// in registry order, on the same dark film-archive surface as /projects.
// Derived from PROJECT_CATEGORIES so a new project — or a whole new category —
// shows up in the navbar with no edit here. Mirrors blogPanel. Server-side
// only; the client navbar receives it as a small serialized prop.
// ───────────────────────────────────────────────────────────────────────────

/** Covers shown per discipline in the panel filmstrip — the latest 5–6. */
const LATEST_PER_CATEGORY = 6;

// Per-project detail pages (/projects/[category]/[project]) were torn down and
// are being rebuilt. Until they return, a cover links to its category showcase;
// flip this one switch to true and every cover becomes a deep link, all at
// once. Mirrors the swap-point documented in CaseSlateCard.
const PROJECT_DETAIL_PAGES_LIVE = false;

const projectHref = (categorySlug: string, slug: string) =>
  PROJECT_DETAIL_PAGES_LIVE
    ? `/projects/${categorySlug}/${slug}`
    : `/projects/${categorySlug}`;

export interface ProjectsPanelCover {
  /** Project title — the hover caption and the link's accessible name. */
  title: string;
  /** Gated: the detail page when live, else the category showcase. */
  href: string;
  /** ImageKit cover path. */
  src: string;
  alt: string;
}

export interface ProjectsPanelCategory {
  title: string;
  /** The category showcase — the row's header link. */
  href: string;
  /** Total projects on file (not the capped strip length). */
  count: number;
  /** Slate register line, e.g. "06 films · 2023–2024". */
  meta: string;
  /** Latest covers, newest-first, capped at LATEST_PER_CATEGORY. */
  covers: ProjectsPanelCover[];
}

export interface ProjectsPanelData {
  categories: ProjectsPanelCategory[];
  totalProjects: number;
  totalCategories: number;
}

export const projectsPanel: ProjectsPanelData = (() => {
  const categories: ProjectsPanelCategory[] = Object.values(
    PROJECT_CATEGORIES,
  ).map((cat) => {
    // Same "latest" key the category showcase uses (CaseFileIndex): newest
    // 4-digit year first, stable within a year (keeps authoring order).
    const latest = [...cat.projects]
      .sort((a, b) => latestYear(b.year) - latestYear(a.year))
      .slice(0, LATEST_PER_CATEGORY);

    const range = yearRange(cat);
    const unit = (cat.proof?.unit ?? 'Projects').toLowerCase();

    return {
      title: cat.title,
      href: `/projects/${cat.slug}`,
      count: cat.projects.length,
      meta: `${pad2(cat.projects.length)} ${unit}${range ? ` · ${range}` : ''}`,
      covers: latest.map((p) => ({
        title: p.title,
        href: projectHref(cat.slug, p.slug),
        src: p.coverImageUrl,
        alt: p.coverImageAlt,
      })),
    };
  });

  return {
    categories,
    totalProjects: categories.reduce((n, c) => n + c.count, 0),
    totalCategories: categories.length,
  };
})();
