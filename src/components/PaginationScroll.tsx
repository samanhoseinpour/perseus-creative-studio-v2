'use client';

import { useEffect, useRef } from 'react';

type PaginationScrollProps = {
  /** Current page number — when it changes, scroll the target into view. */
  page: number;
  /** id of the element to scroll into view (e.g. "posts", "case-files"). */
  targetId: string;
};

/**
 * Smooth-scrolls a paginated list back into view when the page changes.
 *
 * Pagination links carry no `#<targetId>` fragment (a fragment-bearing href
 * canonicalises against the fragment-free canonical and trips duplicate-URL
 * audits), so the scroll is done here in JS instead.
 *
 * We compare `page` against the previously-rendered value rather than using a
 * one-shot "first render" boolean: in dev, React Strict Mode invokes effects
 * twice on mount, and a boolean flipped on the first invocation is already
 * `false` by the second — so the effect would scroll on mount and yank the
 * viewport to the list on every navigation. A value comparison is idempotent:
 * a mount never looks like a change however many times the effect runs, while a
 * real page change (and only that) still scrolls. A deep-linked `?page=2` load
 * also stays put, since the ref seeds with that same initial page.
 */
const PaginationScroll = ({ page, targetId }: PaginationScrollProps) => {
  const prevPage = useRef(page);

  useEffect(() => {
    if (prevPage.current === page) return;
    prevPage.current = page;
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, targetId]);

  return null;
};

export default PaginationScroll;
