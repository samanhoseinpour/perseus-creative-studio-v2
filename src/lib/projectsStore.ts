import 'server-only';
import { unstable_cache } from 'next/cache';

import { IMAGE_PLACEHOLDER } from '@/constants';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import type {
  FeaturedProjectEntry,
  ProjectCoverData,
  ProjectEmbedRef,
  ProjectGalleryImage,
  ProjectStat,
  ProjectSummary,
} from '@/components/Projects/types';
import { latestYear } from '@/components/Projects/utils';
import {
  fetchMarqueeClients,
  fetchProjectDetail,
  fetchPublicDetailParams,
  fetchPublicSnapshot,
  type PublicProjectRow,
} from '@/db/portfolioQueries';
import type { PartnerLogo, PartnerRails } from '@/components/Partners';

/**
 * The public read layer for portfolio content — the async, DB-backed
 * replacement for the selector helpers that lived in src/constants/projects.ts
 * (same names, same semantics, same return types, now `await`ed).
 *
 * Caching: every read is `unstable_cache`-wrapped and tagged, with a 1-hour
 * TTL backstop. The /admin portfolio server actions call `updateTag` on every
 * write, so an edit is visible on the next public render without a redeploy —
 * statically prerendered pages regenerate stale-while-revalidate. One coarse
 * snapshot (all public projects + their client join, one query) backs every
 * listing, tally, nav panel, and sitemap consumer; only the detail pages have
 * their own per-entity cached reads.
 *
 * Cached values round-trip through JSON: everything returned from a cached
 * loader must be plain data — no Date (ISO strings), no Map, no undefined
 * fields that matter.
 */

// ── Cache tags ──────────────────────────────────────────────────────────────
// Global tags invalidate the snapshot (and with it every listing); per-entity
// tags invalidate one detail/profile page. The snapshot carries BOTH global
// tags because its summaries embed client name/logo via the join — a client
// rename refreshes the cards without double-tagging in the actions.
export const PROJECTS_TAG = 'projects';
export const CLIENTS_TAG = 'clients';
export const projectTag = (category: string, slug: string) =>
  `project:${category}/${slug}`;
export const clientTag = (slug: string) => `client:${slug}`;

const TTL_SECONDS = 3600;

// ── Row → card shaping ──────────────────────────────────────────────────────

/** Reproduces the old registry `project()` factory's placeholder-alt. */
const placeholderAlt = (title: string) => `${title} — placeholder cover.`;

function toSummary(row: PublicProjectRow): ProjectSummary {
  const clientLogoUrl = row.clientLogoBlobUrl ?? row.clientLogoStaticPath;
  return {
    slug: row.slug,
    title: row.title,
    // Display override first ('Vela' on a card whose client entity is 'Vela
    // Homes'), then the canonical client name. The seed guarantees one exists.
    client: row.clientName ?? row.clientCanonicalName ?? '',
    industry: row.industry,
    ...(row.location ? { location: row.location } : {}),
    year: row.year,
    summary: row.summary,
    // Null cover (seeded placeholder rows) renders the same placeholder the
    // old '/logo-white.png' sentinel resolved to via resolveImageSrc.
    coverImageUrl: row.coverStaticPath ?? IMAGE_PLACEHOLDER,
    coverImageAlt: row.coverStaticAlt ?? placeholderAlt(row.title),
    ...(row.services.length > 0 ? { services: row.services } : {}),
    ...(clientLogoUrl ? { clientLogoUrl } : {}),
    ...(row.featured ? { featured: true } : {}),
    hasDetail: row.hasDetail,
  };
}

// ── The snapshot ────────────────────────────────────────────────────────────

/** Public summaries per category slug, in registry (sortIndex) order. Every
 *  category key exists (empty array when a discipline has no public work). */
type ProjectsSnapshot = Record<string, ProjectSummary[]>;

const loadSnapshot = unstable_cache(
  async (): Promise<ProjectsSnapshot> => {
    const rows = await fetchPublicSnapshot();
    const snapshot: ProjectsSnapshot = {};
    for (const slug of Object.keys(PROJECT_CATEGORIES)) snapshot[slug] = [];
    for (const row of rows) (snapshot[row.category] ??= []).push(toSummary(row));
    return snapshot;
  },
  ['portfolio-snapshot-v1'],
  { tags: [PROJECTS_TAG, CLIENTS_TAG], revalidate: TTL_SECONDS },
);

// ── Listing selectors (semantics lifted verbatim from the old registry) ─────

const byYearDesc = (a: ProjectSummary, b: ProjectSummary) =>
  latestYear(b.year) - latestYear(a.year);

const toEntries = (
  categorySlug: string,
  summaries: ProjectSummary[],
): FeaturedProjectEntry[] =>
  summaries.map((project) => ({
    project,
    categorySlug,
    categoryTitle: PROJECT_CATEGORIES[categorySlug]?.title ?? categorySlug,
  }));

/** The most recent project from each discipline, ordered newest-first and
 *  capped — a cross-section of the studio's latest work for /about. */
export async function getLatestAcrossCategories(
  limit = 4,
): Promise<FeaturedProjectEntry[]> {
  const snapshot = await loadSnapshot();
  return Object.keys(PROJECT_CATEGORIES)
    .map((slug) => {
      const [newest] = [...(snapshot[slug] ?? [])].sort(byYearDesc);
      return newest ? toEntries(slug, [newest])[0] : null;
    })
    .filter((entry): entry is FeaturedProjectEntry => entry !== null)
    .sort((a, b) => byYearDesc(a.project, b.project))
    .slice(0, limit);
}

/** The N most recent projects in one discipline — blog posts and the service
 *  category pages. Empty when the slug has no category or no public work. */
export async function getCategoryProjects(
  categorySlug: string,
  limit = 4,
): Promise<FeaturedProjectEntry[]> {
  const snapshot = await loadSnapshot();
  const summaries = snapshot[categorySlug];
  if (!summaries) return [];
  return toEntries(categorySlug, [...summaries].sort(byYearDesc)).slice(
    0,
    limit,
  );
}

/** Every public summary in one discipline, registry-ordered — the category
 *  showcase's working set (CaseFileIndex sorts/filters it itself). */
export async function getCategoryProjectSummaries(
  categorySlug: string,
): Promise<ProjectSummary[]> {
  const snapshot = await loadSnapshot();
  return snapshot[categorySlug] ?? [];
}

/** All public summaries keyed by category — the home shelf's pool. */
export async function getSummariesByCategory(): Promise<
  Record<string, ProjectSummary[]>
> {
  return loadSnapshot();
}

/** One public summary by its route key — WebsitesServiceDetail's featured
 *  project lookup. Null when missing/unpublished (callers keep their
 *  fallback). */
export async function getProjectSummary(
  categorySlug: string,
  slug: string,
): Promise<ProjectSummary | null> {
  const snapshot = await loadSnapshot();
  return snapshot[categorySlug]?.find((p) => p.slug === slug) ?? null;
}

// Maps a service-detail slug to the project `services[]` deliverable label(s)
// that mark a project as proof of that service. Moved verbatim from the old
// registry — only services that actually appear on a project's deliverables
// are listed; every other service slug falls back to the whole category.
const SERVICE_PROJECT_LABELS: Record<string, string[]> = {
  // Production
  videography: ['Videography'],
  photography: ['Photography'],
  'virtual-tours-matterport': ['Matterport'],
  '2d-3d-models': ['Floor Plan'],
  // Websites
  'website-development': ['Web Development'],
  'website-redesign': ['Website Redesign'],
  'e-commerce': ['E-Commerce'],
  'website-maintenance': ['Website Maintenance'],
  // Digital marketing
  'meta-ads': ['Meta Ads'],
  // Social
  'social-media-management': ['Social Media'],
};

/** The N most recent projects for a service — filtered to projects whose
 *  deliverables match; services with no distinct tag fall back to the whole
 *  category. */
export async function getServiceProjects(
  categorySlug: string,
  serviceSlug: string,
  limit = 4,
): Promise<FeaturedProjectEntry[]> {
  const snapshot = await loadSnapshot();
  const summaries = snapshot[categorySlug];
  if (!summaries) return [];

  const sorted = [...summaries].sort(byYearDesc);
  const labels = SERVICE_PROJECT_LABELS[serviceSlug];
  const matched = labels
    ? sorted.filter((p) => p.services?.some((s) => labels.includes(s)))
    : [];
  const chosen = matched.length > 0 ? matched : sorted;

  return toEntries(categorySlug, chosen).slice(0, limit);
}

/** The newest project from every discipline except `exclude` — the
 *  CategoryComingSoon cross-links. */
export async function getLatestPerCategory(opts?: {
  exclude?: string;
}): Promise<FeaturedProjectEntry[]> {
  const entries = await getLatestAcrossCategories(
    Object.keys(PROJECT_CATEGORIES).length,
  );
  return opts?.exclude
    ? entries.filter((e) => e.categorySlug !== opts.exclude)
    : entries;
}

export type CategoryTally = {
  count: number;
  /** Min–max of every 4-digit year on the category's cards, e.g. "2023–2024". */
  yearRange: string | null;
  /** Inclusive count of years spanned (for the proof tally's CountUp). */
  yearSpan: number;
};

/** Card counts + year figures per category slug — ArchiveStacks, the nav
 *  panel meta, OtherProjectCategories, and CategoryProof all read these
 *  instead of measuring a projects array themselves. */
export async function getCategoryTallies(): Promise<
  Record<string, CategoryTally>
> {
  const snapshot = await loadSnapshot();
  const tallies: Record<string, CategoryTally> = {};
  for (const slug of Object.keys(PROJECT_CATEGORIES)) {
    const summaries = snapshot[slug] ?? [];
    const years = summaries
      .flatMap((p) => p.year.match(/\d{4}/g) ?? [])
      .map(Number);
    if (years.length === 0) {
      tallies[slug] = { count: summaries.length, yearRange: null, yearSpan: 0 };
      continue;
    }
    const min = Math.min(...years);
    const max = Math.max(...years);
    tallies[slug] = {
      count: summaries.length,
      yearRange: min === max ? String(min) : `${min}–${max}`,
      yearSpan: max - min + 1,
    };
  }
  return tallies;
}

// ── Detail pages ────────────────────────────────────────────────────────────

export interface ProjectDetailData {
  category: string;
  slug: string;
  title: string;
  client: {
    /** Card display name (override or canonical). */
    name: string;
    logoUrl: string | null;
  };
  industry: string;
  location: string | null;
  year: string;
  summary: string;
  services: string[];
  /** Case-study copy: plain text, blank-line paragraph breaks. */
  description: string | null;
  externalUrl: string | null;
  testimonial: { quote: string; name: string | null; role: string | null } | null;
  /** Outcome highlights ("By the numbers") — empty when none entered. */
  stats: ProjectStat[];
  cover: ProjectCoverData;
  gallery: ProjectGalleryImage[];
  embeds: ProjectEmbedRef[];
  visibility: 'public' | 'unlisted';
  /** ISO timestamp of the last edit — sitemap lastmod / metadata. */
  updatedAt: string;
}

// Plain loader — caching happens ONLY in getProjectDetail's per-entity
// wrapper. A second (inner) unstable_cache layer would have no entity tag and
// would keep serving stale data straight through a tag invalidation.
async function loadProjectDetail(
  category: string,
  slug: string,
): Promise<ProjectDetailData | null> {
    const row = await fetchProjectDetail(category, slug);
    if (!row) return null;
    // No detail content yet → no detail page (cards aren't linking here).
    if (!row.hasDetail) return null;

    const coverMedia = row.media.find(
      (m) => m.kind === 'cover' && m.variants !== null,
    );
    const cover: ProjectCoverData = coverMedia?.variants
      ? {
          type: 'media',
          variants: coverMedia.variants,
          alt: coverMedia.alt ?? row.title,
          blurDataUrl: coverMedia.blurDataUrl,
        }
      : {
          type: 'static',
          src: row.coverStaticPath ?? IMAGE_PLACEHOLDER,
          alt: row.coverStaticAlt ?? placeholderAlt(row.title),
        };

    return {
      category: row.category,
      slug: row.slug,
      title: row.title,
      client: {
        name: row.clientName ?? row.clientCanonicalName ?? '',
        logoUrl: row.clientLogoBlobUrl ?? row.clientLogoStaticPath,
      },
      industry: row.industry,
      location: row.location,
      year: row.year,
      summary: row.summary,
      services: row.services,
      description: row.description,
      externalUrl: row.externalUrl,
      testimonial: row.testimonialQuote
        ? {
            quote: row.testimonialQuote,
            name: row.testimonialName,
            role: row.testimonialRole,
          }
        : null,
      // Normalized to [] so the cached JSON round-trip never carries an
      // undefined field (null column = no highlights section).
      stats: row.stats ?? [],
      cover,
      gallery: row.media
        .filter((m) => m.kind === 'image' && m.variants !== null)
        .map((m) => ({
          id: m.id,
          variants: m.variants!,
          alt: m.alt ?? '',
          blurDataUrl: m.blurDataUrl,
        })),
      embeds: row.media
        .filter((m) => (m.kind === 'youtube' || m.kind === 'instagram') && m.embedRef)
        .map((m) => ({
          id: m.id,
          kind: m.kind as 'youtube' | 'instagram',
          ref: m.embedRef!,
        })),
      visibility: row.visibility === 'unlisted' ? 'unlisted' : 'public',
      updatedAt: row.updatedAt.toISOString(),
    };
}

/** One detail page's content: public or unlisted (page emits noindex), null
 *  for draft / unknown / not-yet-detail-ready → notFound(). */
export async function getProjectDetail(
  category: string,
  slug: string,
): Promise<ProjectDetailData | null> {
  // Tag per entity + globally: an edit to this project (or any client rename)
  // refreshes the page; unstable_cache keys on the arguments automatically.
  return unstable_cache(
    () => loadProjectDetail(category, slug),
    ['portfolio-detail-entry-v1', category, slug],
    {
      tags: [PROJECTS_TAG, CLIENTS_TAG, projectTag(category, slug)],
      revalidate: TTL_SECONDS,
    },
  )();
}

/** Route params (+ sitemap lastmod) for every live detail page: public AND
 *  detail-ready. */
export const listProjectDetailParams = unstable_cache(
  async (): Promise<{ category: string; project: string; lastmod: string }[]> => {
    const rows = await fetchPublicDetailParams();
    return rows.map((r) => ({
      category: r.category,
      project: r.slug,
      lastmod: r.updatedAt.toISOString(),
    }));
  },
  ['portfolio-detail-params-v1'],
  { tags: [PROJECTS_TAG], revalidate: TTL_SECONDS },
);

// ── The Partners logo marquee ───────────────────────────────────────────────

// One cache entry serves both scopes (single DB read); the flag rides beside
// the logo record so only the slim PartnerLogo enters a page's Flight
// payload.
const loadPartnerLogos = unstable_cache(
  async (): Promise<{ logo: PartnerLogo; featured: boolean }[]> =>
    (await fetchMarqueeClients()).map((row) => {
      const src = row.logoBlobUrl ?? row.logoStaticPath;
      const href = row.instagram ?? row.websiteUrl;
      return {
        featured: row.marqueeFeatured,
        logo: {
          name: row.name,
          src: src ?? '',
          ...(href ? { href } : {}),
          ...(row.logoDisc ? { disc: row.logoDisc } : {}),
        },
      };
    }),
  ['partner-logos-v1'],
  { tags: [CLIENTS_TAG], revalidate: TTL_SECONDS },
);

/**
 * The client-logo marquee's two rails, in marquee_sort order split down the
 * middle — 'home' is the curated featured subset (the "Selected Clients"
 * rail), 'all' is the full About-page wall. An /admin client edit refreshes
 * this via CLIENTS_TAG without a redeploy. Members without any logo are
 * skipped rather than rendered as an empty coin.
 */
export async function getPartnerLogos(
  scope: 'home' | 'all',
): Promise<PartnerRails> {
  const all = await loadPartnerLogos();
  const list = (scope === 'home' ? all.filter((e) => e.featured) : all)
    .map((e) => e.logo)
    .filter((l) => l.src);
  const mid = Math.ceil(list.length / 2);
  return { rail1: list.slice(0, mid), rail2: list.slice(mid) };
}
