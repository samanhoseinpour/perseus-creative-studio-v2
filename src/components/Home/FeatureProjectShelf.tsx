'use client';

import { Children, useCallback, useEffect, useRef, useState } from 'react';
import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
} from 'react-icons/lu';

import { Button, Container } from '@/components';

/** Reusable <Button> reshaped into the shelf's flat circular nav arrow — the
 *  same understated treatment the category ServiceShelf uses, so the homepage
 *  rail reads as the same archive system. showIcon={false} drops Button's
 *  default trailing arrow; the chevron rides in as the child. */
const arrowClass =
  'size-11 border-0 p-0 bg-black/5 text-black ring-1 ring-inset ring-black/10 shadow-none backdrop-blur-none transition-opacity duration-300 hover:translate-y-0 hover:bg-black/10 active:translate-y-0 disabled:opacity-30';

interface FeatureProjectShelfProps {
  children: React.ReactNode;
}

/**
 * Apple-style product shelf for the homepage's selected-work section: a
 * full-bleed, scroll-snapping rail of uniform-width cards (passed as
 * server-rendered children, so <CaseSlateCard> stays a server component) with
 * circular arrow controls that scroll a page at a time and disable at the
 * extremes. Touch scrolls natively; the arrows are progressive enhancement for
 * pointer devices (sm+). Mirrors the rail chrome of
 * `Projects/category/ServiceShelf` but without its spotlight-grow — every card
 * on the shelf shares one width.
 */
const FeatureProjectShelf = ({ children }: FeatureProjectShelfProps) => {
  const items = Children.toArray(children);
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setCanPrev(rail.scrollLeft > 1);
    setCanNext(rail.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.85,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  return (
    <div>
      <div
        ref={railRef}
        onScroll={sync}
        className="no-scrollbar relative flex snap-x gap-5 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 py-2 min-[1240px]:scroll-px-[calc((100vw-1192px)/2)] min-[1240px]:px-[calc((100vw-1192px)/2)]"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="w-[80vw] max-w-sm shrink-0 snap-start sm:w-80 lg:w-[21rem]"
          >
            {child}
          </div>
        ))}
      </div>

      <Container className="mt-4 hidden justify-end gap-3 sm:flex">
        <Button
          variant="secondary"
          showIcon={false}
          type="button"
          aria-label="Previous projects"
          disabled={!canPrev}
          onClick={() => scrollByPage(-1)}
          className={arrowClass}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          variant="secondary"
          showIcon={false}
          type="button"
          aria-label="More projects"
          disabled={!canNext}
          onClick={() => scrollByPage(1)}
          className={arrowClass}
        >
          <ChevronRight className="size-5" />
        </Button>
      </Container>
    </div>
  );
};

export default FeatureProjectShelf;
