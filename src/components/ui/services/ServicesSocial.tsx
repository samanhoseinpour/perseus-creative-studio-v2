import { cn } from '@/lib/utils';
import { Container, ImageKit } from '@/app/components';

const topItems = [
  {
    title: 'Social Strategy + Content Pillars.',
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
    title: 'Content Calendar + Scheduling.',
    description:
      'A clear monthly posting plan with approvals, scheduling, and deadlines—so you always know what’s going out and when.',
    images: [
      {
        src: 'https://cdn.cosmos.so/99af234f-b9e4-4156-919e-e6c3105c0860?format=jpeg',
        alt: 'Content Calendar + Scheduling',
        className: 'aspect-305/280 rounded-t-xl max-w-[305px]',
      },
    ],
    className:
      '[&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2',
    fade: ['bottom'] as string[],
  },
  {
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
    title: 'Reporting & Insights.',
    description:
      'We source creators, write briefs, manage deliverables, and repurpose the content—so you get authentic assets without the overhead.',
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
        <div className="flex flex-col text-center">
          <h2 className="text-4xl pb-4 md:text-5xl font-semibold tracking-tighter text-gradient">
            Social Media Management
          </h2>
          <h3 className="tracking-tighter text-black/70 text-md">
            We plan, create, and manage your social so it drives real business
            results, more calls, bookings, and qualified leads.
          </h3>
        </div>

        <div className="mt-8 md:mt-12 lg:mt-20">
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

          {/* Bottom Features Grid - 3 items */}
          <div className="relative grid max-w-7xl md:grid-cols-3">
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
      </Container>
    </section>
  );
}

interface ItemProps {
  item: {
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
                    className="size-8 object-contain object-top-left lg:size-12"
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
                    className="size-8 object-contain object-top-left lg:size-12"
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
                image.className,
              )}
            />
          ))}
        </div>
      )}

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
