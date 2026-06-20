// The projects archive registry — content for /projects and
// /projects/[category]. Mirrors the services registry contract in
// `src/constants/services.ts`: case-study summaries per category, and the
// `PROJECT_CATEGORIES` registry the hub and category pages consume.
//
// NOTE: the per-case-study DETAIL layer (content maps, `getProjectDetail`,
// `allProjectDetailParams`, and the `/projects/[category]/[project]` route) was
// torn down and is to be rebuilt later. Only summaries + categories remain.
// Types live in `src/components/Projects/types.ts`.

import { IMAGEKIT_BASE, SITE_URL } from '@/constants';
import type {
  ProjectCategoryContent,
  ProjectSummary,
} from '@/components/Projects/types';

// ───────────────────────────────────────────────────────────────────────────
// Production case-study summaries. Defined once and shared between the
// category's showcase grid and each detail page's related list, so a title or
// cover edit propagates everywhere.
// ───────────────────────────────────────────────────────────────────────────

const northVanHomeTourSummary: ProjectSummary = {
  slug: 'north-vancouver-luxury-home-tour',
  title: 'North Vancouver Luxury Home Tour',
  client: 'Private Residence',
  industry: 'Real Estate',
  location: 'North Vancouver, BC',
  year: '2024',
  summary:
    'A cinematic listing film — interiors, lifestyle moments, and golden-hour aerials cut to sell the view.',
  coverImageUrl: '/projects-realestate-1.jpg',
  coverImageAlt:
    'Cinematic interior frame from a North Vancouver luxury home listing film.',
  services: ['Videography', 'Aerial'],
  featured: true,
};

const velaHomesBuildSeriesSummary: ProjectSummary = {
  slug: 'vela-homes-build-series',
  title: 'Vela Homes — Build Series',
  client: 'Vela Homes',
  industry: 'Construction',
  location: 'Vancouver, BC',
  year: '2023–2024',
  summary:
    'A build documented phase by phase — demolition through forming — for a developer who sells on process.',
  coverImageUrl: '/projects-construction-1.jpg',
  coverImageAlt:
    'Construction site frame from the Vela Homes build documentation series.',
  services: ['Videography'],
  clientLogoUrl: '/Velahomes.png',
};

const cfrDevelopmentSummary: ProjectSummary = {
  slug: 'canadian-flooring-renovations',
  title: 'Canadian Flooring & Renovations',
  client: 'Canadian Flooring & Renovations',
  industry: 'Construction',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'Process-to-reveal coverage of a renovation project — craftsmanship details a quote sheet can’t show.',
  coverImageUrl: '/cfr-dev.mp4/ik-thumbnail.jpg',
  coverImageAlt:
    'Renovation project frame from the Canadian Flooring & Renovations film.',
  services: ['Videography', 'Photography'],
  clientLogoUrl: '/cfr.png',
};

const taurusCommercialSummary: ProjectSummary = {
  slug: 'taurus-fitness-commercial',
  title: 'Taurus Fitness Club Commercial',
  client: 'Taurus Fitness Club',
  industry: 'Fitness',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'A brand commercial built on energy — training intensity and community, cut for broadcast and social.',
  coverImageUrl: '/projects-fitness-1.jpg',
  coverImageAlt:
    'Training-floor frame from the Taurus Fitness Club brand commercial.',
  services: ['Videography'],
  clientLogoUrl: '/taurus.png',
};

const obsidianGymTourSummary: ProjectSummary = {
  slug: 'obsidian-athletic-club-tour',
  title: 'Obsidian Athletic Club Tour',
  client: 'Obsidian Athletic Club',
  industry: 'Fitness',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'A facility tour that does the walkthrough before the front desk does — space, light, and equipment in one take.',
  coverImageUrl: '/obsidian-gym-tour.mp4/ik-thumbnail.jpg',
  coverImageAlt:
    'Gym floor frame from the Obsidian Athletic Club facility tour.',
  services: ['Videography'],
  clientLogoUrl: '/obsidian.jpg',
};

const ignitionMarineSummary: ProjectSummary = {
  slug: 'ignition-marine-showcase',
  title: 'Ignition Marine — Boats & Yachts',
  client: 'Ignition Marine',
  industry: 'Boats & Yachts',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'On-water cinematics and dockside detail work — luxury marine visuals with premium polish.',
  coverImageUrl: '/projects-yacht-1.jpg',
  coverImageAlt:
    'On-water frame from the Ignition Marine boats and yachts showcase.',
  services: ['Videography', 'Aerial'],
};

const PRODUCTION_PROJECT_SUMMARIES: ProjectSummary[] = [
  northVanHomeTourSummary,
  velaHomesBuildSeriesSummary,
  cfrDevelopmentSummary,
  taurusCommercialSummary,
  obsidianGymTourSummary,
  ignitionMarineSummary,
];

// ───────────────────────────────────────────────────────────────────────────
// Websites case-study summaries. Covers are a temporary placeholder (the studio
// wordmark) until real screenshots are dropped in — swap `coverImageUrl` /
// `viewport.imageUrl` per file when the shots are ready. Same summary objects
// feed the showcase grid, related lists, and the home shelf.
// ───────────────────────────────────────────────────────────────────────────

/** Stand-in cover until per-project screenshots land. White wordmark so it
 *  reads on the card's always-dark slate backdrop. */
const WEBSITE_COVER_PLACEHOLDER = '/logo-white.png';

const matchTour11Summary: ProjectSummary = {
  slug: 'match-tour-11',
  title: 'Match Tour 11',
  client: 'Match Tour 11',
  industry: 'Sports & Fitness',
  year: '2026',
  summary:
    'A redesign for a FIFA-recognized football agency — tours, trials, and pro camps carried on a faster, more credible site.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Match Tour 11 website redesign — placeholder cover.',
  services: ['Website Redesign'],
  featured: true,
};

const dunnsMenswearSummary: ProjectSummary = {
  slug: 'dunns-menswear',
  title: 'Dunn’s Menswear',
  client: 'Dunn’s Menswear',
  industry: 'Retail & E-Commerce',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A heritage tailor since 1936, brought online — bespoke, made-to-measure, and ready-to-wear presented with the polish the name carries.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Dunn’s Menswear website — placeholder cover.',
  services: ['Web Development'],
  featured: true,
};

const kasrazRugsSummary: ProjectSummary = {
  slug: 'kasraz-rugs',
  title: 'Kasraz — Persian Silk Rugs',
  client: 'Kasraz',
  industry: 'Retail & E-Commerce',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'An e-commerce build for an authentic Persian silk rug house — collections, custom orders, and checkout, framed to sell craft.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Kasraz Persian silk rugs online store — placeholder cover.',
  services: ['E-Commerce'],
};

const phantomPestSummary: ProjectSummary = {
  slug: 'phantom-pest-control',
  title: 'Phantom Pest Control',
  client: 'Phantom Pest Control',
  industry: 'Home Services',
  location: 'Vancouver, BC',
  year: '2026',
  summary:
    'A redesign for a licensed pest and wildlife control company — service areas, pest types, and fast booking made obvious.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Phantom Pest Control website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const araniConstructionSummary: ProjectSummary = {
  slug: 'arani-construction',
  title: 'Arani Construction',
  client: 'Arani Construction Inc.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A redesign for a certified renovation contractor — a project-led site that lets the work, not the brochure copy, do the selling.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Arani Construction website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const eliteLifeSkinSummary: ProjectSummary = {
  slug: 'elite-life-skin',
  title: 'Elite Life Skin Centre',
  client: 'Elite Life Skin Centre',
  industry: 'Health & Wellness',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a medical aesthetics clinic — treatments, technology, and booking organized so prospective clients can self-qualify and reach out.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Elite Life Skin Centre website — placeholder cover.',
  services: ['Web Development'],
};

const dibaWindowsSummary: ProjectSummary = {
  slug: 'diba-windows',
  title: 'Diba Windows',
  client: 'Diba Windows Inc.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A site for a high-performance aluminum glazing manufacturer — product systems and projects presented to architects, builders, and homeowners alike.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Diba Windows website — placeholder cover.',
  services: ['Web Development'],
};

const athletePrepSummary: ProjectSummary = {
  slug: 'athlete-prep',
  title: 'Athlete Prep',
  client: 'Athlete Prep Inc.',
  industry: 'Sports & Fitness',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a strength and athletic development studio — programs, camps, and coaching laid out to turn interest into booked sessions.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Athlete Prep website — placeholder cover.',
  services: ['Web Development'],
};

const stanGlassworksSummary: ProjectSummary = {
  slug: 'stan-glassworks',
  title: 'Stan Glassworks',
  client: 'Stan Glassworks Ltd.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A redesign for a CWB-certified fabricator — custom staircases, railings, canopies, and architectural glass — built to let a decade of craftsmanship lead.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Stan Glassworks website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const cityscapeElectricalSummary: ProjectSummary = {
  slug: 'cityscape-electrical',
  title: 'Cityscape Electrical',
  client: 'Cityscape Electrical',
  industry: 'Construction & Trades',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a full-service electrical contractor behind Vancouver’s custom and waterfront builds — built to match the calibre of the work.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Cityscape Electrical website — placeholder cover.',
  services: ['Web Development'],
};

const evchargeIncSummary: ProjectSummary = {
  slug: 'evcharge-inc',
  title: 'EVcharge Inc.',
  client: 'EVcharge Inc.',
  industry: 'Energy & Infrastructure',
  location: 'Irvine, CA',
  year: '2025',
  summary:
    'A site for a zero-emission infrastructure developer — fast charging, hydrogen, and renewable energy — built to carry the technology to operators and the returns to investors.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'EVcharge Inc. website — placeholder cover.',
  services: ['Web Development'],
};

const rockyDemolitionSummary: ProjectSummary = {
  slug: 'rocky-demolition',
  title: 'Rocky Demolition',
  client: 'Rocky Demolition',
  industry: 'Construction & Trades',
  year: '2026',
  summary:
    'Ongoing care for a demolition contractor’s site — updates, fixes, and upkeep that keep the work front-and-centre and the site reliable.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Rocky Demolition website maintenance — placeholder cover.',
  services: ['Website Maintenance'],
};

const rockyJunkRemovalSummary: ProjectSummary = {
  slug: 'rocky-junk-removal',
  title: 'Rocky Junk Removal',
  client: 'Rocky Junk Removal',
  industry: 'Home Services',
  year: '2026',
  summary:
    'Ongoing care for a junk removal company’s site — service areas, booking, and content kept current so the site stays fast and dependable.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Rocky Junk Removal website maintenance — placeholder cover.',
  services: ['Website Maintenance'],
};

const WEBSITES_PROJECT_SUMMARIES: ProjectSummary[] = [
  matchTour11Summary,
  dunnsMenswearSummary,
  kasrazRugsSummary,
  phantomPestSummary,
  araniConstructionSummary,
  eliteLifeSkinSummary,
  dibaWindowsSummary,
  athletePrepSummary,
  stanGlassworksSummary,
  cityscapeElectricalSummary,
  evchargeIncSummary,
  rockyDemolitionSummary,
  rockyJunkRemovalSummary,
];

// ───────────────────────────────────────────────────────────────────────────
// Temporary placeholders for the Digital Marketing, Social, and Branding
// categories — generic numbered names and the studio wordmark as a stand-in
// cover, until real case studies replace them. Swap `title`/`client`/`summary`/
// `coverImageUrl` per file as the actual work publishes.
// ───────────────────────────────────────────────────────────────────────────

const project1Summary: ProjectSummary = {
  slug: 'project-1',
  title: 'Project #1',
  client: 'Client #1',
  industry: 'Digital Marketing',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #1 — placeholder cover.',
  services: ['Digital Marketing'],
};

const project2Summary: ProjectSummary = {
  slug: 'project-2',
  title: 'Project #2',
  client: 'Client #2',
  industry: 'Digital Marketing',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #2 — placeholder cover.',
  services: ['Digital Marketing'],
};

const project3Summary: ProjectSummary = {
  slug: 'project-3',
  title: 'Project #3',
  client: 'Client #3',
  industry: 'Social Media',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #3 — placeholder cover.',
  services: ['Social Media'],
};

const project4Summary: ProjectSummary = {
  slug: 'project-4',
  title: 'Project #4',
  client: 'Client #4',
  industry: 'Social Media',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #4 — placeholder cover.',
  services: ['Social Media'],
};

const project5Summary: ProjectSummary = {
  slug: 'project-5',
  title: 'Project #5',
  client: 'Client #5',
  industry: 'Branding',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #5 — placeholder cover.',
  services: ['Branding'],
};

const project6Summary: ProjectSummary = {
  slug: 'project-6',
  title: 'Project #6',
  client: 'Client #6',
  industry: 'Branding',
  year: '2026',
  summary: 'Placeholder case study — details coming soon.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Project #6 — placeholder cover.',
  services: ['Branding'],
};

const DIGITAL_MARKETING_PROJECT_SUMMARIES: ProjectSummary[] = [
  project1Summary,
  project2Summary,
];

const SOCIAL_PROJECT_SUMMARIES: ProjectSummary[] = [
  project3Summary,
  project4Summary,
];

const BRANDING_PROJECT_SUMMARIES: ProjectSummary[] = [
  project5Summary,
  project6Summary,
];

// ───────────────────────────────────────────────────────────────────────────
// Categories — exactly the five service-registry slugs, so CategoryVisual
// art, services↔projects cross-links, and blog categories all line up.
// ───────────────────────────────────────────────────────────────────────────

export const PROJECT_CATEGORIES: Record<string, ProjectCategoryContent> = {
  production: {
    slug: 'production',
    title: 'Production',
    eyebrow: 'Selected work · Video · Photo · Aerial',
    heroTitle: 'Shot, cut, and',
    heroTitleAccent: 'shipped.',
    description:
      'Listing films, build series, commercials, and facility tours produced end-to-end in Vancouver. Every project here is real client work — from the first site walk to final delivery.',
    projects: PRODUCTION_PROJECT_SUMMARIES,
    proof: { unit: 'Films', sectorsLabel: 'Sectors filmed' },
    comingSoon: {
      headline: 'Case studies are on the way.',
      body: 'Production case studies are being written up as engagements wrap. In the meantime, the service page covers how we shoot.',
      inProduction: [
        { industry: 'Real Estate', stage: 'In post-production' },
        { industry: 'Hospitality', stage: 'Shoot scheduled' },
      ],
      serviceHref: '/services/production',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Have something worth filming?',
      description:
        'Tell us what you’re building, selling, or opening — we’ll scope the shoot and show you what the finished film looks like before a camera comes out.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Production Services',
      secondaryHref: '/services/production',
    },
    seo: {
      title: 'Production Projects in Vancouver | Perseus Creative Studio',
      description:
        'Real production work from Vancouver: listing films, construction build series, brand commercials, and facility tours — each documented as a full case study.',
      canonicalPath: `${SITE_URL}/projects/production`,
      ogImage: `${IMAGEKIT_BASE}/projects-realestate-1.jpg?tr=w-1200,h-630,cm-extract,fo-auto`,
    },
    faqs: [
      {
        question: 'What kinds of production work do you take on?',
        answer:
          'Listing and architecture films, multi-visit construction build series, brand commercials, and facility or club tours — shot end-to-end across Vancouver and the Lower Mainland. If it needs to be filmed, edited, and delivered ready to publish, it belongs here.',
      },
      {
        question: 'Do you fly drones, and are you licensed for it?',
        answer:
          'Yes — aerial is part of most shoots, flown by an RPAS-certified pilot under Transport Canada rules. We handle the airspace checks and authorizations during pre-production, so the permitting never becomes your problem.',
      },
      {
        question:
          'How long does a typical production take from first call to final cut?',
        answer:
          'Most single-location films run a few weeks from scope to delivery; build series and multi-visit projects span the length of the build itself. We confirm exact shoot dates and a delivery window in the proposal before anything is booked.',
      },
      {
        question: 'What do we get at the end, and in what formats?',
        answer:
          'Final films graded and delivered in the resolutions you need (up to 4K/6K), plus platform-specific cutdowns for social and ads when the engagement calls for it. Where photography is in scope, stills from the shoot are delivered as a separate select set.',
      },
      {
        question: 'Can you work from our script, or do you handle that too?',
        answer:
          'Either. We can shoot to a script and shot list you bring, or build the creative from a single brief — most clients start with a goal ("sell this listing," "open this gym") and we scope the story from there.',
      },
      {
        question: 'Do you cover both video and photography on the same shoot?',
        answer:
          'Yes — most engagements capture stills and motion in the same session, so the listing, the site, and the ad campaign all draw from one coherent set of media rather than mismatched sources.',
      },
    ],
  },

  websites: {
    slug: 'websites',
    title: 'Websites',
    eyebrow: 'Selected work · Design · Development',
    heroTitle: 'Built to ship,',
    heroTitleAccent: 'built to rank.',
    description:
      'Design and development case studies — redesigns, custom builds, and e-commerce shipped for real Vancouver and Canada-wide clients. Every project here is live work you can visit.',
    projects: WEBSITES_PROJECT_SUMMARIES,
    proof: { unit: 'Sites' },
    comingSoon: {
      headline: 'Case studies are on the way.',
      body: 'Website case studies publish once each build has live performance numbers behind it — not launch-day screenshots. Three engagements are moving through the pipeline now.',
      inProduction: [
        { industry: 'Restaurant & Hospitality', stage: 'In build' },
        { industry: 'Real Estate', stage: 'Design approved' },
        { industry: 'Athletic Club', stage: 'Launch prep' },
      ],
      serviceHref: '/services/websites',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Need a site that earns its keep?',
      description:
        'These are live builds you can visit. Tell us what your site needs to do — the websites service page covers how we design, build, and measure, and a call covers the rest.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Website Services',
      secondaryHref: '/services/websites',
    },
    seo: {
      title: 'Website Projects in Vancouver | Perseus Creative Studio',
      description:
        'Website design and development case studies from Vancouver — build decisions, redesign comparisons, and measured Core Web Vitals. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/websites`,
      ogImage: `${IMAGEKIT_BASE}/services-websites.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
    },
    faqs: [
      {
        question: 'What kinds of sites do you build?',
        answer:
          'Marketing sites, listing and service-area sites, and conversion-focused landing pages — on WordPress or a modern stack (Next.js/Node) depending on what the project needs. Performance, SEO-ready structure, and analytics are built in, not bolted on.',
      },
      {
        question: 'Are these real, live websites?',
        answer:
          'Yes — every project here is a site we designed and built for a real client, and each one links to the live build you can visit. We add measured performance detail to a project as the numbers come in, but the work itself is shipped, not mocked up.',
      },
      {
        question: 'Do you redesign existing sites, or only build from scratch?',
        answer:
          'Both. A large share of our work is redesigns where the before/after and the measured speed gains are the whole story — which is exactly what these case studies will document.',
      },
      {
        question: 'Will I be able to update the site myself?',
        answer:
          'Yes. We build on editable foundations and hand over with the access and a walkthrough so your team can manage day-to-day content, with ongoing support available whenever you’d rather we handle it.',
      },
      {
        question: 'Do you handle hosting, domains, and the technical setup?',
        answer:
          'Yes — we can manage hosting, DNS, SSL, and the deployment pipeline end-to-end, or hand the build to your existing infrastructure. Either way, you’re never left to wire up the technical layer alone.',
      },
      {
        question:
          'Is the site built for SEO and Core Web Vitals from the start?',
        answer:
          'Always. Semantic structure, fast loads, and clean metadata are part of the build, not an afterthought — which is exactly why these case studies will lead with measured Core Web Vitals once they’re live.',
      },
    ],
  },

  'digital-marketing': {
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    eyebrow: 'Selected work · SEO · Paid · Analytics',
    heroTitle: 'Campaigns with',
    heroTitleAccent: 'receipts.',
    description:
      'Search, paid media, and analytics engagements written up with the numbers attached — what ran, what changed, and what it returned. Case studies publish once results windows mature.',
    projects: DIGITAL_MARKETING_PROJECT_SUMMARIES,
    proof: { unit: 'Campaigns' },
    comingSoon: {
      headline: 'Numbers are still coming in.',
      body: 'Marketing case studies need a full results window before they’re worth your time — we publish measured outcomes, not launch announcements. Current engagements are mid-flight.',
      inProduction: [
        { industry: 'Home Services', stage: 'Results window maturing' },
        { industry: 'Real Estate', stage: 'Campaigns live' },
      ],
      serviceHref: '/services/digital-marketing',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Want results worth writing up?',
      description:
        'The digital marketing service page covers the levers we pull — SEO, paid channels, tracking — and what a measured engagement looks like.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Marketing Services',
      secondaryHref: '/services/digital-marketing',
    },
    seo: {
      title: 'Digital Marketing Projects | Perseus Creative Studio',
      description:
        'Digital marketing case studies from Vancouver — SEO, paid media, and analytics engagements documented with measured results. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/digital-marketing`,
      ogImage: `${IMAGEKIT_BASE}/services-marketing.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
    },
    faqs: [
      {
        question: 'Which channels do you actually run?',
        answer:
          'Search (SEO and Google Ads), paid social (Meta and LinkedIn), and the tracking and analytics layer underneath — set up so every dollar is attributable. We scope to the channels that fit your funnel, not a fixed package.',
      },
      {
        question: 'Why no case studies on this page yet?',
        answer:
          'Marketing case studies need a full results window before they mean anything — we publish measured outcomes, not launch announcements. Current engagements are still maturing their numbers.',
      },
      {
        question: 'How do you measure and report results?',
        answer:
          'Every engagement starts with proper tracking — conversions, call and lead attribution, and a reporting view you can actually read. These case studies will show the before/after on the same traffic, with the numbers attached.',
      },
      {
        question: 'Do we need a big ad budget to work with you?',
        answer:
          'No — we scope to your stage. What matters more than budget size is that the tracking is honest and the spend is pointed at the channels your buyers actually use.',
      },
      {
        question: 'How soon will we see results?',
        answer:
          'SEO compounds over months while paid channels can move within weeks — we set honest expectations per channel up front and report against them, rather than promising overnight wins.',
      },
      {
        question: 'Do you work with our existing analytics and ad accounts?',
        answer:
          'Yes — we’d rather build on accounts you own so the data and history stay yours. We audit what’s already there, fix the tracking, and take it from there.',
      },
    ],
  },

  social: {
    slug: 'social',
    title: 'Social Media',
    eyebrow: 'Selected work · Content · Strategy · Growth',
    heroTitle: 'Feeds that do',
    heroTitleAccent: 'the work.',
    description:
      'Social engagements documented feed-first — the content cadence, the creative, and the account growth across the engagement. Case studies publish as programs mature.',
    projects: SOCIAL_PROJECT_SUMMARIES,
    proof: { unit: 'Accounts' },
    comingSoon: {
      headline: 'Programs are mid-flight.',
      body: 'Social case studies are written up across a full engagement arc — strategy, cadence, growth — not a single viral week. Current programs are still accumulating their numbers.',
      inProduction: [
        { industry: 'Real Estate', stage: 'Reels program live' },
        { industry: 'Fitness', stage: 'Cadence ramping' },
      ],
      serviceHref: '/services/social',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Want a feed that earns attention?',
      description:
        'The social media service page covers how we plan, produce, and report — strategy through posting cadence.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Social Media Services',
      secondaryHref: '/services/social',
    },
    seo: {
      title: 'Social Media Projects | Perseus Creative Studio',
      description:
        'Social media case studies from Vancouver — content programs, posting cadence, and account growth documented across full engagements. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/social`,
      ogImage: `${IMAGEKIT_BASE}/services-social.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
    },
    faqs: [
      {
        question: 'What does a social engagement with you include?',
        answer:
          'Strategy, a content calendar, the creative (shot with the production team when needed), posting cadence, and reporting on growth — managed as a program across a full engagement, not a one-off burst.',
      },
      {
        question: 'Why are there no published case studies here yet?',
        answer:
          'Social case studies are written up across a full engagement arc — strategy, cadence, growth — not a single viral week. Current programs are still accumulating their numbers.',
      },
      {
        question: 'Which platforms do you manage?',
        answer:
          'The ones your audience is actually on — most often Instagram, TikTok, LinkedIn, and YouTube — with creative cut to fit each platform rather than the same post sprayed everywhere.',
      },
      {
        question: 'Do you create the content, or just schedule it?',
        answer:
          'We create it. Social plugs straight into the production team, so the feed is original photo and video built for the platform — not stock or reposts.',
      },
      {
        question: 'How often will you post?',
        answer:
          'Cadence is set by the strategy and your capacity to feed it — we commit to a calendar you can sustain and we can produce for, then report on what each format returns.',
      },
      {
        question: 'Do you handle community management and replies?',
        answer:
          'We can. Engagement and community management are available alongside the content so the account doesn’t go quiet between posts — scoped to how hands-on you want us to be.',
      },
    ],
  },

  branding: {
    slug: 'branding',
    title: 'Branding',
    eyebrow: 'Selected work · Identity · Strategy · Voice',
    heroTitle: 'Identities built',
    heroTitleAccent: 'to last.',
    description:
      'Brand engagements shown as delivered artifacts — strategy, identity systems, and the applications that carry them into the world. Case studies publish as identities launch.',
    projects: BRANDING_PROJECT_SUMMARIES,
    proof: { unit: 'Identities' },
    comingSoon: {
      headline: 'Identities in development.',
      body: 'Branding case studies publish when the identity is live in the world — signage up, site shipped, voice in use. Current engagements are in the design phase.',
      inProduction: [
        { industry: 'Marine Services', stage: 'Identity in design' },
        { industry: 'Hospitality', stage: 'Strategy phase' },
      ],
      serviceHref: '/services/branding',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Building a brand worth the name?',
      description:
        'The branding service page covers the full system — strategy, identity, messaging, and the guidelines that keep it coherent.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Branding Services',
      secondaryHref: '/services/branding',
    },
    seo: {
      title: 'Branding Projects | Perseus Creative Studio',
      description:
        'Branding case studies from Vancouver — strategy, identity systems, and brand applications documented as delivered artifacts. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/branding`,
      ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
    },
    faqs: [
      {
        question: 'What’s included in a branding engagement?',
        answer:
          'Brand strategy, the identity system (logo, type, color, and usage), and the core applications that carry it — delivered as a system your team and ours can build on, not a single logo file.',
      },
      {
        question: 'Why aren’t there case studies on this page yet?',
        answer:
          'Branding case studies publish when the identity is live in the world — signage up, site shipped, voice in use. Current engagements are still in the design phase.',
      },
      {
        question: 'Do you handle the rollout, or just the logo?',
        answer:
          'The rollout is the point. Identity work plugs into our websites, production, and social teams, so the brand ships consistently across every surface it touches.',
      },
      {
        question: 'We already have a logo — can you work with it?',
        answer:
          'Yes. Not every engagement is a full rebuild; we also evolve and systematize an existing mark into a complete identity when the foundation is worth keeping.',
      },
      {
        question: 'How long does a branding engagement take?',
        answer:
          'Strategy and identity work typically runs a few weeks to a couple of months depending on scope and rollout — we confirm the milestones in the proposal before we start.',
      },
      {
        question: 'Do you deliver brand guidelines we can hand to others?',
        answer:
          'Yes — every identity ships with usage guidelines so future designers, printers, and developers apply the brand consistently without guessing.',
      },
    ],
  },
};
