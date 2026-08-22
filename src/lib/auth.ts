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
import {
  SESSION_IDLE_SECONDS,
  SESSION_REFRESH_SECONDS,
  clampSessionExpiry,
} from '@/lib/sessionPolicy';
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
      /**
       * The 30-day ceiling (src/lib/sessionPolicy.ts). Better Auth slides a
       * session on refresh by PATCHING `expiresAt = now + expiresIn`
       * (better-auth@1.6.23 dist/api/routes/session.mjs:224); this hook
       * clamps that patch to `createdAt + 30d`, so the auth layer itself —
       * every endpoint, not just our wrapper — refuses to keep a session
       * alive past a month from sign-in. A copied cookie therefore has a
       * bounded life no matter how diligently it is used.
       *
       * Why `ctx.context.session` is the right row, verified against 1.6.23:
       * the refresh site assigns it from `findSession` at session.mjs:179
       * immediately before the update at :224; `dispatch.mjs:191-205`
       * establishes that context for server-side `auth.api.*` calls too, not
       * just the HTTP handler; and every core caller of `updateSession`
       * targets the session in context (`update-session.mjs:34-37` is the
       * only other one — its patch carries no `expiresAt`, hence the guard).
       * `new Date(...)` because the cookie-cache branch stores ISO strings on
       * the context; no write happens there, but the coercion is free.
       *
       * Three rules, all load-bearing:
       * - Only act when the patch carries `expiresAt` — never invent one.
       * - NEVER return `false`: that aborts the update, `updateSession`
       *   returns null, and session.mjs:228-233 deletes the cookie and throws
       *   UNAUTHORIZED. A ceiling may only narrow.
       * - Wrapped: on the server-side getSession path this runs inline, so a
       *   throw here would surface as INTERNAL_SERVER_ERROR from every admin
       *   render. Same invariant as the hooks above — a policy nicety must
       *   never cost a login. On any doubt, fall through to the default.
       *
       * Known cost: in the last ~24h before the ceiling the clamp binds on
       * every cache miss, so an active tab re-writes the same clamped value
       * once per 5 minutes for a day. Accepted.
       */
      update: {
        before: async (patch, ctx) => {
          try {
            if (!(patch.expiresAt instanceof Date)) return;
            const createdAt = ctx?.context?.session?.session?.createdAt;
            if (!createdAt) return;
            const created = new Date(createdAt);
            if (Number.isNaN(created.getTime())) return;
            const clamped = clampSessionExpiry(created, patch.expiresAt);
            if (clamped === patch.expiresAt) return;
            return { data: { expiresAt: clamped } };
          } catch (error) {
            logError('[auth] session ceiling skipped', error);
            return;
          }
        },
      },
      delete: {
        after: async (removed) => {
          try {
            // A plain lapse — the idle window or the ceiling ran out and the
            // stale cookie was presented late — is NOT an auth event; nobody
            // did anything. Better Auth deletes the expired row through this
            // same hook (session.mjs:187), so without this check every idle
            // expiry would log "signed out or revoked", which is false. The
            // daily cron prunes the rest directly, bypassing hooks entirely.
            if (removed.expiresAt && new Date(removed.expiresAt) <= new Date()) return;
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

  /**
   * Session lifetime — the numbers live in src/lib/sessionPolicy.ts and are
   * pinned by scripts/check-session-policy.mts.
   *
   * - `expiresIn` 24h: the IDLE window. A session dies 24h after its last
   *   refresh, and a refresh only happens from a server action or a route
   *   handler (Next 16 forbids cookies().set() during a render, and the
   *   nextCookies plugin skips RSC navigations) — in practice the 90-second
   *   presence heartbeat, which only runs while the dashboard is VISIBLE. So
   *   "activity" means the dashboard is on screen: work every day and you are
   *   never prompted; leave it closed for a day and you sign in again.
   * - `updateAge` 5m: how often an active session is re-stamped, set equal to
   *   the cookie cache's maxAge because that is the floor anyway (a cache hit
   *   never reaches the DB). ≤ 12 UPDATEs an hour per active person.
   * - The 30-day CEILING is the `session.update.before` hook above.
   * - The signed 5-minute cookie cache is unchanged: most requests validate
   *   without a DB round-trip, and a revoked session can linger up to five
   *   minutes on another device — acceptable for a small internal team.
   */
  session: {
    expiresIn: SESSION_IDLE_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
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
