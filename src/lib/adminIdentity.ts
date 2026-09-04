import 'server-only';
import { createHash } from 'node:crypto';

import { PERSEUS_LOGO } from '@/constants';
import { blurFor } from '@/lib/imageBlur';
import { adminAvatarUrl, isUploadedAvatarPath } from '@/lib/avatarPaths';

/**
 * Admin identity → avatar resolution.
 *
 * An admin who uploaded a profile photo (/admin/profile) gets that; everyone
 * else falls back to the public /about Team grid bridges below.
 * The admins who are on the roster map by email (ADMIN_TEAM_ROLE) to their
 * public team photo, the same `/images/blogs/authors/blogs-authors-<slug>.avif`
 * path as that member's `TEAM_MEMBERS.avatar`, so the two stay in lockstep and
 * no schema migration is needed. Members without a roster entry bridge by
 * normalized ACCOUNT NAME through TEAM_PHOTO_BY_NAME instead (accounts are
 * created by superadmins from /admin/users, email unknown here).
 *
 * Admins with no roster entry resolve to `null` here and fall back to an
 * initials monogram in the UI — except the org account(s) below, which carry
 * the Perseus wordmark as a brand chip instead of a person photo.
 */
/** The two rostered accounts: their public team photo and role. The photos
 *  are the same /images paths the old BLOG_AUTHORS carried (so blurFor still
 *  resolves) and the roles are their public Team roles. Inlined rather than
 *  read from blog_authors: these helpers are synchronous per-render
 *  formatters and the dashboard must not depend on the blog store. */
const ADMIN_TEAM_ROLE: Record<string, { photo: string; role: string }> = {
  'samangithoseinpour@gmail.com': {
    photo: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
    role: 'Co-Founder & CTO',
  },
  'aryangh1a@gmail.com': {
    photo: '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
    role: 'Founder & CEO',
  },
};

/**
 * Name → team photo bridge for members with no ADMIN_TEAM_ROLE entry. Keys are
 * normalized account names — lowercase, collapsed whitespace — including
 * known spelling variants (the photo slugs use one spelling, the roster copy
 * another); values are the TEAM_MEMBERS avatar paths. Keep in lockstep with
 * TEAM_MEMBERS in src/constants/about.ts, which is deliberately NOT imported:
 * it drags react-icons and the marketing /about content into the admin server
 * graph for the sake of seven strings. A renamed account simply falls back to
 * initials (or an uploaded photo, which always wins).
 */
const TEAM_PHOTO_BY_NAME: Record<string, string> = {
  'aryan ghasemi': '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
  'saman hoseinpour':
    '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
  'arshia farahi': '/images/blogs/authors/blogs-authors-arshia-farahi.avif',
  'arshia farrahi': '/images/blogs/authors/blogs-authors-arshia-farahi.avif',
  'sepehr barzegari':
    '/images/blogs/authors/blogs-authors-sepehr-barzegari.avif',
  'sajjad hoseinpour':
    '/images/blogs/authors/blogs-authors-sajad-hoseinpour.avif',
  'sajad hoseinpour':
    '/images/blogs/authors/blogs-authors-sajad-hoseinpour.avif',
  'mehdi ebrahimi': '/images/blogs/authors/blogs-authors-mehdi-ebrahimi.avif',
  'stevens mai': '/images/blogs/authors/blogs-authors-stevens-mai.avif',
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Shared org accounts that aren't a person on the roster — branded, not initials. */
const ADMIN_ORG_ACCOUNTS = new Set(['info@perseustudio.com']);

/**
 * Whether an account is the studio itself rather than a teammate. Surfaces
 * that list PEOPLE (the leaderboard's roster) exclude these: a shared inbox
 * login has no standing of its own and only pads the list.
 */
export function isOrgAccount(email: string): boolean {
  return ADMIN_ORG_ACCOUNTS.has(email.toLowerCase());
}

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
 *   2. roster email → team photo (+ its blur-up placeholder).
 *   3. normalized account name → team photo (+ blur) — members who aren't
 *      blog authors (Mehdi, Sepehr, Sajjad, Stevens, Arshia's admin account).
 *   4. org account → the Perseus wordmark as a brand chip (`mark: true`).
 *   5. `null` → caller renders an initials monogram.
 *
 * IMPORTANT: pass the FRESH image (AccessProfile.image or a DB row), not the
 * cookie-cached `session.user.image` — see getAccessProfile.
 */
export function resolveAdminAvatar(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}): AdminAvatar {
  if (isUploadedAvatarPath(user.image)) {
    return { src: adminAvatarUrl(user.id, avatarVersion(user.image)) };
  }

  const email = user.email.toLowerCase();
  const rostered = ADMIN_TEAM_ROLE[email];
  if (rostered) return { src: rostered.photo, blur: blurFor(rostered.photo) };

  const photo = TEAM_PHOTO_BY_NAME[normalizeName(user.name)];
  if (photo) return { src: photo, blur: blurFor(photo) };

  // The org account isn't a person, so it gets the brand wordmark
  // (black-on-transparent, no blur entry — same asset as the sidebar mark).
  // `mark` tells AdminAvatar to contain it on a chip rather than face-crop it.
  if (ADMIN_ORG_ACCOUNTS.has(email)) return { src: PERSEUS_LOGO, mark: true };

  return null;
}

/**
 * Role label for an admin, shown in place of a generic "Admin" badge. Rostered
 * members reuse their public Team role (`ADMIN_TEAM_ROLE[email].role`, e.g.
 * "Co-Founder & CTO"); the org / unmapped accounts (info@) fall back to a plain
 * "Administrator". Reuses the same email bridge as the avatar, so there's
 * no role column to migrate. Server-only — never import into a client component.
 */
export function resolveAdminRole(user: { email: string }): string {
  return ADMIN_TEAM_ROLE[user.email.toLowerCase()]?.role ?? 'Administrator';
}
