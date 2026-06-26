'use client';
import { JSX } from 'react';
import Link from 'next/link';
import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
  LuArrowUpRight as ArrowUpRight,
} from 'react-icons/lu';
import { Img, Button, Container } from '@/components';
import { useEdgeFade } from '@/hooks/useEdgeFade';

interface CarouselProps {
  items: JSX.Element[];
}

type Card = {
  src: string;
  title: string;
  category: string;
  /** When set, the card links here (e.g. a service category page). */
  href?: string;
};

export const Carousel = ({ items }: CarouselProps) => {
  // Shared edge-fade hook owns the scroller ref, the L/R mask, and the
  // at-start/at-end flags (the arrows disable off them) — same wiring as the
  // blog's JournalShelf. Its continuous mask softens whichever side still has
  // cards to scroll, and reads crisp when parked at an end.
  const { ref, maskImage, atStart, atEnd } = useEdgeFade<HTMLDivElement>();

  // Page by one card stride (card width + gap), measured live so it stays
  // correct across the responsive card widths.
  const scrollByCard = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-card]');
    const step =
      cards.length > 1
        ? cards[1].offsetLeft - cards[0].offsetLeft
        : (cards[0]?.offsetWidth ?? el.clientWidth);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <Container className="mt-8">
      {/* --edge-fade tunes the useEdgeFade ramp: a hair on mobile (a single
          card dominates the view) → full 2.5rem from sm up. */}
      <div
        ref={ref}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-2 [--edge-fade:1rem] sm:[--edge-fade:2.5rem]"
      >
        {items.map((item, index) => (
          <div key={'card' + index} data-card className="shrink-0 snap-start">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={ArrowLeft}
          shimmer={false}
          className="p-2 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => scrollByCard(-1)}
          disabled={atStart}
          aria-label="Scroll carousel left"
        />
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={ArrowRight}
          shimmer={false}
          className="p-2 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => scrollByCard(1)}
          disabled={atEnd}
          aria-label="Scroll carousel right"
        />
      </div>
    </Container>
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
      {/* Overlay sits on a photo, so scrim + text use the pinned on-media/scrim
          tokens (which stay light/dark over real photography in both themes). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-linear-to-b from-scrim/50 via-transparent to-transparent" />
      <div className="relative z-40 flex w-full items-start justify-between gap-3 p-4 sm:p-8">
        <div className="min-w-0">
          <p className="text-left text-[10px] font-semibold text-on-media">
            {card.category}
          </p>
          <h3 className="max-w-xs text-left text-md leading-md sm:text-2xl sm:leading-2xl font-semibold text-balance text-on-media">
            {card.title}
          </h3>
        </div>
        {/* "Go" affordance — the same circular chip as the Most Requested band,
            so the whole Services section shares one link vocabulary. Links only. */}
        {card.href && (
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-on-media/10 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
          >
            <ArrowUpRight className="size-4 text-on-media" />
          </span>
        )}
      </div>
      <Img
        src={card.src}
        alt={card.title}
        fill
        sizes="(min-width: 768px) 384px, 224px"
        className="absolute inset-0 z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
    </>
  );

  // The cover image scales and the whole card lifts on hover — both transforms,
  // which defeat overflow-hidden's rounded-corner clipping of the (composited)
  // image + scrim, so the corners leak square. clip-path clips the subtree to
  // the same 1.5rem (rounded-3xl) radius and, unlike overflow-hidden, holds
  // through the transform. Keep overflow-hidden/rounded-3xl for the bg + the
  // focus-visible ring shape. No always-on inset ring: it sits below the image
  // (z-10) so it's hidden at rest, but the hover transforms promote the card to
  // its own layer and re-rasterize the clip, surfacing it as a hairline.
  const shell =
    'group relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl [clip-path:inset(0_round_1.5rem)] bg-black md:h-130 md:w-96';

  if (card.href) {
    return (
      <Link
        href={card.href}
        aria-label={card.title}
        className={`${shell} transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={shell}>{inner}</div>;
};
