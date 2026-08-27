import type { Metadata } from 'next';

import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Request a reset link or set a new admin password.',
};

/**
 * A repeated query param arrives as an array, so the declared type has to say
 * so — the form takes strings, and an array reaching it renders the
 * set-password step against a token the server will refuse. Take the first,
 * exactly as /admin/login does with `?next=`.
 */
const first = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// Public (no session). Two steps share this route:
//  • no ?token → request a reset email
//  • ?token=… → set a new password (Better Auth appends ?error=… on bad tokens)
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={first(token)} error={first(error)} />;
}
