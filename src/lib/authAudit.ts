import { clip } from '@/lib/activityFields';
import type { ActivityInput } from '@/lib/activityLog';

/**
 * Pure decision logic for the passkey audit hook in auth.ts.
 *
 * Extracted for the same reason activityFields.ts and logFields.ts are: the
 * hook itself can only be exercised through a real WebAuthn ceremony, which
 * no script can drive. Splitting the DECISION from the SIDE EFFECT means the
 * part that can be got wrong — which paths count, what counts as success,
 * where the actor comes from — is asserted in scripts/check-activity-log.mts.
 *
 * No imports beyond a type, so it stays free of `server-only`.
 */

export const PASSKEY_REGISTER_PATH = '/passkey/verify-registration';
export const PASSKEY_REMOVE_PATH = '/passkey/delete-passkey';
export const CHANGE_PASSWORD_PATH = '/change-password';

/**
 * KNOWN GAP, deliberate: completing a reset via emailed link
 * (`/reset-password`) is NOT audited here. That endpoint carries no session
 * middleware — it authenticates with a single-use token which is consumed
 * before this hook runs — so the only identifier available would be the token
 * itself, which is a capability and must never be logged. Writing a row with
 * no actor would be worse than writing none: an audit line that cannot say
 * who did something is noise that dilutes the ones that can.
 *
 * It is not invisible, though. The reset REQUEST is logged by
 * `sendResetPassword` in auth.ts, and completing one produces session activity
 * (sign-in / session revocation) that this file does capture.
 */

/** What the writer needs: who acted, and the row to write. */
export type AuthAuditEntry = {
  actor: { id: string | null; name: string };
  entry: ActivityInput;
};

/**
 * Decide whether a completed auth endpoint call deserves an audit row.
 *
 * `failed` is passed in rather than derived, because Better Auth's dispatcher
 * runs after-hooks on the FAILURE path too: it catches an APIError and still
 * assigns `context.returned`. Treating "the hook ran" as "the thing happened"
 * would file a passkey registration that the server rejected.
 */
export function authAuditEntry(input: {
  path: string;
  failed: boolean;
  /** The endpoint's return value — the created passkey row on registration. */
  returned: unknown;
  /** Present on all three paths. Registration carries freshSessionMiddleware
   *  because the plugin defaults `registration.requireSession ?? true` and
   *  this app passes no `registration` option; removal carries
   *  sessionMiddleware; /change-password carries sensitiveSessionMiddleware. */
  session: { user?: { id?: string; name?: string } } | null | undefined;
  /** `ctx.body.id` on removal. */
  bodyId: unknown;
}): AuthAuditEntry | null {
  const { path, failed, returned, session, bodyId } = input;

  if (
    path !== PASSKEY_REGISTER_PATH &&
    path !== PASSKEY_REMOVE_PATH &&
    path !== CHANGE_PASSWORD_PATH
  ) {
    return null;
  }
  if (failed) return null;

  if (path === CHANGE_PASSWORD_PATH) {
    // sensitiveSessionMiddleware guarantees a session here, so the actor is
    // known — unlike the account.update databaseHook this replaced, which
    // receives only a ROWS-UPDATED COUNT (verified: it returns the number 1)
    // and would have written an actor-less row.
    const changerId = session?.user?.id;
    if (typeof changerId !== 'string' || !changerId) return null;
    return {
      actor: { id: changerId, name: session?.user?.name || 'Account' },
      entry: {
        area: 'auth',
        entity: 'user',
        entityId: changerId,
        entityName: session?.user?.name || 'Account',
        action: 'grant',
        summary: 'Changed their password',
      },
    };
  }

  if (path === PASSKEY_REGISTER_PATH) {
    // The SUBJECT comes from the created row (the plugin resolves the target
    // user from the verification token, and that is authoritative), but the
    // NAME comes from the session — `registration.requireSession` defaults to
    // true, so freshSessionMiddleware has run. Hard-coding 'Account' here
    // would make the row unattributable once the FK is nulled on offboarding,
    // which is exactly the case the hijacked-passkey rationale cares about.
    const row = returned as { id?: string; userId?: string; name?: string } | null;
    if (!row || typeof row.userId !== 'string' || !row.userId) return null;
    // Clipped: the label is client-supplied and the plugin's schema sets no
    // max, so an unbounded name would otherwise reach two unbounded text
    // columns held for the full 365-day retention window.
    const label = String(clip(row.name?.trim() || 'Unnamed passkey'));
    return {
      actor: { id: row.userId, name: session?.user?.name || 'Account' },
      entry: {
        area: 'auth',
        entity: 'passkey',
        entityId: typeof row.id === 'string' ? row.id : null,
        entityName: label,
        action: 'grant',
        // credentialID and publicKey are never logged — they identify the
        // authenticator, and the passkey row itself already holds them.
        summary: `Registered a passkey (${label})`,
      },
    };
  }

  // Removal. requireResourceOwnership has already proven the passkey belongs
  // to this session, so the session user IS the subject.
  const userId = session?.user?.id;
  if (typeof userId !== 'string' || !userId) return null;
  return {
    actor: { id: userId, name: session?.user?.name || 'Account' },
    entry: {
      area: 'auth',
      entity: 'passkey',
      entityId: typeof bodyId === 'string' ? bodyId : null,
      entityName: 'Passkey',
      action: 'delete',
      summary: 'Removed a passkey',
    },
  };
}
