/**
 * Validation for the /admin/users management forms (add user, reset password).
 * A sibling leaf to authSchema.ts (which stays pledged to auth-form-only
 * concerns) sharing its password policy constants, imported by BOTH the client
 * dialogs (instant field errors) and `_actions/users.ts`.
 *
 * Unlike authSchema.ts, the server-side parse here IS the security control:
 * user creation and password resets go through Better Auth's internal adapter,
 * which bypasses the HTTP endpoints' `minPasswordLength` policy — zod is the
 * only length/blocklist gate on this path.
 */
import { z } from 'zod';

import { PASSWORD_MIN, PASSWORD_MAX } from '@/lib/authSchema';
import { isCommonPassword } from '@/lib/passwordStrength';
import { ADMIN_AREAS } from '@/lib/adminAreas';

/** The admin-set temp password a new/reset member signs in with once. */
export const tempPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Keep it under ${PASSWORD_MAX} characters.`)
  .refine((pw) => !isCommonPassword(pw), 'Choose a less common password.');

/**
 * The add-user form. Deliberately NO `role` field — new accounts are always
 * members; promotion to superadmin happens only via SQL/migration.
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Keep the name under 100 characters.'),
  email: z.email('Enter a valid email address.').max(200),
  password: tempPasswordSchema,
  areas: z.array(z.enum(ADMIN_AREAS)).max(ADMIN_AREAS.length),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
