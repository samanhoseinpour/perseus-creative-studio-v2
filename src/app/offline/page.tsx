import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Container } from '@/components';

// Utility route, never indexed — it's the service worker's navigation fallback.
export const metadata: Metadata = {
  title: 'You’re offline — Perseus Creative Studio',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden">
      <Container className="flex max-w-2xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs font-medium text-foreground/60">
          <span className="size-2 rounded-full bg-foreground/40" />
          No connection
        </span>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          You’re offline
        </h1>
        <p className="mt-4 max-w-md text-foreground/60">
          This page hasn’t been saved for offline use yet. Pages you’ve already
          visited still work — reconnect to load everything else.
        </p>
        <Link href="/" className="mt-8">
          <Button size="medium">Back to home</Button>
        </Link>
      </Container>
    </main>
  );
}
