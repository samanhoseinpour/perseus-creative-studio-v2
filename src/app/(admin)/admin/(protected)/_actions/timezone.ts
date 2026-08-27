'use server';

/**
 * The viewer's own clock, detected from the browser.
 *
 * Why this exists: every date in the dashboard used to be bucketed in
 * America/Vancouver, and most of the team works from Tehran (+11.5h in
 * summer). The task list defaulted new tasks to yesterday, the digest filed
 * last night's work under "Today", and overdue tints fired a day early.
 *
 * DERIVED, NEVER CHOSEN. There is deliberately no manual override. The browser
 * reports the OPERATING SYSTEM's zone (ECMA-402 resolves `DateTimeFormat`'s
 * default from the host environment, not from the network — a VPN does not
 * move it), so it already follows a real move: land in Madrid, let the laptop
 * pick up the new zone, and the next /admin render corrects every date. A
 * pinnable setting could only make that WRONG — someone moves, forgets they
 * pinned, and their dates are silently a day off with nothing on screen to
 * explain it. A read-only readout on /admin/profile is the whole surface.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions, so this
 * resolves getAccessProfile() itself. It takes no user id — it only ever
 * writes the CALLER's own row, so there is nothing to authorize beyond being
 * signed in. The zone is validated through the calendar door before it can be
 * stored, and resolveZone would degrade a bad value to STUDIO_TZ even if one
 * got through.
 */
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { getAccessProfile } from '@/lib/adminAccess';
import { isValidTimeZone } from '@/lib/calendar';
import { log } from '@/lib/log';
import { reportError } from '@/lib/monitoringRecord';

export type TimezoneResult = { ok: true } | { ok: false; error: string };

/**
 * Called by TimezoneSync whenever the browser's zone differs from the stored
 * one — a new account, or someone who has moved.
 *
 * Revalidates the whole admin layout on a real change: the value feeds the
 * SERVER render of every date on every screen, so the pages already sent have
 * to be rebuilt for the new zone to appear. It fires at most once per zone
 * change (afterwards the stored value matches and the client stops calling),
 * which is why this cannot loop.
 */
export async function syncTimezone(tz: string): Promise<TimezoneResult> {
  // Gate OUTSIDE the try, like every other action here: getAccessProfile()
  // signals "signed out" by calling redirect(), which works by THROWING
  // NEXT_REDIRECT. Caught, it would be logged as a server fault and returned
  // as { ok: false } instead of bouncing the caller to login.
  const profile = await getAccessProfile();

  try {
    if (profile.timezone === tz) return { ok: true };
    if (!isValidTimeZone(tz)) {
      // Worth a line rather than a silent no-op: with no manual override, a
      // zone this runtime's ICU cannot resolve is the ONE way someone ends up
      // reading studio dates forever with nothing on screen to explain it.
      // Rare enough to be a real signal (a browser ahead of the server's
      // tzdata), and the only way it becomes diagnosable.
      // Capped: `tz` is caller-controlled and this is the ONE branch a value
      // too long for ZONE_RE reaches, so an uncapped log would write the whole
      // string to stdout. scrubContext truncates stacks and queries, not
      // arbitrary context — 64 chars is the longest a real zone can be anyway.
      log('timezone.rejected', {
        userId: profile.session.user.id,
        tz: tz.slice(0, 64),
      });
      return { ok: false, error: 'invalid' };
    }

    await db
      .update(user)
      .set({ timezone: tz })
      .where(eq(user.id, profile.session.user.id));
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (error) {
    reportError('[timezone] syncTimezone failed', error);
    return { ok: false, error: 'server' };
  }
}
