'use client';

import { useEffect, useState } from 'react';

/**
 * False until the page has fully loaded AND the main thread has gone idle
 * (requestIdleCallback with a hard timeout; plain timeout on Safari, which has
 * no rIC). Gates decorative motion clocks — carousel autoplay, rotating-word
 * flips — so their first ticks, and any lazy image fetches they trigger, land
 * after the load trace's LCP/TBT window instead of inside it.
 */
export function useIdleReady(timeout = 2500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const arm = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => setReady(true), { timeout });
      } else {
        timeoutId = window.setTimeout(() => setReady(true), timeout);
      }
    };

    if (document.readyState === 'complete') {
      arm();
    } else {
      window.addEventListener('load', arm, { once: true });
    }

    return () => {
      window.removeEventListener('load', arm);
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [timeout]);

  return ready;
}
