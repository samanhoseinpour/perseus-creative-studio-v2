// IMPORTER-ONLY since 2026-09: the app reads the blog from Postgres through
// src/lib/blogStore.ts. This registry (+ src/content/blogs/**) is the source
// scripts/import-blogs.mts imports from, and the gap workflow until the
// /admin editor ships is: edit here / the MDX, run `npm run db:import-blogs
// -- --apply`, then `vercel cache invalidate --tag blogs`. Deleted at the
// close of step 2.
import { PERSEUS_LOGO } from '.';

export type BlogAuthor = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  href: string;
  sameAs: string[];

  // Optional richer profile fields used by the author page for SEO + UX.
  // Image asset key (a /images path, or legacy bare key) used for OG cards. Falls back
  // to the site logo if absent.
  ogImage?: string;
  location?: {
    locality: string;
    region: string;
    country: string;
  };
  // Display tags shown on the public author profile page.
  tags?: string[];
  // Topical expertise — surfaces on the profile page and feeds Person.knowsAbout.
  knowsAbout?: string[];
};

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  'perseus-creative-studio': {
    slug: 'perseus-creative-studio',
    name: 'Perseus Creative Studio',
    role: 'Marketing Agency',
    bio: 'Perseus Creative Studio is a Vancouver-based marketing agency helping local businesses grow through branding, video and photography, websites, social media, and digital marketing.',
    imageUrl: PERSEUS_LOGO,
    href: '/blogs/authors/perseus-creative-studio',
    sameAs: [
      'https://www.instagram.com/perseustudio/',
      'https://www.linkedin.com/company/perseus-creative-studio/',
      'https://www.youtube.com/@PerseusCreativeStudio',
      'https://www.facebook.com/p/Perseus-Creative-Studio-61559184362913/',
      'https://x.com/Perseustudio1',
    ],
    ogImage: PERSEUS_LOGO,
    location: {
      locality: 'Vancouver',
      region: 'BC',
      country: 'CA',
    },
    tags: ['Vancouver', 'Los Angeles', 'Toronto'],
    knowsAbout: [
      'Digital marketing',
      'Search engine optimization',
      'Website design and development',
      'Brand identity and strategy',
      'Videography and cinematography',
      'Photography',
      'Social media marketing',
      'Content creation',
      'Aerial production',
    ],
  },
  'aryan-ghasemi': {
    slug: 'aryan-ghasemi',
    name: 'Aryan Ghasemi',
    role: 'Founder & CEO',
    bio: 'Aryan Ghasemi is the Founder and CEO of Perseus Creative Studio, leading the studio’s strategic direction across brand development, digital marketing, website design, and cinematic media production for businesses in Vancouver and beyond.',
    imageUrl: '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
    href: '/blogs/authors/aryan-ghasemi',
    sameAs: ['https://www.linkedin.com/in/aryan-ghasemi-80043424a/'],
    ogImage: '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
    location: {
      locality: 'Vancouver',
      region: 'BC',
      country: 'CA',
    },
    tags: ['Vancouver', 'Los Angeles', 'Toronto'],
    knowsAbout: [
      'Business strategy',
      'Digital marketing strategy',
      'Brand development',
      'Creative direction',
      'Website design and development',
      'Search engine optimization',
      'Videography and cinematography',
      'Social media marketing',
      'Content production',
      'Real estate media production',
    ],
  },
  'saman-hoseinpour': {
    slug: 'saman-hoseinpour',
    name: 'Saman Hoseinpour',
    role: 'Co-Founder & CTO',
    bio: 'Saman Hoseinpour is the Co-Founder and CTO of Perseus Creative Studio, leading the studio’s engineering and web development, architecting fast, SEO-driven websites and the technical systems behind its marketing and media work.',
    imageUrl: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
    href: '/blogs/authors/saman-hoseinpour',
    sameAs: [
      'https://www.linkedin.com/in/saman-hoseinpour-202280221/',
      'https://github.com/samanhoseinpour',
    ],
    ogImage: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
    location: {
      locality: 'Vancouver',
      region: 'BC',
      country: 'CA',
    },
    tags: ['Vancouver'],
    knowsAbout: [
      'TypeScript',
      'Node.js',
      'Express.js',
      'NestJS',
      'React.js',
      'Next.js',
      'Redis',
      'Docker',
      'Git',
      'MySQL',
      'PostgreSQL',
      'MongoDB',
      'Tailwind CSS',
      'GitHub',
    ],
  },
  'arshia-farahi': {
    slug: 'arshia-farahi',
    name: 'Arshia Farrahi',
    role: 'Chief Operating Officer',
    bio: 'Arshia Farrahi is the Chief Operating Officer at Perseus Creative Studio, overseeing operations, client coordination, delivery workflows, and cross-functional execution across the studio’s marketing, media, and web projects.',
    imageUrl: '/images/blogs/authors/blogs-authors-arshia-farahi.avif',
    href: '/blogs/authors/arshia-farahi',
    sameAs: ['https://www.linkedin.com/in/arshia-farrahi-a0a849330/'],
    ogImage: '/images/blogs/authors/blogs-authors-arshia-farahi.avif',
    location: {
      locality: 'Vancouver',
      region: 'BC',
      country: 'CA',
    },
    tags: ['Vancouver', 'Toronto'],
    knowsAbout: [
      'Business operations',
      'Client relationship management',
      'Project coordination',
      'Workflow management',
      'Digital marketing operations',
      'Brand execution',
      'Content production operations',
      'Team coordination',
      'Marketing services delivery',
      'Creative agency operations',
    ],
  },
};

// Author identity is keyed by slug; the full profile lives in BLOG_AUTHORS.
// Switching to a literal union catches typos at compile time and keeps
// every consumer (cards, byline, JSON-LD) resolving through one map.
export type BlogPostAuthorSlug =
  | 'perseus-creative-studio'
  | 'aryan-ghasemi'
  | 'saman-hoseinpour'
  | 'arshia-farahi';

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  href: string;
  description: string;
  // Short card-friendly variant of description. When absent, consumers
  // fall back to `description`.
  excerpt?: string;
  imageUrl: string;
  // Required: descriptive alt text for the hero/listing image. Used by the
  // detail page hero and the card grid.
  imageAlt: string;
  date: string;
  datetime: string;
  // ISO date (YYYY-MM-DD). Bump when meaningfully editing a post — feeds
  // schema.org dateModified and OG modifiedTime; freshness is a ranking signal.
  updatedAt?: string;
  category: { title: string; slug: string; href: string };
  // Service detail slug within the post's category (category slugs match the
  // service registry's — see SERVICE_DETAILS in `constants/services`). Drives
  // the sidebar "recommended service" CTA on the post page; when absent, the
  // CTA falls back to the category's featuredServiceSlug.
  serviceSlug?: string;
  authorSlug: BlogPostAuthorSlug;
  // Optional curated FAQ list. When present, overrides the MDX-extracted
  // FAQs as the source for the FAQPage JSON-LD. Lets you decouple schema
  // content from regex-parsed MDX. IMPORTANT: keep these in sync with the
  // post's body FAQ section — Google requires FAQPage entries to be visible
  // on the page for rich-result eligibility.
  // (Deliberately NO equivalent `howTo` override for <HowTo> blocks: this
  // field exists because FAQ answers fed a live SERP rich result worth
  // hand-curating; HowTo has had none since Sept 2023, and extraction
  // guarantees the schema matches the visible steps — a curated list could
  // drift from the rendered `<Step title>` ids and produce dead anchors.)
  faqs?: { question: string; answer: string }[];
  // 3–5 self-contained, answer-first bullets (≤ ~20 words each). Rendered as
  // the "Key takeaways" box at the top of the article and joined into the
  // BlogPosting `abstract` — AI answer engines lift these verbatim, so each
  // bullet must state a finding, never tease one. Never include prices.
  keyTakeaways?: string[];
  // Optional curated list of related post slugs. When present, the
  // "Related Articles" section renders these specific posts in order
  // instead of falling back to the category-based picker.
  relatedPosts?: string[];
  // Outbound references the article cites. Rendered as the numbered "Sources"
  // section after the article body and emitted as schema.org `citation` on
  // the BlogPosting node. Per-source `rel` merges into the link rel attribute.
  externalSources?: {
    title: string;
    href: string;
    rel?: 'nofollow' | 'sponsored' | 'ugc';
  }[];
  // Named entities for schema.org `about` (primary: true — what the post is
  // fundamentally about, keep to ~3) and `mentions` (primary omitted/false).
  // Every sameAs URL must be a verified-live Wikidata/Wikipedia/official
  // page; omit the field entirely when no unambiguous entity exists.
  entities?: { name: string; sameAs: string[]; primary?: boolean }[];
  seo: {
    title: string;
    description: string;
    canonicalPath: string;
    ogTitle: string;
    ogDescription: string;
    ogType: 'article';
    twitterCard: 'summary_large_image';
    robots: { index: boolean; follow: boolean };
    keywords: string[];
  };
};

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'vancouver-real-estate-videography-photography',
    title:
      'When a Vancouver Seller Says "Photos Are Enough": Answering the Video Objection',
    href: '/blogs/vancouver-real-estate-videography-photography',
    description:
      'The photos are shot, the seller has seen them, and they will not pay for video. What that objection usually means underneath, a plain answer to each version of it, and one Vancouver listing where the answer held.',
    imageUrl: '/images/blogs/production/vancouver-real-estate-videography-photography.avif',
    imageAlt:
      'Cinematic real estate media shoot inside a luxury Vancouver home, with a videographer filming a property walkthrough.',
    date: 'Feb 8, 2026',
    datetime: '2026-02-08',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'perseus-creative-studio',
    relatedPosts: [
      'real-estate-videography-vancouver-property-features',
      'real-estate-photo-video-online-appeal-vancouver',
      'real-estate-photography-vs-videography-vancouver',
      'the-ultimate-2026-media-production-guide-for-vancouver-business-owners',
    ],
    keyTakeaways: [
      '"Photos are enough" is rarely about photos. Ask what would have to be true for video to be worth it.',
      'Do not defend the price. Compare the media cost to a price reduction, not to the photo package.',
      'A seller whose last video "did nothing" usually bought production without distribution. Commit to where the footage runs.',
      'Book photo and video in one window and deliver stills first, so video never delays the listing date.',
      'A stalled client listing held its price after a cinematic relaunch, then sold in nine days over asking.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'TikTok',
        sameAs: [
          'https://www.wikidata.org/wiki/Q48938223',
          'https://en.wikipedia.org/wiki/TikTok',
        ],
      },
    ],
    seo: {
      title: 'When a Vancouver Seller Says "Photos Are Enough"',
      description:
        'What to say when a seller says photos are enough: the concern under each version of the video objection, and one Vancouver listing that held its price.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-real-estate-videography-photography',
      ogTitle: 'When a Vancouver Seller Says "Photos Are Enough"',
      ogDescription:
        'What to say when a seller says photos are enough: the concern under each version of the video objection, and one Vancouver listing that held its price.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'seller says photos are enough',
        'real estate video objection',
        'convince a seller to pay for listing video',
        'is listing video worth it Vancouver',
        'real estate videography Vancouver',
        'listing video Vancouver realtors',
        'Vancouver realtor seller objections',
        'condo listing video Vancouver',
        'real estate marketing budget conversation',
      ],
    },
  },
  {
    id: 2,
    slug: 'vancouver-business-360-marketing',
    title:
      '360° Marketing in Vancouver: The Complete Strategy Guide for Businesses in 2026',
    href: '/blogs/vancouver-business-360-marketing',
    description:
      'With thousands of businesses competing for attention in Vancouver, standing out requires more than just having a great product or service. A 360° marketing strategy is essential to building brand awareness, attracting customers, and increasing revenue.',
    imageUrl: '/images/blogs/digital-marketing/vancouver-business-360-marketing.avif',
    imageAlt:
      'Diagram of a 360° marketing strategy for a Vancouver business, connecting website, SEO, social media, and paid ads.',
    date: 'Feb 1, 2025',
    datetime: '2025-02-01',
    updatedAt: '2026-09-03',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    authorSlug: 'perseus-creative-studio',
    keyTakeaways: [
      '360 marketing integrates website, social media, local SEO, and paid ads into one cohesive ecosystem rather than disjointed channels.',
      'Local SEO is the highest-ROI channel for Vancouver service and brick-and-mortar businesses, driven by an optimized Google Business Profile and Map Pack ranking.',
      'Cinematic video and drone footage build trust that static images cannot, especially in real estate and construction.',
      'AI accelerates ideation, drafting, and video repurposing, but human oversight remains essential for brand voice and strategy.',
      'Track conversions through GA4, multi-touch attribution, and CRM integration instead of vanity metrics like likes.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Digital marketing',
        sameAs: [
          'https://www.wikidata.org/wiki/Q1323528',
          'https://en.wikipedia.org/wiki/Digital_marketing',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: '360 Marketing Strategy Guide for Vancouver Businesses',
      description:
        'Learn how to build a 360° marketing strategy that links SEO, Web, and Social Media for maximum ROI. Read the Complete guide.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-business-360-marketing',
      ogTitle: '360 Marketing Strategy Guide for Vancouver Businesses',
      ogDescription:
        'Learn how to build a 360° marketing strategy that links SEO, Web, and Social Media for maximum ROI. Read the Complete guide.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        '360 marketing strategy Vancouver',
        'digital marketing agency Vancouver',
        'integrated marketing Vancouver',
        'omnichannel marketing Vancouver',
        'full service marketing agency Vancouver',
        'social media marketing Vancouver',
        'brand marketing strategy Vancouver',
        'SEO and paid ads Vancouver',
      ],
    },
  },
  {
    id: 3,
    slug: 'strong-website-vancouver-business',
    title: 'Why Vancouver Businesses Need a Strong Website in 2026',
    href: '/blogs/strong-website-vancouver-business',
    description:
      'Your website is your digital storefront, the first impression potential customers get of your brand. A custom-coded, fast, and SEO-optimized website is essential to gaining credibility and increasing conversions.',
    imageUrl: '/images/blogs/websites/strong-website-vancouver-business.avif',
    imageAlt:
      'Modern Vancouver business website shown on desktop and mobile screens with a fast, responsive web design.',
    date: 'Jan 15, 2025',
    datetime: '2025-01-15',
    updatedAt: '2026-09-03',
    category: {
      title: 'Websites',
      slug: 'websites',
      href: '/blogs?category=websites',
    },
    serviceSlug: 'website-design',
    authorSlug: 'perseus-creative-studio',
    relatedPosts: [
      'the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated',
      '5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
      'digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
      'vancouver-business-360-marketing',
    ],
    externalSources: [
      {
        title:
          'Google: The need for mobile speed',
        href: 'https://blog.google/products/admanager/the-need-for-mobile-speed/',
      },
    ],
    keyTakeaways: [
      'Websites should load in under three seconds; slower sites lose visitors and rank lower on Google.',
      'Mobile responsiveness is essential because most Vancouver users browse on phones.',
      'Local SEO makes a business appear when clients search for services in Vancouver.',
      'Conversion Rate Optimization with clear CTAs, simple navigation, and less friction turns traffic into leads.',
      'Custom professional design builds trust, while DIY builders often look amateurish and erode credibility.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'WordPress',
        sameAs: [
          'https://www.wikidata.org/wiki/Q13166',
          'https://en.wikipedia.org/wiki/WordPress',
        ],
      },
      {
        name: 'Next.js',
        sameAs: [
          'https://www.wikidata.org/wiki/Q56062435',
          'https://en.wikipedia.org/wiki/Next.js',
        ],
      },
    ],
    seo: {
      title: 'Why Your Vancouver Business Needs a Strong Website?',
      description:
        'Learn why an online presence is essential in competitive Vancouver Market. Get expert tips on web development and SEO to turn visitors into loyal customers.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/strong-website-vancouver-business',
      ogTitle: 'Why Your Vancouver Business Needs a Strong Website?',
      ogDescription:
        'Learn why an online presence is essential in competitive Vancouver Market. Get expert tips on web development and SEO to turn visitors into loyal customers.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'web design Vancouver',
        'website development Vancouver',
        'small business website Vancouver',
        'custom website design Vancouver',
        'SEO website Vancouver',
        'mobile friendly website Vancouver',
        'website conversion optimization Vancouver',
        'professional website design Vancouver',
      ],
    },
  },
  {
    id: 4,
    slug: 'the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated',
    title:
      'The Cost of Inaction: What Happens to Your Vancouver Business When Your Website is Outdated?',
    href: '/blogs/the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated',
    description:
      "Technology moves fast, and user expectations move even faster. A website that looked modern when it was built in 2020 is likely considered outdated by today's standards. In 2026, an outdated website isn't just about bad design; it's about a failure to meet the technical and aesthetic demands of a sophisticated online consumer.",
    imageUrl:
      '/images/blogs/websites/the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated.avif',
    imageAlt:
      'Modern before-and-after website redesign visual showing an outdated Vancouver business website compared with a faster, more professional, mobile-friendly website.',
    date: 'Feb 10, 2026',
    datetime: '2026-02-10',
    updatedAt: '2026-09-03',
    category: {
      title: 'Websites',
      slug: 'websites',
      href: '/blogs?category=websites',
    },
    serviceSlug: 'website-redesign',
    authorSlug: 'perseus-creative-studio',
    externalSources: [
      {
        title:
          'Google: The need for mobile speed',
        href: 'https://blog.google/products/admanager/the-need-for-mobile-speed/',
      },
      {
        title:
          'Sistrix: Why (almost) everything you knew about Google CTR is no longer valid',
        href: 'https://www.sistrix.com/blog/why-almost-everything-you-knew-about-google-ctr-is-no-longer-valid/',
      },
      {
        title:
          'Lindgaard et al. (2006), Attention web designers: you have 50 milliseconds to make a good first impression',
        href: 'https://www.semanticscholar.org/paper/f9715b117c57d4e7064afe1c1cb95d5bf4cc1831',
      },
      {
        title:
          'StatCounter: Desktop vs Mobile vs Tablet Market Share Worldwide',
        href: 'https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet',
      },
    ],
    keyTakeaways: [
      'Page speed is a Google ranking factor; sites loading over three seconds lose more than half of their visitors.',
      'Over 60% of web traffic comes from mobile, so a non-responsive site neglects most potential clients.',
      'Visitors form an opinion about a business within 0.05 seconds, so an outdated site immediately erodes trust.',
      'Outdated WordPress installs and abandoned plugins expose BC businesses to breaches and PIPA legal liability.',
      'Custom-coded websites outperform templates in speed, scalability, and long-term flexibility for Vancouver businesses.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
        primary: true,
      },
      {
        name: 'WordPress',
        sameAs: [
          'https://www.wikidata.org/wiki/Q13166',
          'https://en.wikipedia.org/wiki/WordPress',
        ],
      },
      {
        name: 'Next.js',
        sameAs: [
          'https://www.wikidata.org/wiki/Q56062435',
          'https://en.wikipedia.org/wiki/Next.js',
        ],
      },
    ],
    seo: {
      title: 'Why an Outdated Website Costs Your Vancouver Business',
      description:
        'Learn the risks of website inactivity and how Perseus Creative Studio can transform your digital presence.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated',
      ogTitle:
        'What Happens to Your Vancouver Business When Your Website is Outdated?',
      ogDescription:
        'Learn the risks of website inactivity and how Perseus Creative Studio can transform your digital presence.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'outdated website Vancouver',
        'website redesign Vancouver',
        'website modernization Vancouver',
        'slow website impact on business',
        'old website risks Vancouver',
        'website refresh Vancouver',
        'web design update Vancouver',
        'website performance Vancouver small business',
      ],
    },
  },
  {
    id: 5,
    slug: 'digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
    title:
      'Marketing on a Small Budget in Vancouver: Which Channel to Fund First',
    href: '/blogs/digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
    description:
      'A small marketing budget fails from being spread, not from being small. How to find the one channel already producing customers, choose by intent when you are starting cold, and decide which parts of the work to do yourself and which to hire out.',
    imageUrl:
      '/images/blogs/digital-marketing/digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners.avif',
    imageAlt:
      'Digital marketing guide visual for Vancouver business owners, showing SEO, ads, and social media across desktop and mobile.',
    date: 'Feb 11, 2026',
    datetime: '2026-02-11',
    updatedAt: '2026-09-03',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    authorSlug: 'perseus-creative-studio',
    keyTakeaways: [
      'A small budget fails from being spread across channels, not from being small. Concentration is the largest funding decision available and it costs nothing.',
      'Find the channel already producing customers before spending anything new: ask every new customer how they found you for a month, and count enquiries per channel rather than traffic.',
      'Starting cold, choose by intent: Google Ads when people already search for your service, Meta ads when demand has to be created, and Google reviews first when the budget is genuinely tight.',
      'Split the work rather than choosing all-or-nothing: keep reviews, raw footage, and customer questions in-house, and hire the paid advertising and technical work where learning on the job costs real budget.',
      'Judge a channel on cost per customer after a fair run. A week measures noise, and a channel that never got proper funding has not failed, it has not been tested.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'Small Marketing Budget in Vancouver: Which Channel First?',
      description:
        'Choose one marketing channel instead of five. How Vancouver owners with a limited budget pick between Google Ads, Meta ads, and Google reviews, and when to DIY versus hire.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
      ogTitle:
        'Which Marketing Channel Should a Small Vancouver Budget Fund First?',
      ogDescription:
        'Stop spreading a small budget across five channels. A practical guide to concentrating spend by customer intent, and splitting the work between yourself and an agency.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'small marketing budget Vancouver',
        'which marketing channel first',
        'Google Ads for small business Vancouver',
        'Meta ads vs Google Ads',
        'DIY marketing vs hiring an agency',
        'Google reviews for local business',
        'cost per customer',
        'marketing on a limited budget',
        'intent-based advertising',
        'Vancouver small business marketing',
      ],
    },
  },
  {
    id: 6,
    slug: 'the-ultimate-2026-media-production-guide-for-vancouver-business-owners',
    title:
      'The Ultimate 2026 Media Production Guide for Vancouver Business Owners',
    href: '/blogs/the-ultimate-2026-media-production-guide-for-vancouver-business-owners',
    description:
      'In the heart of British Columbia, where the skyline of downtown Vancouver meets the rugged beauty of the North Shore, the visual identity of a business is no longer just a digital business card. It is its most valuable currency. As we move through 2026, the local market has reached a tipping point. With over 30,000 small businesses in the Greater Vancouver Area alone, the noise is louder than ever.',
    imageUrl: '/images/blogs/production/the-ultimate-2026-media-production-guide-for-vancouver-business-owners.avif',
    imageAlt:
      'Media production crew filming a commercial brand shoot in Vancouver',
    date: 'Feb 21, 2026',
    datetime: '2026-02-21',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'perseus-creative-studio',
    externalSources: [
      {
        title:
          'Digiday: 85 percent of Facebook video is watched without sound',
        href: 'https://digiday.com/media/silent-world-facebook-video/',
      },
    ],
    keyTakeaways: [
      'Adding a high-quality brand video to a landing page can raise conversion rates by up to 80 percent.',
      'One high-end shoot should be repurposed into a pillar film, vertical micro-clips, and high-res stills across every platform.',
      'Post-production runs 5 to 10 hours per hour of footage, so the shoot day is only about 10 percent of the work.',
      'Measure media ROI through completion rate, drop-off, and assisted conversions rather than vanity views or likes.',
      'Up to 80 percent of vertical video is watched without sound, so burned-in captions and 4K/6K capture are essential.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Video production',
        sameAs: [
          'https://www.wikidata.org/wiki/Q12996592',
          'https://en.wikipedia.org/wiki/Video_production',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'TikTok',
        sameAs: [
          'https://www.wikidata.org/wiki/Q48938223',
          'https://en.wikipedia.org/wiki/TikTok',
        ],
      },
      {
        name: 'YouTube',
        sameAs: [
          'https://www.wikidata.org/wiki/Q866',
          'https://en.wikipedia.org/wiki/YouTube',
        ],
      },
    ],
    seo: {
      title: '2026 Media Production Guide for Vancouver Businesses',
      description:
        'Our 2026 media production guide explains how Vancouver businesses should scale their brand, find their own high-end video factors, and track real ROI',
      canonicalPath:
        'https://www.perseustudio.com/blogs/the-ultimate-2026-media-production-guide-for-vancouver-business-owners',
      ogTitle:
        'The Ultimate 2026 Media Production Guide for Vancouver Business Owners',
      ogDescription:
        'Our 2026 media production guide explains how Vancouver businesses should scale their brand, find their own high-end video factors, and track real ROI',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'media production Vancouver',
        'video production Vancouver',
        'commercial photography Vancouver',
        'brand video Vancouver',
        'corporate videography Vancouver',
        'video marketing Vancouver',
        'photography and videography Vancouver',
        'media production guide 2026 Vancouver',
      ],
    },
  },
  {
    id: 7,
    slug: '5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
    title:
      '5 Web Design Mistakes Costing Vancouver Small Businesses Sales: the 5-Minute Test for Each',
    href: '/blogs/5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
    description:
      'Five web design faults quietly cost Vancouver small businesses sales, and none of them are visible to the owner. Each one here comes with a five-minute test you run on your own site today, a pass/fail check, and a scored checklist at the end.',
    imageUrl: '/images/blogs/websites/5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales.avif',
    imageAlt:
      'Vancouver small business website illustrating common web design mistakes that hurt sales',
    date: 'Feb 24, 2026',
    datetime: '2026-02-24',
    updatedAt: '2026-09-03',
    category: {
      title: 'Websites',
      slug: 'websites',
      href: '/blogs?category=websites',
    },
    serviceSlug: 'website-design',
    authorSlug: 'perseus-creative-studio',
    keyTakeaways: [
      'Reverse-image-search your three hero photos: a result outside your own domain means visitors can spot the stock imagery too.',
      'Show your home page to a stranger for five seconds; they should name your service and a way to contact you.',
      'Call your own business one-handed, from a cold search on cellular data. Zooming or a second hand is a fail.',
      'Search your service plus your neighbourhood in incognito, then check your address and phone match your Google Business Profile exactly.',
      'Read your footer year, newest project, and newest post; anything older than a year reads as an abandoned business.',
    ],
    entities: [
      {
        name: 'Web design',
        sameAs: [
          'https://www.wikidata.org/wiki/Q190637',
          'https://en.wikipedia.org/wiki/Web_design',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: '5 Web Design Mistakes: Test Your Vancouver Site Yourself',
      description:
        'Five web design mistakes costing Vancouver small businesses sales, each with a five-minute test you can run on your own site, plus a scored checklist.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
      ogTitle: '5 Web Design Mistakes and the 5-Minute Test for Each',
      ogDescription:
        'Run five quick tests on your own website: your hero photos, a five-second stranger test, a one-handed call, a neighbourhood search, and your footer date. Then score it.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'web design mistakes Vancouver',
        'website audit Vancouver small business',
        'how to test my own website',
        'five second website test',
        'mobile website test one-handed',
        'local SEO checklist Vancouver',
        'Google Business Profile NAP match',
        'neighbourhood SEO Vancouver',
        'small business web design Vancouver',
        'website design checklist Vancouver',
      ],
    },
  },
  {
    id: 8,
    slug: 'real-estate-videography-vancouver-property-features',
    title:
      'Real Estate Videography in Vancouver: How to Showcase a Property’s Best Features',
    href: '/blogs/real-estate-videography-vancouver-property-features',
    description:
      'Learn how Vancouver real estate videography, photography, Matterport, 3D models, and aerial production help listings stand out online.',
    imageUrl: '/images/blogs/production/real-estate-videography-vancouver-property-features.avif',
    imageAlt:
      'Real estate videographer recording a cinematic walkthrough of a Vancouver property',
    date: 'May 12, 2026',
    datetime: '2026-05-12',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'perseus-creative-studio',
    relatedPosts: [
      'vancouver-real-estate-videography-photography',
      '2d-vs-3d-floor-plans-real-estate-vancouver',
      'drone-videography-vancouver-real-estate-listings',
      'cinematic-real-estate-marketing-vancouver',
    ],
    keyTakeaways: [
      'Real estate video shows movement through a home, clarifying layout, room flow, and natural light that still photos cannot fully convey.',
      'One production day can yield a full listing film plus vertical clips, teasers, and paid-ad creative for multiple channels.',
      'Videography works best paired with photography, Matterport or 3D tours, floor plans, and aerial production as a complete package.',
      'Plan the shoot around the property\'s top three to five selling points and where the final video will be distributed.',
      'Avoid fast camera moves, wide-angle distortion, weak lighting, and skipping short-form social cutdowns.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Videography Vancouver: Showcase Homes',
      description:
        'Learn how Vancouver real estate videography, photography, Matterport, 3D models, and aerial production help listings stand out online.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-videography-vancouver-property-features',
      ogTitle:
        'Real Estate Videography in Vancouver: How to Showcase a Property’s Best Features',
      ogDescription:
        'A practical guide for Vancouver realtors on using videography, photography, Matterport, 3D models, and aerial production to market listings more effectively.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'real estate videography Vancouver',
        'property videography Vancouver',
        'Vancouver real estate photography',
        'listing videos Vancouver',
        'real estate media Vancouver',
        'Matterport real estate Vancouver',
        'real estate drone video Vancouver',
        'property marketing videos',
        'Vancouver realtor marketing',
        '2D and 3D models real estate',
        'aerial production Vancouver',
        'commercial content creation Vancouver',
      ],
    },
  },
  {
    id: 9,
    slug: 'real-estate-photography-vancouver-sell-home-faster',
    title:
      'Why Professional Real Estate Photography Helps Vancouver Homes Sell Faster',
    href: '/blogs/real-estate-photography-vancouver-sell-home-faster',
    description:
      'Learn how professional real estate photography helps Vancouver listings make stronger first impressions, attract buyers, and support faster sales.',
    imageUrl: '/images/blogs/production/real-estate-photography-vancouver-sell-home-faster.avif',
    imageAlt:
      'Professional real estate photographer capturing a bright Vancouver living room interior',
    date: 'May 13, 2026',
    datetime: '2026-05-13',
    updatedAt: '2026-05-13',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'Professional listing photos shape a buyer\'s first impression online, before any showing or agent contact in Vancouver.',
      'Photography cannot guarantee a faster sale; pricing, location, condition, and market timing still determine outcomes.',
      'Strong galleries supply reusable assets for MLS, websites, social media, email, and paid advertising campaigns.',
      'Aerial and drone production adds value for view homes, waterfront, large lots, and luxury Vancouver listings.',
      'Preparing a home by decluttering, cleaning, opening blinds, and tidying outdoor areas improves the final images.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'Vancouver Real Estate Photography That Helps Homes Sell',
      description:
        'Learn how professional real estate photography helps Vancouver listings make stronger first impressions, attract buyers, and support faster sales.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photography-vancouver-sell-home-faster',
      ogTitle:
        'Why Professional Real Estate Photography Helps Vancouver Homes Sell Faster',
      ogDescription:
        'A practical guide for Vancouver realtors on how professional photography, videography, and aerial production support stronger listing marketing.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography Vancouver',
        'Vancouver real estate photography',
        'professional real estate photography',
        'property photography Vancouver',
        'listing photography Vancouver',
        'real estate media Vancouver',
        'Vancouver realtor photography',
        'real estate listing photos',
        'aerial photography Vancouver',
        'real estate videography Vancouver',
        'property marketing Vancouver',
        'Vancouver real estate media',
      ],
    },
  },
  {
    id: 10,
    slug: 'real-estate-photo-video-online-appeal-vancouver',
    title:
      'How Professional Photography and Videography Increase a Home’s Online Appeal',
    href: '/blogs/real-estate-photo-video-online-appeal-vancouver',
    description:
      'See how professional real estate photography and videography help Vancouver listings earn attention, improve buyer trust, and market better online.',
    imageUrl: '/images/blogs/production/real-estate-photo-video-online-appeal-vancouver.avif',
    imageAlt:
      'Photographer and videographer working together on a Vancouver real estate listing shoot',
    date: 'May 14, 2026',
    datetime: '2026-05-14',
    updatedAt: '2026-05-14',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'vancouver-real-estate-videography-photography',
      'real-estate-photography-vancouver-sell-home-faster',
      'real-estate-photography-vs-videography-vancouver',
      'first-impressions-vancouver-real-estate-photography',
    ],
    keyTakeaways: [
      'Buyers judge a listing first through photos and video, so online appeal is often the deciding filter before any showing.',
      'Photography is the listing foundation because buyers scan galleries to compare rooms before reading descriptions or watching video.',
      'Video adds flow and atmosphere, explaining layout, room-to-room movement, and lifestyle features that still images cannot convey.',
      'The lead image is a strategic choice that varies by property and strongly affects whether buyers open the listing.',
      'Professional visuals build buyer confidence and cannot guarantee a faster sale or higher price on their own.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'YouTube',
        sameAs: [
          'https://www.wikidata.org/wiki/Q866',
          'https://en.wikipedia.org/wiki/YouTube',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Photo and Video for Online Appeal',
      description:
        'See how professional real estate photography and videography help Vancouver listings earn attention, improve buyer trust, and market better online.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photo-video-online-appeal-vancouver',
      ogTitle:
        'How Professional Photography and Videography Increase a Home’s Online Appeal',
      ogDescription:
        'A practical guide for Vancouver realtors on using professional photography and videography to make listings more attractive online.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography and videography Vancouver',
        'Vancouver real estate photography',
        'Vancouver real estate videography',
        'professional listing photos',
        'property video Vancouver',
        'real estate media Vancouver',
        'home listing photography',
        'real estate video marketing',
        'Vancouver realtor media',
        'online listing appeal',
        'property marketing Vancouver',
        'professional photo and video for real estate',
      ],
    },
  },
  {
    id: 11,
    slug: 'cinematic-real-estate-marketing-vancouver',
    title:
      'What Makes a Real Estate Video Cinematic? A Vancouver Shot-by-Shot Breakdown',
    href: '/blogs/cinematic-real-estate-marketing-vancouver',
    description:
      'A shot-by-shot breakdown of what makes a Vancouver listing video cinematic: the eight-shot list, camera movement, pacing, sound, and colour.',
    imageUrl: '/images/blogs/production/cinematic-real-estate-marketing-vancouver.avif',
    imageAlt:
      'Cinematic camera rig filming a luxury Vancouver property for a realtor marketing campaign',
    date: 'May 16, 2026',
    datetime: '2026-05-16',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'Cinematic is a specification, not a style: a named shot list, chosen movement, timed cuts, and a grade matched to the photo gallery.',
      'Eight shots cover most listing films: establishing exterior, arrival, entry reveal, hero push-in, kitchen orbit, view pull-back, detail inserts, twilight closer.',
      'Match movement to the property: sliders and static frames for condos, gimbal for family homes, jib and long reveals for luxury.',
      'A 60 to 90 second film runs two to four second cuts; the vertical version is re-edited from the source, never cropped.',
      'Skip the cinematic treatment when a property has nothing to reveal. A stills package and one vertical cut serve it better.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'YouTube',
        sameAs: [
          'https://www.wikidata.org/wiki/Q866',
          'https://en.wikipedia.org/wiki/YouTube',
        ],
      },
      {
        name: 'TikTok',
        sameAs: [
          'https://www.wikidata.org/wiki/Q48938223',
          'https://en.wikipedia.org/wiki/TikTok',
        ],
      },
    ],
    seo: {
      title: 'Cinematic Real Estate Video Vancouver: Shot-by-Shot Guide',
      description:
        'The eight shots, camera movements, pacing, sound and colour decisions that make a Vancouver listing video cinematic, in a shot-by-shot production breakdown.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/cinematic-real-estate-marketing-vancouver',
      ogTitle:
        'What Makes a Real Estate Video Cinematic? A Vancouver Shot-by-Shot Breakdown',
      ogDescription:
        'The eight-shot list for a listing film, the movement vocabulary behind each shot, pacing for horizontal and vertical cuts, music licensing, and colour consistency across rooms.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'cinematic real estate video',
        'real estate video shot list',
        'listing video shot list Vancouver',
        'real estate camera movement',
        'gimbal vs slider real estate video',
        'real estate video pacing',
        'vertical listing video',
        'twilight real estate video',
        'real estate video music licensing',
        'colour grading real estate video',
        'Vancouver real estate videography',
        'listing film Vancouver',
      ],
    },
  },
  {
    id: 12,
    slug: 'aerial-real-estate-photography-vancouver-listings',
    title:
      'Aerial Real Estate Photography in Vancouver: Showcase Listings from Above',
    href: '/blogs/aerial-real-estate-photography-vancouver-listings',
    description:
      'Learn how aerial real estate photography helps Vancouver listings showcase location, scale, views, and property features more effectively.',
    imageUrl: '/images/blogs/production/aerial-real-estate-photography-vancouver-listings.webp',
    imageAlt:
      'Aerial photograph of a Vancouver home showing the property, lot, and surrounding neighbourhood',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-05-17',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'aerial-production',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'drone-photography-real-estate-vancouver',
      'drone-videography-vancouver-real-estate-listings',
      'aerial-photography-vancouver-waterfront-real-estate',
      'vancouver-real-estate-videography-photography',
    ],
    keyTakeaways: [
      'Aerial photography reveals a property\'s lot size, views, outdoor space, and neighbourhood context that ground-level photos cannot fully show.',
      'Use aerial images strategically, only when they clarify a listing\'s strongest selling points rather than as a default for every property.',
      'Large lots, luxury and view homes, waterfront properties, and location-driven listings benefit most from aerial photography.',
      'Aerial photography should support standard interior and exterior photography, not replace the essential room and detail shots buyers need.',
      'Professional aerial production requires flight planning, safety, compliance with Transport Canada rules, composition, and consistent editing.',
    ],
    entities: [
      {
        name: 'Aerial photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q191839',
          'https://en.wikipedia.org/wiki/Aerial_photography',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Transport Canada',
        sameAs: [
          'https://www.wikidata.org/wiki/Q2035496',
          'https://en.wikipedia.org/wiki/Transport_Canada',
        ],
      },
    ],
    seo: {
      title: 'Aerial Real Estate Photography Vancouver Listings',
      description:
        'Learn how aerial real estate photography helps Vancouver listings showcase location, scale, views, and property features more effectively.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/aerial-real-estate-photography-vancouver-listings',
      ogTitle:
        'Aerial Real Estate Photography in Vancouver: Showcase Listings from Above',
      ogDescription:
        'A practical guide for Vancouver realtors on using aerial photography and aerial production to showcase property scale, location, views, and listing value.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'aerial real estate photography Vancouver',
        'real estate drone photography Vancouver',
        'aerial photography for real estate',
        'Vancouver property photography',
        'real estate aerial production',
        'drone real estate photography',
        'Vancouver real estate media',
        'property listing photography',
        'Vancouver aerial production',
        'real estate photography Vancouver',
        'property marketing Vancouver',
        'drone photography for listings',
      ],
    },
  },
  {
    id: 13,
    slug: 'drone-videography-vancouver-real-estate-listings',
    title:
      'Drone Videography in Vancouver: Aerial Perspectives for Real Estate Listings',
    href: '/blogs/drone-videography-vancouver-real-estate-listings',
    description:
      'Learn how drone videography helps Vancouver real estate listings show scale, views, location, outdoor space, and stronger buyer context.',
    imageUrl: '/images/blogs/production/drone-videography-vancouver-real-estate-listings.webp',
    imageAlt:
      'Drone capturing aerial video footage above a Vancouver real estate listing',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'aerial-production',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'Drone videography conveys a listing\'s scale, views, outdoor space, and neighbourhood context that ground-level media cannot fully communicate.',
      'Aerial footage is most worthwhile for properties with strong views, large lots, waterfront proximity, luxury positioning, or a meaningful neighbourhood story.',
      'Not every listing needs drone video; compact properties are often better served by photography and interior video.',
      'Drone work performs best as part of a complete media package alongside professional photography and interior videography.',
      'In Canada, drone operation is regulated by Transport Canada, covering pilot certification, registration, and where drones can fly.',
    ],
    entities: [
      {
        name: 'Aerial photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q191839',
          'https://en.wikipedia.org/wiki/Aerial_photography',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Transport Canada',
        sameAs: [
          'https://www.wikidata.org/wiki/Q2035496',
          'https://en.wikipedia.org/wiki/Transport_Canada',
        ],
      },
    ],
    seo: {
      title: 'Drone Videography Vancouver Real Estate Listings',
      description:
        'Learn how drone videography helps Vancouver real estate listings show scale, views, location, outdoor space, and stronger buyer context.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/drone-videography-vancouver-real-estate-listings',
      ogTitle:
        'Drone Videography in Vancouver: Aerial Perspectives for Real Estate Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on using drone videography and aerial production to showcase listings with stronger visual context.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'drone videography Vancouver real estate',
        'Vancouver drone videography',
        'real estate drone video Vancouver',
        'aerial production Vancouver',
        'drone video for real estate',
        'Vancouver real estate videography',
        'property drone videography',
        'aerial real estate video',
        'Vancouver real estate media',
        'drone footage for listings',
        'property marketing Vancouver',
        'real estate aerial production',
      ],
    },
  },
  {
    id: 14,
    slug: 'prepare-home-real-estate-photography-vancouver',
    title:
      'Real Estate Photo Shoot Checklist: How to Prep Every Room of a Vancouver Home',
    href: '/blogs/prepare-home-real-estate-photography-vancouver',
    description:
      'A room-by-room checklist for getting your Vancouver home ready for the listing photographer: what to clear, clean, replace, and put away before shoot day.',
    imageUrl: '/images/blogs/production/prepare-home-real-estate-photography-vancouver.webp',
    imageAlt:
      'Staged Vancouver home prepared and styled for a professional real estate photo shoot',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'how-to-take-professional-real-estate-photos',
      'real-estate-photography-vancouver-sell-home-faster',
      'first-impressions-vancouver-real-estate-photography',
      'real-estate-photography-lighting-vancouver',
    ],
    keyTakeaways: [
      'Preparing for listing photos is mostly subtraction: clear every surface and remove what the room does not need.',
      'Work room by room, not task by task: living areas, entry, kitchen, bedrooms, bathrooms, flex spaces, then outdoors.',
      'Lighting needs lead time: replace burned-out bulbs, match bulb colour within each room, and wash the windows days ahead.',
      'On shoot day, open the blinds, turn on every light, secure pets, move cars off the driveway, then leave the house.',
      'Your agent should send a checklist, confirm the shoot window, and say which features the photos have to capture.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Architectural photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q635309',
          'https://en.wikipedia.org/wiki/Architectural_photography',
        ],
        primary: true,
      },
    ],
    seo: {
      title: 'Real Estate Photo Shoot Checklist for Vancouver Sellers',
      description:
        'A room-by-room checklist for getting your Vancouver home ready for the listing photographer: what to clear, clean, replace, and put away before shoot day.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/prepare-home-real-estate-photography-vancouver',
      ogTitle:
        'Real Estate Photo Shoot Checklist: How to Prep Every Room of a Vancouver Home',
      ogDescription:
        'What to clear, clean, and put away in every room before your listing photographer arrives, plus exactly what to do the morning of the shoot.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photo shoot checklist',
        'how to prepare your home for listing photos',
        'prepare home for real estate photography',
        'what to do before real estate photos',
        'listing photo preparation checklist',
        'getting your house ready for photos',
        'declutter before listing photos',
        'shoot day checklist for sellers',
        'Vancouver home listing photos',
        'Vancouver real estate photography',
        'real estate photography preparation',
        'seller preparation for property photos',
      ],
    },
  },
  {
    id: 15,
    slug: 'vancouver-realtors-video-social-content-2026',
    title:
      'Why Vancouver Realtors Should Invest in Video and Social Content in 2026',
    href: '/blogs/vancouver-realtors-video-social-content-2026',
    description:
      'Learn why Vancouver realtors should invest in video and social content in 2026 to improve listing visibility, trust, and brand consistency.',
    imageUrl: '/images/blogs/production/blog-vancouver-realtors-video-social-content-2026.webp',
    imageAlt:
      'Vancouver realtor recording vertical video content for social media marketing',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'Vancouver realtors are investing in video and social content in 2026 because visibility is harder to earn and maintain.',
      'Vertical short-form video on Instagram Reels, TikTok, and YouTube Shorts keeps agents visible between listings.',
      'On-camera educational content positions realtors as advisors, building trust before the first client call.',
      'A four-pillar mix of listing, educational, local lifestyle, and personal brand content outperforms relying on one category.',
      'Consistent short-form content beats rare expensive shoots; a hybrid model delivers both quality and frequency.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'TikTok',
        sameAs: [
          'https://www.wikidata.org/wiki/Q48938223',
          'https://en.wikipedia.org/wiki/TikTok',
        ],
      },
      {
        name: 'YouTube',
        sameAs: [
          'https://www.wikidata.org/wiki/Q866',
          'https://en.wikipedia.org/wiki/YouTube',
        ],
      },
    ],
    seo: {
      title: 'Video Marketing for Vancouver Realtors in 2026',
      description:
        'Learn why Vancouver realtors should invest in video and social content in 2026 to improve listing visibility, trust, and brand consistency.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-realtors-video-social-content-2026',
      ogTitle:
        'Why Vancouver Realtors Should Invest in Video and Social Content in 2026',
      ogDescription:
        'A practical guide for Vancouver realtors on using listing videos, vertical content, and personal brand media to stay visible in 2026.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'video marketing for Vancouver realtors',
        'real estate video marketing Vancouver',
        'Vancouver real estate videography',
        'realtor social media content',
        'real estate content marketing Vancouver',
        'listing video Vancouver',
        'vertical video for realtors',
        'real estate social media strategy',
        'Vancouver realtor video marketing',
        'Vancouver real estate social media',
        'property video Vancouver',
        'personal brand video for realtors',
      ],
    },
  },
  {
    id: 16,
    slug: 'drone-photography-real-estate-vancouver',
    title: 'How to Plan a Real Estate Drone Shoot in Vancouver',
    href: '/blogs/drone-photography-real-estate-vancouver',
    description:
      'A shoot-day planning guide for Vancouver realtors: the six-shot list, clearing strata and building permissions, booking the right light and wind, and specifying the edit.',
    imageUrl: '/images/blogs/production/drone-photography-real-estate-vancouver.webp',
    imageAlt:
      'Drone hovering over a Vancouver property capturing aerial real estate photography',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'aerial-production',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'aerial-real-estate-photography-vancouver-listings',
      'drone-videography-vancouver-real-estate-listings',
      'aerial-photography-vancouver-waterfront-real-estate',
      'how-to-take-professional-real-estate-photos',
    ],
    keyTakeaways: [
      'Decide what each aerial frame has to prove before the shoot; a frame that does not clarify the property should not reach the final gallery.',
      'Six shot categories cover most listings: establishing, elevated exterior, top-down, outdoor living areas, view and location, and selective neighbourhood context.',
      'Strata and building permissions are the step most likely to cost a shoot day. Confirm restrictions, access, and notice periods before scheduling.',
      'Book conditions around the property’s strongest feature: view properties need visibility, landscaped homes need soft light, and wind can cancel a flight outright.',
      'Capture stills and short clips in one production window and specify the crops up front, so social and MLS assets do not need a second call-out.',
    ],
    entities: [
      {
        name: 'Aerial photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q191839',
          'https://en.wikipedia.org/wiki/Aerial_photography',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Transport Canada',
        sameAs: [
          'https://www.wikidata.org/wiki/Q2035496',
          'https://en.wikipedia.org/wiki/Transport_Canada',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'Vancouver Real Estate Drone Shoot: Shot List & Strata Rules',
      description:
        'A shoot-day planning guide for Vancouver realtors: the six-shot list, clearing strata and building permissions, booking the right light and wind, and specifying the edit.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/drone-photography-real-estate-vancouver',
      ogTitle: 'How to Plan a Real Estate Drone Shoot in Vancouver',
      ogDescription:
        'The six-shot list, strata and building permissions, flight conditions, and deliverable crops: what to settle before a Vancouver aerial shoot.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      // Deliberately free of 'aerial real estate photography' and 'real estate
      // aerial photography': those are the head terms of
      // /blogs/aerial-real-estate-photography-vancouver-listings, and carrying
      // them here is a large part of why Google read the two posts as one.
      // This post owns the execution queries instead.
      keywords: [
        'real estate drone shot list',
        'drone photography checklist for realtors',
        'planning a real estate drone shoot',
        'can you fly a drone over a strata property BC',
        'best time of day for real estate drone photos',
        'strata drone permissions Vancouver',
        'drone photography for real estate Vancouver',
        'real estate drone photography Vancouver',
        'drone photos for real estate listings',
        'drone photography tips for realtors',
      ],
    },
  },
  {
    id: 17,
    slug: 'real-estate-photo-composition-tips-vancouver',
    title:
      'Real Estate Photo Composition Tips for Vancouver Listings That Stand Out',
    href: '/blogs/real-estate-photo-composition-tips-vancouver',
    description:
      'Learn real estate photo composition tips Vancouver agents can use to make listing images feel cleaner, more professional, and more buyer-friendly.',
    imageUrl: '/images/blogs/production/real-estate-photo-composition-tips-vancouver.webp',
    imageAlt:
      'Real estate photographer composing a wide-angle interior shot of a Vancouver home',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'Keep vertical lines straight so door frames, windows, and cabinets read as architectural rather than amateur.',
      'Use a mid-level camera height to present rooms honestly without compressing or exaggerating furniture.',
      'Shoot from a corner or doorway to show depth and layout, avoiding exaggerated wide-angle distortion.',
      'Choose the lead image by the property\'s strongest selling point, not automatically the front exterior.',
      'Sequence the gallery as a logical walkthrough and use detail shots only for meaningful features.',
    ],
    entities: [
      {
        name: 'Composition (visual arts)',
        sameAs: [
          'https://www.wikidata.org/wiki/Q462437',
          'https://en.wikipedia.org/wiki/Composition_(visual_arts)',
        ],
        primary: true,
      },
      {
        name: 'Architectural photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q635309',
          'https://en.wikipedia.org/wiki/Architectural_photography',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Photo Composition Tips for Realtors',
      description:
        'Learn real estate photo composition tips Vancouver agents can use to make listing images feel cleaner, more professional, and more buyer-friendly.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photo-composition-tips-vancouver',
      ogTitle:
        'Real Estate Photo Composition Tips for Vancouver Listings That Stand Out',
      ogDescription:
        'A practical guide for Vancouver realtors on camera height, room angles, vertical lines, balance, light, and professional listing photo composition.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photo composition tips',
        'real estate photography Vancouver',
        'listing photography tips',
        'property photography composition',
        'Vancouver real estate photography',
        'professional real estate photos',
        'real estate listing photos',
        'photography for real estate agents',
        'Vancouver realtor photography',
        'interior photography for listings',
        'property marketing Vancouver',
        'MLS photography tips',
      ],
    },
  },
  {
    id: 18,
    slug: 'real-estate-photography-lighting-vancouver',
    title:
      'Lighting for Real Estate Photography: How Vancouver Listings Stand Out',
    href: '/blogs/real-estate-photography-lighting-vancouver',
    description:
      'Learn how lighting affects real estate photography and how Vancouver realtors can create brighter, clearer, more professional listing photos.',
    imageUrl: '/images/blogs/production/real-estate-photography-lighting-vancouver.webp',
    imageAlt:
      'Bright natural light filling a Vancouver living room during a real estate photo shoot',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'Good real estate lighting prioritizes clarity and accuracy over making every room artificially bright.',
      'Balance interior exposure with bright windows using exposure bracketing, HDR, or exposure blending so both room and view stay believable.',
      'Avoid mixed colour temperatures by turning off some lights, matching bulbs, and correcting white balance rather than turning on every light.',
      'Dark rooms need shoot-stage solutions like tripods, longer exposures, and controlled flash, not aggressive editing that adds noise.',
      'Vancouver shoots should account for weather, seasonal daylight, window direction, views, and dense urban surroundings when scheduling.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Architectural photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q635309',
          'https://en.wikipedia.org/wiki/Architectural_photography',
        ],
        primary: true,
      },
    ],
    seo: {
      title: 'Real Estate Photography Lighting Tips',
      description:
        'Learn how lighting affects real estate photography and how Vancouver realtors can create brighter, clearer, more professional listing photos.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photography-lighting-vancouver',
      ogTitle:
        'Lighting for Real Estate Photography: How Vancouver Listings Stand Out',
      ogDescription:
        'A practical guide for Vancouver realtors on using natural light, flash, HDR, and better preparation to improve real estate listing photos.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography lighting',
        'Vancouver real estate photography',
        'lighting for real estate photos',
        'real estate photo lighting tips',
        'professional listing photography',
        'property photography Vancouver',
        'interior real estate photography',
        'listing photos Vancouver',
        'Vancouver realtor photography',
        'bright real estate photos',
        'property marketing Vancouver',
        'MLS photography tips',
      ],
    },
  },
  {
    id: 19,
    slug: 'real-estate-listing-marketing-vancouver-2026',
    title:
      'How to Market Real Estate Listings in Vancouver: 2026 Complete Guide',
    href: '/blogs/real-estate-listing-marketing-vancouver-2026',
    description:
      'A complete 2026 guide for Vancouver realtors on marketing listings with photography, video, aerials, Matterport, social content, and ads.',
    imageUrl: '/images/blogs/production/real-estate-listing-marketing-vancouver-2026-hero.webp',
    imageAlt:
      'Vancouver realtor reviewing a multi-channel real estate listing marketing campaign for 2026',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'A strong Vancouver listing campaign is planned before the property goes live, aligning media, launch calendar, social content, and ads.',
      'Start with professional photography, then add video, aerial production, floorplans, 3D models, and Matterport only where the property warrants them.',
      'Match the media package to the property type: condos, townhomes, detached homes, luxury estates, and pre-sales each need different marketing logic.',
      'Treat vertical short-form video as a required format and publish platform-specific content across MLS, social, email, and paid channels.',
      'Use paid ads selectively for reach and retargeting, and track metrics so each campaign improves the next.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Google Ads',
        sameAs: [
          'https://www.wikidata.org/wiki/Q271982',
          'https://en.wikipedia.org/wiki/Google_Ads',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'Vancouver Real Estate Listing Marketing Guide',
      description:
        'A complete 2026 guide for Vancouver realtors on marketing listings with photography, video, aerials, Matterport, social content, and ads.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-listing-marketing-vancouver-2026',
      ogTitle:
        'How to Market Real Estate Listings in Vancouver: 2026 Complete Guide',
      ogDescription:
        'A practical guide for Vancouver realtors on building stronger listing campaigns with photography, videography, aerial production, Matterport, social content, and paid ads.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate marketing Vancouver',
        'Vancouver real estate marketing',
        'real estate listing marketing',
        'Vancouver realtor marketing',
        'real estate videography Vancouver',
        'real estate photography Vancouver',
        'property marketing Vancouver',
        'real estate social media marketing',
        'real estate advertising Vancouver',
        'Matterport real estate Vancouver',
        'aerial production Vancouver',
        'real estate listing campaign',
        'Meta Ads for real estate',
        'Google Ads for real estate',
      ],
    },
  },
  {
    id: 20,
    slug: 'choose-real-estate-photographer-vancouver',
    title: 'How to Choose a Real Estate Photographer for Vancouver Listings',
    href: '/blogs/choose-real-estate-photographer-vancouver',
    description:
      'Learn how Vancouver realtors can choose the right real estate photographer by reviewing style, service fit, turnaround, communication, and value.',
    imageUrl: '/images/blogs/production/choose-real-estate-photographer-vancouver.webp',
    imageAlt:
      'Realtor comparing portfolios from Vancouver real estate photographers before booking',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'Choosing a real estate photographer is a marketing decision, since listing photos are often a buyer\'s first filter before booking a showing.',
      'Review a photographer\'s full listing gallery, not just hero shots, and confirm their style fits your property types and price points.',
      'Prioritize clean lighting, straight vertical lines, and minimal wide-angle distortion so rooms read as accurate rather than exaggerated.',
      'Weigh turnaround time, communication, deliverables, and usage rights, not just cost, when comparing photographers.',
      'For higher listing volume or value, a full-service media partner offering video, aerials, Matterport, and floorplans improves consistency over separate vendors.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'Choose the Right Vancouver Real Estate Photographer',
      description:
        'Learn how Vancouver realtors can choose the right real estate photographer by reviewing style, service fit, turnaround, communication, and value.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/choose-real-estate-photographer-vancouver',
      ogTitle:
        'How to Choose a Real Estate Photographer for Vancouver Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on choosing a real estate photographer or media partner based on portfolio quality, workflow, communication, turnaround, and listing strategy.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Vancouver real estate photographer',
        'real estate photography Vancouver',
        'real estate photographer Vancouver',
        'Vancouver property photographer',
        'listing photography Vancouver',
        'professional real estate photography',
        'real estate media Vancouver',
        'real estate videography Vancouver',
        'Vancouver realtor photography',
        'MLS photography Vancouver',
        'property marketing Vancouver',
        'real estate photography services',
      ],
    },
  },
  {
    id: 21,
    slug: '2d-vs-3d-floor-plans-real-estate-vancouver',
    title: '2D vs 3D Floor Plans for Vancouver Real Estate Listings',
    href: '/blogs/2d-vs-3d-floor-plans-real-estate-vancouver',
    description:
      'Compare 2D floor plans, 3D models, and Matterport tours for Vancouver real estate listings, and learn which option fits each property type.',
    imageUrl: '/images/blogs/production/2d-vs-3d-floor-plans-real-estate-vancouver.webp',
    imageAlt:
      'Side-by-side comparison of 2D and 3D floor plans for a Vancouver real estate listing',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: '2d-3d-models',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-floor-plans-vancouver-listings',
      'real-estate-videography-vancouver-property-features',
      'best-real-estate-media-vancouver-homes-2026',
      'real-estate-listing-marketing-vancouver-2026',
    ],
    keyTakeaways: [
      'A 2D floor plan is the best baseline for most listings because it shows room relationships and layout quickly.',
      '3D models suit larger, luxury, complex, or pre-sale listings where buyers need to visualize room flow and scale.',
      'Matterport and 360 tours add buyer-controlled exploration, valuable for remote buyers, relocation clients, and premium homes.',
      'A hybrid package combining photography, floor plans, 3D, and Matterport answers different buyer questions best.',
      'The right format depends on property type, buyer audience, and listing complexity, not adding every deliverable automatically.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: '2D vs 3D Floor Plans for Real Estate Listings',
      description:
        'Compare 2D floor plans, 3D models, and Matterport tours for Vancouver real estate listings, and learn which option fits each property type.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/2d-vs-3d-floor-plans-real-estate-vancouver',
      ogTitle: '2D vs 3D Floor Plans for Vancouver Real Estate Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on choosing 2D floor plans, 3D models, Matterport tours, and hybrid layout media for property listings.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        '2D vs 3D floor plans real estate',
        'real estate floor plans Vancouver',
        '3D floor plans for real estate',
        '2D floor plans for listings',
        'Matterport Vancouver real estate',
        'Vancouver real estate media',
        'property floor plans',
        '3D models for real estate',
        'Vancouver Matterport real estate',
        'real estate virtual tours Vancouver',
        'listing media Vancouver',
        'property marketing Vancouver',
      ],
    },
  },
  {
    id: 22,
    slug: 'real-estate-floor-plans-vancouver-listings',
    title: 'How Better Floor Plans Improve Vancouver Real Estate Listings',
    href: '/blogs/real-estate-floor-plans-vancouver-listings',
    description:
      'Learn how 2D floor plans, 3D models, and Matterport tours help Vancouver real estate listings feel clearer, stronger, and easier to evaluate.',
    imageUrl: '/images/blogs/production/real-estate-floor-plans-vancouver-listings.avif',
    imageAlt:
      'Detailed floor plan layout used as listing media for a Vancouver real estate property',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: '2d-3d-models',
    authorSlug: 'arshia-farahi',
    keyTakeaways: [
      'A 2D floor plan is the baseline listing asset, giving buyers fast, practical layout clarity for most Vancouver properties.',
      '3D models add value for larger homes, luxury, pre-sale, and complex or multi-level layouts that need more visual explanation.',
      'Matterport and 360-degree tours suit remote buyers, relocation clients, and investors comparing multiple properties interactively.',
      'Floor plans belong in the core listing media strategy alongside photography and video, not as an afterthought.',
      'Choose layout media based on buyer needs and property complexity rather than adding every available asset.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Floor Plans for Vancouver Listings',
      description:
        'Learn how 2D floor plans, 3D models, and Matterport tours help Vancouver real estate listings feel clearer, stronger, and easier to evaluate.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-floor-plans-vancouver-listings',
      ogTitle: 'How Better Floor Plans Improve Vancouver Real Estate Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on using 2D floor plans, 3D models, and Matterport tours to improve listing clarity and buyer confidence.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate floor plans Vancouver',
        'real estate floor plans',
        '2D floor plans for real estate',
        '3D floor plans for listings',
        'Matterport real estate Vancouver',
        'Vancouver real estate media',
        'property floor plans',
        'real estate listing media',
        '360 tours for real estate',
        'Vancouver Matterport real estate',
        'property marketing Vancouver',
        'listing media Vancouver',
      ],
    },
  },
  {
    id: 23,
    slug: 'digital-marketing-real-estate-vancouver-2026',
    title: 'Digital Marketing for Vancouver Realtors: 2026 Strategy Guide',
    href: '/blogs/digital-marketing-real-estate-vancouver-2026',
    description:
      'A 2026 guide to digital marketing for Vancouver realtors, covering SEO, websites, social media, paid ads, email, and retargeting.',
    imageUrl: '/images/blogs/digital-marketing/digital-marketing-real-estate-vancouver-2026.avif',
    imageAlt:
      'Vancouver realtor reviewing a digital marketing dashboard spanning web, social, and ads',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'Effective real estate digital marketing works as a connected system built around the client journey, not disconnected platform tactics.',
      'The website is the owned foundation that converts traffic; social media and SEO drive discovery and trust toward it.',
      'Realtors should market both current listings and long-term brand content, since sellers often watch agents for months before reaching out.',
      'Paid ads, email, and retargeting perform best paired with strong landing pages, clear creative, and conversion tracking.',
      'Vancouver realtors can follow a 90-day plan: build the foundation, then publish content, then add paid and retargeting.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Digital marketing',
        sameAs: [
          'https://www.wikidata.org/wiki/Q1323528',
          'https://en.wikipedia.org/wiki/Digital_marketing',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
      {
        name: 'Google Ads',
        sameAs: [
          'https://www.wikidata.org/wiki/Q271982',
          'https://en.wikipedia.org/wiki/Google_Ads',
        ],
      },
    ],
    seo: {
      title: 'Digital Marketing for Vancouver Realtors',
      description:
        'A 2026 guide to digital marketing for Vancouver realtors, covering SEO, websites, social media, paid ads, email, and retargeting.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/digital-marketing-real-estate-vancouver-2026',
      ogTitle: 'Digital Marketing for Vancouver Realtors: 2026 Strategy Guide',
      ogDescription:
        'A practical guide for Vancouver realtors on building a stronger digital marketing system with websites, SEO, social media, paid ads, email, and retargeting.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'digital marketing for real estate Vancouver',
        'real estate digital marketing',
        'Vancouver realtor marketing',
        'real estate SEO Vancouver',
        'real estate social media marketing',
        'Google Ads for real estate',
        'Meta Ads for real estate',
        'real estate marketing strategy',
        'digital marketing for realtors',
        'Vancouver real estate marketing',
        'real estate lead generation Vancouver',
        'realtor website marketing',
        'real estate retargeting',
        'property marketing Vancouver',
      ],
    },
  },
  {
    id: 24,
    slug: 'best-real-estate-media-vancouver-homes-2026',
    title:
      'The Best Real Estate Media for Selling Vancouver Homes Faster in 2026',
    href: '/blogs/best-real-estate-media-vancouver-homes-2026',
    description:
      'Learn which real estate media helps Vancouver homes stand out in 2026, from photography and video to aerials, floor plans, and Matterport.',
    imageUrl: '/images/blogs/production/best-real-estate-media-vancouver-homes-2026.avif',
    imageAlt:
      'Real estate media package showcasing a Vancouver home across photography, video, and aerials',
    date: 'May 20, 2026',
    datetime: '2026-05-20',
    updatedAt: '2026-05-20',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'Professional photography is the non-negotiable foundation of every listing, shaping the first impression across MLS, portals, and social media.',
      'Videography suits listings with views, renovated interiors, strong layouts, or luxury finishes, and generates vertical clips for social campaigns.',
      'Aerial production adds value when location, lot size, views, outdoor space, or neighbourhood context are part of the property\'s appeal.',
      '2D floor plans, 3D models, and Matterport tours clarify layout, especially for remote buyers, multi-level homes, and complex condos.',
      'The right media mix depends on property type, buyer audience, listing timeline, seller expectations, and marketing channels, not on adding every deliverable.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'Best Real Estate Media for Vancouver Homes',
      description:
        'Learn which real estate media helps Vancouver homes stand out in 2026, from photography and video to aerials, floor plans, and Matterport.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/best-real-estate-media-vancouver-homes-2026',
      ogTitle:
        'The Best Real Estate Media for Selling Vancouver Homes Faster in 2026',
      ogDescription:
        'A practical guide for Vancouver realtors on using photography, videography, aerial production, 2D and 3D models, and Matterport to improve listing marketing.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate media Vancouver',
        'Vancouver real estate photography',
        'Vancouver real estate videography',
        'real estate listing media',
        'property marketing Vancouver',
        'aerial production Vancouver',
        'Matterport real estate Vancouver',
        '2D and 3D floor plans real estate',
        'listing video Vancouver',
        'Vancouver realtor marketing',
        'professional real estate media',
        'real estate media strategy',
      ],
    },
  },
  {
    id: 25,
    slug: 'real-estate-photography-vs-videography-vancouver',
    title: 'Real Estate Photography vs Videography for Vancouver Listings',
    href: '/blogs/real-estate-photography-vs-videography-vancouver',
    description:
      'Compare real estate photography and videography for Vancouver listings, and learn when agents should use photos, video, or both.',
    imageUrl: '/images/blogs/production/real-estate-photography-vs-videography-vancouver.avif',
    imageAlt:
      'Side-by-side example of real estate photography and videography for a Vancouver listing',
    date: 'May 20, 2026',
    datetime: '2026-05-20',
    updatedAt: '2026-05-20',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    keyTakeaways: [
      'Real estate photography is the foundation of most listings, essential for MLS, galleries, websites, brochures, and quick buyer comparison.',
      'Videography adds movement, mood, and spatial flow, and is most valuable for properties with views, layout flow, or lifestyle stories.',
      'Photography alone often suffices for simple layouts, lean budgets, or tight timelines that a strong gallery and floor plan can explain.',
      'The strongest campaigns combine both: photography for clarity, video for experience, and short clips for social distribution.',
      'Videography drives social reach on Instagram Reels, TikTok, and YouTube Shorts, turning one shoot into multiple content assets.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q11633',
          'https://en.wikipedia.org/wiki/Photography',
        ],
        primary: true,
      },
      {
        name: 'Videography',
        sameAs: [
          'https://en.wikipedia.org/wiki/Videography',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Photo vs Video for Vancouver Listings',
      description:
        'Compare real estate photography and videography for Vancouver listings, and learn when agents should use photos, video, or both.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photography-vs-videography-vancouver',
      ogTitle: 'Real Estate Photography vs Videography for Vancouver Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on when to use photography, when to add videography, and how both formats support stronger listing marketing.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography vs videography',
        'real estate photography Vancouver',
        'real estate videography Vancouver',
        'Vancouver real estate media',
        'property photography and video',
        'listing photography Vancouver',
        'listing video Vancouver',
        'real estate video marketing',
        'Vancouver realtor media',
        'property marketing Vancouver',
        'real estate listing media',
        'professional real estate photography',
      ],
    },
  },
  {
    id: 26,
    slug: 'real-estate-photography-storytelling-vancouver',
    title:
      'How Story-Driven Real Estate Photography Helps Vancouver Listings Stand Out',
    href: '/blogs/real-estate-photography-storytelling-vancouver',
    description:
      'Learn how Vancouver realtors can use real estate photography storytelling to highlight lifestyle, flow, location, and property value.',
    excerpt:
      'A practical guide for Vancouver realtors on using photography to tell a stronger listing story through composition, light, lifestyle moments, sequencing, and neighbourhood context.',
    imageUrl: '/images/blogs/production/real-estate-photography-storytelling-vancouver.avif',
    imageAlt:
      'Story-driven real estate photography for a Vancouver property listing by Perseus Creative Studio',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-05-21',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'real-estate-photo-composition-tips-vancouver',
      'real-estate-photography-lighting-vancouver',
      'real-estate-photography-vs-videography-vancouver',
      'best-real-estate-media-vancouver-homes-2026',
    ],
    faqs: [
      {
        question: 'What is real estate photography storytelling?',
        answer:
          'Real estate photography storytelling is the strategic use of images to show how a property feels, flows, functions, and fits a buyer’s lifestyle, instead of only documenting individual rooms.',
      },
      {
        question:
          'Why does storytelling matter in Vancouver real estate photography?',
        answer:
          'Storytelling matters because Vancouver buyers often compare listings online before booking showings. A clear photo story can help them understand layout, lifestyle, location, views, and property value faster.',
      },
      {
        question: 'Can photography tell a story without video?',
        answer:
          'Yes. A strong photo gallery can tell a story through sequencing, composition, lighting, detail shots, exterior images, and neighbourhood context. Video can add movement, but photography remains the foundation.',
      },
      {
        question: 'What photos help tell the strongest listing story?',
        answer:
          'The strongest listing story usually includes a lead image, exterior context, main living areas, kitchen and dining flow, bedrooms, bathrooms, outdoor spaces, views, detail shots, and neighbourhood or lifestyle images where relevant.',
      },
      {
        question: 'Should every listing use lifestyle photography?',
        answer:
          'Not every listing needs heavy lifestyle photography. It is most useful when the property’s value depends on atmosphere, design, outdoor living, views, neighbourhood access, or a specific buyer lifestyle.',
      },
    ],
    externalSources: [
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
      {
        title: 'CREA: Canadian Real Estate and Social Media',
        href: 'https://www.crea.ca/cafe/the-age-of-online-tiktok-instagram-facebook-and-canadian-real-estate/',
      },
    ],
    keyTakeaways: [
      'Story-driven listing photography explains a property\'s layout, flow, and lifestyle rather than only documenting individual rooms.',
      'Photo sequence should feel like a guided walkthrough, leading with the property\'s strongest selling point.',
      'Composition and lighting direct buyer attention and set mood, especially in Vancouver condos and smaller spaces.',
      'Exterior and neighbourhood images matter when location, views, or walkability are part of the value.',
      'Photography remains the foundation of listing campaigns; video extends the story only when the property needs motion.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Architectural photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q635309',
          'https://en.wikipedia.org/wiki/Architectural_photography',
        ],
        primary: true,
      },
    ],
    seo: {
      title: 'Real Estate Photography Storytelling Vancouver',
      description:
        'Learn how Vancouver realtors can use real estate photography storytelling to highlight lifestyle, flow, location, and property value.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-photography-storytelling-vancouver',
      ogTitle:
        'How Story-Driven Real Estate Photography Helps Vancouver Listings Stand Out',
      ogDescription:
        'A practical guide for Vancouver realtors on using listing photography to tell a stronger property story through composition, lighting, sequencing, and lifestyle context.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography storytelling',
        'Vancouver real estate photography',
        'real estate listing photography',
        'property photography Vancouver',
        'storytelling in real estate marketing',
        'professional real estate photos',
        'listing media Vancouver',
        'real estate photography strategy',
        'Vancouver realtor photography',
        'visual storytelling real estate',
        'property marketing Vancouver',
        'real estate media Vancouver',
      ],
    },
  },
  {
    id: 27,
    slug: 'bad-real-estate-photos-vancouver-listings',
    title: 'What Weak Listing Photos Actually Cost a Vancouver Agent',
    href: '/blogs/bad-real-estate-photos-vancouver-listings',
    description:
      'The spend decision behind listing photography: what weak photos cost a Vancouver agent in attention, usable assets, re-shoots, and future listings.',
    excerpt:
      'What weak listing media costs a Vancouver agent, in attention against better-marketed comparables, in re-shoots, and in a portfolio future sellers will judge.',
    imageUrl: '/images/blogs/production/bad-real-estate-photos-vancouver-listings.avif',
    imageAlt:
      'Professional real estate photography setup for a Vancouver property listing',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-08-23',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-photography-vancouver-sell-home-faster',
      'prepare-home-real-estate-photography-vancouver',
      'first-impressions-vancouver-real-estate-photography',
      'real-estate-photography-storytelling-vancouver',
    ],
    faqs: [
      {
        question:
          'What do weak listing photos actually cost a Vancouver agent?',
        answer:
          'Rarely a single figure. The cost shows up as lost attention against better-marketed comparable listings, fewer usable frames for social, email, and paid campaigns, occasional re-shoots, and a weaker portfolio to present to the next seller. None of it appears as a line item, which is why it is easy to underestimate.',
      },
      {
        question:
          'Do professional photos shorten days on market?',
        answer:
          'There is no honest way to promise that. Days on market moves with pricing, condition, location, inventory, seasonality, and buyer demand. Photography influences whether buyers give a property enough attention to evaluate those factors, and that is what it should be judged on, not the closing date.',
      },
      {
        question:
          'Is a re-shoot more expensive than booking the right shoot first?',
        answer:
          'Yes, in every practical sense. A re-shoot means a second call-out and a second round of preparation and access for a property that has already been photographed, and it usually happens after the launch window, the period when the images had the most work to do.',
      },
      {
        question:
          'How should a Vancouver agent decide how much media a listing needs?',
        answer:
          'Start from the channels the listing has to feed, not from a package list. Count the assets each channel needs, confirm the crops on delivery, and add video, aerials, or a floor plan only where the property has something still frames cannot carry.',
      },
      {
        question:
          'What does a weak listing gallery cost after the property sells?',
        answer:
          'The listing ends, the images do not. They remain in the agent’s portfolio, social feed, and website, and they are what a future seller looks at when deciding who to hire. A gallery that needed excusing once will need excusing again.',
      },
    ],
    externalSources: [
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
      {
        title: 'CREA: The Age of Online and Canadian Real Estate',
        href: 'https://www.crea.ca/cafe/the-age-of-online-tiktok-instagram-facebook-and-canadian-real-estate/',
      },
    ],
    keyTakeaways: [
      'Weak listing photos rarely cost one measurable amount; the cost is spread across attention, usable assets, re-shoots, and future listings.',
      'Photography cannot claim days on market, which moves with pricing, condition, inventory, access, and buyer demand.',
      'The comparison set is narrow: a listing is judged against the best-marketed property a buyer opens the same evening.',
      'Judge a shoot by cost per usable asset, because one call-out has to feed MLS, social, email, print, and paid ads.',
      'A re-shoot pays for the same listing twice, and usually lands after the launch window has passed.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Multiple listing service',
        sameAs: [
          'https://en.wikipedia.org/wiki/Multiple_listing_service',
        ],
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'What Weak Listing Photos Cost a Vancouver Agent',
      description:
        'What weak listing photos really cost a Vancouver agent: lost attention in a narrow comparison set, fewer usable assets, re-shoots, and cost per asset.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/bad-real-estate-photos-vancouver-listings',
      ogTitle: 'What Weak Listing Photos Actually Cost a Vancouver Agent',
      ogDescription:
        'An honest accounting of the money question: what a listing gives up with weak photos, the one number photography can never claim, and how to judge cost per asset.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'cost of bad real estate photos',
        'is real estate photography worth the cost',
        'real estate photography ROI Vancouver',
        'listing photography budget Vancouver',
        'do listing photos affect days on market',
        'real estate photo reshoot cost',
        'cost of skipping professional listing photos',
        'how much to spend on listing media',
        'bad real estate photos',
        'Vancouver listing media spend',
        'value of professional listing photos',
      ],
    },
  },
  {
    id: 28,
    slug: 'aerial-photography-vancouver-waterfront-real-estate',
    title: 'How to Market a Vancouver Waterfront Listing by Neighbourhood',
    href: '/blogs/aerial-photography-vancouver-waterfront-real-estate',
    description:
      'A media plan for Vancouver waterfront and view listings, and what changes between False Creek, Coal Harbour, Kitsilano, and the North Shore.',
    excerpt:
      'How to plan the media for a Vancouver waterfront or view listing, and what changes between Coal Harbour, False Creek, Kitsilano and the North Shore.',
    imageUrl: '/images/blogs/production/aerial-photography-vancouver-waterfront-real-estate.avif',
    imageAlt:
      'Aerial photography of a Vancouver waterfront real estate listing with ocean and city context',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'aerial-production',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'aerial-real-estate-photography-vancouver-listings',
      'drone-videography-vancouver-real-estate-listings',
      'drone-photography-real-estate-vancouver',
      'best-real-estate-media-vancouver-homes-2026',
    ],
    faqs: [
      {
        question:
          'How do you market a waterfront listing in Vancouver?',
        answer:
          'Build the media around what the water does for the property: how close it is, which rooms and outdoor spaces face it, and whether the view is direct or partial. Interior photography composed toward the view and thorough outdoor coverage do most of the work, with video, a floor plan, a tour and aerial media added where the property gives each one a job.',
      },
      {
        question:
          'Does the media plan change between Coal Harbour, False Creek and the North Shore?',
        answer:
          'Yes. Coal Harbour sells a harbour and skyline address, so view direction, height and twilight matter most. False Creek sells seawall and marina proximity, so distance-to-water framing matters. North Shore listings usually combine water with mountains, outdoor recreation and, in West Vancouver, elevation and privacy.',
      },
      {
        question:
          'What should the lead image be on a waterfront listing?',
        answer:
          'The image that best establishes the property’s relationship to the water, not the most attractive room. On a listing priced for the view, leading with an interior shot buries the reason for the price.',
      },
      {
        question:
          'Do waterfront and view properties need a floor plan and a virtual tour?',
        answer:
          'Often, for different reasons. A floor plan is where orientation becomes clear: which rooms face the water and how the outdoor space relates to them. A tour is most useful when the listing is likely to attract relocation or out-of-town buyers who may decide before visiting.',
      },
      {
        question:
          'How should interior photos handle a strong water view?',
        answer:
          'Compose toward the view rather than square to the wall, and control window exposure so the view survives in the frame without leaving the room too dark. A blown-out window turns a view property into a generic interior.',
      },
      {
        question:
          'Is drone photography required for a waterfront listing?',
        answer:
          'No. Aerial media is useful when the property’s position relative to the water is hard to explain from the ground, and less useful when the view is blocked, the water proximity is indirect, or the property’s strength is interior. Drone operation in Canada is also regulated, so plan it with a qualified operator rather than adding it late.',
      },
    ],
    externalSources: [
      {
        title: 'Transport Canada: Flying Your Drone Safely and Legally',
        href: 'https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/flying-your-drone-safely-legally',
      },
      {
        title: 'Google Search Central: Video SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/video',
      },
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
    ],
    keyTakeaways: [
      'Plan the media around the neighbourhood first. Coal Harbour, False Creek, Kitsilano and the North Shore sell different water.',
      'State the view honestly, whether direct, partial, elevated or obstructed, before booking anything, because buyers check the claim.',
      'Interior photography composed toward the water and thorough outdoor coverage do most of the work on a view listing.',
      'Aerial media is one component of the package, not the campaign; use it when ground-level images cannot explain the setting.',
      'Lead the gallery with the property’s relationship to the water, not with the best-looking room.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Aerial photography',
        sameAs: [
          'https://www.wikidata.org/wiki/Q191839',
          'https://en.wikipedia.org/wiki/Aerial_photography',
        ],
        primary: true,
      },
      {
        name: 'Transport Canada',
        sameAs: [
          'https://www.wikidata.org/wiki/Q2035496',
          'https://en.wikipedia.org/wiki/Transport_Canada',
        ],
      },
    ],
    seo: {
      title: 'Vancouver Waterfront Listings: Media by Neighbourhood',
      description:
        'How to market a Vancouver waterfront or view listing, and how the media package changes across False Creek, Coal Harbour, Kitsilano, and the North Shore.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/aerial-photography-vancouver-waterfront-real-estate',
      ogTitle: 'How to Market a Vancouver Waterfront Listing by Neighbourhood',
      ogDescription:
        'Plan the media for a Vancouver waterfront or view listing: neighbourhood priorities, interior sightlines, outdoor space, and where aerial actually fits.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Vancouver waterfront real estate marketing',
        'waterfront listing media plan',
        'waterfront property marketing Vancouver',
        'Vancouver view property photography',
        'Coal Harbour real estate marketing',
        'False Creek condo listing media',
        'Kitsilano real estate photography',
        'North Vancouver waterfront listing',
        'West Vancouver view property marketing',
        'North Shore real estate media',
        'Vancouver waterfront listing photography',
        'Vancouver real estate media',
      ],
    },
  },
  {
    id: 29,
    slug: 'vancouver-real-estate-photographer-worth-hiring',
    title: 'What Makes a Vancouver Real Estate Photographer Worth Hiring?',
    href: '/blogs/vancouver-real-estate-photographer-worth-hiring',
    description:
      'Learn what separates a strong Vancouver real estate photographer from the rest, from lighting and composition to workflow, strategy, and media support.',
    excerpt:
      'A practical guide for Vancouver realtors on choosing a real estate photographer who understands lighting, composition, local property types, workflow, and listing campaign needs.',
    imageUrl: '/images/blogs/production/vancouver-real-estate-photographer-worth-hiring.avif',
    imageAlt:
      'Professional Vancouver real estate photographer capturing a luxury property interior with city and mountain views.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-05-22',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'choose-real-estate-photographer-vancouver',
      'bad-real-estate-photos-vancouver-listings',
      'how-to-take-professional-real-estate-photos',
      'real-estate-photo-composition-tips-vancouver',
    ],
    faqs: [
      {
        question: 'What makes a good Vancouver real estate photographer?',
        answer:
          'A good Vancouver real estate photographer understands lighting, composition, local property types, editing consistency, listing timelines, and how photos support MLS, websites, social media, and seller marketing.',
      },
      {
        question:
          'Why does local experience matter in real estate photography?',
        answer:
          'Local experience matters because Vancouver properties often involve specific challenges such as cloudy weather, high-rise views, compact condos, mixed lighting, dense neighbourhoods, and luxury or waterfront positioning.',
      },
      {
        question: 'Should a real estate photographer also offer videography?',
        answer:
          'It is helpful when a photographer or media team can also support videography because many listings benefit from both still images and video. Photography supports quick comparison, while video shows flow, movement, and atmosphere.',
      },
      {
        question:
          'How important is turnaround time for real estate photography?',
        answer:
          'Turnaround time is very important because listing launches are time-sensitive. Delayed photos can delay MLS uploads, social posts, email campaigns, open house promotion, and seller communication.',
      },
      {
        question: 'What should realtors look for in a photographer portfolio?',
        answer:
          'Realtors should look for complete gallery consistency, clean lighting, straight vertical lines, natural editing, clear room flow, strong exterior images, and experience with properties similar to their listings.',
      },
    ],
    externalSources: [
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
      {
        title: 'Google Search Central: Video SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/video',
      },
    ],
    keyTakeaways: [
      'The strongest real estate photographers treat the gallery as part of the listing campaign, not just room documentation.',
      'Vancouver shoots require local awareness of weather, limited winter daylight, high-rise views, and compact condo layouts.',
      'Consistent composition, lighting, and restrained editing make rooms easier for buyers to understand online.',
      'Realtors should review complete galleries, not portfolio highlights, and confirm turnaround times and usage rights before hiring.',
      'The best media partners can add videography, aerial, floor plans, Matterport, and social-ready content when a listing needs it.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Matterport',
        sameAs: [
          'https://www.wikidata.org/wiki/Q107520260',
          'https://en.wikipedia.org/wiki/Matterport',
        ],
      },
    ],
    seo: {
      title: 'What Makes a Vancouver Real Estate Photographer Worth Hiring',
      description:
        'Learn what separates a strong Vancouver real estate photographer from the rest, from lighting and composition to workflow, strategy, and media support.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-real-estate-photographer-worth-hiring',
      ogTitle: 'What Makes a Vancouver Real Estate Photographer Worth Hiring?',
      ogDescription:
        'A practical guide for Vancouver realtors on evaluating real estate photographers by portfolio quality, local experience, lighting, workflow, and listing media strategy.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Vancouver real estate photographer',
        'real estate photography Vancouver',
        'professional real estate photographer',
        'Vancouver listing photography',
        'real estate media Vancouver',
        'property photography Vancouver',
        'realtor photography Vancouver',
        'real estate photographer for listings',
        'Vancouver realtor media',
        'professional listing photos',
        'property marketing Vancouver',
        'real estate photography services',
      ],
    },
  },
  {
    id: 30,
    slug: 'first-impressions-vancouver-real-estate-photography',
    title: 'Why First Impressions Matter in Vancouver Real Estate Photography',
    href: '/blogs/first-impressions-vancouver-real-estate-photography',
    description:
      'Learn how Vancouver real estate photography shapes buyer first impressions through lighting, composition, lead images, and listing strategy.',
    excerpt:
      'A practical guide for Vancouver realtors on how professional photography shapes buyer perception, listing confidence, and online first impressions.',
    imageUrl: '/images/blogs/production/first-impressions-vancouver-real-estate-photography.avif',
    imageAlt:
      'Infographic showing how lead photos, lighting, and composition shape buyer first impressions of a Vancouver listing.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-05-22',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'bad-real-estate-photos-vancouver-listings',
      'vancouver-real-estate-photographer-worth-hiring',
      'prepare-home-real-estate-photography-vancouver',
      'how-to-take-professional-real-estate-photos',
    ],
    faqs: [
      {
        question: 'Why do first impressions matter in real estate photography?',
        answer:
          'First impressions matter because buyers often judge a listing online before booking a showing. Strong photos can make the property feel clearer, more credible, and more worth exploring.',
      },
      {
        question: 'What creates a strong first impression in a listing photo?',
        answer:
          'A strong first impression usually comes from a clear lead image, balanced lighting, clean composition, accurate editing, visible selling features, and a photo sequence that helps buyers understand the property quickly.',
      },
      {
        question: 'Can bad listing photos hurt buyer perception?',
        answer:
          'Yes. Bad listing photos can make rooms look darker, smaller, cluttered, or less maintained than they are. This can weaken buyer confidence before the property is viewed in person.',
      },
      {
        question: 'Should the lead photo always be the exterior?',
        answer:
          'No. The best lead photo depends on the property. It may be the exterior, kitchen, living room, view, balcony, or architectural feature that best communicates the listing’s strongest value.',
      },
      {
        question:
          'How can Vancouver realtors improve listing first impressions?',
        answer:
          'Vancouver realtors can improve first impressions by preparing the home before the shoot, choosing professional photography, selecting the lead image strategically, using strong lighting and composition, and matching media to the property type.',
      },
    ],
    externalSources: [
      {
        title: 'Willis and Todorov: First Impressions Research',
        href: 'https://pubmed.ncbi.nlm.nih.gov/16866745/',
      },
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
      {
        title: 'Google Search Central: Video SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/video',
      },
    ],
    keyTakeaways: [
      'Buyers often react to a listing\'s first image before reading the description, deciding whether to open or skip it.',
      'The lead image should be chosen strategically to show a meaningful selling point, not left to whatever appears first.',
      'Lighting and composition shape whether a property feels bright, spacious, clean, and credible online.',
      'Editing should improve clarity while staying believable, since misleading photos erode buyer trust before a showing.',
      'Professional media supports MLS, websites, social feeds, email, and ads, and varies by property type.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'First Impressions in Vancouver Real Estate Photography',
      description:
        'Learn how Vancouver real estate photography shapes buyer first impressions through lighting, composition, lead images, and listing strategy.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/first-impressions-vancouver-real-estate-photography',
      ogTitle:
        'Why First Impressions Matter in Vancouver Real Estate Photography',
      ogDescription:
        'A practical guide for Vancouver realtors on how professional listing photography shapes buyer perception through lead images, lighting, composition, and visual strategy.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Vancouver real estate photography',
        'real estate photography first impressions',
        'professional real estate photography',
        'listing photos Vancouver',
        'real estate photographer Vancouver',
        'property photography Vancouver',
        'real estate media Vancouver',
        'real estate listing photography',
        'buyer first impression real estate',
        'professional listing photos',
        'property marketing Vancouver',
        'real estate photo strategy',
      ],
    },
  },
  {
    id: 31,
    slug: 'how-to-take-professional-real-estate-photos',
    title:
      'How to Shoot Professional Real Estate Photos for Vancouver Listings',
    href: '/blogs/how-to-take-professional-real-estate-photos',
    description:
      'Learn how to take professional real estate photos with better gear, lighting, angles, editing, and aerial strategy for Vancouver listings.',
    excerpt:
      'A practical guide for Vancouver realtors on professional real estate photography gear, lighting, angles, editing, drone use, and when to hire a media team.',
    imageUrl: '/images/blogs/production/how-to-take-professional-real-estate-photos.avif',
    imageAlt:
      'Professional real estate photography setup for a Vancouver listing, with a tripod-mounted camera and interior lighting.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-09-03',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'photography',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-photography-lighting-vancouver',
      'real-estate-photo-composition-tips-vancouver',
      'drone-photography-real-estate-vancouver',
      'prepare-home-real-estate-photography-vancouver',
    ],
    faqs: [
      {
        question: 'What equipment do you need for real estate photography?',
        answer:
          'A professional real estate photography setup usually includes a camera with manual controls, a wide-angle lens, a tripod, remote shutter or timer, lighting tools, spare batteries, memory cards, and editing software.',
      },
      {
        question: 'What is the best angle for real estate photos?',
        answer:
          'The best angle depends on the room, but many real estate interiors work well from corners or doorways because those positions show depth, layout, and room connections. The angle should explain the space clearly without heavy distortion.',
      },
      {
        question: 'Should real estate photos use natural light or flash?',
        answer:
          'Both can be useful. Natural light helps rooms feel realistic, while flash or controlled lighting can balance dark interiors, bright windows, and mixed lighting. The goal is clean, believable exposure.',
      },
      {
        question: 'How much editing should real estate photos have?',
        answer:
          'Real estate photos should be edited for exposure, colour, perspective, sharpness, and consistency. Editing should make the property clearer and more polished without making it feel unrealistic or misleading.',
      },
      {
        question: 'Should Vancouver realtors take their own listing photos?',
        answer:
          'Realtors can take basic photos for documentation, but professional listing photography is usually better for public marketing because it requires lighting control, composition, editing, equipment, and a consistent workflow.',
      },
    ],
    externalSources: [
      {
        title: 'Adobe: Real Estate Photography Guide',
        href: 'https://www.adobe.com/creativecloud/photography/type/real-estate-photography.html',
      },
      {
        title: 'Google Search Central: Image SEO Best Practices',
        href: 'https://developers.google.com/search/docs/appearance/google-images',
      },
      {
        title: 'Transport Canada: Drone Safety',
        href: 'https://tc.canada.ca/en/aviation/drone-safety',
      },
    ],
    keyTakeaways: [
      'Professional real estate photography starts with preparing and decluttering the property, not with camera settings.',
      'A tripod, wide-angle lens, and manual controls form the core setup for consistent listing photos.',
      'Lighting and window exposure should make rooms clear and believable, not artificially bright or misleading.',
      'Choose angles and camera height that explain each room\'s flow, scale, and function rather than the widest possible view.',
      'Realtors should hire a professional for public MLS listings, difficult lighting, view properties, or when video and aerials are needed.',
    ],
    entities: [
      {
        name: 'Real estate photography',
        sameAs: [
          'https://en.wikipedia.org/wiki/Real_estate_photography',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Adobe Lightroom',
        sameAs: [
          'https://en.wikipedia.org/wiki/Adobe_Lightroom',
        ],
      },
      {
        name: 'Transport Canada',
        sameAs: [
          'https://www.wikidata.org/wiki/Q2035496',
          'https://en.wikipedia.org/wiki/Transport_Canada',
        ],
      },
    ],
    seo: {
      title: 'How to Take Professional Real Estate Photos',
      description:
        'Learn how to take professional real estate photos with better gear, lighting, angles, editing, and aerial strategy for Vancouver listings.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/how-to-take-professional-real-estate-photos',
      ogTitle:
        'How to Shoot Professional Real Estate Photos for Vancouver Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on real estate photography gear, lighting, angles, editing, drone photos, and professional listing media.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'how to take professional real estate photos',
        'Vancouver real estate photography',
        'professional real estate photography',
        'real estate photography tips',
        'real estate photography gear',
        'real estate photo editing',
        'real estate photography lighting',
        'property photography Vancouver',
        'listing photos Vancouver',
        'real estate photo angles',
        'drone photography real estate',
        'professional listing photos',
      ],
    },
  },
  {
    id: 32,
    slug: 'real-estate-seo-vancouver-realtors',
    title: 'Real Estate SEO for Vancouver Realtors: How to Get Found Online',
    href: '/blogs/real-estate-seo-vancouver-realtors',
    description:
      'Learn how Vancouver realtors can use SEO, local search, Google Business Profile, service pages, and content to get found by buyers and sellers.',
    excerpt:
      'A practical SEO guide for Vancouver realtors covering local search, Google Business Profile, neighbourhood pages, service pages, content strategy, and conversion-focused website structure.',
    imageUrl: '/images/blogs/digital-marketing/real-estate-seo-vancouver-realtors.avif',
    imageAlt:
      'Real estate SEO strategy visual for Vancouver realtors, showing local search, Google Business Profile, and website pages.',
    date: 'May 23, 2026',
    datetime: '2026-05-23',
    updatedAt: '2026-05-23',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    serviceSlug: 'seo',
    authorSlug: 'saman-hoseinpour',
    relatedPosts: [
      'google-business-profile-vancouver-realtors',
      'digital-marketing-real-estate-vancouver-2026',
      'real-estate-listing-marketing-vancouver-2026',
      'vancouver-realtors-video-social-content-2026',
    ],
    faqs: [
      {
        question: 'What is real estate SEO for Vancouver realtors?',
        answer:
          'Real estate SEO for Vancouver realtors is the process of improving a realtor website, local search presence, service pages, neighbourhood content, and technical structure so buyers and sellers can find the agent through Google Search and local results.',
      },
      {
        question: 'How long does SEO take for real estate agents?',
        answer:
          'SEO usually takes time because search engines need to crawl, understand, and evaluate pages. Realtors should treat SEO as a long-term visibility strategy rather than an instant lead source.',
      },
      {
        question: 'Do Vancouver realtors need Google Business Profile?',
        answer:
          'Yes. Google Business Profile can support local visibility in Google Search and Maps. Realtors should keep business information accurate, add photos, respond to reviews, and keep the profile complete.',
      },
      {
        question: 'What pages should a realtor website have for SEO?',
        answer:
          'A strong realtor website should usually include buyer and seller service pages, neighbourhood pages, listing or project pages, blog content, an about page, contact page, and clear calls to action.',
      },
      {
        question: 'Can SEO help realtors get seller leads?',
        answer:
          'SEO can support seller lead generation when the website targets seller-intent searches with useful pages such as home selling guides, listing marketing pages, valuation-focused pages, and neighbourhood-specific seller content.',
      },
    ],
    externalSources: [
      {
        title: 'Google Search Central: SEO Starter Guide',
        href: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
      {
        title: 'Google Business Profile: Tips to Improve Local Ranking',
        href: 'https://support.google.com/business/answer/7091/improve-your-local-ranking-on-google',
      },
      {
        title:
          'Google Search Central: Creating Helpful, Reliable, People-First Content',
        href: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
      },
      {
        title: 'Google Search Central: Local Business Structured Data',
        href: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
      },
    ],
    keyTakeaways: [
      'Google\'s local search ranking is based mainly on relevance, distance, and prominence.',
      'A realtor website needs service pages, neighbourhood pages, helpful content, and clear calls to action, not just a homepage.',
      'Neighbourhood pages are among the strongest SEO opportunities for Vancouver realtors.',
      'A complete, actively maintained Google Business Profile supports local visibility but does not replace a website.',
      'Listing media aids SEO only with descriptive filenames, alt text, and relevant surrounding page context.',
    ],
    entities: [
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Google Maps',
        sameAs: [
          'https://www.wikidata.org/wiki/Q12013',
          'https://en.wikipedia.org/wiki/Google_Maps',
        ],
      },
    ],
    seo: {
      title: 'Real Estate SEO for Vancouver Realtors',
      description:
        'Learn how Vancouver realtors can use SEO, local search, Google Business Profile, service pages, and content to get found by buyers and sellers.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-seo-vancouver-realtors',
      ogTitle:
        'Real Estate SEO for Vancouver Realtors: How to Get Found Online',
      ogDescription:
        'A practical SEO guide for Vancouver realtors covering local SEO, Google Business Profile, neighbourhood pages, service pages, content strategy, and website structure.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate SEO Vancouver',
        'Vancouver realtor SEO',
        'real estate SEO for realtors',
        'Vancouver real estate marketing',
        'realtor SEO services',
        'real estate local SEO',
        'SEO for real estate agents',
        'real estate website SEO',
        'local SEO for realtors',
        'Vancouver real estate website SEO',
        'Google Business Profile for realtors',
        'neighbourhood SEO Vancouver',
        'seller leads SEO',
        'digital marketing for real estate Vancouver',
      ],
    },
  },
  {
    id: 33,
    slug: 'google-business-profile-vancouver-realtors',
    title:
      'Google Business Profile for Realtors: How Vancouver Agents Improve Local Visibility',
    href: '/blogs/google-business-profile-vancouver-realtors',
    description:
      'Learn how Vancouver realtors can optimize Google Business Profile, reviews, photos, service areas, and website links to improve local visibility.',
    excerpt:
      'A practical guide for Vancouver realtors on optimizing Google Business Profile, improving local SEO, managing reviews, adding photos and videos, and connecting profile traffic to a stronger website.',
    imageUrl: '/images/blogs/digital-marketing/google-business-profile-vancouver-realtors.avif',
    imageAlt:
      'Google Business Profile infographic for Vancouver realtors covering local map visibility, reviews, and profile optimization.',
    date: 'May 23, 2026',
    datetime: '2026-05-23',
    updatedAt: '2026-05-23',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    serviceSlug: 'seo',
    authorSlug: 'saman-hoseinpour',
    relatedPosts: [
      'real-estate-seo-vancouver-realtors',
      'digital-marketing-real-estate-vancouver-2026',
      'strong-website-vancouver-business',
      'real-estate-listing-marketing-vancouver-2026',
    ],
    faqs: [
      {
        question: 'Do Vancouver realtors need a Google Business Profile?',
        answer:
          'Yes. A Google Business Profile can help Vancouver realtors appear more professionally in Google Search and Maps, show accurate contact information, collect reviews, add photos and videos, and connect local searchers to their website.',
      },
      {
        question: 'How can realtors improve their Google Business Profile?',
        answer:
          'Realtors can improve their Google Business Profile by keeping business information accurate, choosing relevant categories, completing services and service areas, adding photos and videos, responding to reviews, and linking to a strong website.',
      },
      {
        question: 'What affects local ranking on Google?',
        answer:
          'Google says local results are mainly based on relevance, distance, and prominence. A complete and accurate Business Profile can help Google better understand the business and match it to relevant local searches.',
      },
      {
        question:
          'Should realtors add photos and videos to Google Business Profile?',
        answer:
          'Yes. Photos and videos can help show the realtor’s brand, team, listings, media quality, and local presence. Google also recommends adding photos and videos to help tell the story of the business.',
      },
      {
        question: 'Can Google Business Profile replace a realtor website?',
        answer:
          'No. Google Business Profile supports local visibility, but the realtor website is still the owned platform for service pages, neighbourhood content, listings, blog posts, project examples, and conversion-focused landing pages.',
      },
    ],
    externalSources: [
      {
        title: 'Google Business Profile: Tips to Improve Local Ranking',
        href: 'https://support.google.com/business/answer/7091/improve-your-local-ranking-on-google',
      },
      {
        title: 'Google Business Profile Help',
        href: 'https://support.google.com/business',
      },
      {
        title: 'Google Search Central: Local Business Structured Data',
        href: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
      },
      {
        title: 'Google Search Central: SEO Starter Guide',
        href: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
    ],
    keyTakeaways: [
      'Google says local ranking is based mainly on three factors: relevance, distance, and prominence, and cannot be paid for.',
      'Complete, accurate, and consistent business information helps Google understand a realtor\'s business and improves local visibility.',
      'Reviews, photos, videos, categories, services, and website links all shape how useful the profile feels to searchers.',
      'A Google Business Profile should link to a conversion-focused website with matching service pages, not replace it.',
      'Realtors should verify the profile, track profile traffic with UTM links, and maintain it as ongoing local SEO.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
        primary: true,
      },
      {
        name: 'Real estate',
        sameAs: [
          'https://en.wikipedia.org/wiki/Real_estate',
        ],
      },
      {
        name: 'Google Maps',
        sameAs: [
          'https://www.wikidata.org/wiki/Q12013',
          'https://en.wikipedia.org/wiki/Google_Maps',
        ],
      },
    ],
    seo: {
      title: 'Google Business Profile for Vancouver Realtors',
      description:
        'Learn how Vancouver realtors can optimize Google Business Profile, reviews, photos, service areas, and website links to improve local visibility.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/google-business-profile-vancouver-realtors',
      ogTitle:
        'Google Business Profile for Realtors: How Vancouver Agents Improve Local Visibility',
      ogDescription:
        'A practical guide for Vancouver realtors on optimizing Google Business Profile, reviews, photos, service areas, local SEO, and website visibility.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Google Business Profile for realtors',
        'Google Business Profile Vancouver realtor',
        'local SEO for realtors',
        'Vancouver realtor SEO',
        'Google Maps for real estate agents',
        'real estate local SEO',
        'realtor Google profile',
        'Google Business Profile optimization',
        'Vancouver real estate SEO',
        'local SEO Vancouver realtor',
        'Vancouver realtor marketing',
        'Google reviews for realtors',
        'real estate SEO Vancouver',
        'digital marketing for real estate Vancouver',
      ],
    },
  },
  {
    id: 34,
    slug: 'real-estate-landing-pages-vancouver-realtors',
    title:
      'Real Estate Landing Pages for Vancouver Realtors: Turn Traffic Into Leads',
    href: '/blogs/real-estate-landing-pages-vancouver-realtors',
    description:
      'Learn how Vancouver realtors can use real estate landing pages to turn listing traffic, ad clicks, and website visitors into qualified leads.',
    excerpt:
      'A practical guide for Vancouver realtors on building real estate landing pages for listings, seller leads, buyer inquiries, paid ads, retargeting, and campaign tracking.',
    imageUrl: '/images/blogs/websites/real-estate-landing-pages-vancouver-realtors.avif',
    imageAlt:
      'Real estate landing page strategy infographic for Vancouver realtors, showing lead forms and conversion paths.',
    date: 'May 23, 2026',
    datetime: '2026-05-23',
    updatedAt: '2026-05-23',
    category: {
      title: 'Websites',
      slug: 'websites',
      href: '/blogs?category=websites',
    },
    serviceSlug: 'landing-pages',
    authorSlug: 'saman-hoseinpour',
    relatedPosts: [
      'digital-marketing-real-estate-vancouver-2026',
      'real-estate-seo-vancouver-realtors',
      'google-business-profile-vancouver-realtors',
      'strong-website-vancouver-business',
    ],
    faqs: [
      {
        question: 'What is a real estate landing page?',
        answer:
          'A real estate landing page is a focused web page built around one goal, such as promoting a listing, generating seller leads, collecting buyer inquiries, advertising a pre-sale project, or converting paid ad traffic.',
      },
      {
        question: 'Do Vancouver realtors need landing pages?',
        answer:
          'Vancouver realtors do not need a landing page for every campaign, but landing pages are useful when traffic has a clear intent, such as viewing a listing, booking a consultation, requesting a valuation, or registering interest.',
      },
      {
        question: 'What should a real estate landing page include?',
        answer:
          'A strong real estate landing page should include a clear headline, strong visuals, relevant property or service information, trust signals, a simple form, a direct call to action, mobile-friendly design, and tracking.',
      },
      {
        question:
          'Are landing pages better than sending traffic to a homepage?',
        answer:
          'For campaigns with a specific goal, landing pages are usually better than a homepage because they match the visitor’s intent more directly and reduce distractions.',
      },
      {
        question: 'Can real estate landing pages help with paid ads?',
        answer:
          'Yes. Real estate landing pages can improve paid ad campaigns by matching ad copy to page content, focusing the visitor on one action, and making conversion tracking easier.',
      },
    ],
    externalSources: [
      {
        title: 'Google Ads Help: About Landing Page Experience',
        href: 'https://support.google.com/google-ads/answer/2404197',
      },
      {
        title:
          'Google Search Central: Creating Helpful, Reliable, People-First Content',
        href: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
      },
      {
        title: 'Google Search Central: SEO Starter Guide',
        href: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      },
    ],
    keyTakeaways: [
      'A real estate landing page should stay focused on one audience, one offer, and one primary action.',
      'Sending campaign traffic to a generic homepage underperforms because a landing page matches visitor intent and reduces distractions.',
      'The strongest pages combine clear copy, professional photography and video, trust signals, mobile-first design, and conversion tracking.',
      'Message match matters: the landing page copy, headline, and visuals should continue the ad, search, or social click that brought the visitor.',
      'Google Ads factors landing page experience into ad quality, so page relevance and usability affect paid campaign performance.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Landing page',
        sameAs: [
          'https://www.wikidata.org/wiki/Q1494741',
          'https://en.wikipedia.org/wiki/Landing_page',
        ],
        primary: true,
      },
      {
        name: 'Google Ads',
        sameAs: [
          'https://www.wikidata.org/wiki/Q271982',
          'https://en.wikipedia.org/wiki/Google_Ads',
        ],
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
    ],
    seo: {
      title: 'Real Estate Landing Pages for Vancouver Realtors',
      description:
        'Learn how Vancouver realtors can use real estate landing pages to turn listing traffic, ad clicks, and website visitors into qualified leads.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/real-estate-landing-pages-vancouver-realtors',
      ogTitle:
        'Real Estate Landing Pages for Vancouver Realtors: Turn Traffic Into Leads',
      ogDescription:
        'A practical guide for Vancouver realtors on creating real estate landing pages for listings, seller leads, buyer inquiries, paid ads, and conversion tracking.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate landing pages',
        'real estate landing page',
        'realtor landing page',
        'Vancouver realtor landing pages',
        'real estate lead generation pages',
        'property landing pages',
        'real estate website conversion',
        'landing pages for realtors',
        'listing landing page',
        'Vancouver real estate lead generation',
        'Vancouver realtor marketing',
        'real estate digital marketing Vancouver',
        'property marketing Vancouver',
        'real estate website design',
      ],
    },
  },
  {
    id: 35,
    slug: 'meta-ads-real-estate-vancouver-realtors',
    title:
      'Meta Ads for Real Estate: How Vancouver Realtors Promote Listings Without Wasting Budget',
    href: '/blogs/meta-ads-real-estate-vancouver-realtors',
    description:
      'Learn how Vancouver Realtors can use Meta Ads for real estate listings, seller campaigns, retargeting, and lead generation without wasting budget.',
    excerpt:
      'A practical guide for Vancouver Realtors on using Meta Ads for listing promotion, seller campaigns, retargeting, creative testing, landing pages, and lead tracking.',
    imageUrl: '/images/blogs/digital-marketing/meta-ads-real-estate-vancouver-realtors.avif',
    imageAlt:
      'Meta Ads strategy infographic for Vancouver realtors, showing listing promotion, lead campaigns, and retargeting.',
    date: 'May 23, 2026',
    datetime: '2026-05-23',
    updatedAt: '2026-09-03',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    serviceSlug: 'meta-ads',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'digital-marketing-real-estate-vancouver-2026',
      'real-estate-landing-pages-vancouver-realtors',
      'google-ads-real-estate-agents-vancouver',
      'strong-website-vancouver-business',
    ],
    faqs: [
      {
        question: 'Are Meta Ads useful for real estate listings?',
        answer:
          'Meta Ads can be useful for real estate listings when the campaign has strong creative, a clear objective, a compliant setup, a focused landing page, and a follow-up process. They are not a replacement for pricing, SEO, listing media, or seller strategy.',
      },
      {
        question: 'Do real estate ads on Meta need a special ad category?',
        answer:
          'Many real estate ads fall under Meta’s housing-related Special Ad Category rules. Realtors should review Meta’s current ad policies and set up campaigns correctly before advertising listings, housing services, or property-related offers.',
      },
      {
        question: 'What is the best Meta Ads objective for real estate?',
        answer:
          'The best objective depends on the campaign goal. Listing awareness, video views, website traffic, lead generation, and retargeting can all be useful, but the objective should match the next action you want from the user.',
      },
      {
        question: 'Should Realtors use Meta lead forms or landing pages?',
        answer:
          'Both can work. Lead forms reduce friction inside Facebook or Instagram, while landing pages provide more context, media, and tracking control. The better choice depends on the campaign goal, offer, and follow-up process.',
      },
      {
        question: 'How can Vancouver Realtors avoid wasting Meta Ads budget?',
        answer:
          'Vancouver Realtors can avoid wasting budget by matching the ad to a clear goal, using strong listing media, respecting housing ad rules, testing creative, sending traffic to focused pages, tracking conversions, and following up quickly.',
      },
    ],
    externalSources: [
      {
        title: 'Meta Business Help: Special Ad Categories',
        href: 'https://www.facebook.com/business/help/298000447747885',
      },
      {
        title: 'Meta Business: Advantage+ Audience',
        href: 'https://www.facebook.com/business/ads/meta-advantage-plus/audience',
      },
      {
        title: 'Meta Business: Advantage+ Leads Campaigns',
        href: 'https://www.facebook.com/business/ads/meta-advantage-plus/leads',
      },
    ],
    keyTakeaways: [
      'Meta Ads work for Vancouver Realtors only when each campaign has one clear objective, offer, audience, and next step.',
      'Housing-related real estate ads may fall under Meta\'s Special Ad Category rules, which limit targeting and require compliant setup.',
      'Strong listing creative like photography, video, and aerial clips matters more than narrow audience targeting.',
      'Retargeting warm audiences who already viewed a website, video, or listing is often Meta Ads\' most efficient use.',
      'Judge campaigns by cost per lead, lead quality, and follow-up outcomes, not impressions or likes.',
    ],
    entities: [
      {
        name: 'Meta Platforms',
        sameAs: [
          'https://www.wikidata.org/wiki/Q380',
          'https://en.wikipedia.org/wiki/Meta_Platforms',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Facebook',
        sameAs: [
          'https://www.wikidata.org/wiki/Q355',
        ],
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
    ],
    seo: {
      title: 'Meta Ads for Real Estate in Vancouver',
      description:
        'Learn how Vancouver Realtors can use Meta Ads for real estate listings, seller campaigns, retargeting, and lead generation without wasting budget.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/meta-ads-real-estate-vancouver-realtors',
      ogTitle:
        'Meta Ads for Real Estate: How Vancouver Realtors Promote Listings Without Wasting Budget',
      ogDescription:
        'A practical guide for Vancouver Realtors on using Facebook and Instagram ads for listing promotion, seller leads, landing pages, retargeting, and campaign tracking.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Meta Ads for real estate',
        'Meta Ads for Vancouver Realtors',
        'Facebook Ads for real estate',
        'Instagram Ads for Realtors',
        'real estate advertising Vancouver',
        'real estate paid social',
        'real estate lead generation ads',
        'listing ads Vancouver',
        'Meta Ads housing category',
        'Vancouver real estate advertising',
        'Vancouver Realtor marketing',
        'real estate digital marketing Vancouver',
        'paid social for Realtors',
        'property marketing Vancouver',
      ],
    },
  },
  {
    id: 36,
    slug: 'google-ads-real-estate-agents-vancouver',
    title:
      'Google Ads for Real Estate Agents: When Vancouver Realtors Should Use Search Ads',
    href: '/blogs/google-ads-real-estate-agents-vancouver',
    description:
      'Learn when Vancouver Realtors should use Google Ads, how search intent works, and how to avoid wasted budget with better landing pages and tracking.',
    excerpt:
      'A practical guide for Vancouver Realtors on using Google Search Ads for seller leads, buyer inquiries, listing campaigns, landing pages, conversion tracking, and paid search strategy.',
    imageUrl: '/images/blogs/digital-marketing/google-ads-real-estate-agents-vancouver.avif',
    imageAlt:
      'Google Ads strategy infographic for Vancouver real estate agents, showing paid search, lead campaigns, and conversion tracking.',
    date: 'May 24, 2026',
    datetime: '2026-05-24',
    updatedAt: '2026-09-03',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs?category=digital-marketing',
    },
    serviceSlug: 'google-ads',
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-landing-pages-vancouver-realtors',
      'meta-ads-real-estate-vancouver-realtors',
      'real-estate-seo-vancouver-realtors',
      'google-business-profile-vancouver-realtors',
    ],
    faqs: [
      {
        question: 'Should real estate agents use Google Ads?',
        answer:
          'Real estate agents should consider Google Ads when they have a clear offer, a focused landing page, conversion tracking, and enough budget to test search intent. Google Ads can be useful for seller leads, buyer inquiries, listing campaigns, and branded search protection.',
      },
      {
        question: 'Are Google Ads better than SEO for Realtors?',
        answer:
          'Google Ads and SEO serve different roles. Google Ads can create faster paid visibility for specific searches, while SEO builds longer-term organic visibility. Many Realtors benefit from using both when budget and strategy allow.',
      },
      {
        question: 'What Google Ads keywords should Realtors target?',
        answer:
          'Realtors should focus on high-intent keywords related to selling, buying, property valuation, neighbourhood searches, and specific services. Broad keywords can waste budget if they are not controlled with match types, negative keywords, and strong landing pages.',
      },
      {
        question: 'Why do real estate Google Ads waste budget?',
        answer:
          'Google Ads often waste budget when campaigns target broad keywords, send traffic to generic homepages, lack conversion tracking, ignore negative keywords, or use weak offers that do not match the searcher’s intent.',
      },
      {
        question: 'What should a real estate Google Ads landing page include?',
        answer:
          'A real estate Google Ads landing page should include a clear headline, relevant offer, local context, trust signals, strong visuals, a simple form or phone CTA, and tracking for calls, forms, and other meaningful conversions.',
      },
    ],
    externalSources: [
      {
        title: 'Google Ads Help: Landing Page Definition',
        href: 'https://support.google.com/google-ads/answer/14086',
      },
      {
        title: 'Google Ads Help: About Conversion Measurement',
        href: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        title: 'Google Ads Help: Different Ways to Track Conversions',
        href: 'https://support.google.com/google-ads/answer/1722054',
      },
      {
        title: 'Google Ads Policy: Housing in Personalized Advertising',
        href: 'https://support.google.com/adspolicy/answer/16701755',
      },
    ],
    keyTakeaways: [
      'Google Search Ads capture high-intent traffic from active searchers, unlike awareness-focused social ads that interrupt browsing.',
      'For Vancouver realtors, the strongest use cases are seller leads, buyer inquiries, branded search, neighbourhood campaigns, and specific service offers.',
      'Each campaign needs focused keywords, negative keywords, a matched landing page, and conversion tracking to avoid wasted budget.',
      'Landing page experience influences keyword Quality Score, so ads must lead to relevant pages, not a generic homepage.',
      'Phrase and exact match give more control during early testing; broad match risks wasted spend if launched too early.',
    ],
    entities: [
      {
        name: 'Google Ads',
        sameAs: [
          'https://www.wikidata.org/wiki/Q271982',
          'https://en.wikipedia.org/wiki/Google_Ads',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Search engine optimization',
        sameAs: [
          'https://www.wikidata.org/wiki/Q180711',
          'https://en.wikipedia.org/wiki/Search_engine_optimization',
        ],
      },
    ],
    seo: {
      title: 'Google Ads for Real Estate Agents in Vancouver',
      description:
        'Learn when Vancouver Realtors should use Google Ads, how search intent works, and how to avoid wasted budget with better landing pages and tracking.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/google-ads-real-estate-agents-vancouver',
      ogTitle:
        'Google Ads for Real Estate Agents: When Vancouver Realtors Should Use Search Ads',
      ogDescription:
        'A practical guide for Vancouver Realtors on using Google Search Ads for seller leads, buyer inquiries, listing campaigns, landing pages, and conversion tracking.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Google Ads for real estate agents',
        'Google Ads for Realtors',
        'real estate Google Ads',
        'Vancouver Realtor Google Ads',
        'real estate PPC',
        'paid search for real estate',
        'Google Search Ads for Realtors',
        'real estate lead generation ads',
        'Vancouver real estate advertising',
        'Google Ads Vancouver real estate',
        'real estate PPC Vancouver',
        'seller lead Google Ads',
        'real estate landing pages',
        'digital marketing for real estate Vancouver',
      ],
    },
  },
  {
    id: 37,
    slug: 'realtor-personal-brand-video-vancouver',
    title:
      'How Vancouver Realtors Can Build a Personal Brand With Video Content',
    href: '/blogs/realtor-personal-brand-video-vancouver',
    description:
      'Learn how Vancouver Realtors can use personal brand video content to build trust, stay visible, and create stronger buyer and seller relationships.',
    excerpt:
      'A practical guide for Vancouver Realtors on building a personal brand with video content, from educational videos and listing commentary to neighbourhood content and social media strategy.',
    imageUrl: '/images/blogs/production/realtor-personal-brand-video-vancouver.avif',
    imageAlt:
      'Vancouver Realtor recording personal brand video content for social media and real estate marketing',
    date: 'May 24, 2026',
    datetime: '2026-05-24',
    updatedAt: '2026-05-24',
    category: {
      title: 'Production',
      slug: 'production',
      href: '/blogs?category=production',
    },
    serviceSlug: 'videography',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'vancouver-realtors-video-social-content-2026',
      'instagram-reels-vancouver-realtors',
      'cinematic-real-estate-marketing-vancouver',
      'real-estate-photography-storytelling-vancouver',
    ],
    faqs: [
      {
        question:
          'Why should Vancouver Realtors use video for personal branding?',
        answer:
          'Video helps Vancouver Realtors build familiarity, explain their expertise, show local knowledge, and create trust before a buyer or seller reaches out. It can support social media, websites, email, YouTube, and paid campaigns.',
      },
      {
        question: 'What types of videos should Realtors post?',
        answer:
          'Realtors should post a mix of educational videos, neighbourhood content, listing commentary, market explainers, client process videos, behind-the-scenes content, and short personal perspective videos.',
      },
      {
        question: 'How often should Realtors create video content?',
        answer:
          'A practical starting point is one to three short videos per week, supported by occasional higher-production brand videos or listing videos. Consistency matters more than posting a large batch and disappearing.',
      },
      {
        question:
          'Does personal brand video need to be professionally produced?',
        answer:
          'Not every video needs full production. Short educational clips can be simple, but important brand videos, listing campaigns, website videos, and profile videos benefit from professional videography, lighting, sound, and editing.',
      },
      {
        question: 'How can Realtors turn video views into leads?',
        answer:
          'Video views become more useful when connected to a clear next step, such as a landing page, consultation form, seller guide, listing page, email follow-up, retargeting campaign, or contact CTA.',
      },
    ],
    externalSources: [
      {
        title: 'YouTube Creators',
        href: 'https://www.youtube.com/creators/',
      },
      {
        title: 'Instagram for Creators',
        href: 'https://creators.instagram.com/',
      },
      {
        title: 'Meta for Business: Reels Ads',
        href: 'https://www.facebook.com/business/ads/facebook-instagram-reels-ads',
      },
    ],
    keyTakeaways: [
      'Personal brand video helps Vancouver Realtors build familiarity and trust before a buyer or seller ever makes contact.',
      'The strongest strategy combines education, local insight, personality, process, and proof, not just listing content.',
      'Short-form video drives reach and consistency, while longer-form video builds depth, authority, and search visibility.',
      'Professional production matters most for brand films, listing campaigns, website videos, and high-trust seller-facing assets.',
      'Video performs best when connected to landing pages, SEO, social, email, retargeting, and a clear contact path.',
    ],
    entities: [
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
      },
      {
        name: 'YouTube',
        sameAs: [
          'https://www.wikidata.org/wiki/Q866',
          'https://en.wikipedia.org/wiki/YouTube',
        ],
      },
    ],
    seo: {
      title: 'Realtor Personal Brand Video Vancouver',
      description:
        'Learn how Vancouver Realtors can use personal brand video content to build trust, stay visible, and create stronger buyer and seller relationships.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/realtor-personal-brand-video-vancouver',
      ogTitle:
        'How Vancouver Realtors Can Build a Personal Brand With Video Content',
      ogDescription:
        'A practical guide for Vancouver Realtors on using educational videos, listing commentary, neighbourhood content, and social media strategy to build a stronger personal brand.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Realtor personal brand video',
        'Vancouver Realtor video content',
        'real estate video marketing Vancouver',
        'personal branding for Realtors',
        'Realtor social media content',
        'video content for real estate agents',
        'Vancouver real estate videography',
        'real estate personal branding',
        'real estate social media Vancouver',
        'Realtor brand video',
        'short form video for Realtors',
        'Vancouver Realtor marketing',
        'real estate content creation',
        'property marketing Vancouver',
      ],
    },
  },
  {
    id: 38,
    slug: 'instagram-reels-vancouver-realtors',
    title:
      'Instagram Reels for Vancouver Realtors: What to Post Beyond Just Listings',
    href: '/blogs/instagram-reels-vancouver-realtors',
    description:
      'Learn what Vancouver Realtors should post on Instagram Reels beyond listings, including neighbourhood content, seller tips, buyer education, and personal brand videos.',
    excerpt:
      'A practical guide for Vancouver Realtors on using Instagram Reels to build trust, stay visible, educate buyers and sellers, and create a stronger personal brand beyond listing posts.',
    imageUrl: '/images/blogs/social/instagram-reels-vancouver-realtors.avif',
    imageAlt:
      'Instagram Reels strategy infographic for Vancouver realtors, with a realtor recording video and content ideas.',
    date: 'May 24, 2026',
    datetime: '2026-05-24',
    updatedAt: '2026-05-28',
    category: {
      title: 'Social',
      slug: 'social',
      href: '/blogs?category=social',
    },
    serviceSlug: 'social-media-management',
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'realtor-personal-brand-video-vancouver',
      'vancouver-realtors-video-social-content-2026',
      'cinematic-real-estate-marketing-vancouver',
      'real-estate-listing-marketing-vancouver-2026',
    ],
    faqs: [
      {
        question: 'What should Vancouver Realtors post on Instagram Reels?',
        answer:
          'Vancouver Realtors should post a mix of neighbourhood videos, buyer tips, seller education, listing commentary, market explainers, behind-the-scenes content, personal brand videos, and short answers to common client questions.',
      },
      {
        question: 'Should Realtors post more than listing videos on Instagram?',
        answer:
          'Yes. Listing videos are useful, but Realtors should also post educational and personal brand content so they stay visible between listings and build trust with future buyers and sellers.',
      },
      {
        question: 'How often should Realtors post Instagram Reels?',
        answer:
          'A practical starting point is two to four Reels per week, depending on production capacity. Consistency matters more than posting heavily for a short period and then stopping.',
      },
      {
        question: 'Do Instagram Reels help Realtors get leads?',
        answer:
          'Instagram Reels can support lead generation when they are connected to clear calls to action, landing pages, listing pages, consultation forms, DMs, retargeting campaigns, or follow-up systems.',
      },
      {
        question: 'Do Realtor Reels need to be professionally filmed?',
        answer:
          'Not every Reel needs professional production. Simple educational clips can work well, but brand videos, listing campaigns, luxury property content, and paid ad creative benefit from professional videography, sound, lighting, and editing.',
      },
    ],
    externalSources: [
      {
        title: 'Instagram for Creators',
        href: 'https://creators.instagram.com/',
      },
      {
        title: 'Meta for Business',
        href: 'https://www.facebook.com/business',
      },
      {
        title: 'Meta for Business: Reels Ads',
        href: 'https://www.facebook.com/business/ads/facebook-instagram-reels-ads',
      },
    ],
    keyTakeaways: [
      'Vancouver Realtors should post Reels beyond listings, including neighbourhood, buyer education, seller tips, market explainers, and personal brand content.',
      'The strongest Realtor Reels educate, explain, show local knowledge, or reveal how the agent thinks, building trust before contact.',
      'Consistency beats perfection; a simple useful Reel posted regularly outperforms one polished video followed by silence.',
      'Reels should connect to a business system: landing pages, listing pages, DMs, consultation forms, email follow-up, and retargeting.',
      'A practical cadence is two to four Reels per week, with professional production reserved for high-value assets like listing campaigns and ads.',
    ],
    entities: [
      {
        name: 'Instagram',
        sameAs: [
          'https://www.wikidata.org/wiki/Q209330',
          'https://en.wikipedia.org/wiki/Instagram',
        ],
        primary: true,
      },
      {
        name: 'Vancouver',
        sameAs: [
          'https://www.wikidata.org/wiki/Q24639',
          'https://en.wikipedia.org/wiki/Vancouver',
        ],
        primary: true,
      },
    ],
    seo: {
      title: 'Instagram Reels for Vancouver Realtors',
      description:
        'Learn what Vancouver Realtors should post on Instagram Reels beyond listings, including neighbourhood content, seller tips, buyer education, and personal brand videos.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/instagram-reels-vancouver-realtors',
      ogTitle:
        'Instagram Reels for Vancouver Realtors: What to Post Beyond Just Listings',
      ogDescription:
        'A practical guide for Vancouver Realtors on using Instagram Reels to build trust, educate buyers and sellers, and create a stronger personal brand beyond listing posts.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'Instagram Reels for Realtors',
        'Vancouver Realtor Instagram Reels',
        'real estate Reels ideas',
        'Instagram marketing for Realtors',
        'Realtor social media content',
        'Vancouver real estate social media',
        'real estate video content',
        'personal branding for Realtors',
        'short form video for Realtors',
        'real estate content ideas',
        'Vancouver Realtor marketing',
        'real estate social media strategy',
        'listing Reels',
        'Realtor video marketing',
      ],
    },
  },
];

