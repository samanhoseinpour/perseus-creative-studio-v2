export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  href: string;
  description: string;
  imageUrl: string;
  date: string;
  datetime: string;
  category: { title: string; href: string };
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
      'Stand Out in Vancouver’s Real Estate Market with High-End Videography and Photography',
    href: '/blogs/vancouver-real-estate-videography-photography',
    description:
      'Vancouver’s real estate market is one of the most competitive in the world. Ordinary listing photos and videos won’t cut it anymore—top realtors are using cinematic walkthroughs, drone footage, and high-end photography to attract buyers and close deals faster.',
    imageUrl: 'about-perseus-12.jpg',
    date: 'Feb 8, 2025',
    datetime: '2025-02-08',
    category: { title: 'Videography and Photography', href: '/blogs' },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Marketing Agency',
      href: '/',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        'Vancouver Real Estate Videography and Photography | Sell Homes Faster',
      description:
        'Boost your real estate sales with high-end videography and photography. Discover how Vancouver’s top realtors use cinematic walkthroughs and drone footage to attract buyers.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/vancouver-real-estate-videography-photography',
      ogTitle:
        'Vancouver Real Estate Videography and Photography | Sell Homes Faster',
      ogDescription:
        'Boost your real estate sales with high-end videography and photography. Discover how Vancouver’s top realtors use cinematic walkthroughs and drone footage to attract buyers.',
      ogImage: 'about-perseus-12.jpg',
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
          'Vancouver Real Estate Videography and Photography | Sell Homes Faster',
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
    category: { title: 'Digital Marketing and SEO', href: '/blogs' },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Marketing Agency',
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
      ogImage: 'navbar-services-2.jpeg',
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
    title: 'Why Vancouver Businesses Need a Strong Website',
    href: '/blogs/strong-website-vancouver-business',
    description:
      'Your website is your digital storefront—the first impression potential customers get of your brand. A custom-coded, fast, and SEO-optimized website is essential to gaining credibility and increasing conversions.',
    imageUrl: 'navbar-website-2.jpeg',
    date: 'Jan 15, 2025',
    datetime: '2025-01-15',
    category: { title: 'Web Development', href: '/blogs' },
    author: {
      name: 'Perseus Creative Studio',
      role: 'Marketing Agency',
      href: '/',
      imageUrl: '/logo-black.png',
    },
    seo: {
      title:
        'Why Your Vancouver Business Needs a Strong Website | Custom Web Design',
      description:
        'Your website is the foundation of your online presence. Learn how a custom-built, fast, and SEO-optimized website can grow your Vancouver business.',
      canonicalPath:
        'https://www.perseustudio.com/blogs/strong-website-vancouver-business',
      ogTitle:
        'Why Your Vancouver Business Needs a Strong Website | Custom Web Design',
      ogDescription:
        'Your website is the foundation of your online presence. Learn how a custom-built, fast, and SEO-optimized website can grow your Vancouver business.',
      ogImage: 'navbar-website-2.jpeg',
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
        headline:
          'Why Your Vancouver Business Needs a Strong Website | Custom Web Design',
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
];
