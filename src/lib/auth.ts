import 'server-only';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { passkey } from '@better-auth/passkey';

import { AUTH_EMAIL_FROM, sendMail } from '@/lib/mail';
import { logActivityAs } from '@/lib/activityLog';
import { authDb } from '@/db/pool';
import { logError } from '@/lib/log';
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
   * KNOWN GAP: failed sign-ins are not recorded. Better Auth's databaseHooks
   * only fire on a successful write, and catching failures means hooking the
   * endpoint middleware and reading its response — a tighter coupling to
   * internals than this is worth today. The rateLimit block below is the
   * live brute-force control; add endpoint hooks here if that ever changes.
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
      delete: {
        after: async (removed) => {
          try {
            logActivityAs(
              { id: removed.userId, name: 'Session ended' },
              {
                area: 'auth',
                entity: 'user',
                entityId: removed.userId,
                entityName: 'Session ended',
                action: 'auth',
                summary: 'Signed out or revoked a session',
              },
            );
          } catch (error) {
            logError('[auth] sign-out audit failed', error);
          }
        },
      },
    },
    account: {
      // Fires on password change AND on completing a reset (both go through
      // updateManyWithHooks). The hash is never logged — `pass`/`hash` are
      // both on the denylist — only the fact that credentials changed.
      update: {
        after: async (updated) => {
          try {
            logActivityAs(
              { id: updated.userId, name: 'Account' },
              {
                area: 'auth',
                entity: 'user',
                entityId: updated.userId,
                entityName: 'Account',
                action: 'grant',
                summary: 'Changed their sign-in credentials',
              },
            );
          } catch (error) {
            logError('[auth] credential-change audit failed', error);
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
