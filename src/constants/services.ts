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
  WebsiteServiceContent,
  MarketingServiceContent,
  SocialServiceContent,
  BrandingServiceContent,
  ServiceDetailContent,
} from '@/components/Services/types';
import { SITE_URL, IMAGEKIT_BASE } from '@/constants';
import { PRODUCTION_TESTIMONIALS } from './testimonials';

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
  servicesIntro:
    'From cinematic video and photography to aerial, 3D, and immersive virtual tours, every discipline is run in-house by one senior crew. Open a service to see how we shoot it, what you walk away with, and how it travels across your channels.',
  blogCategorySlug: 'videography-and-photography',
  cardImageUrl: '/navbar-services-2.jpeg',
  process: {
    heading: 'From brief to final delivery',
    description:
      'A structured production process so you always know what we’re capturing, how it’ll look, and when you’ll have it.',
    steps: [
      {
        step: '01',
        title: 'Discovery & brief',
        description:
          'We align on goals, audience, references, and exactly what each asset needs to do.',
      },
      {
        step: '02',
        title: 'Pre-production',
        description:
          'Concept, shot list, scheduling, crew, and locations — the plan that makes the shoot day efficient.',
      },
      {
        step: '03',
        title: 'Production',
        description:
          'A senior crew captures it on cinema-grade cameras with proper lighting and clean audio.',
      },
      {
        step: '04',
        title: 'Post & delivery',
        description:
          'Editing, color, sound design, and platform-ready exports for every channel you show up on.',
      },
    ],
  },
  whyChooseUs: {
    heading: 'The difference is in',
    titleAccent: 'what you walk away with.',
    description:
      'Most production wraps at the final cut. Ours is built so a single shoot keeps working across every channel for months.',
    rows: [
      {
        aspect: 'Deliverable',
        usual: 'One hero edit',
        perseus: 'A full, multi-format asset library',
      },
      {
        aspect: 'Crew',
        usual: 'A rotating freelancer or two',
        perseus: 'A senior crew who own the outcome',
      },
      {
        aspect: 'Process',
        usual: 'Show up and wing it',
        perseus: 'A structured, dated production plan',
      },
      {
        aspect: 'Partnership',
        usual: 'Booked shoot by shoot',
        perseus: 'A long-term creative partner',
      },
    ],
  },
  fitFor: {
    heading: 'Built for brands that',
    titleAccent: 'live or die on how they look.',
    description:
      'If your business sells through visuals, production earns its keep. A few of the industries we shoot for most.',
    segments: [
      {
        name: 'Real Estate',
        deliverable:
          'Listing films, photography, and 3D virtual tours that sell the space before a viewing.',
      },
      {
        name: 'Hospitality',
        deliverable:
          'Property reels, room stills, and atmosphere films for hotels, venues, and restaurants.',
      },
      {
        name: 'Fitness & Wellness',
        deliverable:
          'Class footage, brand films, and social cut-downs that capture the energy.',
      },
      {
        name: 'Marine & Yachts',
        deliverable:
          'Aerial walkthroughs and cinematic charters that show scale and craftsmanship.',
      },
      {
        name: 'Automotive',
        deliverable:
          'Showroom and rolling shots that make each model the hero of the frame.',
      },
      {
        name: 'Food & Beverage',
        deliverable:
          'Appetising product, menu, and lifestyle content built for menus and feeds.',
      },
    ],
  },
  marquee: [
    'Real Estate',
    'Hospitality',
    'Fitness',
    'Marine & Yachts',
    'Construction',
    'Lifestyle',
    'Automotive',
    'Food & Beverage',
  ],
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
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
    {
      slug: '2d-3d-models',
      title: '2D & 3D Models',
      tagline: 'Floor plans, 3D models, and rendered visualizations.',
      imageUrl: '/services-3Dmodel.jpeg',
      imageAlt: 'Rendered 3D architectural model of a modern residence.',
      available: true,
    },
    {
      slug: 'virtual-tours-matterport',
      title: 'Virtual Tours / Matterport',
      tagline: 'Immersive 360° walkthroughs and Matterport tours.',
      imageUrl: '/3Dmodel.jpg',
      imageAlt: 'Matterport 360-degree virtual tour interface of an interior.',
      available: true,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt:
        'Color grading suite with a film timeline on a calibrated monitor.',
      available: true,
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
  servicesIntro:
    'Design, development, e-commerce, redesigns, landing pages, and ongoing care — the full lifecycle of a fast, search-ready site under one roof. Choose a service to see the stack we build on, how we work, and what launch day actually looks like.',
  blogCategorySlug: 'website',
  cardImageUrl: '/navbar-website-2.jpeg',
  process: {
    heading: 'From brief to launch',
    description:
      'A clear path from strategy to a live site, so you always know what stage we’re at and what’s next.',
    steps: [
      {
        step: '01',
        title: 'Discovery & strategy',
        description:
          'Goals, audience, sitemap, and the conversion path the site has to support.',
      },
      {
        step: '02',
        title: 'Design',
        description:
          'Wireframes to polished, on-brand, conversion-focused UI you sign off before we build.',
      },
      {
        step: '03',
        title: 'Build',
        description:
          'Fast, secure, SEO-ready development on a modern stack — responsive and easy to update.',
      },
      {
        step: '04',
        title: 'Launch & support',
        description:
          'QA, launch, analytics, and ongoing maintenance so the site stays sharp after go-live.',
      },
    ],
  },
  whyChooseUs: {
    heading: 'Built to perform,',
    titleAccent: 'not just to launch.',
    description:
      'Plenty of sites look fine and load slow. We build for speed, search, and conversion from the first line of code.',
    rows: [
      {
        aspect: 'Performance',
        usual: 'Heavy templates that crawl',
        perseus: 'Hand-built, 90+ Lighthouse scores',
      },
      {
        aspect: 'Ownership',
        usual: 'Locked into a page builder',
        perseus: 'Clean code and a CMS you control',
      },
      {
        aspect: 'SEO',
        usual: 'Bolted on afterwards',
        perseus: 'Structured and technical from day one',
      },
      {
        aspect: 'Support',
        usual: 'Handed over and gone',
        perseus: 'An ongoing partner after launch',
      },
    ],
  },
  fitFor: {
    heading: 'Built for teams that',
    titleAccent: 'need a site that performs.',
    description:
      'When the website is doing real work — not just existing — these are the businesses we build for most.',
    segments: [
      {
        name: 'Startups & SaaS',
        deliverable:
          'Fast marketing sites and product pages that turn launches into sign-ups.',
      },
      {
        name: 'Hospitality',
        deliverable:
          'Booking-ready sites for hotels, venues, and restaurants that convert browsers.',
      },
      {
        name: 'Real Estate',
        deliverable:
          'Listing and development sites with fast galleries and built-in lead capture.',
      },
      {
        name: 'E-commerce & Retail',
        deliverable:
          'Storefronts built for speed, search, and a checkout that does not leak sales.',
      },
      {
        name: 'Professional Services',
        deliverable:
          'Credible, SEO-ready sites that turn search traffic into qualified enquiries.',
      },
      {
        name: 'Creators & Founders',
        deliverable:
          'Personal-brand sites and portfolios that look the part and load instantly.',
      },
    ],
  },
  marquee: [
    'Next.js',
    'WordPress',
    'Webflow',
    'Shopify',
    'E-commerce',
    'Landing Pages',
    'SEO-ready',
    'Core Web Vitals',
    'Accessibility',
  ],
  services: [
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
      featured: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'web-applications',
      title: 'Web Applications',
      tagline: 'Portals, dashboards, and booking systems built to scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A web application dashboard built on a modern stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-redesign',
      title: 'Website Redesign',
      tagline:
        'Rebuild or replatform an existing site without losing rankings.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A website redesign rebuilt on a modern, fast stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'E-commerce storefront engineered to convert by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'landing-pages',
      title: 'Landing Pages',
      tagline: 'High-converting pages built around a single offer or campaign.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A high-converting campaign landing page built by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-maintenance',
      title: 'Website Maintenance',
      tagline: 'Updates, backups, security, and speed after launch.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Ongoing website maintenance and care by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'performance-seo-audit',
      title: 'Performance & SEO Audit',
      tagline: 'Core Web Vitals, speed, and technical-SEO fixes.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A performance and technical-SEO audit of a website by Perseus Creative Studio.',
      available: true,
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
      question:
        'Can you redesign my existing site, or do I have to start over?',
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
  servicesIntro:
    'Search, paid media, and social advertising run by one accountable team and measured against revenue rather than vanity metrics. Open a channel to see how we audit, launch, and report — and where it fits in the wider funnel.',
  blogCategorySlug: 'digital-marketing',
  cardImageUrl: '/navbar-contact.jpeg',
  process: {
    heading: 'From audit to compounding growth',
    description:
      'A measurable, accountable process — every lead tracked, every channel tuned to what actually converts.',
    steps: [
      {
        step: '01',
        title: 'Audit & strategy',
        description:
          'Baseline metrics, opportunities, and a channel plan tied to real business goals.',
      },
      {
        step: '02',
        title: 'Setup & tracking',
        description:
          'GA4, GTM, and conversion tracking so every result is measured and trustworthy.',
      },
      {
        step: '03',
        title: 'Launch & optimize',
        description:
          'Campaigns and SEO go live, then get tested and tuned against the numbers each week.',
      },
      {
        step: '04',
        title: 'Report & scale',
        description:
          'Clear monthly reporting, then we double down on the channels that are working.',
      },
    ],
  },
  whyChooseUs: {
    heading: 'Growth you can',
    titleAccent: 'actually account for.',
    description:
      'Plenty of agencies report on clicks and impressions. We tie the work to pipeline, revenue, and decisions you can defend.',
    rows: [
      {
        aspect: 'Metrics',
        usual: 'Vanity clicks and impressions',
        perseus: 'Revenue, leads, and cost per result',
      },
      {
        aspect: 'Reporting',
        usual: 'A monthly PDF nobody reads',
        perseus: 'A live dashboard, explained plainly',
      },
      {
        aspect: 'Strategy',
        usual: 'One channel on repeat',
        perseus: 'The channel mix that fits your funnel',
      },
      {
        aspect: 'Spend',
        usual: 'Budget into a black box',
        perseus: 'Every dollar traced to an outcome',
      },
    ],
  },
  fitFor: {
    heading: 'Built for businesses that',
    titleAccent: 'want growth they can measure.',
    description:
      'If every dollar of spend has to trace back to a result, these are the businesses we grow most.',
    segments: [
      {
        name: 'E-commerce',
        deliverable:
          'Paid and organic that scale return on ad spend, not just traffic.',
      },
      {
        name: 'Local & Service',
        deliverable:
          'Local SEO and ads that fill the calendar with nearby, ready-to-buy customers.',
      },
      {
        name: 'B2B & SaaS',
        deliverable:
          'Search and demand-gen tuned to qualified pipeline and cost per lead.',
      },
      {
        name: 'Hospitality',
        deliverable:
          'Campaigns that drive direct bookings and cut reliance on third-party platforms.',
      },
      {
        name: 'Real Estate',
        deliverable:
          'Lead-gen funnels that put listings in front of the right buyers.',
      },
      {
        name: 'Professional Services',
        deliverable:
          'Authority content and ads that turn search intent into booked consults.',
      },
    ],
  },
  marquee: [
    'SEO',
    'Google Ads',
    'Meta Ads',
    'LinkedIn Ads',
    'GA4',
    'Retargeting',
    'Conversion Optimization',
    'Local SEO',
    'Analytics',
  ],
  services: [
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: true,
      featured: true,
    },
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'meta-ads',
      title: 'Meta Ads',
      tagline: 'Facebook & Instagram ads that find and convert your audience.',
      imageUrl: '/services-meta.png',
      imageAlt:
        'Meta Ads Manager interface for Facebook and Instagram campaigns.',
      available: true,
    },
    {
      slug: 'linkedin-ads',
      title: 'LinkedIn Ads',
      tagline: 'B2B campaigns that reach decision-makers by role and industry.',
      imageUrl: '/services-linkedin.png',
      imageAlt: 'LinkedIn Ads campaign targeting business decision-makers.',
      available: true,
    },
    {
      slug: 'tracking-analytics',
      title: 'Tracking & Analytics',
      tagline: 'GA4, GTM, Semrush & Clarity — measurement you can trust.',
      imageUrl: '/services-ga4.png',
      imageAlt: 'Google Analytics 4 dashboard with conversion tracking.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
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
      question:
        'Do you need access to my ad and analytics accounts, and do I keep ownership?',
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
  servicesIntro:
    'Strategy, content production, community management, and reporting — everything it takes to run a feed people actually choose to follow. Step into a service to see how we plan the calendar, produce the content, and measure what it returns.',
  blogCategorySlug: 'social',
  cardImageUrl: '/services-smm.jpeg',
  process: {
    heading: 'From strategy to steady growth',
    description:
      'A consistent monthly rhythm so your channels stay active, on-brand, and pointed at business results.',
    steps: [
      {
        step: '01',
        title: 'Strategy',
        description:
          'Content pillars, tone, and a plan that ties every post back to your goals.',
      },
      {
        step: '02',
        title: 'Content',
        description:
          'A monthly calendar of posts, captions, and creative — planned and approved ahead of time.',
      },
      {
        step: '03',
        title: 'Manage',
        description:
          'Publishing, scheduling, community, and engagement handled across every platform.',
      },
      {
        step: '04',
        title: 'Report',
        description:
          'Monthly insights on reach, engagement, and conversions — with clear next moves.',
      },
    ],
  },
  whyChooseUs: {
    heading: 'A feed with',
    titleAccent: 'a point of view.',
    description:
      'Most social is posted to stay busy. We run it like a publication — a clear voice, a real calendar, and content built to be watched.',
    rows: [
      {
        aspect: 'Content',
        usual: 'Reposts and stock filler',
        perseus: 'Original, on-brand content we produce',
      },
      {
        aspect: 'Cadence',
        usual: 'Whenever someone remembers',
        perseus: 'A planned, consistent calendar',
      },
      {
        aspect: 'Voice',
        usual: 'Generic captions',
        perseus: 'A distinct voice that sounds like you',
      },
      {
        aspect: 'Growth',
        usual: 'Chasing follower counts',
        perseus: 'Engagement and an audience that converts',
      },
    ],
  },
  fitFor: {
    heading: 'Built for brands that',
    titleAccent: 'want a feed worth following.',
    description:
      'Social moves the needle hardest for businesses people love to watch. The ones we run feeds for most.',
    segments: [
      {
        name: 'Hospitality & F&B',
        deliverable:
          'Mouth-watering content and stories that turn followers into reservations.',
      },
      {
        name: 'Fitness & Wellness',
        deliverable:
          'Reels and community management that build a loyal, growing audience.',
      },
      {
        name: 'Retail & E-commerce',
        deliverable:
          'Product-led content calendars that drive saves, shares, and sales.',
      },
      {
        name: 'Founders & Personal',
        deliverable:
          'A consistent voice and presence that grows authority and inbound interest.',
      },
      {
        name: 'Real Estate',
        deliverable:
          'Listing reels and market content that keep you top of mind locally.',
      },
      {
        name: 'Beauty & Lifestyle',
        deliverable:
          'Trend-aware, on-brand content built for discovery and engagement.',
      },
    ],
  },
  marquee: [
    'Instagram',
    'TikTok',
    'LinkedIn',
    'Reels',
    'Content Calendar',
    'Community',
    'Creators',
    'Short-form Video',
  ],
  services: [
    {
      slug: 'social-media-management',
      title: 'Social Media Management',
      tagline:
        'Content calendar, posting, captions, and community — accounts kept active and on-brand.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media content planned and scheduled across platforms.',
      available: true,
      featured: true,
    },
    {
      slug: 'social-strategy',
      title: 'Social Strategy',
      tagline: 'Content pillars and a plan that ties posts to business goals.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'A social media content strategy mapped into pillars and a plan.',
      available: true,
    },
    {
      slug: 'influencer-collaborations',
      title: 'Influencer / Creator Collaborations',
      tagline:
        'Sourcing creators, briefs, deliverables, and repurposed content.',
      imageUrl: '/services-contentcreation.jpeg',
      imageAlt: 'Creator filming sponsored content for a brand collaboration.',
      available: true,
    },
    {
      slug: 'reporting-insights',
      title: 'Reporting & Insights',
      tagline: 'Monthly reporting on reach, engagement, and what to do next.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'A social media reporting dashboard showing reach and engagement.',
      available: true,
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
    title: 'Social Media Management in Vancouver | Perseus Creative Studio',
    description:
      'Organic social media management in Vancouver: strategy, content, creator collaborations, and reporting built to grow an engaged, on-brand following.',
    canonicalPath: `${SITE_URL}/services/social`,
    ogImage: `${IMAGEKIT_BASE}/services-smm.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

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
  servicesIntro:
    'Strategy, identity systems, naming, and guidelines that keep a brand recognizable everywhere it appears. Choose a service to see how we research the positioning, design the identity, and document a brand built to last.',
  // No branding blog category yet — the journal section hides until one exists.
  blogCategorySlug: undefined,
  cardImageUrl: '/services-branding.jpeg',
  process: {
    heading: 'From discovery to a brand system',
    description:
      'A deliberate process that turns who you are into a clear, consistent brand your whole team can use.',
    steps: [
      {
        step: '01',
        title: 'Discovery',
        description:
          'Positioning, audience, and what genuinely sets you apart from the alternatives.',
      },
      {
        step: '02',
        title: 'Strategy',
        description:
          'Messaging, tone of voice, and the story your brand tells across every touchpoint.',
      },
      {
        step: '03',
        title: 'Identity',
        description:
          'Logo, color, typography, and the full visual system that makes you recognizable.',
      },
      {
        step: '04',
        title: 'Guidelines',
        description:
          'A clear brand playbook so everything stays consistent across team, vendors, and channels.',
      },
    ],
  },
  whyChooseUs: {
    heading: 'An identity that',
    titleAccent: 'holds up everywhere.',
    description:
      'A logo is the easy part. We build a complete system — voice, type, color, and rules — so your brand stays sharp wherever it shows up.',
    rows: [
      {
        aspect: 'Scope',
        usual: 'A logo and a couple of colors',
        perseus: 'A full identity system and guidelines',
      },
      {
        aspect: 'Foundation',
        usual: 'Straight to visuals',
        perseus: 'Strategy and positioning first',
      },
      {
        aspect: 'Consistency',
        usual: 'Falls apart across channels',
        perseus: 'Rules that keep every touchpoint on-brand',
      },
      {
        aspect: 'Application',
        usual: 'Files dumped in a folder',
        perseus: 'Brought to life across real assets',
      },
    ],
  },
  fitFor: {
    heading: 'Built for ventures that',
    titleAccent: 'want to be remembered.',
    description:
      'Branding pays off most at the moments that define how a business is seen. When we are usually brought in.',
    segments: [
      {
        name: 'New Ventures',
        deliverable:
          'A complete identity to launch with confidence and consistency from day one.',
      },
      {
        name: 'Rebrands',
        deliverable:
          'A sharper position and look for businesses that have outgrown their old identity.',
      },
      {
        name: 'Hospitality & F&B',
        deliverable:
          'Names, identities, and menus that make a venue feel like a destination.',
      },
      {
        name: 'Real Estate & Property',
        deliverable:
          'Development and project brands that justify a premium.',
      },
      {
        name: 'Professional Services',
        deliverable:
          'Trustworthy, distinctive identities in categories that all tend to look the same.',
      },
      {
        name: 'Product & Consumer',
        deliverable:
          'Shelf-ready brand systems built to stand out and scale.',
      },
    ],
  },
  marquee: [
    'Logo Design',
    'Visual Identity',
    'Brand Strategy',
    'Messaging',
    'Guidelines',
    'Typography',
    'Color Systems',
    'Naming',
  ],
  services: [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      tagline:
        'Define what you do, who it’s for, and why customers choose you.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Brand strategy and identity work laid out on a desk by Perseus Creative Studio.',
      available: true,
      featured: true,
    },
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline:
        'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'A visual identity system — logo, color, and typography — by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      tagline: 'Tagline, tone of voice, and the words that actually sell.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand messaging and copywriting — tagline, voice, and key lines.',
      available: true,
    },
    {
      slug: 'creative-direction',
      title: 'Creative Direction',
      tagline: 'A creative north-star that keeps every channel consistent.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Creative direction — a single visual idea applied consistently across channels.',
      available: true,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand guidelines document covering logo, color, and type.',
      available: true,
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
      question:
        'Can you also build the website and collateral once the brand is done?',
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
  // No `showcase` — we don't surface a project reel here yet, so the hero
  // shows the still image and the reel wall is skipped (the template guards it).
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
        description:
          'A clear concept and shot plan aligned to your goals before we roll.',
      },
      {
        title: 'Professional crew & equipment',
        description:
          'Cinema cameras, lighting, stabilization, and dedicated audio capture.',
      },
      {
        title: 'Editing & color grading',
        description:
          'A polished cut with a consistent, brand-right color treatment.',
      },
      {
        title: 'Sound design & licensed music',
        description:
          'Cleaned dialogue, mixed audio, and properly licensed tracks.',
      },
      {
        title: 'Multi-platform deliverables',
        description:
          'Cutdowns for web, YouTube, and vertical social from one shoot.',
      },
      {
        title: 'Revisions & handoff',
        description:
          'A structured revision round and an organized final delivery.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands invest in video',
    description:
      'Video is the fastest way to build trust and reduce decision friction — here’s the impact it tends to drive.',
    stats: [
      {
        value: '3×',
        label: 'More engagement than static content on most social platforms.',
      },
      {
        value: '80%',
        label: 'Of buyers say video gives them more confidence in a purchase.',
      },
      {
        value: '1 shoot',
        label: 'Becomes a full library of web, ad, and social assets.',
      },
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
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt:
        'Color grading suite with a film timeline on a calibrated monitor.',
      available: true,
    },
  ],
  formats: {
    heading: 'One shoot. Every format.',
    description:
      'We frame and protect for multiple aspect ratios on set, so a single production becomes a hero film for your site plus vertical and square cutdowns for social and ads — all color-matched.',
    imageUrl: '/navbar-services-2.jpeg',
    imageAlt:
      'A single brand film reframed for web, vertical social, and square ad placements.',
    ratios: [
      { ratio: '16:9', label: 'Web & YouTube', aspect: '16/9' },
      { ratio: '9:16', label: 'Reels, TikTok & Stories', aspect: '9/16' },
      { ratio: '1:1', label: 'Feed & paid ads', aspect: '1/1' },
    ],
  },
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Every production is quoted to scope after a short call — never off a rate card. These are the factors that move it.',
    factors: [
      {
        title: 'Shoot days & crew',
        description:
          'How many days on location and the size of the crew the shoot calls for.',
      },
      {
        title: 'Locations & travel',
        description:
          'Number of locations, permits, and any travel beyond the Lower Mainland.',
      },
      {
        title: 'Creative scope',
        description:
          'Scripting, talent, styling, and the level of art direction involved.',
      },
      {
        title: 'Deliverables',
        description:
          'The number of final cuts and platform formats you need from the shoot.',
      },
    ],
    note: 'Tell us your goal and budget and we’ll build the most effective production around it, then send a fixed quote — no hourly surprises.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title:
      'Videography Services in Vancouver — Brand Films & Commercials | Perseus',
    description:
      'Cinematic videography in Vancouver: brand films, commercials, and event coverage produced end to end and cut for web, ads, and social.',
    canonicalPath: `${SITE_URL}/services/production/videography`,
    ogImage: `${IMAGEKIT_BASE}/navbar-services-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Photography — a stills service: no video `showcase`/reel, so the template
// renders the still hero (no showreel card) and skips the reel wall.
const photography: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: 'photography',
  title: 'Photography',
  eyebrow: 'Production · Photography',
  heroHeadline: 'Photography that makes',
  heroHeadlineAccent: 'people look twice.',
  heroSubtitle:
    'Editorial product, lifestyle, and brand photography — styled, lit, and retouched to make your business look its best everywhere it shows up.',
  heroImageUrl: '/services-photography.jpeg',
  heroImageAlt:
    'Perseus Creative Studio photographer capturing a styled lifestyle scene under studio lighting.',
  intro: {
    heading: 'Light, styling, and intent.',
    body: 'Great photography isn’t luck — it’s a planned shot list, considered styling, and lighting that flatters the subject. We shoot for how the images will actually be used, then retouch with a consistent, brand-right finish so everything looks like it belongs together.',
    highlights: [
      'Art direction & styling on every shoot',
      'Studio and on-location lighting',
      'Consistent color & retouching',
      'Web, print & social-ready exports',
    ],
  },
  contactSheet: {
    heading: 'We shoot the options, then edit to the keepers.',
    description:
      'Every shoot returns a contact sheet — the full take, then the selects we retouch and deliver. You see the range, and the call behind the final frames.',
    filmLabel: 'PERSEUS · ROLL 01',
    selects: [1, 4, 6],
    shots: [
      { imageUrl: '/services-photography.jpeg', imageAlt: 'Styled lifestyle frame.' },
      { imageUrl: '/services-contentcreation.jpeg', imageAlt: 'Selected product frame.' },
      { imageUrl: '/services-branding.jpeg', imageAlt: 'Brand detail frame.' },
      { imageUrl: '/services-smm.jpeg', imageAlt: 'Social-ready frame.' },
      { imageUrl: '/navbar-services-2.jpeg', imageAlt: 'On-set selected frame.' },
      { imageUrl: '/post-production.png', imageAlt: 'Retouching reference frame.' },
      { imageUrl: '/services-aerialproduction.jpeg', imageAlt: 'Environment selected frame.' },
      { imageUrl: '/services-photography.jpeg', imageAlt: 'Alternate styling frame.' },
    ],
  },
  process: {
    heading: 'From shot list to final gallery',
    description:
      'A structured shoot so you know exactly what we’re capturing, how it’ll look, and when you’ll have it.',
    steps: [
      {
        step: '01',
        title: 'Pre-Shoot',
        description:
          'Concept, shot list, styling, props, and location or studio booking — the plan that makes the day efficient.',
      },
      {
        step: '02',
        title: 'The Shoot',
        description:
          'A senior photographer captures every angle with proper lighting, composition, and on-set art direction.',
      },
      {
        step: '03',
        title: 'Selection & Retouching',
        description:
          'We curate the strongest frames, then color-correct and retouch to a clean, consistent finish.',
      },
      {
        step: '04',
        title: 'Delivery',
        description:
          'High-resolution and web-optimized exports, cropped and sized for the platforms you’ll use them on.',
      },
    ],
  },
  included: {
    heading: 'What every photography engagement includes',
    description:
      'Scoped to your goals, but these come standard on every shoot.',
    items: [
      {
        title: 'Creative direction & shot planning',
        description:
          'A clear shot list and visual direction aligned to how the images will be used.',
      },
      {
        title: 'Professional lighting & equipment',
        description:
          'Studio strobes or natural-light setups, lenses, and grip for any subject.',
      },
      {
        title: 'Art direction & styling',
        description:
          'On-set styling and composition so every frame is intentional and on-brand.',
      },
      {
        title: 'Retouching & color grading',
        description:
          'A consistent, polished finish across the full set, not just the hero shots.',
      },
      {
        title: 'Multi-format deliverables',
        description:
          'High-res for print plus optimized crops for web, social, and ads from one shoot.',
      },
      {
        title: 'Revisions & handoff',
        description:
          'A structured revision round and an organized, clearly named final gallery.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands invest in photography',
    description:
      'Strong images shape first impressions and reduce buying friction — here’s the impact they tend to drive.',
    stats: [
      {
        value: '50ms',
        label:
          'Is all it takes for someone to form a first impression of your brand.',
      },
      {
        value: '3×',
        label:
          'More engagement on listings and posts that use professional photography.',
      },
      {
        value: '1 shoot',
        label: 'Becomes a full library of web, print, and social-ready images.',
      },
    ],
  },
  faqs: [
    {
      question: 'What types of photography do you shoot?',
      answer:
        'Product, lifestyle, brand, food and beverage, real estate and interiors, headshots, and event coverage. If you’re not sure what you need, we’ll recommend the right approach for how the images will be used.',
    },
    {
      question: 'Studio or on-location?',
      answer:
        'Both. We shoot in a controlled studio when you need clean, consistent product images, and on-location when context and atmosphere matter — we’ll advise which fits your goals and budget.',
    },
    {
      question: 'How many final images do we get?',
      answer:
        'It depends on the shoot’s scope, but we agree on a deliverable count up front and curate the strongest frames. Additional retouched selects can be added if you need more.',
    },
    {
      question: 'Is retouching included?',
      answer:
        'Yes. Color correction and standard retouching are included on every selected image. Heavier compositing or product clean-up can be scoped as an add-on.',
    },
    {
      question: 'How long until we receive the photos?',
      answer:
        'Most galleries are delivered within one to two weeks of the shoot, depending on the number of images and the level of retouching. Rush delivery is available on request.',
    },
    {
      question: 'Who owns the images, and how can we use them?',
      answer:
        'You receive a usage license for the final delivered images covering your web, social, print, and advertising needs. The exact terms — including any model or property releases — are confirmed in your proposal.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s plan your shoot',
    description:
      'Tell us what you need photographed and how you’ll use it, and we’ll scope the right shoot — and turn it into a library of images that keep working.',
    primaryLabel: 'Book a Photography Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: 'videography',
      title: 'Videography',
      tagline: 'Cinematic commercials, brand films, and event coverage.',
      imageUrl: '/navbar-services-2.jpeg',
      imageAlt:
        'Cinema camera operator filming a brand commercial on a professional production set.',
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt:
        'Color grading suite with a film timeline on a calibrated monitor.',
      available: true,
    },
  ],
  formats: {
    heading: 'One shoot. Every placement.',
    description:
      'We shoot and retouch with the final placements in mind, so the same set works cropped for your website, a print piece, and a square social post — without a re-shoot.',
    imageUrl: '/services-photography.jpeg',
    imageAlt:
      'A single photograph cropped for web, social feed, and print placements.',
    ratios: [
      { ratio: '3:2', label: 'Web & hero', aspect: '3/2' },
      { ratio: '4:5', label: 'Feed & print', aspect: '4/5' },
      { ratio: '1:1', label: 'Social & listings', aspect: '1/1' },
    ],
  },
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Shoots are quoted to scope after a short call. These are the factors that move it.',
    factors: [
      {
        title: 'Shoot length & setups',
        description:
          'Half- or full-day, and how many distinct setups or products we cover.',
      },
      {
        title: 'Studio or location',
        description: 'A controlled studio versus on-location, plus any travel.',
      },
      {
        title: 'Styling & art direction',
        description:
          'Props, set styling, and talent or models when the concept calls for them.',
      },
      {
        title: 'Final image count',
        description:
          'How many fully retouched, delivery-ready images you need.',
      },
    ],
    note: 'Share how you’ll use the images and we’ll scope the right shoot, then send a fixed quote.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title:
      'Photography Services in Vancouver — Product, Lifestyle & Brand | Perseus',
    description:
      'High-end photography in Vancouver: product, lifestyle, and brand photography — styled, lit, and retouched for web, print, ads, and social.',
    canonicalPath: `${SITE_URL}/services/production/photography`,
    ogImage: `${IMAGEKIT_BASE}/services-photography.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Aerial Production — drone stills AND video, so it carries a video `showcase`.
const aerialProduction: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: 'aerial-production',
  title: 'Aerial Production',
  eyebrow: 'Production · Aerial',
  heroHeadline: 'Aerial views that',
  heroHeadlineAccent: 'change the whole story.',
  heroSubtitle:
    'Licensed drone photo and video — sweeping establishing shots, property flyovers, and dynamic aerials that give your brand a perspective the ground can’t.',
  heroImageUrl: '/services-aerialproduction.jpeg',
  heroImageAlt:
    'Aerial drone shot of a coastal property at golden hour captured by Perseus Creative Studio.',
  intro: {
    heading: 'Altitude, with intent.',
    body: 'Aerial isn’t just a higher camera — it’s scouting the location, checking the airspace, and planning moves that actually serve the story. Our flights are run by licensed pilots and captured in high resolution, so a single session gives you cinematic video and gallery-ready stills.',
    highlights: [
      'Transport Canada–licensed RPAS pilots',
      'Cinematic 4K / 6K aerial video',
      'High-resolution aerial stills',
      'Permits & airspace handled for you',
    ],
  },
  // No `showcase` — aerial reels will live in the (separate) Projects feature.
  flightPath: {
    heading: 'Every flight is planned before we leave the ground.',
    description:
      'A mapped route, set altitudes, and the moves that serve the story — so the shoot day is safe, legal, and efficient, and one flight returns a full library of angles.',
    imageUrl: '/services-aerialproduction.jpeg',
    imageAlt:
      'Aerial flight plan drawn over a coastal property captured by Perseus Creative Studio.',
    path: 'M120 520 C 260 470, 330 360, 430 330 C 560 292, 600 300, 680 300 C 770 300, 820 230, 860 140',
    waypoints: [
      { x: 120, y: 520, label: 'Launch & systems check', altitude: '0 m' },
      { x: 430, y: 330, label: 'Ascent — establishing wide', altitude: '60 m' },
      { x: 680, y: 300, label: 'Orbit — property reveal', altitude: '120 m' },
      { x: 860, y: 140, label: 'Top-down — context shot', altitude: '150 m' },
    ],
    telemetry: ['4K / 6K capture', 'RPAS licensed', '~12 min flight', 'Golden hour'],
  },
  process: {
    heading: 'From flight plan to final cut',
    description:
      'A compliant, structured flight so the shoot day is safe, legal, and efficient.',
    steps: [
      {
        step: '01',
        title: 'Flight Planning',
        description:
          'Location scout, airspace check, and any permits or authorizations the site requires.',
      },
      {
        step: '02',
        title: 'The Flight',
        description:
          'A licensed pilot captures cinematic video and high-resolution stills in the right light.',
      },
      {
        step: '03',
        title: 'Post-Production',
        description:
          'Editing, color grading, and stitched panoramas shape the footage into the final story.',
      },
      {
        step: '04',
        title: 'Delivery',
        description:
          'Platform-ready video plus high-res aerial photos, exported to the specs you need.',
      },
    ],
  },
  included: {
    heading: 'What every aerial engagement includes',
    description:
      'Scoped to your goals, but these come standard on every flight.',
    items: [
      {
        title: 'Flight planning & permits',
        description:
          'Airspace checks and the authorizations your location requires, handled for you.',
      },
      {
        title: 'Licensed RPAS pilot',
        description:
          'Every flight is flown by a certified, insured drone operator.',
      },
      {
        title: '4K / 6K aerial video',
        description:
          'Smooth, cinematic moves captured for web, ads, and social.',
      },
      {
        title: 'High-resolution aerial photography',
        description:
          'Gallery-ready stills from the same session — no second booking.',
      },
      {
        title: 'Editing & color grading',
        description:
          'A polished cut and a consistent, brand-right color treatment.',
      },
      {
        title: 'Multi-format deliverables',
        description:
          'Horizontal, vertical, and square exports from one flight.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands add aerial',
    description:
      'A single aerial shot reframes a property, a venue, or a project — here’s the impact it tends to drive.',
    stats: [
      {
        value: '68%',
        label:
          'Of buyers say aerial views make them more likely to choose a listing.',
      },
      {
        value: '3×',
        label:
          'More attention on content that opens with a striking aerial shot.',
      },
      {
        value: '1 flight',
        label: 'Becomes a library of aerial video and high-res stills.',
      },
    ],
  },
  faqs: [
    {
      question: 'Are your drone operations licensed and insured?',
      answer:
        'Yes. Our aerial work is flown by Transport Canada–certified RPAS pilots and is fully insured, so every flight stays compliant with Canadian drone regulations.',
    },
    {
      question: 'Can you fly anywhere?',
      answer:
        'Most locations, yes — but controlled airspace (near airports, for example) and certain venues need authorization. We check the airspace and arrange the permits a site requires before the shoot, and we’ll flag early if a location isn’t flyable.',
    },
    {
      question: 'Do you capture video, photos, or both?',
      answer:
        'Both, usually in the same session. A single flight can deliver cinematic 4K/6K video and high-resolution stills, so you get a full library without booking twice.',
    },
    {
      question: 'What about weather?',
      answer:
        'Drones can’t fly safely in rain or high wind, so we keep a weather hold on the schedule and reschedule when conditions don’t cooperate — golden-hour light is usually worth the wait.',
    },
    {
      question: 'What drives the cost of an aerial shoot?',
      answer:
        'Location and airspace complexity, permits, flight time, the number of deliverables, and whether it’s a standalone flight or part of a larger production all factor in. We send a fixed quote after a short scoping call.',
    },
    {
      question: 'Who owns the footage?',
      answer:
        'You own the final approved deliverables. Raw files can be handed over per your agreement, and any licensed elements like music stay under their original license.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s get you in the air',
    description:
      'Tell us about your location and goals, and we’ll plan a compliant flight that turns into a library of aerial video and stills.',
    primaryLabel: 'Book an Aerial Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: 'videography',
      title: 'Videography',
      tagline: 'Cinematic commercials, brand films, and event coverage.',
      imageUrl: '/navbar-services-2.jpeg',
      imageAlt:
        'Cinema camera operator filming a brand commercial on a professional production set.',
      available: true,
    },
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: true,
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      tagline: 'Editing, color grading, and sound design.',
      imageUrl: '/post-production.png',
      imageAlt:
        'Color grading suite with a film timeline on a calibrated monitor.',
      available: true,
    },
  ],
  formats: {
    heading: 'One flight. Every format.',
    description:
      'A single flight delivers cinematic aerial video reframed for web and vertical social, plus high-resolution stills — all color-matched to the rest of your footage.',
    imageUrl: '/services-aerialproduction.jpeg',
    imageAlt:
      'A single aerial shot reframed for web video, vertical social, and stills.',
    ratios: [
      { ratio: '16:9', label: 'Web & YouTube', aspect: '16/9' },
      { ratio: '9:16', label: 'Reels & Stories', aspect: '9/16' },
      { ratio: '1:1', label: 'Feed & ads', aspect: '1/1' },
    ],
  },
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Aerial work is quoted to scope after a short call. These are the factors that move it.',
    factors: [
      {
        title: 'Location & airspace',
        description:
          'Site complexity and whether the airspace needs special authorization.',
      },
      {
        title: 'Permits',
        description:
          'Any permits or clearances the location or controlled airspace requires.',
      },
      {
        title: 'Flight time & deliverables',
        description:
          'How much footage and how many final stills and cuts you need.',
      },
      {
        title: 'Standalone or add-on',
        description:
          'A dedicated flight versus aerial folded into a larger production.',
      },
    ],
    note: 'Tell us the location and goal and we’ll plan a compliant flight, then send a fixed quote.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title:
      'Aerial Drone Photography & Video in Vancouver | Perseus Creative Studio',
    description:
      'Licensed aerial drone photography and video in Vancouver: cinematic flyovers, property aerials, and high-res stills — permits and airspace handled.',
    canonicalPath: `${SITE_URL}/services/production/aerial-production`,
    ogImage: `${IMAGEKIT_BASE}/services-aerialproduction.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Post-Production — a finishing craft service. The finished reels live on
// Videography, so this omits the video `showcase` (still hero, no reel wall)
// and leans on the process/included sections.
const postProduction: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: 'post-production',
  title: 'Post-Production',
  eyebrow: 'Production · Post-Production',
  heroHeadline: 'The edit is where',
  heroHeadlineAccent: 'the story gets made.',
  heroSubtitle:
    'Editing, color grading, sound design, and finishing — we shape raw footage into a polished, platform-ready cut, whether we shot it or you did.',
  heroImageUrl: '/post-production.png',
  heroImageAlt:
    'Color grading suite with a film timeline on a calibrated monitor at Perseus Creative Studio.',
  intro: {
    heading: 'Footage is raw material. The edit is the film.',
    body: 'Pacing, color, and sound are what turn clips into something people actually watch to the end. Our editors shape the story, grade for a consistent brand-right look, and mix clean audio — and we’re happy to finish footage you shot yourself, not just our own.',
    highlights: [
      'Senior editor on every project',
      'Professional color grading',
      'Sound design & full audio mix',
      'We finish footage you shot too',
    ],
  },
  grade: {
    heading: 'Same footage. A completely different feeling.',
    description:
      'Color is where a clip becomes cinematic. Drag to compare the flat, straight-out-of-camera frame against the final graded look — consistent, brand-right, and made to hold attention.',
    before: {
      imageUrl: '/services-aerialproduction.jpeg',
      alt: 'Flat, ungraded footage straight out of camera.',
    },
    after: {
      imageUrl: '/services-aerialproduction.jpeg',
      alt: 'The same shot after professional color grading.',
    },
    degradeBefore: true,
    note: 'Representative comparison — the “before” shows an ungraded frame; every grade is shaped to your brand.',
  },
  process: {
    heading: 'From rushes to final master',
    description:
      'A clear post workflow so you always know what stage your edit is at and what’s next.',
    steps: [
      {
        step: '01',
        title: 'Assembly & Story',
        description:
          'We organize the footage, build a rough cut, and lock the structure and narrative.',
      },
      {
        step: '02',
        title: 'Editorial',
        description:
          'Fine cut, pacing, motion graphics, and titles bring the story into focus.',
      },
      {
        step: '03',
        title: 'Color Grading',
        description:
          'Balancing and a consistent look across every shot for a polished, brand-right feel.',
      },
      {
        step: '04',
        title: 'Sound & Finishing',
        description:
          'Sound design, audio mix, and final master and exports for each platform.',
      },
    ],
  },
  included: {
    heading: 'What every post-production engagement includes',
    description:
      'Scoped to your project, but these come standard on every edit.',
    items: [
      {
        title: 'Editing & story structure',
        description:
          'A cut built around a clear narrative and the action you want viewers to take.',
      },
      {
        title: 'Color correction & grading',
        description:
          'Balanced, consistent color and a treatment that matches your brand.',
      },
      {
        title: 'Sound design & audio mix',
        description:
          'Cleaned dialogue, sound design, and a balanced final mix.',
      },
      {
        title: 'Motion graphics & titles',
        description: 'Lower-thirds, captions, and simple animated graphics.',
      },
      {
        title: 'Licensed music',
        description: 'Properly licensed tracks that fit the tone and the edit.',
      },
      {
        title: 'Multi-platform exports',
        description:
          'Horizontal, vertical, and square masters from a single cut.',
      },
    ],
  },
  outcomes: {
    heading: 'Why the edit matters',
    description:
      'Post is where attention is won or lost — here’s the impact a strong edit tends to drive.',
    stats: [
      {
        value: '2×',
        label:
          'A sharper edit can roughly double watch-time versus a rough cut.',
      },
      {
        value: '100%',
        label: 'Color-matched and audio-leveled across every deliverable.',
      },
      {
        value: '1 cut',
        label: 'Becomes web, vertical, and square versions for every platform.',
      },
    ],
  },
  faqs: [
    {
      question: 'Can you edit footage we shot ourselves?',
      answer:
        'Absolutely. We regularly finish footage clients capture on their own — you hand over the files and a brief, and we handle editing, color, sound, and exports.',
    },
    {
      question: 'Do you do color grading and sound, or just editing?',
      answer:
        'All of it. Editing, color correction and grading, sound design, and the final audio mix are part of our post workflow, so the cut is genuinely finished — not just assembled.',
    },
    {
      question: 'What formats do you deliver?',
      answer:
        'Whatever you need — a horizontal master for web and YouTube, plus vertical and square cutdowns for Instagram, TikTok, and ads, all from the same edit.',
    },
    {
      question: 'How many revisions are included?',
      answer:
        'We work in defined revision rounds so feedback stays focused and the project moves forward. The exact number is set in your proposal; additional rounds can be added if needed.',
    },
    {
      question: 'Do you provide the music and handle licensing?',
      answer:
        'Yes. We source properly licensed music that fits the edit, and any licensed elements stay under their original license terms — so your video is clear to use.',
    },
    {
      question: 'What’s the turnaround on an edit?',
      answer:
        'It depends on length, complexity, and revision rounds, but most edits are delivered within one to two weeks. We confirm dated milestones in your proposal before we start.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s finish your footage',
    description:
      'Send us your footage and goals, and we’ll shape it into a polished, platform-ready cut — graded, mixed, and exported for every screen.',
    primaryLabel: 'Book a Post-Production Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: 'videography',
      title: 'Videography',
      tagline: 'Cinematic commercials, brand films, and event coverage.',
      imageUrl: '/navbar-services-2.jpeg',
      imageAlt:
        'Cinema camera operator filming a brand commercial on a professional production set.',
      available: true,
    },
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
  ],
  formats: {
    heading: 'One edit. Every format.',
    description:
      'From one locked edit we master a horizontal version for web and YouTube plus vertical and square cutdowns for social and ads — graded and audio-leveled to match.',
    imageUrl: '/post-production.png',
    imageAlt:
      'A single edit mastered for web, vertical social, and square ad formats.',
    ratios: [
      { ratio: '16:9', label: 'Web & YouTube', aspect: '16/9' },
      { ratio: '9:16', label: 'Reels & Stories', aspect: '9/16' },
      { ratio: '1:1', label: 'Feed & ads', aspect: '1/1' },
    ],
  },
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Edits are quoted to scope after a short call. These are the factors that move it.',
    factors: [
      {
        title: 'Length & complexity',
        description:
          'Runtime, number of cuts, and how much footage we’re working from.',
      },
      {
        title: 'Motion & graphics',
        description:
          'Titles, lower-thirds, and any animated graphics the edit needs.',
      },
      {
        title: 'Sound & music',
        description: 'Sound design, mixing, and licensed music selection.',
      },
      {
        title: 'Revision rounds',
        description: 'How many rounds of feedback are built into the timeline.',
      },
    ],
    note: 'Send us your footage and goal and we’ll scope the edit, then send a fixed quote.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title:
      'Video Editing, Color Grading & Post-Production in Vancouver | Perseus',
    description:
      'Professional video post-production in Vancouver: editing, color grading, sound design, and finishing for web, ads, and social — including footage you shot.',
    canonicalPath: `${SITE_URL}/services/production/post-production`,
    ogImage: `${IMAGEKIT_BASE}/post-production.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// 2D & 3D Models — visualization service (renders / floor plans). No video
// `showcase`, so the template renders the still hero and skips the reel wall.
const models2d3d: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: '2d-3d-models',
  title: '2D & 3D Models',
  eyebrow: 'Production · 2D & 3D',
  heroHeadline: 'See it before',
  heroHeadlineAccent: 'it’s built.',
  heroSubtitle:
    'Floor plans, 3D models, and photorealistic renders — visualize a space or product before it exists, so you can sell it, plan it, and get sign-off with confidence.',
  heroImageUrl: '/services-3Dmodel.jpeg',
  heroImageAlt:
    'Rendered 3D architectural model of a modern residence by Perseus Creative Studio.',
  intro: {
    heading: 'Design made tangible.',
    body: 'A render turns an idea into something people can actually picture — and decide on. We build accurate 2D plans and photorealistic 3D models so clients, buyers, and stakeholders can see the finished result long before construction or manufacturing begins.',
    highlights: [
      '2D floor plans & site plans',
      'Photorealistic 3D renders',
      'Interior & exterior visualization',
      'Revisions until it’s right',
    ],
  },
  turntable: {
    heading: 'See it from every angle — before it exists.',
    description:
      'A photoreal model you can inspect, not just look at. Drag to orbit the render and judge form, materials, and proportion from any side.',
    imageUrl: '/services-3Dmodel.jpeg',
    imageAlt: 'A photorealistic 3D render by Perseus Creative Studio.',
    chips: ['Photoreal materials', '4K render', 'Revisions until right'],
  },
  process: {
    heading: 'From plans to photoreal',
    description:
      'A structured visualization workflow so the result matches the real thing.',
    steps: [
      {
        step: '01',
        title: 'Brief & References',
        description:
          'Plans, dimensions, materials, and references — everything we need to build accurately.',
      },
      {
        step: '02',
        title: 'Modeling',
        description:
          'We build the geometry — the 2D layout or the full 3D model of the space or product.',
      },
      {
        step: '03',
        title: 'Texturing & Lighting',
        description:
          'Materials, finishes, and realistic lighting bring the model to life.',
      },
      {
        step: '04',
        title: 'Render & Delivery',
        description:
          'High-resolution renders from the angles you need, plus a revision round.',
      },
    ],
  },
  included: {
    heading: 'What every visualization engagement includes',
    description:
      'Scoped to your project, but these come standard on every model.',
    items: [
      {
        title: '2D floor & site plans',
        description: 'Clear, accurate plans for marketing or planning.',
      },
      {
        title: '3D modeling',
        description: 'Accurate geometry of your space, building, or product.',
      },
      {
        title: 'Photorealistic rendering',
        description:
          'Lifelike renders that look like a photograph, not a sketch.',
      },
      {
        title: 'Materials & lighting',
        description:
          'Real finishes and lighting so the render reads as true-to-life.',
      },
      {
        title: 'Multiple views & angles',
        description: 'Interior, exterior, and detail shots from any angle.',
      },
      {
        title: 'Revisions & handoff',
        description: 'A structured revision round and organized final files.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands invest in visualization',
    description:
      'Renders de-risk decisions and sell the unbuilt — here’s the impact they tend to drive.',
    stats: [
      {
        value: 'Pre-build',
        label:
          'Sell and get stakeholder sign-off before a single brick is laid.',
      },
      {
        value: '360°',
        label: 'Interior and exterior views from any angle you need.',
      },
      {
        value: '1 model',
        label: 'Becomes renders, walkthroughs, and marketing visuals.',
      },
    ],
  },
  faqs: [
    {
      question: 'What do you need from us to start?',
      answer:
        'Plans or dimensions for a space, or specs and references for a product, plus any materials, finishes, or brand details. The more accurate the inputs, the more accurate the render.',
    },
    {
      question: 'Do you do 2D, 3D, or both?',
      answer:
        'Both. We produce 2D floor and site plans, full 3D models, and photorealistic renders — and we’ll recommend the right mix for how you’ll use them.',
    },
    {
      question: 'How realistic are the renders?',
      answer:
        'Photorealistic when you need it — accurate materials, lighting, and detail so the image reads like a photograph. We can also deliver cleaner, stylized looks for concept stages.',
    },
    {
      question: 'What file formats do we receive?',
      answer:
        'High-resolution images (JPG/PNG) sized for print and web by default. Source files or specific formats can be arranged per your agreement.',
    },
    {
      question: 'What drives the cost?',
      answer:
        'Complexity of the model, number of views, level of detail and realism, and revision rounds. We scope your needs first and quote a fixed price before any work starts.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s visualize your project',
    description:
      'Send us your plans or product specs, and we’ll build models and renders that let you sell and plan with confidence.',
    primaryLabel: 'Book a Visualization Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: 'virtual-tours-matterport',
      title: 'Virtual Tours / Matterport',
      tagline: 'Immersive 360° walkthroughs and Matterport tours.',
      imageUrl: '/3Dmodel.jpg',
      imageAlt: 'Matterport 360-degree virtual tour interface of an interior.',
      available: true,
    },
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
  ],
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Visualization is quoted to scope after a short call. These are the factors that move it.',
    factors: [
      {
        title: 'Model complexity',
        description:
          'The size and detail of the space, building, or product being modeled.',
      },
      {
        title: 'Number of views',
        description: 'How many angles, rooms, or renders you need.',
      },
      {
        title: 'Level of realism',
        description: 'Concept-stage stylized renders versus full photorealism.',
      },
      {
        title: 'Revision rounds',
        description: 'How many rounds of refinement are built in.',
      },
    ],
    note: 'Send us your plans or specs and we’ll scope the work, then send a fixed quote.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title: '2D & 3D Architectural Modeling & Rendering in Vancouver | Perseus',
    description:
      '2D floor plans, 3D models, and photorealistic rendering in Vancouver — visualize buildings, interiors, and products before they’re built.',
    canonicalPath: `${SITE_URL}/services/production/2d-3d-models`,
    ogImage: `${IMAGEKIT_BASE}/services-3Dmodel.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Virtual Tours / Matterport — interactive 360° capture. No video `showcase`
// (tours are embeddable elsewhere), so the still hero renders and the reel wall
// is skipped.
const virtualTours: ProductionServiceContent = {
  categorySlug: 'production',
  categoryTitle: 'Production',
  slug: 'virtual-tours-matterport',
  title: 'Virtual Tours / Matterport',
  eyebrow: 'Production · Virtual Tours',
  heroHeadline: 'Walk through it',
  heroHeadlineAccent: 'from anywhere.',
  heroSubtitle:
    'Immersive 360° Matterport tours — let buyers, guests, and clients explore your space on their own time, fully self-guided, right from your website.',
  heroImageUrl: '/3Dmodel.jpg',
  heroImageAlt:
    'Matterport 360-degree virtual tour interface of a modern interior.',
  intro: {
    heading: 'Let people explore on their own terms.',
    body: 'A virtual tour answers “what’s it actually like in there?” without a visit. Self-guided 3D walkthroughs build confidence, qualify interest before in-person showings, and keep working 24/7 — embedded right on your site.',
    highlights: [
      'True-to-scale Matterport 3D capture',
      'Dollhouse & floor-plan views',
      'Embeddable on your website',
      'Always-on, self-guided access',
    ],
  },
  tour: {
    heading: 'Walk the space from anywhere.',
    description:
      'A self-guided 3D tour with navigable hotspots, dollhouse and floor-plan views, and room-to-room jumps — switch viewpoints and explore, exactly like the embed on your site.',
    modes: ['Walkthrough', 'Dollhouse', 'Floor plan'],
    scenes: [
      { name: 'Entry', imageUrl: '/3Dmodel.jpg', imageAlt: 'Virtual tour entry view.' },
      { name: 'Living area', imageUrl: '/services-3Dmodel.jpeg', imageAlt: 'Virtual tour living area.' },
      { name: 'Detail', imageUrl: '/services-branding.jpeg', imageAlt: 'Virtual tour detail view.' },
      { name: 'Exterior', imageUrl: '/services-aerialproduction.jpeg', imageAlt: 'Virtual tour exterior view.' },
    ],
  },
  process: {
    heading: 'From scan to embed',
    description:
      'A quick, structured capture so your tour is live with minimal disruption.',
    steps: [
      {
        step: '01',
        title: 'Scan Planning',
        description:
          'We plan the route and prep the space so it photographs and scans cleanly.',
      },
      {
        step: '02',
        title: 'On-Site Capture',
        description:
          'A full 3D scan of the space, captured on-location in a single visit.',
      },
      {
        step: '03',
        title: 'Processing & Hosting',
        description:
          'We process the scan into an interactive tour with highlight tags and a floor plan.',
      },
      {
        step: '04',
        title: 'Embed & Handoff',
        description:
          'A branded, embeddable tour link ready to drop onto your website and listings.',
      },
    ],
  },
  included: {
    heading: 'What every virtual tour includes',
    description: 'Scoped to your space, but these come standard on every tour.',
    items: [
      {
        title: 'On-site 3D scanning',
        description: 'Full Matterport capture of your space in a single visit.',
      },
      {
        title: 'Dollhouse & floor-plan views',
        description:
          'Top-down and 3D overviews so visitors get their bearings.',
      },
      {
        title: 'Guided highlight tags',
        description: 'Info points that call out features, rooms, and details.',
      },
      {
        title: 'Hosting & embed link',
        description:
          'A ready-to-embed tour for your site, listings, and emails.',
      },
      {
        title: 'On-tour branding',
        description: 'Your logo and brand details on the tour experience.',
      },
      {
        title: 'Updates as spaces change',
        description: 'Re-scans and updates when the space changes, on request.',
      },
    ],
  },
  outcomes: {
    heading: 'Why brands add a virtual tour',
    description:
      'Self-guided 3D tours reduce friction and qualify interest — here’s the impact they tend to drive.',
    stats: [
      {
        value: '99%',
        label:
          'Of buyers say a virtual tour increases their interest in a space.',
      },
      {
        value: '24/7',
        label:
          'Always-on, self-guided access for remote and after-hours visitors.',
      },
      {
        value: '2×',
        label: 'Longer engagement than photos alone on a listing page.',
      },
    ],
  },
  faqs: [
    {
      question: 'What is a Matterport tour?',
      answer:
        'It’s an interactive 3D walkthrough built from a full scan of your space. Visitors can move room to room, look in any direction, switch to a dollhouse or floor-plan view, and explore at their own pace.',
    },
    {
      question: 'What kinds of spaces work best?',
      answer:
        'Real estate, hospitality, retail, offices, venues, gyms, and showrooms all work well — anywhere people benefit from getting a real feel for a space before visiting.',
    },
    {
      question: 'How do we put the tour on our website?',
      answer:
        'We deliver an embed link you can drop into your site, listings, and emails. We’ll walk your team through adding it, or handle the embed if we built the site.',
    },
    {
      question: 'Is there an ongoing hosting cost?',
      answer:
        'Matterport tours are hosted, so there’s a recurring hosting component. We’ll lay out the options and costs clearly so you can choose the plan that fits.',
    },
    {
      question: 'How long does capture take?',
      answer:
        'Most spaces are scanned in a single visit — timing depends on the size and complexity of the space. We confirm the scope before booking.',
    },
    {
      question: 'Can we update the tour later?',
      answer:
        'Yes. When a space changes — a renovation, new staging, a new layout — we can re-scan and update the tour so it stays accurate.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s capture your space',
    description:
      'Tell us about your space and we’ll plan a scan that turns into an always-on, self-guided tour your visitors can explore from anywhere.',
    primaryLabel: 'Book a Virtual Tour Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Production services',
    secondaryHref: '/services/production',
  },
  relatedServices: [
    {
      slug: '2d-3d-models',
      title: '2D & 3D Models',
      tagline: 'Floor plans, 3D models, and rendered visualizations.',
      imageUrl: '/services-3Dmodel.jpeg',
      imageAlt: 'Rendered 3D architectural model of a modern residence.',
      available: true,
    },
    {
      slug: 'photography',
      title: 'Photography',
      tagline: 'High-end product, lifestyle, and brand photography.',
      imageUrl: '/services-photography.jpeg',
      imageAlt:
        'Photographer capturing a styled lifestyle scene under studio lighting.',
      available: true,
    },
    {
      slug: 'aerial-production',
      title: 'Aerial Production',
      tagline: 'Drone photo and video for striking aerial perspectives.',
      imageUrl: '/services-aerialproduction.jpeg',
      imageAlt: 'Aerial drone shot of a coastal property at golden hour.',
      available: true,
    },
  ],
  scoping: {
    heading: 'What shapes your quote',
    description:
      'Tours are quoted to scope after a short call. These are the factors that move it.',
    factors: [
      {
        title: 'Size of the space',
        description:
          'Square footage and the number of rooms or areas to capture.',
      },
      {
        title: 'On-site complexity',
        description:
          'Access, staging, and how much prep the space needs before scanning.',
      },
      {
        title: 'Highlight tags',
        description:
          'How many info points and guided callouts you want in the tour.',
      },
      {
        title: 'Hosting',
        description: 'The ongoing hosting plan that keeps the tour live.',
      },
    ],
    note: 'Tell us about your space and we’ll scope the capture, then send a fixed quote.',
  },
  testimonials: PRODUCTION_TESTIMONIALS,
  seo: {
    title:
      'Matterport Virtual Tours & 360° Walkthroughs in Vancouver | Perseus',
    description:
      'Immersive Matterport virtual tours in Vancouver: self-guided 360° 3D walkthroughs with dollhouse and floor-plan views, embeddable on your website.',
    canonicalPath: `${SITE_URL}/services/production/virtual-tours-matterport`,
    ogImage: `${IMAGEKIT_BASE}/3Dmodel.jpg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// Production services with a detail page. Template switch is keyed on the
// category; the per-category map gates which service slugs resolve.
// NOTE: keys MUST be the service slug (getServiceDetail looks up by slug), so
// hyphenated slugs can't use object shorthand.
export const PRODUCTION_SERVICES: Record<string, ProductionServiceContent> = {
  videography,
  photography,
  'aerial-production': aerialProduction,
  'post-production': postProduction,
  '2d-3d-models': models2d3d,
  'virtual-tours-matterport': virtualTours,
};

// ─────────────────────────────────────────────────────────────────────────
// WEBSITES SERVICE DETAIL CONTENT
//
// Powers /services/websites/[service] via the Websites template (browser-frame
// hero → intro → tech-stack spec sheet → build timeline → pricing tiers).
// ─────────────────────────────────────────────────────────────────────────
const websiteDesign: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'website-design',
  title: 'Website Design',
  eyebrow: 'Websites · Design',
  heroHeadline: 'Design that turns',
  heroHeadlineAccent: 'visitors into customers.',
  heroSubtitle:
    'Conversion-focused web design — clear, fast, and on-brand. We design the page someone actually reads, trusts, and acts on, then hand it to development pixel-accurate.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'Perseus Creative Studio conversion-focused website design shown in a browser.',
  intro: {
    heading: 'Looks good is the floor. Converts is the job.',
    body: 'A website earns its keep by making one thing obvious: what you do, who it’s for, and what to do next. We design around that decision — a clear hierarchy, copy that sells, and an interface that loads fast and reads cleanly on every screen — so the site does more than impress. It performs.',
    highlights: [
      'Conversion-first UX & information architecture',
      'Custom design system, never a template',
      'Responsive from 320px to ultrawide',
      'Built handoff-ready for development',
    ],
  },
  responsive: {
    heading: 'One design. Every screen.',
    description:
      'We design from 320px up, not desktop-down — so the layout, type, and tap targets are deliberate on a phone, a tablet, and a wide monitor. What you approve is what ships, on every device.',
    imageUrl: '/navbar-website-2.jpeg',
    imageAlt:
      'A Perseus Creative Studio website design shown across desktop, tablet, and phone.',
    displayUrl: 'www.perseustudio.com',
    breakpoints: ['Desktop · 1440px', 'Tablet · 768px', 'Phone · 390px'],
  },
  stack: {
    heading: 'The design toolkit',
    description:
      'We design in the tools we build in, then hand off a developer-ready file — so what you approve is exactly what gets built, whether in Next.js or WordPress.',
    groups: [
      {
        label: 'Design',
        items: ['Figma', 'Wireframes', 'Prototyping', 'Design Systems'],
      },
      {
        label: 'Foundations',
        items: ['Typography', 'Color', 'Layout Grid', 'Components'],
      },
      {
        label: 'Craft',
        items: [
          'Responsive',
          'Motion',
          'Accessibility (WCAG)',
          'Dev-ready handoff',
        ],
      },
    ],
  },
  build: {
    heading: 'From blank canvas to signed-off design',
    description:
      'A structured design process with clear checkpoints, so you’re never guessing what’s next or seeing the work for the first time at the end.',
    steps: [
      {
        step: '01',
        title: 'Discovery & Architecture',
        description:
          'We map your goals, audience, and the path to conversion — then turn it into a sitemap and page structure before any pixels are pushed.',
      },
      {
        step: '02',
        title: 'Wireframes',
        description:
          'Low-fidelity layouts lock in hierarchy, content order, and the user journey, so we agree on structure before style.',
      },
      {
        step: '03',
        title: 'Visual Design',
        description:
          'A custom design system — type, color, components — applied across high-fidelity pages that look and feel unmistakably yours.',
      },
      {
        step: '04',
        title: 'Prototype & Handoff',
        description:
          'An interactive prototype for sign-off, then a developer-ready spec so the build matches the design exactly.',
      },
    ],
  },
  // No Lighthouse band here — performance is a development outcome (it lives on
  // the Website Development page). Design owns UX, the system, and the handoff.
  builds: {
    heading: 'Choose the build that fits',
    description:
      'Every project is scoped to your page count and complexity. Here are the three shapes most website projects take — tell us which sounds like you and we’ll take it from there.',
    note: 'Not sure which fits? Book a short scoping call and we’ll recommend the right one.',
    tiers: [
      {
        name: 'Landing Page',
        bestFor: 'A single high-converting page for one offer or campaign.',
        features: [
          'One long-form landing page',
          'Conversion-focused wireframe',
          'Custom visual design',
          'Mobile & desktop layouts',
          'Developer-ready handoff',
        ],
        ctaLabel: 'Start a Landing Page',
        ctaHref: '/contact',
      },
      {
        name: 'Marketing Site',
        bestFor:
          'A complete multi-page site that positions and sells your business.',
        featured: true,
        features: [
          'Up to 6–8 core pages',
          'Sitemap & information architecture',
          'Full custom design system',
          'Interactive prototype for sign-off',
          'Reusable component library',
          'Accessibility & SEO structure baked in',
        ],
        ctaLabel: 'Design My Site',
        ctaHref: '/contact',
      },
      {
        name: 'Custom / Commerce',
        bestFor: 'Stores, web apps, and large sites with bespoke flows.',
        features: [
          'Unlimited pages & templates',
          'E-commerce & product flows',
          'App & dashboard interfaces',
          'Design system documentation',
          'Ongoing design partnership',
        ],
        ctaLabel: 'Scope a Custom Build',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'Do you design and build, or only design?',
      answer:
        'Both — that’s the advantage of one studio. This engagement covers the design; our website-development service takes the approved design and builds it on a modern, fast, SEO-ready stack. We can scope them together or design-only if you have your own developers.',
    },
    {
      question: 'Will the design be custom, or based on a template?',
      answer:
        'Always custom. We build a design system around your brand — type, color, and components — rather than restyling a template. The result is a site that looks like you and nobody else.',
    },
    {
      question: 'How many revision rounds are included?',
      answer:
        'We work in defined revision rounds at each stage — wireframe, visual design, prototype — so feedback stays focused and the project keeps moving. The exact number is set in your proposal.',
    },
    {
      question: 'Do you write the copy, or do we provide it?',
      answer:
        'Either works. We can write conversion-focused copy as part of the design, or design around content you supply. We confirm who handles what before we start so the layout and the words are planned together.',
    },
    {
      question: 'Is the design responsive and accessible?',
      answer:
        'Yes. Every layout is designed mobile-first through to large desktop, with accessibility (color contrast, semantic structure, focus states) considered from the start — not bolted on after.',
    },
    {
      question: 'What do you hand off to developers?',
      answer:
        'A developer-ready Figma file with a documented design system, spacing and type scales, component states, and an interactive prototype — everything needed to build the site exactly as designed, whether we build it or you do.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s design a site that performs',
    description:
      'Tell us about your business and goals, and we’ll map the pages, structure, and design system to turn visitors into customers.',
    primaryLabel: 'Start a Website Project',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'Website development on a modern, performance-focused stack.',
      available: false,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'E-commerce store interface engineered to convert.',
      available: false,
    },
    {
      slug: 'landing-pages',
      title: 'Landing Pages',
      tagline: 'High-converting pages built around a single offer.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'High-converting campaign landing page layout.',
      available: false,
    },
  ],
  seo: {
    title:
      'Website Design in Vancouver — Conversion-Focused UX | Perseus Creative Studio',
    description:
      'Custom, conversion-focused website design in Vancouver: information architecture, design systems, and developer-ready handoff built to turn visitors into customers.',
    canonicalPath: `${SITE_URL}/services/websites/website-design`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Remaining categories have no authored detail content yet. The maps are
// declared (empty) so the route/dispatcher resolve uniformly across every
// category; populate them as each category's content + layout is built.
// ─────────────────────────────────────────────────────────────────────────
const websiteDevelopment: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'website-development',
  title: 'Website Development',
  eyebrow: 'Websites · Development',
  heroHeadline: 'Built to be fast,',
  heroHeadlineAccent: 'secure, and yours.',
  heroSubtitle:
    'We turn the approved design into a fast, maintainable site on a modern stack — clean code, real performance, and full ownership. No page-builder bloat, no lock-in.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
  intro: {
    heading: 'A site is only as good as how it’s built.',
    body: 'Anyone can drag a template together. We engineer for the things that actually matter once you launch: speed, security, search visibility, and code your team (or ours) can maintain for years. Every build is pixel-accurate to the design and structured for SEO from the first commit. This covers content and marketing sites — for portals, dashboards, and booking systems see Web Applications, and for online stores, E-commerce.',
    highlights: [
      'Modern stacks — Next.js or WordPress',
      'Pixel-accurate to the design',
      'Fast, secure & SEO-ready',
      'Yours to own and extend',
    ],
  },
  codeToUi: {
    heading: 'Clean code in. Fast interface out.',
    description:
      'We don’t drag templates together — we write maintainable components that compile to a fast, accessible interface. Here’s the same idea on both sides of the build.',
    fileName: 'Hero.tsx',
    code: [
      "import { Section, Eyebrow, Button } from '@/ui';",
      '',
      'export function Hero() {',
      '  return (',
      '    <Section>',
      '      <Eyebrow>Vancouver studio</Eyebrow>',
      '      <h1>Built to be fast.</h1>',
      '      <p>Clean code, real performance.</p>',
      '      <Button>Start a project</Button>',
      '    </Section>',
      '  );',
      '}',
    ],
    rendered: {
      eyebrow: 'Vancouver studio',
      headline: 'Built to be fast.',
      body: 'Clean code, real performance — and a site your team can own and extend for years.',
      cta: 'Start a project',
      siteName: 'Acme',
      nav: ['Work', 'Services', 'About'],
    },
    previewUrl: 'www.yourbrand.com',
    buildLabel: 'Compiled in 0.8s',
    checks: ['TypeScript', '100 Lighthouse', 'WCAG AA'],
  },
  stack: {
    heading: 'Engineered on a modern foundation',
    description:
      'We build in the tools that ship the fastest, most reliable sites — and we’ll recommend the right fit for how your team works.',
    groups: [
      {
        label: 'Frontend',
        items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      },
      {
        label: 'Backend & CMS',
        items: ['Node.js', 'WordPress', 'Headless CMS', 'GraphQL'],
      },
      {
        label: 'Quality & Infra',
        items: [
          'Vercel',
          'Core Web Vitals',
          'Accessibility (WCAG)',
          'Analytics',
        ],
      },
    ],
  },
  build: {
    heading: 'From design to launch',
    description:
      'A disciplined build process with checkpoints, so the site that ships is the site you approved — fast, tested, and ready to grow.',
    steps: [
      {
        step: '01',
        title: 'Architecture & setup',
        description:
          'We choose the stack, scaffold the project, and wire up the CMS, components, and tooling the build needs.',
      },
      {
        step: '02',
        title: 'Build',
        description:
          'We develop the approved design into responsive, accessible, pixel-accurate pages and reusable components.',
      },
      {
        step: '03',
        title: 'QA & optimization',
        description:
          'Cross-device testing, performance tuning for Core Web Vitals, and a technical-SEO pass before we go near launch.',
      },
      {
        step: '04',
        title: 'Launch & handoff',
        description:
          'We deploy, set up analytics and monitoring, and hand over a documented site your team can edit with confidence.',
      },
    ],
  },
  outcomes: {
    heading: 'Speed and quality, measured',
    description:
      'Development is where performance is won or lost. Here’s the Lighthouse jump a proper build delivers over a typical page-builder site, before and after.',
    metrics: [
      {
        label: 'Performance',
        caption: '/ 100 Lighthouse',
        before: { value: '41', gauge: 41 },
        after: { value: '99', gauge: 99 },
      },
      {
        label: 'Best Practices',
        caption: '/ 100 Lighthouse',
        before: { value: '75', gauge: 75 },
        after: { value: '100', gauge: 100 },
      },
      {
        label: 'SEO',
        caption: '/ 100 on-page',
        before: { value: '68', gauge: 68 },
        after: { value: '100', gauge: 100 },
      },
    ],
  },
  faqs: [
    {
      question: 'What do you build websites with?',
      answer:
        'Custom sites on modern stacks like Next.js, React, and Node.js, and WordPress when a familiar CMS fits your team better. We recommend the right approach for your needs rather than forcing every project onto one tool.',
    },
    {
      question: 'Do you build the design too, or only develop it?',
      answer:
        'Both. Our website-design service produces the design and a developer-ready handoff; this service builds it. We can do the full design-and-build, or develop a design you already have.',
    },
    {
      question: 'Will the site be fast and SEO-ready?',
      answer:
        'Yes — performance and search visibility are built in: clean semantic markup, optimized images, sensible metadata, and Core Web Vitals tuned before launch, so the site loads quickly and is easy to rank.',
    },
    {
      question: 'Can my team edit the site after launch?',
      answer:
        'Yes. We build on a CMS suited to your team and hand over a documented site, so you can update pages, posts, and images yourself. For changes you’d rather hand off, our maintenance plans cover them.',
    },
    {
      question: 'Do I own the code and the site?',
      answer:
        'Completely. You own the codebase, the content, and the accounts — no proprietary lock-in. If we ever part ways, everything goes with you.',
    },
    {
      question: 'Can you work with our existing design or brand?',
      answer:
        'Absolutely. We can build from your design files, extend an existing design system, or apply your brand guidelines — and flag anything that needs tightening before development.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build it right',
    description:
      'Tell us about your project and we’ll recommend the right stack, then engineer a fast, secure site you fully own.',
    primaryLabel: 'Start a Website Project',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'E-commerce store interface engineered to convert.',
      available: false,
    },
    {
      slug: 'web-applications',
      title: 'Web Applications',
      tagline: 'Portals, dashboards, and booking systems built to scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'Web application dashboard built on a modern stack.',
      available: false,
    },
  ],
  seo: {
    title:
      'Website Development in Vancouver — Fast, Custom Builds | Perseus Creative Studio',
    description:
      'Custom website development in Vancouver: fast, secure, SEO-ready builds on modern stacks like Next.js and WordPress — pixel-accurate, maintainable, and fully yours.',
    canonicalPath: `${SITE_URL}/services/websites/website-development`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const eCommerce: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'e-commerce',
  title: 'E-commerce',
  eyebrow: 'Websites · E-commerce',
  heroHeadline: 'Stores built to',
  heroHeadlineAccent: 'sell and scale.',
  heroSubtitle:
    'Online stores engineered to convert — fast storefronts, a checkout that doesn’t leak sales, and a foundation that grows with your catalogue. On Shopify or fully custom.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'E-commerce storefront engineered to convert by Perseus Creative Studio.',
  intro: {
    heading: 'Every millisecond and every click costs a sale.',
    body: 'An online store lives or dies on speed and friction. We build storefronts that load fast, guide shoppers to checkout, and handle payments, tax, and shipping cleanly — then keep it all maintainable so adding products or campaigns never means a rebuild.',
    highlights: [
      'Shopify or fully custom commerce',
      'Conversion-focused product & checkout flows',
      'Fast, mobile-first storefronts',
      'Payments, tax & shipping handled',
    ],
  },
  storefront: {
    heading: 'A storefront that guides shoppers to checkout.',
    description:
      'Fast product cards, a frictionless add-to-cart, and a checkout that doesn’t leak sales. Try it — add a few items and watch the cart respond instantly.',
    storeName: 'Your Store',
    products: [
      {
        name: 'Signature Tote — Natural Canvas',
        tag: 'New',
        imageUrl: '/services-photography.jpeg',
        imageAlt: 'A product photographed for an online store.',
      },
      {
        name: 'Studio Ceramic Mug',
        tag: 'Bestseller',
        imageUrl: '/services-branding.jpeg',
        imageAlt: 'A branded ceramic mug styled for e-commerce.',
      },
      {
        name: 'Everyday Linen Set',
        tag: 'Limited',
        imageUrl: '/services-contentcreation.jpeg',
        imageAlt: 'A lifestyle product set shot for a storefront.',
      },
      {
        name: 'Field Notebook — Ember',
        tag: 'Restocked',
        imageUrl: '/services-smm.jpeg',
        imageAlt: 'A notebook product styled for social commerce.',
      },
    ],
    features: ['Apple Pay & Stripe', 'Fast checkout', 'Free returns', 'Secure'],
  },
  stack: {
    heading: 'Built on proven commerce',
    description:
      'We build on the platform that fits your catalogue and team — from a fast Shopify launch to a fully custom, headless storefront.',
    groups: [
      {
        label: 'Platforms',
        items: ['Shopify', 'WooCommerce', 'Headless Commerce', 'Next.js'],
      },
      {
        label: 'Checkout & Payments',
        items: ['Stripe', 'Apple Pay', 'Subscriptions', 'Tax & Shipping'],
      },
      {
        label: 'Performance & SEO',
        items: [
          'Core Web Vitals',
          'Structured Data',
          'Analytics',
          'Accessibility (WCAG)',
        ],
      },
    ],
  },
  build: {
    heading: 'From catalogue to checkout',
    description:
      'A structured build so your store launches clean — products in, payments tested, and nothing broken on day one.',
    steps: [
      {
        step: '01',
        title: 'Plan & platform',
        description:
          'We choose the right platform, map the catalogue and categories, and scope payments, tax, and shipping.',
      },
      {
        step: '02',
        title: 'Storefront build',
        description:
          'We build a fast, on-brand storefront with conversion-focused product and collection pages.',
      },
      {
        step: '03',
        title: 'Checkout & integrations',
        description:
          'Payments, shipping, tax, and the apps you need — wired up, tested, and tuned for fewer drop-offs.',
      },
      {
        step: '04',
        title: 'Launch & handoff',
        description:
          'We migrate data if needed, QA the full purchase flow, launch, and hand over a store your team can run.',
      },
    ],
  },
  outcomes: {
    heading: 'A faster store is a bigger one',
    description:
      'Store speed maps directly to revenue — shoppers abandon slow pages and broken checkouts. Here’s the Lighthouse jump a rebuild delivers, before and after.',
    metrics: [
      {
        label: 'Performance',
        caption: '/ 100 Lighthouse',
        before: { value: '44', gauge: 44 },
        after: { value: '97', gauge: 97 },
      },
      {
        label: 'Best Practices',
        caption: '/ 100 Lighthouse',
        before: { value: '79', gauge: 79 },
        after: { value: '100', gauge: 100 },
      },
      {
        label: 'SEO',
        caption: '/ 100 on-page',
        before: { value: '66', gauge: 66 },
        after: { value: '100', gauge: 100 },
      },
    ],
  },
  builds: {
    heading: 'Choose the store that fits',
    description:
      'Every store is scoped to your catalogue size and complexity. Here are the three shapes most commerce projects take — tell us which sounds like you.',
    note: 'Not sure which fits? Book a short scoping call and we’ll recommend the right one.',
    tiers: [
      {
        name: 'Shopify Store',
        bestFor:
          'A fast, reliable launch on Shopify with a clean, on-brand theme.',
        features: [
          'Custom-styled Shopify theme',
          'Product & collection setup',
          'Payments, tax & shipping config',
          'Core apps & integrations',
          'Launch & training',
        ],
        ctaLabel: 'Start a Shopify Store',
        ctaHref: '/contact',
      },
      {
        name: 'Growth Store',
        bestFor: 'A conversion-tuned store for brands ready to scale sales.',
        featured: true,
        features: [
          'Custom storefront design',
          'Conversion-optimized product & checkout',
          'Subscriptions & advanced apps',
          'Analytics & tracking wired up',
          'Performance & SEO tuning',
          'Migration from an existing store',
        ],
        ctaLabel: 'Build a Growth Store',
        ctaHref: '/contact',
      },
      {
        name: 'Custom Commerce',
        bestFor:
          'Headless or bespoke commerce with custom flows and integrations.',
        features: [
          'Headless / custom storefront',
          'Custom catalogue & logic',
          'ERP / CRM / 3PL integrations',
          'Multi-region & scale-ready',
          'Ongoing development partnership',
        ],
        ctaLabel: 'Scope Custom Commerce',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'Shopify or a custom build — which is right for me?',
      answer:
        'Shopify is the fastest, most reliable way to launch and run a store for most businesses. A custom or headless build makes sense when you need bespoke flows, deep integrations, or scale beyond what an off-the-shelf platform handles. We’ll recommend honestly based on your catalogue and goals.',
    },
    {
      question: 'Can you migrate my existing store?',
      answer:
        'Yes. We migrate products, customers, and orders, preserve your SEO and URLs, and redesign along the way if needed — planned carefully so you don’t lose rankings or sales in the move.',
    },
    {
      question: 'Do you handle payments, tax, and shipping?',
      answer:
        'Yes. We configure payment providers (Stripe, Apple Pay, and more), tax rules, and shipping rates as part of the build, then test the full purchase flow before launch.',
    },
    {
      question: 'Will the store be fast on mobile?',
      answer:
        'That’s a priority — most store traffic is mobile, and speed directly affects sales. We build mobile-first and tune Core Web Vitals so pages load fast and the checkout stays smooth.',
    },
    {
      question: 'Can my team manage products after launch?',
      answer:
        'Yes. You get a store your team can run — adding products, running promotions, and managing orders — plus training. For changes you’d rather hand off, our maintenance plans cover them.',
    },
    {
      question: 'Do I own the store and its data?',
      answer:
        'Completely. The store, the data, and the accounts are yours — no lock-in. On a custom build you own the codebase too.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build a store that sells',
    description:
      'Tell us about your products and goals, and we’ll recommend the right platform, then build a fast store engineered to convert.',
    primaryLabel: 'Start an E-commerce Project',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'landing-pages',
      title: 'Landing Pages',
      tagline: 'High-converting pages built around a single offer.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'High-converting campaign landing page layout.',
      available: false,
    },
  ],
  seo: {
    title:
      'E-commerce Development in Vancouver — Shopify & Custom Stores | Perseus',
    description:
      'E-commerce development in Vancouver: fast, conversion-focused online stores on Shopify or fully custom — checkout, payments, migrations, and performance built to sell.',
    canonicalPath: `${SITE_URL}/services/websites/e-commerce`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const landingPages: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'landing-pages',
  title: 'Landing Pages',
  eyebrow: 'Websites · Landing Pages',
  heroHeadline: 'One page,',
  heroHeadlineAccent: 'one job: convert.',
  heroSubtitle:
    'A focused page built around a single offer — every element earns its place. Designed to turn the ad, email, and social traffic you’re already paying for into action.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'A high-converting campaign landing page built by Perseus Creative Studio.',
  intro: {
    heading: 'No menu, no detours — just the next step.',
    body: 'A landing page isn’t a website. It strips away navigation and distractions and points every element at one action. We pair persuasive copy with fast, clean design so the traffic you’re paying for actually converts instead of bouncing.',
    highlights: [
      'Built around a single offer',
      'Persuasive copy + clean design',
      'Fast load — protects ad spend',
      'A/B-ready and fully tracked',
    ],
  },
  conversionAnatomy: {
    heading: 'Every block earns its place.',
    description:
      'A landing page that converts isn’t decorated — it’s sequenced. Here’s the anatomy we build, top to bottom, each section doing one job.',
    blocks: [
      {
        label: 'Hero & promise',
        note: 'One clear headline and the single action you want — above the fold.',
      },
      {
        label: 'Social proof',
        note: 'Logos, reviews, and results that make the promise believable.',
      },
      {
        label: 'The offer',
        note: 'What they get, why it’s worth it, and what makes it different.',
      },
      {
        label: 'Primary CTA',
        note: 'A focused call to action, repeated where intent peaks.',
      },
      {
        label: 'Objections & FAQ',
        note: 'The last few doubts answered so nothing blocks the click.',
      },
    ],
  },
  build: {
    heading: 'From offer to live page',
    description:
      'A tight process built for speed — most landing pages go from brief to live in a fraction of the time a full site takes.',
    steps: [
      {
        step: '01',
        title: 'Offer & angle',
        description:
          'We nail the single offer, the audience, and the one action the page exists to drive.',
      },
      {
        step: '02',
        title: 'Wireframe & copy',
        description:
          'We structure the persuasion — hook, benefits, proof, and a clear call to action.',
      },
      {
        step: '03',
        title: 'Design & build',
        description:
          'An on-brand, mobile-first page built to load fast and read in seconds.',
      },
      {
        step: '04',
        title: 'Launch & measure',
        description:
          'Tracking and goals wired up, then we A/B test to keep lifting the conversion rate.',
      },
    ],
  },
  builds: {
    heading: 'Choose the page that fits your goal',
    description:
      'Different campaigns need different pages. Here are the three we build most — tell us your goal and we’ll point you to the right one.',
    note: 'Not sure which fits? Book a short call and we’ll recommend the right page for your campaign.',
    tiers: [
      {
        name: 'Lead Capture',
        bestFor:
          'Collecting qualified leads with a focused form and an incentive.',
        features: [
          'Hero, offer & lead form',
          'Lead magnet or incentive',
          'Thank-you / next-step flow',
          'CRM or email integration',
          'Conversion tracking',
        ],
        ctaLabel: 'Build a Lead Page',
        ctaHref: '/contact',
      },
      {
        name: 'Click-Through',
        bestFor:
          'Warming up traffic, then sending it to your store or booking.',
        featured: true,
        features: [
          'Persuasive long-scroll layout',
          'Social proof & objection handling',
          'A single, focused call to action',
          'A/B test on the key elements',
          'Analytics & event tracking',
        ],
        ctaLabel: 'Build a Click-Through Page',
        ctaHref: '/contact',
      },
      {
        name: 'Sales Page',
        bestFor:
          'Selling one product or offer with a full long-form narrative.',
        features: [
          'Full sales-story structure',
          'Benefits, proof & FAQ',
          'Multiple conversion points',
          'Payment or booking link',
          'Tracking & optimization',
        ],
        ctaLabel: 'Build a Sales Page',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'How is a landing page different from a website?',
      answer:
        'A website helps people explore — multiple pages, a menu, lots of paths. A landing page does the opposite: one page, no navigation, every element pointing at a single action. It’s built to convert a specific audience for a specific offer.',
    },
    {
      question: 'How fast can you turn one around?',
      answer:
        'Much faster than a full site — a focused landing page is a small, well-defined scope. We confirm the timeline in your proposal, but these are typically measured in days to a couple of weeks depending on copy and assets.',
    },
    {
      question: 'Do you write the copy?',
      answer:
        'Yes — conversion copy is half the job on a landing page. We can write the hook, benefits, and calls to action, or work from copy you provide. We confirm who handles what up front.',
    },
    {
      question: 'Can you set up A/B testing and tracking?',
      answer:
        'Yes. We wire up analytics and conversion tracking from launch, and can run A/B tests on headlines, layouts, and CTAs to keep improving the conversion rate over time.',
    },
    {
      question: 'Where does the traffic come from?',
      answer:
        'Usually your ads, email, or social — we build the destination that converts that traffic. If you also need the campaigns driving it, that lives under our digital-marketing services and the two pair naturally.',
    },
    {
      question: 'Can you connect it to my CRM or email tool?',
      answer:
        'Yes. We integrate the form with your CRM, email platform, or spreadsheet so leads land where your team already works, with the right notifications and follow-up.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s launch a page that converts',
    description:
      'Tell us your offer and where the traffic’s coming from, and we’ll build a focused page engineered to turn it into action.',
    primaryLabel: 'Start a Landing Page',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'E-commerce storefront engineered to convert.',
      available: true,
    },
  ],
  seo: {
    title: 'Landing Page Design in Vancouver — High-Converting Pages | Perseus',
    description:
      'High-converting landing page design and development in Vancouver — focused, fast pages built around a single offer to turn ad, email, and social traffic into action.',
    canonicalPath: `${SITE_URL}/services/websites/landing-pages`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const webApplications: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'web-applications',
  title: 'Web Applications',
  eyebrow: 'Websites · Web Apps',
  heroHeadline: 'Software that runs',
  heroHeadlineAccent: 'in the browser.',
  heroSubtitle:
    'Portals, dashboards, and booking systems — built like real software, with logins, databases, and the logic your business actually runs on. Not a brochure site; a tool people use.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'A web application dashboard built on a modern stack by Perseus Creative Studio.',
  intro: {
    heading: 'When a website needs to actually do something.',
    body: 'The moment people need to log in, see their own data, book a slot, or push a workflow forward, you’re not building a website anymore — you’re building software. We engineer web apps with proper auth, databases, and integrations, designed so the interface stays simple even as the logic underneath gets complex.',
    highlights: [
      'Built like software, not a site',
      'Auth, roles & permissions',
      'Databases & third-party integrations',
      'Scales with your users',
    ],
  },
  dashboardMock: {
    heading: 'A tool people actually use.',
    description:
      'Logins, live data, and workflows — wrapped in an interface that stays simple as the logic underneath grows. Click through the views; this is how a Perseus build behaves.',
    appName: 'app.yourbusiness.com',
    views: [
      {
        name: 'Overview',
        kind: 'overview',
        stats: [
          { label: 'Active users', value: '2,481' },
          { label: 'This week', value: '+18%' },
          { label: 'Tasks done', value: '964' },
        ],
        chart: [38, 52, 44, 61, 70, 58, 82],
        chartLabel: 'Activity, last 7 days',
      },
      {
        name: 'Customers',
        kind: 'customers',
        rows: [
          { name: 'Ava Chen', meta: 'ava@northwind.co', status: 'Active' },
          { name: 'Marcus Lee', meta: 'marcus@brightlab.io', status: 'Trial' },
          { name: 'Priya Nair', meta: 'priya@harbor.dev', status: 'Active' },
          { name: 'Diego Alvarez', meta: 'diego@summit.app', status: 'Invited' },
          { name: 'Sofia Rossi', meta: 'sofia@meridian.co', status: 'Active' },
        ],
      },
      {
        name: 'Bookings',
        kind: 'bookings',
        week: [
          { day: 'Mon', booked: 3, capacity: 6 },
          { day: 'Tue', booked: 5, capacity: 6 },
          { day: 'Wed', booked: 4, capacity: 6 },
          { day: 'Thu', booked: 6, capacity: 6 },
          { day: 'Fri', booked: 5, capacity: 6 },
          { day: 'Sat', booked: 2, capacity: 4 },
          { day: 'Sun', booked: 0, capacity: 4 },
        ],
      },
      {
        name: 'Reports',
        kind: 'reports',
        series: [28, 36, 32, 48, 52, 60, 58, 72, 80],
        seriesLabel: 'Sessions, last 9 weeks',
        rows: [
          { label: 'Sessions', value: '41.2k' },
          { label: 'Conversion', value: '3.6%' },
          { label: 'Exports', value: '128' },
        ],
      },
    ],
  },
  stack: {
    heading: 'A real application stack',
    description:
      'Web apps need more than a frontend — we build the data layer, auth, and integrations that make them reliable and secure.',
    groups: [
      {
        label: 'Frontend',
        items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      },
      {
        label: 'Backend & Data',
        items: ['Node.js', 'Database', 'GraphQL', 'Auth'],
      },
      {
        label: 'Infra & Quality',
        items: ['Vercel', 'Monitoring', 'Analytics', 'Accessibility (WCAG)'],
      },
    ],
  },
  build: {
    heading: 'From data model to live app',
    description:
      'Software has more moving parts than a site, so we de-risk it with a clear sequence — agree the model and flows before writing the features.',
    steps: [
      {
        step: '01',
        title: 'Scope & data model',
        description:
          'We map the users, roles, and data — the model the whole app is built on — and agree the core flows.',
      },
      {
        step: '02',
        title: 'UX & prototype',
        description:
          'We design the screens and interactions, then prototype the key flows so they’re right before we build.',
      },
      {
        step: '03',
        title: 'Build & integrate',
        description:
          'Frontend, backend, auth, and the third-party integrations the app relies on — built and wired together.',
      },
      {
        step: '04',
        title: 'Test & launch',
        description:
          'Testing across roles and edge cases, then a monitored launch with the tools to support and scale it.',
      },
    ],
  },
  builds: {
    heading: 'Choose the kind of app you need',
    description:
      'Most web apps fall into a few shapes. Tell us which sounds like yours and we’ll scope it from there.',
    note: 'Not sure which fits? Book a short scoping call and we’ll map the right build.',
    tiers: [
      {
        name: 'Customer Portal',
        bestFor:
          'Giving your customers a secure place to log in and self-serve.',
        features: [
          'Secure logins & roles',
          'Personal dashboards',
          'Documents, billing or requests',
          'Notifications & email',
          'CRM / system integrations',
        ],
        ctaLabel: 'Scope a Portal',
        ctaHref: '/contact',
      },
      {
        name: 'Dashboard / Internal Tool',
        bestFor:
          'Replacing spreadsheets with a tool your team actually wants to use.',
        featured: true,
        features: [
          'Data views & reporting',
          'Workflows & approvals',
          'Roles & permissions',
          'Integrations with your stack',
          'Admin & audit controls',
        ],
        ctaLabel: 'Scope a Dashboard',
        ctaHref: '/contact',
      },
      {
        name: 'Booking & Scheduling',
        bestFor: 'Taking bookings, appointments, or reservations online.',
        features: [
          'Availability & calendars',
          'Online booking flow',
          'Payments & deposits',
          'Reminders & notifications',
          'Customer & admin views',
        ],
        ctaLabel: 'Scope a Booking App',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'How is a web app different from a website?',
      answer:
        'A website presents content — people read and browse. A web app does things: people log in, see their own data, and complete tasks. Apps need auth, a database, and business logic, so they’re a bigger build than a marketing site.',
    },
    {
      question: 'What kinds of apps do you build?',
      answer:
        'Customer portals, internal dashboards and tools, booking and scheduling systems, and custom workflows. If it needs logins, data, and logic in the browser, it’s in scope — we’ll tell you honestly if an off-the-shelf tool would serve you better.',
    },
    {
      question: 'How do you handle accounts and security?',
      answer:
        'Apps are built with proper authentication, roles, and permissions from the start, plus sensible data protection. We scope the security needs up front based on the data the app handles.',
    },
    {
      question: 'Can it integrate with our existing systems?',
      answer:
        'Yes — that’s usually the point. We integrate with the CRMs, payment providers, calendars, and internal systems your business already runs on, via their APIs.',
    },
    {
      question: 'Do we own the code?',
      answer:
        'Completely. You own the codebase, the data, and the accounts — no lock-in. We can keep building and maintaining it with you, or hand it off to your team.',
    },
    {
      question: 'Can you support and scale it after launch?',
      answer:
        'Yes. Apps evolve — we offer ongoing development and support to add features, monitor reliability, and scale the app as your user base grows.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build your web app',
    description:
      'Tell us the problem you’re solving and we’ll map the users, data, and flows, then build software your customers or team actually want to use.',
    primaryLabel: 'Start a Web App Project',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'e-commerce',
      title: 'E-commerce',
      tagline: 'Online stores engineered to sell and scale.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'E-commerce storefront engineered to convert.',
      available: true,
    },
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
    },
  ],
  seo: {
    title:
      'Web Application Development in Vancouver — Portals & Dashboards | Perseus',
    description:
      'Custom web application development in Vancouver: customer portals, dashboards, internal tools, and booking systems — auth, databases, and integrations built to scale.',
    canonicalPath: `${SITE_URL}/services/websites/web-applications`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const websiteRedesign: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'website-redesign',
  title: 'Website Redesign',
  eyebrow: 'Websites · Redesign',
  heroHeadline: 'A better site —',
  heroHeadlineAccent: 'without losing what works.',
  heroSubtitle:
    'Rebuild or replatform an outdated site into something fast, modern, and on-brand — while keeping the content, rankings, and traffic you’ve already earned.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'A website redesign rebuilt on a modern, fast stack by Perseus Creative Studio.',
  intro: {
    heading: 'Your site shouldn’t feel older than your business.',
    body: 'A dated, slow site quietly costs you — visitors bounce, search rankings slip, and your brand looks behind. We modernize the design and rebuild on a faster foundation, carefully preserving the content and SEO equity you already have so a redesign moves you forward, not backward.',
    highlights: [
      'Modern design & faster stack',
      'Rankings & content preserved',
      'No traffic lost in the move',
      'Built to grow from here',
    ],
  },
  comparison: {
    heading: 'Drag to see the difference',
    description:
      'The same page, before and after a Perseus rebuild — sharper, faster, and clearer.',
    before: {
      imageUrl: '/navbar-website-2.jpeg',
      alt: 'The site before the redesign (illustrative).',
    },
    after: {
      imageUrl: '/navbar-website-2.jpeg',
      alt: 'The site after the Perseus redesign.',
    },
    degradeBefore: true,
  },
  stack: {
    heading: 'The foundation we move you to',
    description:
      'We rebuild on a modern, maintainable stack — and recommend whether to refresh your current platform or replatform entirely.',
    groups: [
      {
        label: 'Frontend',
        items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      },
      {
        label: 'Backend & CMS',
        items: ['Node.js', 'WordPress', 'Headless CMS', 'GraphQL'],
      },
      {
        label: 'Performance & SEO',
        items: [
          'Core Web Vitals',
          'Structured Data',
          'Accessibility (WCAG)',
          'Analytics',
        ],
      },
    ],
  },
  build: {
    heading: 'From audit to relaunch',
    description:
      'A careful sequence so the new site is better in every way — and nothing you’ve earned gets lost in the move.',
    steps: [
      {
        step: '01',
        title: 'Audit & plan',
        description:
          'We review the current site’s content, traffic, and rankings, and map what to keep, fix, and cut.',
      },
      {
        step: '02',
        title: 'Redesign',
        description:
          'A modern, on-brand design — sharper, faster, and built around how people actually use the site.',
      },
      {
        step: '03',
        title: 'Rebuild & preserve',
        description:
          'We rebuild on the new stack and protect SEO — URL mapping, redirects, metadata, and structure.',
      },
      {
        step: '04',
        title: 'Migrate & launch',
        description:
          'Content migration, a full QA pass, and a monitored launch with redirects verified so rankings hold.',
      },
    ],
  },
  outcomes: {
    heading: 'The jump a rebuild delivers',
    description:
      'A redesign isn’t just a fresh coat of paint — it fixes what’s dragging the old site down. Here’s the typical Lighthouse jump, before and after.',
    metrics: [
      {
        label: 'Performance',
        caption: '/ 100 Lighthouse',
        before: { value: '34', gauge: 34 },
        after: { value: '98', gauge: 98 },
      },
      {
        label: 'Accessibility',
        caption: '/ 100 WCAG',
        before: { value: '69', gauge: 69 },
        after: { value: '100', gauge: 100 },
      },
      {
        label: 'SEO',
        caption: '/ 100 on-page',
        before: { value: '61', gauge: 61 },
        after: { value: '100', gauge: 100 },
      },
    ],
  },
  builds: {
    heading: 'Choose the right kind of redesign',
    description:
      'Not every site needs a teardown. Tell us where yours is today and we’ll recommend the lightest move that gets you where you want to be.',
    note: 'Not sure which fits? Book a short call and we’ll audit your site and recommend the right path.',
    tiers: [
      {
        name: 'Refresh',
        bestFor:
          'A site that works but looks dated — modernize without rebuilding.',
        features: [
          'Updated visual design',
          'Cleaner layouts & type',
          'Stays on your current platform',
          'Speed & accessibility passes',
          'Quick turnaround',
        ],
        ctaLabel: 'Start a Refresh',
        ctaHref: '/contact',
      },
      {
        name: 'Full Redesign',
        bestFor:
          'A site that’s holding you back — new design, rebuilt properly.',
        featured: true,
        features: [
          'New design system',
          'Rebuilt on a modern stack',
          'SEO preserved & improved',
          'Content migration',
          'Performance & accessibility tuned',
          'Reusable components for growth',
        ],
        ctaLabel: 'Start a Redesign',
        ctaHref: '/contact',
      },
      {
        name: 'Replatform',
        bestFor: 'Moving off a slow or limiting platform onto a faster one.',
        features: [
          'Migration to a modern stack',
          'Full SEO & redirect plan',
          'Content & data migration',
          'Redesign along the way',
          'No-loss, monitored cutover',
        ],
        ctaLabel: 'Plan a Replatform',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'Will I lose my Google rankings?',
      answer:
        'Not if it’s done right — protecting rankings is a core part of the job. We map every URL, set up redirects, preserve metadata and structure, and verify it all at launch, so traffic and rankings carry over instead of dropping.',
    },
    {
      question: 'Can you keep my existing content?',
      answer:
        'Yes. We migrate the content worth keeping, tidy it where needed, and restructure it for the new design — you don’t start from a blank page unless you want to.',
    },
    {
      question: 'Refresh, full redesign, or replatform — which do I need?',
      answer:
        'It depends on the state of your site. A refresh modernizes the look on your current platform; a full redesign rebuilds it properly; a replatform moves you to a faster stack. We audit first and recommend the lightest move that meets your goals.',
    },
    {
      question: 'How long does a redesign take?',
      answer:
        'A refresh is quick; a full redesign or replatform takes longer because of design, rebuild, and migration. We confirm dated milestones in your proposal before we start.',
    },
    {
      question: 'Can you move me off WordPress (or onto it)?',
      answer:
        'Either direction. We replatform to a modern stack like Next.js for speed and flexibility, or onto WordPress when a familiar CMS suits your team better — migrating content and preserving SEO along the way.',
    },
    {
      question: 'Do I own the new site?',
      answer:
        'Completely — the design, the code, the content, and the accounts are yours, with no lock-in. We can maintain it with you or hand it fully to your team.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s modernize your site',
    description:
      'Share your current site and goals, and we’ll audit it, then recommend the right redesign — faster, sharper, and without losing your rankings.',
    primaryLabel: 'Start a Redesign',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-design',
      title: 'Website Design',
      tagline: 'Conversion-focused UX that turns visits into leads.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Conversion-focused website design shown in a browser by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'performance-seo-audit',
      title: 'Performance & SEO Audit',
      tagline: 'Core Web Vitals, speed, and technical-SEO fixes.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'Performance and technical-SEO audit of a website.',
      available: false,
    },
  ],
  seo: {
    title:
      'Website Redesign & Replatforming in Vancouver | Perseus Creative Studio',
    description:
      'Website redesign and replatforming in Vancouver — rebuild an outdated site into a fast, modern one while preserving your content, SEO, and rankings.',
    canonicalPath: `${SITE_URL}/services/websites/website-redesign`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const websiteMaintenance: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'website-maintenance',
  title: 'Website Maintenance',
  eyebrow: 'Websites · Care Plans',
  heroHeadline: 'Launched isn’t',
  heroHeadlineAccent: 'finished.',
  heroSubtitle:
    'A website needs looking after — updates, backups, security, and the small fixes that keep it fast and online. We handle all of it so your site stays healthy and you stay focused on your business.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'Ongoing website maintenance and care by Perseus Creative Studio.',
  intro: {
    heading: 'A site left alone slowly falls apart.',
    body: 'Software ages, plugins break, threats evolve, and small issues pile up until something goes down — usually at the worst moment. A care plan keeps your site updated, backed up, secure, and monitored, with a real person to call when you need a change. No surprises, no scramble.',
    highlights: [
      'Updates & backups, handled',
      'Security & uptime monitoring',
      'Small fixes & content edits',
      'A real person to call',
    ],
  },
  uptimeMonitor: {
    heading: 'Always on — and watched while you sleep.',
    description:
      'A care plan is a standing watch: updates applied, backups taken, and uptime monitored, with a real person on call. Here’s the kind of status we keep.',
    uptime: '99.98%',
    services: [
      { name: 'Website', status: 'Operational' },
      { name: 'Hosting & CDN', status: 'Operational' },
      { name: 'Forms & email', status: 'Operational' },
      { name: 'Backups', status: 'Nightly' },
    ],
    history: Array.from({ length: 90 }, (_, i) =>
      i === 41 ? 88 : i === 13 || i === 68 ? 97 : 100,
    ),
    chips: ['Nightly backups', 'Security patches', 'Uptime monitoring', '24h response'],
  },
  stack: {
    eyebrow: 'Coverage',
    heading: 'Everything we keep an eye on',
    description:
      'A care plan isn’t just “updates” — it’s a standing watch over the things that keep your site fast, safe, and online.',
    groups: [
      {
        label: 'Updates & Backups',
        items: [
          'Core & plugin updates',
          'Dependency updates',
          'Daily backups',
          'Uptime monitoring',
        ],
      },
      {
        label: 'Security',
        items: [
          'Security monitoring',
          'SSL & firewalls',
          'Malware scans',
          'Access control',
        ],
      },
      {
        label: 'Care & Support',
        items: [
          'Bug fixes',
          'Content edits',
          'Speed checks',
          'Priority support',
        ],
      },
    ],
  },
  builds: {
    heading: 'Choose your care plan',
    description:
      'Every site needs a different level of attention. Pick the plan that matches how critical your site is — you can move up or down anytime.',
    note: 'Plans are billed monthly with no long lock-in. Book a call and we’ll recommend the right level for your site.',
    tiers: [
      {
        name: 'Essential',
        bestFor:
          'Brochure and marketing sites that need to stay current and safe.',
        features: [
          'Core & plugin updates',
          'Weekly backups',
          'Uptime & security monitoring',
          'Monthly health check',
          'Email support',
        ],
        ctaLabel: 'Start Essential Care',
        ctaHref: '/contact',
      },
      {
        name: 'Growth',
        bestFor: 'Active sites that change often and can’t afford downtime.',
        featured: true,
        features: [
          'Everything in Essential',
          'Daily backups',
          'Small content & design edits',
          'Performance & SEO checks',
          'Priority response',
          'Monthly report',
        ],
        ctaLabel: 'Start Growth Care',
        ctaHref: '/contact',
      },
      {
        name: 'Priority',
        bestFor: 'Revenue-critical sites and stores where every minute counts.',
        features: [
          'Everything in Growth',
          'Real-time monitoring',
          'Same-day fixes',
          'Dedicated support contact',
          'Quarterly strategy review',
        ],
        ctaLabel: 'Start Priority Care',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'Do I really need a maintenance plan?',
      answer:
        'If your site matters to your business, yes. Software and plugins need regular updates, security threats are constant, and small issues compound. A care plan prevents the expensive emergencies that come from a site left untouched.',
    },
    {
      question: 'What’s actually included?',
      answer:
        'Updates, backups, security and uptime monitoring, and small fixes — plus content edits and performance checks on higher plans. The exact scope is set by the plan you choose, and we confirm it before we start.',
    },
    {
      question: 'Can you maintain a site you didn’t build?',
      answer:
        'Usually, yes. We start by reviewing your existing site to make sure it’s on a platform we can safely support, then take over updates, backups, and monitoring from there.',
    },
    {
      question: 'How do I request changes?',
      answer:
        'Just email us (or your dedicated contact on Priority). Small content and design edits are included on Growth and Priority; larger work is quoted separately so you’re always in control.',
    },
    {
      question: 'Is there a long-term contract?',
      answer:
        'No. Plans are month-to-month with a short notice period — stay because it’s worth it, not because you’re locked in. You can change levels as your needs change.',
    },
    {
      question: 'What happens if my site goes down?',
      answer:
        'Monitoring alerts us, and we act based on your plan’s response time — same-day on Growth, and as fast as possible with a dedicated contact on Priority. Regular backups mean we can restore quickly if needed.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s keep your site healthy',
    description:
      'Tell us about your site and how critical it is, and we’ll recommend the right care plan to keep it fast, secure, and online.',
    primaryLabel: 'Choose a Care Plan',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'performance-seo-audit',
      title: 'Performance & SEO Audit',
      tagline: 'Core Web Vitals, speed, and technical-SEO fixes.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt: 'Performance and technical-SEO audit of a website.',
      available: false,
    },
    {
      slug: 'website-redesign',
      title: 'Website Redesign',
      tagline:
        'Rebuild or replatform an existing site without losing rankings.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A website redesign rebuilt on a modern, fast stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
  ],
  seo: {
    title:
      'Website Maintenance & Care Plans in Vancouver | Perseus Creative Studio',
    description:
      'Website maintenance in Vancouver: updates, backups, security, uptime monitoring, and small fixes on monthly care plans — keeping your site fast, secure, and online.',
    canonicalPath: `${SITE_URL}/services/websites/website-maintenance`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const performanceSeoAudit: WebsiteServiceContent = {
  categorySlug: 'websites',
  categoryTitle: 'Websites',
  slug: 'performance-seo-audit',
  title: 'Performance & SEO Audit',
  eyebrow: 'Websites · Audit',
  heroHeadline: 'Find out what’s',
  heroHeadlineAccent: 'holding your site back.',
  heroSubtitle:
    'A deep audit of speed, technical SEO, and code health — with a prioritized, plain-English plan of what to fix first and the impact each fix will have. You can hand it to any developer, or have us do it.',
  heroImageUrl: '/navbar-website-2.jpeg',
  heroImageAlt:
    'A performance and technical-SEO audit of a website by Perseus Creative Studio.',
  intro: {
    heading: 'You can’t fix what you can’t see.',
    body: 'Slow pages and quiet technical issues bleed traffic and conversions without ever showing up as an obvious problem. We measure what’s actually happening — Core Web Vitals, crawlability, accessibility, and code health — then hand you a ranked roadmap so effort goes where it moves the numbers, not where it’s easy.',
    highlights: [
      'Measured, not guessed',
      'Prioritized by impact',
      'Plain-English roadmap',
      'Yours to keep — fix it anywhere',
    ],
  },
  coreWebVitals: {
    heading: 'The metrics Google actually grades.',
    description:
      'We measure the real thing — Core Web Vitals from field and lab data — and show exactly where you sit on each scale. This is a typical “before” we turn green.',
    metrics: [
      {
        label: 'LCP — Largest Contentful Paint',
        value: '4.1s',
        rating: 'poor',
        position: 84,
      },
      {
        label: 'INP — Interaction to Next Paint',
        value: '320ms',
        rating: 'needs-improvement',
        position: 60,
      },
      {
        label: 'CLS — Cumulative Layout Shift',
        value: '0.24',
        rating: 'poor',
        position: 88,
      },
      {
        label: 'TTFB — Time to First Byte',
        value: '1.6s',
        rating: 'needs-improvement',
        position: 58,
      },
    ],
  },
  stack: {
    eyebrow: 'What we check',
    heading: 'A full diagnostic, not a quick scan',
    description:
      'We go past the score and into the causes — across performance, technical SEO, and overall quality.',
    groups: [
      {
        label: 'Performance',
        items: [
          'Core Web Vitals',
          'Speed checks',
          'Image optimization',
          'Caching',
        ],
      },
      {
        label: 'Technical SEO',
        items: ['Crawlability', 'Metadata', 'Structured Data', 'Redirects'],
      },
      {
        label: 'Quality',
        items: [
          'Accessibility (WCAG)',
          'Best Practices',
          'Analytics',
          'Security',
        ],
      },
    ],
  },
  outcomes: {
    heading: 'Where you are vs where you could be',
    description:
      'The audit quantifies the gap: your site’s scores today against what’s achievable once the fixes we recommend are made.',
    metrics: [
      {
        label: 'Performance',
        caption: '/ 100 Lighthouse',
        before: { value: '52', gauge: 52 },
        after: { value: '95', gauge: 95 },
      },
      {
        label: 'Accessibility',
        caption: '/ 100 WCAG',
        before: { value: '74', gauge: 74 },
        after: { value: '100', gauge: 100 },
      },
      {
        label: 'SEO',
        caption: '/ 100 on-page',
        before: { value: '63', gauge: 63 },
        after: { value: '98', gauge: 98 },
      },
    ],
  },
  builds: {
    heading: 'Choose the audit you need',
    description:
      'Audit one area or get the full picture. Each comes with findings and a prioritized roadmap — tell us where it hurts.',
    note: 'Want us to do the fixes too? The audit credits toward the work if you have us implement it.',
    tiers: [
      {
        name: 'Performance Audit',
        bestFor: 'A site that feels slow and is losing visitors to load times.',
        features: [
          'Core Web Vitals deep-dive',
          'Speed & asset analysis',
          'Caching & image findings',
          'Prioritized fix list',
          'Before/after targets',
        ],
        ctaLabel: 'Get a Performance Audit',
        ctaHref: '/contact',
      },
      {
        name: 'Full Audit',
        bestFor: 'A complete health check across speed, SEO, and quality.',
        featured: true,
        features: [
          'Everything in Performance',
          'Technical SEO review',
          'Accessibility & best practices',
          'Analytics & tracking check',
          'Ranked roadmap with impact',
          'Walkthrough call',
        ],
        ctaLabel: 'Get a Full Audit',
        ctaHref: '/contact',
      },
      {
        name: 'SEO Audit',
        bestFor: 'A site that isn’t ranking or getting crawled properly.',
        features: [
          'Crawlability & indexing',
          'Metadata & structure',
          'Structured data review',
          'Redirects & link health',
          'Prioritized fix list',
        ],
        ctaLabel: 'Get an SEO Audit',
        ctaHref: '/contact',
      },
    ],
  },
  faqs: [
    {
      question: 'What do I actually get?',
      answer:
        'A clear report of what’s wrong and why it matters, plus a prioritized roadmap ranking each fix by impact and effort. It’s written in plain English, so you can act on it whether or not you’re technical.',
    },
    {
      question: 'Can I use the audit with my own developer?',
      answer:
        'Yes — that’s the point. The roadmap is yours to keep and hand to any developer. If you’d rather we implement it, we can, and the audit credits toward that work.',
    },
    {
      question: 'How is this different from running a free Lighthouse test?',
      answer:
        'A free test gives you a score; an audit tells you the causes and what to do about them. We dig past the number into the specific issues, prioritize them by real-world impact, and lay out the order to fix them.',
    },
    {
      question: 'Will fixing these things actually help my rankings and sales?',
      answer:
        'Speed, accessibility, and technical SEO all influence rankings and conversions. We focus the roadmap on the changes most likely to move traffic and revenue — and set realistic before/after targets so you can measure it.',
    },
    {
      question: 'How long does an audit take?',
      answer:
        'Most audits are delivered within about a week, depending on the size of the site and the scope you choose. We confirm the timeline before we start.',
    },
    {
      question: 'Do you audit any platform?',
      answer:
        'Yes — WordPress, custom builds, Shopify, and most common stacks. Tell us what your site’s built on and we’ll tailor the audit to it.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s see what’s slowing you down',
    description:
      'Share your site and we’ll audit its speed, SEO, and health, then hand you a prioritized plan of exactly what to fix first.',
    primaryLabel: 'Request an Audit',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Website services',
    secondaryHref: '/services/websites',
  },
  relatedServices: [
    {
      slug: 'website-redesign',
      title: 'Website Redesign',
      tagline:
        'Rebuild or replatform an existing site without losing rankings.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'A website redesign rebuilt on a modern, fast stack by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-maintenance',
      title: 'Website Maintenance',
      tagline: 'Updates, backups, security, and speed after launch.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Ongoing website maintenance and care by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'website-development',
      title: 'Website Development',
      tagline: 'Fast, secure, SEO-ready builds on modern stacks.',
      imageUrl: '/navbar-website-2.jpeg',
      imageAlt:
        'Website development on a modern, performance-focused stack by Perseus Creative Studio.',
      available: true,
    },
  ],
  seo: {
    title:
      'Website Performance & SEO Audit in Vancouver | Perseus Creative Studio',
    description:
      'A deep website performance and technical-SEO audit in Vancouver — Core Web Vitals, crawlability, accessibility, and a prioritized, plain-English roadmap of what to fix first.',
    canonicalPath: `${SITE_URL}/services/websites/performance-seo-audit`,
    ogImage: `${IMAGEKIT_BASE}/navbar-website-2.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

export const WEBSITE_SERVICES: Record<string, WebsiteServiceContent> = {
  'website-design': websiteDesign,
  'website-development': websiteDevelopment,
  'e-commerce': eCommerce,
  'landing-pages': landingPages,
  'web-applications': webApplications,
  'website-redesign': websiteRedesign,
  'website-maintenance': websiteMaintenance,
  'performance-seo-audit': performanceSeoAudit,
};
// ─────────────────────────────────────────────────────────────────────────
// DIGITAL MARKETING SERVICE DETAIL CONTENT
//
// Powers /services/digital-marketing/[service] via the Marketing template
// (snapshot hero → intro → levers → outcomes → reporting). Metric-forward, so
// the hero is a performance snapshot rather than a photo.
// ─────────────────────────────────────────────────────────────────────────
const seo: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'seo',
  title: 'SEO',
  eyebrow: 'Digital Marketing · SEO',
  heroHeadline: 'Traffic that compounds',
  heroHeadlineAccent: 'while you sleep.',
  heroSubtitle:
    'Search optimization that earns durable, qualified organic traffic — technical, content, and authority in one plan, measured against revenue, not vanity rankings.',
  // Metric-forward service: the hero is a performance snapshot, not a photo.
  // This image backs OG/social only; the page itself renders the chart panel.
  heroImageUrl: '/services-seo.png',
  heroImageAlt:
    'Search engine optimization dashboard showing organic ranking growth.',
  snapshot: {
    title: 'Performance snapshot',
    metrics: [
      {
        value: '+182%',
        label: 'Organic sessions',
        caption: 'trailing 6 months',
      },
      {
        value: 'Top 3',
        label: 'Priority keywords',
        caption: 'now on page one',
      },
    ],
    trend: [20, 26, 24, 33, 44, 52, 67, 84],
    trendLabel: 'Organic sessions, trailing 6 months',
  },
  intro: {
    heading: 'Rankings are the means. Revenue is the point.',
    body: 'Most SEO reports celebrate rankings nobody searches for. We work backwards from the keywords your buyers actually use, fix the technical foundation so search engines can read your site, and earn the content and authority that move you up the page — then tie it all to leads and sales, not vanity metrics.',
    highlights: [
      'Technical, content & authority in one plan',
      'Measured against revenue, not rankings alone',
      'White-hat and durable — no shortcuts',
      'You own every account and report',
    ],
  },
  serp: {
    heading: 'From page two to the top of page one.',
    description:
      'The work — technical fixes, intent-matched content, and earned authority — shows up in one place: your result climbing past the competition for the searches that bring buyers.',
    query: 'creative studio vancouver',
    results: [
      { title: 'Top agencies in Vancouver — directory listing', url: 'agencylist.com › vancouver' },
      { title: 'Vancouver creative & design studios (2025)', url: 'designwire.co › bc' },
      { title: 'Best marketing agencies near you', url: 'reviews.io › vancouver' },
      { title: 'Creative studio — Wikipedia', url: 'en.wikipedia.org › wiki' },
      { title: 'Perseus Creative Studio — Vancouver', url: 'perseustudio.com', you: true },
      { title: 'Find a freelancer in Vancouver', url: 'gigboard.com › bc' },
      { title: 'Local business listings — Vancouver', url: 'citypages.ca › creative' },
    ],
  },
  levers: {
    heading: 'What we actually optimize',
    description:
      'SEO isn’t one lever — it’s several working together. We prioritize the ones that move your numbers fastest, then compound the rest.',
    items: [
      {
        title: 'Technical SEO',
        description:
          'Crawlability, site speed, Core Web Vitals, and structured data so search engines can read and trust your site.',
      },
      {
        title: 'On-page & intent',
        description:
          'Pages mapped to real search intent, with titles, structure, and internal links that earn their ranking.',
      },
      {
        title: 'Content strategy',
        description:
          'Topic clusters that answer your buyers’ questions and attract links over time.',
      },
      {
        title: 'Authority & links',
        description:
          'Earned backlinks and digital PR that build the credibility Google rewards.',
      },
      {
        title: 'Local SEO',
        description:
          'Maps, listings, reviews, and location pages that win nearby, high-intent searches.',
      },
      {
        title: 'Measurement',
        description:
          'GA4, Search Console, and rank tracking wired up so every gain is attributable.',
      },
    ],
  },
  outcomes: {
    heading: 'Why SEO out-earns ads over time',
    description:
      'Paid traffic stops the moment you stop paying. Organic keeps working — here’s the impact it tends to drive.',
    stats: [
      {
        value: 'Compounding',
        label:
          'Organic traffic keeps growing long after the work, unlike ads that reset to zero when spend stops.',
      },
      {
        value: '40%',
        label:
          'Lower cost per lead than paid-only acquisition once organic matures.',
      },
      {
        value: '#1–3',
        label:
          'Page-one, top-three positions capture the overwhelming majority of clicks.',
      },
    ],
  },
  reporting: {
    heading: 'You always know what’s working',
    description:
      'No black box. Every month you get a clear read on movement, results, and what we’re doing next.',
    cadence: 'Monthly',
    items: [
      {
        title: 'Rankings & visibility',
        description:
          'Movement on your priority keywords and overall search visibility.',
      },
      {
        title: 'Traffic & engagement',
        description:
          'Organic sessions, quality of that traffic, and on-site behavior.',
      },
      {
        title: 'Conversions',
        description: 'Leads and sales attributed to organic, not just clicks.',
      },
      {
        title: 'What’s next',
        description:
          'What we did, what it moved, and the priorities for next month.',
      },
    ],
  },
  faqs: [
    {
      question: 'How long until SEO shows results?',
      answer:
        'SEO compounds, so it’s a few months rather than a few days — typically you’ll see early movement on lower-competition terms within the first months and meaningful traffic gains build from there. We report leading indicators early so you’re never left guessing.',
    },
    {
      question: 'How is SEO different from Google Ads?',
      answer:
        'Ads buy visibility instantly but stop the moment you stop paying; SEO earns visibility that keeps working and gets cheaper per lead over time. They work best together — ads capture demand now while SEO builds durable traffic — but they’re scoped separately.',
    },
    {
      question: 'Do you do technical SEO, content, and links — or just one?',
      answer:
        'All of it, in one plan. Technical fixes make your site readable, content earns the rankings, and authority (links and digital PR) makes them stick. Doing only one rarely moves the numbers.',
    },
    {
      question: 'How do you measure success?',
      answer:
        'Against revenue, not vanity rankings. We set up GA4, Search Console, and rank tracking from the start, then report on the keywords that matter, the quality of the traffic, and the leads and sales it drives.',
    },
    {
      question: 'Do you use white-hat methods?',
      answer:
        'Always. We don’t buy spammy links or chase loopholes that get sites penalized. Everything we do is durable, guideline-compliant SEO designed to hold up through algorithm updates.',
    },
    {
      question: 'Do I own the accounts and data?',
      answer:
        'Yes. We work inside your own Google Analytics, Search Console, and related accounts (or set them up in your name), so you keep full ownership of the data and history even if we part ways.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s grow your organic traffic',
    description:
      'Tell us your goals and we’ll audit where you stand, then map the technical, content, and authority work to move you up the page.',
    primaryLabel: 'Book an SEO Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'tracking-analytics',
      title: 'Tracking & Analytics',
      tagline: 'GA4, GTM, Semrush & Clarity — measurement you can trust.',
      imageUrl: '/services-ga4.png',
      imageAlt: 'Google Analytics 4 dashboard with conversion tracking.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
    },
  ],
  seo: {
    title:
      'SEO Services in Vancouver — Organic Growth | Perseus Creative Studio',
    description:
      'SEO in Vancouver: technical, content, and authority in one plan — durable, qualified organic traffic measured against revenue, not vanity rankings.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/seo`,
    ogImage: `${IMAGEKIT_BASE}/services-seo.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const googleAds: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'google-ads',
  title: 'Google Ads',
  eyebrow: 'Digital Marketing · Google Ads',
  heroHeadline: 'Show up the moment',
  heroHeadlineAccent: 'they’re ready to buy.',
  heroSubtitle:
    'Search and Performance Max campaigns that capture high-intent demand — people already looking for what you offer — and turn ad spend into tracked, profitable leads.',
  heroImageUrl: '/services-gads.png',
  heroImageAlt: 'Google Ads campaign performance overview.',
  snapshot: {
    title: 'Campaign snapshot',
    metrics: [
      {
        value: '4.2×',
        label: 'Return on ad spend',
        caption: 'trailing 90 days',
      },
      { value: '-38%', label: 'Cost per lead', caption: 'vs. account start' },
    ],
    trend: [24, 30, 28, 38, 47, 55, 70, 86],
    trendLabel: 'Conversions, last 8 weeks',
  },
  intro: {
    heading: 'Intent is the whole advantage.',
    body: 'Most advertising interrupts people who weren’t thinking about you. Search is the opposite — you reach someone the moment they’re actively looking. We structure campaigns around the keywords that convert, cut the ones that waste budget, and optimize to leads and sales, not clicks.',
    highlights: [
      'Search & Performance Max',
      'Tracked to revenue, not clicks',
      'Wasted-spend kept in check',
      'You own the account',
    ],
  },
  adPreview: {
    heading: 'The ad they see at the exact moment of intent.',
    description:
      'A search ad is a tiny piece of real estate doing a big job. We write the headline, the proof, and the sitelinks that earn the click from a buyer who’s already looking.',
    platform: 'google',
    brand: 'Perseus Creative Studio',
    displayUrl: 'www.perseustudio.com/services',
    headline: 'Vancouver Creative Studio — Web, Brand & Production',
    body: 'Strategy, design, and production under one roof. Conversion-focused sites and campaigns. Book a free scoping call.',
    cta: 'Get a quote',
    sitelinks: ['Web Design', 'Branding', 'Video Production', 'Digital Marketing'],
    stats: ['High-intent keywords', 'Tracked to revenue', 'You own the account'],
  },
  levers: {
    heading: 'What we manage',
    description:
      'A profitable account is a lot of small decisions made well, every week. Here’s what we own.',
    items: [
      {
        title: 'Strategy & structure',
        description:
          'Campaigns and ad groups built around how your buyers actually search.',
      },
      {
        title: 'Keyword & audience research',
        description:
          'The high-intent terms and audiences worth paying for — and the ones to exclude.',
      },
      {
        title: 'Ads & assets',
        description:
          'Responsive search ads, extensions, and Performance Max assets that earn the click.',
      },
      {
        title: 'Bidding & budget',
        description:
          'Bid strategy and pacing tuned to hit your cost-per-lead target.',
      },
      {
        title: 'Conversion tracking',
        description:
          'Proper tracking so every lead and sale is attributed — no guesswork.',
      },
      {
        title: 'Negatives & optimization',
        description:
          'Ongoing negative keywords and testing to cut waste and lift results.',
      },
    ],
  },
  outcomes: {
    heading: 'Why search ads earn their budget',
    description:
      'Paid search reaches demand that already exists — here’s the impact a well-run account tends to drive.',
    stats: [
      {
        value: '4×',
        label: 'Typical return on ad spend once campaigns are dialed in.',
      },
      {
        value: 'Days',
        label:
          'Not months — paid search can drive qualified leads within days of launch.',
      },
      {
        value: '100%',
        label:
          'Of spend tracked to conversions, so every dollar is accountable.',
      },
    ],
  },
  reporting: {
    heading: 'You see exactly where the money goes',
    description:
      'No vanity dashboards — a clear monthly read on spend, results, and what we’re changing next.',
    cadence: 'Monthly',
    items: [
      {
        title: 'Spend & ROAS',
        description: 'What you spent and what it returned, plainly.',
      },
      {
        title: 'Conversions & CPL',
        description: 'Leads and sales, and what each one cost.',
      },
      {
        title: 'Search terms & waste',
        description: 'What people actually searched, and what we cut.',
      },
      {
        title: 'What’s next',
        description: 'The tests and changes planned for next month.',
      },
    ],
  },
  faqs: [
    {
      question: 'How much should I budget for Google Ads?',
      answer:
        'It depends on your market and goals — competitive industries cost more per click. We recommend a media budget based on your targets, keep our management fee transparent and separate, and make sure you’re never spending into channels that aren’t working.',
    },
    {
      question: 'How soon will I see results?',
      answer:
        'Faster than SEO — search ads can drive traffic and leads within days of launch. The first few weeks gather data; from there we optimize toward a steady, profitable cost per lead.',
    },
    {
      question: 'How do you measure success?',
      answer:
        'Against revenue. We set up conversion tracking from the start and report on cost per lead, conversion rate, and return on ad spend — not impressions or clicks for their own sake.',
    },
    {
      question: 'Do I keep ownership of the account?',
      answer:
        'Always. We work inside your own Google Ads account (or set one up in your name), so you keep the account, data, and history even if we part ways.',
    },
    {
      question: 'Search, Performance Max, or both?',
      answer:
        'Usually Search first — it captures the highest-intent demand — then Performance Max to expand reach across Google’s networks once tracking and creative are solid. We recommend the mix based on your goals and budget.',
    },
    {
      question: 'Can you take over an existing account?',
      answer:
        'Yes. We start with an audit, keep what’s working, fix what isn’t, and lay out the plan before making changes — we don’t reset your history on day one.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s capture demand that’s already there',
    description:
      'Tell us your goals and we’ll map the campaigns, budget, and tracking to turn Google searches into profitable leads.',
    primaryLabel: 'Book a Google Ads Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: true,
    },
    {
      slug: 'meta-ads',
      title: 'Meta Ads',
      tagline: 'Facebook & Instagram ads that find and convert your audience.',
      imageUrl: '/services-meta.png',
      imageAlt:
        'Meta Ads Manager interface for Facebook and Instagram campaigns.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
    },
  ],
  seo: {
    title:
      'Google Ads Management in Vancouver — Search & PMax | Perseus Creative Studio',
    description:
      'Google Ads management in Vancouver: Search and Performance Max campaigns built around high-intent keywords, tracked to revenue and tuned for a profitable cost per lead.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/google-ads`,
    ogImage: `${IMAGEKIT_BASE}/services-gads.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const metaAds: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'meta-ads',
  title: 'Meta Ads',
  eyebrow: 'Digital Marketing · Meta Ads',
  heroHeadline: 'Put your brand in front of',
  heroHeadlineAccent: 'the right people.',
  heroSubtitle:
    'Facebook and Instagram ads that pair scroll-stopping creative with precise targeting — reaching the audience that doesn’t know you yet and converting the ones who do.',
  heroImageUrl: '/services-meta.png',
  heroImageAlt: 'Meta Ads Manager interface for Facebook and Instagram campaigns.',
  snapshot: {
    title: 'Campaign snapshot',
    metrics: [
      { value: '3.6×', label: 'Return on ad spend', caption: 'trailing 90 days' },
      { value: '-32%', label: 'Cost per acquisition', caption: 'vs. account start' },
    ],
    trend: [22, 28, 26, 36, 44, 53, 66, 82],
    trendLabel: 'Purchases, last 8 weeks',
  },
  intro: {
    heading: 'Great targeting wastes great creative — and vice versa.',
    body: 'Meta rewards the brands that get both right. We build a tested funnel — cold audiences discovering you, warm ones being nudged, and past visitors retargeted — then feed it creative built to stop the scroll. Everything is tracked to conversions, not likes.',
    highlights: [
      'Facebook & Instagram',
      'Creative built to stop the scroll',
      'Audience testing & retargeting',
      'Tracked to revenue',
    ],
  },
  adPreview: {
    heading: 'Creative built to stop the scroll.',
    description:
      'On Meta, the ad is the campaign. We pair scroll-stopping creative with a tested funnel so the right people meet a brand worth tapping — then track it to purchases, not likes.',
    platform: 'meta',
    brand: 'Perseus Creative Studio',
    displayUrl: 'perseustudio.com',
    headline:
      'Your brand deserves more than a template. See what a senior studio ships in 30 days. 👇',
    body: 'Book a free scoping call',
    cta: 'Learn more',
    imageUrl: '/services-photography.jpeg',
    imageAlt: 'A Perseus Creative Studio brand campaign creative.',
    stats: ['Facebook & Instagram', 'Funnel-tested', 'Tracked to revenue'],
  },
  levers: {
    heading: 'What we manage',
    description:
      'Performance on Meta is a loop of creative, audiences, and measurement. We run all three.',
    items: [
      {
        title: 'Funnel & strategy',
        description:
          'Cold, warm, and retargeting stages mapped to how people actually buy.',
      },
      {
        title: 'Audience testing',
        description:
          'Interest, lookalike, and custom audiences — tested to find what converts.',
      },
      {
        title: 'Ad creative',
        description:
          'Static and video concepts designed for the feed, Reels, and Stories.',
      },
      {
        title: 'Tracking setup',
        description:
          'Pixel and the Conversions API wired up so results survive iOS limits.',
      },
      {
        title: 'Retargeting & exclusions',
        description:
          'Re-engage warm audiences and stop paying to reach the wrong ones.',
      },
      {
        title: 'Budget & optimization',
        description:
          'Scaling the winners and cutting the losers, week over week.',
      },
    ],
  },
  outcomes: {
    heading: 'Why Meta still works when it’s run right',
    description:
      'The platforms are crowded, but precise targeting and strong creative still win — here’s the impact.',
    stats: [
      {
        value: '4×',
        label: 'Return on ad spend once creative and audiences are dialed in.',
      },
      {
        value: 'Always-on',
        label:
          'A testing engine that keeps surfacing new winning audiences and creative.',
      },
      {
        value: '100%',
        label: 'Conversions tracked via the Pixel and Conversions API.',
      },
    ],
  },
  reporting: {
    heading: 'Clear on spend, results, and what’s winning',
    description:
      'Every month you see where the budget went, what it returned, and which creative and audiences are carrying it.',
    cadence: 'Monthly',
    items: [
      {
        title: 'Spend & ROAS',
        description: 'What you spent and what it returned.',
      },
      {
        title: 'Conversions & CPA',
        description: 'Purchases or leads, and what each one cost.',
      },
      {
        title: 'Creative & audience winners',
        description: 'What’s working — and what we’re scaling.',
      },
      {
        title: 'What’s next',
        description: 'The tests and creative planned for next month.',
      },
    ],
  },
  faqs: [
    {
      question: 'Who makes the ad creative?',
      answer:
        'We do — and it’s half the battle on Meta. We concept and produce static and video ads designed for the feed, Reels, and Stories, or work with assets you provide. Our in-house production team can shoot purpose-built content when a campaign needs it.',
    },
    {
      question: 'How much should I budget?',
      answer:
        'Enough to exit the testing phase with clear signal — we recommend a media budget based on your goals and keep our management fee transparent and separate. We won’t scale spend until the creative and audiences are proven.',
    },
    {
      question: 'How soon will I see results?',
      answer:
        'The first few weeks are testing to find winning audiences and creative; from there we scale what works. You’ll see early signal quickly, with performance compounding as the account matures.',
    },
    {
      question: 'Does tracking still work after the iOS changes?',
      answer:
        'Yes. We set up the Conversions API alongside the Pixel so conversions are measured server-side, which recovers much of the data lost to iOS opt-outs and keeps optimization accurate.',
    },
    {
      question: 'How is this different from social media management?',
      answer:
        'This is paid — ads you put budget behind to reach new audiences. Growing your organic following through content and community is our social media management service. They work well together but are scoped separately.',
    },
    {
      question: 'Do I keep ownership of the account?',
      answer:
        'Always. Campaigns run in your own Meta Business account, so you keep the account, audiences, and data even if we part ways.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s build a Meta engine that scales',
    description:
      'Tell us your goals and we’ll map the funnel, creative, and tracking to turn Facebook and Instagram into a reliable source of customers.',
    primaryLabel: 'Book a Meta Ads Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
    },
  ],
  seo: {
    title:
      'Meta Ads Management in Vancouver — Facebook & Instagram | Perseus',
    description:
      'Meta Ads management in Vancouver: Facebook and Instagram campaigns pairing scroll-stopping creative with precise targeting, tracked to revenue with Pixel + Conversions API.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/meta-ads`,
    ogImage: `${IMAGEKIT_BASE}/services-meta.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const linkedinAds: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'linkedin-ads',
  title: 'LinkedIn Ads',
  eyebrow: 'Digital Marketing · LinkedIn Ads',
  heroHeadline: 'Reach the people who',
  heroHeadlineAccent: 'actually sign off.',
  heroSubtitle:
    'B2B campaigns that target decision-makers by role, company, and industry — fewer leads, but the kind worth real money to your pipeline.',
  heroImageUrl: '/services-linkedin.png',
  heroImageAlt: 'LinkedIn Ads campaign targeting business decision-makers.',
  snapshot: {
    title: 'Campaign snapshot',
    metrics: [
      { value: '2.8×', label: 'Pipeline to spend', caption: 'trailing quarter' },
      { value: '+41%', label: 'Lead quality (MQL rate)', caption: 'vs. broad targeting' },
    ],
    trend: [26, 32, 30, 39, 46, 54, 67, 80],
    trendLabel: 'Qualified leads, last 8 weeks',
  },
  intro: {
    heading: 'In B2B, who you reach matters more than how many.',
    body: 'A handful of the right people beats thousands of the wrong ones. LinkedIn lets you target by job title, seniority, company, and industry — so budget reaches buyers and decision-makers, not everyone. We pair that precision with lead-gen forms and content an exec will actually stop for.',
    highlights: [
      'Target by role, company & industry',
      'Lead-gen forms & ABM',
      'Built for considered B2B buys',
      'Tracked to pipeline, not clicks',
    ],
  },
  adPreview: {
    heading: 'The post a decision-maker actually stops for.',
    description:
      'B2B targeting is only half the job — the creative has to earn an exec’s attention. We write promoted content that targets by role and company, then ties every lead back to pipeline.',
    platform: 'linkedin',
    brand: 'Perseus Creative Studio',
    displayUrl: '4,210 followers · Promoted',
    headline:
      'Your website is your hardest-working salesperson. Is it closing — or costing you? Here’s how we rebuild B2B sites that convert.',
    body: 'A senior studio for B2B brands',
    cta: 'Download',
    imageUrl: '/navbar-website-2.jpeg',
    imageAlt: 'A Perseus Creative Studio B2B website project.',
    stats: ['Role & company targeting', 'ABM-ready', 'Tracked to pipeline'],
  },
  levers: {
    heading: 'What we manage',
    description:
      'B2B has long cycles and high stakes — these are the levers that turn LinkedIn into real pipeline.',
    items: [
      {
        title: 'Targeting & ABM',
        description:
          'Role, seniority, and company targeting — including account lists for ABM.',
      },
      {
        title: 'Strategy & objectives',
        description:
          'Campaigns matched to the stage of the buying journey you’re funding.',
      },
      {
        title: 'Ad formats',
        description:
          'Sponsored content, document ads, and conversation/message ads.',
      },
      {
        title: 'Lead-gen & CRM sync',
        description:
          'Native lead forms piped straight into your CRM for fast follow-up.',
      },
      {
        title: 'Content & creative',
        description:
          'Hooks and assets credible enough to earn a busy professional’s click.',
      },
      {
        title: 'Bidding & optimization',
        description:
          'Managing LinkedIn’s higher costs toward an efficient cost per qualified lead.',
      },
    ],
  },
  outcomes: {
    heading: 'Why B2B brands pay LinkedIn’s premium',
    description:
      'Clicks cost more here — but so do the customers. Precision is what makes the math work.',
    stats: [
      {
        value: 'By title',
        label: 'Reach buyers by exact role, seniority, and company — not guesswork.',
      },
      {
        value: 'Higher-value',
        label: 'Fewer leads, but each worth far more to a B2B pipeline.',
      },
      {
        value: '100%',
        label: 'Leads synced to your CRM and tracked through to pipeline.',
      },
    ],
  },
  reporting: {
    heading: 'Reported against pipeline, not popularity',
    description:
      'Every month: what you spent, the quality of what came back, and where we’re focusing next.',
    cadence: 'Monthly',
    items: [
      {
        title: 'Spend & pipeline',
        description: 'Budget in, and the pipeline value it influenced.',
      },
      {
        title: 'Leads & quality',
        description: 'Lead volume and how many were genuinely qualified.',
      },
      {
        title: 'Audience & content',
        description: 'Which roles, companies, and assets performed.',
      },
      {
        title: 'What’s next',
        description: 'The targeting and creative tests planned next.',
      },
    ],
  },
  faqs: [
    {
      question: 'Isn’t LinkedIn expensive?',
      answer:
        'Cost per click is higher than other platforms — but so is the value of a B2B customer. The point isn’t cheap clicks; it’s reaching the exact decision-makers who can say yes. For considered, higher-ticket B2B sales, the math usually works.',
    },
    {
      question: 'Who is LinkedIn Ads right for?',
      answer:
        'B2B businesses selling to specific roles or industries — professional services, SaaS, B2B products, and high-value services. If your buyers are identifiable by job title and company, LinkedIn’s targeting is hard to beat.',
    },
    {
      question: 'How much should I budget?',
      answer:
        'LinkedIn has higher minimums than other platforms, so we recommend a budget that can gather real signal without burning out. We set it against your pipeline goals and keep our management fee transparent and separate.',
    },
    {
      question: 'Do the lead forms connect to our CRM?',
      answer:
        'Yes. LinkedIn’s native lead-gen forms capture details in-platform (which lifts conversion), and we sync them into your CRM so sales can follow up while interest is warm.',
    },
    {
      question: 'Do you handle the content and creative?',
      answer:
        'Yes. We write the hooks and produce the assets — and credibility matters more here than flash. We can also work from your existing content or case studies where they fit.',
    },
    {
      question: 'Do we keep ownership of the account?',
      answer:
        'Always. Campaigns run in your own LinkedIn Campaign Manager account, so the account, audiences, and data stay yours.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s reach the decision-makers',
    description:
      'Tell us who you sell to and we’ll build the targeting, formats, and tracking to turn LinkedIn into qualified B2B pipeline.',
    primaryLabel: 'Book a LinkedIn Ads Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'meta-ads',
      title: 'Meta Ads',
      tagline: 'Facebook & Instagram ads that find and convert your audience.',
      imageUrl: '/services-meta.png',
      imageAlt: 'Meta Ads Manager interface for Facebook and Instagram campaigns.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
    },
  ],
  seo: {
    title:
      'LinkedIn Ads Management in Vancouver — B2B Campaigns | Perseus',
    description:
      'LinkedIn Ads management in Vancouver: B2B campaigns targeting decision-makers by role, company, and industry — lead-gen forms, ABM, and reporting tied to pipeline.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/linkedin-ads`,
    ogImage: `${IMAGEKIT_BASE}/services-linkedin.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const trackingAnalytics: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'tracking-analytics',
  title: 'Tracking & Analytics',
  eyebrow: 'Digital Marketing · Analytics',
  heroHeadline: 'Decisions are only as good',
  heroHeadlineAccent: 'as the data behind them.',
  heroSubtitle:
    'A clean measurement foundation — GA4, Tag Manager, and server-side tracking — so every conversion is captured and every number you act on is one you can trust.',
  heroImageUrl: '/services-ga4.png',
  heroImageAlt: 'Google Analytics 4 dashboard with conversion tracking.',
  snapshot: {
    title: 'Measurement snapshot',
    metrics: [
      { value: '100%', label: 'Conversions tracked', caption: 'client + server' },
      { value: '1', label: 'Source of truth', caption: 'GA4 · GTM · CRM' },
    ],
    trend: [30, 38, 44, 52, 61, 70, 82, 96],
    trendLabel: 'Tracked conversions, last 8 weeks',
  },
  intro: {
    heading: 'If you can’t trust the data, you’re flying blind.',
    body: 'Most accounts quietly leak data — untracked conversions, broken tags, double-counting, and now privacy changes eroding what’s left. We rebuild the foundation properly: clean GA4 and Tag Manager, server-side tracking, and consent handled right, so the numbers in your reports actually reflect reality.',
    highlights: [
      'GA4 & Google Tag Manager',
      'Server-side & consent-aware',
      'Conversions tracked end-to-end',
      'Dashboards you’ll actually use',
    ],
  },
  eventFlow: {
    heading: 'One event, tracked everywhere it matters.',
    description:
      'A single action fires once and flows — through Tag Manager and a server-side layer — into every tool that needs it, consent-aware and de-duplicated. No more numbers that disagree.',
    code: [
      "dataLayer.push({",
      "  event: 'purchase',",
      "  value: 4200,",
      "  currency: 'CAD',",
      "  items: [/* … */],",
      "});",
    ],
    pipeline: [
      { label: 'User action', detail: 'Purchase' },
      { label: 'dataLayer', detail: 'Typed event' },
      { label: 'GTM', detail: 'Client + server' },
    ],
    destinations: ['GA4', 'Google Ads', 'Meta CAPI', 'CRM', 'Looker Studio'],
  },
  levers: {
    heading: 'What we set up',
    description:
      'Measurement is plumbing — invisible when it works, expensive when it doesn’t. Here’s what we build.',
    items: [
      {
        title: 'GA4 & GTM',
        description:
          'A clean Analytics 4 and Tag Manager setup, structured to your business.',
      },
      {
        title: 'Conversion & event tracking',
        description:
          'Every key action defined and tracked — forms, calls, purchases, and more.',
      },
      {
        title: 'Server-side tracking',
        description:
          'Conversions API and server-side tags that survive ad-blockers and iOS.',
      },
      {
        title: 'Consent & privacy',
        description:
          'Consent Mode and privacy-aware tracking that respects regulations.',
      },
      {
        title: 'Dashboards & reporting',
        description:
          'Clear Looker Studio dashboards that answer your real questions.',
      },
      {
        title: 'Attribution & QA',
        description:
          'Sensible attribution and a thorough audit so the data is trustworthy.',
      },
    ],
  },
  outcomes: {
    heading: 'Why clean measurement pays for itself',
    description:
      'Good tracking doesn’t just report performance — it’s what lets every other channel be optimized at all.',
    stats: [
      {
        value: 'Trustworthy',
        label: 'Numbers you can actually make decisions on, not guesses.',
      },
      {
        value: 'End-to-end',
        label: 'Every key action tracked from first click to conversion.',
      },
      {
        value: 'Privacy-safe',
        label: 'Consent-aware tracking that respects regulations and ad-platform rules.',
      },
    ],
  },
  reporting: {
    heading: 'Your numbers, in one place',
    description:
      'We don’t just collect data — we make it usable, with dashboards and a monthly read on what it’s telling you.',
    cadence: 'Monthly',
    items: [
      {
        title: 'KPI dashboard',
        description: 'A live view of the metrics that matter to you.',
      },
      {
        title: 'Conversion health',
        description: 'Confirmation that tracking is accurate and complete.',
      },
      {
        title: 'Channel performance',
        description: 'Where traffic and conversions are really coming from.',
      },
      {
        title: 'Recommendations',
        description: 'What the data suggests you do next.',
      },
    ],
  },
  faqs: [
    {
      question: 'We’re still on Universal Analytics — can you migrate us?',
      answer:
        'Yes. Universal Analytics has stopped collecting data, so we set up GA4 properly (not just the default install), rebuild your key conversions and events, and configure it around how your business actually works.',
    },
    {
      question: 'What is server-side tracking and do I need it?',
      answer:
        'It moves tracking from the browser to a server you control, which recovers conversions lost to ad-blockers, iOS opt-outs, and cookie limits. If you run paid ads or care about accurate numbers, it’s increasingly essential.',
    },
    {
      question: 'How do you handle privacy and consent?',
      answer:
        'We implement Consent Mode and privacy-aware tracking so analytics respects user choices and regional regulations — measuring what you’re allowed to, the right way, without breaking compliance.',
    },
    {
      question: 'Do I own the data and accounts?',
      answer:
        'Completely. Everything is set up in your own Google and analytics accounts, so the data, history, and configuration stay yours.',
    },
    {
      question: 'Does this work alongside our ad campaigns?',
      answer:
        'That’s the point — clean tracking is what makes ad optimization possible. Whether we run your campaigns or someone else does, accurate measurement makes every channel perform better.',
    },
    {
      question: 'What tools do you use?',
      answer:
        'GA4 and Google Tag Manager at the core, server-side tagging where it helps, Looker Studio for dashboards, and tools like Microsoft Clarity for behavior — chosen to fit your stack, not the other way around.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s get your numbers right',
    description:
      'Tell us what you need to measure and we’ll build a clean, trustworthy tracking and reporting setup you can actually run your decisions on.',
    primaryLabel: 'Book an Analytics Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: true,
    },
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'conversion-rate-optimization',
      title: 'Conversion Optimization',
      tagline: 'Landing-page and funnel testing that lifts conversion rates.',
      imageUrl: '/services-gsc.png',
      imageAlt: 'A/B test results showing improved conversion rate.',
      available: true,
    },
  ],
  seo: {
    title:
      'Tracking & Analytics in Vancouver — GA4, GTM & Server-Side | Perseus',
    description:
      'Analytics and conversion tracking in Vancouver: GA4, Google Tag Manager, server-side tracking, consent, and Looker Studio dashboards — measurement you can trust.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/tracking-analytics`,
    ogImage: `${IMAGEKIT_BASE}/services-ga4.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const conversionRateOptimization: MarketingServiceContent = {
  categorySlug: 'digital-marketing',
  categoryTitle: 'Digital Marketing',
  slug: 'conversion-rate-optimization',
  title: 'Conversion Optimization',
  eyebrow: 'Digital Marketing · CRO',
  heroHeadline: 'Get more from the',
  heroHeadlineAccent: 'traffic you already have.',
  heroSubtitle:
    'Conversion optimization turns existing visitors into more customers — research, testing, and refinement that lift your conversion rate without spending a dollar more on traffic.',
  heroImageUrl: '/services-gsc.png',
  heroImageAlt: 'A/B test results showing improved conversion rate.',
  snapshot: {
    title: 'Optimization snapshot',
    metrics: [
      { value: '+34%', label: 'Conversion rate', caption: 'after 3 tests' },
      { value: '-26%', label: 'Cost per acquisition', caption: 'same traffic' },
    ],
    trend: [40, 44, 43, 50, 57, 63, 72, 84],
    trendLabel: 'Conversion rate, last 8 weeks',
  },
  intro: {
    heading: 'Doubling traffic is hard. Lifting conversion is cheaper.',
    body: 'Every visitor you’ve already earned is a chance to convert — and most sites lose them at the same predictable points. We find the friction with real data, test fixes against the current page, and keep only what wins. The gains compound, and they don’t cost more traffic.',
    highlights: [
      'Research-led, not guesswork',
      'A/B & multivariate testing',
      'Lifts every channel’s ROI',
      'Compounding, kept-forever gains',
    ],
  },
  funnel: {
    heading: 'Same traffic. More customers at every step.',
    description:
      'We find where visitors drop off, test fixes against the live page, and keep only what wins. Watch the optimized funnel grow over the original — no extra ad spend required.',
    uplift: '+73% purchases — same traffic',
    stages: [
      { label: 'Visitors', value: '100%', before: 100, after: 100 },
      { label: 'Product / service views', value: '68%', before: 62, after: 68 },
      { label: 'Added to cart / enquiry', value: '26%', before: 18, after: 26 },
      { label: 'Reached checkout', value: '15%', before: 9, after: 15 },
      { label: 'Converted', value: '7.8%', before: 4.5, after: 7.8 },
    ],
  },
  levers: {
    heading: 'How we lift conversion',
    description:
      'CRO is a loop, not a one-off redesign — find the leak, test a fix, keep the winner, repeat.',
    items: [
      {
        title: 'Conversion research',
        description:
          'A data-led audit of where and why visitors drop off before converting.',
      },
      {
        title: 'Heatmaps & sessions',
        description:
          'Heatmaps and session recordings that show how people actually behave.',
      },
      {
        title: 'Hypotheses & test plan',
        description:
          'Prioritized experiments — biggest likely impact, ranked first.',
      },
      {
        title: 'A/B & multivariate tests',
        description:
          'Controlled tests against the live page, so wins are proven, not assumed.',
      },
      {
        title: 'Page & funnel optimization',
        description:
          'Copy, layout, forms, and flow refined where it moves the needle.',
      },
      {
        title: 'Analysis & iteration',
        description:
          'Ship the winners, learn from the rest, and line up the next test.',
      },
    ],
  },
  outcomes: {
    heading: 'Why CRO is the highest-leverage spend',
    description:
      'A higher conversion rate makes everything else you do worth more — here’s why it pays off.',
    stats: [
      {
        value: 'Same traffic',
        label: 'More conversions from the visitors you already have — no extra spend.',
      },
      {
        value: 'Compounding',
        label: 'Each winning test stacks on the last, permanently.',
      },
      {
        value: 'Every channel',
        label: 'A higher conversion rate lifts the ROI of SEO, ads, and social alike.',
      },
    ],
  },
  reporting: {
    heading: 'Every test, measured honestly',
    description:
      'You see what we tested, what won, what didn’t, and what it added up to — no cherry-picking.',
    cadence: 'Monthly',
    items: [
      {
        title: 'Tests run & results',
        description: 'What we tested and whether it beat the control.',
      },
      {
        title: 'Conversion rate',
        description: 'The trend that matters, over time.',
      },
      {
        title: 'Wins shipped',
        description: 'The improvements now live on your site.',
      },
      {
        title: 'Next hypotheses',
        description: 'The experiments queued up next.',
      },
    ],
  },
  faqs: [
    {
      question: 'How much traffic do I need for CRO?',
      answer:
        'Enough for tests to reach statistical significance in a reasonable time. Lower-traffic sites can still benefit — we lean more on research, best practices, and bigger swings rather than fine-grained A/B tests until the volume is there.',
    },
    {
      question: 'How long until I see results?',
      answer:
        'Each test needs time to gather enough data to trust — usually a few weeks. Early research often surfaces quick wins, and results compound as more tests ship over the following months.',
    },
    {
      question: 'What do you actually test?',
      answer:
        'Whatever the data points to — headlines, page layout, calls to action, forms, pricing presentation, checkout steps, and overall flow. We prioritize by likely impact, not opinion.',
    },
    {
      question: 'Does CRO work with my ad campaigns?',
      answer:
        'Hand in hand. Ads and SEO bring the traffic; CRO makes more of it convert — which lowers your cost per acquisition and lifts the return on every channel at once.',
    },
    {
      question: 'Who implements the changes?',
      answer:
        'We do. We run the tests and ship the winning variations, working with your site or ours. You approve what goes live, and the improvements stay yours.',
    },
    {
      question: 'What tools do you use?',
      answer:
        'Analytics (GA4), heatmap and session tools, and A/B testing platforms suited to your stack — backed by the clean tracking that makes test results trustworthy in the first place.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s convert more of what you’ve got',
    description:
      'Tell us where your traffic comes from and we’ll find the friction, test the fixes, and lift your conversion rate — no extra ad spend required.',
    primaryLabel: 'Book a CRO Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Digital Marketing services',
    secondaryHref: '/services/digital-marketing',
  },
  relatedServices: [
    {
      slug: 'tracking-analytics',
      title: 'Tracking & Analytics',
      tagline: 'GA4, GTM, Semrush & Clarity — measurement you can trust.',
      imageUrl: '/services-ga4.png',
      imageAlt: 'Google Analytics 4 dashboard with conversion tracking.',
      available: true,
    },
    {
      slug: 'google-ads',
      title: 'Google Ads',
      tagline:
        'Search & Performance Max campaigns that capture high-intent demand.',
      imageUrl: '/services-gads.png',
      imageAlt: 'Google Ads campaign performance overview.',
      available: true,
    },
    {
      slug: 'seo',
      title: 'SEO',
      tagline: 'Higher rankings and qualified organic traffic that compounds.',
      imageUrl: '/services-seo.png',
      imageAlt: 'Search engine optimization dashboard showing ranking growth.',
      available: true,
    },
  ],
  seo: {
    title:
      'Conversion Rate Optimization in Vancouver — CRO & A/B Testing | Perseus',
    description:
      'Conversion rate optimization in Vancouver: research, A/B testing, and funnel refinement that turn existing traffic into more customers — lifting ROI without more ad spend.',
    canonicalPath: `${SITE_URL}/services/digital-marketing/conversion-rate-optimization`,
    ogImage: `${IMAGEKIT_BASE}/services-gsc.png?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

export const MARKETING_SERVICES: Record<string, MarketingServiceContent> = {
  seo,
  'google-ads': googleAds,
  'meta-ads': metaAds,
  'linkedin-ads': linkedinAds,
  'tracking-analytics': trackingAnalytics,
  'conversion-rate-optimization': conversionRateOptimization,
};
// ─────────────────────────────────────────────────────────────────────────
// SOCIAL MEDIA SERVICE DETAIL CONTENT
//
// Powers /services/social/[service] via the Social template (feed hero →
// intro → cadence → what-we-manage → outcomes). Feed/calendar-driven, so the
// hero is a profile-style content grid.
// ─────────────────────────────────────────────────────────────────────────
const socialMediaManagement: SocialServiceContent = {
  categorySlug: 'social',
  categoryTitle: 'Social Media',
  slug: 'social-media-management',
  title: 'Social Media Management',
  eyebrow: 'Social · Management',
  heroHeadline: 'Show up like a brand,',
  heroHeadlineAccent: 'not an afterthought.',
  heroSubtitle:
    'Strategy, content, and community — handled. We keep your accounts consistently active and on-brand with a calendar you approve, so your social presence finally looks as good as your business.',
  heroImageUrl: '/services-smm.jpeg',
  heroImageAlt:
    'Social media content planned and scheduled across platforms by Perseus Creative Studio.',
  feed: {
    name: 'Perseus Creative Studio',
    handle: '@perseusstudio',
    stats: [
      { value: '210', label: 'posts' },
      { value: '3,400', label: 'followers' },
      { value: '6.1%', label: 'engagement' },
    ],
    tiles: [
      {
        tag: 'Reel',
        imageUrl: '/services-smm.jpeg',
        caption: 'Behind the scenes of a brand shoot.',
      },
      { tag: 'Carousel', caption: '5 lessons from our last launch' },
      { tag: 'Quote', caption: '“Show up before you feel ready.”' },
      {
        tag: 'Photo',
        imageUrl: '/services-contentcreation.jpeg',
        caption: 'Creator collaboration feature.',
      },
      { tag: 'Story', caption: 'Poll: which direction — A or B?' },
      { tag: 'Reel', caption: '30-second studio tour' },
    ],
  },
  intro: {
    heading: 'Consistency is the strategy most brands skip.',
    body: 'Posting when you remember to doesn’t build an audience. We run your social like a channel — a clear strategy, a content calendar planned a month ahead, on-brand creative, and real community management — so your accounts stay active, recognizable, and worth following.',
    highlights: [
      'A real strategy, not random posts',
      'A calendar you approve in advance',
      'On-brand content, captions & community',
      'Reporting tied to business goals',
    ],
  },
  cadence: {
    heading: 'What a month actually looks like',
    description:
      'A rhythm your audience can rely on — planned ahead, approved by you, and consistent week to week.',
    week: [
      { day: 'Mon', posts: ['Reel'] },
      { day: 'Tue', posts: ['Story'] },
      { day: 'Wed', posts: ['Carousel'] },
      { day: 'Thu', posts: ['Story'] },
      { day: 'Fri', posts: ['Reel'] },
      { day: 'Sat', posts: [] },
      { day: 'Sun', posts: ['Photo'] },
    ],
    summary: [
      '4–5 posts / week',
      'Daily stories',
      'Planned a month ahead',
      'You approve everything',
    ],
  },
  included: {
    heading: 'What we manage for you',
    description:
      'Everything it takes to keep your accounts consistent and growing — without it landing on your plate.',
    items: [
      {
        title: 'Content calendar & planning',
        description:
          'A monthly plan built around your goals, campaigns, and key dates.',
      },
      {
        title: 'Content creation & design',
        description:
          'On-brand graphics, reels, and posts — produced or coordinated with our studio.',
      },
      {
        title: 'Captions & copywriting',
        description:
          'Captions written in your voice, with the right hooks and calls to action.',
      },
      {
        title: 'Community management',
        description:
          'Replies to comments and DMs, with anything important flagged to you.',
      },
      {
        title: 'Posting & hashtag strategy',
        description:
          'Optimal timing, formats, and tags so each post has the best shot at reach.',
      },
      {
        title: 'Reporting & insights',
        description:
          'Monthly reporting on reach, engagement, and growth — plus what we’ll adjust.',
      },
    ],
  },
  outcomes: {
    heading: 'What consistent social actually does',
    description:
      'An active, on-brand presence compounds — here’s the impact steady management tends to drive.',
    stats: [
      {
        value: '3×',
        label:
          'More engagement than sporadic, unplanned posting on most platforms.',
      },
      {
        value: '4–5',
        label: 'On-brand posts a week, every week, without it falling on you.',
      },
      {
        value: '100%',
        label: 'Of content approved by you before anything goes live.',
      },
    ],
  },
  faqs: [
    {
      question: 'Which platforms do you manage?',
      answer:
        'The ones where your audience actually is — most often Instagram, TikTok, LinkedIn, and Facebook. We recommend a focused set and run it well rather than spreading thin across every network.',
    },
    {
      question: 'Do you create the content, or just schedule it?',
      answer:
        'We create it. We plan the calendar, design the posts and reels (or coordinate a shoot with our production team), write the captions, and publish — so your feed stays consistent without extra work on your side.',
    },
    {
      question: 'How is this different from paid social ads?',
      answer:
        'This is organic social — growing an engaged audience through content and community. Paid social (boosting and ad campaigns) lives under our digital-marketing services. The two work well together but are scoped separately.',
    },
    {
      question: 'Who approves posts before they go live?',
      answer:
        'You do. Everything runs through a shared content calendar with a clear approval step, so nothing publishes without your sign-off.',
    },
    {
      question: 'What if we don’t have content to start with?',
      answer:
        'That’s common and not a blocker. We can plan a content shoot with our production team, design from scratch, or coordinate creators — so a thin content library doesn’t hold you back.',
    },
    {
      question: 'How do you measure social results?',
      answer:
        'With monthly reporting on reach, engagement, follower growth, and the actions content drives — plus a clear read on what’s working and what we’ll adjust next.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s keep your accounts alive',
    description:
      'Tell us about your brand and goals, and we’ll map a content strategy and calendar that keeps your social presence active and growing.',
    primaryLabel: 'Book a Social Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Social Media services',
    secondaryHref: '/services/social',
  },
  relatedServices: [
    {
      slug: 'social-strategy',
      title: 'Social Strategy',
      tagline: 'Content pillars and a plan that ties posts to business goals.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social strategy content pillars mapped to business goals.',
      available: true,
    },
    {
      slug: 'influencer-collaborations',
      title: 'Influencer / Creator Collaborations',
      tagline:
        'Sourcing creators, briefs, deliverables, and repurposed content.',
      imageUrl: '/services-contentcreation.jpeg',
      imageAlt: 'Creator filming sponsored content for a brand collaboration.',
      available: true,
    },
    {
      slug: 'reporting-insights',
      title: 'Reporting & Insights',
      tagline: 'Monthly reporting on reach, engagement, and what to do next.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media reporting on reach and engagement.',
      available: true,
    },
  ],
  seo: {
    title: 'Social Media Management in Vancouver | Perseus Creative Studio',
    description:
      'Organic social media management in Vancouver: strategy, content, community, and reporting — a consistent, on-brand calendar that grows an engaged following.',
    canonicalPath: `${SITE_URL}/services/social/social-media-management`,
    ogImage: `${IMAGEKIT_BASE}/services-smm.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const socialStrategy: SocialServiceContent = {
  categorySlug: 'social',
  categoryTitle: 'Social Media',
  slug: 'social-strategy',
  title: 'Social Strategy',
  eyebrow: 'Social · Strategy',
  heroHeadline: 'A plan beats',
  heroHeadlineAccent: 'posting on a whim.',
  heroSubtitle:
    'Content pillars, audience, voice, and a calendar that ties every post to a goal — so your accounts grow with intent instead of guesswork. The blueprint your social runs on.',
  heroImageUrl: '/services-smm.jpeg',
  heroImageAlt:
    'A social media content strategy mapped into pillars and a plan.',
  feed: {
    name: 'Perseus Creative Studio',
    handle: '@perseusstudio',
    stats: [
      { value: '4', label: 'pillars' },
      { value: '3,400', label: 'followers' },
      { value: '6.1%', label: 'engagement' },
    ],
    tiles: [
      { tag: 'Educate', caption: 'How we plan a month of content' },
      {
        tag: 'Behind-the-scenes',
        imageUrl: '/services-smm.jpeg',
        caption: 'Inside a content shoot.',
      },
      { tag: 'Proof', caption: '“Consistency changed everything.”' },
      {
        tag: 'Story',
        imageUrl: '/services-contentcreation.jpeg',
        caption: 'A client’s journey.',
      },
      { tag: 'Educate', caption: '3 hooks that actually stop the scroll' },
      { tag: 'Engage', caption: 'Poll: what should we cover next?' },
    ],
  },
  pillars: {
    heading: 'Four pillars. One coherent feed.',
    description:
      'Random posting reads as noise. We split your calendar into a few clear content pillars — each with a job and its own formats — so every post pulls toward a goal and the feed feels intentional.',
    items: [
      {
        name: 'Educate',
        intent: 'Teach your audience something useful so you earn authority and saves.',
        mix: 40,
        formats: ['Carousel', 'How-to Reel', 'Tips'],
      },
      {
        name: 'Proof',
        intent: 'Show results and testimonials that build trust before the pitch.',
        mix: 25,
        formats: ['Case study', 'Review', 'Before / after'],
      },
      {
        name: 'Story',
        intent: 'Humanize the brand with behind-the-scenes and team moments.',
        mix: 20,
        formats: ['BTS', 'Founder note', 'Day-in-the-life'],
      },
      {
        name: 'Engage',
        intent: 'Spark replies and shares to feed the algorithm and the community.',
        mix: 15,
        formats: ['Poll', 'Question', 'Trend'],
      },
    ],
  },
  intro: {
    heading: 'An audience is built on purpose, not luck.',
    body: 'Brands that grow on social aren’t winging it — they know who they’re talking to, what they stand for, and what each post is meant to do. We turn that into a clear, usable strategy: the pillars, the voice, the channels, and a calendar your team (or ours) can run without guessing every week.',
    highlights: [
      'Audience & insight',
      'Content pillars',
      'A voice that’s unmistakably you',
      'Every post tied to a goal',
    ],
  },
  cadence: {
    heading: 'A rhythm worth showing up for',
    description:
      'The strategy defines a realistic posting cadence across your pillars — frequent enough to grow, sustainable enough to keep.',
    week: [
      { day: 'Mon', posts: ['Educate'] },
      { day: 'Tue', posts: ['Story'] },
      { day: 'Wed', posts: ['Proof'] },
      { day: 'Thu', posts: ['Engage'] },
      { day: 'Fri', posts: ['Educate'] },
      { day: 'Sat', posts: [] },
      { day: 'Sun', posts: ['Behind-the-scenes'] },
    ],
    summary: [
      '4 content pillars',
      '4–5 posts / week',
      'Mapped to goals',
      'Built to sustain',
    ],
  },
  included: {
    heading: 'What your strategy includes',
    description:
      'A practical playbook you can act on — not a 60-page deck nobody opens.',
    items: [
      {
        title: 'Audience & insight',
        description:
          'Who you’re really for, what they care about, and where they spend time.',
      },
      {
        title: 'Content pillars',
        description:
          'The 3–5 themes your content rotates through, so you never stare at a blank calendar.',
      },
      {
        title: 'Tone of voice',
        description:
          'How the brand sounds — so every post feels like the same company.',
      },
      {
        title: 'Channel plan',
        description:
          'Which platforms to focus on and the role each one plays.',
      },
      {
        title: 'Posting cadence',
        description:
          'A realistic weekly rhythm across formats you can actually maintain.',
      },
      {
        title: 'Goals & KPIs',
        description:
          'The metrics that tie social back to real business outcomes.',
      },
    ],
  },
  outcomes: {
    heading: 'Why a strategy is the cheapest growth you’ll buy',
    description:
      'It costs little and changes everything downstream — here’s what a clear plan unlocks.',
    stats: [
      {
        value: 'Consistent',
        label: 'A clear plan means you actually post — the single biggest driver of growth.',
      },
      {
        value: 'On-brand',
        label: 'Every post looks and sounds like you, across every channel.',
      },
      {
        value: 'Tied to goals',
        label: 'Content mapped to business outcomes, not vanity metrics.',
      },
    ],
  },
  faqs: [
    {
      question: 'How is strategy different from social media management?',
      answer:
        'Strategy is the plan; management is the doing. This service defines your pillars, voice, channels, and calendar. Our management service then executes it — creating and posting the content. You can take the strategy and run it yourself, or have us manage it.',
    },
    {
      question: 'What do I actually walk away with?',
      answer:
        'A clear, usable strategy document: audience insight, content pillars, tone of voice, a channel plan, a posting cadence, and the KPIs to measure against. It’s built to act on, not to admire.',
    },
    {
      question: 'Which platforms will you recommend?',
      answer:
        'Only the ones where your audience actually is — usually a focused set like Instagram, TikTok, or LinkedIn rather than spreading thin everywhere. The channel plan explains the role each one plays.',
    },
    {
      question: 'Do you create the content as part of strategy?',
      answer:
        'Strategy defines what to create and when; producing and posting it is our social media management service. We’ll happily scope them together so the plan doesn’t just sit on a shelf.',
    },
    {
      question: 'How long does a strategy take?',
      answer:
        'Most strategies come together in a couple of weeks, depending on research and how much input your team provides. We confirm the timeline in your proposal.',
    },
    {
      question: 'Can our own team execute the strategy?',
      answer:
        'Absolutely — it’s designed to be handed off. The pillars, voice, and calendar give an in-house person or freelancer everything they need to post consistently and on-brand.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s give your social a plan',
    description:
      'Tell us about your brand and goals, and we’ll build the strategy — pillars, voice, and a calendar — that turns posting into growth.',
    primaryLabel: 'Book a Social Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Social Media services',
    secondaryHref: '/services/social',
  },
  relatedServices: [
    {
      slug: 'social-media-management',
      title: 'Social Media Management',
      tagline:
        'Content calendar, posting, captions, and community — accounts kept active and on-brand.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media content planned and scheduled across platforms.',
      available: true,
    },
    {
      slug: 'influencer-collaborations',
      title: 'Influencer / Creator Collaborations',
      tagline: 'Sourcing creators, briefs, deliverables, and repurposed content.',
      imageUrl: '/services-contentcreation.jpeg',
      imageAlt: 'Creator filming sponsored content for a brand collaboration.',
      available: true,
    },
    {
      slug: 'reporting-insights',
      title: 'Reporting & Insights',
      tagline: 'Monthly reporting on reach, engagement, and what to do next.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media reporting on reach and engagement.',
      available: true,
    },
  ],
  seo: {
    title:
      'Social Media Strategy in Vancouver — Content Pillars & Plan | Perseus',
    description:
      'Social media strategy in Vancouver: audience insight, content pillars, tone of voice, channel plan, and a posting calendar that ties every post to a business goal.',
    canonicalPath: `${SITE_URL}/services/social/social-strategy`,
    ogImage: `${IMAGEKIT_BASE}/services-smm.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const influencerCollaborations: SocialServiceContent = {
  categorySlug: 'social',
  categoryTitle: 'Social Media',
  slug: 'influencer-collaborations',
  title: 'Influencer / Creator Collaborations',
  eyebrow: 'Social · Creators',
  heroHeadline: 'Borrow the trust',
  heroHeadlineAccent: 'you can’t buy.',
  heroSubtitle:
    'The right creators already have your audience’s attention and trust. We source them, brief them, handle the rights, and turn the content into something that works across organic and paid.',
  heroImageUrl: '/services-contentcreation.jpeg',
  heroImageAlt: 'A creator filming sponsored content for a brand collaboration.',
  feed: {
    name: 'Perseus Creative Studio',
    handle: '@perseusstudio',
    stats: [
      { value: '20+', label: 'creators' },
      { value: '3.4M', label: 'reach' },
      { value: '7.2%', label: 'engagement' },
    ],
    tiles: [
      {
        tag: 'Creator',
        imageUrl: '/services-contentcreation.jpeg',
        caption: 'Sponsored reel with a creator.',
      },
      { tag: 'UGC', caption: 'A genuine customer review' },
      {
        tag: 'Collab',
        imageUrl: '/services-smm.jpeg',
        caption: 'Brand × creator campaign.',
      },
      { tag: 'Reel', caption: 'Repurposed into a paid ad' },
      { tag: 'Unboxing', caption: 'First-look from a partner' },
      { tag: 'Takeover', caption: 'A creator runs your Stories' },
    ],
  },
  intro: {
    heading: 'People trust people — not logos.',
    body: 'A recommendation from a creator your audience already follows lands in a way brand-owned content can’t. The hard part is doing it well: finding creators who actually fit, briefing them without killing their authenticity, sorting the rights, and getting content you can reuse. That’s the part we run.',
    highlights: [
      'The right creators, vetted',
      'Briefs & creative direction',
      'Rights & whitelisting handled',
      'Repurposed across paid & organic',
    ],
  },
  roster: {
    heading: 'The right creators — vetted, not just available.',
    description:
      'We don’t chase follower counts. We source creators whose audience genuinely overlaps yours, vet their engagement, and shortlist only the ones worth a partnership.',
    creators: [
      { handle: '@northwest.eats', niche: 'Food · Lifestyle', followers: '128K', engagement: '6.8%' },
      { handle: '@buildwithliv', niche: 'Home · Reno', followers: '74K', engagement: '8.1%' },
      { handle: '@coast.fitness', niche: 'Fitness', followers: '210K', engagement: '5.4%' },
      { handle: '@studio.mara', niche: 'Design · DIY', followers: '56K', engagement: '9.3%' },
      { handle: '@yvr.daily', niche: 'Local · Travel', followers: '340K', engagement: '4.9%' },
      { handle: '@techreview.kai', niche: 'Tech · B2B', followers: '92K', engagement: '7.0%' },
    ],
    funnel: [
      { label: 'Creators sourced', value: '120+', width: 100 },
      { label: 'Vetted for fit', value: '38', width: 64 },
      { label: 'Briefed & contracted', value: '12', width: 38 },
      { label: 'Published & repurposed', value: '9', width: 26 },
    ],
  },
  included: {
    heading: 'What we handle',
    description:
      'Creator marketing breaks down in the logistics — sourcing, briefs, rights, and usage. We own all of it.',
    items: [
      {
        title: 'Creator sourcing & vetting',
        description:
          'Finding creators whose audience and values genuinely fit your brand.',
      },
      {
        title: 'Briefs & creative direction',
        description:
          'Clear briefs that guide the content without flattening the creator’s voice.',
      },
      {
        title: 'Negotiation & contracts',
        description:
          'Rates, deliverables, timelines, and usage rights — handled and documented.',
      },
      {
        title: 'Deliverables & approvals',
        description:
          'Managing drafts, feedback, and sign-off so content ships on time and on-brand.',
      },
      {
        title: 'Whitelisting & amplification',
        description:
          'Running the best content as paid ads from the creator’s own handle.',
      },
      {
        title: 'Reporting & repurposing',
        description:
          'Measuring what landed, then reusing it across your organic and paid channels.',
      },
    ],
  },
  outcomes: {
    heading: 'Why creator content punches above its weight',
    description:
      'It borrows an audience you’d otherwise pay years to build — here’s the impact.',
    stats: [
      {
        value: 'Borrowed trust',
        label: 'Tap audiences that already trust the creator vouching for you.',
      },
      {
        value: 'Authentic',
        label: 'Content that reads as a genuine recommendation, not an ad.',
      },
      {
        value: 'Repurposed',
        label: 'Every collab fuels your organic feed and paid campaigns too.',
      },
    ],
  },
  faqs: [
    {
      question: 'How do you find the right creators?',
      answer:
        'We match on audience fit, not just follower count — looking at who actually follows them, their engagement quality, content style, and values. A smaller creator with the right, engaged audience usually beats a big one with a generic following.',
    },
    {
      question: 'Do you handle contracts and rates?',
      answer:
        'Yes. We negotiate rates and deliverables, and put usage rights, timelines, and exclusivity in writing — so expectations are clear and you’re covered to use the content where you need it.',
    },
    {
      question: 'Micro-influencers or big names?',
      answer:
        'Usually micro and mid-tier creators — they tend to have higher engagement and cost far less, so the budget stretches across several authentic partnerships rather than one expensive post. We recommend the mix based on your goals.',
    },
    {
      question: 'Who owns the content, and can we run it as ads?',
      answer:
        'We secure usage rights as part of the deal, so you can repurpose the content on your channels and, where agreed, run it as paid ads — including whitelisted ads from the creator’s own handle for extra authenticity.',
    },
    {
      question: 'How do you measure a collaboration’s success?',
      answer:
        'Against the goal it was for — reach and awareness, engagement, or direct conversions with tracked links and codes. We report on what each partnership delivered and what to do more of.',
    },
    {
      question: 'How does this fit with our other social work?',
      answer:
        'It plugs straight into your strategy and management — creator content becomes another pillar in the calendar and a source of authentic assets for your feed and ads.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s put the right creators to work',
    description:
      'Tell us your goals and audience, and we’ll source the creators, run the collaborations, and turn the content into results across your channels.',
    primaryLabel: 'Book a Social Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Social Media services',
    secondaryHref: '/services/social',
  },
  relatedServices: [
    {
      slug: 'social-media-management',
      title: 'Social Media Management',
      tagline:
        'Content calendar, posting, captions, and community — accounts kept active and on-brand.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media content planned and scheduled across platforms.',
      available: true,
    },
    {
      slug: 'social-strategy',
      title: 'Social Strategy',
      tagline: 'Content pillars and a plan that ties posts to business goals.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'A social media content strategy mapped into pillars and a plan.',
      available: true,
    },
    {
      slug: 'reporting-insights',
      title: 'Reporting & Insights',
      tagline: 'Monthly reporting on reach, engagement, and what to do next.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media reporting on reach and engagement.',
      available: true,
    },
  ],
  seo: {
    title:
      'Influencer & Creator Collaborations in Vancouver | Perseus Creative Studio',
    description:
      'Influencer and creator collaborations in Vancouver: creator sourcing, briefs, contracts, rights, and repurposing — authentic partnerships that work across organic and paid.',
    canonicalPath: `${SITE_URL}/services/social/influencer-collaborations`,
    ogImage: `${IMAGEKIT_BASE}/services-contentcreation.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const reportingInsights: SocialServiceContent = {
  categorySlug: 'social',
  categoryTitle: 'Social Media',
  slug: 'reporting-insights',
  title: 'Reporting & Insights',
  eyebrow: 'Social · Reporting',
  heroHeadline: 'Know what’s working —',
  heroHeadlineAccent: 'and what to do next.',
  heroSubtitle:
    'Clear monthly reporting that turns likes and views into decisions: what landed, what didn’t, what your audience responds to, and the next move — not a screenshot of vanity metrics.',
  heroImageUrl: '/services-smm.jpeg',
  heroImageAlt: 'A social media reporting dashboard showing reach and engagement.',
  feed: {
    name: 'Perseus Creative Studio',
    handle: '@perseusstudio',
    stats: [
      { value: '+18%', label: 'reach' },
      { value: '+1.2k', label: 'followers' },
      { value: '6.1%', label: 'engagement' },
    ],
    tiles: [
      {
        tag: 'Top reel',
        imageUrl: '/services-smm.jpeg',
        caption: '+240% reach this month',
      },
      { tag: 'Most saved', caption: 'The how-to carousel' },
      {
        tag: 'Best engagement',
        imageUrl: '/services-contentcreation.jpeg',
        caption: 'A creator collaboration',
      },
      { tag: 'Top CTA', caption: 'Drove the most link clicks' },
      { tag: 'Growth', caption: 'Followers, month over month' },
      { tag: 'Insight', caption: 'Reels outperform static 3:1' },
    ],
  },
  insights: {
    heading: 'A report you can actually act on.',
    description:
      'Not a screenshot of follower count — the reach, engagement, and growth that moved, what drove them, and a clear read on what to do more of next month.',
    metrics: [
      { value: '+18%', label: 'Reach', caption: 'month over month' },
      { value: '+1.2k', label: 'New followers', caption: 'this month' },
      { value: '6.1%', label: 'Engagement', caption: 'vs 3.4% avg' },
      { value: '3:1', label: 'Reels vs static', caption: 'performance' },
    ],
    trend: [34, 40, 38, 49, 55, 61, 72, 88],
    trendLabel: 'Engaged accounts, last 8 weeks',
    highlights: [
      { label: 'Top content', value: 'How-to carousel — 240% reach' },
      { label: 'Best day', value: 'Thursday, 6–8pm' },
      { label: 'Next move', value: 'Double down on Reels' },
    ],
  },
  intro: {
    heading: 'Numbers are only useful if they change what you do.',
    body: 'Most social “reporting” is a screenshot of follower count. We go further: what reached people, what they engaged with and saved, where growth came from, and how you stack up against competitors — then translate it into a clear, prioritized list of what to do more of and what to drop.',
    highlights: [
      'Reach, engagement & growth',
      'What’s working — and what isn’t',
      'Audience & competitor insight',
      'Clear next steps every month',
    ],
  },
  included: {
    heading: 'What every report gives you',
    description:
      'A read you can act on in five minutes — the numbers, what they mean, and what’s next.',
    items: [
      {
        title: 'Performance summary',
        description:
          'Reach, impressions, engagement, and growth across your channels.',
      },
      {
        title: 'Content analysis',
        description:
          'Your top and bottom posts — and the patterns behind why they performed.',
      },
      {
        title: 'Audience insights',
        description:
          'Who’s following and engaging, when they’re active, and what they want.',
      },
      {
        title: 'Competitor benchmarking',
        description:
          'How your growth and engagement compare to others in your space.',
      },
      {
        title: 'Goal tracking',
        description:
          'Progress against the KPIs your strategy set, not vanity numbers.',
      },
      {
        title: 'Recommendations',
        description:
          'A prioritized list of what to do more of, fix, or stop next month.',
      },
    ],
  },
  outcomes: {
    heading: 'Why reporting is what makes social improve',
    description:
      'Without a feedback loop you repeat what doesn’t work — reporting is how the account actually gets better.',
    stats: [
      {
        value: 'Clarity',
        label: 'Know what’s working and what to stop — no guessing.',
      },
      {
        value: 'Every month',
        label: 'A regular, reliable read on reach, engagement, and growth.',
      },
      {
        value: 'Actionable',
        label: 'Every report ends in what to do next, not just a wall of numbers.',
      },
    ],
  },
  faqs: [
    {
      question: 'What’s actually in the report?',
      answer:
        'A performance summary (reach, engagement, growth), your top and bottom content with the why, audience insights, competitor benchmarking, progress against goals, and a prioritized list of recommendations. It’s built to be read and acted on quickly.',
    },
    {
      question: 'How often do I get it?',
      answer:
        'Monthly by default, with a live dashboard you can check anytime. For active accounts or campaigns we can report more frequently — we’ll set the cadence to match how fast things move.',
    },
    {
      question: 'Which metrics do you focus on?',
      answer:
        'The ones tied to your goals — reach, engagement quality, follower growth, saves and shares, and the actions content drives (clicks, leads, sales). We deliberately downplay vanity metrics that look nice but mean little.',
    },
    {
      question: 'Do you just report, or also act on it?',
      answer:
        'Both are available. Reporting can be standalone, or it can feed directly into our management and strategy work so the insights actually change next month’s content. That feedback loop is where the growth comes from.',
    },
    {
      question: 'Which platforms can you report on?',
      answer:
        'The major ones — Instagram, TikTok, LinkedIn, Facebook, and more — pulled into one clear view so you’re not stitching together five different native dashboards.',
    },
    {
      question: 'Do I need your management to get reporting?',
      answer:
        'No. We can report on accounts you or another team run. You give us access to the analytics, and we turn the data into insight and recommendations regardless of who’s posting.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s turn your social data into decisions',
    description:
      'Tell us what you want social to achieve, and we’ll set up reporting that tracks it and tells you exactly what to do next.',
    primaryLabel: 'Book a Social Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Social Media services',
    secondaryHref: '/services/social',
  },
  relatedServices: [
    {
      slug: 'social-media-management',
      title: 'Social Media Management',
      tagline:
        'Content calendar, posting, captions, and community — accounts kept active and on-brand.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'Social media content planned and scheduled across platforms.',
      available: true,
    },
    {
      slug: 'social-strategy',
      title: 'Social Strategy',
      tagline: 'Content pillars and a plan that ties posts to business goals.',
      imageUrl: '/services-smm.jpeg',
      imageAlt: 'A social media content strategy mapped into pillars and a plan.',
      available: true,
    },
    {
      slug: 'influencer-collaborations',
      title: 'Influencer / Creator Collaborations',
      tagline: 'Sourcing creators, briefs, deliverables, and repurposed content.',
      imageUrl: '/services-contentcreation.jpeg',
      imageAlt: 'Creator filming sponsored content for a brand collaboration.',
      available: true,
    },
  ],
  seo: {
    title:
      'Social Media Reporting & Insights in Vancouver | Perseus Creative Studio',
    description:
      'Social media reporting and insights in Vancouver: monthly reach, engagement, and growth analysis with audience insight, benchmarking, and clear next-step recommendations.',
    canonicalPath: `${SITE_URL}/services/social/reporting-insights`,
    ogImage: `${IMAGEKIT_BASE}/services-smm.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

export const SOCIAL_SERVICES: Record<string, SocialServiceContent> = {
  'social-media-management': socialMediaManagement,
  'social-strategy': socialStrategy,
  'influencer-collaborations': influencerCollaborations,
  'reporting-insights': reportingInsights,
};

// ─────────────────────────────────────────────────────────────────────────
// BRANDING SERVICE DETAIL CONTENT
//
// Powers /services/branding/[service] via the Branding template (specimen
// hero → establishing band → intro → deliverables → principles).
// ─────────────────────────────────────────────────────────────────────────
const brandStrategyPositioning: BrandingServiceContent = {
  categorySlug: 'branding',
  categoryTitle: 'Branding',
  slug: 'brand-strategy-positioning',
  title: 'Brand Strategy & Positioning',
  eyebrow: 'Branding · Strategy',
  heroHeadline: 'Decide what you stand for',
  heroHeadlineAccent: 'before you design a thing.',
  heroSubtitle:
    'Positioning, audience, and messaging — the strategic foundation every logo, website, and campaign is built on. We define why customers should choose you, then make it impossible to ignore.',
  heroImageUrl: '/services-branding.jpeg',
  heroImageAlt:
    'Perseus Creative Studio brand strategy and identity work laid out on a desk.',
  specimen: {
    monogram: 'P',
    wordmark: 'Perseus',
    caption: 'Strategy first — then the system it earns.',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Display', sample: 'Built to be remembered' },
      { label: 'Body', sample: 'Clarity, confidence, consistency.' },
    ],
  },
  positioningMap: {
    heading: 'The one position no competitor can claim.',
    description:
      'We map your category on the axes that matter to buyers, plot the competition, and find the open space — then build a position you can own and defend.',
    xAxis: ['Generalist', 'Specialist'],
    yAxis: ['Expected', 'Distinctive'],
    points: [
      { label: 'You', x: 78, y: 82, you: true },
      { label: 'Legacy Co.', x: 30, y: 28 },
      { label: 'Discount', x: 18, y: 50 },
      { label: 'Agency X', x: 54, y: 40 },
      { label: 'Freelancers', x: 64, y: 22 },
    ],
  },
  intro: {
    heading: 'A position you can defend — not a mood board.',
    body: 'Most brands blur into their category because they never decided what makes them different. We fix that first: who you’re for, what you uniquely offer, and the one idea you want to own in their mind. Everything downstream — identity, website, content — gets sharper and cheaper to produce when the strategy underneath it is clear.',
    highlights: [
      'Senior strategist on every engagement',
      'Research-backed, never guesswork',
      'A single, ownable position',
      'Foundations the whole brand builds on',
    ],
  },
  deliverables: {
    heading: 'What you walk away with',
    description:
      'A practical strategy you can act on — not a deck that gathers dust. Scoped to your goals, but these are the core outputs.',
    items: [
      {
        title: 'Brand positioning statement',
        description:
          'The one idea you own — who you’re for, what you offer, and why it matters.',
      },
      {
        title: 'Audience & insight',
        description:
          'Who you’re really talking to, what they care about, and what moves them to act.',
      },
      {
        title: 'Competitive landscape',
        description:
          'Where rivals sit and the open space you can credibly claim as yours.',
      },
      {
        title: 'Messaging framework',
        description:
          'Value proposition, supporting pillars, and the proof that makes them believable.',
      },
      {
        title: 'Personality & tone of voice',
        description:
          'How the brand sounds — so every channel feels like the same company.',
      },
      {
        title: 'Strategy brief',
        description:
          'A clear, usable document your team, designers, and future vendors can build from.',
      },
    ],
  },
  principles: {
    heading: 'How we build brands',
    description:
      'A few convictions that shape every engagement — and why strategy work with us looks different.',
    items: [
      {
        index: '01',
        title: 'Strategy before aesthetics',
        description:
          'A logo can’t fix an unclear position. We decide what you stand for first; the visuals follow the idea, not the other way around.',
      },
      {
        index: '02',
        title: 'Clarity beats cleverness',
        description:
          'If people have to work to understand you, you’ve already lost them. We trade clever for clear, every time.',
      },
      {
        index: '03',
        title: 'Distinct, not decorative',
        description:
          'Difference is the whole job. We build a position rivals can’t copy and your audience can’t confuse with anyone else.',
      },
      {
        index: '04',
        title: 'Made to be consistent',
        description:
          'A brand is what people repeatedly experience. We hand you foundations simple enough that everyone applies them the same way.',
      },
    ],
  },
  faqs: [
    {
      question: 'What’s the difference between brand strategy and a logo?',
      answer:
        'Strategy is the thinking; a logo is one expression of it. Positioning defines who you’re for, what you offer, and why it matters — the foundation a logo, website, and campaign are then built on. We start with strategy so the visuals have something true to express.',
    },
    {
      question: 'Do we need strategy if we already have a logo?',
      answer:
        'Often, yes. Plenty of businesses have a logo but no clear position — which is why their marketing feels scattered. Strategy aligns everything you already have around a single idea, and we can refresh the identity to match if needed.',
    },
    {
      question: 'How long does a brand strategy engagement take?',
      answer:
        'Most run a few weeks, depending on scope and how much research and stakeholder input is involved. We confirm dated milestones in your proposal before we start.',
    },
    {
      question: 'What do you need from us to start?',
      answer:
        'Time with the people who know the business, any existing research or customer insight, and a willingness to make decisions. We lead the process, run the workshops, and turn the inputs into a clear position.',
    },
    {
      question: 'Will this work for the rest of our marketing?',
      answer:
        'That’s the point. The positioning and messaging framework become the brief for your identity, website, content, and ads — so everything pulls in the same direction and gets cheaper and faster to produce.',
    },
    {
      question: 'Can you build the identity and website once strategy is set?',
      answer:
        'Yes — that’s the advantage of one studio. The same team carries your strategy straight into identity design, your website, and content, so nothing gets lost in translation between vendors.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s define what you stand for',
    description:
      'Tell us where your brand is today and where you want it to go, and we’ll map the positioning and messaging to get there.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Branding services',
    secondaryHref: '/services/branding',
  },
  relatedServices: [
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline:
        'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Visual identity system with logo, color, and typography.',
      available: true,
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      tagline: 'Tagline, tone of voice, and the words that actually sell.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand messaging and copywriting on a brand guidelines page.',
      available: true,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand guidelines document covering logo, color, and type.',
      available: true,
    },
  ],
  seo: {
    title:
      'Brand Strategy & Positioning in Vancouver | Perseus Creative Studio',
    description:
      'Brand strategy and positioning in Vancouver: audience, competitive insight, and a messaging framework that defines why customers choose you — the foundation for your identity, website, and marketing.',
    canonicalPath: `${SITE_URL}/services/branding/brand-strategy-positioning`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const logoVisualIdentity: BrandingServiceContent = {
  categorySlug: 'branding',
  categoryTitle: 'Branding',
  slug: 'logo-visual-identity',
  title: 'Logo & Visual Identity',
  eyebrow: 'Branding · Identity',
  heroHeadline: 'A look that’s',
  heroHeadlineAccent: 'unmistakably yours.',
  heroSubtitle:
    'Logo, color, and type — a complete visual identity system that looks credible at any size and consistent across every place your brand shows up.',
  heroImageUrl: '/services-branding.jpeg',
  heroImageAlt:
    'A visual identity system — logo, color, and typography — by Perseus Creative Studio.',
  specimen: {
    monogram: 'P',
    wordmark: 'Perseus',
    caption: 'A complete identity — not just a logo.',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Display', sample: 'Built to be recognized' },
      { label: 'Body', sample: 'Clear, consistent, unmistakably you.' },
    ],
  },
  intro: {
    heading: 'A logo is the start. A system is the point.',
    body: 'A single mark can’t carry a brand on its own. What makes you recognizable is the whole system working together — the logo, a considered color palette, type that has a voice, and clear rules for how it all goes together. We design the system, so you look like the same confident brand on a sign, a screen, and a social post.',
    highlights: [
      'Logo & monogram suite',
      'Color & type system',
      'Consistent across every touchpoint',
      'Production-ready files',
    ],
  },
  identitySheet: {
    heading: 'A logo isn’t drawn. It’s engineered.',
    description:
      'Construction, lockups, reversibility, and scale — the rules that make a mark hold up everywhere it lands. This is the difference between a logo and an identity system.',
    monogram: 'P',
    wordmark: 'Perseus',
    inkHex: '#141414',
    boneHex: '#F5F2EC',
    accentHex: '#C4502E',
  },
  deliverables: {
    heading: 'What you walk away with',
    description:
      'Everything you need to use the identity confidently — handed over and ready to deploy.',
    items: [
      {
        title: 'Primary & secondary logos',
        description:
          'A full logo suite — horizontal, stacked, and responsive lockups.',
      },
      {
        title: 'Monogram & favicon',
        description:
          'A compact mark for avatars, app icons, and tight spaces.',
      },
      {
        title: 'Color palette',
        description:
          'A considered palette with the values your team needs to apply it.',
      },
      {
        title: 'Typography system',
        description:
          'Display and body type with a clear hierarchy and pairing rules.',
      },
      {
        title: 'Usage rules',
        description:
          'Clearances, do’s and don’ts, and how the marks behave in context.',
      },
      {
        title: 'Production-ready files',
        description:
          'Vector and raster exports (SVG, PNG) for print, web, and social.',
      },
    ],
  },
  principles: {
    heading: 'How we design identities',
    description:
      'A few convictions that keep an identity sharp instead of safe.',
    items: [
      {
        index: '01',
        title: 'Distinct, not decorative',
        description:
          'An identity’s job is to be unmistakably you — recognizable before the name is read, not just pretty.',
      },
      {
        index: '02',
        title: 'Works at every size',
        description:
          'From a favicon to a billboard, the marks hold up — tested small and large, in color and in mono.',
      },
      {
        index: '03',
        title: 'A system, not a logo',
        description:
          'Color, type, and layout are designed to work together, so everything you make looks related.',
      },
      {
        index: '04',
        title: 'Built to last',
        description:
          'We design for longevity over trend, so the identity still feels right in five years.',
      },
    ],
  },
  faqs: [
    {
      question: 'How many logo concepts do we get?',
      answer:
        'We present a focused set of genuinely distinct directions rather than a pile of throwaways, then refine the chosen route across defined revision rounds. The exact numbers are set in your proposal.',
    },
    {
      question: 'What’s the difference between a logo and a visual identity?',
      answer:
        'A logo is one element. A visual identity is the whole system — logo suite, color, typography, and the rules that hold them together — so your brand looks consistent everywhere, not just on the logo itself.',
    },
    {
      question: 'What files will we receive?',
      answer:
        'Production-ready logo files in vector and raster formats (SVG, PNG, JPG) for print, web, and social, plus your color and type specifications — everything your team or future vendors need.',
    },
    {
      question: 'Can you refresh our existing identity instead of starting over?',
      answer:
        'Yes. We can modernize and tighten what’s working rather than throwing away equity you’ve built — a refresh that keeps you recognizable while bringing the identity up to date.',
    },
    {
      question: 'Do we need brand strategy first?',
      answer:
        'It helps — a clear position makes for a sharper identity. If you already have one, we design from it; if not, our brand strategy service can define it first, or we’ll align on the essentials before we start.',
    },
    {
      question: 'Do you also create full brand guidelines?',
      answer:
        'Yes. This service delivers the identity and core usage rules; for a comprehensive set of guidelines your whole team and vendors can follow, see our Brand Guidelines service.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s design your identity',
    description:
      'Tell us about your brand and where it shows up, and we’ll design a logo and identity system that makes you look credible and consistent everywhere.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Branding services',
    secondaryHref: '/services/branding',
  },
  relatedServices: [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      tagline:
        'Define what you do, who it’s for, and why customers choose you.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Brand strategy and identity work laid out on a desk by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      tagline: 'Tagline, tone of voice, and the words that actually sell.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand messaging and copywriting on a brand guidelines page.',
      available: true,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand guidelines document covering logo, color, and type.',
      available: true,
    },
  ],
  seo: {
    title:
      'Logo & Visual Identity Design in Vancouver | Perseus Creative Studio',
    description:
      'Logo and visual identity design in Vancouver: a complete system — logo suite, color, typography, and usage rules — that makes your brand look credible and consistent everywhere.',
    canonicalPath: `${SITE_URL}/services/branding/logo-visual-identity`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const brandMessagingCopywriting: BrandingServiceContent = {
  categorySlug: 'branding',
  categoryTitle: 'Branding',
  slug: 'brand-messaging-copywriting',
  title: 'Brand Messaging & Copywriting',
  eyebrow: 'Branding · Messaging',
  heroHeadline: 'The words that',
  heroHeadlineAccent: 'make people choose you.',
  heroSubtitle:
    'Tagline, value proposition, tone of voice, and the copy that turns your positioning into words customers remember — and act on.',
  heroImageUrl: '/services-branding.jpeg',
  heroImageAlt:
    'Brand messaging and copywriting — tagline, voice, and key lines.',
  specimen: {
    monogram: 'P',
    wordmark: 'Perseus',
    caption: 'The words, not just the look.',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Tagline', sample: 'Production that earns a second look.' },
      { label: 'Voice', sample: 'Confident, clear, human.' },
    ],
  },
  voice: {
    heading: 'A voice that sounds like you — and only you.',
    description:
      'We dial in the tone, then write the hierarchy that carries it: the tagline, the one-liner, and the boilerplate your whole team can reuse.',
    tones: [
      { left: 'Formal', right: 'Casual', position: 62 },
      { left: 'Serious', right: 'Playful', position: 42 },
      { left: 'Understated', right: 'Bold', position: 72 },
      { left: 'Corporate', right: 'Human', position: 80 },
    ],
    messaging: [
      { label: 'Tagline', text: 'Production that earns a second look.' },
      {
        label: 'One-liner',
        text: 'A Vancouver studio that turns brands into work people actually remember.',
      },
      {
        label: 'Boilerplate',
        text: 'Perseus Creative Studio pairs strategy, design, and production under one roof — so every touchpoint sounds, and looks, unmistakably yours.',
      },
    ],
  },
  intro: {
    heading: 'A clear message beats a clever one.',
    body: 'Most brands in a category sound interchangeable — same adjectives, same promises. We find the words that are true to you, different from everyone else, and easy for a customer to act on. From the one-line value proposition to the copy on your key pages, your message stops sounding like everyone and starts sounding like you.',
    highlights: [
      'Value proposition & messaging',
      'Tagline & key lines',
      'Tone of voice',
      'Copy that converts',
    ],
  },
  deliverables: {
    heading: 'What you walk away with',
    description:
      'The language of your brand, written down and ready for your team and every channel to use.',
    items: [
      {
        title: 'Value proposition',
        description:
          'The one-line answer to “why you” — clear enough to repeat.',
      },
      {
        title: 'Messaging framework',
        description:
          'Pillars and proof points that keep every message on-strategy.',
      },
      {
        title: 'Tagline & key lines',
        description:
          'A tagline and a set of go-to lines for headlines and bios.',
      },
      {
        title: 'Tone of voice',
        description:
          'How you sound — with examples and do’s and don’ts to keep it consistent.',
      },
      {
        title: 'Boilerplate & bios',
        description:
          'Ready-to-use descriptions for your site, profiles, and press.',
      },
      {
        title: 'Core copy',
        description:
          'Conversion-focused copy for your key pages or launch, as scoped.',
      },
    ],
  },
  principles: {
    heading: 'How we write',
    description:
      'A few rules that keep the words working instead of just sounding nice.',
    items: [
      {
        index: '01',
        title: 'Clarity beats cleverness',
        description:
          'If a reader has to decode it, it’s failed. We trade clever for clear, every time.',
      },
      {
        index: '02',
        title: 'Say what only you can say',
        description:
          'We cut the lines any competitor could claim and keep what’s genuinely yours.',
      },
      {
        index: '03',
        title: 'Write for the reader',
        description:
          'Not the boardroom. Every line is aimed at the person you want to act, in their words.',
      },
      {
        index: '04',
        title: 'Every line earns its place',
        description:
          'No filler. If a sentence isn’t pulling its weight, it’s gone.',
      },
    ],
  },
  faqs: [
    {
      question: 'What’s the difference between messaging and copywriting?',
      answer:
        'Messaging is the strategy of what to say — your value proposition, pillars, and voice. Copywriting is the craft of saying it well on a specific page or asset. We do both: define the message, then write it.',
    },
    {
      question: 'Do you write website copy?',
      answer:
        'Yes. We write conversion-focused copy for your key pages, and it pairs directly with our website design and development services so the words and the design are built together, not bolted on.',
    },
    {
      question: 'What is a tone of voice and why do I need one?',
      answer:
        'It’s a short guide to how your brand sounds — the words you use, the ones you avoid, and the personality behind them. It’s what keeps you sounding like the same company whether it’s a homepage or a support email.',
    },
    {
      question: 'Do you need our brand strategy first?',
      answer:
        'Strong messaging is built on a clear position. If you have one, we write from it; if not, our brand strategy service can define it first, or we’ll align on the essentials before writing.',
    },
    {
      question: 'How many revisions are included?',
      answer:
        'We work in defined revision rounds so feedback stays focused and the message gets sharper, not muddier. The exact number is set in your proposal.',
    },
    {
      question: 'Can you match an existing voice, or create a new one?',
      answer:
        'Both. We can document and sharpen the voice you already have, or develop a new one from your positioning — whichever your brand needs.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s find your words',
    description:
      'Tell us about your brand and audience, and we’ll craft the messaging and copy that make you clear, distinct, and easy to choose.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Branding services',
    secondaryHref: '/services/branding',
  },
  relatedServices: [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      tagline:
        'Define what you do, who it’s for, and why customers choose you.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Brand strategy and identity work laid out on a desk by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline: 'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Visual identity system with logo, color, and typography.',
      available: true,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand guidelines document covering logo, color, and type.',
      available: true,
    },
  ],
  seo: {
    title:
      'Brand Messaging & Copywriting in Vancouver | Perseus Creative Studio',
    description:
      'Brand messaging and copywriting in Vancouver: value proposition, tagline, tone of voice, and conversion-focused copy that turns your positioning into words that sell.',
    canonicalPath: `${SITE_URL}/services/branding/brand-messaging-copywriting`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const creativeDirection: BrandingServiceContent = {
  categorySlug: 'branding',
  categoryTitle: 'Branding',
  slug: 'creative-direction',
  title: 'Creative Direction',
  eyebrow: 'Branding · Direction',
  heroHeadline: 'One creative idea,',
  heroHeadlineAccent: 'every channel in tune.',
  heroSubtitle:
    'The north-star that keeps your campaigns, content, and channels feeling like one brand — a single creative idea, art-directed and applied everywhere.',
  heroImageUrl: '/services-branding.jpeg',
  heroImageAlt:
    'Creative direction — a single visual idea applied consistently across channels.',
  specimen: {
    monogram: 'P',
    wordmark: 'Perseus',
    caption: 'One idea, applied with intent.',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Concept', sample: 'A clear idea worth repeating.' },
      { label: 'Direction', sample: 'Consistent, deliberate, unmistakable.' },
    ],
  },
  moodboard: {
    heading: 'One idea, made visible.',
    description:
      'Before a single asset ships, we set the visual world — references, textures, and the keywords that anchor every creative decision across channels.',
    tiles: [
      {
        imageUrl: '/services-branding.jpeg',
        imageAlt: 'Brand art-direction reference.',
        label: 'Texture',
        span: 'tall',
      },
      { label: 'Bold. Warm. Editorial.', span: 'wide' },
      {
        imageUrl: '/services-photography.jpeg',
        imageAlt: 'Photography direction reference.',
        label: 'Light',
        span: 'square',
      },
      {
        imageUrl: '/services-contentcreation.jpeg',
        imageAlt: 'Content direction reference.',
        span: 'square',
      },
      {
        imageUrl: '/services-smm.jpeg',
        imageAlt: 'Social direction reference.',
        label: 'Motion',
        span: 'wide',
      },
      { label: 'Ember', span: 'square' },
      {
        imageUrl: '/services-aerialproduction.jpeg',
        imageAlt: 'Scale and composition reference.',
        label: 'Scale',
        span: 'square',
      },
    ],
  },
  intro: {
    heading: 'Consistency is a creative decision, not an accident.',
    body: 'When every post, ad, and page is designed in isolation, a brand drifts — same logo, ten different feelings. Creative direction sets the idea that ties it all together: how things look, how they’re shot, how they’re composed, and the rules that keep them coherent as your team and your channels grow. It’s the difference between assets that happen to share a logo and a brand that looks like itself everywhere.',
    highlights: [
      'A single creative concept',
      'Art direction & visual language',
      'Campaign direction',
      'Cross-channel consistency',
    ],
  },
  deliverables: {
    heading: 'What you walk away with',
    description:
      'The creative idea and the direction to apply it — so everyone producing work for your brand is pulling in the same direction.',
    items: [
      {
        title: 'Creative concept',
        description:
          'The central idea your campaigns and content ladder up to.',
      },
      {
        title: 'Art direction',
        description:
          'How work looks and feels — composition, styling, and treatment.',
      },
      {
        title: 'Visual language',
        description:
          'Imagery, graphic devices, and motion cues that read as unmistakably you.',
      },
      {
        title: 'Campaign direction',
        description:
          'A creative through-line that holds a launch or campaign together.',
      },
      {
        title: 'Asset guidance',
        description:
          'References and direction your designers, editors, and partners can follow.',
      },
      {
        title: 'Cross-channel system',
        description:
          'How the idea flexes across web, social, ads, and print without breaking.',
      },
    ],
  },
  principles: {
    heading: 'How we direct',
    description:
      'A few rules that keep the work coherent without making it repetitive.',
    items: [
      {
        index: '01',
        title: 'One idea, many expressions',
        description:
          'A strong concept can flex across formats and still read as one brand. We protect the idea, not a single layout.',
      },
      {
        index: '02',
        title: 'Direction beats decoration',
        description:
          'Every creative choice earns its place against the idea — we cut anything that’s just there to look nice.',
      },
      {
        index: '03',
        title: 'Consistent, never identical',
        description:
          'Coherence isn’t copy-paste. We set the rules tight enough to hold and loose enough to keep work fresh.',
      },
      {
        index: '04',
        title: 'Made to be handed off',
        description:
          'Direction only works if others can follow it. We document the idea so any team can produce on-brand without us in the room.',
      },
    ],
  },
  faqs: [
    {
      question: 'What’s the difference between creative direction and a brand identity?',
      answer:
        'A brand identity is the fixed system — logo, color, type. Creative direction is how you use it to make work: the idea behind a campaign, how things are shot and composed, and the feeling that ties it all together. Identity is the toolkit; direction is how you play.',
    },
    {
      question: 'Do I need creative direction if I already have brand guidelines?',
      answer:
        'Guidelines tell you what the brand is; creative direction tells you what to make with it. Many brands have a solid identity and still produce inconsistent campaigns because no one set the creative idea. Direction fills that gap.',
    },
    {
      question: 'Is this a one-time project or ongoing?',
      answer:
        'Both are possible. We can set the direction for a specific launch or campaign, or act as ongoing creative direction across your channels. The right scope depends on how much you’re producing — we’ll size it in your proposal.',
    },
    {
      question: 'Will you produce the assets too, or just the direction?',
      answer:
        'We can do either. Creative direction can be the strategy layer your existing team executes, or we can direct and produce the work through our production, social, and website services so it’s built exactly as intended.',
    },
    {
      question: 'How do you keep our team on-brand after the project?',
      answer:
        'We document the idea, the art direction, and clear references so designers, editors, and partners can follow it. The goal is for your team to produce on-brand work without us in the room.',
    },
    {
      question: 'Do you need our brand strategy or identity in place first?',
      answer:
        'Strong direction is built on a clear position and identity. If you have them, we direct from them; if not, our brand strategy and visual identity services can establish the foundation first.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s set your creative north-star',
    description:
      'Tell us where your brand shows up, and we’ll define the creative idea and direction that keep every channel unmistakably you.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Branding services',
    secondaryHref: '/services/branding',
  },
  relatedServices: [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      tagline:
        'Define what you do, who it’s for, and why customers choose you.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Brand strategy and identity work laid out on a desk by Perseus Creative Studio.',
      available: true,
    },
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline: 'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Visual identity system with logo, color, and typography.',
      available: true,
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      tagline: 'Logo, color, type, and voice rules your whole team can use.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand guidelines document covering logo, color, and type.',
      available: true,
    },
  ],
  seo: {
    title: 'Creative Direction in Vancouver | Perseus Creative Studio',
    description:
      'Creative direction in Vancouver: a single creative idea, art direction, and visual language that keep your campaigns, content, and channels consistently on-brand.',
    canonicalPath: `${SITE_URL}/services/branding/creative-direction`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

const brandGuidelines: BrandingServiceContent = {
  categorySlug: 'branding',
  categoryTitle: 'Branding',
  slug: 'brand-guidelines',
  title: 'Brand Guidelines',
  eyebrow: 'Branding · Guidelines',
  heroHeadline: 'One source of truth,',
  heroHeadlineAccent: 'so the brand holds.',
  heroSubtitle:
    'Logo, color, type, imagery, and voice — the rules that let anyone, anywhere produce work that still looks unmistakably like you.',
  heroImageUrl: '/services-branding.jpeg',
  heroImageAlt:
    'Brand guidelines — logo, color, type, and voice rules in one document.',
  specimen: {
    monogram: 'P',
    wordmark: 'Perseus',
    caption: 'The rules that keep it consistent.',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Logo', sample: 'Clear space, sizing, and don’ts.' },
      { label: 'System', sample: 'Color, type, imagery, and voice.' },
    ],
  },
  intro: {
    heading: 'A brand is only as consistent as its rules.',
    body: 'The moment more than one person makes work for your brand — a freelancer, a new hire, an ad partner — consistency depends on whether the rules are written down. Brand guidelines capture every decision in one place: how the logo is used, the exact colors and type, how imagery should feel, and how the brand sounds. It turns your identity from something only you understand into something any team can apply correctly.',
    highlights: [
      'Logo usage & clear space',
      'Color & typography',
      'Imagery & voice',
      'Real-world examples',
    ],
  },
  guidelines: {
    heading: 'Not a list of rules — a document people actually use.',
    description:
      'Cover, color, type, and usage — the brand book is built as pages a designer, a new hire, or an ad partner can open and follow. Here’s the shape of what you get.',
    monogram: 'P',
    wordmark: 'Perseus',
    palette: [
      { name: 'Ink', hex: '#141414' },
      { name: 'Bone', hex: '#F5F2EC' },
      { name: 'Ember', hex: '#C4502E' },
      { name: 'Stone', hex: '#8A8378' },
    ],
    typeSpecimen: [
      { label: 'Display', sample: 'Built to be recognized' },
      { label: 'Body', sample: 'Clear, consistent, and unmistakably you — everywhere it’s read.' },
    ],
  },
  deliverables: {
    heading: 'What’s inside',
    description:
      'A practical guidelines document your whole team — and every partner — can work from, built to be used, not shelved.',
    items: [
      {
        title: 'Logo system',
        description:
          'Primary, variations, clear space, minimum sizes, and what not to do.',
      },
      {
        title: 'Color palette',
        description:
          'Exact values for digital and print, with usage and accessibility notes.',
      },
      {
        title: 'Typography',
        description:
          'Typefaces, hierarchy, and how to set text consistently everywhere.',
      },
      {
        title: 'Imagery & graphics',
        description:
          'Photography style, graphic devices, and how visuals should feel.',
      },
      {
        title: 'Voice & messaging',
        description:
          'Tone of voice and key lines so the brand sounds the same in words, too.',
      },
      {
        title: 'Application examples',
        description:
          'The rules shown in real layouts so the “right way” is obvious.',
      },
    ],
  },
  principles: {
    heading: 'How we build them',
    description:
      'A few rules about the rules — so the document actually gets used.',
    items: [
      {
        index: '01',
        title: 'Built to be used, not admired',
        description:
          'Guidelines fail when they’re too precious to open. We make them clear, practical, and fast to reference.',
      },
      {
        index: '02',
        title: 'Show, don’t just tell',
        description:
          'Every rule comes with an example. Seeing the right way beats reading a paragraph about it.',
      },
      {
        index: '03',
        title: 'Tight where it matters, flexible where it helps',
        description:
          'We lock down what protects the brand and leave room where rigidity would only get in the way.',
      },
      {
        index: '04',
        title: 'Made for whoever opens it next',
        description:
          'A new hire or outside partner should be able to produce on-brand work without a single phone call.',
      },
    ],
  },
  faqs: [
    {
      question: 'What’s the difference between a logo package and brand guidelines?',
      answer:
        'A logo package is the files. Brand guidelines are the rulebook for the whole identity — logo, color, type, imagery, and voice — including how each is used and what to avoid. Guidelines make the system usable by people who weren’t in the room when it was designed.',
    },
    {
      question: 'Do I need guidelines if it’s just me right now?',
      answer:
        'They pay off the moment anyone else touches the brand — a freelancer, an agency, a new hire, a print vendor. Even solo, they keep your own work consistent over time and make future handoffs painless.',
    },
    {
      question: 'What format do the guidelines come in?',
      answer:
        'Typically a polished PDF, and we can structure it for easy reference or as a shareable link. The right format depends on your team and how you’ll use it — we’ll confirm in your proposal.',
    },
    {
      question: 'Do you need a finished identity before building guidelines?',
      answer:
        'Yes — guidelines document an existing system. If your logo, color, and type are in place, we document them; if not, our visual identity service can design them first, then we capture the rules.',
    },
    {
      question: 'Can you update our existing guidelines instead of starting over?',
      answer:
        'Often, yes. If you have a usable identity and an outdated or incomplete document, we can audit it and bring it up to date rather than rebuild from scratch.',
    },
    {
      question: 'How detailed do the guidelines get?',
      answer:
        'As detailed as your brand needs — from a concise essentials guide to a comprehensive system covering every application. We scope the depth to your team and how widely the brand is produced.',
    },
  ],
  cta: {
    eyebrow: 'Start Your Project',
    headline: 'Let’s get your brand documented',
    description:
      'Tell us where your brand is produced, and we’ll build guidelines that keep it consistent across every team, partner, and channel.',
    primaryLabel: 'Book a Branding Call',
    primaryHref: '/contact',
    secondaryLabel: 'Explore all Branding services',
    secondaryHref: '/services/branding',
  },
  relatedServices: [
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      tagline: 'Logo, color, and type — a system that looks credible everywhere.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Visual identity system with logo, color, and typography.',
      available: true,
    },
    {
      slug: 'creative-direction',
      title: 'Creative Direction',
      tagline: 'A creative north-star that keeps every channel consistent.',
      imageUrl: '/services-branding.jpeg',
      imageAlt:
        'Creative direction — a single visual idea applied consistently across channels.',
      available: true,
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      tagline: 'Tagline, tone of voice, and the words that actually sell.',
      imageUrl: '/services-branding.jpeg',
      imageAlt: 'Brand messaging and copywriting — tagline, voice, and key lines.',
      available: true,
    },
  ],
  seo: {
    title: 'Brand Guidelines in Vancouver | Perseus Creative Studio',
    description:
      'Brand guidelines in Vancouver: logo usage, color, typography, imagery, and tone of voice in one document, so every team and partner produces work that stays on-brand.',
    canonicalPath: `${SITE_URL}/services/branding/brand-guidelines`,
    ogImage: `${IMAGEKIT_BASE}/services-branding.jpeg?tr=w-1200,h-630,cm-extract,fo-auto`,
  },
};

export const BRANDING_SERVICES: Record<string, BrandingServiceContent> = {
  'brand-strategy-positioning': brandStrategyPositioning,
  'logo-visual-identity': logoVisualIdentity,
  'brand-messaging-copywriting': brandMessagingCopywriting,
  'creative-direction': creativeDirection,
  'brand-guidelines': brandGuidelines,
};

// Single registry the route consumes — category slug → that category's detail
// content map. Keep keys in sync with CATEGORIES above.
const SERVICE_DETAILS = {
  production: PRODUCTION_SERVICES,
  websites: WEBSITE_SERVICES,
  'digital-marketing': MARKETING_SERVICES,
  social: SOCIAL_SERVICES,
  branding: BRANDING_SERVICES,
} as const;

/** Resolve a category+service pair to its typed detail content, or null. */
export function getServiceDetail(
  category: string,
  service: string,
): ServiceDetailContent | null {
  const map = SERVICE_DETAILS[category as keyof typeof SERVICE_DETAILS];
  return map?.[service] ?? null;
}

/** Every {category, service} pair that currently resolves to a detail page. */
export function allServiceDetailParams() {
  return Object.values(SERVICE_DETAILS).flatMap((map) =>
    Object.values(map).map((s) => ({
      category: s.categorySlug,
      service: s.slug,
    })),
  );
}
