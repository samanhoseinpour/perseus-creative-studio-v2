'use client';
import React, { useEffect, JSX } from 'react';
import Link from 'next/link';
import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { ImageKit, Button } from '@/components';

interface CarouselProps {
  items: JSX.Element[];
  initialScroll?: number;
}

type Card = {
  src: string;
  title: string;
  category: string;
  /** When set, the card links here (e.g. a service category page). */
  href?: string;
};

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full mt-8">
      <div
        className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth pb-4 [scrollbar-width:none] md:pb-8"
        ref={carouselRef}
        onScroll={checkScrollability}
      >
        <div
          className={cn(
            'absolute right-0 z-1000 h-auto w-[5%] overflow-hidden bg-linear-to-l',
          )}
        />

        <div
          className={cn(
            'flex flex-row justify-start gap-4 mx-auto container max-w-[1240px] px-6',
          )}
        >
          {items.map((item, index) => (
            <div
              key={'card' + index}
              className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="mr-10 flex justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={ArrowLeft}
          showIcon={false}
          className="aspect-square p-2 disabled:pointer-events-none disabled:opacity-40"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          aria-label="Scroll carousel left"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={ArrowRight}
          showIcon={false}
          className="aspect-square p-2 disabled:pointer-events-none disabled:opacity-40"
          onClick={scrollRight}
          disabled={!canScrollRight}
          aria-label="Scroll carousel right"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export const Card = ({
  card,
}: {
  card: Card;
  index: number;
  layout?: boolean;
}) => {
  const inner = (
    <>
      {/* Overlay sits on a photo, so scrim + text are pinned (not theme tokens)
          to stay legible in both light and dark mode. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-linear-to-b from-[#0a0a0a]/50 via-transparent to-transparent" />
      <div className="relative z-40 p-4 sm:p-8">
        <p className="text-left text-[10px] font-semibold text-[#fcfcfc]">
          {card.category}
        </p>
        <h3 className="max-w-xs text-left text-md leading-md sm:text-2xl sm:leading-2xl font-semibold text-balance text-[#fcfcfc]">
          {card.title}
        </h3>
      </div>
      <ImageKit
        src={card.src}
        alt={card.title}
        fill
        sizes="(min-width: 768px) 384px, 224px"
        className="absolute inset-0 z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
    </>
  );

  const shell =
    'group relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-black md:h-130 md:w-96';

  if (card.href) {
    return (
      <Link href={card.href} aria-label={card.title} className={shell}>
        {inner}
      </Link>
    );
  }

  return <div className={shell}>{inner}</div>;
};
