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
import { logActivity } from '@/lib/activityLog';
import { AVATAR_BLOB_PREFIX, isUploadedAvatarPath } from '@/lib/avatarPaths';
import { logError } from '@/lib/log';
import {
  AVATAR_BAD_TYPE,
  AVATAR_TOO_LARGE,
  MAX_AVATAR_PIXELS,
  avatarProblem,
} from '@/lib/avatarFields';
import {
  SCREENSHOT_MIME,
  sniffImageDimensions,
  sniffScreenshotKind,
} from '@/lib/ticketFields';

export type AvatarActionResult = { ok: true } | { ok: false; error: string };

export async function updateAvatar(
  formData: FormData,
): Promise<AvatarActionResult> {
  const profile = await getAccessProfile();

  try {
    const file = formData.get('avatar');
    const problem = avatarProblem(file);
    if (problem) return { ok: false, error: problem };
    const photo = file as File;

    const kind = await sniffScreenshotKind(photo);
    if (!kind) return { ok: false, error: AVATAR_BAD_TYPE };
    // Decompression-bomb gate: the client reduceAvatar step (512px cover) is
    // skipped by a direct action invocation, and a sub-4 MB PNG can decode to
    // gigapixels in every admin tab that renders it — bound the decoded size
    // from the header before the blob is stored.
    const dims = await sniffImageDimensions(photo, kind);
    if (!dims) return { ok: false, error: AVATAR_BAD_TYPE };
    if (dims.width * dims.height > MAX_AVATAR_PIXELS) {
      return { ok: false, error: AVATAR_TOO_LARGE };
    }

    // The row's CURRENT pathname — the blob this swap must release,
    // regardless of what the cookie-cached session remembers. profile.image
    // IS that fresh read (it rides getAccessProfile's PK select), so a
    // second SELECT of the same column would be a wasted Neon round trip.
    const previous = profile.image;

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

    // Blob pathnames never enter the payload — an avatar path is a private
    // capability like a résumé path, and the denylist refuses it regardless.
    logActivity(profile, {
      area: 'profile',
      entity: 'user',
      entityId: profile.session.user.id,
      entityName: profile.session.user.name,
      action: 'update',
      summary: 'Changed their profile photo',
    });
  } catch (error) {
    logError('[profile] updateAvatar failed', error);
    return { ok: false, error: 'Could not update your photo — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarActionResult> {
  const profile = await getAccessProfile();

  try {
    // profile.image is the fresh PK-read pathname (see updateAvatar).
    const previous = profile.image;
    // Idempotent: nothing uploaded (or a second tab already removed it) is a
    // success, not an error. This branch must STILL revalidate — the caller
    // no longer router.refresh()es, so a stale second tab only heals via the
    // re-rendered tree on this action's own response.
    if (!isUploadedAvatarPath(previous)) {
      revalidatePath('/admin', 'layout');
      return { ok: true };
    }

    await auth.api.updateUser({
      headers: await headers(),
      // null clears the column — update-user only rejects when BOTH name and
      // image are undefined.
      body: { image: null },
    });
    await del(previous).catch(() => {});

    logActivity(profile, {
      area: 'profile',
      entity: 'user',
      entityId: profile.session.user.id,
      entityName: profile.session.user.name,
      action: 'delete',
      summary: 'Removed their profile photo',
    });
  } catch (error) {
    logError('[profile] removeAvatar failed', error);
    return { ok: false, error: 'Could not remove your photo — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
