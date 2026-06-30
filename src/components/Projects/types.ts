// Types for the projects archive: hub → category showcase → case-study detail.
//
// Mirrors the services registry contract (`src/components/Services/types.ts`):
// `src/constants/projects.ts` holds the content, these are the shapes the
// components consume. Shapes are defined locally (not imported from Services)
// so the two registries can evolve independently; where a Services component is
// reused (ContactSheet, BeforeAfterSlider, …) the section shape mirrors its
// props structurally.

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

/** A stat tile in a case study's results band (CountUp-compatible). */
export interface ProjectStat {
  /** Static display string — used as-is when `count` is absent (e.g. "4K"). */
  value: string;
  label: string;
  /** Numeric target for the CountUp animation. When set, overrides `value`. */
  count?: number;
  /** Rendered before the number (e.g. "$"). */
  prefix?: string;
  /** Rendered after the number (e.g. "+", "%"). */
  suffix?: string;
}

/**
 * A case study as it appears on the category showcase, related lists, and the
 * hub's "Now screening" feature. The slate line on cards reads
 * `CLIENT · INDUSTRY · YEAR`.
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
  /** Featured case studies front the hub's "Now screening" frame. */
  featured?: boolean;
}

/**
 * A `ProjectSummary` paired with its category context. A summary doesn't store
 * which category it belongs to, but the cross-route showcase (`<ProjectShowcase>`
 * on /about, blog posts, and service-detail pages) needs the discipline label
 * and the `/projects/<categorySlug>` link. Built by the selectors in
 * `src/constants/projects.ts` (`getLatestAcrossCategories` / `getCategoryProjects` /
 * `getServiceProjects`).
 */
export interface FeaturedProjectEntry {
  project: ProjectSummary;
  categorySlug: string;
  categoryTitle: string;
}

/**
 * Powers /projects/[category] — one template for every category. A category
 * with an empty `projects` array renders the designed `comingSoon` state
 * instead of the showcase, so no category is ever blank.
 */
export interface ProjectCategoryContent {
  slug: string;
  title: string;
  /** Positioning chip, e.g. "Case Files · Video · Photo · Aerial". */
  eyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  description: string;
  projects: ProjectSummary[];
  /** The "file being assembled" state shown while `projects` is empty. */
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

/**
 * Fields every case-study page needs, regardless of category. Per-category
 * content types extend this with their own signature sections. The route's
 * JSON-LD reads only these base fields (plus production's `film` for
 * VideoObject), so it stays category-agnostic.
 *
 * `categorySlug` is the discriminant for the `ProjectDetailContent` union —
 * each category narrows it to a literal so TypeScript picks the right
 * template in the `ProjectDetail` dispatcher.
 */
export interface ProjectDetailBase {
  categorySlug: string;
  categoryTitle: string;
  slug: string;
  title: string;
  client: string;
  industry: string;
  /** Shoot/build location, e.g. "North Vancouver, BC". */
  location?: string;
  year: string;
  /** Services delivered on the engagement — the slate's DELIVERABLES row.
   *  `href` links a deliverable to the /services page that produces it
   *  (proof → offer); omit it when no single service page matches. */
  deliverables: { label: string; href?: string }[];
  heroHeadline: string;
  heroHeadlineAccent: string;
  /** Dek under the headline; also the card summary's long form. */
  summary: string;
  /** The dossier narrative — rendered as numbered file sections 01/02/03. */
  brief: {
    challenge: string;
    approach: string;
    outcome: string;
  };
  /** The client's signed note on the file — rendered as the brief's fourth
   *  ledger entry ("04 · The client"). Real quotes only; omit until the
   *  client has said something on the record. */
  testimonial?: {
    quote: string;
    name: string;
    /** e.g. "Founder" — follows the name in the mono attribution line. */
    role?: string;
  };
  /** Outcome stats; omit when the engagement has no clean numbers yet. */
  results?: ProjectStat[];
  /** Mono credits roll, e.g. { role: "Direction", value: "Perseus Studio" }. */
  credits?: { role: string; value: string }[];
  /** Sibling case studies in the same category for cross-linking. */
  relatedProjects: ProjectSummary[];
  cta: ProjectCtaContent;
  seo: ProjectSeo;
}

/**
 * Powers the Production case-study template — the screening-room silhouette.
 * Section order when present: slate → film → brief → phases → stills →
 * results → credits → related. Only `film` is required; everything else is
 * per-engagement.
 */
export interface ProductionProjectContent extends ProjectDetailBase {
  categorySlug: 'production';
  /**
   * The screening room — the page's signature media frame. Exactly one source:
   * `youtubeId` renders the owned YouTube embed (and emits VideoObject
   * JSON-LD); `videoUrl` plays a self-hosted .mp4 instead (no VideoObject).
   */
  film: {
    youtubeId?: string;
    /** Self-hosted .mp4 path for films not published to the channel. */
    videoUrl?: string;
    title: string;
    /** Mono chip, e.g. "02:14". */
    runtime?: string;
    /** Slate chips under the frame, e.g. ["4K", "Aerial", "Licensed score"]. */
    formatChips?: string[];
  };
  /**
   * Multi-phase engagements (e.g. a build documented over months) — each phase
   * is a short video clip with a note. Omit for single-shoot projects.
   */
  phases?: {
    heading: string;
    description: string;
    items: { label: string; videoUrl: string; note: string }[];
  };
  /**
   * Photography pulls from the shoot, rendered with the existing Services
   * `ContactSheet` component (proof grid + grease-pencil selects).
   */
  stills?: {
    heading: string;
    description: string;
    shots: { imageUrl: string; imageAlt: string }[];
    /** Indices (0-based) circled as the selects. */
    selects?: number[];
    /** Film-edge label, e.g. "PERSEUS 400 · ROLL 01". */
    filmLabel?: string;
  };
}

/**
 * Powers the Websites case-study template. Signature sections mirror the
 * Services websites visuals so the existing components are reused directly.
 * Empty content map at launch — adding a case study is data-only.
 */
export interface WebsitesProjectContent extends ProjectDetailBase {
  categorySlug: 'websites';
  /** The live site in a browser frame. */
  viewport?: {
    heading: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    /** Address-bar text, e.g. the client's domain. */
    displayUrl?: string;
  };
  /** Draggable before/after redesign comparison (shared BeforeAfterSlider). */
  comparison?: {
    heading: string;
    description: string;
    note?: string;
    before: { imageUrl: string; alt: string };
    after: { imageUrl: string; alt: string };
    degradeBefore?: boolean;
  };
  /** Measured Core Web Vitals panel (shared CoreWebVitals shape). */
  vitals?: {
    heading: string;
    description: string;
    metrics: {
      label: string;
      value: string;
      rating: 'good' | 'needs-improvement' | 'poor';
      /** Marker position along the scale, 0–100. */
      position: number;
    }[];
  };
}

/**
 * Powers the Digital Marketing case-study template. Signature sections mirror
 * the Services marketing visuals (FunnelChart / snapshot panel). Empty map at
 * launch.
 */
export interface MarketingProjectContent extends ProjectDetailBase {
  categorySlug: 'digital-marketing';
  /** Before/after conversion funnel on the same traffic (shared FunnelChart shape). */
  funnel?: {
    heading: string;
    description: string;
    stages: { label: string; value: string; before: number; after: number }[];
    /** Headline uplift chip, e.g. "+73% more leads — same traffic". */
    uplift?: string;
  };
  /** KPI tiles + trend chart for the engagement window. */
  snapshot?: {
    title: string;
    metrics: { value: string; label: string; caption?: string }[];
    /** Relative bar heights (0–100). */
    trend: number[];
    trendLabel: string;
  };
}

/**
 * Powers the Social Media case-study template. Signature sections mirror the
 * Services social visuals (profile feed panel). Empty map at launch.
 */
export interface SocialProjectContent extends ProjectDetailBase {
  categorySlug: 'social';
  /** The client's feed as shipped — profile header + post tiles. */
  feed?: {
    name: string;
    handle: string;
    stats: { value: string; label: string }[];
    tiles: { tag: string; imageUrl?: string; caption: string }[];
  };
  /** Account growth over the engagement. */
  growth?: {
    heading: string;
    description: string;
    stats: ProjectStat[];
  };
}

/**
 * Powers the Branding case-study template. Signature sections mirror the
 * Services branding visuals (identity specimen). Empty map at launch.
 */
export interface BrandingProjectContent extends ProjectDetailBase {
  categorySlug: 'branding';
  /** The delivered identity at a glance: mark + palette + type. */
  identity?: {
    monogram: string;
    wordmark: string;
    caption: string;
    palette: { name: string; hex: string }[];
    typeSpecimen: { label: string; sample: string }[];
  };
  /** The identity applied — signage, packaging, screens. */
  applications?: {
    heading: string;
    description: string;
    tiles: {
      imageUrl?: string;
      imageAlt?: string;
      label?: string;
      span?: 'tall' | 'wide' | 'square';
    }[];
  };
}

/**
 * Discriminated union of every category's case-study content, keyed on
 * `categorySlug`. The route looks one up via `getProjectDetail()` and the
 * `ProjectDetail` dispatcher switches on the discriminant to render the right
 * per-category template.
 */
export type ProjectDetailContent =
  | ProductionProjectContent
  | WebsitesProjectContent
  | MarketingProjectContent
  | SocialProjectContent
  | BrandingProjectContent;
