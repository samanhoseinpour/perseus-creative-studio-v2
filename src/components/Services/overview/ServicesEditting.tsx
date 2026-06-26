import {
  LuPlus as Plus,
  LuScissors as Scissors,
  LuFolderOpen as FolderOpen,
  LuAudioLines as AudioLines,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  Container,
  Img,
  Button,
  TextShimmer,
  Heading,
} from '@/components';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import { Card } from '@/components/ui/card';

// This section zooms into one Production discipline — Post-Production — so its
// cards link to that service's detail page (/services/production/post-production)
// rather than acting as a standalone category.
const POST_PRODUCTION_HREF = '/services/production/post-production';

interface ServicesEdittingProps {
  smallCards?: {
    icon: IconType;
    title: string;
    summary: string;
    url: string;
  }[];
  bigCard?: {
    image: string;
    label: string;
    title: string;
    url: string;
  };
  secondaryHeading?: string;
  description?: string;
  primaryButton?: {
    text: string;
    url: string;
  };
  secondaryButton?: {
    text: string;
    url: string;
  };
  className?: string;
}

const ServicesEditting = ({
  primaryButton = {
    text: 'Get a Post-Production Quote',
    url: '/contact',
  },
  secondaryButton = {
    text: 'View Post-Production Work',
    url: '/projects',
  },
  smallCards = [
    {
      icon: Scissors,
      title: 'Video Editing',
      summary:
        'Tight storytelling, pacing, and cutdowns for Reels/TikTok/YouTube and ad placements.',
      url: POST_PRODUCTION_HREF,
    },
    {
      icon: AudioLines,
      title: 'Sound Design',
      summary:
        'Dialogue cleanup, music, sound design, and final mix so your content feels professional.',
      url: POST_PRODUCTION_HREF,
    },
  ],
  bigCard = {
    image:
      'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/artistic-portrait-glitch-yqp6z.png',
    label: 'PERSEUS®',
    title: 'Color Grading & Correction',
    url: POST_PRODUCTION_HREF,
  },
  className,
}: ServicesEdittingProps) => {
  return (
    <section className={cn('py-16 bg-background-contrast', className)}>
      <Container>
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-6">
            <Heading
              titleTag="h2"
              seperatorTitle="Inside Production · Post-Production"
              eyebrowRight="Final Polish"
              title="Video Post-Production"
              titleAccent="Built to turn raw footage into polished assets."
              description="Editing, sound design, color grading, correction, and cutdowns shaped for social, websites, campaigns, and ad placements."
              containerStyle="px-0 md:px-0 w-full max-w-none"
              titleStyle="max-w-4xl"
              descStyle="max-w-3xl"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={primaryButton.url} className="w-fit">
                <Button variant="primary" icon={Scissors}>
                  {primaryButton.text}
                </Button>
              </Link>
              <Link href={secondaryButton.url} className="w-fit">
                <Button variant="secondary" icon={FolderOpen}>
                  {secondaryButton.text}
                </Button>
              </Link>
            </div>
          </div>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {smallCards.map((card, id) => (
              <Card
                key={id}
                className="col-span-1 rounded-xl border-0 bg-background p-4 shadow-none"
              >
                <Link
                  href={card.url}
                  className="group flex h-full w-full flex-col justify-between gap-4"
                >
                  <div className="relative w-full">
                    <div
                      aria-hidden
                      className="grid size-24 place-items-center rounded-xl bg-background-contrast text-black lg:size-32"
                    >
                      <card.icon className="size-9 lg:size-12" strokeWidth={1.5} />
                    </div>
                    <div className="absolute top-0 right-0 flex items-start justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        showIcon={false}
                        className="pointer-events-none aspect-square h-8 w-8 rounded-full p-0 transition-transform duration-300 group-hover:rotate-90"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-3xl font-semibold tracking-tighter">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-sm text-black/70">
                      {card.summary}
                    </p>
                  </div>
                </Link>
              </Card>
            ))}
            <Card className="min-h-120 rounded-xl border-0 bg-white py-0 pt-0 shadow-none md:col-span-2 md:min-h-128">
              <Link href={bigCard.url} className="group block h-full">
                <div className="relative h-full w-full overflow-hidden  rounded-xl">
                  <Img
                    src={bigCard.image}
                    alt={bigCard.title}
                    className="aspect-4/3 h-full w-full object-cover hover:scale-105 transition-all duration-500"
                    width={300}
                    height={300}
                  />
                  <div className="absolute top-0 flex w-full items-center justify-between p-8">
                    <TextShimmer className="text-sm tracking-tighter">
                      {bigCard.label}
                    </TextShimmer>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      showIcon={false}
                      className="pointer-events-none aspect-square h-8 w-8 rounded-full p-0 transition-transform duration-300 group-hover:rotate-90"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 flex w-full items-end justify-end bg-linear-to-b from-white/0 to-white/95 p-10 text-right">
                    <h2 className="w-2/3 text-3xl md:text-4xl leading-none tracking-tighter font-bold">
                      {bigCard.title}
                    </h2>
                  </div>
                </div>
              </Link>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
};

export { ServicesEditting };
