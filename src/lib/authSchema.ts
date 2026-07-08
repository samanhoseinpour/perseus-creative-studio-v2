/**
 * Client-side validation for the admin auth forms (sign-in, reset-request,
 * set-new-password). Mirrors `contactSchema.ts`: a small zod leaf shared only
 * by the client forms to give instant field errors and to gate obviously
 * malformed submissions (bad email, empty/short password) before they cost a
 * network round-trip + DB lookup.
 *
 * This is UX + malformed-traffic trimming, NOT a security control — the
 * authoritative validation and abuse protection live server-side in Better
 * Auth (`src/lib/auth.ts`: rate limits on /sign-in/email and
 * /request-password-reset, plus disableSignUp). A bot posting straight to the
 * auth endpoint bypasses this entirely; that's what the rate limits are for.
 *
 * Keep it a leaf — no imports beyond zod — so it stays cheap in the admin
 * client chunk.
 */
import { z } from 'zod';

import { isCommonPassword } from '@/lib/passwordStrength';

// Password policy, mirrored server-side in `auth.ts` (minPasswordLength). We
// enforce the bounds up front so the set-password form shows the rule instantly
// instead of after a round-trip that the server would only reject. Length is
// the dominant control (NIST/OWASP: prefer length + a blocklist over forced
// character-class rules); the strength meter is the UX layer on top.
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const email = z.email('Enter a valid email address.').max(200);

/**
 * Sign-in: a valid-shaped email (a malformed one can't match any seeded admin,
 * so gate it) and a non-empty password. We deliberately do NOT enforce the
 * min-length policy here — a login form shouldn't hint at password rules or
 * say "too short"; a wrong password is just "invalid email or password".
 */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

/** Request a reset link: email only (this endpoint also sends an email). */
export const resetRequestSchema = z.object({
  email,
});

/** Set a new password: enforce the length policy + blocklist for instant feedback. */
export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Keep it under ${PASSWORD_MAX} characters.`)
    .refine((pw) => !isCommonPassword(pw), 'Choose a less common password.'),
});

/**
 * Change password (logged-in profile): the current password must be present
 * (Better Auth re-verifies it server-side — this only gates an empty submit),
 * the new password must satisfy the length policy, and the confirmation must
 * match. The mismatch check is attached to `confirmPassword` so the error
 * shows under that field.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX, `Keep it under ${PASSWORD_MAX} characters.`)
      .refine((pw) => !isCommonPassword(pw), 'Choose a less common password.'),
    confirmPassword: z.string().min(1, 'Re-enter the new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Choose a password different from your current one.',
    path: ['newPassword'],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** First message per field from a failed parse, for inline display. */
export function flattenAuthIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/**
 * Validate one field against a schema; returns its first message, or undefined
 * when that field is valid. Used by on-blur handlers so a field only shows its
 * own error (not, say, the password error while blurring the email).
 */
export function fieldIssue(
  schema: z.ZodType,
  candidate: unknown,
  key: string,
): string | undefined {
  const parsed = schema.safeParse(candidate);
  if (parsed.success) return undefined;
  return flattenAuthIssues(parsed.error)[key];
}
