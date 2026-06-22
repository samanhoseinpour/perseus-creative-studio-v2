'use client';

import { useEffect } from 'react';

import { useEdgeFade } from '@/hooks/useEdgeFade';

interface FilterRailProps {
  /** Active facet slug ('' = All) — the rail re-centers on it after each
   *  server-rendered filter navigation. */
  activeSlug: string;
  children: React.ReactNode;
}

/**
 * Single-line scroll strip for one facet group's pills. The pills themselves
 * stay server-rendered <Link>s passed as children — this wrapper only owns the
 * scroll container, so the facet content costs no client JS. Edge fade masks
 * dissolve clipped pills instead of hard-cutting them, hinting there's more to
 * swipe — but only on a side that actually has clipped content, so the first
 * pill ("All") is never dimmed while the rail sits at its resting start. The
 * other behavior here is a courtesy: after a filter click the page re-renders
 * and the rail's scroll position resets, so we slide the selected pill (marked
 * data-active) back into view.
 *
 * Shared by the projects category filter rails (CaseFileIndex) and the blog
 * category filter (BlogPost), so both scale to many pills the same way.
 */
const FilterRail = ({ activeSlug, children }: FilterRailProps) => {
  // Edge-fade (measuring + mask) lives in the shared hook; this component keeps
  // only the pill-specific re-center behavior below.
  const { ref: railRef, maskImage, measure } = useEdgeFade<HTMLDivElement>();

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) {
      measure();
      return;
    }
    // Scroll the rail only — scrollIntoView could also scroll the page
    // vertically on a deep link, and pill links are scroll={false}.
    const left = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    // The scrollTo above also fires 'scroll', but re-measure here so an
    // already-at-rest rail (no scroll event) still settles its fades.
    measure();
  }, [activeSlug, measure, railRef]);

  return (
    <div
      ref={railRef}
      style={{ maskImage, WebkitMaskImage: maskImage }}
      className="no-scrollbar relative flex min-w-0 flex-1 snap-x items-center gap-2 overflow-x-auto scroll-px-1 overscroll-x-contain py-1 sm:gap-3"
    >
      {children}
    </div>
  );
};

export default FilterRail;
