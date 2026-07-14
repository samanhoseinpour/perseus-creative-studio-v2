'use server';

/**
 * Self-service profile photo actions (upload/replace + remove).
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — both
 * actions resolve getAccessProfile() themselves (any signed-in admin; they
 * only ever act on the caller's own row). The magic-byte sniff — not the
 * filename — decides the stored extension/content-type, like createTicket.
 *
 * Storage rides the house blob conventions (private, addRandomSuffix,
 * pathname-in-DB). Persistence deliberately goes through auth.api.updateUser
 * rather than a direct Drizzle write: Better Auth's update-user endpoint
 * re-signs the 5-minute session cookie cache in the same response (the
 * mechanism DisplayNameForm's client call rides, flushed from server actions
 * by the nextCookies plugin), so the caller's session reflects the new photo
 * immediately — and the fresh `image` read in getAccessProfile covers every
 * other render path.
 *
 * Concurrency: two tabs saving at once is last-write-wins on user.image; the
 * losing swap can strand one blob (private + non-guessable, pennies) — the
 * same accepted trade as every other best-effort del() here.
 */
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';

import { auth } from '@/lib/auth';
import { getAccessProfile } from '@/lib/adminAccess';
import { getUserAvatarPath } from '@/db/adminQueries';
import { AVATAR_BLOB_PREFIX, isUploadedAvatarPath } from '@/lib/avatarPaths';
import { AVATAR_BAD_TYPE, avatarProblem } from '@/lib/avatarFields';
import { SCREENSHOT_MIME, sniffScreenshotKind } from '@/lib/ticketFields';

export type AvatarActionResult = { ok: true } | { ok: false; error: string };

export async function updateAvatar(
  formData: FormData,
): Promise<AvatarActionResult> {
  const profile = await getAccessProfile();
  const userId = profile.session.user.id;

  try {
    const file = formData.get('avatar');
    const problem = avatarProblem(file);
    if (problem) return { ok: false, error: problem };
    const photo = file as File;

    const kind = await sniffScreenshotKind(photo);
    if (!kind) return { ok: false, error: AVATAR_BAD_TYPE };

    // The row's CURRENT pathname (fresh PK read) — the blob this swap must
    // release, regardless of what the cookie-cached session remembers.
    const previous = await getUserAvatarPath(userId);

    const blob = await put(
      `${AVATAR_BLOB_PREFIX}${crypto.randomUUID()}.${kind}`,
      photo,
      {
        access: 'private',
        addRandomSuffix: true,
        contentType: SCREENSHOT_MIME[kind],
      },
    );

    try {
      await auth.api.updateUser({
        headers: await headers(),
        body: { image: blob.pathname },
      });
    } catch (persistError) {
      // Don't strand the new blob when the row never pointed at it.
      await del(blob.pathname).catch(() => {});
      throw persistError;
    }

    // Old blob is unreferenced now — best-effort, row-first (inbox idiom).
    if (isUploadedAvatarPath(previous)) await del(previous).catch(() => {});
  } catch (error) {
    console.error('[profile] updateAvatar failed', error);
    return { ok: false, error: 'Could not update your photo — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarActionResult> {
  const profile = await getAccessProfile();
  const userId = profile.session.user.id;

  try {
    const previous = await getUserAvatarPath(userId);
    // Idempotent: nothing uploaded (or a second tab already removed it) is a
    // success, not an error — the caller just refreshes to the fallback.
    if (!isUploadedAvatarPath(previous)) return { ok: true };

    await auth.api.updateUser({
      headers: await headers(),
      // null clears the column — update-user only rejects when BOTH name and
      // image are undefined.
      body: { image: null },
    });
    await del(previous).catch(() => {});
  } catch (error) {
    console.error('[profile] removeAvatar failed', error);
    return { ok: false, error: 'Could not remove your photo — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
