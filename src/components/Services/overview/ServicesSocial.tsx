import { cn } from '@/lib/utils';
import { Button, Container, Heading, ImageKit } from '@/components';
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
    images: [
      {
        src: 'services-smm.jpeg',
        alt: 'Issue template interface',
        className: 'aspect-495/186 max-w-lg rounded-xl',
      },
    ],
    className:
      'flex-1 [&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2',
    fade: [''] as string[],
  },
  {
    slug: 'social-media-management',
    title: 'Social Media Management.',
    description:
      'We create and publish posts, write captions, manage hashtags, and respond to comments/DMs, so your accounts stay active and professional.',
    images: [
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/instagram-icon.svg',
        alt: 'Instagram logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/linkedin-icon.svg',
        alt: 'LinkedIn logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/producthunt-icon.svg',
        alt: 'Product Hunt logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/twitter-icon.svg',
        alt: 'Twitter logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/astro-icon.svg',
        alt: 'Astro logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/figma-icon.svg',
        alt: 'Figma logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/slack-icon.svg',
        alt: 'Slack logo',
      },
      {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/google-icon.svg',
        alt: 'Google logo',
      },
    ],
    className:
      'flex-1 [&>.title-container]:mb-5 md:[&>.title-container]:mb-8 md:[&>.title-container]:translate-x-2 xl:[&>.title-container]:translate-x-4 [&>.title-container]:translate-x-0',
    fade: [],
  },
];

const bottomItems = [
  {
    slug: 'influencer-collaborations',
    title: 'Influencer / Creator Collaborations.',
    description:
      'We source creators, write briefs, manage deliverables, and repurpose the content—so you get authentic assets without the overhead.',
    images: [
      {
        src: 'services-contentcreation.jpeg',
        alt: 'Influencer / Creator Collaborations.',
        className: 'aspect-320/103 rounded-xl',
      },
    ],
    className:
      'justify-normal [&>.title-container]:mb-5 md:[&>.title-container]:mb-0 [&>.image-container]:flex-1 md:[&>.image-container]:place-items-center md:[&>.image-container]:-translate-y-3',
    fade: [''],
  },
  {
    slug: 'reporting-insights',
    title: 'Reporting & Insights.',
    description:
      'Monthly reporting on reach, engagement, and conversions—with clear read-outs on what worked and what we’ll do next.',
    images: [
      {
        src: 'services-smm.jpeg',
        alt: 'Reporting & Insights.',
        className: 'aspect-305/280 rounded-t-xl max-w-[305px]',
      },
    ],
    className:
      '[&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2',
    fade: ['bottom'],
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
          seperatorTitle="05 — Social Media Management"
          eyebrowRight="Social Growth"
          title="Social Media Management"
          titleAccent="Built to turn content into qualified attention."
          description="We plan, create, and manage your social so it drives real business results, more calls, bookings, and qualified leads."
          containerStyle="px-0 md:px-0 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />

        <div className="mt-10">
          <DashedLine orientation="horizontal" className="scale-x-105" />

          {/* Top Features Grid - 2 items */}
          <div className="relative flex max-md:flex-col">
            {topItems.map((item, i) => (
              <Item key={i} item={item} isLast={i === topItems.length - 1} />
            ))}
          </div>
          <DashedLine
            orientation="horizontal"
            className="max-w-7xl scale-x-110"
          />

          {/* Bottom Features Grid - 2 items */}
          <div className="relative grid max-w-7xl md:grid-cols-2">
            {bottomItems.map((item, i) => (
              <Item
                key={i}
                item={item}
                isLast={i === bottomItems.length - 1}
                className="md:pb-0"
              />
            ))}
          </div>
        </div>
        <DashedLine
          orientation="horizontal"
          className="max-w-7xl scale-x-110 pt-4"
        />

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
    images: { src: string; alt: string; className?: string }[];
    className?: string;
    fade: string[];
  };
  isLast?: boolean;
  className?: string;
}

const Item = ({ item, isLast, className }: ItemProps) => {
  return (
    <div
      className={cn(
        'relative flex flex-col px-0 py-6 md:px-6 md:py-8',
        className,
        item.className,
      )}
    >
      <div className="title-container max-w-md leading-none tracking-tighter">
        <h3 className="inline font-semibold text-md">{item.title} </h3>
        <span className="font-medium text-sm"> {item.description}</span>
      </div>

      {item.fade.includes('bottom') && (
        <div className="absolute inset-0 z-10 bg-linear-to-t from-background/80 via-transparent to-transparent md:hidden" />
      )}
      {item.images.length > 4 ? (
        <div className="relative overflow-hidden">
          <div className="flex flex-col gap-5">
            {/* First row - right aligned */}
            <div className="flex translate-x-4 justify-end gap-5">
              {item.images.slice(0, 4).map((image, j) => (
                <div
                  key={j}
                  className="grid aspect-square size-16 place-items-center rounded-xl bg-background-contrast/40 p-2 lg:size-20"
                >
                  <ImageKit
                    width={300}
                    height={300}
                    src={image.src}
                    alt={image.alt}
                    className={cn(
                      'size-8 object-contain object-top-left lg:size-12',
                      // Astro's logo is black → invert it in dark mode.
                      image.src.includes('astro-icon') && 'dark:invert',
                    )}
                  />
                  <div className="absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background/80 to-transparent" />
                </div>
              ))}
            </div>
            {/* Second row - left aligned */}
            <div className="flex -translate-x-4 gap-5">
              {item.images.slice(4).map((image, j) => (
                <div
                  key={j}
                  className="grid aspect-square size-16 place-items-center rounded-xl bg-background-contrast/40 lg:size-20"
                >
                  <ImageKit
                    width={300}
                    height={300}
                    src={image.src}
                    alt={image.alt}
                    className={cn(
                      'size-8 object-contain object-top-left lg:size-12',
                      // Astro's logo is black → invert it in dark mode.
                      image.src.includes('astro-icon') && 'dark:invert',
                    )}
                  />
                  <div className="absolute inset-y-0 bottom-0 left-0 z-10 w-14 bg-linear-to-r from-background/80 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="image-container grid grid-cols-1 gap-4">
          {item.images.map((image, j) => (
            <ImageKit
              width={300}
              height={300}
              key={j}
              src={image.src}
              alt={image.alt}
              className={cn(
                'w-full overflow-hidden object-cover',
                image.src.includes('astro-icon') && 'dark:invert',
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

      {!isLast && (
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

export { ServicesSocial };
