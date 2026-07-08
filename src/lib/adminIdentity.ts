import 'server-only';
import { BLOG_AUTHORS } from '@/constants/blogs';
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
 * Admins with no roster entry (e.g. the `info@perseustudio.com` org account)
 * resolve to `null` here and fall back to an initials monogram in the UI.
 */
const ADMIN_TEAM_SLUG: Record<string, string> = {
  'samangithoseinpour@gmail.com': 'saman-hoseinpour',
  'aryangh1a@gmail.com': 'aryan-ghasemi',
};

export type AdminAvatar = { src: string; blur?: string } | null;

/**
 * Resolve the avatar for an admin user as slim props for `<AdminAvatar>`.
 * Precedence:
 *   1. `user.image` — future-proofs an uploaded avatar (unused today).
 *   2. roster email → author slug → author photo (+ its blur-up placeholder).
 *   3. `null` → caller renders an initials monogram.
 */
export function resolveAdminAvatar(user: {
  email: string;
  image?: string | null;
}): AdminAvatar {
  if (user.image) return { src: user.image, blur: blurFor(user.image) };

  const slug = ADMIN_TEAM_SLUG[user.email.toLowerCase()];
  const src = slug ? BLOG_AUTHORS[slug]?.imageUrl : undefined;
  if (src) return { src, blur: blurFor(src) };

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
