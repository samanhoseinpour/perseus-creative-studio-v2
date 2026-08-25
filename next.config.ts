import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Rewrite these barrel imports to direct paths at build time so only the
  // icons/components actually used land in the bundle — trims first-party
  // unused JS out of the shared client chunk.
  experimental: {
    optimizePackageImports: ['motion', 'react-icons', 'radix-ui'],
    // Inline all CSS into <style> tags instead of render-blocking <link>
    // stylesheets. The main Tailwind sheet (~32KB brotli) was the biggest
    // render-blocking request (450ms on mobile PSI); inlining trades ~32KB of
    // extra HTML per page view for first-paint without a CSS round trip.
    // Client-side navigations still load CSS via <link>, so nav behavior and
    // caching are unchanged. Experimental — re-verify after Next upgrades
    // (post-build check: home HTML should contain <style> and no
    // rel="stylesheet").
    inlineCss: true,
    // The contact form's career tab posts a resume PDF through a server action
    // as multipart FormData. The client caps the file at 4 MB; 4.5mb here
    // matches Vercel's hard request-body ceiling (default is 1 MB).
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  images: {
    // Self-hosted, pre-optimized AVIFs. Instead of next/image's runtime optimizer (which
    // re-transcodes on every cold request — slow for AVIF sources), we pre-generate
    // responsive widths at build time (scripts/generate-image-variants.mjs) and map each
    // requested width to a static variant via a custom loader. Device-sized delivery with
    // zero runtime transcode and no Vercel Image Optimization usage. These width buckets
    // must stay aligned with the RUNGS in src/lib/imageVariants.ts (loader logic).
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    // 384 is included so small responsive cards (tiles render ~31–42vw) can select the
    // smallest rung; 1280 maps to the -1280 rung (encoded withoutEnlargement, so it's
    // capped at the native width). Aligned with RUNGS [384, 640, 960, 1280] in
    // src/lib/imageVariants.ts.
    deviceSizes: [384, 640, 960, 1280],
    // Only 256 here (384 lives in deviceSizes) so responsive srcsets don't list a
    // duplicate 384w entry; both 256w and 384w map to the -384 rung in the loader.
    imageSizes: [256],
  },
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
        source: '/services/google-ads',
        destination: '/services/digital-marketing/google-ads',
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
  async headers() {
    return [
      {
        // Baseline security headers on every response. Deliberately the "cheap"
        // set — no Content-Security-Policy yet, since a real one needs a nonce
        // strategy for GTM/GA/Clarity + the inline JSON-LD blocks (tracked as a
        // follow-up). Permissions-Policy only locks down features the site never
        // uses; it intentionally leaves autoplay/encrypted-media/gyroscope alone
        // so the YouTube/Instagram embeds keep working. HSTS omits `preload`
        // (that's a hard-to-reverse commitment) — add it once the policy sticks.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
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
      {
        // The /admin dashboard's own web app manifest (see public/dashboard.webmanifest).
        // It lives at the root rather than under /admin because the manifest link
        // is fetched WITHOUT credentials in production — Next only sets
        // crossOrigin="use-credentials" on Vercel preview — so a /admin/* URL
        // would be bounced to the login page by src/proxy.ts and the install
        // would fail. Pinning the MIME type here for the same reason the sitemap
        // stylesheet does: some hosts default an unknown extension to
        // octet-stream.
        source: '/dashboard.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
      {
        // Stable, content-named AVIFs under public/images — cache hard so repeat
        // visits serve from disk with no revalidation round-trip. (public/ files
        // don't get the immutable long-cache that hashed /_next/static assets do.)
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Belt-and-braces beside the page's own robots metadata: the header
        // rides every /share response (HTML or not), so a future share surface
        // that forgets generateMetadata still can't be indexed. robots.txt
        // stays open here on purpose — a crawler must fetch to see noindex.
        source: '/share/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Hashed build artifacts (JS/CSS/media chunks) are not indexable pages.
        // Google still fetches them to render; this just states they aren't
        // content. Scoped to /_next/static only — /images stay indexable for
        // Google Images.
        //
        // Note on what this header does NOT do: it was added (2026-07-07) to
        // clear these URLs out of "Crawled - currently not indexed", and it
        // did not — six weeks on, chunks crawled after it shipped were still
        // filed there. What actually filled that report was Vercel Skew
        // Protection appending ?dpl=<deploymentId> to every asset, so each
        // deploy minted a fresh batch of URLs that Google then kept forever
        // (596 chunk URLs across 45 deploy IDs by 2026-08-23). Skew Protection
        // is now off, so asset URLs are stable content-hashed paths again and
        // the set stops growing. Don't re-enable it without expecting that
        // report to climb again, and never reach for a robots.txt Disallow
        // here — blocking JS breaks Google's ability to render the site.
        source: '/_next/static/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
};

export default nextConfig;
