import 'server-only';
import { BLOG_AUTHORS } from '@/constants/blogs';
import { PERSEUS_LOGO } from '@/constants';
import { blurFor } from '@/lib/imageBlur';

/**
 * Admin identity → public Team photo bridge.
 *
 * The dashboard shows each admin their avatar, and the requirement is that it's
 * the SAME photo already on the public /about Team grid — no upload pipeline.
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
 * Resolve the avatar for an admin user as slim props for `<AdminAvatar>`.
 * Precedence:
 *   1. `user.image` — future-proofs an uploaded avatar (unused today).
 *   2. roster email → author slug → author photo (+ its blur-up placeholder).
 *   3. org account → the Perseus wordmark as a brand chip (`mark: true`).
 *   4. `null` → caller renders an initials monogram.
 */
export function resolveAdminAvatar(user: {
  email: string;
  image?: string | null;
}): AdminAvatar {
  if (user.image) return { src: user.image, blur: blurFor(user.image) };

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
