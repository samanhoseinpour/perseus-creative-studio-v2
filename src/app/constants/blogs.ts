export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  href: string;
  description: string;
  imageUrl: string;
  date: string;
  datetime: string;
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
    ogImage: string;
    ogType: 'article';
    twitterCard: 'summary_large_image';
    robots: 'index,follow';
    keywords: string[];
    schema: {
      '@type': 'Article';
      headline: string;
      datePublished: string;
      dateModified: string;
      author: { '@type': 'Organization'; name: string };
      publisher: { '@type': 'Organization'; name: string };
      image: string[];
      mainEntityOfPage: { '@type': 'WebPage'; '@id': string };
    };
  };
};

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'vancouver-real-estate-videography-photography',
    title:
      'Does High-End Videography Actually Sell Vancouver Homes Faster? (2026 Data)',
    href: '/blogs/vancouver-real-estate-videography-photography',
    description:
      'Vancouver’s real estate market is one of the most competitive in the world. Ordinary listing photos and videos won’t cut it anymore—top realtors are using cinematic walkthroughs, drone footage, and high-end photography to attract buyers and close deals faster.',
    imageUrl: 'about-perseus-12.jpg',
    date: 'Feb 8, 2025',
    datetime: '2025-02-08',
    category: {
      title: 'Videography and Photography',
      slug: 'videography-and-photography',
      href: '/blogs',
    },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Digital Marketing Agency',
      href: '/',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title: 'Impact of High-End Videography on Vancouver Home Sales (2026)',
      description:
        'Does videography actually sell Vancouver homes faster? Discover how professional videography and drone footage significantly increase final sale prices in 2026.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-real-estate-videography-photography',
      ogTitle: 'Impact of High-End Videography on Vancouver Home Sales (2026)',
      ogDescription:
        'Does videography actually sell Vancouver homes faster? Discover how professional videography and drone footage significantly increase final sale prices in 2026.',
      ogImage: 'https://ik.imagekit.io/perseus/about-perseus-12.jpg',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      keywords: [
        'real estate marketing',
        'Vancouver real estate',
        'real estate videography',
        'drone photography',
        'real estate listings',
        'sell homes fast',
      ],
      schema: {
        '@type': 'Article',
        headline:
          'Impact of High-End Videography on Vancouver Home Sales (2026)',
        datePublished: '2025-02-08',
        dateModified: '2025-02-08',
        author: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        image: ['/logo-black.png'],
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': '/blogs/vancouver-real-estate-videography-photography',
        },
      },
    },
  },
  {
    id: 2,
    slug: 'vancouver-business-360-marketing',
    title: 'Why Vancouver Businesses Need 360° Marketing to Stay Ahead',
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
      href: '/',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        '360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio',
      description:
        'In a competitive marketplace, your business needs branding, videography, web design, and SEO to thrive. Discover why 360° marketing is essential for Vancouver businesses.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-business-360-marketing',
      ogTitle:
        '360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio',
      ogDescription:
        'In a competitive marketplace, your business needs branding, videography, web design, and SEO to thrive. Discover why 360° marketing is essential for Vancouver businesses.',
      ogImage: 'https://ik.imagekit.io/perseus/navbar-services-2.jpeg',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      keywords: [
        'digital marketing',
        'Vancouver business marketing',
        'branding',
        'website design',
        'SEO',
        'full-service marketing',
      ],
      schema: {
        '@type': 'Article',
        headline:
          '360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio',
        datePublished: '2025-02-01',
        dateModified: '2025-02-01',
        author: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        image: ['/logo-black.png'],
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': '/blogs/vancouver-business-360-marketing',
        },
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
      href: '/',
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
      ogImage: 'https://ik.imagekit.io/perseus/navbar-website-2.jpeg',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      keywords: [
        'website development',
        'Vancouver web design',
        'custom websites',
        'SEO optimization',
        'business growth',
      ],
      schema: {
        '@type': 'Article',
        headline: 'Why Your Vancouver Business Needs a Strong Website?',
        datePublished: '2025-01-15',
        dateModified: '2025-01-15',
        author: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        image: ['/logo-black.png'],
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': '/blogs/strong-website-vancouver-business',
        },
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
    imageUrl: 'https://ik.imagekit.io/perseus/navbar-website.jpeg',
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
      href: '/',
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
      ogImage: 'https://ik.imagekit.io/perseus/navbar-website.jpeg',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      keywords: [
        'Outdated website impacts on Vancouver businesses',
        'Website inactivity risks for Vancouver businesses',
        'Website maintenance Vancouver',
        'What is an outdated website?',
      ],
      schema: {
        '@type': 'Article',
        headline:
          'The Cost of Inaction: What Happens to Your Vancouver Business When Your Website is Outdated?',
        datePublished: '2026-02-10',
        dateModified: '2026-02-10',
        author: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        publisher: { '@type': 'Organization', name: 'Perseus Creative Studio' },
        image: ['/logo-black.png'],
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id':
            '/blogs/the-cost-of-inaction-what-happens-to-your-vancouver-business-when-your-website-is-outdated',
        },
      },
    },
  },
];
