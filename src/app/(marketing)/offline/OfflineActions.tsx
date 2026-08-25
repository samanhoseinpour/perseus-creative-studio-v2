'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuHouse, LuLayoutDashboard, LuRotateCw } from 'react-icons/lu';

import Button from '@/components/Button';

/**
 * The offline page is served by the service worker as the fallback for a failed
 * navigation — including one to /admin, where the URL stays /admin/... while the
 * BODY is this static page. Nothing server-side can tell the two apart, so the
 * context has to be read from location on the client.
 *
 * It matters twice over. The marketing copy ("pages you've already visited still
 * work") is false for /admin, which is never cached; and the marketing CTA
 * points at `/`, which is OUTSIDE the dashboard app's scope — tapping it would
 * eject a member out of the installed app into a browser tab, from an error
 * screen. Both are resolved after mount, so the first paint commits to neither.
 */
export default function OfflineActions() {
  const [context, setContext] = useState<'unknown' | 'admin' | 'site'>('unknown');

  useEffect(() => {
    setContext(
      window.location.pathname.startsWith('/admin') ? 'admin' : 'site',
    );
  }, []);

  return (
    <>
      <p className="mt-3 h-5 max-w-md text-sm text-foreground/45">
        {context === 'admin'
          ? 'The dashboard is always live, so it needs a connection.'
          : context === 'site'
            ? 'Pages you’ve already visited still work.'
            : null}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="medium"
          icon={LuRotateCw}
          iconPosition="left"
          shimmer={false}
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>

        {context === 'unknown' ? null : (
          <Link href={context === 'admin' ? '/admin' : '/'}>
            <Button
              size="medium"
              variant="secondary"
              icon={context === 'admin' ? LuLayoutDashboard : LuHouse}
              iconPosition="left"
            >
              {context === 'admin' ? 'Back to the dashboard' : 'Back to home'}
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}
