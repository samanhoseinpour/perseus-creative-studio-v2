'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// A top loading bar that gives instant feedback the moment an internal link is
// clicked. App Router client navigations otherwise leave the *old* page frozen
// on screen while the next route's RSC payload is fetched + rendered — on heavy
// pages that reads as "nothing happened" for ~1s. This bar starts creeping on
// click and completes when the new pathname commits, so a click always feels
// like it did something.
//
// Deliberately library-free and detection-based:
//  - START on a captured click of an in-app <a> (skips new-tab / external /
//    modifier / download / hash-only / same-URL clicks).
//  - FINISH when `usePathname()` changes, or via a fallback timer for
//    search-only navigations (same path, different ?query) where pathname won't
//    change, plus an 8s safety net so a blocked nav never strands the bar.
//
// We read ONLY `usePathname()` here — never `useSearchParams()` — because the
// latter, used this high in the tree, would force a client-side-rendering
// bailout site-wide (see the blog-index note in CLAUDE.md).

// Creep schedule (ms → %). Eases toward 90% and waits there; the real
// completion drives it to 100%.
const CREEP: ReadonlyArray<[number, number]> = [
  [80, 38],
  [400, 65],
  [1200, 82],
  [2600, 90],
];
const SEARCH_NAV_FINISH_MS = 550; // same-path ?query swaps settle fast
const SAFETY_MS = 8000; // a nav that never commits still clears the bar

const RouteProgress = () => {
  const pathname = usePathname();
  const [active, setActive] = useState(false); // controls opacity (visible while navigating)
  const [progress, setProgress] = useState(0); // 0–100, drives width
  const navigating = useRef(false);
  const timers = useRef<number[]>([]);
  const didMount = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (!navigating.current) return;
    navigating.current = false;
    clearTimers();
    setProgress(100);
    // Hold full for a beat, fade out, then snap width back to 0 while invisible
    // so the reset is never seen as a slide back to the left.
    timers.current.push(window.setTimeout(() => setActive(false), 220));
    timers.current.push(window.setTimeout(() => setProgress(0), 600));
  }, [clearTimers]);

  const start = useCallback(
    (searchOnly: boolean) => {
      if (navigating.current) return;
      navigating.current = true;
      clearTimers();
      setActive(true);
      setProgress(10);
      CREEP.forEach(([ms, pct]) =>
        timers.current.push(window.setTimeout(() => setProgress(pct), ms)),
      );
      // Search-only navs don't change pathname, so the pathname effect can't
      // finish them — close the bar on a short timer instead.
      if (searchOnly) {
        timers.current.push(window.setTimeout(finish, SEARCH_NAV_FINISH_MS));
      }
      timers.current.push(window.setTimeout(finish, SAFETY_MS));
    },
    [clearTimers, finish],
  );

  // START: capture clicks before React/Next handle them so we light up the bar
  // even when the navigation is fast.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const target = anchor.getAttribute('target');
      if (target && target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if ((anchor.getAttribute('rel') || '').includes('external')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const samePath = url.pathname === window.location.pathname;
      if (samePath && url.search === window.location.search) return; // no real nav
      start(samePath);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [start]);

  // FINISH: a committed pathname change means the destination route rendered.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    finish();
  }, [pathname, finish]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] origin-left',
        // Fades in from the left so even a short bar reads as forward motion;
        // a soft same-color glow sells the "working" feel without a new token.
        'bg-[linear-gradient(to_right,transparent,var(--ink))]',
        'shadow-[0_0_10px_0_var(--ink)]',
        'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        active ? 'opacity-90' : 'opacity-0',
      )}
      style={{
        // scaleX (not width): compositor-driven, so the creep never touches
        // layout — the gradient paints across the full-width box and compresses
        // with the scale, which reads identically to the old width version.
        transform: `scaleX(${progress / 100})`,
        // The scale eases while navigating (the creep), but snaps with no
        // animation during the post-finish reset so it can't be seen sliding
        // backward.
        transitionProperty: active ? 'transform, opacity' : 'opacity',
        transitionDuration: active ? '600ms, 300ms' : '300ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
};

export default RouteProgress;
