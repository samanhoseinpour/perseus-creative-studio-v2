'use client';

import { Children, useRef, useState } from 'react';
import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
} from 'react-icons/lu';

import { Button, Container } from '@/components';

/** Reusable <Button> reshaped into the shelf's flat circular nav arrow: the
 *  glass secondary variant overridden back to the understated bg-black/5 ring
 *  so it sits quietly under the photo cards. showIcon={false} drops Button's
 *  default trailing arrow; the chevron rides in as the child. */
const arrowClass =
  'size-11 border-0 p-0 bg-black/5 text-black shadow-none backdrop-blur-none transition-opacity duration-300 hover:translate-y-0 hover:bg-black/10 active:translate-y-0 disabled:opacity-30';

interface ServiceShelfProps {
  children: React.ReactNode;
}

/** Wide-to-narrow wrapper ratio at sm+ (sm:w-xl 36rem / sm:w-80 20rem) — lets
 *  the scroll target be computed without measuring a mid-transition card. */
const WIDE_RATIO = 36 / 20;
/** Breathing room kept between the spotlit card and the viewport edges. */
const EDGE_MARGIN = 24;

const ServiceShelf = ({ children }: ServiceShelfProps) => {
  const items = Children.toArray(children);
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const prevActive = useRef(0);

  const goTo = (index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const next = Math.min(Math.max(index, 0), items.length - 1);

    // Narrow-card width, measured off a wrapper that isn't mid-transition —
    // under fast clicking the previous active card is still shrinking.
    const wrappers = Array.from(rail.children) as HTMLElement[];
    const stable =
      wrappers.find(
        (_, k) => k !== active && k !== next && k !== prevActive.current,
      ) ?? wrappers[0];
    const narrow = stable.getBoundingClientRect().width;
    const wide = narrow * WIDE_RATIO;
    const style = getComputedStyle(rail);
    const gap = parseFloat(style.columnGap) || 20;
    const pad = parseFloat(style.paddingLeft) || 0;

    // Post-transition geometry: cards before the spotlight are all narrow.
    const offset = pad + next * (narrow + gap);
    // Scroll the minimum that keeps the grown card fully visible: never left
    // of the container's content edge, never cut off at the viewport's right.
    const upper = offset - pad;
    const lower = offset + wide + EDGE_MARGIN - rail.clientWidth;
    const target = Math.min(
      Math.max(rail.scrollLeft, lower),
      Math.max(upper, 0),
    );

    prevActive.current = active;
    setActive(next);

    if (Math.abs(target - rail.scrollLeft) > 1) {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      rail.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  return (
    <div>
      <div
        ref={railRef}
        className="no-scrollbar relative flex snap-x gap-5 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 py-2 sm:snap-none min-[1240px]:scroll-px-[calc((100vw-1192px)/2)] min-[1240px]:px-[calc((100vw-1192px)/2)]"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className={`shrink-0 snap-start transition-[width] duration-700 ease-out ${
              // The spotlight is a chevron affordance — below sm (no chevrons)
              // every card rides the same width.
              i === active ? 'is-active w-72 sm:w-xl' : 'w-72 sm:w-80'
            }`}
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
          aria-label="Previous service"
          disabled={active <= 0}
          onClick={() => goTo(active - 1)}
          className={arrowClass}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          variant="secondary"
          showIcon={false}
          type="button"
          aria-label="Next service"
          disabled={active >= items.length - 1}
          onClick={() => goTo(active + 1)}
          className={arrowClass}
        >
          <ChevronRight className="size-5" />
        </Button>
      </Container>
    </div>
  );
};

export default ServiceShelf;
