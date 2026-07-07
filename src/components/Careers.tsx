import { cn } from '@/lib/utils';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import {
  LuArrowUpRight as ArrowUpRight,
  LuChartColumn as BarChart2,
  LuBriefcase as Briefcase,
  LuClock as Clock,
  LuCode as Code,
  LuPenLine as Edit3,
  LuGlobe as Globe,
  LuInstagram as Instagram,
  LuPanelsTopLeft as Layout,
  LuMapPin as MapPin,
  LuSearch as Search,
  LuVideo as Video,
  LuZap as Zap,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import Link from 'next/link';

import CareersRoles, {
  type CareersRoleGroup,
} from '@/components/CareersRoles';
import { JOBS } from '@/constants/careers';

// Server component: the listings data and the card markup render on the server
// so none of this copy ships as JavaScript (it used to ride the shared client
// chunk into every route). Only the category filter is interactive — it lives
// in the CareersRoles client island, which receives each group below as a
// pre-rendered ReactNode and simply chooses which ones to mount.
//
// The openings data lives in src/constants/careers.ts so the contact form's
// "Join the team" tab can share it (role select options + deep-link slugs).

const CATEGORY_ICONS: Record<string, IconType> = {
  'Social Media': Instagram,
  'Performance Marketing': BarChart2,
  Design: Layout,
  'Strategy & Operations': Briefcase,
  SEO: Search,
  'Video Production': Video,
  'Content & Copy': Edit3,
  'Creative Ops': Briefcase,
  'Web / Dev': Code,
};

// Must stay in sync with the `options` list in CareersRoles.tsx — it's the
// join key between a rendered group and its select entry.
const CATEGORY_VALUE_MAP: Record<string, string> = {
  'Social Media': 'social_media',
  'Performance Marketing': 'performance_marketing',
  Design: 'design',
  'Strategy & Operations': 'strategy_and_operations',
  SEO: 'seo',
  'Video Production': 'video_production',
  'Web / Dev': 'web_and_dev',
};

const JOB_DETAILS: Record<string, { summary: string; tags: string[] }> = {
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

interface CareersProps {
  className?: string;
}

const Careers = ({ className }: CareersProps) => {
  // One fully server-rendered node per category; the client island mounts the
  // selected ones. Markup unchanged from the previous client-side renderJobs().
  const roleGroups: CareersRoleGroup[] = JOBS.map((job, i) => ({
    value: CATEGORY_VALUE_MAP[job.category],
    node: (
      <div
        key={`job-${job.category}-${i}`}
        className="flex w-full flex-col justify-start gap-5 tracking-tighter"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl leading-none font-semibold tracking-tighter">
            {job.category}
          </h2>
          <span className="rounded-full bg-foreground/5 px-3 py-1 text-sm text-foreground/70">
            {job.openings.length} role{job.openings.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {job.openings.map((opening) => {
            const details = JOB_DETAILS[opening.title];
            const Icon = CATEGORY_ICONS[job.category] ?? Briefcase;
            const isActive = opening.availability === 'active';
            const availabilityLabel = isActive ? 'Available' : 'Position filled';

            return (
              <Link
                key={`job-${opening.title}`}
                href={`/contact?tab=careers&role=${opening.slug}`}
                className={cn(
                  'group block rounded-xl border bg-background p-5 shadow-sm transition-all focus-visible:outline-none cursor-pointer',
                  isActive
                    ? 'border-foreground/10 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-foreground/3 hover:shadow-md'
                    : 'pointer-events-none border-foreground/5 opacity-60 grayscale',
                )}
                aria-label={`Apply for ${opening.title} at Perseus Creative Studio`}
              >
                <div className="mb-1 flex items-start justify-between gap-3">
                  <h3 className="text-lg leading-normal font-semibold">
                    {opening.title}
                  </h3>
                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-6" />
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-foreground/5 text-foreground/60',
                    )}
                  >
                    {availabilityLabel}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/70">
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {opening.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {opening.type}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                    <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                    {opening.level}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    {opening.status}
                  </span>
                </div>

                {details?.summary && (
                  <p className="mt-4 text-sm leading-relaxed text-black/70">
                    {details.summary}
                  </p>
                )}

                <p className="mt-3 text-sm text-black/55">
                  <span className="font-medium text-black/70">Best for:</span>{' '}
                  {opening.fit}
                </p>

                {!!details?.tags?.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {details.tags.map((tag) => (
                      <span
                        key={`${opening.title}-${tag}`}
                        className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-foreground/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className={cn(
                    'mt-5 inline-flex items-center gap-2 text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-foreground/50',
                  )}
                >
                  {isActive ? 'Apply Now' : 'Position Filled'}
                  {isActive && (
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    ),
  }));

  return (
    <section className={cn('pt-28 sm:pt-32 pb-16 bg-background-contrast', className)}>
      <Container>
        <div className="flex w-full flex-col gap-14">
          <Heading
            titleTag="h1"
            seperatorTitle="Careers"
            eyebrowRight="Open Roles"
            title="Join our creative team"
            titleAccent="Remote roles for builders, strategists, and creators."
            description="We’re hiring remote talent across social media, performance marketing, design, strategy and operations, SEO, video production, and web development. Explore current openings, find the role that fits your strengths, and apply through our contact page."
            containerStyle="px-0 md:px-0 w-full max-w-none"
            titleStyle="max-w-4xl text-4xl md:text-5xl"
            descStyle="max-w-3xl"
          />
          <div className="flex max-w-4xl flex-col gap-6">
            <div className="flex flex-wrap gap-3 text-sm text-foreground/75">
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Globe className="h-4 w-4" aria-hidden="true" />
                Remote-first team
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Flexible engagement types
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Zap className="h-4 w-4" aria-hidden="true" />
                High-impact client work
              </span>
            </div>
          </div>
          <CareersRoles groups={roleGroups} />
        </div>
      </Container>
    </section>
  );
};

export { Careers };
