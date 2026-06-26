'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Edge-fade for a horizontal scroll strip. Dissolves clipped content into the
 * container's edge instead of hard-cutting it — and does so *continuously*: the
 * visible ramp on each side equals how far that side has scrolled, capped at
 * `--edge-fade`. So a side with nothing left to scroll (parked at the start or
 * end) reads fully crisp, and the fade grows in / melts out as you scroll
 * instead of popping on at a threshold.
 *
 * The live fade widths are pushed to the node as two custom properties
 * (`--edge-l` / `--edge-r`, in px) straight from the rAF scroll handler, so the
 * mask tracks scroll with no per-frame React render. The returned `maskImage`
 * is a *constant* gradient that reads those props (clamping each with
 * `min(..., --edge-fade)`) — attach it once to both `maskImage` and
 * `WebkitMaskImage`. Tune the ramp per breakpoint by setting `--edge-fade` on
 * the scroll element (defaults to 2.5rem).
 *
 * `measure` is exposed for callers that move the strip programmatically (e.g.
 * re-centering an active pill) and need to re-settle the fades afterward.
 * `atStart`/`atEnd` are exposed too, so a caller can disable prev/next controls
 * at the extremes off the same measurement.
 *
 * Lifted from FilterRail so the projects/blog filter rails, the carousels, and
 * the mobile Projects filmstrips share one implementation.
 */

// Each side stays black (opaque) until --edge-l/--edge-r grow it, and the ramp
// width is the scrolled distance clamped up to --edge-fade. Parked (var = 0px)
// collapses both stops to 0, so that edge reads fully crisp.
const MASK_IMAGE =
  'linear-gradient(to right,' +
  ' transparent, black min(var(--edge-l, 0px), var(--edge-fade, 2.5rem)),' +
  ' black calc(100% - min(var(--edge-r, 0px), var(--edge-fade, 2.5rem))),' +
  ' transparent)';

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
    // Continuous fade widths (clamped >= 0; CSS caps the upper end at
    // --edge-fade). Written straight to the node so the mask follows scroll
    // without re-rendering the consumer every frame.
    const left = Math.max(0, scrollLeft);
    const right = Math.max(0, scrollWidth - clientWidth - scrollLeft);
    el.style.setProperty('--edge-l', `${left}px`);
    el.style.setProperty('--edge-r', `${right}px`);
    // The boolean extremes still drive consumer controls (the prev/next arrows),
    // so keep them in state — they only flip at the very ends, so the renders
    // they trigger stay rare.
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

  return { ref, maskImage: MASK_IMAGE, measure, atStart, atEnd };
}
