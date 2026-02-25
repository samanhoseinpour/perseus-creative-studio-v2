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
  FiBarChart2,
  FiBriefcase,
  FiCode,
  FiEdit3,
  FiInstagram,
  FiLayout,
  FiSearch,
  FiVideo,
} from 'react-icons/fi';

const JOBS = [
  {
    category: 'Social Media',
    openings: [
      {
        title: 'Social Media Manager',
        location: 'Remote',
        link: '/contact',
      },
      {
        title: 'Social Content Creator',
        location: 'Remote',
        link: '/contact',
      },
      {
        title: 'Social Media Strategist',
        location: 'Remote',
        link: '/contact',
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
      },
      {
        title: 'Paid Social Specialist (Meta/TikTok)',
        location: 'Remote',
        link: '/contact',
      },
      {
        title: 'Google Ads / PPC Specialist',
        location: 'Remote',
        link: '/contact',
      },
      {
        title: 'CRO Specialist (Landing Pages + Testing)',
        location: 'Remote',
        link: '/contact',
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
      },
      {
        title: 'Motion Designer',
        location: 'Remote',
        link: '/contact',
      },

      {
        title: 'Graphic Designer (Campaigns + Assets)',
        location: 'Remote',
        link: '/contact',
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
      },
      {
        title: 'Video Editor',
        location: 'Remote',
        link: '/contact',
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
      },
      {
        title: 'Frontend Developer (Next.js)',
        location: 'Remote',
        link: '/contact',
      },
    ],
  },
];

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

  const filterJobsByCategory = (category: string) => {
    if (category === 'All Open Roles') return JOBS;
    return JOBS.filter((job) => job.category === category);
  };

  const renderJobs = () => {
    const option = options.filter((opt) => opt.value == filterValue);
    const jobs = filterJobsByCategory(option[0].label);
    return (
      <>
        {jobs.map((job, i) => (
          <div
            key={`job-${job.category}-${i}`}
            className="flex w-full flex-col justify-start gap-5 tracking-tighter"
          >
            <h2 className="text-3xl leading-none font-semibold tracking-tighter">
              {job.category}
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {job.openings.map((opening) => {
                const details = JOB_DETAILS[opening.title];
                const Icon = CATEGORY_ICONS[job.category] ?? FiBriefcase;

                return (
                  <Link
                    key={`job-${opening.title}`}
                    href={opening.link}
                    className="block rounded-xl bg-background p-5 transition-colors hover:bg-foreground/10"
                  >
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <h3 className="text-lg leading-normal font-semibold">
                        {opening.title}
                      </h3>
                      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    <h4 className="text-sm leading-normal text-black/40">
                      {opening.location}
                      <span className="mx-2">•</span>
                      Apply via Contact
                    </h4>

                    {details?.summary && (
                      <h3 className="mt-3 text-sm text-black/70">
                        {details.summary}
                      </h3>
                    )}

                    {!!details?.tags?.length && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {details.tags.map((tag) => (
                          <span
                            key={`${opening.title}-${tag}`}
                            className="rounded bg-foreground/5 px-2 py-1 text-xs text-foreground/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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
          <h1 className="text-5xl font-semibold tracking-tighter">
            <span className="text-gradient">Open</span> Positions
          </h1>
          <div className="flex flex-wrap items-center justify-start gap-5 tracking-tighter">
            <Label htmlFor="terms" className="text-md text-black/70">
              Filter:
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
          </div>
          <div className="flex flex-col gap-16">{renderJobs()}</div>
        </div>
      </Container>
    </section>
  );
};

export { Careers };
