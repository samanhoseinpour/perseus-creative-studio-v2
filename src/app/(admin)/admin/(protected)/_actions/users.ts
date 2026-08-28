'use server';

/**
 * Write actions for /admin/users — the role-gated user management page.
 * Reads live in `@/db/adminQueries` (listAdminUsers); these mutations follow
 * the inbox action contract: the gate runs OUTSIDE the try so its redirect
 * throw propagates, failures resolve to `{ ok: false }` (never reject), and
 * every success ends with `revalidatePath('/admin', 'layout')`.
 *
 * SECURITY INVARIANTS (server-side — the UI merely mirrors them):
 * - Every action is `requireSuperadmin()`-gated (owner passes — role
 *   privileges fold the owner in).
 * - No action accepts a `role` — role changes happen only via SQL/migration,
 *   so the owner can never be demoted, deleted, or de-granted from the app
 *   and a total lockout is structurally impossible.
 * - The OWNER row is untouchable by everyone, the owner included.
 * - Superadmin rows are OWNER-managed across the board: area grants, password
 *   resets, and deletion all require the owner (a reset is sign-in-as-them,
 *   so credentials rank with the grants). The owner survives everything the
 *   app can do — reset, delete, and role change are all refused for that row
 *   — so a total lockout stays structurally impossible.
 * - SENSITIVE_AREAS ('payroll', 'costs', 'logs', 'monitoring') can only be granted or revoked by the
 *   owner — on ANY target. A non-owner setUserAreas write carries the STORED
 *   sensitive membership forward regardless of payload (preserve, not
 *   refuse), and the update is compare-and-swapped against the row state it
 *   read, so a concurrent save can't resurrect a revoked grant.
 * - A member HOLDING a sensitive grant is owner-managed: non-owner password
 *   resets and deletes are refused for them (a reset is sign-in-as-them, so
 *   it would otherwise route around the payroll/logs control).
 * - Self-delete is refused by id.
 * - Account creation and password resets ride Better Auth's INTERNAL adapter
 *   (public signup is disabled) — that path skips the HTTP endpoints'
 *   password policy, so the shared zod schemas are the authoritative gate.
 * - User ids are Better Auth's 32-char alphanumerics (NOT uuids — the inbox
 *   UUID_RE doesn't apply); a loose shape check keeps garbage out of queries.
 */
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { isUploadedAvatarPath } from '@/lib/avatarPaths';
import { requireSuperadmin } from '@/lib/adminAccess';
import { CURRENT_VERSION } from '@/lib/releaseFields';
import { logActivity } from '@/lib/activityLog';
import { diff } from '@/lib/activityFields';
import {
  SENSITIVE_AREAS,
  isSensitiveArea,
  sanitizeAreas,
  type AdminArea,
} from '@/lib/adminAreas';
import { createUserSchema, tempPasswordSchema } from '@/lib/usersSchema';
import { flattenAuthIssues } from '@/lib/authSchema';
import { reportError } from '@/lib/monitoringRecord';

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type UserActionResult = { ok: true } | { ok: false; error: string };

export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server'; message: string };

/**
 * The mutation target, or a refusal. Role-based refusals live at the CALL
 * sites — who may touch whom differs per action (the owner edits superadmin
 * grants but nobody resets a superadmin's password), so the shared read stays
 * policy-free and returns the role for the caller to judge.
 */
async function findTarget(
  userId: string,
): Promise<
  | {
      id: string;
      name: string;
      role: string;
      areas: AdminArea[];
      /** The stored jsonb VERBATIM (may hold retired slugs sanitize drops) —
       *  setUserAreas compares against it so its write only lands on the
       *  exact row state this read saw. */
      areasRaw: AdminArea[];
    }
  | { error: string }
> {
  if (!USER_ID_RE.test(userId)) return { error: 'Invalid user.' };
  // name + role + areas ride the existing PK read so the audit row can name
  // who was changed and diff what changed, without a second neon-http round
  // trip.
  const [target] = await db
    .select({
      id: user.id,
      role: user.role,
      name: user.name,
      areas: user.areas,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!target) return { error: 'That account no longer exists.' };
  return {
    id: target.id,
    name: target.name,
    role: target.role,
    areas: sanitizeAreas(target.areas),
    areasRaw: target.areas,
  };
}

/**
 * A member holding an owner-granted sensitive area is an OWNER-MANAGED
 * account: letting a superadmin reset its password (then sign in with the
 * temp value) or delete it would route around the owner-only SENSITIVE_AREAS
 * control through impersonation or destruction. Same rule as the chip flip,
 * enforced at the same layer.
 */
function ownerManaged(areas: AdminArea[]): boolean {
  return areas.some(isSensitiveArea);
}

/**
 * Create a member account with an admin-set temp password and initial area
 * grants — the same internal-adapter path as scripts/seed-admins.mts (signup
 * is disabled). `role`/`areas` are unknown to Better Auth (createUser drops
 * unregistered fields), so the grants are written via drizzle afterwards; if
 * the credential link or that write fails, the half-created user is removed so
 * no passwordless account squats on the email (it could otherwise claim a
 * password through the public forgot-password flow).
 */
export async function createAdminUser(input: {
  name: string;
  email: string;
  password: string;
  areas: AdminArea[];
}): Promise<CreateUserResult> {
  const profile = await requireSuperadmin('/admin');
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      issues: flattenAuthIssues(parsed.error),
    };
  }
  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const areas = sanitizeAreas(parsed.data.areas);
  // Refuse rather than strip: the non-owner UI renders the sensitive chips
  // disabled, so a payload carrying one is not a legitimate submission.
  if (!profile.owner && areas.some(isSensitiveArea)) {
    return {
      ok: false,
      error: 'validation',
      issues: {
        areas:
          'Only the owner can grant payroll, bills, or activity-log access.',
      },
    };
  }

  // Hoisted out of the try so the audit row can name the account that was
  // actually created rather than the one that was requested.
  let createdId: string | null = null;

  try {
    const ctx = await auth.$context;
    const existing = await ctx.internalAdapter.findUserByEmail(email);
    if (existing?.user) {
      return {
        ok: false,
        error: 'validation',
        issues: { email: 'An account with this email already exists.' },
      };
    }

    const hash = await ctx.password.hash(password);
    const created = await ctx.internalAdapter.createUser({
      email,
      name,
      emailVerified: true,
    });
    try {
      await ctx.internalAdapter.linkAccount({
        userId: created.id,
        providerId: 'credential',
        accountId: created.id,
        password: hash,
      });
      // Better Auth's createUser drops fields it doesn't know about, so these
      // are written directly. `releaseSeenVersion` starts a new account at
      // today's release rather than at nothing, so their first sign-in isn't a
      // wall of changelog for a dashboard they have never seen. (The protected
      // layout's after() floor is the backstop if this is ever missed.)
      await db
        .update(user)
        .set({ areas, releaseSeenVersion: CURRENT_VERSION })
        .where(eq(user.id, created.id));
      createdId = created.id;
    } catch (linkError) {
      await ctx.internalAdapter.deleteUser(created.id).catch(() => {});
      throw linkError;
    }
  } catch (error) {
    reportError('[users] createAdminUser failed', error);
    return {
      ok: false,
      error: 'server',
      message: 'Could not create the account. Try again.',
    };
  }

  logActivity(profile, {
    area: 'users',
    entity: 'user',
    entityId: createdId,
    entityName: name,
    action: 'create',
    // The temp password is never referenced here — and would be redacted by
    // the denylist even if a future edit tried to include it.
    summary: `Created the account ${email}`,
    payload: { meta: { areas: areas.join(', ') || 'none' } },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/**
 * Replace an account's area grants. Takes effect on their next navigation —
 * every gate re-reads the row (see getAccessProfile), no session refresh
 * needed. `.returning` guards the edit-vs-delete race: a row that vanished
 * between the target check and the write reports instead of silently "ok".
 *
 * Who may edit whom: the owner edits superadmins and members; superadmins
 * edit members only, and never the SENSITIVE_AREAS. The owner's own row is
 * untouchable — their access is implicit and lives outside `areas` entirely.
 */
export async function setUserAreas(
  userId: string,
  areas: AdminArea[],
): Promise<UserActionResult> {
  const profile = await requireSuperadmin('/admin');
  const target = await findTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };
  if (target.role === 'owner') {
    return { ok: false, error: 'The owner’s access can’t be changed.' };
  }
  if (target.role === 'superadmin' && !profile.owner) {
    return { ok: false, error: 'Superadmin access is managed by the owner.' };
  }
  // A non-owner write is structurally incapable of moving the sensitive pair:
  // whatever the payload says, the stored sensitive membership is carried
  // forward from the fresh row read. Preserve-not-refuse, deliberately — the
  // legit UI renders those chips disabled, so a payload disagreeing with the
  // stored state is either forged (gets nothing) or stale (an ordinary flip
  // that would otherwise wedge behind a misleading payroll error).
  const requested = sanitizeAreas(areas);
  const nextAreas = profile.owner
    ? requested
    : [
        ...requested.filter((area) => !isSensitiveArea(area)),
        ...SENSITIVE_AREAS.filter((area) => target.areas.includes(area)),
      ];

  try {
    // Compare-and-swap on the verbatim stored jsonb: the write lands only on
    // the exact row state the read above saw, so two concurrent editors can't
    // silently clobber each other — in particular a superadmin's in-flight
    // ordinary save can never resurrect a sensitive grant the owner revoked
    // in the same window (neon-http has no transactions to lean on).
    const updated = await db
      .update(user)
      .set({ areas: nextAreas, updatedAt: new Date() })
      .where(and(eq(user.id, target.id), eq(user.areas, target.areasRaw)))
      .returning({ id: user.id });
    if (updated.length === 0) {
      return {
        ok: false,
        error:
          'This account just changed elsewhere. Reload the page and try again.',
      };
    }
  } catch (error) {
    reportError('[users] setUserAreas failed', error);
    return { ok: false, error: 'Update failed. Try again.' };
  }

  // 'grant', not 'update': OWASP names privilege changes as their own class,
  // and they have to stay findable when the log is a year deep.
  logActivity(profile, {
    area: 'users',
    entity: 'user',
    entityId: target.id,
    entityName: target.name,
    action: 'grant',
    summary: `Set ${target.name}'s access to ${nextAreas.join(', ') || 'no areas'}`,
    payload: {
      changes: diff(
        { areas: target.areas.join(', ') },
        { areas: nextAreas.join(', ') },
      ),
    },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/**
 * Set a member a new temp password and revoke their sessions everywhere
 * (updatePassword alone leaves sessions alive). NOTE: passkeys survive a
 * reset by design — offboarding someone means DELETING the account, which
 * cascades passkeys; a reset only re-keys the credential sign-in.
 */
export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<UserActionResult> {
  const profile = await requireSuperadmin('/admin');
  const parsedPassword = tempPasswordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return {
      ok: false,
      error: parsedPassword.error.issues[0]?.message ?? 'Invalid password.',
    };
  }
  const target = await findTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };
  // The owner row is untouchable; superadmin credentials are OWNER-territory
  // (a reset is sign-in-as-them, so it ranks with the role itself); members
  // are manageable by any superadmin — unless they hold an owner-granted
  // sensitive area, which makes them owner-managed too.
  if (target.role === 'owner') {
    return { ok: false, error: 'The owner’s account can’t be reset from here.' };
  }
  if (!profile.owner && target.role === 'superadmin') {
    return { ok: false, error: 'Only the owner can reset a superadmin’s password.' };
  }
  if (!profile.owner && ownerManaged(target.areas)) {
    return {
      ok: false,
      error: 'This account holds owner-granted access, so only the owner can reset it.',
    };
  }

  try {
    const ctx = await auth.$context;
    // updatePassword stores the value as-is — hash first (seed-script parity).
    const hash = await ctx.password.hash(parsedPassword.data);
    await ctx.internalAdapter.updatePassword(target.id, hash);
    await ctx.internalAdapter.deleteUserSessions(target.id);
  } catch (error) {
    reportError('[users] resetUserPassword failed', error);
    return { ok: false, error: 'Reset failed. Try again.' };
  }

  logActivity(profile, {
    area: 'users',
    entity: 'user',
    entityId: target.id,
    entityName: target.name,
    action: 'grant',
    // Records THAT credentials were re-keyed and sessions dropped. The
    // password itself appears nowhere, by construction and by denylist.
    summary: `Reset ${target.name}'s password and revoked their sessions`,
  });

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/**
 * Permanently delete a member account. FK topology already handles the rest:
 * session/account/passkey rows cascade; their tickets survive with
 * reporter_id nulled and the name/email snapshots intact. Their signed
 * session cookie dies on the next gate (missing row → login redirect), so
 * the cookie-cache window never reaches a protected surface.
 */
export async function deleteAdminUser(
  userId: string,
): Promise<UserActionResult> {
  const profile = await requireSuperadmin('/admin');
  if (profile.session.user.id === userId) {
    return { ok: false, error: 'You can’t delete your own account.' };
  }
  const target = await findTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };
  if (target.role === 'owner') {
    return { ok: false, error: 'The owner’s account can’t be deleted.' };
  }
  if (!profile.owner && target.role === 'superadmin') {
    return { ok: false, error: 'Only the owner can delete a superadmin account.' };
  }
  if (!profile.owner && ownerManaged(target.areas)) {
    return {
      ok: false,
      error: 'This account holds owner-granted access, so only the owner can delete it.',
    };
  }

  try {
    const deleted = await db
      .delete(user)
      .where(eq(user.id, target.id))
      .returning({ id: user.id, image: user.image });
    if (deleted.length === 0) {
      return { ok: false, error: 'That account no longer exists.' };
    }
    // Offboarding must not strand an uploaded profile photo — row-first,
    // best-effort blob delete (the inbox idiom).
    if (isUploadedAvatarPath(deleted[0].image)) {
      await del(deleted[0].image).catch(() => {});
    }
  } catch (error) {
    reportError('[users] deleteAdminUser failed', error);
    return { ok: false, error: 'Delete failed. Try again.' };
  }

  // The one row that outlives its subject: entityId still holds the deleted
  // id (the column is plain text with no FK), and entityName snapshots who it
  // was, so offboarding stays answerable after the user row is gone.
  logActivity(profile, {
    area: 'users',
    entity: 'user',
    entityId: target.id,
    entityName: target.name,
    action: 'delete',
    summary: `Deleted the account ${target.name}`,
  });

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
