import { CATEGORIES, getServiceDetail } from '@/constants/services';
import { blogPosts, type BlogPost } from '@/constants/blogs';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { getSummariesByCategory } from '@/lib/projectsStore';
import { blurFor } from '@/lib/imageBlur';
import { latestYear, yearRange, pad2 } from '@/components/Projects/utils';
import type {
  BlogPanelData,
  NavLinkGroup,
  ProjectsPanelCategory,
  ProjectsPanelData,
} from './navItems';

// SERVER-SIDE ONLY. This module's top level derives the mega-panel data from
// the full services/blogs/projects registries, so any *value* import from a
// client component would ship the whole content DB as JavaScript on every
// page. Client chrome (NavbarClient, MobileMenu) imports the nav list and
// types from ./navItems instead; the re-export below keeps this module the
// one-stop import for the server shells (Navbar, Footer).
export * from './navItems';

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

// Freshness key mirroring the sitemap's postDate(): updatedAt > datetime > date.
const postTime = (p: BlogPost) =>
  new Date(p.updatedAt ?? p.datetime ?? p.date).getTime();

// Featured cover + up to this many headline rows = at most 5 posts surfaced
// per category in the mega-panel's journal index.
const BLOG_PANEL_MORE = 4;

// Compact dateline for the index rows, e.g. "Feb 21". The featured post keeps
// the post's full display `date`; the rows below use this terser form.
// timeZone pinned to UTC: `YYYY-MM-DD` datetimes parse as UTC midnight, so a
// non-UTC build machine would otherwise render every dateline a day early.
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

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
          imageBlur: blurFor(featured.imageUrl),
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
// Cards come from the DB through the cached projectsStore snapshot (chrome —
// titles, proof nouns, category order — stays in PROJECT_CATEGORIES), so a
// project published in /admin shows up in the navbar without a redeploy.
// Mirrors blogPanel. Server-side only; Navbar/Footer await this and pass the
// result to the client chrome as a small serialized prop.
// ───────────────────────────────────────────────────────────────────────────

/** Covers shown per discipline in the panel filmstrip — the latest 5–6. */
const LATEST_PER_CATEGORY = 6;

export async function getProjectsPanel(): Promise<ProjectsPanelData> {
  const bySlug = await getSummariesByCategory();

  const categories: ProjectsPanelCategory[] = Object.entries(
    PROJECT_CATEGORIES,
  ).map(([slug, cat]) => {
    const all = bySlug[slug] ?? [];
    // Same "latest" key the category showcase uses (CaseFileIndex): newest
    // 4-digit year first, stable within a year (keeps store order). Spread
    // before sorting — the snapshot array is shared cache state.
    const latest = [...all]
      .sort((a, b) => latestYear(b.year) - latestYear(a.year))
      .slice(0, LATEST_PER_CATEGORY);

    const range = yearRange(all);
    const unit = (cat.proof?.unit ?? 'Projects').toLowerCase();

    return {
      title: cat.title,
      href: `/projects/${slug}`,
      count: all.length,
      meta: `${pad2(all.length)} ${unit}${range ? ` · ${range}` : ''}`,
      covers: latest.map((p) => ({
        title: p.title,
        // The curated-rollout gate (mirrors CaseSlateCard): a cover deep-links
        // to its case study once the project has detail content; until then it
        // lands on the category showcase.
        href: p.hasDetail
          ? `/projects/${slug}/${p.slug}`
          : `/projects/${slug}`,
        src: p.coverImageUrl,
        alt: p.coverImageAlt,
        blur: blurFor(p.coverImageUrl),
      })),
    };
  });

  return {
    categories,
    totalProjects: categories.reduce((n, c) => n + c.count, 0),
    totalCategories: categories.length,
  };
}
