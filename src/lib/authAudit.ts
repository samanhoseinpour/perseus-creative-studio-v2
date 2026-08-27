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
export const SIGN_IN_PATH = '/sign-in/email';

/**
 * KNOWN GAP, deliberate: completing a reset via emailed link
 * (`/reset-password`) is NOT audited here. That endpoint carries no session
 * middleware — it authenticates with a single-use token which is consumed
 * before this hook runs — so the only identifier available would be the token
 * itself, which is a capability and must never be logged. Writing a row with
 * no actor would be worse than writing none: an audit line that cannot say
 * who did something is noise that dilutes the ones that can.
 *
 * It is not invisible, though, and since 2026-08-27 it is not actorless
 * either: `emailAndPassword.onPasswordReset` in auth.ts writes the cause row
 * with the real user, because Better Auth hands that hook the resolved `user`
 * from INSIDE the handler — which is the identifier this endpoint seam cannot
 * see. The reset REQUEST is logged by `sendResetPassword`, and the eviction
 * that follows produces the session activity this file does capture.
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

/* -------------------------------------------------------------------------- */
/* Failed sign-ins — DIAGNOSTIC, not audit                                    */
/* -------------------------------------------------------------------------- */

/**
 * A failed sign-in deliberately does NOT become an activity_log row, and the
 * reason is a principle rather than a preference: the audit trail answers
 * "who did what" about authenticated actors, and a failed sign-in has no
 * actor. It belongs on the diagnostics side of the split.
 *
 * Two concrete hazards the database version would carry, both avoided by
 * keeping this on stdout:
 *
 * 1. AMPLIFICATION. An unauthenticated POST would cause a write to the
 *    Postgres database that backs the whole public site. A credential-
 *    stuffing run becomes unbounded row growth in the primary DB, self-
 *    inflicted, under a 365-day retention policy.
 * 2. Attacker-controlled text rendered on an admin page, in rows with a null
 *    actor that would dilute /admin/logs' person filter.
 *
 * What IS worth capturing is which account was targeted — the platform logs
 * already record the 401, the path and the IP, but never the request body.
 *
 * NOTE the body on this endpoint also contains the PASSWORD. Only `email` is
 * ever read here; the body is never spread. (`pass` is on the logFields
 * denylist as a second line of defence, asserted in the self-check.)
 */
export function failedSignIn(input: {
  path: string;
  failed: boolean;
  body: unknown;
}): { email: string } | null {
  if (input.path !== SIGN_IN_PATH || !input.failed) return null;
  const email = (input.body as { email?: unknown } | undefined)?.email;
  if (typeof email !== 'string' || !email.trim()) return null;
  // Clipped: the value is attacker-controlled and otherwise unbounded.
  return { email: String(clip(email.trim())) };
}

/**
 * The client IP for a failed-auth line — the field that actually identifies an
 * attack source. `x-forwarded-for` is a comma-separated chain; the first entry
 * is the client. Personal data, so it is logged ONLY on this security event
 * (legitimate interest) and never on ordinary lines, and it inherits Vercel's
 * 1-day runtime-log retention rather than the audit table's 365 days.
 */
export function clientIp(headers: Headers | undefined): string | null {
  const chain = headers?.get('x-forwarded-for') ?? headers?.get('x-real-ip');
  if (!chain) return null;
  return chain.split(',')[0]?.trim() || null;
}
