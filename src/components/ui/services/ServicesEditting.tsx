import { Plus } from 'lucide-react';
import { Container, ImageKit, Button, TextShimmer } from '@/app/components';
import Link from 'next/link';
import { AudioLines, Clapperboard } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Card } from '@/components/ui/card';

interface ServicesEdittingProps {
  smallCards?: {
    image: string;
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
  button?: {
    text: string;
    url: string;
  };
  className?: string;
}

const ServicesEditting = ({
  button = {
    text: 'Get a Post-Production Quote',
    url: '/contact',
  },
  smallCards = [
    {
      image:
        'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg',
      title: 'Video Editing',
      summary:
        'Tight storytelling, pacing, and cutdowns for Reels/TikTok/YouTube and ad placements.',
      url: '',
    },
    {
      image:
        'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-2.svg',
      title: 'Sound Design',
      summary:
        'Dialogue cleanup, music, sound design, and final mix so your content feels professional.',
      url: '',
    },
  ],
  bigCard = {
    image:
      'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/artistic-portrait-glitch-yqp6z.png',
    label: 'PERSEUS®',
    title: 'Color Grading & Correction',
    url: '',
  },
  className,
}: ServicesEdittingProps) => {
  return (
    <section className={cn('py-16 bg-background-contrast', className)}>
      <Container>
        <div className="flex flex-col gap-12 px-4">
          {/* Header Section */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-8">
            <h2 className="flex-1 justify-between text-4xl md:text-5xl tracking-tighter font-semibold">
              Video <span className="text-gradient">Post-Production</span>
            </h2>
            <Link href={button.url}>
              <Button>
                {button.text}
                {/* <ArrowUpRight className="size-4" /> */}
              </Button>
            </Link>
          </div>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {smallCards.map((card, id) => (
              <Card
                key={id}
                className="col-span-1 rounded-xl border-0 p-4 shadow-none"
              >
                <Link
                  href={card.url}
                  className="flex h-full w-full flex-col justify-between gap-4"
                >
                  <div className="relative w-full">
                    <ImageKit
                      width={300}
                      height={300}
                      src={card.image}
                      alt={card.title}
                      className="size-24 rounded-xl lg:size-32 dark:invert"
                    />
                    <div className="absolute top-0 right-0 flex items-start justify-end">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <Plus
                          size={20}
                          className="rounded-full bg-secondary p-0.5"
                        />
                      </p>
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
              <Link href={bigCard.url} className="block h-full">
                <div className="relative h-full w-full overflow-hidden  rounded-xl">
                  <ImageKit
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
                    <Plus
                      size={20}
                      className="rounded-full bg-secondary p-0.5"
                    />
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
