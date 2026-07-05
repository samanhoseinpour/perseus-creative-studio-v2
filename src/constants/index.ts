import type { Metadata } from 'next';
import {
  LuLayers3 as IconVersions,
  LuSparkles as IconAi,
  LuPanelsTopLeft as IconComponents,
  LuSunMedium as IconSolarElectricity,
  LuCircleDollarSign as IconClockDollar,
  LuTrophy as IconLaurelWreath,
} from 'react-icons/lu';

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

// One client logo in the Partners roster. `disc` is the opt-in coin face for
// the few transparent wordmarks that vanish on one theme (see Partners.tsx);
export const whyPerseusServices = [
  {
    id: 1,
    name: 'A True Partner, Not Just a Service',
    description:
      'We work closely with our clients and treat every project like a partnership. We take the time to understand your goals and support you throughout the process, not just at delivery.',
    icon: IconVersions,
  },
  {
    id: 2,
    name: 'Proven Experience Across Industries and Cities',
    description:
      'We’ve worked with different industries and across multiple cities, which helps us adapt quickly and deliver confidently wherever the project is.',
    icon: IconAi,
  },
  {
    id: 3,
    name: 'High-Quality Work, Every Time',
    description:
      'Quality matters to us. From visuals to execution, we hold a high standard on every project, no matter the size.',
    icon: IconComponents,
  },
  {
    id: 4,
    name: 'Clear Communication',
    description:
      'We keep communication simple and direct. You’ll always know what’s happening, what’s next, and where things stand.',
    icon: IconSolarElectricity,
  },
  {
    id: 5,
    name: 'Attention to Detail',
    description:
      'The small details make a big difference. We pay close attention to every part of the work to ensure it’s clean, consistent, and well thought out.',
    icon: IconClockDollar,
  },
  {
    id: 6,
    name: 'Built for Long-Term Growth',
    description:
      'Our work is designed to last. We focus on building strong foundations that support your brand as it grows over time.',
    icon: IconLaurelWreath,
  },
];
