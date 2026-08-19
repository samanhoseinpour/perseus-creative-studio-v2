'use server';

/**
 * Write actions for /admin/users — the superadmin-only user management page.
 * Reads live in `@/db/adminQueries` (listAdminUsers); these mutations follow
 * the inbox action contract: the gate runs OUTSIDE the try so its redirect
 * throw propagates, failures resolve to `{ ok: false }` (never reject), and
 * every success ends with `revalidatePath('/admin', 'layout')`.
 *
 * SECURITY INVARIANTS (server-side — the UI merely mirrors them):
 * - Every action is `requireSuperadmin()`-gated.
 * - No action accepts a `role` — promotion to superadmin happens only via
 *   SQL/migration, so the superadmin set is immutable from the app and a
 *   total-lockout (all superadmins demoted) is structurally impossible.
 * - Superadmin rows can't be edited, reset, or deleted here; self-delete is
 *   refused by id.
 * - Account creation and password resets ride Better Auth's INTERNAL adapter
 *   (public signup is disabled) — that path skips the HTTP endpoints'
 *   password policy, so the shared zod schemas are the authoritative gate.
 * - User ids are Better Auth's 32-char alphanumerics (NOT uuids — the inbox
 *   UUID_RE doesn't apply); a loose shape check keeps garbage out of queries.
 */
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { isUploadedAvatarPath } from '@/lib/avatarPaths';
import { requireSuperadmin } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { diff } from '@/lib/activityFields';
import { sanitizeAreas, type AdminArea } from '@/lib/adminAreas';
import { createUserSchema, tempPasswordSchema } from '@/lib/usersSchema';
import { flattenAuthIssues } from '@/lib/authSchema';
import { logError } from '@/lib/log';

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type UserActionResult = { ok: true } | { ok: false; error: string };

export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server'; message: string };

/**
 * The mutation target, or a refusal. Superadmins manage each other's accounts
 * on /admin/profile like everyone else — this surface only manages members.
 */
async function findMemberTarget(
  userId: string,
): Promise<
  { id: string; name: string; areas: AdminArea[] } | { error: string }
> {
  if (!USER_ID_RE.test(userId)) return { error: 'Invalid user.' };
  // name + areas ride the existing PK read so the audit row can name who was
  // changed and diff what changed, without a second neon-http round trip.
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
  if (target.role === 'superadmin') {
    return { error: 'Superadmin accounts can’t be managed from here.' };
  }
  return {
    id: target.id,
    name: target.name,
    areas: sanitizeAreas(target.areas),
  };
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
      await db.update(user).set({ areas }).where(eq(user.id, created.id));
      createdId = created.id;
    } catch (linkError) {
      await ctx.internalAdapter.deleteUser(created.id).catch(() => {});
      throw linkError;
    }
  } catch (error) {
    logError('[users] createAdminUser failed', error);
    return {
      ok: false,
      error: 'server',
      message: 'Could not create the account — try again.',
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
 * Replace a member's area grants. Takes effect on their next navigation —
 * every gate re-reads the row (see getAccessProfile), no session refresh
 * needed. `.returning` guards the edit-vs-delete race: a row that vanished
 * between the target check and the write reports instead of silently "ok".
 */
export async function setUserAreas(
  userId: string,
  areas: AdminArea[],
): Promise<UserActionResult> {
  const profile = await requireSuperadmin('/admin');
  const target = await findMemberTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };
  const nextAreas = sanitizeAreas(areas);

  try {
    const updated = await db
      .update(user)
      .set({ areas: nextAreas, updatedAt: new Date() })
      .where(eq(user.id, target.id))
      .returning({ id: user.id });
    if (updated.length === 0) {
      return { ok: false, error: 'That account no longer exists.' };
    }
  } catch (error) {
    logError('[users] setUserAreas failed', error);
    return { ok: false, error: 'Update failed — try again.' };
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
  const target = await findMemberTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };

  try {
    const ctx = await auth.$context;
    // updatePassword stores the value as-is — hash first (seed-script parity).
    const hash = await ctx.password.hash(parsedPassword.data);
    await ctx.internalAdapter.updatePassword(target.id, hash);
    await ctx.internalAdapter.deleteUserSessions(target.id);
  } catch (error) {
    logError('[users] resetUserPassword failed', error);
    return { ok: false, error: 'Reset failed — try again.' };
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
  const target = await findMemberTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };

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
    logError('[users] deleteAdminUser failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
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
