'use client';

import ErrorStateComp from '@/components/ErrorStateComp';

// One boundary for the whole /admin tree below the (admin) group layout: the
// (protected) layout's requireAdmin() + dashboard count queries, every
// protected page, and the public login/reset-password pages. requireAdmin's
// redirect() is a Next router error and rethrows past this boundary untouched.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorStateComp
      error={error}
      reset={reset}
      backHref="/admin"
      backLabel="dashboard"
    />
  );
}
