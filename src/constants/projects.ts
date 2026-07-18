// The projects category chrome — code-defined content for /projects and
// /projects/[category]: hero copy, coming-soon states, proof labels, FAQs,
// CTAs, and SEO blocks. The case-study cards and detail content themselves
// live in Postgres (clients / projects / project_media, migration 0007) and
// are read through the cached, tag-invalidated accessors in
// `@/lib/projectsStore` — edited via /admin, live without a redeploy.
//
// This registry's key order is the site-wide category ORDER (the hub wall,
// index chips, nav panel, and footer all derive from it). Types live in
// `src/components/Projects/types.ts`.

import { SITE_URL } from '@/constants';
import type { ProjectCategoryContent } from '@/components/Projects/types';

export const PROJECT_CATEGORIES: Record<string, ProjectCategoryContent> = {
  production: {
    slug: 'production',
    title: 'Production',
    eyebrow: 'Selected work · Video · Photo · Aerial',
    heroTitle: 'Shot, cut, and',
    heroTitleAccent: 'shipped.',
    description:
      'Listing films, build series, commercials, and facility tours produced end-to-end in Vancouver. Every project here is real client work — from the first site walk to final delivery.',
    proof: { unit: 'Productions', sectorsLabel: 'Sectors covered' },
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
      ogImage: `${SITE_URL}/images/categories/category-production.avif`,
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
      ogImage: `${SITE_URL}/images/categories/category-websites.avif`,
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
      ogImage: `${SITE_URL}/images/categories/category-digital-marketing.avif`,
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
      ogImage: `${SITE_URL}/images/categories/category-social.avif`,
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
      ogImage: `${SITE_URL}/images/categories/category-branding.avif`,
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
