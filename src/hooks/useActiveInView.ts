'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * True only while `ref` is near the viewport AND the tab is visible.
 *
 * The gate a decorative WebGL canvas needs: left alone, a render loop runs
 * forever — off-screen, and in a background tab — which on a CPU-throttled
 * phone lands straight in Total Blocking Time. `Globe.tsx` applies the same
 * IntersectionObserver + `visibilitychange` pair by tearing the cobe instance
 * down; react-three-fiber can't be torn down that way, so it reads this flag
 * and parks its `frameloop` instead.
 *
 * Starts false: a canvas below the fold never spins up during the initial-load
 * window, when the main thread is busiest.
 */
export function useActiveInView(
  ref: RefObject<HTMLElement | null>,
  { rootMargin = '200px 0px' }: { rootMargin?: string } = {},
): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let inView = false;
    const sync = () => setActive(inView && !document.hidden);

    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      sync();
    }, { rootMargin });
    io.observe(node);

    document.addEventListener('visibilitychange', sync);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref, rootMargin]);

  return active;
}
