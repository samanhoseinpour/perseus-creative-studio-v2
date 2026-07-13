'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuArrowLeft as ArrowLeft,
  LuRotateCw as Retry,
} from 'react-icons/lu';
import ImgClient from '@/components/ImgClient';
import Button from '@/components/Button';
import ThemedShader from '@/components/ui/ThemedShader';
import { PERSEUS_LOGO } from '@/constants';

// Error-state twin of NotFoundComp — keep the two visual shells in sync.
// Client-marked because error.tsx boundaries must be client components and
// "Try again" needs a handler. Import this by DIRECT path only (never the
// @/components barrel): error boundaries sit in every route's client
// manifest, and the barrel would drag server registries into the shared
// chunk (see CLAUDE.md chunk hygiene).
//
// Never render error.message here: production server errors arrive redacted,
// and a real message could leak internals. The digest is the safe,
// log-greppable identifier.

interface ErrorStateCompProps {
  error: Error & { digest?: string };
  reset: () => void;
  backHref: string;
  backLabel: string;
}

const ErrorStateComp = ({
  error,
  reset,
  backHref,
  backLabel,
}: ErrorStateCompProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Surface the caught error in the browser console — the server log alone
  // is invisible from the client side.
  useEffect(() => {
    console.error(error);
  }, [error]);

  // reset() alone re-renders the SAME errored RSC payload, so server-thrown
  // errors would rethrow instantly; refresh first so the retry re-runs the
  // server render (the pair Next's own unstable_retry performs).
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    // `isolate` is load-bearing: under the (admin) group layout's opaque
    // bg-background wrapper, the -z-10 shader would otherwise paint behind
    // the ancestor background and disappear (same stacking-context bug
    // documented in AdminAuthShell).
    <main className="relative isolate min-h-svh flex flex-col w-full items-center justify-center overflow-hidden">
      {/* Background shader — bright in light mode, dark in dark mode. */}
      <div className="absolute inset-0 -z-10">
        <ThemedShader />
      </div>

      <Link href="/" className="flex items-center justify-center">
        <ImgClient
          src={PERSEUS_LOGO}
          alt="Website Logo"
          width={98}
          height={120}
          className="dark:invert"
        />
      </Link>
      <div className="relative z-10 flex flex-col gap-2 justify-center items-center tracking-tighter">
        <h1 className="text-4xl font-semibold text-black">
          Something went <span className="text-black/40">wrong !</span>
        </h1>
        <h2 className="text-sm text-black/60">
          An unexpected error occurred. Try again, or come back in a moment.
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="medium"
            icon={Retry}
            iconPosition="left"
            onClick={retry}
            disabled={pending}
          >
            {pending ? 'Retrying…' : 'Try again'}
          </Button>
          <Link href={backHref}>
            <Button
              size="medium"
              variant="secondary"
              icon={ArrowLeft}
              iconPosition="left"
            >
              Back to {backLabel}
            </Button>
          </Link>
        </div>
        {error.digest && (
          <p className="mt-3 text-xs text-black/40">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
};

export default ErrorStateComp;
