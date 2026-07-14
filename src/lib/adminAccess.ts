import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { requireAdmin } from '@/lib/adminSession';
import {
  ADMIN_AREAS,
  sanitizeAreas,
  type AdminArea,
} from '@/lib/adminAreas';

export { ADMIN_AREAS };
export type { AdminArea };

/**
 * The authorization seam. Authentication (who you are) comes from the
 * cookie-cached Better Auth session via requireAdmin(); authorization (what
 * you may open) is read FRESH from the user row on every request, so a toggle
 * flipped on /admin/users takes effect on the target's next navigation — none
 * of the session cookie-cache's 5-minute staleness applies to permissions.
 *
 * `role` is 'superadmin' | 'member'. Superadmins (the seed roster, set by
 * migration backfill — never promotable from the app) hold every grantable
 * area plus the superadmin-only surfaces (/admin/users, /admin/database and
 * ticket triage). Members hold exactly their granted `areas`.
 */
export type AccessProfile = {
  session: Awaited<ReturnType<typeof requireAdmin>>;
  superadmin: boolean;
  /** Effective grants — superadmins get every area. */
  areas: AdminArea[];
  /**
   * Fresh `user.image` (the uploaded-avatar blob pathname, or null). Avatars
   * must resolve from THIS value, never from the cookie-cached
   * `session.user.image` — otherwise a just-saved photo lags the 5-minute
   * cache window. Rides the same PK lookup as role/areas: zero extra queries.
   */
  image: string | null;
};

/**
 * Session + fresh authorization row, deduped per request (React cache() — the
 * layout, page, and any nested gate share one PK lookup within an RSC pass;
 * a server action pays one extra select, which is fine).
 *
 * A missing user row means the account was deleted while its signed session
 * cookie is still inside the cookie-cache window — treat exactly like signed
 * out. Every protected page, server action, and route handler must resolve
 * through this profile (or a gate below); none may stop at requireAdmin().
 */
export const getAccessProfile = cache(async (): Promise<AccessProfile> => {
  const session = await requireAdmin();
  const [row] = await db
    .select({ role: user.role, areas: user.areas, image: user.image })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row) redirect('/admin/login');

  const superadmin = row.role === 'superadmin';
  return {
    session,
    superadmin,
    areas: superadmin ? [...ADMIN_AREAS] : sanitizeAreas(row.areas),
    image: row.image ?? null,
  };
});

/** Whether this profile may open the given grantable area. */
export function canAccessArea(
  profile: AccessProfile,
  area: AdminArea,
): boolean {
  return profile.superadmin || profile.areas.includes(area);
}

/**
 * The submission kinds this profile may read/triage — the inbox areas mapped
 * onto contact_submissions.kind (inquiries → 'project', applications →
 * 'career'). Feed this to the kind-scoped queries in @/db/adminQueries.
 */
export function visibleKinds(
  profile: AccessProfile,
): ('project' | 'career')[] {
  const kinds: ('project' | 'career')[] = [];
  if (canAccessArea(profile, 'inquiries')) kinds.push('project');
  if (canAccessArea(profile, 'applications')) kinds.push('career');
  return kinds;
}

/**
 * Gate for superadmin-only surfaces (/admin/users and its actions,
 * /admin/database, ticket triage). Signed-out → login; a signed-in member is
 * bounced to `redirectTo` — pass the closest page they ARE allowed to see.
 */
export async function requireSuperadmin(
  redirectTo = '/admin',
): Promise<AccessProfile> {
  const profile = await getAccessProfile();
  if (!profile.superadmin) redirect(redirectTo);
  return profile;
}

/**
 * Gate for area-granted pages/mutations/streams. Returns the whole profile so
 * callers get `session.user` and the `superadmin` flag from the same lookup
 * (e.g. tickets pages derive triager rights from it).
 */
export async function requireArea(
  area: AdminArea,
  redirectTo = '/admin',
): Promise<AccessProfile> {
  const profile = await getAccessProfile();
  if (!canAccessArea(profile, area)) redirect(redirectTo);
  return profile;
}
