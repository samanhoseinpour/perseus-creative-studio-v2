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
  // Strict Mode double-invokes effects in dev; without this the action fires
  // twice on the one render that actually needs it.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === stored) return;
    sent.current = true;
    // In a transition so React applies the RSC payload the action returns —
    // syncTimezone revalidates the admin layout, and that re-render is how the
    // dates on THIS page correct themselves instead of waiting for the next
    // navigation. No router.refresh() alongside it: the house rule is that a
    // revalidating action propagates on its own, and doing both re-renders the
    // tree twice.
    //
    // Fire-and-forget beyond that: a failed sync is a stale date, not a broken
    // page, the next navigation retries it, and the action logs its own
    // failures. Nothing here is worth a toast — the person never asked for it.
    startTransition(() => {
      void syncTimezone(detected);
    });
  }, [stored]);

  return null;
}
