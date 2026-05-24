'use client';

import { useEffect, useRef } from 'react';

// Client-side replacement for a `#articles` fragment in pagination hrefs.
// Keeping the fragment out of the URL stops crawlers (Semrush etc.) from
// flagging `?page=N#articles` as canonicalised against the fragment-free
// canonical; this effect restores the scroll-to-grid UX instead. Skips the
// initial mount so the profile doesn't auto-scroll on first load.
export default function ScrollToArticles({ page }: { page: number }) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document
      .getElementById('articles')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  return null;
}
