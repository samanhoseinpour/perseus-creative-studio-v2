import { cn } from '@/lib/utils';
import { Button, Container, Heading, Img } from '@/components';
import { CATEGORIES } from '@/constants/services';
import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuCalendarCheck as CalendarCheck,
} from 'react-icons/lu';

const socialCategory = CATEGORIES.social;

// Service set + titles mirror CATEGORIES.social (kept in sync with
// /services/social): Social Strategy, Social Media Management, Influencer /
// Creator Collaborations, Reporting & Insights. The per-item imagery, logo
// grids, and layout are this section's own treatment.
const topItems = [
  {
    slug: 'social-strategy',
    title: 'Social Strategy.',
    description:
      'We define what to post, who it’s for, and how it supports your business goals, so your content stays consistent and purposeful.',
    visual: 'strategy',
    images: [],
  },
  {
    slug: 'social-media-management',
    title: 'Social Media Management.',
    description:
      'We create and publish posts, write captions, manage hashtags, and respond to comments/DMs, so your accounts stay active and professional.',
    // The platforms we actually run for clients — full-colour marks, self-hosted.
    // X + Threads are monochrome black, so they carry `invert` (→ white on dark).
    images: [
      { src: '/images/shared/logos/shared-logos-instagram.avif', alt: 'Instagram' },
      { src: '/images/shared/logos/shared-logos-facebook.avif', alt: 'Facebook' },
      { src: '/images/shared/logos/shared-logos-tiktok.avif', alt: 'TikTok' },
      { src: '/images/shared/logos/shared-logos-youtube.avif', alt: 'YouTube' },
      { src: '/images/shared/logos/shared-logos-linkedin.avif', alt: 'LinkedIn' },
      {
        src: '/images/shared/logos/shared-logos-x.avif',
        alt: 'X',
        invert: true,
      },
      { src: '/images/shared/logos/shared-logos-pinterest.avif', alt: 'Pinterest' },
      {
        src: '/images/shared/logos/shared-logos-threads.avif',
        alt: 'Threads',
        invert: true,
      },
    ],
  },
];

const bottomItems = [
  {
    slug: 'influencer-collaborations',
    title: 'Influencer / Creator Collaborations.',
    description:
      'We source creators, write briefs, manage deliverables, and repurpose the content—so you get authentic assets without the overhead.',
    visual: 'influencer',
    images: [],
  },
  {
    slug: 'reporting-insights',
    title: 'Reporting & Insights.',
    description:
      'Monthly reporting on reach, engagement, and conversions—with clear read-outs on what worked and what we’ll do next.',
    visual: 'reporting',
    images: [],
  },
];

interface ServicesSocialProps {
  className?: string;
}

function ServicesSocial({ className }: ServicesSocialProps) {
  return (
    <section className={cn('py-16', className)}>
      <Container>
        <Heading
          titleTag="h2"
          seperatorTitle="Social Media Management"
          eyebrowRight="Social Growth"
          title="Social Media Management"
          titleAccent="Built to turn content into qualified attention."
          description="We plan, create, and manage your social so it drives real business results, more calls, bookings, and qualified leads."
          containerStyle="px-0 md:px-0 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />

        <div className="mt-10">
          <DashedLine orientation="horizontal" />

          {/* Top Features Grid - 2 items */}
          <div className="relative grid md:grid-cols-2 md:grid-rows-[auto_auto_auto]">
            {topItems.map((item, i) => (
              <Item key={i} item={item} isLeft={i === 0} />
            ))}
          </div>

          <DashedLine orientation="horizontal" />

          {/* Bottom Features Grid - 2 items */}
          <div className="relative grid md:grid-cols-2 md:grid-rows-[auto_auto_auto]">
            {bottomItems.map((item, i) => (
              <Item key={i} item={item} isLeft={i === 0} />
            ))}
          </div>

          <DashedLine orientation="horizontal" />
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck}>
              Plan Your Social Growth
            </Button>
          </Link>
          <Link href={`/services/${socialCategory.slug}`}>
            <Button variant="secondary" icon={ArrowUpRight}>
              Explore {socialCategory.title}
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
}

interface ItemProps {
  item: {
    slug: string;
    title: string;
    description: string;
    images: {
      src: string;
      alt: string;
      className?: string;
      invert?: boolean;
    }[];
    visual?: string;
  };
  isLeft?: boolean;
}

const Item = ({ item, isLeft }: ItemProps) => {
  return (
    <div className="relative flex flex-col px-0 py-6 md:row-span-3 md:grid md:grid-rows-subgrid md:px-6 md:py-8">
      <div className="title-container mb-5 max-w-md leading-none tracking-tighter md:mb-6">
        <h3 className="inline font-semibold text-md">{item.title} </h3>
        <span className="font-medium text-sm"> {item.description}</span>
      </div>

      {item.visual === 'reporting' ? (
        <ReportingVisual />
      ) : item.visual === 'strategy' ? (
        <StrategyVisual />
      ) : item.visual === 'influencer' ? (
        <InfluencerVisual />
      ) : item.images.length > 4 ? (
        <div className="image-container w-full">
          <div className="flex flex-col gap-4 lg:gap-5">
            {/* First row — hugs the right edge */}
            <div className="flex justify-end gap-4 lg:gap-5">
              {item.images.slice(0, 4).map((image, j) => (
                <LogoTile key={j} image={image} />
              ))}
            </div>
            {/* Second row — hugs the left edge (woven offset) */}
            <div className="flex justify-start gap-4 lg:gap-5">
              {item.images.slice(4).map((image, j) => (
                <LogoTile key={j} image={image} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="image-container grid grid-cols-1 gap-4">
          {item.images.map((image, j) => (
            <Img
              width={300}
              height={300}
              key={j}
              src={image.src}
              alt={image.alt}
              className={cn(
                'w-full overflow-hidden object-cover',
                image.invert && 'dark:invert',
                image.className,
              )}
            />
          ))}
        </div>
      )}

      <Link
        href={`/services/social/${item.slug}`}
        className="relative z-20 mt-6 block w-fit"
      >
        <Button variant="secondary" size="small" icon={ArrowUpRight}>
          Explore {item.title.replace(/\.$/, '')}
        </Button>
      </Link>

      {isLeft && (
        <>
          <DashedLine
            orientation="vertical"
            className="absolute top-0 right-0 max-md:hidden"
          />
          <DashedLine
            orientation="horizontal"
            className="absolute inset-x-0 bottom-0 md:hidden"
          />
        </>
      )}
    </div>
  );
};

// A single platform-logo tile in the Social Media Management cell. Full-colour
// brand marks on a neutral chip; X + Threads invert to white on dark.
const LogoTile = ({
  image,
}: {
  image: { src: string; alt: string; invert?: boolean };
}) => (
  <div className="grid aspect-square size-16 place-items-center rounded-xl bg-background-contrast/40 lg:size-20">
    <Img
      width={300}
      height={300}
      src={image.src}
      alt={image.alt}
      className={cn(
        'size-9 object-contain lg:size-12',
        image.invert && 'dark:invert',
      )}
    />
  </div>
);

interface DashedLineProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const DashedLine = ({
  orientation = 'horizontal',
  className,
}: DashedLineProps) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'relative text-muted-foreground',
        isHorizontal ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    >
      <div
        className={cn(
          isHorizontal
            ? [
                'h-px w-full',
                'bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)]',
                'mask-[linear-gradient(90deg,transparent,black_25%,black_75%,transparent)]',
              ]
            : [
                'h-full w-px',
                'bg-[repeating-linear-gradient(180deg,transparent,transparent_4px,currentColor_4px,currentColor_8px)]',
                'mask-[linear-gradient(180deg,transparent,black_25%,black_75%,transparent)]',
              ],
        )}
      />
    </div>
  );
};

// A single up-and-to-the-right metric, used in the Reporting visual.
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
      <span className="flex items-center text-[10px] text-muted-foreground">
        <ArrowUpRight className="size-2.5" />
        {delta}
      </span>
    </div>
  </div>
);

// Reporting & Insights — a monochrome analytics card. Bespoke code/SVG, not a
// photo or AI: KPIs + a rising bar trend on the section's dashed baseline.
const ReportingVisual = () => {
  const bars = [34, 46, 40, 56, 50, 64, 58, 78, 72, 94];
  return (
    <div className="image-container w-full">
      <div className="relative flex aspect-495/186 w-full max-w-lg flex-col justify-between overflow-hidden rounded-xl border border-border bg-background-contrast/60 p-3.5 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Monthly report
          </span>
          <span className="text-[10px] tracking-tight text-muted-foreground">
            Apr 1 – 30
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 sm:gap-5">
          <div className="flex flex-col gap-2.5">
            <Stat label="Reach" value="248K" delta="+32%" />
            <Stat label="Engagement" value="6.4%" delta="+1.8pt" />
          </div>
          <div className="flex-1">
            <div className="flex h-12 items-end justify-end gap-1 sm:h-16 sm:gap-1.5">
              {bars.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className={cn(
                    'w-1.5 rounded-full sm:w-2.5',
                    i === bars.length - 1 ? 'bg-foreground' : 'bg-foreground/25',
                  )}
                />
              ))}
            </div>
            <DashedLine orientation="horizontal" className="mt-1.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Social Strategy — a monochrome weekly content plan. Bespoke code/SVG: a
// 7-day grid of scheduled-post chips (empty day = dashed slot) on the baseline.
const StrategyVisual = () => {
  const week = [
    { d: 'M', posts: 1 },
    { d: 'T', posts: 2 },
    { d: 'W', posts: 1 },
    { d: 'T', posts: 0 },
    { d: 'F', posts: 2 },
    { d: 'S', posts: 1 },
    { d: 'S', posts: 1 },
  ];
  return (
    <div className="image-container w-full">
      <div className="relative flex aspect-495/186 w-full max-w-lg flex-col justify-between overflow-hidden rounded-xl border border-border bg-background-contrast/60 p-3.5 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Content plan
          </span>
          <span className="text-[10px] tracking-tight text-muted-foreground">
            This week
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((day, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex h-9 flex-col gap-1 sm:h-10">
                {day.posts === 0 ? (
                  <span className="h-3 rounded-sm border border-dashed border-border sm:h-3.5" />
                ) : (
                  Array.from({ length: day.posts }).map((_, k) => (
                    <span
                      key={k}
                      className={cn(
                        'h-3 rounded-sm sm:h-3.5',
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
        <DashedLine orientation="horizontal" />
      </div>
    </div>
  );
};

// A stacked value/label metric, used in the Influencer roster visual.
const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 leading-none">
    <span className="font-semibold text-sm tracking-tighter text-foreground">
      {value}
    </span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

// Influencer / Creator Collaborations — a monochrome creator roster. Bespoke
// code/SVG (no photo/AI): an overlapping avatar stack (initials) + program
// metrics, sized to match the Reporting card it sits beside.
const InfluencerVisual = () => {
  const roster = ['AR', 'MK', 'JL', 'SD', 'TN'];
  return (
    <div className="image-container w-full">
      <div className="relative flex aspect-495/186 w-full max-w-lg flex-col justify-between overflow-hidden rounded-xl border border-border bg-background-contrast/60 p-3.5 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Creator roster
          </span>
          <span className="text-[10px] tracking-tight text-muted-foreground">
            Sourced &amp; briefed
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex">
            {roster.map((initials, i) => (
              <span
                key={i}
                className="-ml-2 grid size-7 place-items-center rounded-full bg-background text-[9px] font-semibold tracking-tight text-foreground ring-1 ring-border first:ml-0 sm:size-8"
              >
                {initials}
              </span>
            ))}
          </div>
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-[9px] font-semibold text-background sm:size-8">
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
    </div>
  );
};

export { ServicesSocial };
