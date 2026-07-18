// Types for the projects archive: hub → category showcase → case-study detail.
//
// Mirrors the services registry contract (`src/components/Services/types.ts`)
// with one split: category-page *chrome* (hero/FAQ/CTA/SEO copy) stays
// code-defined in `src/constants/projects.ts`, while the case-study cards and
// detail content live in Postgres and are read through the cached accessors in
// `@/lib/projectsStore`. These are the shapes both sides hand to components.

export interface ProjectCtaContent {
  /** Small mono eyebrow above the headline. */
  eyebrow: string;
  headline: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export interface ProjectSeo {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage: string;
}

/**
 * A case study as it appears on the category showcase, related lists, the
 * home shelf, and the cross-route ProjectShowcase. The slate line on cards
 * reads `CLIENT · INDUSTRY · YEAR`.
 */
export interface ProjectSummary {
  slug: string;
  title: string;
  /** Client display name, e.g. "Vela Homes" — or "Private Residence". */
  client: string;
  /** Vertical the work served, e.g. "Construction & Development". */
  industry: string;
  /** Shoot/build city for the card meta line, e.g. "North Vancouver, BC".
   *  Mirrors the detail's `location`; omit when not disclosable. */
  location?: string;
  /** Display year or range, e.g. "2024" / "2023–2024". */
  year: string;
  /** One-line card description. */
  summary: string;
  /** Poster-frame image (cards + OG). */
  coverImageUrl: string;
  coverImageAlt: string;
  /** Perseus services on the engagement, as short tag chips on the slate
   *  frame (e.g. "Videography", "Aerial") — derived from the dossier's
   *  deliverables, never aspirational. These also drive the project
   *  index's service filter, so keep the wording consistent across projects. */
  services?: string[];
  /** Path of the client's mark (same registry the Partners marquee
   *  uses) — rendered as a circular chip on the card's call sheet. Omit for
   *  private clients or marks the studio can't show. */
  clientLogoUrl?: string;
  /** Editorial flag set in /admin — no public surface reads it yet; reserved
   *  for a future featured shelf. */
  featured?: boolean;
  /** True once the project has detail content (case-study copy or media) —
   *  set by the projectsStore accessors. Cards link to
   *  /projects/<category>/<slug> only when true; until then they keep linking
   *  to the category showcase (the curated-rollout contract). */
  hasDetail?: boolean;
}

/**
 * Responsive rendition set for one /admin-uploaded image (public Blob CDN
 * URLs). Declared in src/db/schema.ts next to the project_media table that
 * stores it; re-exported here type-only so component code never touches the
 * schema module.
 */
export type { ProjectMediaVariants } from '@/db/schema';
import type { ProjectMediaVariants as MediaVariants } from '@/db/schema';

/** One outcome highlight ("By the numbers" opener) — same re-export idiom. */
export type { ProjectStat } from '@/db/schema';

/**
 * A project's resolved cover: either a static registry asset under /images
 * (rides <Img> + the pre-generated variant ladder + blurFor) or an uploaded
 * media set (rides <ProjectMediaImage> with its stored rungs + LQIP). One
 * branch point renders both: <ProjectCover>.
 */
export type ProjectCoverData =
  | { type: 'static'; src: string; alt: string }
  | {
      type: 'media';
      variants: MediaVariants;
      alt: string;
      blurDataUrl: string | null;
    };

/** One uploaded gallery image on a project detail page. */
export interface ProjectGalleryImage {
  id: string;
  variants: MediaVariants;
  alt: string;
  blurDataUrl: string | null;
}

/** One video embed on a project detail page. */
export interface ProjectEmbedRef {
  id: string;
  kind: 'youtube' | 'instagram';
  /** Bare 11-char YouTube id, or canonical instagram.com/(p|reel|tv)/<id>/ URL. */
  ref: string;
}

/**
 * A `ProjectSummary` paired with its category context. A summary doesn't store
 * which category it belongs to, but the cross-route showcase (`<ProjectShowcase>`
 * on /about, blog posts, and service-detail pages) needs the discipline label
 * and the `/projects/<categorySlug>` link. Built by the selectors in
 * `@/lib/projectsStore` (`getLatestAcrossCategories` / `getCategoryProjects` /
 * `getServiceProjects`).
 */
export interface FeaturedProjectEntry {
  project: ProjectSummary;
  categorySlug: string;
  categoryTitle: string;
}

/**
 * Powers /projects/[category] — the code-defined chrome for one category
 * (hero, comingSoon, proof labels, FAQs, CTA, SEO). The case-study cards
 * themselves come from `getCategoryProjectSummaries()` in `@/lib/projectsStore`;
 * a category whose store summaries are empty renders the designed `comingSoon`
 * state instead of the showcase, so no category is ever blank.
 */
export interface ProjectCategoryContent {
  slug: string;
  title: string;
  /** Positioning chip, e.g. "Case Files · Video · Photo · Aerial". */
  eyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  description: string;
  /** The "file being assembled" state shown while the category has no
   *  public work in the store. */
  comingSoon: {
    headline: string;
    body: string;
    /** Anonymized engagements currently underway: industry + stage. */
    inProduction: { industry: string; stage: string }[];
    /** The matching /services/<slug> page to route demand to meanwhile. */
    serviceHref: string;
  };
  /** Labels for the CategoryProof tally. Figures are always derived from the
   *  live files; only the nouns vary per discipline. Both fields default to
   *  category-agnostic wording, so omitting `proof` is safe. */
  proof?: {
    /** Plural noun for the projects, e.g. "Films" / "Sites". Default "Projects". */
    unit?: string;
    /** Label for the distinct-industries figure. Default "Sectors served". */
    sectorsLabel?: string;
  };
  /** Discipline-specific Q&A rendered through the shared <Faqs> section and
   *  emitted as FAQPage JSON-LD. Omit to drop the band on that category. */
  faqs?: { question: string; answer: string }[];
  cta: ProjectCtaContent;
  seo: ProjectSeo;
}
