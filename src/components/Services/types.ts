// Types for the service category + service detail experience.
//
// NOTE (iteration 1): these are the *shapes* the components consume. Content
// is still hard-coded inside the route files (`app/services/[category]/...`).
// Once the design is approved, these types move to `src/constants/services.ts`
// and the hard-coded objects become the seed data. This file is the contract
// the future data system has to satisfy — nothing here renders on its own.

export interface ServiceCtaContent {
  /** Small mono eyebrow above the headline. */
  eyebrow: string;
  headline: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

/** A single service as it appears in a category grid / related list. */
export interface ServiceSummary {
  slug: string;
  title: string;
  /** One-line positioning shown on the card. */
  tagline: string;
  imageUrl: string;
  imageAlt: string;
  /**
   * Whether a detail page exists yet. Available → links to the detail route;
   * not yet → links to /contact so the demo never dead-ends on a 404.
   * Drops out once every service has a detail page.
   */
  available: boolean;
  /** Featured services render larger in the grid. */
  featured?: boolean;
}

export interface ServiceSeo {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage: string;
}

/** Powers /services/[category] — one template for every category. */
export interface ServiceCategoryContent {
  slug: string;
  title: string;
  /** Positioning chip, e.g. "Photo · Video · Aerial · 3D". */
  eyebrow: string;
  /** Short positioning statement used under the hero. */
  positioning: string;
  heroTitle: string;
  heroTitleAccent: string;
  description: string;
  featuredServiceSlug: string;
  /** Caption under the big service-count in the bento's spec cell. */
  specLabel: string;
  /**
   * Blog category slug whose posts feed this category's "From the Journal"
   * section. Omit (or point at a category with no posts) to hide the section.
   * TODO: once blog categories are renamed to match service slugs, this can
   * default to `slug` and the explicit mapping drops away.
   */
  blogCategorySlug?: string;
  services: ServiceSummary[];
  /** Credibility row shown under the bento. */
  stats: ServiceStat[];
  /** Keyword/industry terms for the marquee under the stats (texture + SEO). */
  marquee: string[];
  /** Representative ImageKit path for the category's home-page carousel card. */
  cardImageUrl: string;
  /** Objection-handling FAQ for the category (also feeds FAQPage JSON-LD). */
  faqs: ServiceFaq[];
  cta: ServiceCtaContent;
  seo: ServiceSeo;
}

export interface ServiceStat {
  /** Static display string — used as-is when `count` is absent (e.g. "3×"). */
  value: string;
  label: string;
  /** Numeric target for the CountUp animation. When set, overrides `value`. */
  count?: number;
  /** Rendered before the number (e.g. "$"). */
  prefix?: string;
  /** Rendered after the number (e.g. "+", "%", "K"). */
  suffix?: string;
}

export interface ServiceProcessStep {
  /** Display index, e.g. "01". */
  step: string;
  title: string;
  description: string;
}

export interface ServiceIncludedItem {
  title: string;
  description: string;
}

export interface ServiceShowcaseItem {
  youtubeId: string;
  title: string;
}

/** A client testimonial with an embedded YouTube video clip. */
export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  /** YouTube video id for the embedded clip / thumbnail. */
  src: string;
}

/**
 * One crop in the Production "one shoot → every format" visual. The same source
 * frame is shown re-cropped to each ratio.
 */
export interface ServiceFormat {
  /** Aspect label, e.g. "16:9". */
  ratio: string;
  /** Where it's used, e.g. "Web & YouTube". */
  label: string;
  /** Tailwind aspect-ratio value, e.g. "16/9" | "9/16" | "1/1" | "4/5". */
  aspect: string;
}

/** A labelled cluster of tools/tech for the Websites stack diagram. */
export interface ServiceStackGroup {
  /** Mono row label, e.g. "Frontend" / "CMS & Commerce". */
  label: string;
  /** The tools/frameworks in this group, e.g. ["Next.js", "React"]. */
  items: string[];
}

/** A single Lighthouse-style score: a display value + its 0–100 ring fill. */
export interface WebsiteScore {
  /** Display value, e.g. "98" or "1.4s". */
  value: string;
  /** 0–100 fill — drives the ring AND the Lighthouse colour band. */
  gauge: number;
}

/**
 * One radial gauge in the Websites outcomes dashboard, shown as a before→after
 * comparison: the ring sweeps from the "before" score (typically red/amber) up
 * to the optimized "after" score (green) on scroll-in.
 */
export interface WebsiteMetric {
  label: string;
  /** Mono caption under the label, e.g. "/ 100 Lighthouse". */
  caption?: string;
  before: WebsiteScore;
  after: WebsiteScore;
}

/**
 * One cell in the Social hero feed grid. An image tile when `imageUrl` is set;
 * otherwise a "text post" tile (quote/carousel cover) rendered in ink.
 */
export interface SocialPostTile {
  /** Mono corner tag, e.g. "Reel" / "Carousel" / "Quote". */
  tag: string;
  /** ImageKit src for a photo tile; omit for a text tile. */
  imageUrl?: string;
  /** Alt for image tiles / the post copy for text tiles. */
  caption: string;
}

/** The profile-style feed panel in the Social hero. */
export interface SocialFeedPanel {
  /** Display name in the profile header. */
  name: string;
  /** Handle, e.g. "@perseusstudio". */
  handle: string;
  /** Compact profile stats, e.g. [{ value: "12.4k", label: "followers" }]. */
  stats: { value: string; label: string }[];
  tiles: SocialPostTile[];
}

/** One weekday column in the Social content-cadence strip. */
export interface SocialCadenceDay {
  /** Short label, e.g. "Mon". */
  day: string;
  /** Post types scheduled that day; empty = a rest day. */
  posts: string[];
}

/** The representative posting rhythm shown on the Social detail page. */
export interface SocialCadence {
  heading: string;
  description: string;
  week: SocialCadenceDay[];
  /** Summary chips under the week, e.g. "4–5 posts / week". */
  summary: string[];
}

/** A KPI tile in the Marketing hero performance snapshot. */
export interface MarketingMetric {
  /** Big headline figure as authored, e.g. "+182%" or "Top 3". */
  value: string;
  label: string;
  /** Small qualifier under the label, e.g. "trailing 6 months". */
  caption?: string;
}

/**
 * The inverted analytics panel in the Marketing hero — KPI tiles plus a CSS
 * growth chart. Signals the discipline (numbers, not a photo). Optional so a
 * lighter marketing service can skip it.
 */
export interface MarketingSnapshot {
  /** Mono panel title, e.g. "Performance snapshot". */
  title: string;
  metrics: MarketingMetric[];
  /** Relative bar heights (0–100) driving the growth chart. */
  trend: number[];
  /** Mono caption under the chart, e.g. "Organic sessions, trailing 6 mo". */
  trendLabel: string;
}

/** A swatch in the Branding hero specimen palette. */
export interface BrandSwatch {
  name: string;
  /** Any CSS color the panel renders inline, e.g. "#C4502E". */
  hex: string;
}

/** A line in the Branding hero specimen's type sample. */
export interface BrandTypeSpecimen {
  /** Mono caption, e.g. "Display" / "Body". */
  label: string;
  sample: string;
}

/**
 * The designed identity panel in the Branding hero — a "brand at a glance"
 * artifact (monogram + palette + type) that signals the discipline without a
 * photo. Optional on the content type so a copy-only branding service can skip
 * the visual.
 */
export interface BrandIdentitySpecimen {
  /** Large monogram glyph, e.g. "P". */
  monogram: string;
  /** Wordmark line under the monogram. */
  wordmark: string;
  /** Caption under the wordmark, e.g. "Studio identity, at a glance". */
  caption: string;
  palette: BrandSwatch[];
  typeSpecimen: BrandTypeSpecimen[];
}

/** A numbered statement in the Branding "how we build brands" band. */
export interface BrandPrinciple {
  /** Display index, e.g. "01". */
  index: string;
  title: string;
  description: string;
}

/**
 * One column in the Websites "choose your build" table. Describes the *scope*
 * of a build, never a price — the studio quotes per project after a call.
 */
export interface ServiceBuildTier {
  name: string;
  /** One-line description of who/what the tier suits. */
  bestFor: string;
  /** Inclusions list rendered with check marks. */
  features: string[];
  /** Inverts the column to draw the eye (the recommended engagement). */
  featured?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

/**
 * Fields every service-detail page needs, regardless of category. Per-category
 * content types extend this with their own distinct sections. The route's
 * JSON-LD reads only these base fields, so it stays category-agnostic.
 *
 * `categorySlug` is the discriminant for the `ServiceDetailContent` union — each
 * category narrows it to a literal so TypeScript can pick the right component.
 */
export interface ServiceDetailBase {
  categorySlug: string;
  categoryTitle: string;
  slug: string;
  title: string;
  eyebrow: string;
  heroHeadline: string;
  heroHeadlineAccent: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroImageAlt: string;
  faqs: ServiceFaq[];
  cta: ServiceCtaContent;
  /** Sibling services inside the same category for cross-linking. */
  relatedServices: ServiceSummary[];
  seo: ServiceSeo;
}

/**
 * Powers the Production service detail template for EVERY production service
 * (videography, photography, aerial, 3D, tours, post). The template renders the
 * sections a given service provides and skips the rest, so a simple service can
 * omit `outcomes`, etc. Section order when present:
 * intro → process → included → outcomes.
 *
 * NOTE: no project/reel showcase here — a dedicated Projects feature is coming
 * separately, and service detail pages won't surface reels.
 */
export interface ProductionServiceContent extends ServiceDetailBase {
  categorySlug: 'production';
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  process?: {
    heading: string;
    description: string;
    steps: ServiceProcessStep[];
  };
  included?: {
    heading: string;
    description: string;
    items: ServiceIncludedItem[];
  };
  outcomes?: {
    heading: string;
    description: string;
    stats: ServiceStat[];
  };
  /**
   * "One shoot → every format" — a single frame shown re-cropped to each ratio.
   * Only services with a genuine multi-format deliverable carry it (video,
   * photo); visualization/tour services omit it.
   */
  formats?: {
    heading: string;
    description: string;
    /** Source image, re-cropped across each ratio by ImageKit. */
    imageUrl: string;
    imageAlt: string;
    ratios: ServiceFormat[];
  };
  /**
   * "What shapes your quote" — an honest scoping explainer. Carries no prices
   * (services are quoted after a call), only the factors that drive scope.
   */
  scoping?: {
    heading: string;
    description: string;
    factors: ServiceIncludedItem[];
    /** Closing line — must not contain prices. */
    note?: string;
  };
  /** Real client testimonials shown on the page (shared production set). */
  testimonials?: Testimonial[];
}

// ───────────────────────────────────────────────────────────────────────────
// Placeholder content types for the remaining categories. Each gets a fully
// distinct layout (and therefore its own section shapes) when its detail UI is
// built. For now they only carry the shared base + a literal categorySlug so
// the route/dispatcher are wired and type-safe. Their content maps are empty
// until copy is authored.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Powers the Websites service detail template. Distinct from Production: a
 * browser-framed hero, a tech-stack spec sheet, a vertical build timeline, and
 * an inverted-featured "choose your build" table — websites are digital, so the
 * media treatment is a UI chrome, not a photo scrim. Section order when present:
 * intro → stack → build → builds. Every section is optional so a lighter
 * service (e.g. a landing page) can omit builds/stack and still render.
 * The builds table describes scope only — no prices anywhere on services.
 */
export interface WebsiteServiceContent extends ServiceDetailBase {
  categorySlug: 'websites';
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  stack?: {
    /** Mono eyebrow for the section; defaults to "Stack". */
    eyebrow?: string;
    heading: string;
    description: string;
    groups: ServiceStackGroup[];
  };
  build?: {
    heading: string;
    description: string;
    steps: ServiceProcessStep[];
  };
  /** Draggable before/after image comparison (used on the redesign page). */
  comparison?: {
    heading: string;
    description: string;
    /** Caption under the slider, e.g. a placeholder disclaimer. */
    note?: string;
    before: { imageUrl: string; alt: string };
    after: { imageUrl: string; alt: string };
    /** Demo only: filter the Before image to look dated until real shots exist. */
    degradeBefore?: boolean;
  };
  /** Inverted impact band — animated radial gauges (why a fast build pays off). */
  outcomes?: {
    heading: string;
    description: string;
    metrics: WebsiteMetric[];
  };
  builds?: {
    heading: string;
    description: string;
    /** Fine-print under the table (no prices). */
    note?: string;
    tiers: ServiceBuildTier[];
  };
}

/**
 * Powers the Digital Marketing service detail template — a metric-forward
 * silhouette: the hero "wow" is a performance-snapshot panel (KPI tiles + a CSS
 * growth chart, not a photo), and the body leans on a levers grid, an inverted
 * KPI/outcomes band, and a reporting band (transparency is the differentiator).
 * No project showcase or numbered-steps section. Section order when present:
 *   hero → intro → levers → outcomes → reporting. Every section is optional.
 */
export interface MarketingServiceContent extends ServiceDetailBase {
  categorySlug: 'digital-marketing';
  snapshot?: MarketingSnapshot;
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  /** What the engagement actually optimizes — the work areas / channels. */
  levers?: {
    heading: string;
    description: string;
    items: ServiceIncludedItem[];
  };
  outcomes?: {
    heading: string;
    description: string;
    stats: ServiceStat[];
  };
  reporting?: {
    heading: string;
    description: string;
    /** Reporting cadence shown as a mono chip, e.g. "Monthly". */
    cadence?: string;
    items: ServiceIncludedItem[];
  };
}

/**
 * Powers the Social Media service detail template — a feed/calendar-driven
 * silhouette: the hero "wow" is a profile-style content-feed panel, and the
 * body leans on a content-cadence week strip (the calendar signature), a
 * "what we manage" grid, and an inverted engagement band. Section order when
 * present: hero → intro → cadence → included → outcomes. Every section is
 * optional.
 */
export interface SocialServiceContent extends ServiceDetailBase {
  categorySlug: 'social';
  feed?: SocialFeedPanel;
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  cadence?: SocialCadence;
  /** What the engagement manages, as an editorial grid. */
  included?: {
    heading: string;
    description: string;
    items: ServiceIncludedItem[];
  };
  outcomes?: {
    heading: string;
    description: string;
    stats: ServiceStat[];
  };
}

/**
 * Powers the Branding service detail template. Its own silhouette: a hero split
 * with an inverted brand-specimen panel (identity, not a photo scrim or browser
 * frame), a cinematic establishing band, an editorial deliverables grid, and an
 * inverted brand-principles band. No numbered-steps section — that keeps it
 * visually distinct from Production (process grid) and Websites (build
 * timeline). Section order when present:
 *   hero → (establishing band) → intro → deliverables → principles.
 * Every section is optional so a lighter branding service can omit the ones it
 * doesn't need.
 */
export interface BrandingServiceContent extends ServiceDetailBase {
  categorySlug: 'branding';
  specimen?: BrandIdentitySpecimen;
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  deliverables?: {
    heading: string;
    description: string;
    items: ServiceIncludedItem[];
  };
  principles?: {
    heading: string;
    description: string;
    items: BrandPrinciple[];
  };
}

/**
 * Discriminated union of every category's detail content, keyed on
 * `categorySlug`. The route looks one up via `getServiceDetail()` and the
 * `ServiceDetail` dispatcher switches on the discriminant to render the right
 * per-category component.
 */
export type ServiceDetailContent =
  | ProductionServiceContent
  | WebsiteServiceContent
  | MarketingServiceContent
  | SocialServiceContent
  | BrandingServiceContent;
