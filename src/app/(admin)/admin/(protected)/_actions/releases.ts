'use server';

/**
 * Marking "what's new" as read.
 *
 * SECURITY: takes NO arguments. The version written is read from the registry
 * server-side, so a client cannot forge a watermark — the same shape as
 * /admin/presence, which "can only stamp the caller's own row" because it
 * carries no body and no user id. The protected layout's guard does not wrap
 * server actions, so this resolves getAccessProfile() itself; there is nothing
 * further to authorize, since it only ever writes the caller's own row.
 *
 * MONOTONIC. The watermark may only move forward. A tab left open across a
 * deploy holds the OLD CURRENT_VERSION in its payload, and a dismissal from it
 * must not drag a member back to a version they have already passed. The guard
 * lives in JS rather than SQL because Postgres cannot order a semver text
 * column ('1.10.0' < '1.9.0' as text), and the profile is already resolved
 * here so the comparison is free.
 *
 * NO ACTIVITY ROW. Reading a changelog is not an auditable act, and a row per
 * member per release would bury every other domain in the global feed — the
 * same reason routine task edits stay out of it.
 *
 * NO revalidatePath. Rebuilding the admin layout to clear one dot costs its
 * five count queries plus the page's own data — "roughly ten extra Neon round
 * trips for a render you already have". The dialog dispatches
 * RELEASES_SEEN_EVENT instead and AdminSidebar clears its own dot, which is the
 * documented bridge for sibling islands with no shared client parent (the ⌘K
 * palette's open event). The server catches up on the next navigation.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { CURRENT_VERSION } from '@/lib/adminReleases';
import { getAccessProfile } from '@/lib/adminAccess';
import { logError } from '@/lib/log';
import { compareVersions, resolveWatermark } from '@/lib/releaseFields';

export type ReleasesResult = { ok: true } | { ok: false; error: string };

/**
 * Advance this member's watermark to the newest shipped release.
 *
 * Called from every close of the notice dialog — "Got it", Escape, the overlay
 * and the ✕ alike. A changelog asks you to READ something, so closing it is
 * the completion of the interaction, not a dismissal of an ask (which is why
 * PasskeyPrompt snoozes on close and this does not).
 */
export async function markReleasesSeen(): Promise<ReleasesResult> {
  // Gate OUTSIDE the try: getAccessProfile() signals "signed out" by calling
  // redirect(), which throws NEXT_REDIRECT. Caught, it would be logged as a
  // server fault and returned as { ok: false } instead of bouncing to login.
  const profile = await getAccessProfile();

  try {
    // resolveWatermark, not the raw column: a null here means "clean slate",
    // which is already CURRENT_VERSION, so there is nothing to write.
    const seen = resolveWatermark(profile.releaseSeenVersion);
    if (compareVersions(CURRENT_VERSION, seen) <= 0) return { ok: true };

    await db
      .update(user)
      .set({ releaseSeenVersion: CURRENT_VERSION })
      .where(eq(user.id, profile.session.user.id));
    return { ok: true };
  } catch (error) {
    logError('[releases] markReleasesSeen failed', error);
    return { ok: false, error: 'server' };
  }
}
