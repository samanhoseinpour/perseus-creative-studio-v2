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
   * Optional Tailwind object-position utility (e.g. 'object-top') for photos
   * whose subject sits off-center, where the default center crop would hide it.
   * Falls back to center when unset.
   */
  imagePosition?: string;
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
   * Rich, two-sentence intro for the services bento heading — describes the
   * breadth on offer and points the reader into the cards. Distinct from
   * `positioning` (which fills the bento's "approach" cell).
   */
  servicesIntro: string;
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
  /** Representative image path for the category's home-page carousel card. */
  cardImageUrl: string;
  /** "How we work" — engagement steps shown on the category page. */
  process?: {
    heading: string;
    description: string;
    steps: ServiceProcessStep[];
  };
  /**
   * "Why Perseus" — an opinionated contrast ledger (the usual vs. our way).
   * Optional: a category without it simply hides the band.
   */
  whyChooseUs?: {
    heading: string;
    /** Lighter continuation of the title (matches Heading's titleAccent). */
    titleAccent?: string;
    description: string;
    /** 3–5 rows. `aspect` = the row label, then the two columns. */
    rows: { aspect: string; usual: string; perseus: string }[];
  };
  /**
   * "Who it's for" — the business types/industries this category serves, so a
   * reader can self-qualify. Optional: a category without it hides the band.
   */
  fitFor?: {
    heading: string;
    /** Lighter continuation of the title (matches Heading's titleAccent). */
    titleAccent?: string;
    description: string;
    /** Industry segments; author 6 so the grid fills cleanly at 2 & 3 cols. */
    segments: { name: string; deliverable: string }[];
  };
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

/** A client testimonial, attributed with the client's company/brand mark. */
export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  /** Client logo path under /images/shared/client-logos/...avif */
  logo: string;
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
  /** Image src for a photo tile; omit for a text tile. */
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
  /**
   * Optional Tailwind object-position utility (e.g. 'object-top') for the hero
   * crop, mirroring `ServiceSummary.imagePosition` — the hero reuses the card
   * image, so it reuses the card's crop hint to keep the subject in frame.
   */
  heroImagePosition?: string;
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
   * "Flight plan" — a drone route drawn over an aerial still with plotted
   * waypoints + altitude telemetry. A signature section unique to aerial
   * production; other production services omit it and it doesn't render.
   */
  flightPath?: {
    heading: string;
    description: string;
    /** Aerial still the route is drawn over (image path). */
    imageUrl: string;
    imageAlt: string;
    /** SVG path `d` describing the route, authored in a 0 0 1000 625 viewBox. */
    path: string;
    /** Plotted waypoints; `x`/`y` are in the same 1000×625 viewBox. */
    waypoints: { x: number; y: number; label: string; altitude: string }[];
    /** HUD telemetry chips, e.g. ["4K / 6K capture", "~12 min flight"]. */
    telemetry?: string[];
  };
  /**
   * "Raw → graded" — a draggable before/after color-grade comparison. A
   * signature for post-production; reuses the shared `BeforeAfterSlider`. Other
   * production services omit it.
   */
  grade?: {
    heading: string;
    description: string;
    before: { imageUrl: string; alt: string };
    after: { imageUrl: string; alt: string };
    /** Caption under the slider (e.g. a representative-footage disclaimer). */
    note?: string;
    /** Flatten the "before" frame to read as ungraded. */
    degradeBefore?: boolean;
  };
  /**
   * Photography signature — a film "contact sheet": a proof grid of frames with
   * frame numbers and grease-pencil "selects". Carried only by photography.
   */
  contactSheet?: {
    heading: string;
    description: string;
    shots: { imageUrl: string; imageAlt: string }[];
    /** Indices (0-based) circled as the selects. */
    selects?: number[];
    /** Film-edge label, e.g. "PERSEUS 400 · ROLL 01". */
    filmLabel?: string;
  };
  /**
   * 2D & 3D signature — a drag-to-rotate turntable. A render spins around its Y
   * axis on a dark stage; drag (or auto-rotate) shows it from every angle.
   * Carried only by 2d-3d-models.
   */
  turntable?: {
    heading: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    chips?: string[];
  };
  /**
   * Virtual Tours signature — a Matterport-style viewer: a scene with hotspots,
   * room thumbnails to switch, and mode chips. Carried only by
   * virtual-tours-matterport.
   */
  tour?: {
    heading: string;
    description: string;
    scenes: { name: string; imageUrl: string; imageAlt: string }[];
    modes?: string[];
  };
  /**
   * "One shoot → every format" — a single frame shown re-cropped to each ratio.
   * Only services with a genuine multi-format deliverable carry it (video,
   * photo); visualization/tour services omit it.
   */
  formats?: {
    heading: string;
    description: string;
    /** Source image, shown at each ratio. */
    imageUrl: string;
    imageAlt: string;
    /**
     * Optional object-position class for the cropped frames (e.g. `object-top`),
     * mirroring `heroImagePosition`. A portrait source needs a focal nudge so the
     * wide 16:9 frame keeps the subject instead of centering on a torso band.
     */
    imagePosition?: string;
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
  /**
   * Slug of a project in the websites archive (`PROJECT_CATEGORIES.websites`) to
   * front the hero as a film-slate "featured case" instead of the browser-chrome
   * SiteViewport. Unset — or a slug that doesn't resolve — falls back to the
   * SiteViewport (which shows the service's own /images hero when it has one,
   * else the shared perseustudio.com homepage shot). See FeaturedCaseHero.
   */
  featuredProjectSlug?: string;
  intro?: {
    heading: string;
    body: string;
    highlights: string[];
  };
  /**
   * "One design, every screen" — the same page shown in desktop, tablet, and
   * phone frames on a shared baseline, each captioned with its breakpoint. A
   * signature section for Website Design; other website services omit it.
   */
  responsive?: {
    heading: string;
    description: string;
    /** The design screenshot; cover-cropped to each device's aspect. */
    imageUrl: string;
    imageAlt: string;
    /** Optional per-device crops; each falls back to `imageUrl`. */
    tabletImageUrl?: string;
    mobileImageUrl?: string;
    /** Address-bar text for the desktop chrome; defaults to the canonical URL. */
    displayUrl?: string;
    /** Breakpoint captions in device order [desktop, tablet, phone]. */
    breakpoints?: [string, string, string];
  };
  /**
   * E-commerce signature — an interactive storefront mock. Adding a product
   * bumps an animated cart count, demonstrating the conversion flow (no prices,
   * per studio rule — trust chips carry the commerce signal). Carried only by
   * the e-commerce service.
   */
  storefront?: {
    heading: string;
    description: string;
    storeName: string;
    products: { name: string; tag: string }[];
    /** Trust / feature chips under the grid, e.g. ["Apple Pay", "Free returns"]. */
    features?: string[];
  };
  /**
   * Website Development signature — code resolving into rendered UI. Authored
   * `code` lines sit beside a live-looking component that the code describes.
   * Carried only by website-development.
   */
  codeToUi?: {
    heading: string;
    description: string;
    /** Filename shown on the editor tab. */
    fileName: string;
    /** Source lines shown in the editor pane. */
    code: string[];
    /** The rendered component the code maps to. */
    rendered: {
      eyebrow: string;
      headline: string;
      body: string;
      cta: string;
      /** Optional site name + nav for the preview browser's faux top bar. */
      siteName?: string;
      nav?: string[];
    };
    /** URL shown in the preview browser chrome (defaults to the canonical URL). */
    previewUrl?: string;
    /** Build-time label for the status strip, e.g. "Compiled in 0.8s". */
    buildLabel?: string;
    /** Quality checks shown in the status strip, e.g. ["TypeScript", "100 Lighthouse"]. */
    checks?: string[];
  };
  /**
   * Landing Pages signature — an annotated conversion wireframe. A stacked page
   * of skeleton blocks, each numbered and explained, so the anatomy of a page
   * that converts is visible. Carried only by landing-pages.
   */
  conversionAnatomy?: {
    heading: string;
    description: string;
    blocks: { label: string; note: string }[];
  };
  /**
   * Web Applications signature — an app-UI dashboard mock (sidebar, stat tiles,
   * a mini chart). Built from divs, not a screenshot. Carried only by
   * web-applications.
   */
  dashboardMock?: {
    heading: string;
    description: string;
    appName: string;
    /**
     * Sidebar views — each `kind` renders a *different* UI (tiles+bar chart,
     * a CRM table, a capacity calendar, a line-chart report). Clicking one swaps
     * the whole panel.
     */
    views: (
      | {
          name: string;
          kind: 'overview';
          stats: { label: string; value: string }[];
          /** Relative bar heights (0–100). */
          chart: number[];
          chartLabel: string;
        }
      | {
          name: string;
          kind: 'customers';
          rows: { name: string; meta: string; status: string }[];
        }
      | {
          name: string;
          kind: 'bookings';
          week: { day: string; booked: number; capacity: number }[];
        }
      | {
          name: string;
          kind: 'reports';
          /** Line-chart series, values 0–100. */
          series: number[];
          seriesLabel: string;
          rows: { label: string; value: string }[];
        }
    )[];
  };
  /**
   * Website Maintenance signature — a status-page panel: overall uptime, a
   * per-service status list, and a 90-day uptime strip. Carried only by
   * website-maintenance.
   */
  uptimeMonitor?: {
    heading: string;
    description: string;
    /** Overall uptime, e.g. "99.98%". */
    uptime: string;
    services: { name: string; status: string }[];
    /** 90 daily values, 0–100 (100 = full-up day; lower = an incident). */
    history: number[];
    chips?: string[];
  };
  /**
   * Performance & SEO Audit signature — a Core Web Vitals panel: each metric on
   * a good/needs-improvement/poor scale with the measured value marked. Carried
   * only by performance-seo-audit.
   */
  coreWebVitals?: {
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
  /**
   * SEO signature — a faux SERP where the marked result climbs to #1 on
   * scroll-in. `results` are authored in their *starting* order; the entry with
   * `you: true` reorders to the top. Only the SEO service carries it.
   */
  serp?: {
    heading: string;
    description: string;
    /** Search query shown in the SERP search bar. */
    query: string;
    results: { title: string; url: string; you?: boolean }[];
  };
  /**
   * Paid-channel signature — a realistic native ad preview. One shape, a
   * `platform` discriminant renders a Google search ad, a Meta feed ad, or a
   * LinkedIn sponsored post. Carried by google-ads / meta-ads / linkedin-ads.
   */
  adPreview?: {
    heading: string;
    description: string;
    platform: 'google' | 'meta' | 'linkedin';
    /** Advertiser / page name. */
    brand: string;
    displayUrl: string;
    /** Ad headline (Google) or post hook (Meta/LinkedIn). */
    headline: string;
    /** Description line / primary text. */
    body: string;
    /** Button label (Meta/LinkedIn); Google renders sitelinks instead. */
    cta: string;
    /** Creative for feed ads (Meta/LinkedIn); Google omits it. */
    imageUrl?: string;
    imageAlt?: string;
    /** Sitelink labels for the Google search ad. */
    sitelinks?: string[];
    /** Optional performance chips under the card. */
    stats?: string[];
  };
  /**
   * CRO signature — a conversion funnel showing before vs. after optimization.
   * Each stage carries a `before`/`after` share of the top (0–100); the "after"
   * bar grows on scroll over a ghost "before" bar, so the lift on the *same*
   * traffic is shown. Carried only by conversion-rate-optimization.
   */
  funnel?: {
    heading: string;
    description: string;
    stages: { label: string; value: string; before: number; after: number }[];
    /** Headline uplift chip, e.g. "+73% more purchases — same traffic". */
    uplift?: string;
  };
  /**
   * Tracking & Analytics signature — an event-flow diagram. A dataLayer push
   * (code) fans through the pipeline out to each destination tool, so the plumbing
   * is shown. Carried only by tracking-analytics.
   */
  eventFlow?: {
    heading: string;
    description: string;
    /** dataLayer push lines shown in the code node. */
    code: string[];
    /** Pipeline nodes from source to dispatch, e.g. ["dataLayer", "GTM", "Server-side"]. */
    pipeline: { label: string; detail: string }[];
    /** Destination tools the event lands in. */
    destinations: string[];
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
  /**
   * Influencer signature — a vetted-creator roster + a collaboration funnel.
   * The roster reads as an editorial grid (not floating cards); the funnel's
   * bars taper on scroll-in. Carried only by influencer-collaborations.
   */
  roster?: {
    heading: string;
    description: string;
    creators: {
      handle: string;
      niche: string;
      followers: string;
      engagement: string;
      /** Optional avatar (image path); falls back to a monogram. */
      imageUrl?: string;
    }[];
    /** Collaboration pipeline stages, widest → narrowest. */
    funnel?: { label: string; value: string; width: number }[];
  };
  /**
   * Social Strategy signature — a content-pillar map: a stacked "content mix"
   * bar split by pillar share, then a pillar grid (intent + formats). `mix`
   * values are calendar shares (sum ≈ 100). Carried only by social-strategy.
   */
  pillars?: {
    heading: string;
    description: string;
    items: { name: string; intent: string; mix: number; formats: string[] }[];
  };
  /**
   * Reporting & Insights signature — a reporting board: KPI tiles, a growth
   * chart, and "what changed" highlights. Carried only by reporting-insights.
   */
  insights?: {
    heading: string;
    description: string;
    metrics: { value: string; label: string; caption?: string }[];
    /** Relative bar heights (0–100) for the growth chart. */
    trend: number[];
    trendLabel: string;
    /** Optional callouts, e.g. top post / best day. */
    highlights?: { label: string; value: string }[];
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
  /**
   * Logo signature — an "identity spec sheet": the mark on a construction grid,
   * its lockups, reversibility on dark/light/accent surfaces, and a scale test.
   * Built from the monogram + wordmark (no asset files needed). Carried only by
   * logo-visual-identity; extends the specimen hero.
   */
  identitySheet?: {
    heading: string;
    description: string;
    monogram: string;
    wordmark: string;
    /** Reversed (dark) surface hex; defaults to studio ink. */
    inkHex?: string;
    /** Light surface hex; defaults to studio bone. */
    boneHex?: string;
    /** Accent surface hex for one tinted tile; optional. */
    accentHex?: string;
  };
  /**
   * Brand Guidelines signature — a document-spread mock (cover → color → type →
   * usage) that shows the guidelines as pages, not a list. Reuses specimen-style
   * palette/type data. Carried only by brand-guidelines.
   */
  guidelines?: {
    heading: string;
    description: string;
    monogram: string;
    wordmark: string;
    palette: BrandSwatch[];
    typeSpecimen: BrandTypeSpecimen[];
  };
  /**
   * Brand Strategy signature — a 2×2 perceptual map plotting the brand against
   * competitors on two axes. `x`/`y` are 0–100 within the quadrant. Carried only
   * by brand-strategy-positioning.
   */
  positioningMap?: {
    heading: string;
    description: string;
    /** Axis endpoint labels: [left, right] and [bottom, top]. */
    xAxis: [string, string];
    yAxis: [string, string];
    points: { label: string; x: number; y: number; you?: boolean }[];
  };
  /**
   * Brand Messaging signature — tone sliders plus a message-hierarchy specimen
   * (tagline → one-liner → boilerplate). `position` is 0–100 between the two
   * tone poles. Carried only by brand-messaging-copywriting.
   */
  voice?: {
    heading: string;
    description: string;
    tones: { left: string; right: string; position: number }[];
    messaging: { label: string; text: string }[];
  };
  /**
   * Creative Direction signature — an asymmetric moodboard collage. Tiles vary
   * in span; image tiles carry alt, text tiles carry a label. Carried only by
   * creative-direction.
   */
  moodboard?: {
    heading: string;
    description: string;
    tiles: {
      imageUrl?: string;
      imageAlt?: string;
      label?: string;
      span?: 'tall' | 'wide' | 'square';
    }[];
  };
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
