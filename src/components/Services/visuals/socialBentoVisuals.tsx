import type { ComponentType } from 'react';

import { Img } from '@/components';
import { cn } from '@/lib/utils';

/**
 * Cell-filling artifact visuals for the Social category bento. These are the
 * same monochrome motifs the /services overview teaser uses in
 * `ServicesSocial.tsx` — a platform wall, a weekly content plan, a creator
 * roster, and a reporting board — distilled to fill a bento cell instead of the
 * teaser's fixed landscape card. They carry no internal heading (the card's
 * footer names the service); they're pure media. Every colour is a theme token,
 * so each reads in light and dark.
 *
 * `ServiceBentoCard` looks one up by the `visual` key on a `ServiceSummary` and
 * frames it; nothing here renders its own frame.
 */

// The platforms we actually run for clients — full-colour marks, self-hosted.
// X + Threads are monochrome black, so they invert to white on the dark theme.
const PLATFORMS: { src: string; alt: string; invert?: boolean }[] = [
  { src: '/images/shared/logos/shared-logos-instagram.avif', alt: 'Instagram' },
  { src: '/images/shared/logos/shared-logos-facebook.avif', alt: 'Facebook' },
  { src: '/images/shared/logos/shared-logos-tiktok.avif', alt: 'TikTok' },
  { src: '/images/shared/logos/shared-logos-youtube.avif', alt: 'YouTube' },
  { src: '/images/shared/logos/shared-logos-linkedin.avif', alt: 'LinkedIn' },
  { src: '/images/shared/logos/shared-logos-x.avif', alt: 'X', invert: true },
  { src: '/images/shared/logos/shared-logos-pinterest.avif', alt: 'Pinterest' },
  {
    src: '/images/shared/logos/shared-logos-threads.avif',
    alt: 'Threads',
    invert: true,
  },
];

const WEEK = [
  { d: 'M', posts: 1 },
  { d: 'T', posts: 2 },
  { d: 'W', posts: 1 },
  { d: 'T', posts: 0 },
  { d: 'F', posts: 2 },
  { d: 'S', posts: 1 },
  { d: 'S', posts: 1 },
] as const;

const ROSTER = ['AR', 'MK', 'JL', 'SD', 'TN'] as const;

const BARS = [34, 46, 40, 56, 50, 64, 58, 78, 72, 94] as const;

// The section's dashed baseline, mirrored from the overview treatment so the
// artifacts share a visual signature across /services and /services/social.
const DashedBaseline = ({ className }: { className?: string }) => (
  <div className={cn('h-px w-full text-muted-foreground', className)}>
    <div className="h-px w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)] mask-[linear-gradient(90deg,transparent,black_25%,black_75%,transparent)]" />
  </div>
);

// One up-and-to-the-right metric for the reporting board.
const Stat = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) => (
  <div className="leading-none">
    <span className="text-[10px] tracking-tight text-muted-foreground">
      {label}
    </span>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="font-semibold text-base tracking-tighter sm:text-lg">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{delta}</span>
    </div>
  </div>
);

// A stacked value/label metric for the creator roster.
const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 leading-none">
    <span className="font-semibold text-sm tracking-tighter text-foreground">
      {value}
    </span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

// Social Media Management — the platform wall. A 4×2 grid of full-colour marks
// on neutral chips that fills the featured cell like an app-icon dock.
const PlatformsVisual = () => (
  <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-2 sm:gap-2.5">
    {PLATFORMS.map((p) => (
      <div
        key={p.alt}
        className="grid place-items-center rounded-xl bg-white ring-1 ring-border"
      >
        <Img
          src={p.src}
          alt={p.alt}
          width={120}
          height={120}
          className={cn(
            'size-7 object-contain sm:size-9',
            p.invert && 'dark:invert',
          )}
        />
      </div>
    ))}
  </div>
);

// Social Strategy — a weekly content plan. A 7-day grid of scheduled-post chips
// (empty day = a dashed slot) on the dashed baseline.
const StrategyPlanVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-3">
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK.map((day, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex h-10 flex-col gap-1">
            {day.posts === 0 ? (
              <span className="h-3 rounded-sm border border-dashed border-border" />
            ) : (
              Array.from({ length: day.posts }).map((_, k) => (
                <span
                  key={k}
                  className={cn(
                    'h-3 rounded-sm',
                    k % 2 === 0 ? 'bg-foreground' : 'bg-foreground/30',
                  )}
                />
              ))
            )}
          </div>
          <span className="text-center text-[10px] text-muted-foreground">
            {day.d}
          </span>
        </div>
      ))}
    </div>
    <DashedBaseline />
  </div>
);

// Influencer / Creator Collaborations — a creator roster. An overlapping avatar
// stack (initials) + program metrics; sized for the wide cell.
const RosterVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-4">
    <div className="flex items-center gap-2.5">
      <div className="flex">
        {ROSTER.map((initials, i) => (
          <span
            key={i}
            className="-ml-2 grid size-8 place-items-center rounded-full bg-background text-[10px] font-semibold tracking-tight text-foreground ring-1 ring-border first:ml-0 sm:size-9"
          >
            {initials}
          </span>
        ))}
      </div>
      <span className="grid size-8 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background sm:size-9">
        +9
      </span>
    </div>
    <div className="flex items-center gap-3 sm:gap-4">
      <Metric label="Avg reach" value="148K" />
      <span className="h-6 w-px bg-border" />
      <Metric label="Briefs live" value="3" />
      <span className="h-6 w-px bg-border" />
      <Metric label="UGC assets" value="24" />
    </div>
  </div>
);

// Reporting & Insights — a reporting board. KPIs over a rising bar trend that
// closes on the dashed baseline.
const ReportingBoardVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-3.5">
    <div className="flex items-end gap-5">
      <Stat label="Reach" value="248K" delta="+32%" />
      <Stat label="Engagement" value="6.4%" delta="+1.8pt" />
    </div>
    <div>
      <div className="flex h-12 items-end gap-1 sm:h-16 sm:gap-1.5">
        {BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={cn(
              'flex-1 rounded-full',
              i === BARS.length - 1 ? 'bg-foreground' : 'bg-foreground/25',
            )}
          />
        ))}
      </div>
      <DashedBaseline className="mt-1.5" />
    </div>
  </div>
);

// Registry keyed by `${categorySlug}/${serviceSlug}` so `ServiceBentoCard` can
// resolve a card's media straight from the data it already has — no per-record
// authoring (the social services repeat across every sibling's relatedServices,
// so a data flag would have to be kept in sync in ~12 places). The category
// prefix keeps it collision-proof: only Social cards ever match, every other
// category falls through to its photo/logo treatment untouched. Merged with the
// other categories' maps in `visuals/index.ts`.
export const SOCIAL_BENTO_VISUALS: Record<string, ComponentType> = {
  'social/social-media-management': PlatformsVisual,
  'social/social-strategy': StrategyPlanVisual,
  'social/influencer-collaborations': RosterVisual,
  'social/reporting-insights': ReportingBoardVisual,
};
