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

const PERSEUS_AUTHOR = BLOG_AUTHORS['perseus-creative-studio'];

const BLOG_AUTHOR_SCHEMA = {
  '@type': 'Person' as const,
  name: PERSEUS_AUTHOR.name,
  url: `https://www.perseustudio.com${PERSEUS_AUTHOR.href}`,
  sameAs: PERSEUS_AUTHOR.sameAs,
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  href: string;
  description: string;
  imageUrl: string;
  date: string;
  datetime: string;
  // ISO date (YYYY-MM-DD). Bump when meaningfully editing a post — feeds
  // schema.org dateModified and OG modifiedTime; freshness is a ranking signal.
  updatedAt?: string;
  category: { title: string; slug: string; href: string };
  author: {
    name: string;
    role: string;
    href: string;
    imageUrl: string;
  };
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
    schema: {
      '@type': 'BlogPosting';
      headline: string;
      description?: string;
      datePublished: string;
      dateModified?: string;
      mainEntityOfPage?: string;
      author: {
        '@type': 'Person';
        name: string;
        url: string;
        sameAs: string[];
      };
      publisher: { '@type': 'Organization'; name: string };
    };
  };
};

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'vancouver-real-estate-videography-photography',
    title:
      'Does High-End Videography Help Vancouver Homes Sell Faster? (2026 Data)',
    href: '/blogs/vancouver-real-estate-videography-photography',
    description:
      'A practical look at how professional real estate photography, cinematic walkthrough videos, and drone footage can improve listing presentation, buyer engagement, and marketing performance for Vancouver properties.',
    imageUrl: 'about-perseus-12.jpg',
    date: 'Feb 8, 2026',
    datetime: '2026-02-08',
    updatedAt: '2026-05-03',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
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
      schema: {
        '@type': 'BlogPosting',
        headline:
          'Does High-End Videography Help Vancouver Homes Sell Faster? (2026 Data)',
        description:
          'A practical look at how professional real estate photography, cinematic walkthrough videos, and drone footage can improve listing presentation, buyer engagement, and marketing performance for Vancouver properties.',
        datePublished: '2026-02-08',
        dateModified: '2026-05-03',
        mainEntityOfPage:
          'https://www.perseustudio.com/blogs/vancouver-real-estate-videography-photography',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
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
    imageUrl: 'navbar-services-2.jpeg',
    date: 'Feb 1, 2025',
    datetime: '2025-02-01',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
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
      schema: {
        '@type': 'BlogPosting',
        headline: '360 Marketing Strategy Guide for Vancouver Businesses',
        datePublished: '2025-02-01',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
    },
  },
  {
    id: 3,
    slug: 'strong-website-vancouver-business',
    title: 'Why Vancouver Businesses Need a Strong Website in 2026',
    href: '/blogs/strong-website-vancouver-business',
    description:
      'Your website is your digital storefront—the first impression potential customers get of your brand. A custom-coded, fast, and SEO-optimized website is essential to gaining credibility and increasing conversions.',
    imageUrl: 'navbar-website-2.jpeg',
    date: 'Jan 15, 2025',
    datetime: '2025-01-15',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
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
      schema: {
        '@type': 'BlogPosting',
        headline: 'Why Your Vancouver Business Needs a Strong Website?',
        datePublished: '2025-01-15',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
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
    imageUrl: 'navbar-website.jpeg',
    date: 'Feb 10, 2026',
    datetime: '2026-02-10',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        'What Happens to Your Vancouver Business When Your Website is Outdated?',
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
      schema: {
        '@type': 'BlogPosting',
        headline:
          'The Cost of Inaction: What Happens to Your Vancouver Business When Your Website is Outdated?',
        datePublished: '2026-02-10',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
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
    imageUrl: 'services-photography.jpeg',
    date: 'Feb 11, 2026',
    datetime: '2026-02-11',
    category: {
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        'Digital Marketing Made Simple: The Complete Guide for Vancouver Business Owners',
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
      schema: {
        '@type': 'BlogPosting',
        headline:
          'Digital Marketing Made Simple: The Complete Guide for Vancouver Business Owners',
        datePublished: '2026-02-11',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
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
    date: 'Feb 21, 2026',
    datetime: '2026-02-21',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        'The Ultimate 2026 Media Production Guide for Vancouver Business Owners',
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
      schema: {
        '@type': 'BlogPosting',
        headline:
          'The Ultimate 2026 Media Production Guide for Vancouver Business Owners',
        datePublished: '2026-02-21',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
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
    date: 'Feb 24, 2026',
    datetime: '2026-02-24',
    category: {
      title: 'Website',
      slug: 'website',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/logo-black.png',
    },
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
      schema: {
        '@type': 'BlogPosting',
        headline:
          '5 Common Web Design Mistakes Reducing Vancouver Small Businesses Sales',
        datePublished: '2026-02-24',
        author: BLOG_AUTHOR_SCHEMA,
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
      },
    },
  },
];
