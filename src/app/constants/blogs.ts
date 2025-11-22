// blogPosts.ts
// Normalized to your blogPost schema. All images use /logo-black.png.

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  href: string;
  description: string;
  imageUrl: string;
  date: string; // human-readable
  datetime: string; // ISO 8601 (YYYY-MM-DD)
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
    ogType: "article";
    twitterCard: "summary_large_image";
    robots: "index,follow";
    keywords: string[];
    schema: {
      "@type": "Article";
      headline: string;
      datePublished: string;
      dateModified: string;
      author: { "@type": "Organization"; name: string };
      publisher: { "@type": "Organization"; name: string };
      image: string[];
      mainEntityOfPage: { "@type": "WebPage"; "@id": string };
    };
  };
};

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "vancouver-real-estate-videography-photography",
    title:
      "Stand Out in Vancouver’s Real Estate Market with High-End Videography and Photography",
    href: "/blogs/vancouver-real-estate-videography-photography",
    description:
      "Vancouver’s real estate market is one of the most competitive in the world. Ordinary listing photos and videos won’t cut it anymore—top realtors are using cinematic walkthroughs, drone footage, and high-end photography to attract buyers and close deals faster.",
    imageUrl: "/homeServices-2.JPG",
    date: "Feb 8, 2025",
    datetime: "2025-02-08",
    category: { title: "Videography and Photography", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title:
        "Vancouver Real Estate Videography and Photography | Sell Homes Faster",
      description:
        "Boost your real estate sales with high-end videography and photography. Discover how Vancouver’s top realtors use cinematic walkthroughs and drone footage to attract buyers.",
      canonicalPath: "/blogs/vancouver-real-estate-videography-photography",
      ogTitle:
        "Vancouver Real Estate Videography and Photography | Sell Homes Faster",
      ogDescription:
        "Boost your real estate sales with high-end videography and photography. Discover how Vancouver’s top realtors use cinematic walkthroughs and drone footage to attract buyers.",
      ogImage: "/homeServices-2.JPG",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "real estate marketing",
        "Vancouver real estate",
        "real estate videography",
        "drone photography",
        "real estate listings",
        "sell homes fast",
      ],
      schema: {
        "@type": "Article",
        headline:
          "Vancouver Real Estate Videography and Photography | Sell Homes Faster",
        datePublished: "2025-02-08",
        dateModified: "2025-02-08",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/vancouver-real-estate-videography-photography",
        },
      },
    },
  },
  {
    id: 2,
    slug: "vancouver-business-360-marketing",
    title: "Why Vancouver Businesses Need 360° Marketing to Stay Ahead",
    href: "/blogs/vancouver-business-360-marketing",
    description:
      "With thousands of businesses competing for attention in Vancouver, standing out requires more than just having a great product or service. A 360° marketing strategy is essential to building brand awareness, attracting customers, and increasing revenue.",
    imageUrl: "/logo-black.png",
    date: "Feb 1, 2025",
    datetime: "2025-02-01",
    category: { title: "Digital Marketing and SEO", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title:
        "360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio",
      description:
        "In a competitive marketplace, your business needs branding, videography, web design, and SEO to thrive. Discover why 360° marketing is essential for Vancouver businesses.",
      canonicalPath: "/blogs/vancouver-business-360-marketing",
      ogTitle:
        "360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio",
      ogDescription:
        "In a competitive marketplace, your business needs branding, videography, web design, and SEO to thrive. Discover why 360° marketing is essential for Vancouver businesses.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "digital marketing",
        "Vancouver business marketing",
        "branding",
        "website design",
        "SEO",
        "full-service marketing",
      ],
      schema: {
        "@type": "Article",
        headline:
          "360° Marketing Strategies for Vancouver Businesses - Perseus Creative Studio",
        datePublished: "2025-02-01",
        dateModified: "2025-02-01",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/vancouver-business-360-marketing",
        },
      },
    },
  },
  {
    id: 3,
    slug: "strong-website-vancouver-business",
    title: "Why Vancouver Businesses Need a Strong Website",
    href: "/blogs/strong-website-vancouver-business",
    description:
      "Your website is your digital storefront—the first impression potential customers get of your brand. A custom-coded, fast, and SEO-optimized website is essential to gaining credibility and increasing conversions.",
    imageUrl: "/logo-black.png",
    date: "Jan 15, 2025",
    datetime: "2025-01-15",
    category: { title: "Web Development", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title:
        "Why Your Vancouver Business Needs a Strong Website | Custom Web Design",
      description:
        "Your website is the foundation of your online presence. Learn how a custom-built, fast, and SEO-optimized website can grow your Vancouver business.",
      canonicalPath: "/blogs/strong-website-vancouver-business",
      ogTitle:
        "Why Your Vancouver Business Needs a Strong Website | Custom Web Design",
      ogDescription:
        "Your website is the foundation of your online presence. Learn how a custom-built, fast, and SEO-optimized website can grow your Vancouver business.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "website development",
        "Vancouver web design",
        "custom websites",
        "SEO optimization",
        "business growth",
      ],
      schema: {
        "@type": "Article",
        headline:
          "Why Your Vancouver Business Needs a Strong Website | Custom Web Design",
        datePublished: "2025-01-15",
        dateModified: "2025-01-15",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/strong-website-vancouver-business",
        },
      },
    },
  },
  {
    id: 4,
    slug: "custom-vs-template-websites",
    title:
      "Custom vs. Template Websites: Which One is Right for Your Business?",
    href: "/blogs/custom-vs-template-websites",
    description:
      "Template websites may seem convenient, but they come with slow performance, limited customization, and poor SEO. A custom website is built for speed, branding, and long-term scalability.",
    imageUrl: "/logo-black.png",
    date: "Jan 2, 2025",
    datetime: "2025-01-02",
    category: { title: "Web Development", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title: "Custom Websites vs. Templates: Which is Best for Your Business?",
      description:
        "A custom website offers better speed, branding, and SEO than template sites. Discover why a custom-built website is the key to online success.",
      canonicalPath: "/blogs/custom-vs-template-websites",
      ogTitle:
        "Custom Websites vs. Templates: Which is Best for Your Business?",
      ogDescription:
        "A custom website offers better speed, branding, and SEO than template sites. Discover why a custom-built website is the key to online success.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "custom websites",
        "template websites",
        "web development",
        "website performance",
        "SEO",
        "business branding",
      ],
      schema: {
        "@type": "Article",
        headline:
          "Custom Websites vs. Templates: Which is Best for Your Business?",
        datePublished: "2025-01-02",
        dateModified: "2025-01-02",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/custom-vs-template-websites",
        },
      },
    },
  },
  {
    id: 5,
    slug: "strong-branding-business-success",
    title: "How Strong Branding Transforms Businesses: A Guide to Standing Out",
    href: "/blogs/strong-branding-business-success",
    description:
      "Branding isn’t just a logo—it’s the foundation of how customers perceive, trust, and connect with your business.",
    imageUrl: "/logo-black.png",
    date: "Feb 10, 2025",
    datetime: "2025-02-10",
    category: { title: "Branding and Design", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title:
        "How Strong Branding Can Transform Your Business | Perseus Creative",
      description:
        "Branding is more than a logo—it's the key to business success. Learn how to build a strong, recognizable brand that stands out in a crowded market.",
      canonicalPath: "/blogs/strong-branding-business-success",
      ogTitle:
        "How Strong Branding Can Transform Your Business | Perseus Creative",
      ogDescription:
        "Branding is more than a logo—it's the key to business success. Learn how to build a strong, recognizable brand that stands out in a crowded market.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "branding",
        "business branding",
        "logo design",
        "brand identity",
        "marketing strategy",
        "visual branding",
      ],
      schema: {
        "@type": "Article",
        headline:
          "How Strong Branding Can Transform Your Business | Perseus Creative",
        datePublished: "2025-02-10",
        dateModified: "2025-02-10",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/strong-branding-business-success",
        },
      },
    },
  },
  {
    id: 6,
    slug: "digital-trends-business-growth-2025",
    title: "Top 5 Digital Trends That Will Shape Business Growth in 2025",
    href: "/blogs/digital-trends-business-growth-2025",
    description:
      "Technology is evolving fast. Discover the top 5 digital trends—from AI to automation—that will impact business growth in 2025 and beyond.",
    imageUrl: "/logo-black.png",
    date: "Feb 3, 2025",
    datetime: "2025-02-03",
    category: { title: "Business Growth and Innovation", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title: "Top 5 Digital Trends Shaping Business Growth in 2025",
      description:
        "Stay ahead of the curve! Learn about AI, automation, and other digital trends that will shape the future of business and innovation in 2025.",
      canonicalPath: "/blogs/digital-trends-business-growth-2025",
      ogTitle: "Top 5 Digital Trends Shaping Business Growth in 2025",
      ogDescription:
        "Stay ahead of the curve! Learn about AI, automation, and other digital trends that will shape the future of business and innovation in 2025.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "business growth",
        "digital transformation",
        "AI in business",
        "marketing trends",
        "innovation",
        "business strategy",
        "future of business",
      ],
      schema: {
        "@type": "Article",
        headline: "Top 5 Digital Trends Shaping Business Growth in 2025",
        datePublished: "2025-02-03",
        dateModified: "2025-02-03",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/digital-trends-business-growth-2025",
        },
      },
    },
  },
  {
    id: 7,
    slug: "ecommerce-product-photography",
    title: "E-Commerce Success: Why High-Quality Product Photography Matters",
    href: "/blogs/ecommerce-product-photography",
    description:
      "First impressions matter in e-commerce. Learn how professional product photography can increase sales, enhance brand trust, and boost conversions.",
    imageUrl: "/logo-black.png",
    date: "Feb 9, 2025",
    datetime: "2025-02-09",
    category: { title: "E-Commerce and Product Marketing", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title: "Why Product Photography is Essential for E-Commerce Success",
      description:
        "Want more sales? Learn how high-quality product photography can increase conversions, build trust, and make your e-commerce store stand out.",
      canonicalPath: "/blogs/ecommerce-product-photography",
      ogTitle: "Why Product Photography is Essential for E-Commerce Success",
      ogDescription:
        "Want more sales? Learn how high-quality product photography can increase conversions, build trust, and make your e-commerce store stand out.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "ecommerce photography",
        "product marketing",
        "online store success",
        "product photos",
        "Shopify branding",
        "increase online sales",
        "professional photography",
      ],
      schema: {
        "@type": "Article",
        headline: "Why Product Photography is Essential for E-Commerce Success",
        datePublished: "2025-02-09",
        dateModified: "2025-02-09",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/ecommerce-product-photography",
        },
      },
    },
  },
  {
    id: 8,
    slug: "vancouver-brand-videography-photography",
    title:
      "How to Use Videography and Photography to Tell Your Brand’s Story in Vancouver",
    href: "/blogs/vancouver-brand-videography-photography",
    description:
      "In Vancouver’s competitive business landscape, compelling visual storytelling is essential. Learn how videography and photography can elevate your brand and connect emotionally with your audience.",
    imageUrl: "/logo-black.png",
    date: "Mar 28, 2025",
    datetime: "2025-03-28",
    category: { title: "Videography and Photography", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title:
        "How to Use Videography & Photography to Tell Your Brand Story in Vancouver",
      description:
        "Learn how videography and photography can craft a compelling brand story. Boost your Vancouver business with expert visual solutions.",
      canonicalPath: "/blogs/vancouver-brand-videography-photography",
      ogTitle:
        "How to Use Videography & Photography to Tell Your Brand Story in Vancouver",
      ogDescription:
        "Learn how videography and photography can craft a compelling brand story. Boost your Vancouver business with expert visual solutions.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "brand storytelling Vancouver",
        "videography for business",
        "photography for branding",
      ],
      schema: {
        "@type": "Article",
        headline:
          "How to Use Videography & Photography to Tell Your Brand Story in Vancouver",
        datePublished: "2025-03-28",
        dateModified: "2025-03-28",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/vancouver-brand-videography-photography",
        },
      },
    },
  },
  {
    id: 9,
    slug: "vancouver-professional-videography-benefits",
    title: "The Benefits of Professional Videography for Vancouver Businesses",
    href: "/blogs/vancouver-professional-videography-benefits",
    description:
      "Professional videography helps Vancouver businesses build credibility, boost engagement, and drive sales. Discover why investing in expert video content gives your brand a powerful competitive edge.",
    imageUrl: "/logo-black.png",
    date: "Mar 28, 2025",
    datetime: "2025-03-28",
    category: { title: "Videography and Photography", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title: "Benefits of Professional Videography for Vancouver Businesses",
      description:
        "Discover how professional videography boosts your Vancouver business. Elevate credibility, engagement, and sales with expert video content.",
      canonicalPath: "/blogs/vancouver-professional-videography-benefits",
      ogTitle: "Benefits of Professional Videography for Vancouver Businesses",
      ogDescription:
        "Discover how professional videography boosts your Vancouver business. Elevate credibility, engagement, and sales with expert video content.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "professional videography Vancouver",
        "video marketing benefits",
        "Vancouver business videos",
      ],
      schema: {
        "@type": "Article",
        headline:
          "Benefits of Professional Videography for Vancouver Businesses",
        datePublished: "2025-03-28",
        dateModified: "2025-03-28",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/vancouver-professional-videography-benefits",
        },
      },
    },
  },
  {
    id: 10,
    slug: "vancouver-photography-trends-2025",
    title: "Photography Trends for Vancouver Businesses in 2025",
    href: "/blogs/vancouver-photography-trends-2025",
    description:
      "Explore the top photography trends shaping Vancouver businesses in 2025. From authenticity to 360-degree visuals, learn how to stay ahead with compelling imagery that drives engagement and growth.",
    imageUrl: "/logo-black.png",
    date: "Mar 28, 2025",
    datetime: "2025-03-28",
    category: { title: "Videography and Photography", href: "/blogs" },
    author: {
      name: "Perseus Creative Studio",
      role: "Marketing Agency",
      href: "/",
      imageUrl: "/logo-black.png",
    },
    seo: {
      title: "Top Photography Trends for Vancouver Businesses in 2025",
      description:
        "Explore 2025 photography trends for Vancouver businesses. Stay ahead with innovative visuals that boost your brand and attract customers.",
      canonicalPath: "/blogs/vancouver-photography-trends-2025",
      ogTitle: "Top Photography Trends for Vancouver Businesses in 2025",
      ogDescription:
        "Explore 2025 photography trends for Vancouver businesses. Stay ahead with innovative visuals that boost your brand and attract customers.",
      ogImage: "/logo-black.png",
      ogType: "article",
      twitterCard: "summary_large_image",
      robots: "index,follow",
      keywords: [
        "photography trends 2025",
        "Vancouver business photography",
        "modern photography styles",
      ],
      schema: {
        "@type": "Article",
        headline: "Top Photography Trends for Vancouver Businesses in 2025",
        datePublished: "2025-03-28",
        dateModified: "2025-03-28",
        author: { "@type": "Organization", name: "Perseus Creative Studio" },
        publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
        image: ["/logo-black.png"],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "/blogs/vancouver-photography-trends-2025",
        },
      },
    },
  },
  // {
  //   id: 11,
  //   slug: "cinematic-storytelling-through-video",
  //   title: "The Art of Cinematic Storytelling Through Video",
  //   href: "/blogs/cinematic-storytelling-through-video",
  //   description:
  //     "Cinematic storytelling is more than just beautiful visuals—it’s about creating emotional, structured narratives that resonate with your audience.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "The Art of Cinematic Storytelling Through Video",
  //     description:
  //       "Master cinematic storytelling with video. Learn techniques to captivate audiences and elevate your projects.",
  //     canonicalPath: "/blogs/cinematic-storytelling-through-video",
  //     ogTitle: "The Art of Cinematic Storytelling Through Video",
  //     ogDescription:
  //       "Master cinematic storytelling with video. Learn techniques to captivate audiences and elevate your projects.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "cinematic storytelling",
  //       "video storytelling techniques",
  //       "art of videography",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "The Art of Cinematic Storytelling Through Video",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/cinematic-storytelling-through-video",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 12,
  //   slug: "aerial-videography-benefits",
  //   title: "The Benefits of Aerial Videography for Businesses and Events",
  //   href: "/blogs/aerial-videography-benefits",
  //   description:
  //     "Aerial videography offers stunning visual impact and storytelling power. Discover how businesses and event planners in Vancouver can use drone footage to elevate engagement, promotion, and brand presence.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Aerial Videography Benefits for Businesses & Events",
  //     description:
  //       "Explore the benefits of aerial videography for businesses and events. Elevate your visuals with stunning perspectives.",
  //     canonicalPath: "/blogs/aerial-videography-benefits",
  //     ogTitle: "Aerial Videography Benefits for Businesses & Events",
  //     ogDescription:
  //       "Explore the benefits of aerial videography for businesses and events. Elevate your visuals with stunning perspectives.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "aerial videography",
  //       "drone video benefits",
  //       "business videography",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Aerial Videography Benefits for Businesses & Events",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/aerial-videography-benefits",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 13,
  //   slug: "choose-right-photographer",
  //   title: "How to Choose the Right Photographer for Your Project",
  //   href: "/blogs/choose-right-photographer",
  //   description:
  //     "Photography can make or break your project. Learn how to choose the right photographer for events, branding, product shoots, or personal milestones.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Choosing the Right Photographer for Your Project",
  //     description:
  //       "Learn how to pick the perfect photographer for your project. Tips for events, businesses, and personal shoots.",
  //     canonicalPath: "/blogs/choose-right-photographer",
  //     ogTitle: "Choosing the Right Photographer for Your Project",
  //     ogDescription:
  //       "Learn how to pick the perfect photographer for your project. Tips for events, businesses, and personal shoots.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "photographer selection",
  //       "hire a photographer",
  //       "photography tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Choosing the Right Photographer for Your Project",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/choose-right-photographer",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 14,
  //   slug: "vancouver-seo-strategies",
  //   title:
  //     "SEO Strategies for Vancouver Businesses: How to Dominate Local Search Results",
  //   href: "/blogs/vancouver-seo-strategies",
  //   description:
  //     "Master local SEO with proven strategies tailored for Vancouver businesses. Learn how to increase your visibility, attract more customers, and rank higher in local search results.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Digital Marketing and SEO", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "SEO Strategies to Dominate Local Search for Vancouver Businesses",
  //     description:
  //       "Master local SEO with these strategies for Vancouver businesses. Rank higher and attract more customers with expert tips.",
  //     canonicalPath: "/blogs/vancouver-seo-strategies",
  //     ogTitle:
  //       "SEO Strategies to Dominate Local Search for Vancouver Businesses",
  //     ogDescription:
  //       "Master local SEO with these strategies for Vancouver businesses. Rank higher and attract more customers with expert tips.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "Vancouver SEO services",
  //       "local SEO strategies",
  //       "business SEO tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "SEO Strategies to Dominate Local Search for Vancouver Businesses",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-seo-strategies",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 15,
  //   slug: "vancouver-content-marketing-growth",
  //   title: "The Role of Content Marketing in Driving Vancouver Business Growth",
  //   href: "/blogs/vancouver-content-marketing-growth",
  //   description:
  //     "Content marketing is a scalable, effective way to connect with your audience. Learn how Vancouver businesses use content to grow their brand, build trust, and increase visibility.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Digital Marketing and SEO", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Content Marketing for Vancouver Business Growth: Key Benefits",
  //     description:
  //       "Learn how content marketing drives growth for Vancouver businesses. Attract leads and customers with strategic, valuable content.",
  //     canonicalPath: "/blogs/vancouver-content-marketing-growth",
  //     ogTitle: "Content Marketing for Vancouver Business Growth: Key Benefits",
  //     ogDescription:
  //       "Learn how content marketing drives growth for Vancouver businesses. Attract leads and customers with strategic, valuable content.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "content marketing Vancouver",
  //       "Vancouver business growth",
  //       "content strategy",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Content Marketing for Vancouver Business Growth: Key Benefits",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-content-marketing-growth",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 16,
  //   slug: "vancouver-social-media-marketing-2025",
  //   title: "Social Media Marketing Tips for Vancouver Businesses in 2025",
  //   href: "/blogs/vancouver-social-media-marketing-2025",
  //   description:
  //     "Master social media marketing with these expert 2025 tips tailored for Vancouver businesses. Boost visibility, engagement, and growth with data-backed strategies.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Digital Marketing and SEO", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Social Media Marketing Tips for Vancouver Businesses in 2025",
  //     description:
  //       "Master social media marketing with these 2025 tips for Vancouver businesses. Grow your brand and engage your audience effectively.",
  //     canonicalPath: "/blogs/vancouver-social-media-marketing-2025",
  //     ogTitle: "Social Media Marketing Tips for Vancouver Businesses in 2025",
  //     ogDescription:
  //       "Master social media marketing with these 2025 tips for Vancouver businesses. Grow your brand and engage your audience effectively.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "social media marketing Vancouver",
  //       "Vancouver business tips",
  //       "2025 marketing trends",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Social Media Marketing Tips for Vancouver Businesses in 2025",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-social-media-marketing-2025",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 17,
  //   slug: "user-friendly-website-design-2025",
  //   title:
  //     "Designing a User-Friendly Website for Your Business: Best Practices for 2025",
  //   href: "/blogs/user-friendly-website-design-2025",
  //   description:
  //     "Create a seamless digital experience for your customers. Learn the latest web design best practices for 2025 to boost performance, engagement, and search engine rankings in Vancouver.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Web Development", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Best Practices for User-Friendly Website Design in Vancouver 2025",
  //     description:
  //       "Create a user-friendly website with these 2025 best practices. Build top-tier sites for Vancouver businesses that convert.",
  //     canonicalPath: "/blogs/user-friendly-website-design-2025",
  //     ogTitle:
  //       "Best Practices for User-Friendly Website Design in Vancouver 2025",
  //     ogDescription:
  //       "Create a user-friendly website with these 2025 best practices. Build top-tier sites for Vancouver businesses that convert.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "website design Vancouver",
  //       "user-friendly web development",
  //       "website best practices",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Best Practices for User-Friendly Website Design in Vancouver 2025",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/user-friendly-website-design-2025",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 18,
  //   slug: "responsive-web-design-vancouver",
  //   title: "The Importance of Responsive Web Design for Vancouver Businesses",
  //   href: "/blogs/responsive-web-design-vancouver",
  //   description:
  //     "Responsive web design ensures your Vancouver business stays competitive online. Discover why mobile-friendly sites matter more than ever in 2025.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Web Development", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Why Responsive Web Design Matters for Vancouver Businesses",
  //     description:
  //       "Learn why responsive web design is essential for Vancouver businesses. Ensure your site excels on all devices for better results.",
  //     canonicalPath: "/blogs/responsive-web-design-vancouver",
  //     ogTitle: "Why Responsive Web Design Matters for Vancouver Businesses",
  //     ogDescription:
  //       "Learn why responsive web design is essential for Vancouver businesses. Ensure your site excels on all devices for better results.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "responsive web design Vancouver",
  //       "mobile-friendly websites",
  //       "Vancouver web design",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Why Responsive Web Design Matters for Vancouver Businesses",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/responsive-web-design-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 19,
  //   slug: "website-speed-performance-vancouver",
  //   title:
  //     "How to Optimize Your Website for Speed and Performance in Vancouver",
  //   href: "/blogs/website-speed-performance-vancouver",
  //   description:
  //     "Website speed and performance directly impact your business’s visibility, user experience, and conversion rates. Learn proven techniques to build a fast, SEO-friendly website for your Vancouver audience.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Web Development", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Optimize Your Website Speed & Performance for Vancouver Businesses",
  //     description:
  //       "Boost your Vancouver website’s speed and performance with expert tips. Improve user experience and SEO for better results.",
  //     canonicalPath: "/blogs/website-speed-performance-vancouver",
  //     ogTitle:
  //       "Optimize Your Website Speed & Performance for Vancouver Businesses",
  //     ogDescription:
  //       "Boost your Vancouver website’s speed and performance with expert tips. Improve user experience and SEO for better results.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "website speed optimization",
  //       "Vancouver website performance",
  //       "fast website tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Optimize Your Website Speed & Performance for Vancouver Businesses",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/website-speed-performance-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 20,
  //   slug: "vancouver-strong-brand-identity",
  //   title:
  //     "Building a Strong Brand Identity: Key Elements Every Vancouver Business Should Consider",
  //   href: "/blogs/vancouver-strong-brand-identity",
  //   description:
  //     "Your brand identity is the soul of your business. Learn the key elements that define strong branding and how Vancouver businesses can stand out with design that connects.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Branding and Design", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Building a Strong Brand Identity for Vancouver Businesses",
  //     description:
  //       "Discover key elements of a strong brand identity. Stand out in Vancouver with expert design tips for your business.",
  //     canonicalPath: "/blogs/vancouver-strong-brand-identity",
  //     ogTitle: "Building a Strong Brand Identity for Vancouver Businesses",
  //     ogDescription:
  //       "Discover key elements of a strong brand identity. Stand out in Vancouver with expert design tips for your business.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "branding services Vancouver",
  //       "brand identity design",
  //       "Vancouver business branding",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Building a Strong Brand Identity for Vancouver Businesses",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-strong-brand-identity",
  //       },
  //     },
  //   },
  // },

  // // ---- 21–38 (already normalized) ----

  // {
  //   id: 21,
  //   slug: "consistent-branding-vancouver",
  //   title:
  //     "The Importance of Consistent Branding Across Platforms for Vancouver Businesses",
  //   href: "/blogs/consistent-branding-vancouver",
  //   description:
  //     "Consistency in branding builds trust and recognition. Discover how Vancouver businesses can create a unified identity across digital and physical touchpoints.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Branding and Design", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Consistent Branding Across Platforms for Vancouver Businesses",
  //     description:
  //       "Why consistent branding matters for Vancouver businesses. Build a unified presence that increases visibility and trust.",
  //     canonicalPath: "/blogs/consistent-branding-vancouver",
  //     ogTitle: "Consistent Branding Across Platforms for Vancouver Businesses",
  //     ogDescription:
  //       "Why consistent branding matters for Vancouver businesses. Build a unified presence that increases visibility and trust.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "consistent branding strategies",
  //       "Vancouver design agency",
  //       "branding tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Consistent Branding Across Platforms for Vancouver Businesses",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/consistent-branding-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 22,
  //   slug: "vancouver-rebranding-strategies",
  //   title:
  //     "Rebranding Strategies for Vancouver Businesses: When and How to Refresh",
  //   href: "/blogs/vancouver-rebranding-strategies",
  //   description:
  //     "Is it time for a brand refresh? Discover when to rebrand and how Vancouver businesses can strategically execute a brand transformation that resonates and grows.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Branding and Design", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Rebranding Strategies for Vancouver Businesses: When & How",
  //     description:
  //       "Learn when and how to rebrand your Vancouver business. Refresh your identity with effective strategies for growth.",
  //     canonicalPath: "/blogs/vancouver-rebranding-strategies",
  //     ogTitle: "Rebranding Strategies for Vancouver Businesses: When & How",
  //     ogDescription:
  //       "Learn when and how to rebrand your Vancouver business. Refresh your identity with effective strategies for growth.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "rebranding Vancouver",
  //       "Vancouver business rebranding",
  //       "rebranding tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Rebranding Strategies for Vancouver Businesses: When & How",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-rebranding-strategies",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 23,
  //   slug: "scaling-business-vancouver",
  //   title:
  //     "Strategies for Scaling Your Business: How to Grow Without Losing Quality in Vancouver",
  //   href: "/blogs/scaling-business-vancouver",
  //   description:
  //     "Learn how to scale your Vancouver business while preserving quality. These growth strategies help you expand your reach, retain customers, and protect your reputation.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Business Growth and Innovation", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Scaling Your Business in Vancouver: Strategies for Quality Growth",
  //     description:
  //       "Scale your Vancouver business without sacrificing quality. Discover proven strategies for sustainable growth and long-term success.",
  //     canonicalPath: "/blogs/scaling-business-vancouver",
  //     ogTitle:
  //       "Scaling Your Business in Vancouver: Strategies for Quality Growth",
  //     ogDescription:
  //       "Scale your Vancouver business without sacrificing quality. Discover proven strategies for sustainable growth and long-term success.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "business scaling strategies",
  //       "Vancouver business growth",
  //       "sustainable business growth",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Scaling Your Business in Vancouver: Strategies for Quality Growth",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/scaling-business-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 24,
  //   slug: "innovation-business-growth-vancouver",
  //   title:
  //     "The Importance of Innovation in Business Growth: Staying Ahead in Vancouver",
  //   href: "/blogs/innovation-business-growth-vancouver",
  //   description:
  //     "In Vancouver’s fast-moving business world, innovation is essential. Discover how creative thinking and adaptation drive lasting growth and relevance.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Business Growth and Innovation", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Innovation for Business Growth in Vancouver: Stay Ahead",
  //     description:
  //       "Why innovation drives business success in Vancouver. Lead your market with cutting-edge strategies and ideas.",
  //     canonicalPath: "/blogs/innovation-business-growth-vancouver",
  //     ogTitle: "Innovation for Business Growth in Vancouver: Stay Ahead",
  //     ogDescription:
  //       "Why innovation drives business success in Vancouver. Lead your market with cutting-edge strategies and ideas.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "business innovation strategies",
  //       "Vancouver business growth",
  //       "innovative business tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Innovation for Business Growth in Vancouver: Stay Ahead",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/innovation-business-growth-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 25,
  //   slug: "customer-feedback-vancouver-growth",
  //   title: "How to Use Customer Feedback for Business Growth in Vancouver",
  //   href: "/blogs/customer-feedback-vancouver-growth",
  //   description:
  //     "Customer feedback is a goldmine for Vancouver businesses. Learn how to gather, analyze, and act on feedback to drive growth and boost customer satisfaction.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Business Growth and Innovation", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Using Customer Feedback for Business Growth in Vancouver",
  //     description:
  //       "Turn customer feedback into business growth in Vancouver. Learn how to listen, act, and thrive through customer insight.",
  //     canonicalPath: "/blogs/customer-feedback-vancouver-growth",
  //     ogTitle: "Using Customer Feedback for Business Growth in Vancouver",
  //     ogDescription:
  //       "Turn customer feedback into business growth in Vancouver. Learn how to listen, act, and thrive through customer insight.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "customer feedback Vancouver",
  //       "business growth strategies",
  //       "Vancouver customer insights",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Using Customer Feedback for Business Growth in Vancouver",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/customer-feedback-vancouver-growth",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 26,
  //   slug: "ecommerce-conversion-optimization-vancouver",
  //   title:
  //     "Optimizing Your E-commerce Website for Conversions: Proven Tips for Vancouver Businesses",
  //   href: "/blogs/ecommerce-conversion-optimization-vancouver",
  //   description:
  //     "Boost your Vancouver e-commerce site’s conversions with proven design, speed, and content strategies. Learn how to turn more visitors into loyal buyers.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "E-Commerce and Product Marketing", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Optimize Your E-commerce Website for Conversions in Vancouver",
  //     description:
  //       "Increase e-commerce conversions with these proven tips. Design a Vancouver site that sells effectively.",
  //     canonicalPath: "/blogs/ecommerce-conversion-optimization-vancouver",
  //     ogTitle: "Optimize Your E-commerce Website for Conversions in Vancouver",
  //     ogDescription:
  //       "Increase e-commerce conversions with these proven tips. Design a Vancouver site that sells effectively.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "e-commerce optimization Vancouver",
  //       "conversion rate optimization",
  //       "e-commerce website tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Optimize Your E-commerce Website for Conversions in Vancouver",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/ecommerce-conversion-optimization-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 27,
  //   slug: "product-photography-ecommerce-vancouver",
  //   title:
  //     "The Importance of Product Photography in E-commerce for Vancouver Businesses",
  //   href: "/blogs/product-photography-ecommerce-vancouver",
  //   description:
  //     "Product photography is your digital storefront. Learn how Vancouver e-commerce businesses can use high-quality visuals to drive trust, engagement, and conversions.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "E-Commerce and Product Marketing", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Product Photography for E-commerce Success in Vancouver",
  //     description:
  //       "Learn how product photography drives e-commerce sales for Vancouver businesses. Boost your online store with stunning visuals.",
  //     canonicalPath: "/blogs/product-photography-ecommerce-vancouver",
  //     ogTitle: "Product Photography for E-commerce Success in Vancouver",
  //     ogDescription:
  //       "Learn how product photography drives e-commerce sales for Vancouver businesses. Boost your online store with stunning visuals.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "product photography Vancouver",
  //       "e-commerce visuals",
  //       "Vancouver online sales",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Product Photography for E-commerce Success in Vancouver",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/product-photography-ecommerce-vancouver",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 28,
  //   slug: "one-day-video-delivery-event-promotion",
  //   title: "One-Day Video Delivery: Fast-Track Your Event Promotion",
  //   href: "/blogs/one-day-video-delivery-event-promotion",
  //   description:
  //     "Promote your event fast with one-day video delivery. Recaps delivered in 24 hours keep momentum high and your brand top of mind.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "One-Day Video Delivery for Event Promotion",
  //     description:
  //       "Promote your Vancouver event fast with one-day video delivery. Get high-quality recap videos in 24 hours to boost hype and attendance.",
  //     canonicalPath: "/blogs/one-day-video-delivery-event-promotion",
  //     ogTitle: "One-Day Video Delivery for Event Promotion",
  //     ogDescription:
  //       "Promote your Vancouver event fast with one-day video delivery. Get high-quality recap videos in 24 hours to boost hype and attendance.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "one-day video delivery",
  //       "event video promotion",
  //       "fast event media",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "One-Day Video Delivery for Event Promotion",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/one-day-video-delivery-event-promotion",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 29,
  //   slug: "social-media-strategy-2025",
  //   title: "How to Create a Winning Social Media Strategy for 2025",
  //   href: "/blogs/social-media-strategy-2025",
  //   description:
  //     "Social media in 2025 is about more than likes. Build a results-focused strategy that fuels engagement, growth, and visibility in Vancouver’s digital landscape.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Digital Marketing and SEO", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Winning Social Media Strategy for 2025 | Vancouver Marketing Tips",
  //     description:
  //       "Build a winning social media strategy for 2025. Learn how to set goals, choose platforms, and create engaging content that works in Vancouver.",
  //     canonicalPath: "/blogs/social-media-strategy-2025",
  //     ogTitle:
  //       "Winning Social Media Strategy for 2025 | Vancouver Marketing Tips",
  //     ogDescription:
  //       "Build a winning social media strategy for 2025. Learn how to set goals, choose platforms, and create engaging content that works in Vancouver.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "social media strategy 2025",
  //       "social media marketing tips",
  //       "digital marketing trends",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Winning Social Media Strategy for 2025 | Vancouver Marketing Tips",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/social-media-strategy-2025",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 30,
  //   slug: "user-centered-web-design-2025",
  //   title: "The Importance of User-Centered Web Design in 2025",
  //   href: "/blogs/user-centered-web-design-2025",
  //   description:
  //     "In 2025, user-centered design is essential. Create faster, friendlier websites that engage users and boost rankings. Learn how to put people first in your digital experience.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Web Development", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "User-Centered Web Design in 2025 | UX Tips for Vancouver",
  //     description:
  //       "User-centered web design is key in 2025. Build sites that engage, convert, and rank higher with a people-first approach.",
  //     canonicalPath: "/blogs/user-centered-web-design-2025",
  //     ogTitle: "User-Centered Web Design in 2025 | UX Tips for Vancouver",
  //     ogDescription:
  //       "User-centered web design is key in 2025. Build sites that engage, convert, and rank higher with a people-first approach.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "user-centered web design",
  //       "2025 web design trends",
  //       "website usability",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "User-Centered Web Design in 2025 | UX Tips for Vancouver",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/user-centered-web-design-2025",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 31,
  //   slug: "memorable-brand-identity-from-scratch",
  //   title: "How to Build a Memorable Brand Identity from Scratch",
  //   href: "/blogs/memorable-brand-identity-from-scratch",
  //   description:
  //     "A strong brand is more than a logo—it’s how people remember you. Learn how to build a memorable identity from scratch that resonates and grows.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Branding and Design", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Build a Memorable Brand Identity from Scratch",
  //     description:
  //       "Learn how to create a memorable brand identity from scratch. Steps to stand out and connect with your audience.",
  //     canonicalPath: "/blogs/memorable-brand-identity-from-scratch",
  //     ogTitle: "Build a Memorable Brand Identity from Scratch",
  //     ogDescription:
  //       "Learn how to create a memorable brand identity from scratch. Steps to stand out and connect with your audience.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "brand identity creation",
  //       "memorable branding",
  //       "branding tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Build a Memorable Brand Identity from Scratch",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/memorable-brand-identity-from-scratch",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 32,
  //   slug: "technology-scaling-business-2025",
  //   title: "The Role of Technology in Scaling Your Business in 2025",
  //   href: "/blogs/technology-scaling-business-2025",
  //   description:
  //     "Technology is the backbone of business growth in 2025. From automation to analytics, discover tools and strategies that help scale smarter and faster.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Business Growth and Innovation", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Role of Technology in Scaling Your Business in 2025",
  //     description:
  //       "Discover how technology scales your business in 2025. Tools and strategies for growth without limits.",
  //     canonicalPath: "/blogs/technology-scaling-business-2025",
  //     ogTitle: "Role of Technology in Scaling Your Business in 2025",
  //     ogDescription:
  //       "Discover how technology scales your business in 2025. Tools and strategies for growth without limits.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "technology for business growth",
  //       "scaling with tech",
  //       "2025 business trends",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Role of Technology in Scaling Your Business in 2025",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/technology-scaling-business-2025",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 33,
  //   slug: "optimize-product-pages-for-conversions",
  //   title: "How to Optimize Product Pages for Maximum Conversions",
  //   href: "/blogs/optimize-product-pages-for-conversions",
  //   description:
  //     "E-commerce product pages are your digital sales team. Learn how to boost trust, reduce bounce rates, and drive conversions with these optimization tips.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "E-Commerce and Product Marketing", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Optimize Product Pages for Maximum Conversions",
  //     description:
  //       "Boost e-commerce sales with optimized product pages. Tips for maximum conversions and customer trust.",
  //     canonicalPath: "/blogs/optimize-product-pages-for-conversions",
  //     ogTitle: "Optimize Product Pages for Maximum Conversions",
  //     ogDescription:
  //       "Boost e-commerce sales with optimized product pages. Tips for maximum conversions and customer trust.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "product page optimization",
  //       "e-commerce conversions",
  //       "product marketing tips",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Optimize Product Pages for Maximum Conversions",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/optimize-product-pages-for-conversions",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 34,
  //   slug: "future-visual-content-marketing-trends",
  //   title: "The Future of Visual Content Marketing: Trends to Watch",
  //   href: "/blogs/future-visual-content-marketing-trends",
  //   description:
  //     "Visual content is evolving fast. Explore 2025’s top trends—from authenticity to AI—and learn how to stay ahead in Vancouver’s digital marketing space.",
  //   imageUrl: "/logo-black.png",
  //   date: "Mar 28, 2025",
  //   datetime: "2025-03-28",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title: "Future of Visual Content Marketing: 2025 Trends",
  //     description:
  //       "Explore the future of visual content marketing. Top trends for 2025 to boost your business or event.",
  //     canonicalPath: "/blogs/future-visual-content-marketing-trends",
  //     ogTitle: "Future of Visual Content Marketing: 2025 Trends",
  //     ogDescription:
  //       "Explore the future of visual content marketing. Top trends for 2025 to boost your business or event.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "visual content marketing",
  //       "2025 marketing trends",
  //       "visual trends",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline: "Future of Visual Content Marketing: 2025 Trends",
  //       datePublished: "2025-03-28",
  //       dateModified: "2025-03-28",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/future-visual-content-marketing-trends",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 35,
  //   slug: "restaurant-videography-photography-digital-presence",
  //   title:
  //     "How Professional Videography and Photography Can Boost Your Restaurant’s Online Presence and Attract More Diners",
  //   href: "/blogs/restaurant-videography-photography-digital-presence",
  //   description:
  //     "In today’s digital-first world, your restaurant’s online presence is as critical as the quality of your food. This blog explores how professional videography, photography, and a strategic website can attract more diners, elevate your brand, and increase bookings.",
  //   imageUrl: "/logo-black.png",
  //   date: "Apr 1, 2025",
  //   datetime: "2025-04-01",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Restaurant Videography and Photography Services | Grow Your Online Presence",
  //     description:
  //       "Discover how professional food photography and restaurant videography can transform your online presence, increase engagement, and attract more diners.",
  //     canonicalPath:
  //       "/blogs/restaurant-videography-photography-digital-presence",
  //     ogTitle:
  //       "Restaurant Videography and Photography Services | Grow Your Online Presence",
  //     ogDescription:
  //       "Discover how professional food photography and restaurant videography can transform your online presence, increase engagement, and attract more diners.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "restaurant videography",
  //       "food photography",
  //       "online restaurant marketing",
  //       "SEO for restaurants",
  //       "professional photography for food",
  //       "boost restaurant engagement",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Restaurant Videography and Photography Services | Grow Your Online Presence",
  //       datePublished: "2025-04-01",
  //       dateModified: "2025-04-01",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/restaurant-videography-photography-digital-presence",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 36,
  //   slug: "vancouver-real-estate-visual-marketing",
  //   title:
  //     "Real Estate Videography and Photography: Elevating Vancouver Listings with Visual Excellence",
  //   href: "/blogs/vancouver-real-estate-visual-marketing",
  //   description:
  //     "In Vancouver’s fast-paced real estate market, compelling visual content is essential. How photography, videography, 3D tours, floor plans, and drone footage help listings stand out and sell faster.",
  //   imageUrl: "/homeServices-4.JPG",
  //   date: "Apr 1, 2025",
  //   datetime: "2025-04-01",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Vancouver Real Estate Visual Services | Photography, Videography & 3D Tours",
  //     description:
  //       "Maximize your Vancouver listings with professional photos, cinematic videos, drone footage, 3D tours, and floor plans. Learn how to stand out and sell faster.",
  //     canonicalPath: "/blogs/vancouver-real-estate-visual-marketing",
  //     ogTitle:
  //       "Vancouver Real Estate Visual Services | Photography, Videography & 3D Tours",
  //     ogDescription:
  //       "Maximize your Vancouver listings with professional photos, cinematic videos, drone footage, 3D tours, and floor plans. Learn how to stand out and sell faster.",
  //     ogImage: "/homeServices-4.JPG",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "Vancouver real estate",
  //       "property photography",
  //       "real estate videography",
  //       "drone videos",
  //       "3D virtual tours",
  //       "floor plans for listings",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Vancouver Real Estate Visual Services | Photography, Videography & 3D Tours",
  //       datePublished: "2025-04-01",
  //       dateModified: "2025-04-01",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/vancouver-real-estate-visual-marketing",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 37,
  //   slug: "fitness-visual-marketing-website-seo",
  //   title:
  //     "Capturing the Energy: Why Gyms and Fitness Centers Need High-Quality Visuals and a Strong Website to Stand Out",
  //   href: "/blogs/fitness-visual-marketing-website-seo",
  //   description:
  //     "In the highly competitive fitness industry, compelling visual content and a powerful website are essential to attracting and retaining members. Learn how videography, photography, and SEO can power up your gym's brand.",
  //   imageUrl: "/logo-black.png",
  //   date: "Apr 1, 2025",
  //   datetime: "2025-04-01",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Fitness Videography, Photography & Website Strategy | Gym Marketing",
  //     description:
  //       "Stand out in the competitive fitness industry with high-quality videography, professional photography, and SEO-optimized websites. Attract new members and grow your gym.",
  //     canonicalPath: "/blogs/fitness-visual-marketing-website-seo",
  //     ogTitle:
  //       "Fitness Videography, Photography & Website Strategy | Gym Marketing",
  //     ogDescription:
  //       "Stand out in the competitive fitness industry with high-quality videography, professional photography, and SEO-optimized websites. Attract new members and grow your gym.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "gym videography",
  //       "fitness photography",
  //       "fitness website design",
  //       "gym SEO",
  //       "health club marketing",
  //       "personal training promotion",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Fitness Videography, Photography & Website Strategy | Gym Marketing",
  //       datePublished: "2025-04-01",
  //       dateModified: "2025-04-01",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/fitness-visual-marketing-website-seo",
  //       },
  //     },
  //   },
  // },
  // {
  //   id: 38,
  //   slug: "sports-team-athlete-branding-visuals",
  //   title:
  //     "Score Big with Fans: The Power of Dynamic Photography and Videography for Sports Teams and Athlete Branding",
  //   href: "/blogs/sports-team-athlete-branding-visuals",
  //   description:
  //     "For sports teams and athletes, powerful visuals and a professional digital presence are key to growing a fan base and building a lasting brand. Explore how video, photography, and SEO can fuel fan engagement and reputation.",
  //   imageUrl: "/logo-black.png",
  //   date: "Apr 1, 2025",
  //   datetime: "2025-04-01",
  //   category: { title: "Videography and Photography", href: "/blogs" },
  //   author: {
  //     name: "Perseus Creative Studio",
  //     role: "Marketing Agency",
  //     href: "/",
  //     imageUrl: "/logo-black.png",
  //   },
  //   seo: {
  //     title:
  //       "Sports Team Videography and Athlete Branding Services | Build Fan Engagement",
  //     description:
  //       "Grow your fan base and athlete brand with professional sports videography and photography. Learn how teams use digital media and SEO to connect with supporters and stand out.",
  //     canonicalPath: "/blogs/sports-team-athlete-branding-visuals",
  //     ogTitle:
  //       "Sports Team Videography and Athlete Branding Services | Build Fan Engagement",
  //     ogDescription:
  //       "Grow your fan base and athlete brand with professional sports videography and photography. Learn how teams use digital media and SEO to connect with supporters and stand out.",
  //     ogImage: "/logo-black.png",
  //     ogType: "article",
  //     twitterCard: "summary_large_image",
  //     robots: "index,follow",
  //     keywords: [
  //       "sports videography",
  //       "athlete branding",
  //       "sports team photography",
  //       "team websites",
  //       "sports SEO",
  //       "fan engagement",
  //     ],
  //     schema: {
  //       "@type": "Article",
  //       headline:
  //         "Sports Team Videography and Athlete Branding Services | Build Fan Engagement",
  //       datePublished: "2025-04-01",
  //       dateModified: "2025-04-01",
  //       author: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       publisher: { "@type": "Organization", name: "Perseus Creative Studio" },
  //       image: ["/logo-black.png"],
  //       mainEntityOfPage: {
  //         "@type": "WebPage",
  //         "@id": "/blogs/sports-team-athlete-branding-visuals",
  //       },
  //     },
  //   },
  // },
];
