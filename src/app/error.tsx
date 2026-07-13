'use client';

import ErrorStateComp from '@/components/ErrorStateComp';

// Root boundary — covers the (marketing) tree (layout + pages) and any future
// segment without a closer error.tsx (/admin has its own). Renders inside the
// root layout's providers, but WITHOUT Navbar/Footer: the Navbar server shell
// derives its mega-panels from the content registries and can't enter a
// client file (it would drag those registries into the shared client chunk
// every route pays for) — so unlike not-found.tsx, the error state stands
// alone full-screen.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorStateComp error={error} reset={reset} backHref="/" backLabel="Home" />
  );
}
