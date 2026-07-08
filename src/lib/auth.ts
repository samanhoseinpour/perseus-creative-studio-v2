import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { passkey } from '@better-auth/passkey';
import { Resend } from 'resend';

import { authDb } from '@/db/pool';
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

const AUTH_EMAIL_FROM = 'Perseus Creative Studio <no-reply@perseustudio.com>';

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
    sendResetPassword: async ({ user: recipient, url }) => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: AUTH_EMAIL_FROM,
        to: recipient.email,
        subject: 'Reset your Perseus admin password',
        text: `Set a new password for the Perseus admin panel:\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
      });
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
