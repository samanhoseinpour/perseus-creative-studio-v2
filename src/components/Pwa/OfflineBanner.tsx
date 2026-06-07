'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { flushOutbox, outboxCount } from '@/lib/contactOutbox';

/**
 * Slim top banner shown while the browser is offline, plus the app-level driver
 * for the contact outbox: it flushes queued inquiries on mount (covers a reload
 * that happens once you're back online) and whenever the `online` event fires.
 *
 * Retrying here rather than via Background Sync keeps it working in Safari and
 * Firefox, which don't support the Background Sync API.
 */
const OfflineBanner = () => {
  // Default to online for SSR/first paint; correct it on mount to avoid a
  // hydration mismatch.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = async () => {
      const pending = await outboxCount();
      if (pending === 0) return;
      const sent = await flushOutbox();
      if (sent > 0) {
        toast.success(
          sent === 1 ? 'Queued message sent' : `${sent} queued messages sent`,
          { description: 'Your offline inquiry was delivered.' },
        );
      }
    };

    const goOnline = () => {
      setOffline(false);
      void sync();
    };
    const goOffline = () => setOffline(true);

    setOffline(!navigator.onLine);
    if (navigator.onLine) void sync();

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2.5 bg-foreground px-4 py-2 text-center text-xs font-medium text-background"
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-background/70" />
        <span className="relative inline-flex size-2 rounded-full bg-background" />
      </span>
      <span>
        You’re offline — pages you’ve visited still work. New messages send
        automatically when you’re back.
      </span>
    </div>
  );
};

export default OfflineBanner;
