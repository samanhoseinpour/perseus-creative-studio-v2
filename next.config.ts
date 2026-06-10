import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/web-development',
        destination: '/services/websites/website-development',
        permanent: true,
      },
      {
        source: '/visual-production',
        destination: '/projects',
        permanent: true,
      },
      {
        source: '/blogs/web-development/strong-website-vancouver-business',
        destination: '/blogs/strong-website-vancouver-business',
        permanent: true,
      },
      {
        source: '/authors',
        destination: '/blogs/authors',
        permanent: true,
      },
      {
        source: '/services/social-media-management',
        destination: '/services/social/social-media-management',
        permanent: true,
      },
      {
        source: '/blogs/real-estate-website-design-vancouver-realtors',
        destination: '/blogs/strong-website-vancouver-business',
        permanent: true,
      },
      {
        source: '/blogs/neighbourhood-content-vancouver-realtors',
        destination: '/blogs/vancouver-realtors-video-social-content-2026',
        permanent: true,
      },
      {
        source: '/blogs/real-estate-content-ideas-vancouver-realtors',
        destination: '/blogs/vancouver-realtors-video-social-content-2026',
        permanent: true,
      },
      {
        // Blog categories were renamed to match the service registry slugs
        // (videography-and-photography → production, website → websites).
        // ?category= URLs are excluded from the sitemap but may be indexed
        // or linked externally, so redirect the old filter values.
        source: '/blogs',
        has: [
          {
            type: 'query',
            key: 'category',
            value: 'videography-and-photography',
          },
        ],
        destination: '/blogs?category=production',
        permanent: true,
      },
      {
        source: '/blogs',
        has: [{ type: 'query', key: 'category', value: 'website' }],
        destination: '/blogs?category=websites',
        permanent: true,
      },
      {
        // The child sitemaps live under /sitemaps/*.xml; sending the bare
        // /sitemaps and /sitemap paths to the index gives a sane landing spot.
        source: '/sitemaps',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/sitemap',
        destination: '/sitemap.xml',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
    ],
  },
  async headers() {
    return [
      {
        // Browsers only apply the sitemap stylesheet when it's served with an
        // XML MIME type; some hosts default `.xsl` to octet-stream otherwise.
        source: '/sitemap.xsl',
        headers: [
          { key: 'Content-Type', value: 'text/xsl; charset=utf-8' },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
