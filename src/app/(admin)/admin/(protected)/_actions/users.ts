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
import { sanitizeAreas, type AdminArea } from '@/lib/adminAreas';
import { createUserSchema, tempPasswordSchema } from '@/lib/usersSchema';
import { flattenAuthIssues } from '@/lib/authSchema';

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
): Promise<{ id: string } | { error: string }> {
  if (!USER_ID_RE.test(userId)) return { error: 'Invalid user.' };
  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!target) return { error: 'That account no longer exists.' };
  if (target.role === 'superadmin') {
    return { error: 'Superadmin accounts can’t be managed from here.' };
  }
  return { id: target.id };
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
  await requireSuperadmin('/admin');
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
    } catch (linkError) {
      await ctx.internalAdapter.deleteUser(created.id).catch(() => {});
      throw linkError;
    }
  } catch (error) {
    console.error('[users] createAdminUser failed', error);
    return {
      ok: false,
      error: 'server',
      message: 'Could not create the account — try again.',
    };
  }

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
  await requireSuperadmin('/admin');
  const target = await findMemberTarget(userId);
  if ('error' in target) return { ok: false, error: target.error };

  try {
    const updated = await db
      .update(user)
      .set({ areas: sanitizeAreas(areas), updatedAt: new Date() })
      .where(eq(user.id, target.id))
      .returning({ id: user.id });
    if (updated.length === 0) {
      return { ok: false, error: 'That account no longer exists.' };
    }
  } catch (error) {
    console.error('[users] setUserAreas failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }

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
  await requireSuperadmin('/admin');
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
    console.error('[users] resetUserPassword failed', error);
    return { ok: false, error: 'Reset failed — try again.' };
  }

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
    console.error('[users] deleteAdminUser failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
