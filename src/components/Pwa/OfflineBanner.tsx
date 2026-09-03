'use client';

import { useEffect, useState } from 'react';
import {
  flushOutbox,
  hasQueuedSubmissions,
  reconcileOutboxFlag,
} from '@/lib/contactOutbox';

/**
 * Slim top banner shown while the browser is offline, plus the app-level driver
 * for the contact outbox: it flushes queued inquiries on mount (covers a reload
 * that happens once you're back online) and whenever the `online` event fires.
 *
 * Retrying here rather than via Background Sync keeps it working in Safari and
 * Firefox, which don't support the Background Sync API.
 *
 * The localStorage fast-path (`hasQueuedSubmissions`) keeps the common path —
 * nothing queued, which is ~every load — from opening IndexedDB at all; sonner
 * is imported on demand for the same reason (a static `toast` import would pin
 * it in the eager chunk the DeferredToaster split just evicted).
 */
const OfflineBanner = () => {
  // Default to online for SSR/first paint; correct it on mount to avoid a
  // hydration mismatch.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!hasQueuedSubmissions()) return;
      const sent = await flushOutbox();
      if (sent > 0) {
        const { toast } = await import('sonner');
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

    // Legacy reconciliation runs once, at idle — never in the mount task.
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => void reconcileOutboxFlag(), {
        timeout: 4000,
      });
    } else {
      timeoutId = window.setTimeout(() => void reconcileOutboxFlag(), 2500);
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
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
        You’re offline. Pages you’ve visited still work. New messages send
        automatically when you’re back.
      </span>
    </div>
  );
};

export default OfflineBanner;
