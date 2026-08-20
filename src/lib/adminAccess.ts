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
 * `role` is 'owner' | 'superadmin' | 'member' (role changes happen only via
 * SQL/migration backfill — never through the app, so a total lockout is
 * structurally impossible). The OWNER holds every grantable area implicitly
 * and is the only one who may flip SENSITIVE_AREAS or edit a superadmin's
 * grants. SUPERADMINS hold role privileges (/admin/users, ticket triage, task
 * categories) plus their STORED `areas` — no implicit area access, so the
 * owner can narrow what each of them sees. Members hold exactly their granted
 * `areas`.
 */
export type AccessProfile = {
  session: Awaited<ReturnType<typeof requireAdmin>>;
  /**
   * role === 'owner' — the tier above superadmin. Every area implicitly, and
   * the only profile _actions/users.ts lets edit superadmin grants or flip
   * the sensitive areas. There is exactly one owner, set by migration 0024.
   */
  owner: boolean;
  /**
   * Role privileges: true for BOTH the owner and superadmins, so the existing
   * `profile.superadmin` consumers (users page, ticket triage, task-category
   * CRUD) need no owner-awareness. Says nothing about areas — those are
   * always answered by `areas`/canAccessArea().
   */
  superadmin: boolean;
  /** Effective grants — the owner gets every area; everyone else, stored grants. */
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
  /**
   * When this account was last seen in the admin, or null if never. Rides the
   * same PK read as everything else here — free — and exists on the profile so
   * both server-side presence writers can throttle against it without paying a
   * second lookup. See src/lib/presence.ts.
   */
  lastSeenAt: Date | null;
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
      lastSeenAt: user.lastSeenAt,
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

  const owner = row.role === 'owner';
  const superadmin = owner || row.role === 'superadmin';
  return {
    session,
    owner,
    superadmin,
    // Superadmins read their STORED grants like members — only the owner is
    // implicit-everything. This line is what makes the owner's toggles bite.
    areas: owner ? [...ADMIN_AREAS] : sanitizeAreas(row.areas),
    image: row.image ?? null,
    payrollMemberId: row.payrollMemberId ?? null,
    // Deliberately NOT `superadmin ||` — this is "can I see MY pay", and a
    // superadmin without a payroll member row has no own pay to see.
    payrollSelf: Boolean(row.payrollMemberId && row.payrollSelfView),
    timezone: row.timezone ?? null,
    lastSeenAt: row.lastSeenAt ?? null,
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

/**
 * Whether this profile may open the given grantable area. Only the OWNER
 * bypasses the stored grants (redundant with the materialized `areas`, but
 * explicit) — a superadmin's access here is exactly their chips on
 * /admin/users, which is what lets the owner narrow it.
 */
export function canAccessArea(
  profile: AccessProfile,
  area: AdminArea,
): boolean {
  return profile.owner || profile.areas.includes(area);
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
 * Gate for role-gated surfaces (/admin/users and its actions, ticket triage,
 * task-category CRUD) — passes for superadmins AND the owner. Signed-out →
 * login; a signed-in member is bounced to `redirectTo` — pass the closest
 * page they ARE allowed to see.
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
 * The 'payroll' area grant — a SENSITIVE_AREA, so only the owner can flip it
 * (server-enforced in _actions/users.ts) and it is never in DEFAULT_AREAS.
 * The named gate earned its keep: moving payroll off "every superadmin" onto
 * an owner-controlled grant was this one edit, not a sweep of ~17 call sites.
 */
export async function requirePayrollAdmin(
  redirectTo = '/admin',
): Promise<AccessProfile> {
  const profile = await getAccessProfile();
  if (!isPayrollAdmin(profile)) redirect(redirectTo);
  return profile;
}

/**
 * The payroll-admin rule as a predicate, for the one caller that needs to ASK
 * rather than enforce (requirePayrollAccess serves both audiences, so it can't
 * redirect on a failed admin check). It exists so that rule lives in exactly one
 * place: changing who counts as a payroll admin means editing this, and nothing
 * else silently keeps the old answer.
 */
export function isPayrollAdmin(profile: AccessProfile): boolean {
  return canAccessArea(profile, 'payroll');
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
