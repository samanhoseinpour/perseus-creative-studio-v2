import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/web-development',
        destination: '/services',
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
};

export default nextConfig;
