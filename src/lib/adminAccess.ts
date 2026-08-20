import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { resolveZone } from '@/lib/calendar';
import { user } from '@/db/auth-schema';
import { payrollMembers } from '@/db/schema';
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
 * area plus the superadmin-only surfaces (/admin/users and ticket triage).
 * Members hold exactly their granted `areas`.
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
  /**
   * This account's payroll member row id, or null when they have none. Rides the
   * same lookup as a LEFT JOIN — on neon-http every query is its own HTTPS round
   * trip, so folding it in here costs nothing while a separate select would cost
   * a full round trip on every protected render.
   *
   * Its presence is NOT permission on its own: see payrollSelf.
   */
  payrollMemberId: string | null;
  /**
   * Whether this account may open its own pay history (/admin/my-pay). True only
   * when a payroll member row exists AND its self_view_enabled flag is set —
   * the switch the payroll admin controls, so someone can be tracked and paid
   * before (or without) the history being exposed to them.
   *
   * Says nothing about seeing anyone ELSE's pay; that is requirePayrollAdmin().
   */
  payrollSelf: boolean;
  /**
   * This account's own clock (IANA), or null when it has never been detected.
   * Derived from the browser, never chosen — there is no manual override.
   * Prefer `viewerZone()` below, which resolves the null and validates the
   * string, over reading this directly.
   */
  timezone: string | null;
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
    .select({
      role: user.role,
      areas: user.areas,
      image: user.image,
      timezone: user.timezone,
      // payroll_members.user_id is UNIQUE, so this join stays 1:1 and cannot
      // fan the row out.
      payrollMemberId: payrollMembers.id,
      payrollSelfView: payrollMembers.selfViewEnabled,
    })
    .from(user)
    .leftJoin(payrollMembers, eq(payrollMembers.userId, user.id))
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row) redirect('/admin/login');

  const superadmin = row.role === 'superadmin';
  return {
    session,
    superadmin,
    areas: superadmin ? [...ADMIN_AREAS] : sanitizeAreas(row.areas),
    image: row.image ?? null,
    payrollMemberId: row.payrollMemberId ?? null,
    // Deliberately NOT `superadmin ||` — this is "can I see MY pay", and a
    // superadmin without a payroll member row has no own pay to see.
    payrollSelf: Boolean(row.payrollMemberId && row.payrollSelfView),
    timezone: row.timezone ?? null,
  };
});

/**
 * The zone every date on a signed-in render is bucketed in — the ONE call site
 * that turns a stored preference into a usable timezone. Rides
 * getAccessProfile's cache(), so the list page, its server actions, and any
 * nested section share a single resolution.
 *
 * Falls back to STUDIO_TZ for an account that has never been detected, so a
 * fresh row renders sensibly rather than throwing (see resolveZone).
 */
export const viewerZone = cache(
  async (): Promise<string> => resolveZone((await getAccessProfile()).timezone),
);

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
 * Gate for superadmin-only surfaces (/admin/users and its actions, ticket
 * triage). Signed-out → login; a signed-in member is
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

/* -------------------------------------------------------------------------- */
/* Payroll                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Gate for the payroll admin surfaces — /admin/payroll and every payroll action,
 * route handler, and export. Seeing one member's salary means seeing the roster,
 * so this is all-or-nothing.
 *
 * Currently superadmin, per Saman's call, and deliberately its own named gate
 * rather than a bare requireSuperadmin() at ~30 call sites: narrowing payroll to
 * a single person later (a payroll_admin column, granted by SQL the way
 * superadmin promotion already is) is then one edit here instead of a sweep.
 *
 * NOT a grantable area: appending 'payroll' to ADMIN_AREAS would land it in
 * DEFAULT_AREAS, which is "everything except reports", and pre-tick payroll for
 * every account created from the add-user dialog.
 */
export async function requirePayrollAdmin(
  redirectTo = '/admin',
): Promise<AccessProfile> {
  return requireSuperadmin(redirectTo);
}

/**
 * The payroll-admin rule as a predicate, for the one caller that needs to ASK
 * rather than enforce (requirePayrollAccess serves both audiences, so it can't
 * redirect on a failed admin check). It exists so that rule lives in exactly one
 * place: narrowing payroll to a payroll_admin column means editing this and
 * requirePayrollAdmin together, and nothing else silently keeps the old answer.
 */
export function isPayrollAdmin(profile: AccessProfile): boolean {
  return profile.superadmin;
}

/** Whether this profile may open its own pay history. */
export function canSeeOwnPayroll(profile: AccessProfile): boolean {
  return profile.payrollSelf;
}

/**
 * Gate for the member self-view (/admin/my-pay). Returns the member id alongside
 * the profile so callers scope their query by a SESSION-DERIVED id and never by
 * anything off the URL — the one rule that keeps one member's figures away from
 * another's page.
 *
 * A member without a payroll row, or with self-view switched off, is bounced to
 * /admin rather than shown an empty page: "you have no pay records" is itself
 * information about the payroll.
 */
export async function requireOwnPayroll(
  redirectTo = '/admin',
): Promise<{ profile: AccessProfile; memberId: string }> {
  const profile = await getAccessProfile();
  if (!profile.payrollSelf || !profile.payrollMemberId) redirect(redirectTo);
  return { profile, memberId: profile.payrollMemberId };
}

/**
 * Combined gate for a surface that serves both audiences — the payslip, which a
 * payroll admin opens for anyone and a member opens for themselves. Returns
 * whether the viewer is the owner so the page can hide admin-only fields
 * (wire refs, internal notes) from the member's own copy.
 */
export async function requirePayrollAccess(
  memberId: string,
  redirectTo = '/admin',
): Promise<{ profile: AccessProfile; payrollAdmin: boolean; own: boolean }> {
  const profile = await getAccessProfile();
  const own = profile.payrollSelf && profile.payrollMemberId === memberId;
  const payrollAdmin = isPayrollAdmin(profile);
  if (!payrollAdmin && !own) redirect(redirectTo);
  return { profile, payrollAdmin, own };
}
