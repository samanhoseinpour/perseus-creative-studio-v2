'use server';

/**
 * The viewer's own clock: browser auto-detection plus the manual override on
 * /admin/profile.
 *
 * Why this exists at all: every date in the dashboard used to be bucketed in
 * America/Vancouver, and most of the team works from Tehran (+11.5h in
 * summer). The task list defaulted new tasks to yesterday, the digest filed
 * last night's work under "Today", and overdue tints fired a day early.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — both
 * actions resolve getAccessProfile() themselves. Neither takes a user id: they
 * only ever write the CALLER's own row, so there is nothing to authorize
 * beyond being signed in. The zone string is validated through the calendar
 * door before it can be stored, so a malformed value can never reach a
 * formatter (and resolveZone would degrade it to STUDIO_TZ even if it did).
 */
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { getAccessProfile } from '@/lib/adminAccess';
import { isValidTimeZone } from '@/lib/calendar';
import { logError } from '@/lib/log';

export type TimezoneResult = { ok: true } | { ok: false; error: string };

/**
 * Called by TimezoneSync when the browser's zone differs from the stored one.
 * A no-op unless the account is still on auto-follow — a manual pick on
 * /admin/profile has to survive the next page load, and this action runs on
 * every one of them.
 *
 * Revalidates the whole admin layout on a real change: the value feeds the
 * SERVER render of every date on every screen, so the pages already sent have
 * to be rebuilt for the new zone to appear. It fires at most once per zone
 * change (afterwards the stored value matches and the client stops calling),
 * which is why this can't loop.
 */
export async function syncTimezone(tz: string): Promise<TimezoneResult> {
  try {
    const profile = await getAccessProfile();
    if (!profile.timezoneAuto) return { ok: true };
    if (!isValidTimeZone(tz)) return { ok: false, error: 'invalid' };
    if (profile.timezone === tz) return { ok: true };

    await db
      .update(user)
      .set({ timezone: tz })
      .where(eq(user.id, profile.session.user.id));
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (error) {
    logError('[timezone] syncTimezone failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The /admin/profile control. `tz` empty means "follow my device again": the
 * stored zone is left as-is and TimezoneSync corrects it on the next render,
 * so there is never a window where the account has no zone at all.
 */
export async function setTimezone(
  tz: string,
  auto: boolean,
): Promise<TimezoneResult> {
  try {
    const profile = await getAccessProfile();
    if (!auto && !isValidTimeZone(tz)) return { ok: false, error: 'invalid' };

    await db
      .update(user)
      .set(auto ? { timezoneAuto: true } : { timezone: tz, timezoneAuto: false })
      .where(eq(user.id, profile.session.user.id));
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (error) {
    logError('[timezone] setTimezone failed', error);
    return { ok: false, error: 'server' };
  }
}
