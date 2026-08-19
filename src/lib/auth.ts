import 'server-only';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware, isAPIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { passkey } from '@better-auth/passkey';

import { AUTH_EMAIL_FROM, sendMail } from '@/lib/mail';
import { logActivityAs } from '@/lib/activityLog';
import { authAuditEntry, clientIp, failedSignIn } from '@/lib/authAudit';
import { authDb } from '@/db/pool';
import { log, logError } from '@/lib/log';
import {
  user,
  session,
  account,
  verification,
  passkey as passkeyTable,
} from '@/db/auth-schema';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

// Derive the WebAuthn relying-party ID from the base URL. `localhost` stays as
// itself for dev; in production a leading `www.` is stripped so a passkey
// registered on www.perseustudio.com also validates on the apex domain.
const rpHost = new URL(baseURL).hostname;
const rpID = rpHost === 'localhost' ? 'localhost' : rpHost.replace(/^www\./, '');

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(authDb, {
    provider: 'pg',
    schema: { user, session, account, verification, passkey: passkeyTable },
  }),

  emailAndPassword: {
    enabled: true,
    // No public sign-up: this closes the POST /api/auth/sign-up/email endpoint
    // (enforced in Better Auth's sign-up route). Team accounts are created by
    // scripts/seed-admins via the internal adapter, which bypasses this guard.
    disableSignUp: true,
    // Accounts are seeded for a trusted internal team, so there's no
    // verification gate — the reset flow below lets teammates set their own
    // password on first login without a shared secret.
    requireEmailVerification: false,
    // Length policy, mirrored client-side in `authSchema.ts` (PASSWORD_MIN/MAX).
    // Safe for existing accounts: sign-in never re-checks length, so only the
    // reset / change flows enforce the raised minimum (a deliberate ratchet).
    minPasswordLength: 12,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user: recipient, url }) => {
      // OWASP's "always log" list names authentication events specifically.
      // The reset URL carries a single-use token and is never logged — it is
      // the capability, and the denylist would refuse the key anyway.
      logActivityAs(
        { id: recipient.id, name: recipient.name || recipient.email },
        {
          area: 'auth',
          entity: 'user',
          entityId: recipient.id,
          entityName: recipient.name || recipient.email,
          action: 'auth',
          summary: `Requested a password reset for ${recipient.email}`,
        },
      );
      // Failure only logs: the reset endpoint never surfaced a send error to
      // the requester before this went through the shared mail door either —
      // they can simply request another reset.
      await sendMail({
        from: AUTH_EMAIL_FROM,
        to: recipient.email,
        subject: 'Reset your Perseus admin password',
        text: `Set a new password for the Perseus admin panel:\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
      }).catch((error) => logError('[auth] reset email failed', error));
    },
  },

  /**
   * Authentication audit. `session.create.after` is the one hook that fires on
   * every successful sign-in regardless of method — password or passkey — so
   * one entry point covers both.
   *
   * Failed sign-ins are NOT here — they are captured by the `hooks.after`
   * seam further down and written to STDOUT, never to activity_log. See
   * failedSignIn() in authAudit.ts for why the database version would be an
   * amplification vector.
   *
   * NOTE the rateLimit block below uses better-auth's default `memory`
   * storage (it resolves to 'memory' unless secondaryStorage is set), so on
   * Fluid Compute the 5-per-60s sign-in limit is PER FUNCTION INSTANCE, not
   * global — it multiplies exactly when the deployment scales out under
   * attack. The durable control is a Vercel WAF rate-limit rule on
   * POST /api/auth/sign-in/email.
   */
  databaseHooks: {
    session: {
      create: {
        after: async (created) => {
          // WRAPPED, and the wrap is load-bearing. Better Auth awaits this
          // hook inside runWithAdapter and its pendingHooks flush is
          // unguarded, so a throw here discards the already-built Response
          // INCLUDING its Set-Cookie: the session row is committed, the user
          // gets a 500, no cookie, and each retry burns one of the 5-per-60s
          // sign-in rate-limit slots. A breadcrumb must never cost a login —
          // the same invariant activityLog.ts's write() protects.
          try {
            const [account] = await authDb
              .select({ name: user.name, email: user.email })
              .from(user)
              .where(eq(user.id, created.userId))
              .limit(1);
            if (!account) return;
            logActivityAs(
              { id: created.userId, name: account.name || account.email },
              {
                area: 'auth',
                entity: 'user',
                entityId: created.userId,
                entityName: account.name || account.email,
                action: 'auth',
                summary: `Signed in as ${account.email}`,
              },
            );
          } catch (error) {
            logError('[auth] sign-in audit failed', error);
          }
        },
      },
      // Sign-out and session revocation. Named separately from `create` so
      // the enum's 'auth' verb genuinely covers what schema.ts claims it
      // does: sign-in, reset, AND sessions ending.
      /**
       * Sign-out and session revocation. `delete.after` receives the FULL
       * session row (verified against 1.6.23), so `userId` is real — but only
       * `userId` is read: that row also carries the session token, the IP and
       * the user agent, none of which belong in an audit line.
       *
       * The name is RESOLVED, not stubbed. A sentence like "Session ended" in
       * actor_name would poison /admin/logs' person filter, which is
       * groupBy(actorId) + max(actorName) — one such row per person and the
       * dropdown collapses into several identically-captioned entries nobody
       * can pick between.
       *
       * The summary is deliberately neutral about WHO ended it: this hook
       * also fires per row from deleteManyWithHooks, so an admin's
       * resetUserPassword sweep produces one row per revoked session. "Their
       * session ended" is true either way, and the adjacent admin row names
       * who caused it.
       */
      delete: {
        after: async (removed) => {
          try {
            const [account] = await authDb
              .select({ name: user.name, email: user.email })
              .from(user)
              .where(eq(user.id, removed.userId))
              .limit(1);
            const who = account?.name || account?.email || 'Unknown';
            logActivityAs(
              { id: removed.userId, name: who },
              {
                area: 'auth',
                entity: 'user',
                entityId: removed.userId,
                entityName: who,
                action: 'auth',
                summary: 'Their session ended (signed out or revoked)',
              },
            );
          } catch (error) {
            logError('[auth] sign-out audit failed', error);
          }
        },
      },
    },
  },

  // Signed short-lived cookie cache so most requests validate the session
  // without a DB round-trip. Trade-off: a revoked session can linger up to
  // maxAge on other devices — acceptable for a small internal team.
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  // Built-in brute-force protection (in-memory; the platform-level Vercel WAF
  // rule noted in the plan is the durable backstop for serverless).
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
    },
  },

  /**
   * Passkey + credential audit — endpoint middleware, NOT databaseHooks.
   *
   * TWO separate reasons databaseHooks cannot serve this, both verified
   * against the installed 1.6.23 rather than assumed:
   *
   * 1. The passkey plugin writes through `ctx.context.adapter` directly
   *    (`adapter.create` on register, `adapter.delete` on remove), bypassing
   *    `internalAdapter` — so no passkey hook exists at all.
   * 2. `account.update.after` DOES exist and fires on a password change, but
   *    `updatePassword` routes through `updateManyWithHooks`, whose after-hook
   *    receives the adapter's `updateMany` return value — which is a ROWS
   *    COUNT (probed: the number `1`), not the row. `updated.userId` is
   *    undefined there, so that hook could only ever write an actor-less row.
   *    `/change-password` carries sensitiveSessionMiddleware, so the endpoint
   *    seam knows exactly who acted.
   *
   * Registering an authentication credential is on OWASP's always-log list,
   * and it matters here specifically: `resetUserPassword` deliberately does
   * NOT clear passkeys (see _actions/users.ts), so a passkey added from a
   * hijacked session survives a password reset. Without this, the trail
   * showed one sign-in and nothing else.
   *
   * `after` runs on the failure path too — the dispatcher catches an APIError
   * and still assigns `context.returned` — so success is checked explicitly
   * rather than assumed. Everything is wrapped: this hook runs inside the
   * request pipeline, and a throw here would turn a breadcrumb into a failed
   * passkey or password operation.
   */
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Thin shell on purpose: every decision lives in authAuditEntry
      // (a pure leaf, asserted by scripts/check-activity-log.mts), because a
      // WebAuthn ceremony cannot be driven from a script and this hook would
      // otherwise be untestable.
      //
      // Wrapped: this runs inside the request pipeline, and a throw here
      // would turn a breadcrumb into a failed passkey operation.
      try {
        const failed = isAPIError(ctx.context.returned);

        const decision = authAuditEntry({
          path: ctx.path,
          failed,
          returned: ctx.context.returned,
          session: ctx.context.session,
          bodyId: (ctx.body as { id?: unknown } | undefined)?.id,
        });
        if (decision) logActivityAs(decision.actor, decision.entry);

        // Failed sign-ins go to STDOUT, never to activity_log — see the
        // reasoning on failedSignIn(). log(), not logError(): a mistyped
        // password is expected traffic, and Vercel derives level from the
        // stream, so putting it on stderr would make any future
        // alert-on-error page over typos.
        const attempt = failedSignIn({
          path: ctx.path,
          failed,
          body: ctx.body,
        });
        if (attempt) {
          log('[auth] sign-in failed', {
            email: attempt.email,
            ip: clientIp(ctx.headers),
          });
        }
      } catch (error) {
        logError('[auth] auth hook failed', error);
      }
    }),
  },

  plugins: [
    passkey({
      rpID,
      rpName: 'Perseus Creative Studio',
      origin: baseURL,
    }),
    // nextCookies() must be the LAST plugin — it flushes Set-Cookie for auth
    // calls made from Next server actions.
    nextCookies(),
  ],
});
