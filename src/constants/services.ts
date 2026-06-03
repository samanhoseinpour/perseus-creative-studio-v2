// Service category content for /services/[category].
//
// One ServiceCategoryContent object per category, surfaced through the
// CATEGORIES lookup. The route renders every category from this data via the
// shared template (bento → stats → proof → FAQ → CTA). Adding a category =
// adding an object + a CATEGORIES entry; no route changes.
//
// NOTE: several stats figures and images are still drafts/placeholders — see
// the inline NOTE comments per category.

import type {
  ServiceCategoryContent,
  ProductionServiceContent,
} from '@/components/Services/types';
import { SITE_URL, IMAGEKIT_BASE } from '@/constants';

const productionCategory: ServiceCategoryContent = {
  slug: 'production',
  title: 'Production',
  eyebrow: 'Photo · Video · Aerial · 3D',
  positioning:
    'We produce content built for distribution — so a single shoot becomes a full asset library that works across your website, ads, and social.',
  heroTitle: 'Production that earns',
  heroTitleAccent: 'a second look.',
  description:
    'Cinematic video, editorial photography, aerial, and 3D — created by one senior team and engineered for every screen your brand shows up on.',
  featuredServiceSlug: 'videography',
  specLabel: 'Production disciplines, one senior team.',
  blogCategorySlug: 'videography-and-photography',
  marquee: ['Real Estate', 'Hospitality', 'Fitness', 'Marine & Yachts', 'Construction', 'Lifestyle', 'Automotive', 'Food & Beverage'],
  services: [
    {
      slug: 'videography',
      title: 'Videography',
      tagline: 'Cinematic commercials, brand films, and event coverage.',
      imageUrl: '/navbar-services-2.jpeg',
      imageAlt:
        'Cinema camera operator filming a brand commercial on a professional production set.',
      available: true,
      featured: true,
    },
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: false,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: false,
    },
    {
      slug: '2d-3d-models',
      title: '2D & 3D Models',
      tagline: 'Floor plans, 3D models, and rendered visualizations.',
      imageUrl: '/services-3Dmodel.jpeg',
      imageAlt: 'Rendered 3D architectural model of a modern residence.',
      available: false,
    },
    {
      slug: 'virtual-tours-matterport',
      title: 'Virtual Tours / Matterport',
      tagline: 'Immersive 360° walkthroughs and Matterport tours.',
      imageUrl: '/3Dmodel.jpg',
      imageAlt: 'Matterport 360-degree virtual tour interface of an interior.',
      available: false,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt:
        'Color grading suite with a film timeline on a calibrated monitor.',
      available: false,
    },
  ],
  // NOTE: confirm/replace these figures with your real numbers.
  stats: [
    {
      value: '8+',
      count: 8,
      suffix: '+',
      label: 'Years producing',
    },
    {
      value: '200+',
      count: 200,
      suffix: '+',
      label: 'Films delivered',
    },
    {
      value: '15+',
      count: 15,
      suffix: '+',
      label: 'Industries served',
    },
    {
      value: '3',
      count: 3,
      label: 'Formats per shoot',
    },
  ],
  faqs: [
    {
      question: 'What does a production engagement include?',
      answer:
        'Every project runs across three stages: pre-production (concept, scripting, shot list, scheduling, and locations), production (a senior crew shooting on cinema cameras with proper lighting and clean audio), and post-production (editing, color grading, sound design, and platform-ready exports). The exact mix — shoot days, crew size, and deliverables — is scoped in your proposal.',
    },
    {
      question: 'How long does a typical project take?',
      answer:
        'Most productions run a few weeks from kickoff to final delivery: roughly one to two weeks of planning, one or more shoot days, then a couple of weeks in post depending on the number of cuts and revision rounds. We confirm dated milestones in your proposal so the timeline is set before we roll.',
    },
    {
      question: 'Can one shoot cover multiple platforms?',
      answer:
        'Yes — we plan for it on the day. A single shoot becomes a library of assets: a hero 16:9 cut for your website and YouTube, plus 9:16 and 1:1 cutdowns for Instagram, TikTok, and paid ads, all color-matched and exported to spec.',
    },
    {
      question: 'Do you only work in Vancouver?',
      answer:
        'We’re based in Vancouver and shoot throughout the Lower Mainland and Sea-to-Sky, and we travel for projects further out. Tell us where you’re filming and we’ll scope crew, gear, and any travel or permits into the proposal.',
    },
    {
      question: 'How much does a production cost?',
      answer:
        'It depends on scope — shoot days, crew size, locations, travel, and the number of final deliverables all factor in. After a short scoping call we send a fixed quote, and if you have a set budget we’ll build the most effective production around it.',
    },
    {
      question: 'What do you need from us before the shoot?',
      answer:
        'A clear goal and audience, access to the locations or people being filmed, and any brand assets or references you have. We handle the rest — concept, shot list, scheduling, crew, gear, and permits.',
    },
    {
      question: 'Do we get the raw files, and who owns the footage?',
      answer:
        'You own the final approved deliverables outright. Raw footage and project files can be handed over per your agreement (often as an add-on), and any licensed elements like music stay under their original license.',
    },
    {
      question: 'Can you handle drone and aerial permits?',
      answer:
        'Yes. Our aerial work is flown by licensed drone operators, and we arrange the permits and airspace authorizations the location requires so the shoot stays compliant.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s plan your next shoot',
    description:
      'Tell us what you’re building and we’ll recommend the right production mix — and turn it into a content library that keeps working long after the shoot wraps.',
    primaryLabel: 'Book a Production Call',
    primaryHref: '/contact',
    secondaryLabel: 'View our reel',
    secondaryHref: '/projects',
  },
  seo: {
    title:
      'Production Services — Video, Photo, Aerial & 3D | Perseus Creative Studio',
    description:
      'Cinematic videography, photography, aerial, 3D, and post-production in Vancouver. One senior team producing content built for web, ads, and social.',
    canonicalPath: `${SITE_URL}/services/production`,
    ogImage: `${IMAGEKIT_BASE}/navbar-services-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const websitesCategory: ServiceCategoryContent = {
  slug: 'websites',
  title: 'Websites',
  eyebrow: 'Design · Development · Commerce',
  positioning:
    'We build websites as growth channels, not brochures — fast, search-ready, and designed to turn visitors into customers.',
  heroTitle: 'Websites that',
  heroTitleAccent: 'do the selling.',
  description:
    'Custom websites, landing pages, and online stores — designed for clarity, built on modern stacks, and engineered to convert and scale.',
  featuredServiceSlug: 'website-design',
  specLabel: 'Website services, one senior team.',
  blogCategorySlug: 'website',
  marquee: ['Next.js', 'WordPress', 'Webflow', 'Shopify', 'E-commerce', 'Landing Pages', 'SEO-ready', 'Core Web Vitals', 'Accessibility'],
  services: [
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Website Design.',
      available: false,
      featured: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Website Development.',
      available: false,
    },
    {
      slug: 'web-applications',
      title: 'Web Applications',
      tagline: 'Portals, dashboards, and booking systems built to scale.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Web Applications.',
      available: false,
    },
    {
      slug: 'website-redesign',
      title: 'Website Redesign',
      tagline: 'Rebuild or replatform an existing site without losing rankings.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Website Redesign.',
      available: false,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — E-commerce.',
      available: false,
    },
    {
      slug: 'landing-pages',
      title: 'Landing Pages',
      tagline: 'High-converting pages built around a single offer or campaign.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Landing Pages.',
      available: false,
    },
    {
      slug: 'website-maintenance',
      title: 'Website Maintenance',
      tagline: 'Updates, backups, security, and speed after launch.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Website Maintenance.',
      available: false,
    },
    {
      slug: 'performance-seo-audit',
      title: 'Performance & SEO Audit',
      tagline: 'Core Web Vitals, speed, and technical-SEO fixes.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Performance & SEO Audit.',
      available: false,
    },
  ],
  // NOTE: confirm/replace these figures with your real numbers.
  stats: [
    {
      value: '100+',
      count: 100,
      suffix: '+',
      label: 'Websites shipped',
    },
    {
      value: '90+',
      count: 90,
      suffix: '+',
      label: 'Lighthouse score',
    },
    {
      value: '100%',
      count: 100,
      suffix: '%',
      label: 'Custom builds',
    },
    {
      value: '24/7',
      count: 24,
      suffix: '/7',
      label: 'Care-plan support',
    },
  ],
  faqs: [
    {
      question: 'What platforms and tech stacks do you build on?',
      answer:
        'We build custom sites on modern stacks like Next.js and Node.js, and use WordPress when a CMS fits your team better. Every build is responsive, fast, and structured for SEO from the first line of code.',
    },
    {
      question: 'How long does a website take?',
      answer:
        'Most marketing sites take several weeks to a few months depending on page count, features, and integrations. Landing pages are faster; e-commerce and custom builds take longer. We confirm scope and dated milestones in your proposal before we start.',
    },
    {
      question: 'Will my site be fast and SEO-ready?',
      answer:
        'Yes — performance and search visibility are built in: clean markup, optimized images, sensible metadata, and Core Web Vitals in mind, so the site loads quickly and is easy for search engines to read and rank.',
    },
    {
      question: 'Do you offer ongoing maintenance after launch?',
      answer:
        'Yes. Our maintenance plans cover updates, backups, security, uptime monitoring, and small optimizations, so your site stays reliable, secure, and current long after launch.',
    },
    {
      question: 'How much does a website cost?',
      answer:
        'Pricing scales with page count, features, and integrations — a focused landing page sits at one end, a custom e-commerce build at the other. We scope your needs first and quote a fixed price before any work starts.',
    },
    {
      question: 'Will I be able to update the site myself after launch?',
      answer:
        'Yes. We build on a CMS suited to your team and walk you through editing pages, posts, and images. For changes you’d rather hand off, our maintenance plans cover them.',
    },
    {
      question: 'Can you redesign my existing site, or do I have to start over?',
      answer:
        'Either. We can refresh and rebuild on your current platform or migrate you to a faster modern stack — and we plan migrations carefully so you keep your content and search rankings.',
    },
    {
      question: 'Do you write the copy and provide images, or do I?',
      answer:
        'Both work. We can write conversion-focused copy and source or produce photography with our in-house team, or build around content you provide — we confirm who handles what in the proposal.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build a site that performs',
    description:
      'Tell us about your business and goals, and we’ll recommend the right build — design, development, and the structure to convert.',
    primaryLabel: 'Start a Website Project',
    primaryHref: '/contact',
    secondaryLabel: 'See our work',
    secondaryHref: '/projects',
  },
  seo: {
    title:
      'Website Design & Development in Vancouver | Perseus Creative Studio',
    description:
      'Custom website design and development in Vancouver — fast, SEO-ready sites, landing pages, and e-commerce built to convert. Modern stacks, one senior team.',
    canonicalPath: `${SITE_URL}/services/websites`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// DIGITAL MARKETING — third category. Images reuse the real Ads-section assets
// (icon-style; swap for photography later). Separate from `social`.
//
// DRAFT CONTENT: stats + FAQs are tangible placeholders to confirm. All
// services `available: false` (link to /contact) until detail pages exist.
// ─────────────────────────────────────────────────────────────────────────
const digitalMarketingCategory: ServiceCategoryContent = {
  slug: 'digital-marketing',
  title: 'Digital Marketing',
  eyebrow: 'SEO · Paid Ads · Analytics',
  positioning:
    'We turn ad spend and search visibility into measurable pipeline — every campaign tracked, tested, and optimized against revenue, not vanity metrics.',
  heroTitle: 'Marketing that',
  heroTitleAccent: 'moves the numbers.',
  description:
    'SEO, paid ads, analytics, and conversion optimization — data-driven campaigns built to grow qualified traffic, leads, and sales.',
  featuredServiceSlug: 'seo',
  specLabel: 'Growth channels, one accountable team.',
  blogCategorySlug: 'digital-marketing',
  marquee: ['SEO', 'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'GA4', 'Retargeting', 'Conversion Optimization', 'Local SEO', 'Analytics'],
  services: [
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: false,
      featured: true,
    },
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: false,
    },
    {
      slug: 'meta-ads',
      title: 'Meta Ads',
      tagline: 'Facebook & Instagram ads that find and convert your audience.',
      imageUrl: '/services-meta.png',
      imageAlt:
        'Meta Ads Manager interface for Facebook and Instagram campaigns.',
      available: false,
    },
    {
      slug: 'linkedin-ads',
      title: 'LinkedIn Ads',
      tagline: 'B2B campaigns that reach decision-makers by role and industry.',
      imageUrl: '/services-linkedin.png',
      imageAlt: 'LinkedIn Ads campaign targeting business decision-makers.',
      available: false,
    },
    {
      slug: 'tracking-analytics',
      title: 'Tracking & Analytics',
      tagline: 'GA4, GTM, Semrush & Clarity — measurement you can trust.',
      imageUrl: '/services-ga4.png',
      imageAlt: 'Google Analytics 4 dashboard with conversion tracking.',
      available: false,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: false,
    },
  ],
  // NOTE: confirm/replace these figures with your real numbers.
  stats: [
    {
      value: '3×',
      count: 3,
      suffix: '×',
      label: 'Avg. ROAS',
    },
    {
      value: '40%',
      count: 40,
      suffix: '%',
      label: 'Lower cost / lead',
    },
    {
      value: '5+',
      count: 5,
      suffix: '+',
      label: 'Platforms managed',
    },
    {
      value: '100%',
      count: 100,
      suffix: '%',
      label: 'Campaigns tracked',
    },
  ],
  faqs: [
    {
      question: 'How soon will I see results?',
      answer:
        'Paid ads can drive traffic and leads within days of launch; SEO compounds over months. We set realistic expectations per channel and report on leading indicators early, so you’re never left guessing.',
    },
    {
      question: 'How much should I budget for ads?',
      answer:
        'It depends on your market, goals, and channels. We recommend a media budget based on your targets and keep management fees transparent — so you always know what goes to the platforms versus to us.',
    },
    {
      question: 'How do you measure success?',
      answer:
        'Against revenue, not vanity metrics. We set up GA4, GTM, and conversion tracking from the start, then report on cost per lead, conversion rate, and return on ad spend — the numbers that actually move your business.',
    },
    {
      question: 'Do I need SEO and ads, or just one?',
      answer:
        'They work best together: ads capture demand now while SEO builds durable, lower-cost traffic over time. We’ll recommend the mix that fits your timeline and budget.',
    },
    {
      question: 'Is there a long-term contract, or can I cancel?',
      answer:
        'We work in monthly engagements with a short initial period so campaigns have time to gather data and perform. After that you can adjust or cancel with notice — no multi-year lock-in.',
    },
    {
      question: 'Do you need access to my ad and analytics accounts, and do I keep ownership?',
      answer:
        'We work inside your own Google, Meta, and analytics accounts (or set them up in your name), so you always own the accounts, data, and history — even if we part ways.',
    },
    {
      question: 'What’s included in your management fee?',
      answer:
        'Strategy, campaign setup and optimization, audience and creative testing, conversion tracking, and clear monthly reporting. Ad spend is paid directly to the platforms and kept separate from our fee.',
    },
    {
      question: 'Can you take over campaigns another agency set up?',
      answer:
        'Yes. We start with an audit of your existing accounts, keep what’s working, fix what isn’t, and lay out the plan before making changes — we don’t blow up your history on day one.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s grow your pipeline',
    description:
      'Tell us your goals and we’ll map the right channels, budget, and tracking to turn marketing spend into measurable results.',
    primaryLabel: 'Book a Strategy Call',
    primaryHref: '/contact',
    secondaryLabel: 'See our work',
    secondaryHref: '/projects',
  },
  seo: {
    title:
      'Digital Marketing in Vancouver — SEO & Paid Ads | Perseus Creative Studio',
    description:
      'Data-driven digital marketing in Vancouver: SEO, Google Ads, Meta & LinkedIn Ads, analytics, and conversion optimization built to grow leads and sales.',
    canonicalPath: `${SITE_URL}/services/digital-marketing`,
    ogImage: `${IMAGEKIT_BASE}/navbar-contact.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SOCIAL — fourth category. Organic social only (paid social lives in
// digital-marketing). Calendar/scheduling folded into Social Media Management.
//
// DRAFT CONTENT: stats + FAQs are tangible placeholders to confirm. Images use
// real ImageKit assets where available, /logo-black.png otherwise. All services
// `available: false` (link to /contact) until detail pages exist.
// ─────────────────────────────────────────────────────────────────────────
const socialCategory: ServiceCategoryContent = {
  slug: 'social',
  title: 'Social Media',
  eyebrow: 'Strategy · Content · Community',
  positioning:
    'We run social like a channel, not a chore — a clear strategy, a consistent content calendar, and reporting that ties posts back to real business goals.',
  heroTitle: 'Social that builds',
  heroTitleAccent: 'an audience.',
  description:
    'Strategy, management, creator collaborations, and reporting — organic social built to grow a consistent, engaged following.',
  featuredServiceSlug: 'social-media-management',
  specLabel: 'Social services, one senior team.',
  blogCategorySlug: 'social',
  marquee: ['Instagram', 'TikTok', 'LinkedIn', 'Reels', 'Content Calendar', 'Community', 'Creators', 'Short-form Video'],
  services: [
    {
      slug: 'social-media-management',
      title: 'Social Media Management',
      tagline:
        'Content calendar, posting, captions, and community — accounts kept active and on-brand.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media content planned and scheduled across platforms.',
      available: false,
      featured: true,
    },
    {
      slug: 'social-strategy',
      title: 'Social Strategy',
      tagline: 'Content pillars and a plan that ties posts to business goals.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Social Strategy.',
      available: false,
    },
    {
      slug: 'influencer-collaborations',
      title: 'Influencer / Creator Collaborations',
      tagline: 'Sourcing creators, briefs, deliverables, and repurposed content.',
      imageUrl: '/services-contentcreation.jpeg',
      imageAlt: 'Creator filming sponsored content for a brand collaboration.',
      available: false,
    },
    {
      slug: 'reporting-insights',
      title: 'Reporting & Insights',
      tagline: 'Monthly reporting on reach, engagement, and what to do next.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Reporting & Insights.',
      available: false,
    },
  ],
  // NOTE: confirm/replace these figures with your real numbers.
  stats: [
    {
      value: '4',
      count: 4,
      label: 'Posts per week',
    },
    {
      value: '3×',
      count: 3,
      suffix: '×',
      label: 'Engagement lift',
    },
    {
      value: '5+',
      count: 5,
      suffix: '+',
      label: 'Platforms',
    },
    {
      value: '100%',
      count: 100,
      suffix: '%',
      label: 'Posts approved',
    },
  ],
  faqs: [
    {
      question: 'Which platforms do you manage?',
      answer:
        'The ones where your audience actually is — most often Instagram, TikTok, LinkedIn, and Facebook. We recommend a focused set rather than spreading thin across every network.',
    },
    {
      question: 'Do you create the content too?',
      answer:
        'Yes. We plan the calendar, write captions, and produce or coordinate the visuals — including creator collaborations when that’s the right fit — so your feed stays consistent without extra work on your side.',
    },
    {
      question: 'How is this different from paid social ads?',
      answer:
        'This is organic social — growing an engaged audience through content and community. Paid social (boosting and ad campaigns) lives under our digital-marketing services; the two work well together but are scoped separately.',
    },
    {
      question: 'How do you measure social results?',
      answer:
        'With monthly reporting on the metrics that matter: reach, engagement, follower growth, and the actions content drives — plus a clear read on what’s working and what we’ll adjust next.',
    },
    {
      question: 'Do you post for us, or do we need to give you account access?',
      answer:
        'We can publish directly using secure access to your accounts, or hand you scheduled posts to approve and publish — whichever fits your comfort level. You always retain ownership of your accounts.',
    },
    {
      question: 'Who approves posts before they go live?',
      answer:
        'You do. Everything runs through a shared content calendar with a clear approval step, so nothing publishes without your sign-off.',
    },
    {
      question: 'Do you handle comments and DMs?',
      answer:
        'Community management — replying to comments and messages and flagging anything that needs your attention — is available as part of management. We agree on response scope and tone up front.',
    },
    {
      question: 'What if we don’t have photos or content to start with?',
      answer:
        'That’s common. We can plan a content shoot with our production team, work with design and stock where it fits, or coordinate creators — so a thin content library isn’t a blocker.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s grow your social presence',
    description:
      'Tell us about your brand and goals, and we’ll map a content strategy and calendar that keeps your accounts active and growing.',
    primaryLabel: 'Book a Social Call',
    primaryHref: '/contact',
    secondaryLabel: 'See our work',
    secondaryHref: '/projects',
  },
  seo: {
    title:
      'Social Media Management in Vancouver | Perseus Creative Studio',
    description:
      'Organic social media management in Vancouver: strategy, content, creator collaborations, and reporting built to grow an engaged, on-brand following.',
    canonicalPath: `${SITE_URL}/services/social`,
    ogImage: `${IMAGEKIT_BASE}/services-smm.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// BRANDING — fifth category. Section images are external (cosmos.so) so the
// cells use /logo-black.png placeholders until real ImageKit assets exist.
//
// DRAFT CONTENT: stats + FAQs are tangible placeholders to confirm. All
// services `available: false` (link to /contact) until detail pages exist.
// ─────────────────────────────────────────────────────────────────────────
const brandingCategory: ServiceCategoryContent = {
  slug: 'branding',
  title: 'Branding',
  eyebrow: 'Strategy · Identity · Voice',
  positioning:
    'We build brands that are easy to recognize and hard to forget — a clear position, a confident visual identity, and a voice that sounds like you everywhere.',
  heroTitle: 'A brand people',
  heroTitleAccent: 'remember.',
  description:
    'Strategy, identity, messaging, and creative direction — a cohesive brand system that makes you look credible and consistent across every touchpoint.',
  featuredServiceSlug: 'brand-strategy-positioning',
  specLabel: 'Branding services, one senior team.',
  // No branding blog category yet — the journal section hides until one exists.
  blogCategorySlug: undefined,
  marquee: ['Logo Design', 'Visual Identity', 'Brand Strategy', 'Messaging', 'Guidelines', 'Typography', 'Color Systems', 'Naming'],
  services: [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      tagline: 'Define what you do, who it’s for, and why customers choose you.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Brand Strategy & Positioning.',
      available: false,
      featured: true,
    },
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline: 'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Logo & Visual Identity.',
      available: false,
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      tagline: 'Tagline, tone of voice, and the words that actually sell.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Brand Messaging & Copywriting.',
      available: false,
    },
    {
      slug: 'creative-direction',
      title: 'Creative Direction',
      tagline: 'A creative north-star that keeps every channel consistent.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Creative Direction.',
      available: false,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/logo-black.png',
      imageAlt: 'Placeholder — Brand Guidelines.',
      available: false,
    },
  ],
  // NOTE: confirm/replace these figures with your real numbers.
  stats: [
    {
      value: '50+',
      count: 50,
      suffix: '+',
      label: 'Identities designed',
    },
    {
      value: '100%',
      count: 100,
      suffix: '%',
      label: 'Custom, no templates',
    },
    {
      value: '3',
      count: 3,
      label: 'Directions explored',
    },
    {
      value: '360°',
      count: 360,
      suffix: '°',
      label: 'Complete system',
    },
  ],
  faqs: [
    {
      question: 'What’s the difference between a logo and a brand?',
      answer:
        'A logo is one piece; a brand is the whole system — positioning, visual identity, messaging, and the consistent feel across every touchpoint. We build the system, not just the mark.',
    },
    {
      question: 'How long does a branding project take?',
      answer:
        'Most brand projects run a few weeks depending on scope — from strategy and positioning through identity design and guidelines. We confirm milestones in your proposal before we start.',
    },
    {
      question: 'Do I get brand guidelines I can hand to my team?',
      answer:
        'Yes. We deliver clear guidelines covering logo usage, color, typography, and tone of voice, so anyone on your team — or a future vendor — can keep the brand consistent.',
    },
    {
      question: 'Can you refresh an existing brand instead of starting over?',
      answer:
        'Absolutely. We can evolve what’s working and sharpen what isn’t — a refresh that modernizes your identity without throwing away the equity you’ve already built.',
    },
    {
      question: 'How much does branding cost?',
      answer:
        'It depends on scope — a logo and core identity is one tier; full strategy, messaging, and guidelines is another. We scope what you actually need and quote a fixed price, so there are no surprises.',
    },
    {
      question: 'How many logo concepts and revisions do we get?',
      answer:
        'We present a focused set of distinct directions rather than a pile of throwaways, then refine the chosen route across defined revision rounds. The exact number is set in your proposal.',
    },
    {
      question: 'What files do we receive at the end?',
      answer:
        'Production-ready logo files in vector and raster formats (SVG, PNG, JPG) for print, web, and social, plus your color, type, and usage guidelines — everything your team or vendors need.',
    },
    {
      question: 'Can you also build the website and collateral once the brand is done?',
      answer:
        'Yes — that’s the advantage of one studio. The same team can carry your new identity straight into your website, social, and content, so everything stays consistent.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build a brand that lasts',
    description:
      'Tell us where your brand is today and where you want it to go, and we’ll map the strategy, identity, and voice to get there.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'See our work',
    secondaryHref: '/projects',
  },
  seo: {
    title: 'Branding & Visual Identity in Vancouver | Perseus Creative Studio',
    description:
      'Brand strategy, logo and visual identity, messaging, and guidelines in Vancouver — a cohesive brand system that makes your business look credible and consistent.',
    canonicalPath: `${SITE_URL}/services/branding`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

export const CATEGORIES: Record<string, ServiceCategoryContent> = {
  production: productionCategory,
  websites: websitesCategory,
  'digital-marketing': digitalMarketingCategory,
  social: socialCategory,
  branding: brandingCategory,
};

// ─────────────────────────────────────────────────────────────────────────
// PRODUCTION SERVICE DETAIL CONTENT
//
// Powers /services/[category]/[service]. PRODUCTION_SERVICES gates which
// production service slugs resolve to a detail page; the template is selected
// by category slug in the route.
// ─────────────────────────────────────────────────────────────────────────
const videography: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: 'videography',
  title: 'Videography',
  eyebrow: 'Production · Videography',
  heroHeadline: 'Video that moves',
  heroHeadlineAccent: 'people to act.',
  heroSubtitle:
    'Cinematic commercials, brand films, and event coverage — produced end to end and cut for every platform, from your hero website reel to vertical social.',
  heroImageUrl: '/navbar-services-2.jpeg',
  heroImageAlt:
    'Perseus Creative Studio cinematographer operating a cinema camera on a production set.',
  intro: {
    heading: 'Story first. Then the gear.',
    body: 'Great video isn’t about the most expensive camera — it’s about a clear idea, the right shots, and an edit that holds attention. We plan every shoot around what your audience needs to feel and do, then deliver footage engineered to convert across web, ads, and social.',
    highlights: [
      'Senior director on every project',
      'Cinema-grade cameras, lighting & audio',
      'Multi-format delivery (16:9, 9:16, 1:1)',
      'Licensed music & sound design included',
    ],
  },
  showcase: {
    heading: 'Work that does the talking',
    description:
      'A selection of brand films and commercials produced across real estate, construction, fitness, and lifestyle.',
    items: [
      { youtubeId: 'rayEIwFozcY', title: 'Cinematic Luxury Home Tour — Real Estate' },
      { youtubeId: 'YSSWOh-tGDY', title: 'Vela Homes — Construction Story' },
      { youtubeId: 'P2vkIx5royE', title: 'Taurus Fitness Club — Brand Commercial' },
      { youtubeId: 'kAGF5m3L8AU', title: 'Ignition Marine — Boats & Yachts Showcase' },
    ],
  },
  process: {
    heading: 'From brief to final cut',
    description:
      'A structured production process so you always know what’s happening, what’s next, and where things stand.',
    steps: [
      {
        step: '01',
        title: 'Pre-Production',
        description:
          'Concept, scripting, shot list, scheduling, and locations — the plan that makes the shoot day efficient.',
      },
      {
        step: '02',
        title: 'Production',
        description:
          'A senior crew captures everything on cinema cameras with proper lighting and clean, broadcast-quality audio.',
      },
      {
        step: '03',
        title: 'Post-Production',
        description:
          'Editing, color grading, motion graphics, and sound design shape the raw footage into the final story.',
      },
      {
        step: '04',
        title: 'Delivery',
        description:
          'Platform-ready exports — horizontal, vertical, and square — plus the source files per your agreement.',
      },
    ],
  },
  included: {
    heading: 'What every videography engagement includes',
    description:
      'Scoped to your goals, but these come standard on every production.',
    items: [
      {
        title: 'Creative direction & scripting',
        description: 'A clear concept and shot plan aligned to your goals before we roll.',
      },
      {
        title: 'Professional crew & equipment',
        description: 'Cinema cameras, lighting, stabilization, and dedicated audio capture.',
      },
      {
        title: 'Editing & color grading',
        description: 'A polished cut with a consistent, brand-right color treatment.',
      },
      {
        title: 'Sound design & licensed music',
        description: 'Cleaned dialogue, mixed audio, and properly licensed tracks.',
      },
      {
        title: 'Multi-platform deliverables',
        description: 'Cutdowns for web, YouTube, and vertical social from one shoot.',
      },
      {
        title: 'Revisions & handoff',
        description: 'A structured revision round and an organized final delivery.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands invest in video',
    description:
      'Video is the fastest way to build trust and reduce decision friction — here’s the impact it tends to drive.',
    stats: [
      { value: '3×', label: 'More engagement than static content on most social platforms.' },
      { value: '80%', label: 'Of buyers say video gives them more confidence in a purchase.' },
      { value: '1 shoot', label: 'Becomes a full library of web, ad, and social assets.' },
    ],
  },
  faqs: [
    {
      question: 'How long does a video project take?',
      answer:
        'Most productions run a few weeks from planning through filming and post-production. We confirm exact milestones in your proposal so you know the timeline before we start.',
    },
    {
      question: 'What impacts the cost of a video?',
      answer:
        'Cost depends on scope across three stages: pre-production (concept, scripting, scheduling), production (filming days, crew, equipment, locations, travel), and post-production (editing, motion graphics, sound design, color grading, and the number of final deliverables).',
    },
    {
      question: 'Do you deliver vertical and social cutdowns?',
      answer:
        'Yes. We deliver in multiple formats from a single shoot — horizontal for websites and YouTube, plus vertical and square cutdowns built for Instagram, TikTok, and ads.',
    },
    {
      question: 'Who owns the final footage?',
      answer:
        'Ownership is defined in your proposal. In most cases you own the final approved deliverables, while access to raw source files is handled per the agreed scope. Any third-party licensed elements (like music) remain under their original license terms.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Ready to put your brand in motion?',
    description:
      'Book a production call and we’ll map the right approach for your story, your platforms, and your budget.',
    primaryLabel: 'Book a Production Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt: 'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: false,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: false,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt: 'Color grading suite with a film timeline on a calibrated monitor.',
      available: false,
    },
  ],
  seo: {
    title: 'Videography Services in Vancouver — Brand Films & Commercials | Perseus',
    description:
      'Cinematic videography in Vancouver: brand films, commercials, and event coverage produced end to end and cut for web, ads, and social.',
    canonicalPath: `${SITE_URL}/services/production/videography`,
    ogImage: `${IMAGEKIT_BASE}/navbar-services-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Production services with a detail page. Template switch is keyed on the
// category; the per-category map gates which service slugs resolve.
export const PRODUCTION_SERVICES: Record<string, ProductionServiceContent> = {
  videography,
};
