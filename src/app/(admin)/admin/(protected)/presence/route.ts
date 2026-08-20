import 'server-only';

import { getAccessProfile } from '@/lib/adminAccess';
import { touchUserLastSeen } from '@/db/adminQueries';
import { shouldTouchPresence } from '@/lib/presence';
import { logError } from '@/lib/log';

/**
 * The presence heartbeat. `PresenceHeartbeat` pings this while an admin tab is
 * visible; /admin/users turns the resulting timestamps into "Online" and
 * "Last seen 2h ago".
 *
 * A ROUTE HANDLER, not a server action, and that is the whole design decision.
 * TimezoneSync is the obvious precedent but the wrong one: syncTimezone WANTS
 * its revalidatePath, because the stored zone decides the server render of
 * every date on screen. A presence ping must revalidate nothing — a server
 * action posts at the current route and comes back with an RSC payload for it,
 * so a 90-second heartbeat would re-render the whole dashboard on a timer.
 * This returns fifteen bytes and touches no cache.
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * re-gates itself — the house rule, and the same shape as the avatar/résumé
 * streams. It takes no body and no user id: it can only ever stamp the
 * CALLER's own row, so there is nothing to authorize beyond being signed in
 * (the syncTimezone argument).
 *
 * POST rather than GET because it writes, and because a GET would be fair game
 * for a prefetch or a cache somewhere between here and the browser.
 */
export async function POST() {
  // Outside the try, like every gate in this codebase: getAccessProfile()
  // signals "signed out" by THROWING NEXT_REDIRECT, and swallowing that would
  // turn a bounce to the login page into a silent 200.
  const profile = await getAccessProfile();

  try {
    // The throttle. The profile already carries the stored value (it rides the
    // same PK read the gate above just paid for), so skipping a redundant
    // write costs nothing — no extra query to decide not to query.
    if (shouldTouchPresence(profile.lastSeenAt)) {
      await touchUserLastSeen(profile.session.user.id);
    }
  } catch (error) {
    // A dropped heartbeat is a stale dot, not a broken session. Log it and
    // still answer ok — the client discards the body either way, and a 500
    // here would only produce noise in the browser console every 90 seconds.
    logError('[presence] heartbeat write failed', error);
  }

  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
