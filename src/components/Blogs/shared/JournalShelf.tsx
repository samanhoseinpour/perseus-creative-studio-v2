'use client';

import { Children, useCallback, useEffect, useState } from 'react';
import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';

import { Button, Container } from '@/components';
import { useEdgeFade } from '@/hooks/useEdgeFade';

// One card's scroll stride (card width + gap), measured from the live DOM so it
// stays correct across the responsive basis breakpoints.
const getStep = (el: HTMLElement) => {
  const cards = el.querySelectorAll<HTMLElement>('[data-card]');
  if (cards.length > 1) return cards[1].offsetLeft - cards[0].offsetLeft;
  return cards[0]?.offsetWidth ?? el.clientWidth;
};

interface JournalShelfProps {
  /**
   * Server-rendered `<BlogCard>` elements. Kept server-side (passed as
   * children into this client component) so each card's `<a>` links sit in the
   * initial HTML and stay crawlable — same approach as FeatureProjectGallery.
   */
  children: React.ReactNode;
  /** Accessible name for the carousel region. */
  label?: string;
}

/**
 * A single-row horizontal "shelf" of blog cards — the From the Blog carousel.
 * Lives inside `Container`, so the track caps at the content column and never
 * runs edge-to-edge on wide monitors. Each breakpoint shows a whole number of
 * cards (4 / 3 / 2, single-with-peek on phones) via a gap-aware `calc()` basis,
 * matching the old grid math so nothing clips. Navigation: prev/next arrows
 * (disabled at the ends) page a full view at a time, with a scrollbar-style
 * progress thumb and soft `useEdgeFade` masks on both sides whenever it scrolls.
 * Reduced motion drops the smooth scroll.
 */
const JournalShelf = ({
  children,
  label = 'From the blog',
}: JournalShelfProps) => {
  const items = Children.toArray(children);

  // The shared edge-fade hook owns the single scroller ref, the L/R mask, and
  // the at-start/at-end flags — the thumb effect and page() read the same node,
  // and the arrows disable off the hook's flags (no second measurement). Its
  // continuous mask softens whichever side still has cards to scroll into.
  const { ref, maskImage, atStart, atEnd } = useEdgeFade<HTMLUListElement>();

  // Scrollbar-style indicator: thumb width = portion of the strip in view,
  // progress = 0 at the start … 1 at the end. Positioning with
  // `progress * (1 - width)` lands its right edge on the track's right edge at
  // max scroll, so it reads correctly at every breakpoint.
  const [thumb, setThumb] = useState({ width: 1, progress: 0 });

  const measureThumb = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    const max = scrollWidth - clientWidth;
    // Floor the width so a sliver-wide thumb stays visible on narrow viewports.
    const width = Math.min(1, Math.max(clientWidth / scrollWidth || 1, 0.14));
    const progress = max > 0 ? scrollLeft / max : 0;
    setThumb({ width, progress });
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measureThumb();
    el.addEventListener('scroll', measureThumb, { passive: true });
    window.addEventListener('resize', measureThumb);
    return () => {
      el.removeEventListener('scroll', measureThumb);
      window.removeEventListener('resize', measureThumb);
    };
  }, [measureThumb, ref]);

  // Page by a full view of whole cards (round handles the missing trailing gap),
  // so 12 cards don't take a dozen clicks to traverse.
  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const step = getStep(el);
    const perView = Math.max(1, Math.round(el.clientWidth / step));
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollBy({
      left: dir * perView * step,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  if (items.length === 0) return null;

  // A single card can't scroll — render it without the carousel chrome.
  const interactive = items.length > 1;

  return (
    <Container>
      <div aria-roledescription="carousel" aria-label={label}>
        {/* Whole-card fits per breakpoint: basis = (100% − total gaps) / N, the
            same subtraction CSS grid did implicitly, so 4 cards land exactly in
            the content column instead of overflowing. */}
        <ul
          ref={ref}
          style={{ maskImage, WebkitMaskImage: maskImage }}
          // --edge-fade tunes the useEdgeFade ramp: a hair on mobile (one card
          // fills the view, so a strong fade would dim its own text) → full
          // 2.5rem from sm up, where it dissolves real neighbour cards.
          className="no-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain py-2 [--edge-fade:1rem] sm:[--edge-fade:2.5rem]"
        >
          {items.map((child, i) => (
            <li
              key={i}
              data-card
              className="shrink-0 snap-start basis-full sm:basis-[calc((100%-2rem)/2)] lg:basis-[calc((100%-4rem)/3)] xl:basis-[calc((100%-6rem)/4)]"
            >
              {child}
            </li>
          ))}
        </ul>

        {interactive && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div
              aria-hidden="true"
              className="relative h-1 w-28 overflow-hidden rounded-full bg-foreground/15 sm:w-40"
            >
              <span
                className="absolute inset-y-0 rounded-full bg-foreground"
                style={{
                  width: `${thumb.width * 100}%`,
                  left: `${thumb.progress * (1 - thumb.width) * 100}%`,
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="small"
                shimmer={false}
                className="p-2 disabled:cursor-default disabled:opacity-40"
                onClick={() => page(-1)}
                disabled={atStart}
                aria-label="Previous posts"
                icon={ArrowLeft}
              />
              <Button
                size="small"
                shimmer={false}
                className="p-2 disabled:cursor-default disabled:opacity-40"
                onClick={() => page(1)}
                disabled={atEnd}
                aria-label="Next posts"
                icon={ArrowRight}
              />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default JournalShelf;
