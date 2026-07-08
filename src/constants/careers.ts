/**
 * Job openings — the single source of truth shared by the careers listings
 * (`Careers.tsx`, server-rendered) and the contact form's "Join the team" tab
 * (role select options, passed as slim props from `app/contact/page.tsx`).
 *
 * Each opening carries a stable `slug`: it's the deep-link payload in
 * `/contact?tab=careers&role=<slug>` and the value stored on submissions, so
 * renaming a title must NOT change its slug (bookmarked links + old rows keep
 * resolving). Keep this a leaf data module — server components only.
 */

export interface JobOpening {
  slug: string;
  title: string;
  location: string;
  type: string;
  level: string;
  fit: string;
  status: string;
  availability: 'active' | 'expired';
}

export interface JobCategoryGroup {
  category: string;
  openings: JobOpening[];
}

/** Fallback option on the careers tab for applicants without a listed role. */
export const GENERAL_APPLICATION = {
  slug: 'general-application',
  title: 'General application',
} as const;

export const JOBS: JobCategoryGroup[] = [
  {
    category: 'Social Media',
    openings: [
      {
        slug: 'social-media-manager',
        title: 'Social Media Manager',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Content operators with strong planning and reporting instincts.',
        status: 'Immediate start',
        availability: 'active',
      },
      {
        slug: 'social-content-creator',
        title: 'Social Content Creator',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Fast-moving creators who understand trends and short-form pacing.',
        status: 'Flexible hours',
        availability: 'active',
      },
      {
        slug: 'social-media-strategist',
        title: 'Social Media Strategist',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Strategic thinkers who can connect creative direction to growth KPIs.',
        status: 'Contract-based',
        availability: 'active',
      },
    ],
  },
  {
    category: 'Performance Marketing',
    openings: [
      {
        slug: 'performance-marketer',
        title: 'Performance Marketer',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Channel owners who are comfortable testing, iterating, and scaling.',
        status: 'Immediate start',
        availability: 'active',
      },
      {
        slug: 'paid-social-specialist',
        title: 'Paid Social Specialist (Meta/TikTok)',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Media buyers with a strong creative-testing mindset.',
        status: 'Contract-based',
        availability: 'active',
      },
      {
        slug: 'google-ads-ppc-specialist',
        title: 'Google Ads / PPC Specialist',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Search specialists who can own performance and intent-driven traffic.',
        status: 'Contract-based',
        availability: 'active',
      },
      {
        slug: 'cro-specialist',
        title: 'CRO Specialist (Landing Pages + Testing)',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Optimization-focused marketers who enjoy experiments and funnel analysis.',
        status: 'Flexible hours',
        availability: 'active',
      },
    ],
  },
  {
    category: 'Design',
    openings: [
      {
        slug: 'web-designer',
        title: 'Web Designer',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Designers who care about modern web aesthetics and conversion.',
        status: 'Immediate start',
        availability: 'active',
      },
      {
        slug: 'motion-designer',
        title: 'Motion Designer',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Animators who can turn static ideas into polished motion assets.',
        status: 'Flexible hours',
        availability: 'active',
      },
      {
        slug: 'graphic-designer',
        title: 'Graphic Designer (Campaigns + Assets)',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Mid-level',
        fit: 'Visual designers who thrive on campaign systems and multi-format assets.',
        status: 'Contract-based',
        availability: 'active',
      },
    ],
  },
  {
    category: 'Strategy & Operations',
    openings: [
      {
        slug: 'brand-strategist',
        title: 'Brand Strategist',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Strategists who can define positioning, messaging, and creative direction.',
        status: 'Contract-based',
        availability: 'active',
      },
      {
        slug: 'creative-project-manager',
        title: 'Creative Project Manager',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Organized operators who can keep creative projects moving without slowing teams down.',
        status: 'Flexible hours',
        availability: 'active',
      },
      {
        slug: 'account-manager',
        title: 'Account Manager',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Client-facing operators who can manage expectations, timelines, and deliverables clearly.',
        status: 'Immediate start',
        availability: 'active',
      },
    ],
  },
  {
    category: 'SEO',
    openings: [
      {
        slug: 'seo-specialist',
        title: 'SEO Specialist',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Operators who can combine technical thinking with practical growth work.',
        status: 'Flexible hours',
        availability: 'active',
      },
    ],
  },
  {
    category: 'Video Production',
    openings: [
      {
        slug: 'videographer',
        title: 'Videographer',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Shoot-first creatives who know how to capture clean, brand-ready footage.',
        status: 'Project-based',
        availability: 'active',
      },
      {
        slug: 'video-editor',
        title: 'Video Editor',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Editors who can work quickly without sacrificing pacing or polish.',
        status: 'Flexible hours',
        availability: 'expired',
      },
    ],
  },
  {
    category: 'Web / Dev',
    openings: [
      {
        slug: 'wordpress-developer',
        title: 'Wordpress Developer',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Mid-level',
        fit: 'Developers who can ship stable, performant marketing sites.',
        status: 'Contract-based',
        availability: 'expired',
      },
      {
        slug: 'frontend-developer-nextjs',
        title: 'Frontend Developer (Next.js)',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Frontend engineers who care about performance, motion, and clean implementation.',
        status: 'Immediate start',
        availability: 'active',
      },
    ],
  },
];

/**
 * Slug → human title for a career opening (or the general-application
 * fallback), mirroring the contact action's authoritative ROLE_TITLES map. Used
 * by the admin inbox to label the `role` slug stored on an application. Covers
 * expired openings too (an old row may carry a since-delisted role); falls back
 * to the raw slug for anything unknown. Server-only consumers.
 */
export function roleTitle(slug: string): string {
  for (const group of JOBS) {
    for (const opening of group.openings) {
      if (opening.slug === slug) return opening.title;
    }
  }
  if (slug === GENERAL_APPLICATION.slug) return GENERAL_APPLICATION.title;
  return slug;
}
