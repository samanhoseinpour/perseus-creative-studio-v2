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

export interface ServiceFaq {
  question: string;
  answer: string;
}

/**
 * Powers the Production service detail template. Other categories will get
 * their own content type (WebServiceContent, BrandingServiceContent, …) that
 * may share these sub-shapes but compose different sections.
 */
export interface ProductionServiceContent {
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
  intro: {
    heading: string;
    body: string;
    highlights: string[];
  };
  showcase: {
    heading: string;
    description: string;
    items: ServiceShowcaseItem[];
  };
  process: {
    heading: string;
    description: string;
    steps: ServiceProcessStep[];
  };
  included: {
    heading: string;
    description: string;
    items: ServiceIncludedItem[];
  };
  outcomes: {
    heading: string;
    description: string;
    stats: ServiceStat[];
  };
  faqs: ServiceFaq[];
  cta: ServiceCtaContent;
  /** Sibling services inside the same category for cross-linking. */
  relatedServices: ServiceSummary[];
  seo: ServiceSeo;
}
