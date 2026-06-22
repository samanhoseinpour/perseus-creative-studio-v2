'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Edge-fade for a horizontal scroll strip. Measures the scroll position and
 * returns a `mask-image` that dissolves clipped content into the container's
 * edge instead of hard-cutting it — but only on a side that *actually* has more
 * to scroll, so the first/last item reads fully opaque when the strip sits at
 * its resting start or end.
 *
 * Attach `ref` to the scrollable element and feed `maskImage` into both
 * `maskImage` and `WebkitMaskImage`. `measure` is exposed for callers that move
 * the strip programmatically (e.g. re-centering an active pill) and need to
 * re-settle the fades afterward.
 *
 * Lifted from FilterRail so the projects/blog filter rails and the mobile
 * Projects filmstrips share one implementation.
 */
export function useEdgeFade<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  // Default to "nothing clipped either side" so the first paint (pre-measure)
  // carries no fade and the leading item reads fully opaque.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setAtStart(scrollLeft <= 1);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Fade a side only when it actually clips content: no left ramp at the start,
  // no right ramp at the end.
  const maskImage = `linear-gradient(to right, ${
    atStart ? 'black' : 'transparent'
  }, black 16px, black calc(100% - 40px), ${atEnd ? 'black' : 'transparent'})`;

  return { ref, maskImage, measure };
}
