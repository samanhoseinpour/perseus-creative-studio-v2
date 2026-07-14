import type { Metadata } from 'next';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.perseustudio.com';

// Single self-hosted placeholder. Every image slot not yet migrated to a real
// /images/... asset falls back to this (see resolveImageSrc in
// src/utils/images.ts). Point a constant at its /images/... path to "light it
// up" one at a time. The Perseus wordmark makes an unmigrated slot read as an
// obvious brand placeholder rather than masquerading as a real photo — note
// that <Img> uses object-cover, so on dark slots this black mark is faint.
export const IMAGE_PLACEHOLDER = '/images/perseus-logo-black.avif';

// Default OG/social-card + JSON-LD image (metadata needs a fully-qualified URL
// and a real raster card, not a transparent wordmark). Decoupled from
// IMAGE_PLACEHOLDER so social previews stay intact on pages without their own
// OG image.
export const OG_IMAGE = `${SITE_URL}/images/services/production/post-production/services-production-post-production.avif`;

// Self-hosted Perseus wordmark (black). Single source of truth for the logo
// path so the dark-mode invert checks and direct logo placements stay in sync.
export const PERSEUS_LOGO = '/images/perseus-logo-black.avif';

// Perseus's X (Twitter) handle for twitter:site/creator metadata. Lives here
// rather than in socials.tsx because that module drags react-icons into the
// metadata path. Keep in sync with the profile URL in src/constants/socials.tsx.
export const X_HANDLE = '@Perseustudio1';

// Perseus's Google Business Profile Place ID (public, not a secret) — used by
// getGoogleReviews() to pull the live rating + reviews. Find yours with Google's
// Place ID Finder, then paste it here or set the GOOGLE_PLACE_ID env var. Blank
// disables the Google Reviews section.
export const GOOGLE_PLACE_ID = 'ChIJO5CMIyYIPIURQ9LWsLz9uiQ';

// "Fully indexable, no preview limits" directive that SEO audits expect.
// max-image-preview:large unlocks large SERP thumbnails + Google Discover.
export const FULL_INDEX_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  'max-snippet': -1,
  'max-image-preview': 'large',
  'max-video-preview': -1,
  googleBot: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

// For pages whose index/follow is decided per-record (blog posts): keep their
// index/follow choice but attach the same preview directives.
export const robotsWithPreviewLimits = (base: {
  index: boolean;
  follow: boolean;
}): Metadata['robots'] => ({
  ...base,
  'max-snippet': -1,
  'max-image-preview': 'large',
  'max-video-preview': -1,
  googleBot: {
    ...base,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
});
