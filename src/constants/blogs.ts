import { SITE_URL } from '.';

export type BlogAuthor = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  href: string;
  sameAs: string[];

  // Optional richer profile fields used by the author page for SEO + UX.
  // ImageKit asset key (without leading slash) used for OG cards. Falls back
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
    role: 'Digital Marketing Agency',
    bio: 'Perseus Creative Studio is a Vancouver-based digital marketing agency helping local businesses grow through social media marketing, videography, photography, website design, and search engine marketing.',
    imageUrl: '/logo-black.png',
    href: '/blogs/authors/perseus-creative-studio',
    sameAs: [
      'https://www.instagram.com/perseustudio/',
      'https://www.linkedin.com/company/perseus-creative-studio/',
      'https://www.youtube.com/@PerseusCreativeStudio',
      'https://www.facebook.com/p/Perseus-Creative-Studio-61559184362913/',
      'https://x.com/Perseustudio1',
    ],
    ogImage: 'navbar-about-2.jpeg',
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
    imageUrl: '/aryan-ghasemi-team.png',
    href: '/blogs/authors/aryan-ghasemi',
    sameAs: ['https://www.linkedin.com/in/aryan-ghasemi-80043424a/'],
    ogImage: 'aryan-ghasemi-team.png',
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
    bio: 'Saman Hoseinpour is the Co-Founder and CTO of Perseus Creative Studio, leading the studio’s engineering and web development — architecting fast, SEO-driven websites and the technical systems behind its marketing and media work.',
    imageUrl: '/saman-hoseinpour-team.png',
    href: '/blogs/authors/saman-hoseinpour',
    sameAs: [
      'https://www.linkedin.com/in/saman-hoseinpour-202280221/',
      'https://github.com/samanhoseinpour',
    ],
    ogImage: 'saman-hoseinpour-team.png',
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
    imageUrl: '/arshia-farahi-team.png',
    href: '/blogs/authors/arshia-farahi',
    sameAs: ['https://www.linkedin.com/in/arshia-farrahi-a0a849330/'],
    ogImage: 'arshia-farahi-team.png',
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

export function getBlogAuthor(slug: string): BlogAuthor | undefined {
  return BLOG_AUTHORS[slug];
}

// Per-page publisher reference. The full Organization node is declared once
// in `app/layout.tsx` with `@id: ${SITE_URL}/#organization`; every page-level
// schema (BlogPosting, CollectionPage) points at it by @id so Google merges
// the references into one entity instead of seeing N near-duplicate org nodes.
export const PERSEUS_PUBLISHER_REF = {
  '@id': `${SITE_URL}/#organization`,
} as const;

// Build a Schema.org author node from a Perseus author-profile href (e.g.
// '/blogs/authors/aryan-ghasemi'). Returns @type:'Organization' for the
// agency itself, @type:'Person' for individuals. sameAs is included only
// when the author has links to declare.
export function buildAuthorSchema(authorHref: string) {
  const slug = authorHref.split('/').filter(Boolean).pop() ?? '';
  const author = BLOG_AUTHORS[slug] ?? BLOG_AUTHORS['perseus-creative-studio'];
  const isOrg = slug === 'perseus-creative-studio';
  return {
    '@type': isOrg ? ('Organization' as const) : ('Person' as const),
    name: author.name,
    url: `${SITE_URL}${author.href}`,
    ...(author.sameAs?.length ? { sameAs: author.sameAs } : {}),
  };
}

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
  authorSlug: BlogPostAuthorSlug;
  // Optional curated FAQ list. When present, overrides the MDX-extracted
  // FAQs as the source for the FAQPage JSON-LD. Lets you decouple schema
  // content from regex-parsed MDX. IMPORTANT: keep these in sync with the
  // post's body FAQ section — Google requires FAQPage entries to be visible
  // on the page for rich-result eligibility.
  faqs?: { question: string; answer: string }[];
  // Optional curated list of related post slugs. When present, the
  // "Related Articles" section renders these specific posts in order
  // instead of falling back to the category-based picker.
  relatedPosts?: string[];
  // Optional outbound references the article cites. Type only — not rendered
  // yet; ready for a future "Sources" section.
  externalSources?: {
    title: string;
    href: string;
    rel?: 'nofollow' | 'sponsored' | 'ugc';
  }[];
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

// Posts per page on /blogs. Shared between the server-side metadata
// (canonical/page math in `app/blogs/page.tsx`) and the client grid
// (`components/Blogs/BlogPost.tsx`) so they can't drift apart.
export const BLOG_PAGE_SIZE = 12;

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'vancouver-real-estate-videography-photography',
    title:
      'Does High-End Videography Help Vancouver Homes Sell Faster? (2026 Data)',
    href: '/blogs/vancouver-real-estate-videography-photography',
    description:
      'A practical look at how professional real estate photography, cinematic walkthrough videos, and drone footage can improve listing presentation, buyer engagement, and marketing performance for Vancouver properties.',
    imageUrl: 'vancouver-real-estate-videography-photography.avif',
    imageAlt:
      'Cinematic real estate media production scene inside a luxury Vancouver home showing professional videography, photography, drone footage, and editing workflow for a property listing.',
    date: 'Feb 8, 2026',
    datetime: '2026-02-08',
    updatedAt: '2026-05-03',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
    seo: {
      title: 'Vancouver Real Estate Videography and Photography Guide (2026)',
      description:
        'Learn how real estate videography, professional photography, drone footage, and listing media can improve buyer engagement for Vancouver properties.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-real-estate-videography-photography',
      ogTitle: 'Vancouver Real Estate Videography and Photography Guide (2026)',
      ogDescription:
        'Learn how real estate videography, professional photography, drone footage, and listing media can improve buyer engagement for Vancouver properties.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'real estate videography Vancouver',
        'real estate photography Vancouver',
        'drone photography Vancouver real estate',
        'MLS photography Vancouver',
        'cinematic real estate video BC',
        'luxury home photography Vancouver',
        'property listing video Vancouver',
        'aerial real estate photography Vancouver',
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
    imageUrl: 'vancouver-business-360-marketing.avif',
    imageAlt:
      '360 marketing strategy visual for a Vancouver business showing connected website, SEO, social media, email marketing, content marketing, paid advertising, and analytics channels.',
    date: 'Feb 1, 2025',
    datetime: '2025-02-01',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
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
      'Your website is your digital storefront—the first impression potential customers get of your brand. A custom-coded, fast, and SEO-optimized website is essential to gaining credibility and increasing conversions.',
    imageUrl: 'strong-website-vancouver-business.avif',
    imageAlt:
      'Modern Vancouver business website displayed across desktop and mobile screens, showing a fast, responsive, SEO-friendly web design built to improve trust, visibility, and conversions.',
    date: 'Jan 15, 2025',
    datetime: '2025-01-15',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
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
      'the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated.avif',
    imageAlt:
      'Modern before-and-after website redesign visual showing an outdated Vancouver business website compared with a faster, more professional, mobile-friendly website.',
    date: 'Feb 10, 2026',
    datetime: '2026-02-10',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
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
      'Digital Marketing Made Simple: The Complete Guide for Vancouver Business Owners',
    href: '/blogs/digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
    description:
      'Vancouver is not just a city; it is a vibrant, fast-paced ecosystem of innovation, luxury, and fierce competition. Whether you are running a boutique coffee shop in Kitsilano, managing a high-end real estate portfolio in Yaletown, or operating a construction firm in Surrey, you feel the pressure to stand out.',
    imageUrl:
      'digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners.avif',
    imageAlt:
      'Vancouver business owner digital marketing guide visual showing SEO, Google Ads, social media, content marketing, email marketing, and growth planning across desktop and mobile screens.',
    date: 'Feb 11, 2026',
    datetime: '2026-02-11',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
    seo: {
      title: 'Digital Marketing Guide for Vancouver Business Owners',
      description:
        'Unlock growth with our complete guide to digital marketing in Vancouver. From local SEO to high-end video, discover strategies tailored to your business.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/digital-marketing-made-simple-the-complete-guide-for-vancouver-business-owners',
      ogTitle:
        'Digital Marketing Made Simple: The Complete Guide for Vancouver Business Owners',
      ogDescription:
        'Unlock growth with our complete guide to digital marketing in Vancouver. From local SEO to high-end video, discover strategies tailored to your business.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'digital marketing Vancouver',
        'digital marketing guide Vancouver 2026',
        'local SEO Vancouver',
        'Google Ads Vancouver',
        'social media marketing Vancouver',
        'content marketing Vancouver',
        'online marketing small business Vancouver',
        'digital marketing strategy Vancouver',
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
      'In the heart of British Columbia, where the skyline of downtown Vancouver meets the rugged beauty of the North Shore, the visual identity of a business is no longer just a digital business card—it is its most valuable currency. As we move through 2026, the local market has reached a tipping point. With over 30,000 small businesses in the Greater Vancouver Area alone, the noise is louder than ever.',
    imageUrl: 'about-perseus-16.jpg',
    imageAlt:
      'Media production crew filming a commercial brand shoot in Vancouver',
    date: 'Feb 21, 2026',
    datetime: '2026-02-21',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
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
      '5 Common Web Design Mistakes Reducing Vancouver Small Businesses Sales',
    href: '/blogs/5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
    description: `In 2026, your website is no longer just a "luxury" or a digital business card. It is your digital front door. For the majority of Vancouver small businesses, the first time a customer "meets" you isn't in person—it's on a screen.`,
    imageUrl: 'about-perseus-15.jpg',
    imageAlt:
      'Vancouver small business website illustrating common web design mistakes that hurt sales',
    date: 'Feb 24, 2026',
    datetime: '2026-02-24',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    authorSlug: 'perseus-creative-studio',
    seo: {
      title: '5 Web Design Mistakes Costing Vancouver Businesses Sales',
      description:
        'Discover 5 common web design mistakes Vancouver small businesses make and how to fix them for better sales and growth.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/5-common-web-design-mistakes-reducing-vancouver-small-businesses-sales',
      ogTitle: '5 Web Design Mistakes Costing Vancouver Businesses Sales',
      ogDescription:
        'Discover 5 common web design mistakes Vancouver small businesses make and how to fix them for better sales and growth.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      keywords: [
        'web design mistakes Vancouver',
        'bad website design Vancouver',
        'website conversion Vancouver',
        'UX design Vancouver small business',
        'website sales optimization Vancouver',
        'small business web design Vancouver',
        'website user experience Vancouver',
        'web design tips Vancouver 2026',
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
    imageUrl: 'about-perseus-9.jpg',
    imageAlt:
      'Real estate videographer recording a cinematic walkthrough of a Vancouver property',
    date: 'May 12, 2026',
    datetime: '2026-05-12',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'perseus-creative-studio',
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
    imageUrl: 'about-perseus-11.jpg',
    imageAlt:
      'Professional real estate photographer capturing a bright Vancouver living room interior',
    date: 'May 13, 2026',
    datetime: '2026-05-13',
    updatedAt: '2026-05-13',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'about-perseus-10.jpg',
    imageAlt:
      'Photographer and videographer working together on a Vancouver real estate listing shoot',
    date: 'May 14, 2026',
    datetime: '2026-05-14',
    updatedAt: '2026-05-14',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
      'The New Reality of Real Estate Marketing: How Vancouver Realtors Stay Visible',
    href: '/blogs/cinematic-real-estate-marketing-vancouver',
    description:
      'Learn how cinematic real estate marketing helps Vancouver agents stay visible with stronger photography, videography, aerials, and content.',
    imageUrl: '/about-perseus-14.jpg',
    imageAlt:
      'Cinematic camera rig filming a luxury Vancouver property for a realtor marketing campaign',
    date: 'May 16, 2026',
    datetime: '2026-05-16',
    updatedAt: '2026-05-16',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
    seo: {
      title: 'Real Estate Marketing Vancouver: Stay Visible Online',
      description:
        'Learn how cinematic real estate marketing helps Vancouver agents stay visible with stronger photography, videography, aerials, and content.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/cinematic-real-estate-marketing-vancouver',
      ogTitle:
        'The New Reality of Real Estate Marketing: How Vancouver Realtors Stay Visible',
      ogDescription:
        'A practical guide for Vancouver realtors on using cinematic storytelling, photography, videography, and aerial production to stay visible online.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate marketing Vancouver',
        'cinematic real estate marketing',
        'Vancouver real estate videography',
        'real estate content marketing',
        'property marketing Vancouver',
        'real estate photography Vancouver',
        'real estate video production Vancouver',
        'realtor marketing Vancouver',
        'real estate social media content',
        'Vancouver real estate media',
        'property storytelling',
        'aerial production Vancouver',
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
    imageUrl: 'aerial-real-estate-photography-vancouver-listings.webp',
    imageAlt:
      'Aerial photograph of a Vancouver home showing the property, lot, and surrounding neighbourhood',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-05-17',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'drone-videography-vancouver-real-estate-listings.webp',
    imageAlt:
      'Drone capturing aerial video footage above a Vancouver real estate listing',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-05-17',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
      'Before the Shoot: How to Prepare a Vancouver Home for Real Estate Photography',
    href: '/blogs/prepare-home-real-estate-photography-vancouver',
    description:
      'Use this Vancouver realtor checklist to prepare homes for real estate photography and videography so listings look cleaner, clearer, and more market-ready.',
    imageUrl: 'prepare-home-real-estate-photography-vancouver.webp',
    imageAlt:
      'Staged Vancouver home prepared and styled for a professional real estate photo shoot',
    date: 'May 17, 2026',
    datetime: '2026-05-17',
    updatedAt: '2026-05-17',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
    seo: {
      title: 'Prepare a Home for Real Estate Photography',
      description:
        'Use this Vancouver realtor checklist to prepare homes for real estate photography and videography so listings look cleaner, clearer, and more market-ready.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/prepare-home-real-estate-photography-vancouver',
      ogTitle:
        'Before the Shoot: How to Prepare a Vancouver Home for Real Estate Photography',
      ogDescription:
        'A practical checklist for Vancouver realtors preparing homes for professional real estate photography, videography, and listing media.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'prepare home for real estate photography',
        'real estate photography checklist',
        'Vancouver real estate photography',
        'listing photography preparation',
        'real estate photo shoot checklist',
        'prepare a home for listing photos',
        'real estate media preparation',
        'real estate videography preparation',
        'Vancouver realtor listing checklist',
        'property marketing Vancouver',
        'professional real estate photography',
        'listing media Vancouver',
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
    imageUrl: 'blog-vancouver-realtors-video-social-content-2026.webp',
    imageAlt:
      'Vancouver realtor recording vertical video content for social media marketing',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
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
    title: 'How to Use Drone Photography for Vancouver Real Estate Listings',
    href: '/blogs/drone-photography-real-estate-vancouver',
    description:
      'Learn how Vancouver realtors can use drone photography and aerial production to showcase property scale, views, location, and listing appeal.',
    imageUrl: 'drone-photography-real-estate-vancouver.webp',
    imageAlt:
      'Drone hovering over a Vancouver property capturing aerial real estate photography',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
    seo: {
      title: 'Drone Photography for Vancouver Real Estate',
      description:
        'Learn how Vancouver realtors can use drone photography and aerial production to showcase property scale, views, location, and listing appeal.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/drone-photography-real-estate-vancouver',
      ogTitle:
        'How to Use Drone Photography for Vancouver Real Estate Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on using drone photography, aerial production, and listing media to showcase property scale, views, and location.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'drone photography for real estate Vancouver',
        'real estate drone photography Vancouver',
        'aerial real estate photography',
        'Vancouver aerial production',
        'drone photos for real estate listings',
        'property drone photography',
        'Vancouver real estate photography',
        'real estate aerial photography',
        'Vancouver real estate media',
        'property marketing Vancouver',
        'aerial production for listings',
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
    imageUrl: 'real-estate-photo-composition-tips-vancouver.webp',
    imageAlt:
      'Real estate photographer composing a wide-angle interior shot of a Vancouver home',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'real-estate-photography-lighting-vancouver.webp',
    imageAlt:
      'Bright natural light filling a Vancouver living room during a real estate photo shoot',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'real-estate-listing-marketing-vancouver-2026-hero.webp',
    imageAlt:
      'Vancouver realtor reviewing a multi-channel real estate listing marketing campaign for 2026',
    date: 'May 18, 2026',
    datetime: '2026-05-18',
    updatedAt: '2026-05-18',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
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
    imageUrl: 'choose-real-estate-photographer-vancouver.webp',
    imageAlt:
      'Realtor comparing portfolios from Vancouver real estate photographers before booking',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: '2d-vs-3d-floor-plans-real-estate-vancouver.webp',
    imageAlt:
      'Side-by-side comparison of 2D and 3D floor plans for a Vancouver real estate listing',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'real-estate-floor-plans-vancouver-listings.avif',
    imageAlt:
      'Detailed floor plan layout used as listing media for a Vancouver real estate property',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
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
    imageUrl: 'digital-marketing-real-estate-vancouver-2026.avif',
    imageAlt:
      'Vancouver realtor reviewing a digital marketing dashboard spanning web, social, and ads',
    date: 'May 19, 2026',
    datetime: '2026-05-19',
    updatedAt: '2026-05-19',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs/categories/digital-marketing',
    },
    authorSlug: 'aryan-ghasemi',
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
    imageUrl: '/best-real-estate-media-vancouver-homes-2026.avif',
    imageAlt:
      'Real estate media package showcasing a Vancouver home across photography, video, and aerials',
    date: 'May 20, 2026',
    datetime: '2026-05-20',
    updatedAt: '2026-05-20',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
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
    imageUrl: 'real-estate-photography-vs-videography-vancouver.avif',
    imageAlt:
      'Side-by-side example of real estate photography and videography for a Vancouver listing',
    date: 'May 20, 2026',
    datetime: '2026-05-20',
    updatedAt: '2026-05-20',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
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
    imageUrl: '/real-estate-photography-storytelling-vancouver.avif',
    imageAlt:
      'Story-driven real estate photography for a Vancouver property listing by Perseus Creative Studio',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-05-21',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
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
    title: 'The Real Cost of Bad Real Estate Photos for Vancouver Listings',
    href: '/blogs/bad-real-estate-photos-vancouver-listings',
    description:
      'Learn why bad real estate photos can hurt Vancouver listings, weaken buyer interest, and make professional photography worth planning properly.',
    excerpt:
      'A practical guide for Vancouver realtors on how poor listing photos can weaken first impressions, reduce buyer confidence, and affect the perceived quality of a property campaign.',
    imageUrl: '/bad-real-estate-photos-vancouver-listings.avif',
    imageAlt:
      'Professional real estate photography setup for a Vancouver property listing',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-05-21',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-photography-vancouver-sell-home-faster',
      'real-estate-photography-lighting-vancouver',
      'real-estate-photo-composition-tips-vancouver',
      'real-estate-photography-storytelling-vancouver',
      'choose-real-estate-photographer-vancouver',
    ],
    faqs: [
      {
        question: 'Why do bad real estate photos hurt a listing?',
        answer:
          'Bad real estate photos can make a property look darker, smaller, less maintained, or less appealing than it is. They can weaken the first impression and make buyers less confident before booking a showing.',
      },
      {
        question:
          'Are professional real estate photos worth it for Vancouver listings?',
        answer:
          'Professional real estate photos are usually worth it because Vancouver buyers often compare listings online before visiting in person. Strong photos help the property look clearer, more credible, and easier to evaluate.',
      },
      {
        question: 'Can bad listing photos reduce buyer interest?',
        answer:
          'Bad listing photos can reduce buyer interest by making the property harder to understand online. They may not show layout, lighting, finishes, outdoor areas, or key features clearly enough for buyers to take the next step.',
      },
      {
        question: 'What makes a real estate photo look unprofessional?',
        answer:
          'Common issues include dark rooms, crooked vertical lines, clutter, poor composition, overexposed windows, inconsistent editing, blurry images, distorted wide-angle shots, and weak lead image selection.',
      },
      {
        question: 'How can Vancouver realtors avoid poor listing photos?',
        answer:
          'Vancouver realtors can avoid poor listing photos by preparing the property before the shoot, using a professional photographer, planning the lead image, checking lighting and composition, and matching the media package to the property.',
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
    seo: {
      title: 'The Cost of Bad Real Estate Photos Vancouver',
      description:
        'Learn why bad real estate photos can hurt Vancouver listings, weaken buyer interest, and make professional photography worth planning properly.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/bad-real-estate-photos-vancouver-listings',
      ogTitle: 'The Real Cost of Bad Real Estate Photos for Vancouver Listings',
      ogDescription:
        'A practical guide for Vancouver realtors on why poor listing photos can weaken first impressions, reduce buyer confidence, and hurt listing presentation.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'real estate photography Vancouver',
        'bad real estate photos',
        'professional real estate photography',
        'Vancouver listing photography',
        'property photography Vancouver',
        'real estate media Vancouver',
        'listing photos Vancouver',
        'realtor photography Vancouver',
        'professional listing media',
        'property marketing Vancouver',
        'Vancouver real estate photos',
        'real estate listing photos',
      ],
    },
  },
  {
    id: 28,
    slug: 'aerial-photography-vancouver-waterfront-real-estate',
    title: 'How Aerial Photography Markets Vancouver Waterfront Real Estate',
    href: '/blogs/aerial-photography-vancouver-waterfront-real-estate',
    description:
      'Learn how aerial photography helps Vancouver realtors market waterfront listings with stronger views, lifestyle context, and location storytelling.',
    excerpt:
      'A practical guide for Vancouver realtors on using aerial photography, drone video, lifestyle visuals, and listing media to market waterfront and view properties more effectively.',
    imageUrl: '/aerial-photography-vancouver-waterfront-real-estate.avif',
    imageAlt:
      'Aerial photography of a Vancouver waterfront real estate listing with ocean and city context',
    date: 'May 21, 2026',
    datetime: '2026-05-21',
    updatedAt: '2026-05-21',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'aerial-real-estate-photography-vancouver-listings',
      'drone-videography-vancouver-real-estate-listings',
      'drone-photography-real-estate-vancouver',
      'best-real-estate-media-vancouver-homes-2026',
      'real-estate-photography-storytelling-vancouver',
    ],
    faqs: [
      {
        question:
          'Why is aerial photography useful for Vancouver waterfront real estate?',
        answer:
          'Aerial photography helps show the relationship between the property, water, views, outdoor space, surrounding neighbourhood, and nearby amenities. This context is difficult to communicate with ground-level photos alone.',
      },
      {
        question: 'Do all waterfront listings need drone photography?',
        answer:
          'Not every waterfront listing needs drone photography, but it is often useful when the view, shoreline, marina access, outdoor space, location, or surrounding context is part of the property’s value.',
      },
      {
        question:
          'What should aerial photography capture for a waterfront property?',
        answer:
          'Aerial photography should capture the property’s position, water relationship, view direction, outdoor areas, lot or building context, nearby parks, marina or seawall access, and any location features that support the listing story.',
      },
      {
        question:
          'Should waterfront listings use video as well as aerial photos?',
        answer:
          'Video can be valuable because it shows movement, atmosphere, and lifestyle. Aerial photos provide still-frame context, while drone video can reveal the waterfront setting and arrival experience more dynamically.',
      },
      {
        question:
          'Are there drone rules for real estate aerial photography in Canada?',
        answer:
          'Yes. Drone operation in Canada involves Transport Canada safety and compliance requirements. Realtors should work with qualified operators who understand airspace, certification, registration, privacy, and safe flight planning.',
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
    seo: {
      title: 'Aerial Photography for Vancouver Waterfront Real Estate',
      description:
        'Learn how aerial photography helps Vancouver realtors market waterfront listings with stronger views, lifestyle context, and location storytelling.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/aerial-photography-vancouver-waterfront-real-estate',
      ogTitle:
        'How Aerial Photography Markets Vancouver Waterfront Real Estate',
      ogDescription:
        'A practical guide for Vancouver realtors on using aerial photography, drone video, lifestyle visuals, and listing media to market waterfront and view properties.',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      keywords: [
        'aerial photography Vancouver waterfront real estate',
        'Vancouver waterfront real estate photography',
        'drone photography Vancouver real estate',
        'aerial real estate photography Vancouver',
        'waterfront property marketing',
        'Vancouver real estate media',
        'drone video Vancouver real estate',
        'luxury real estate photography Vancouver',
        'Vancouver aerial production',
        'waterfront listing media',
        'property marketing Vancouver',
        'real estate drone photography Vancouver',
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
    imageUrl: '/vancouver-real-estate-photographer-worth-hiring.avif',
    imageAlt:
      'Professional Vancouver real estate photographer capturing a luxury property interior with city and mountain views, camera equipment, drone support, and listing media assets.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-05-22',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'choose-real-estate-photographer-vancouver',
      'bad-real-estate-photos-vancouver-listings',
      'real-estate-photo-composition-tips-vancouver',
      'real-estate-photography-lighting-vancouver',
      'real-estate-photography-storytelling-vancouver',
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
    imageUrl: '/first-impressions-vancouver-real-estate-photography.avif',
    imageAlt:
      'Professional Vancouver real estate photography infographic showing how strong lead images, lighting, composition, and visual strategy shape buyer first impressions and listing confidence.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-05-22',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'aryan-ghasemi',
    relatedPosts: [
      'bad-real-estate-photos-vancouver-listings',
      'vancouver-real-estate-photographer-worth-hiring',
      'real-estate-photo-composition-tips-vancouver',
      'real-estate-photography-lighting-vancouver',
      'real-estate-photography-storytelling-vancouver',
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
    imageUrl: '/how-to-take-professional-real-estate-photos.avif',
    imageAlt:
      'Professional real estate photography setup for a Vancouver listing showing a camera on a tripod, interior lighting, wide-angle composition, editing workflow, and drone photography guidance.',
    date: 'May 22, 2026',
    datetime: '2026-05-22',
    updatedAt: '2026-05-22',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs/categories/videography-and-photography',
    },
    authorSlug: 'arshia-farahi',
    relatedPosts: [
      'real-estate-photography-lighting-vancouver',
      'real-estate-photo-composition-tips-vancouver',
      'drone-photography-real-estate-vancouver',
      'bad-real-estate-photos-vancouver-listings',
      'vancouver-real-estate-photographer-worth-hiring',
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
];

// FAQ pairs surfaced at the bottom of the /blogs hub. Kept in sync with the
// FAQPage node in src/app/blogs/page.tsx so the JSON-LD matches what users
// see (a divergence would invalidate the rich-result eligibility).
export const BLOG_INDEX_FAQS: { question: string; answer: string }[] = [
  {
    question: 'How often does Perseus Creative Studio publish new articles?',
    answer:
      'We publish new articles roughly every one to two weeks. The exact cadence depends on what we are learning from active client work — we would rather ship one well-researched piece than churn out filler.',
  },
  {
    question: 'Are these articles only relevant to Vancouver businesses?',
    answer:
      'Most of our case studies and examples are based on Vancouver, BC work, but the underlying strategy and tactics travel — we have clients in Toronto, Los Angeles, and beyond who apply the same playbook. When a topic is strictly local (for example MLS-specific real estate guidance), we say so up front.',
  },
  {
    question: 'Who writes the Perseus blog?',
    answer:
      'Articles are written or reviewed by the Perseus team — primarily founder Aryan Ghasemi and COO Arshia Farrahi, with contributions from co-founder and CTO Saman Hoseinpour and our in-house designers, marketers, and producers. Every piece is informed by work we have shipped, not pure theory.',
  },
  {
    question: 'Can I quote or republish a Perseus article?',
    answer:
      'Short quotes and excerpts with a link back are welcome. For full republishes or syndication, email us at teamperseustudio@gmail.com — we usually say yes for fitting partners.',
  },
  {
    question: 'How do you choose what to write about?',
    answer:
      'We write about questions clients actually ask us — and about findings from our own measurement and campaigns. If there is a topic you would like us to cover, get in touch via our contact page.',
  },
  {
    question: 'Do you cover paid advertising and SEO topics?',
    answer:
      'Yes — under the Digital Marketing category. We share what we are testing across Google Ads, Meta Ads, LinkedIn Ads, local SEO, and content. Real-world results, not generic best-practice rehashes.',
  },
];
