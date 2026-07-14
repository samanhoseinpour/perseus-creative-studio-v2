import 'server-only';
import { get } from '@vercel/blob';

import { getAccessProfile } from '@/lib/adminAccess';
import { getUserAvatarPath } from '@/db/adminQueries';
import { isUploadedAvatarPath } from '@/lib/avatarPaths';

/**
 * Streams an admin's uploaded profile photo — a PRIVATE Vercel Blob (no
 * public URL), same skeleton as the resume/screenshot routes.
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * resolves the caller's access profile itself. Any signed-in admin may fetch
 * any admin's avatar: the only cross-user surface (/admin/users) is
 * superadmin-gated, and between admins a profile photo isn't sensitive. The
 * blob pathname is read from the user row (never taken from the URL), and
 * only `avatars/`-prefixed values are streamed — a self-set rogue
 * `user.image` can't turn this into a proxy for arbitrary blobs.
 *
 * Cache-Control deviates from the siblings' `no-store` ON PURPOSE: the
 * resolver emits this URL with a ?v= hashed from the stored pathname, which
 * changes on every upload (uuid + addRandomSuffix) — the URL is effectively
 * content-addressed, and the sidebar renders it on every admin page, so it
 * gets long-lived private immutable caching instead of a re-stream per nav.
 * (The route itself ignores `v`; it only exists to bust the browser cache.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  await getAccessProfile();
  const { userId } = await params;

  // user.id is a text PK (Better Auth 32-char id, not a uuid) — an arbitrary
  // string can't 500 on a cast, so a shape check would only duplicate the
  // parameterized lookup's miss path.
  const image = await getUserAvatarPath(userId);
  if (!isUploadedAvatarPath(image)) {
    return new Response('Not found', { status: 404 });
  }

  const result = await get(image, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Length': String(result.blob.size),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
