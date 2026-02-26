'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Container } from '@/app/components';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  FiArrowUpRight,
  FiBarChart2,
  FiBriefcase,
  FiClock,
  FiCode,
  FiEdit3,
  FiGlobe,
  FiInstagram,
  FiLayout,
  FiMapPin,
  FiSearch,
  FiVideo,
  FiZap,
} from 'react-icons/fi';

const JOBS = [
  {
    category: 'Social Media',
    openings: [
      {
        title: 'Social Media Manager',
        location: 'Remote',
        link: '/contact',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Content operators with strong planning and reporting instincts.',
        status: 'Immediate start',
      },
      {
        title: 'Social Content Creator',
        location: 'Remote',
        link: '/contact',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Fast-moving creators who understand trends and short-form pacing.',
        status: 'Flexible hours',
      },
      {
        title: 'Social Media Strategist',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Strategic thinkers who can connect creative direction to growth KPIs.',
        status: 'Contract-based',
      },
    ],
  },
  {
    category: 'Performance Marketing',
    openings: [
      {
        title: 'Performance Marketer',
        location: 'Remote',
        link: '/contact',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Channel owners who are comfortable testing, iterating, and scaling.',
        status: 'Immediate start',
      },
      {
        title: 'Paid Social Specialist (Meta/TikTok)',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Media buyers with a strong creative-testing mindset.',
        status: 'Contract-based',
      },
      {
        title: 'Google Ads / PPC Specialist',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Search specialists who can own performance and intent-driven traffic.',
        status: 'Contract-based',
      },
      {
        title: 'CRO Specialist (Landing Pages + Testing)',
        location: 'Remote',
        link: '/contact',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Optimization-focused marketers who enjoy experiments and funnel analysis.',
        status: 'Flexible hours',
      },
    ],
  },
  {
    category: 'Design',
    openings: [
      {
        title: 'Web Designer',
        location: 'Remote',
        link: '/contact',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Designers who care about modern web aesthetics and conversion.',
        status: 'Immediate start',
      },
      {
        title: 'Motion Designer',
        location: 'Remote',
        link: '/contact',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Animators who can turn static ideas into polished motion assets.',
        status: 'Flexible hours',
      },
      {
        title: 'Graphic Designer (Campaigns + Assets)',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Mid-level',
        fit: 'Visual designers who thrive on campaign systems and multi-format assets.',
        status: 'Contract-based',
      },
    ],
  },
  {
    category: 'SEO',
    openings: [
      {
        title: 'SEO Specialist',
        location: 'Remote',
        link: '/contact',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Operators who can combine technical thinking with practical growth work.',
        status: 'Flexible hours',
      },
    ],
  },
  {
    category: 'Video Production',
    openings: [
      {
        title: 'Videographer',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Senior',
        fit: 'Shoot-first creatives who know how to capture clean, brand-ready footage.',
        status: 'Project-based',
      },
      {
        title: 'Video Editor',
        location: 'Remote',
        link: '/contact',
        type: 'Part-time',
        level: 'Mid-level',
        fit: 'Editors who can work quickly without sacrificing pacing or polish.',
        status: 'Flexible hours',
      },
    ],
  },
  {
    category: 'Web / Dev',
    openings: [
      {
        title: 'Wordpress Developer',
        location: 'Remote',
        link: '/contact',
        type: 'Subcontract',
        level: 'Mid-level',
        fit: 'Developers who can ship stable, performant marketing sites.',
        status: 'Contract-based',
      },
      {
        title: 'Frontend Developer (Next.js)',
        location: 'Remote',
        link: '/contact',
        type: 'Full-time',
        level: 'Mid-level',
        fit: 'Frontend engineers who care about performance, motion, and clean implementation.',
        status: 'Immediate start',
      },
    ],
  },
] as const;

const options = [
  {
    label: 'All Open Roles',
    value: 'all',
  },
  {
    label: 'Social Media',
    value: 'social_media',
  },
  {
    label: 'Performance Marketing',
    value: 'performance_marketing',
  },
  {
    label: 'Design',
    value: 'design',
  },
  {
    label: 'SEO',
    value: 'seo',
  },
  {
    label: 'Video Production',
    value: 'video_production',
  },
  {
    label: 'Web / Dev',
    value: 'web_and_dev',
  },
];

const CATEGORY_ICONS: Record<string, IconType> = {
  'Social Media': FiInstagram,
  'Performance Marketing': FiBarChart2,
  Design: FiLayout,
  SEO: FiSearch,
  'Video Production': FiVideo,
  'Content & Copy': FiEdit3,
  'Creative Ops': FiBriefcase,
  'Web / Dev': FiCode,
};

const CATEGORY_VALUE_MAP: Record<string, string> = {
  'Social Media': 'social_media',
  'Performance Marketing': 'performance_marketing',
  Design: 'design',
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
  const [filterValue, setFilterValue] = useState(options[0].value);

  const filterJobsByCategory = (value: string) => {
    if (value === 'all') return JOBS;
    return JOBS.filter((job) => CATEGORY_VALUE_MAP[job.category] === value);
  };

  const renderJobs = () => {
    const jobs = filterJobsByCategory(filterValue);
    return (
      <>
        {jobs.map((job, i) => (
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
                const Icon = CATEGORY_ICONS[job.category] ?? FiBriefcase;

                return (
                  <Link
                    key={`job-${opening.title}`}
                    href={opening.link}
                    className="group block rounded-xl border border-foreground/10 bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-foreground/[0.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                    aria-label={`Apply for ${opening.title} at Perseus Creative Studio`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <h3 className="text-lg leading-normal font-semibold">
                        {opening.title}
                      </h3>
                      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-6" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/70">
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                        <FiMapPin className="h-3.5 w-3.5" />
                        {opening.location}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                        <FiClock className="h-3.5 w-3.5" />
                        {opening.type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                        <FiBriefcase className="h-3.5 w-3.5" />
                        {opening.level}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
                        <FiZap className="h-3.5 w-3.5" />
                        {opening.status}
                      </span>
                    </div>

                    {details?.summary && (
                      <p className="mt-4 text-sm leading-relaxed text-black/70">
                        {details.summary}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-black/55">
                      <span className="font-medium text-black/70">
                        Best for:
                      </span>{' '}
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

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      Apply Now
                      <FiArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <section className={cn('pt-32 pb-16 bg-background-contrast', className)}>
      <Container>
        <div className="flex w-full flex-col gap-14">
          <div className="flex max-w-4xl flex-col gap-5">
            <span className="w-fit rounded-full bg-foreground/5 px-3 py-1 text-sm text-foreground/70">
              Careers at Perseus Creative Studio
            </span>
            <h1 className="md:text-5xl text-4xl font-semibold tracking-tighter">
              Join our <span className="text-gradient">Creative Team.</span>
            </h1>
            <h2 className="max-w-3xl sub-heading">
              We’re hiring remote talent across social media, performance
              marketing, design, SEO, video production, and web development.
              Explore current openings, find the role that fits your strengths,
              and apply through our contact page.
            </h2>
            <div className="flex flex-wrap gap-3 text-sm text-foreground/75">
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <FiGlobe className="h-4 w-4" />
                Remote-first team
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <FiClock className="h-4 w-4" />
                Flexible engagement types
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <FiZap className="h-4 w-4" />
                Work on high-impact client projects
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-5 tracking-tighter">
            <Label htmlFor="terms" className="text-md text-black/70">
              Browse roles by category:
            </Label>
            <Select
              value={filterValue}
              onValueChange={(value) => setFilterValue(value)}
            >
              <SelectTrigger className="w-62.5">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-sm text-black/50">
              Choose a category to narrow the list, or view all open roles at
              once.
            </p>
          </div>
          {renderJobs().props.children?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-foreground/15 bg-background p-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tighter">
                No roles in this category right now
              </h2>
              <p className="mt-3 text-black/60">
                If you think you would be a strong fit for Perseus Creative
                Studio, reach out through the contact page anyway.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-16">{renderJobs()}</div>
        </div>
      </Container>
    </section>
  );
};

export { Careers };
