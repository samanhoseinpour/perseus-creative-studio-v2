import 'server-only';
import { createHash } from 'node:crypto';

import { BLOG_AUTHORS } from '@/constants/blogs';
import { PERSEUS_LOGO } from '@/constants';
import { blurFor } from '@/lib/imageBlur';
import { adminAvatarUrl, isUploadedAvatarPath } from '@/lib/avatarPaths';

/**
 * Admin identity → avatar resolution.
 *
 * An admin who uploaded a profile photo (/admin/profile) gets that; everyone
 * else falls back to the public /about Team grid bridge below.
 * The admins who are on the roster map by email → blog-author slug; the author
 * record's `imageUrl` is byte-identical to that member's `TEAM_MEMBERS.avatar`
 * (both `/images/blogs/authors/blogs-authors-<slug>.avif`), so reusing it keeps
 * the two in lockstep for free and needs no schema migration.
 *
 * Admins with no roster entry resolve to `null` here and fall back to an
 * initials monogram in the UI — except the org account(s) below, which carry
 * the Perseus wordmark as a brand chip instead of a person photo.
 */
const ADMIN_TEAM_SLUG: Record<string, string> = {
  'samangithoseinpour@gmail.com': 'saman-hoseinpour',
  'aryangh1a@gmail.com': 'aryan-ghasemi',
};

/** Shared org accounts that aren't a person on the roster — branded, not initials. */
const ADMIN_ORG_ACCOUNTS = new Set(['info@perseustudio.com']);

export type AdminAvatar = {
  src: string;
  blur?: string;
  /** Brand wordmark, not a photo — the UI renders it contained on a chip. */
  mark?: boolean;
} | null;

/**
 * Short content-derived version for the avatar streaming URL. The stored
 * pathname changes on every upload (uuid + addRandomSuffix), so its hash is a
 * free cache-buster; hashing (vs. exposing the raw suffix) keeps the
 * non-guessable blob key out of URLs and logs.
 */
function avatarVersion(pathname: string): string {
  return createHash('sha256').update(pathname).digest('hex').slice(0, 8);
}

/**
 * Resolve the avatar for an admin user as slim props for `<AdminAvatar>`.
 * Precedence:
 *   1. uploaded photo — `user.image` holds the PRIVATE blob pathname written
 *      by the profile photo action, emitted as the /admin/avatars/<id>?v=…
 *      streaming URL (no blur: uploaded blobs have no build-time LQIP).
 *      ONLY `avatars/`-prefixed values are honored: `image` is a Better
 *      Auth-native field any signed-in member can set to an arbitrary string
 *      via the public /api/auth/update-user endpoint, and rendering it raw
 *      would let one admin wear another's /images/... team photo (or point at
 *      an external URL). Anything else falls through to the roster below.
 *   2. roster email → author slug → author photo (+ its blur-up placeholder).
 *   3. org account → the Perseus wordmark as a brand chip (`mark: true`).
 *   4. `null` → caller renders an initials monogram.
 *
 * IMPORTANT: pass the FRESH image (AccessProfile.image or a DB row), not the
 * cookie-cached `session.user.image` — see getAccessProfile.
 */
export function resolveAdminAvatar(user: {
  id: string;
  email: string;
  image?: string | null;
}): AdminAvatar {
  if (isUploadedAvatarPath(user.image)) {
    return { src: adminAvatarUrl(user.id, avatarVersion(user.image)) };
  }

  const email = user.email.toLowerCase();
  const slug = ADMIN_TEAM_SLUG[email];
  const src = slug ? BLOG_AUTHORS[slug]?.imageUrl : undefined;
  if (src) return { src, blur: blurFor(src) };

  // The org account isn't a person, so it gets the brand wordmark
  // (black-on-transparent, no blur entry — same asset as the sidebar mark).
  // `mark` tells AdminAvatar to contain it on a chip rather than face-crop it.
  if (ADMIN_ORG_ACCOUNTS.has(email)) return { src: PERSEUS_LOGO, mark: true };

  return null;
}

/**
 * Role label for an admin, shown in place of a generic "Admin" badge. Rostered
 * members reuse their public Team role (`BLOG_AUTHORS[slug].role`, e.g.
 * "Co-Founder & CTO"); the org / unmapped accounts (info@) fall back to a plain
 * "Administrator". Reuses the same email→slug bridge as the avatar, so there's
 * no role column to migrate. Server-only — never import into a client component.
 */
export function resolveAdminRole(user: { email: string }): string {
  const slug = ADMIN_TEAM_SLUG[user.email.toLowerCase()];
  return (slug ? BLOG_AUTHORS[slug]?.role : undefined) ?? 'Administrator';
}
