/**
 * Job openings — the single source of truth shared by the careers listings
 * (`Careers.tsx`, server-rendered) and the contact form's "Join the team" tab
 * (role select options, passed as slim props from `app/contact/page.tsx`).
 *
 * Each opening carries a stable `slug`: it's the deep-link payload in
 * `/contact?tab=careers&role=<slug>` and the value stored on submissions, so
 * renaming a title must NOT change its slug (bookmarked links + old rows keep
 * resolving). Keep this a leaf data module — server components only.
 *
 * `availability` is the only switch that opens or closes a role: 'expired'
 * renders the listing as "Position filled" (kept visible, not deleted) and
 * drops it from the contact form's role select. As of 2026-08 the only roles
 * accepting applications are SEO Specialist, WordPress Developer, Video
 * Editor, and Videographer.
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
  /**
   * ISO date the role opened for applications — required by Google's
   * JobPosting schema, so set it whenever a role flips to 'active'.
   * (Filled/expired roles don't need one.)
   */
  datePosted?: string;
  /**
   * ISO date the posting stops being valid. The careers page drops a role
   * from its JobPosting JSON-LD once this passes (stale-open postings are a
   * Google policy violation) — extend it when a search genuinely continues.
   */
  validThrough?: string;
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
        availability: 'expired',
      },
      {
        slug: 'social-content-creator',
        title: 'Social Content Creator',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Fast-moving creators who understand trends and short-form pacing.',
        status: 'Flexible hours',
        availability: 'expired',
      },
      {
        slug: 'social-media-strategist',
        title: 'Social Media Strategist',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Strategic thinkers who can connect creative direction to growth KPIs.',
        status: 'Contract-based',
        availability: 'expired',
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
        availability: 'expired',
      },
      {
        slug: 'paid-social-specialist',
        title: 'Paid Social Specialist (Meta/TikTok)',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Media buyers with a strong creative-testing mindset.',
        status: 'Contract-based',
        availability: 'expired',
      },
      {
        slug: 'google-ads-ppc-specialist',
        title: 'Google Ads / PPC Specialist',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Search specialists who can own performance and intent-driven traffic.',
        status: 'Contract-based',
        availability: 'expired',
      },
      {
        slug: 'cro-specialist',
        title: 'CRO Specialist (Landing Pages + Testing)',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Optimization-focused marketers who enjoy experiments and funnel analysis.',
        status: 'Flexible hours',
        availability: 'expired',
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
        availability: 'expired',
      },
      {
        slug: 'motion-designer',
        title: 'Motion Designer',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Animators who can turn static ideas into polished motion assets.',
        status: 'Flexible hours',
        availability: 'expired',
      },
      {
        slug: 'graphic-designer',
        title: 'Graphic Designer (Campaigns + Assets)',
        location: 'Remote',
        type: 'Subcontract',
        level: 'Mid-level',
        fit: 'Visual designers who thrive on campaign systems and multi-format assets.',
        status: 'Contract-based',
        availability: 'expired',
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
        availability: 'expired',
      },
      {
        slug: 'creative-project-manager',
        title: 'Creative Project Manager',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Organized operators who can keep creative projects moving without slowing teams down.',
        status: 'Flexible hours',
        availability: 'expired',
      },
      {
        slug: 'account-manager',
        title: 'Account Manager',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Client-facing operators who can manage expectations, timelines, and deliverables clearly.',
        status: 'Immediate start',
        availability: 'expired',
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
        datePosted: '2026-08-11',
        validThrough: '2026-11-15',
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
        datePosted: '2026-08-09',
        validThrough: '2026-11-15',
      },
      {
        slug: 'video-editor',
        title: 'Video Editor',
        location: 'Remote',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Editors who can work quickly without sacrificing pacing or polish.',
        status: 'Flexible hours',
        availability: 'active',
        datePosted: '2026-08-09',
        validThrough: '2026-11-15',
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
        availability: 'active',
        datePosted: '2026-08-09',
        validThrough: '2026-11-15',
      },
      {
        slug: 'frontend-developer-nextjs',
        title: 'Frontend Developer (Next.js)',
        location: 'Remote',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Frontend engineers who care about performance, motion, and clean implementation.',
        status: 'Immediate start',
        availability: 'expired',
      },
    ],
  },
];

/**
 * Title → one-line summary + tag chips for each opening's card. Lives here
 * (not in Careers.tsx) so the careers page can compose JobPosting JSON-LD
 * descriptions from the same copy the card shows. Keyed by `title` because
 * that's how the card component always looked entries up.
 */
export const JOB_DETAILS: Record<string, { summary: string; tags: string[] }> =
  {
    // Social Media
    'Social Media Manager': {
      summary:
        'Own the content calendar and publishing across key channels; report weekly performance.',
      tags: ['Content', 'Scheduling', 'Reporting'],
    },
    'Social Content Creator': {
      summary:
        'Create fast, high-volume short-form concepts; shoot/edit lo-fi content and iterate.',
      tags: ['Short-form', 'Creator', 'Trends'],
    },
    'Social Media Strategist': {
      summary:
        'Define channel strategy, creative angles, and measurement framework for growth.',
      tags: ['Strategy', 'Creative', 'KPIs'],
    },

    // Performance Marketing
    'Performance Marketer': {
      summary:
        'Run paid acquisition, test creatives, and optimize CAC/ROAS across channels.',
      tags: ['Paid Media', 'Testing', 'Optimization'],
    },
    'Paid Social Specialist (Meta/TikTok)': {
      summary:
        'Own Meta/TikTok campaigns: audiences, budgets, creative testing, and scaling.',
      tags: ['Meta', 'TikTok', 'ROAS'],
    },
    'Google Ads / PPC Specialist': {
      summary:
        'Manage Search/PMax/YouTube, keyword strategy, and landing page alignment.',
      tags: ['Google Ads', 'Search', 'PMax'],
    },
    'CRO Specialist (Landing Pages + Testing)': {
      summary:
        'Improve landing pages and funnels with testing, analysis, and conversion best practices.',
      tags: ['CRO', 'A/B Testing', 'Funnels'],
    },

    // Design
    'Web Designer': {
      summary:
        'Design responsive marketing sites and landing pages; hand off clean specs for build.',
      tags: ['Web', 'Landing Pages', 'Figma'],
    },
    'Motion Designer': {
      summary:
        'Create motion systems and animated assets for ads, social, and brand storytelling.',
      tags: ['After Effects', 'Animation', 'Ads'],
    },
    'Graphic Designer (Campaigns + Assets)': {
      summary:
        'Design campaign assets and social kits across formats with consistent brand quality.',
      tags: ['Campaigns', 'Assets', 'Design'],
    },

    // Strategy & Operations
    'Brand Strategist': {
      summary:
        'Shape brand positioning, messaging systems, audience insights, and campaign direction.',
      tags: ['Strategy', 'Positioning', 'Messaging'],
    },
    'Creative Project Manager': {
      summary:
        'Coordinate timelines, briefs, feedback cycles, and delivery across creative and marketing projects.',
      tags: ['Project Management', 'Briefs', 'Delivery'],
    },
    'Account Manager': {
      summary:
        'Manage client communication, expectations, project updates, and ongoing account health.',
      tags: ['Client Success', 'Communication', 'Accounts'],
    },

    // SEO
    'SEO Specialist': {
      summary:
        'Own on-page improvements, audits, and performance lift across core pages.',
      tags: ['On-page', 'Audits', 'GSC'],
    },

    // Video Production
    Videographer: {
      summary:
        'Shoot brand and social content with strong composition, lighting, and pacing.',
      tags: ['Shooting', 'Lighting', 'Story'],
    },
    'Video Editor': {
      summary:
        'Edit performance-driven short/long-form; produce variants and iterate quickly.',
      tags: ['Editing', 'Short-form', 'Variants'],
    },

    // Web / Dev
    'Wordpress Developer': {
      summary:
        'Build and maintain WordPress sites: themes, templates, performance, and integrations.',
      tags: ['WordPress', 'Themes', 'Performance'],
    },
    'Frontend Developer (Next.js)': {
      summary:
        'Implement high-performance sites with clean components, animations, and integrations.',
      tags: ['Next.js', 'React', 'Performance'],
    },
  };

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
