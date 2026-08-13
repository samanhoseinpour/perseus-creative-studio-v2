'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Runs `measure` once, the first time `ref`'s element (nearly) enters the
 * viewport — instead of synchronously at mount. Below-the-fold scroll strips
 * live inside `content-visibility: auto` sections, and an eager
 * scrollWidth/clientWidth read at hydration forces layout of the subtree the
 * browser deliberately skipped (the audit's forced reflow). By the time the
 * observer fires, the section has been rendered anyway, so the read is cheap.
 *
 * Callers keep their own scroll/resize listeners; this only replaces the
 * mount-time first measurement. Pre-measure defaults must therefore be valid
 * for a parked strip (they are: full-width thumb, arrows at their resting
 * state). Falls back to a double-rAF when IntersectionObserver is unavailable.
 */
export function useFirstInViewMeasure(
  ref: RefObject<HTMLElement | null>,
  measure: () => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let io: IntersectionObserver | undefined;
    let raf1 = 0;
    let raf2 = 0;
    if (typeof IntersectionObserver === 'undefined') {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(measure);
      });
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            measure();
            io?.disconnect();
            io = undefined;
          }
        },
        { rootMargin: '200px 0px' },
      );
      io.observe(el);
    }

    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [ref, measure]);
}
