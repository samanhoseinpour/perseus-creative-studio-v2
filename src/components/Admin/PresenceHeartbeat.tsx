'use client';

import { useEffect, useRef } from 'react';

import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_REQUEST_TIMEOUT_MS,
  canPingNow,
} from '@/lib/presence';

/**
 * A deadline on the request itself, so the promise SETTLES rather than leaving
 * canPingNow to time out around one that never will. Optional because
 * AbortSignal.timeout is newer than the oldest WebKit that can install this
 * dashboard — absent, the guard's own deadline still carries it.
 */
const requestDeadline = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(PRESENCE_REQUEST_TIMEOUT_MS)
    : undefined;

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
  // WHEN the outstanding request began, not WHETHER one is outstanding — and
  // the difference is the whole bug this shape exists to prevent. A boolean
  // here was cleared only in `.finally()`, which never runs if the promise
  // never settles; an iOS Home Screen app frozen at the process level can
  // sever an in-flight fetch exactly that way, and the guard then latched shut
  // for the life of the document. See canPingNow for why a dead heartbeat is a
  // security problem and not just a stale dot.
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const ping = () => {
      const now = Date.now();
      if (
        !canPingNow({
          visible: document.visibilityState === 'visible',
          startedAt: startedAt.current,
          now,
        })
      ) {
        return;
      }
      startedAt.current = now;
      fetch('/admin/presence', {
        method: 'POST',
        keepalive: true,
        // No cookies to send explicitly — same-origin default already carries
        // the session. cache: 'no-store' so a POST is never coalesced.
        cache: 'no-store',
        signal: requestDeadline(),
      })
        // The body is discarded: the answer is always ok and nothing on screen
        // depends on it. The ONE thing read is whether the route bounced us:
        // its gate answers a dead session with a redirect to /admin/login
        // (the 30-day ceiling landing mid-session, or an admin revoking it),
        // which fetch follows silently. Without this the tab sits there
        // looking signed in until the next click fails with a generic
        // "something went wrong". A full navigation, not router.push — the
        // session is gone, so there is nothing of this tree worth keeping.
        //
        // Build the login URL here rather than reusing `res.url`: a bounce
        // answered to this POST must not name the heartbeat route as the
        // return path (signing in would land on a 405 — the proxy now omits
        // `next` for non-navigations, and this side stops trusting it too).
        // The page worth returning to is the one this tab is ON, which the
        // login page re-validates through safeAdminReturnPath like any other.
        .then((res) => {
          if (res.redirected && new URL(res.url).pathname === '/admin/login') {
            const here = `${window.location.pathname}${window.location.search}`;
            window.location.assign(
              `/admin/login?next=${encodeURIComponent(here)}`,
            );
          }
        })
        // A network failure is a stale dot, so it dies here rather than
        // reaching the console every 90 seconds.
        .catch(() => {})
        .finally(() => {
          // Only if it is still OURS. Once the deadline passes, a later tick is
          // allowed to start its own request; this one settling afterwards must
          // not clear the guard out from under it.
          if (startedAt.current === now) startedAt.current = null;
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
    // `pageshow` is the one an INSTALLED app needs. A standalone iOS window
    // resumed from the page cache does not reliably fire visibilitychange or
    // focus, and its interval was paused for however long the process was
    // frozen — so without this the first sighting after a resume waits out a
    // whole tick, or, when the app is restored from the back/forward cache
    // (event.persisted), never comes at all.
    window.addEventListener('pageshow', ping);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', ping);
      window.removeEventListener('pageshow', ping);
    };
  }, []);

  return null;
}
