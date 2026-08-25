'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { RELEASES_SEEN_EVENT } from '@/lib/releaseFields';

/**
 * How many updates this viewer has not read — shared with the footer stamp,
 * which sits inside AdminPage on every route.
 *
 * A context rather than a prop because AdminPage is a SERVER component and
 * must stay one: AdminSkeletons.tsx imports it, and that file's header
 * contract forbids `server-only` modules and the registries anywhere in its
 * graph. Threading the count down as a prop would mean making AdminPage async
 * and DB-touching, which also renders during loading.tsx.
 *
 * Wrapping the layout's children costs nothing: they are server-rendered and
 * passed through as a prop, so this boundary does not pull them client-side.
 *
 * It owns the same optimistic clear the sidebar dot does — dismissing the note
 * dispatches RELEASES_SEEN_EVENT and both dots go out in the same frame,
 * rather than waiting on a layout revalidation nobody needs (that would cost
 * roughly ten Neon round trips to clear a dot).
 */
const UnreadContext = createContext(0);

export function UnreadReleasesProvider({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [seenLocally, setSeenLocally] = useState(false);
  // Mirrored during render, not in an effect (the wasDisabled pattern in
  // AdminSidebar): a fresh nonzero count from the server after the next
  // release must re-light the dot, and an effect would do it a paint late.
  const [last, setLast] = useState(count);
  if (last !== count) {
    setLast(count);
    setSeenLocally(false);
  }

  useEffect(() => {
    const clear = () => setSeenLocally(true);
    window.addEventListener(RELEASES_SEEN_EVENT, clear);
    return () => window.removeEventListener(RELEASES_SEEN_EVENT, clear);
  }, []);

  return (
    <UnreadContext.Provider value={seenLocally ? 0 : count}>
      {children}
    </UnreadContext.Provider>
  );
}

/** 0 with no provider, so a stray render or a skeleton degrades rather than
 *  throwing — the footer simply shows no dot. */
export function useUnreadReleases(): number {
  return useContext(UnreadContext);
}
