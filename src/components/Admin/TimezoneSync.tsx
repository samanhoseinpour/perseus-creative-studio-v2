'use client';

import { startTransition, useEffect, useRef } from 'react';

import { syncTimezone } from '@/app/(admin)/admin/(protected)/_actions/timezone';

/**
 * Keeps `user.timezone` matching the browser's, so every server-rendered date
 * in the dashboard lands on the day the reader is actually living in.
 *
 * Renders nothing and, in the overwhelmingly common case, does nothing: it
 * fires only when the detected zone differs from the stored one, which happens
 * on a new account, after a move, or the first time someone signs in from a
 * different country. The action revalidates the admin layout, after which
 * `stored` matches and this stops calling — so it cannot loop.
 *
 * Checked on mount AND on tab refocus. A relocation does not hand us a fresh
 * document: the machine sleeps in one zone and wakes in another with the tab
 * still open, and App Router navigations never remount this layout.
 *
 * This is the ONLY writer of the zone; there is no manual override anywhere
 * (see _actions/timezone.ts for why). `resolvedOptions().timeZone` reads the
 * OPERATING SYSTEM's zone, not the network's, so it follows a real move and is
 * unmoved by a VPN.
 *
 * Detection, not correction, is the client's whole job here. The VALUE is
 * stored server-side rather than read per render in the browser because the
 * dates it decides are computed on the server, over DB rows — the greeting's
 * pure client approach (src/lib/greeting.ts) works there only because a
 * salutation has no data behind it.
 */
export default function TimezoneSync({
  stored,
}: {
  /** The zone currently on the user row, or null when never detected. */
  stored: string | null;
}) {
  // Guards a write in flight, NOT "already ran once": a latched flag would
  // mean a failed sync never retried for the life of the document.
  const inFlight = useRef(false);

  useEffect(() => {
    const check = () => {
      if (inFlight.current) return;
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected || detected === stored) return;
      inFlight.current = true;
      // In a transition so React applies the RSC payload the action returns —
      // syncTimezone revalidates the admin layout, and that re-render is how
      // the dates on THIS page correct themselves instead of waiting for the
      // next navigation. No router.refresh() alongside it: the house rule is
      // that a revalidating action propagates on its own, and doing both
      // re-renders the tree twice.
      //
      // Fire-and-forget beyond that: a failed sync is a stale date, not a
      // broken page, and the checks below retry it. The action logs its own
      // failures. Nothing here is worth a toast — nobody asked for it.
      //
      // The .catch() is what makes that true rather than merely intended:
      // .finally() re-throws, so without it a transport-level rejection —
      // offline, or a deploy that changed this action's id while the tab sat
      // open — became an unhandled rejection. Swallow it and let the refocus
      // check retry, which it can because inFlight is cleared either way.
      startTransition(() => {
        void syncTimezone(detected)
          .catch(() => {})
          .finally(() => {
            inFlight.current = false;
          });
      });
    };

    check();

    // A relocation does not come with a fresh document. The laptop sleeps in
    // Vancouver and wakes in Madrid with the tab still open, and App Router
    // navigations are client-side, so this layout never remounts — without
    // these listeners the new zone would wait for a hard reload. Re-checking on
    // refocus costs one Intl read and writes only when the zone really moved.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [stored]);

  return null;
}
