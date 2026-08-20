'use client';

import { useEffect, useRef } from 'react';

import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence';

/**
 * Tells the server this person is still here, so /admin/users can say "Online"
 * instead of guessing from a token-refresh timestamp.
 *
 * Renders nothing, and does nothing at all while the tab is hidden — that IS
 * the offline signal. Background the tab or close the laptop and the pings
 * stop; five minutes later the roster reads "Last seen 5m ago". A ping while
 * hidden would make presence mean "has a tab open somewhere", which is not
 * what anyone reads a green dot as.
 *
 * Deliberately a plain fetch at a route handler rather than a server action:
 * an action would return an RSC payload for the current page and re-render the
 * whole dashboard every 90 seconds. See the route for the full argument.
 *
 * `keepalive` lets a ping already in flight finish after the tab closes, which
 * is exactly the sighting we most want recorded.
 */
export default function PresenceHeartbeat() {
  // A guard on a request in flight, NOT a latch — a heartbeat that fails must
  // be retried by the next tick, not disabled for the life of the document
  // (the TimezoneSync ref, same reasoning).
  const inFlight = useRef(false);

  useEffect(() => {
    const ping = () => {
      if (inFlight.current) return;
      if (document.visibilityState !== 'visible') return;
      inFlight.current = true;
      fetch('/admin/presence', {
        method: 'POST',
        keepalive: true,
        // No cookies to send explicitly — same-origin default already carries
        // the session. cache: 'no-store' so a POST is never coalesced.
        cache: 'no-store',
      })
        // The body is discarded: the answer is always ok and nothing on screen
        // depends on it. A failure is a stale dot, so it dies here rather than
        // reaching the console every 90 seconds.
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    };

    ping();
    const id = setInterval(ping, PRESENCE_HEARTBEAT_MS);

    // Refocus fires an immediate ping instead of waiting out the interval:
    // coming back to a tab that has been hidden for an hour should show you
    // online at once, not up to 90 seconds later. `focus` is kept alongside
    // visibilitychange because a tab can be visible-but-unfocused behind
    // another window, where only `focus` fires on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', ping);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', ping);
    };
  }, []);

  return null;
}
