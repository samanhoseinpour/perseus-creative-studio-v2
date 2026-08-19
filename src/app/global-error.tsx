'use client';

import ErrorStateComp from '@/components/ErrorStateComp';

/**
 * The last-resort boundary: errors thrown by the ROOT layout itself, which
 * src/app/error.tsx cannot catch because it renders inside that layout.
 *
 * Because it replaces the whole document, it must supply its own <html> and
 * <body> — the root layout never ran. That also means none of the providers
 * (theme, consent, Toaster) exist here, so this renders only components that
 * stand alone. ErrorStateComp qualifies: it reads no context.
 *
 * Practically never seen. It exists so that when it IS hit, the user gets the
 * same error surface as everywhere else — with the digest that matches the
 * server log line — instead of Next's unstyled default.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorStateComp
          error={error}
          reset={reset}
          backHref="/"
          backLabel="Home"
        />
      </body>
    </html>
  );
}
