import type { Metadata } from 'next';

import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Request a reset link or set a new admin password.',
};

// Public (no session). Two steps share this route:
//  • no ?token → request a reset email
//  • ?token=… → set a new password (Better Auth appends ?error=… on bad tokens)
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={token} error={error} />;
}
