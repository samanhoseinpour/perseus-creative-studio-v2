import ResetPasswordForm from './ResetPasswordForm';

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
