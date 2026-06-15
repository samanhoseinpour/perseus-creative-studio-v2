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
 * audits), so the scroll is done here in JS instead. The first render is
 * skipped so a deep-linked `?page=2` load doesn't yank the viewport on arrival.
 */
const PaginationScroll = ({ page, targetId }: PaginationScrollProps) => {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, targetId]);

  return null;
};

export default PaginationScroll;
