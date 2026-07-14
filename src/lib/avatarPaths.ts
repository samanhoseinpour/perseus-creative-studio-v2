/**
 * Shared predicates for uploaded admin profile photos — the single source of
 * truth for the private-blob prefix the upload action writes under and the
 * streaming URL those blobs are served from. Deliberately dependency-free and
 * client-safe: the server resolver/action/route AND the client <AdminAvatar>
 * all key off these, so the allowlist can't drift between them.
 *
 * SECURITY: `user.image` is a Better Auth-native field, so any signed-in
 * member can set it to an arbitrary string through the public
 * /api/auth/update-user endpoint. Everything that renders, streams, or
 * deletes an avatar therefore honors ONLY pathnames matching the exact shape
 * our action writes (AVATAR_PATH_RE below) — anything else falls through to
 * the roster/initials fallbacks and is never streamed or deleted.
 */
export const AVATAR_BLOB_PREFIX = 'avatars/';
export const AVATAR_URL_PREFIX = '/admin/avatars/';

/**
 * The exact shape the upload action writes: `avatars/<uuid>-<suffix>.<ext>` —
 * ONE further path segment, safe charset, leading alphanumeric. A strict
 * match (not a bare startsWith) on purpose: the blob SDK's URL parser
 * normalizes dot-segments, so a self-set `avatars/../resumes/…` would escape
 * the namespace and turn the streaming route into a proxy for (and the
 * best-effort del()s into a deleter of) blobs outside it.
 */
const AVATAR_PATH_RE = /^avatars\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** True when a stored `user.image` is a blob pathname our upload action wrote. */
export function isUploadedAvatarPath(
  image: string | null | undefined,
): image is string {
  return typeof image === 'string' && AVATAR_PATH_RE.test(image);
}

/** True when a resolved avatar `src` is the streaming route (not /images/...). */
export function isAvatarUrl(src: string): boolean {
  return src.startsWith(AVATAR_URL_PREFIX);
}

/**
 * The streaming URL for a user's uploaded avatar. `version` derives from the
 * stored pathname (which changes on every upload — uuid + random suffix), so
 * the URL is content-addressed and the route can serve long-lived immutable
 * caching: a new upload mints a new URL instead of invalidating the old one.
 */
export function adminAvatarUrl(userId: string, version: string): string {
  return `${AVATAR_URL_PREFIX}${encodeURIComponent(userId)}?v=${version}`;
}
