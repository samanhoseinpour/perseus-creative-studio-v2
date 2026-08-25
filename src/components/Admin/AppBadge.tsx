'use client';

import { useEffect } from 'react';

/**
 * Clears the app-icon badge — the red count on a Dock or Home Screen icon —
 * whenever the dashboard is actually in front of someone.
 *
 * The service worker counts UP on each push (see `bumpBadge` in public/sw.js);
 * this is the only thing that counts down, because only the page knows the
 * person is looking. Opening the dashboard IS catching up, which is what a
 * badge means everywhere else.
 *
 * Renders nothing. It clears on mount and again whenever the tab becomes
 * visible, so returning to a window that sat in the background for an hour
 * clears at once rather than on the next navigation.
 *
 * Both the API call and the IndexedDB reset are wrapped: the Badging API is
 * absent in Firefox and in Safari outside an installed app, and a browser with
 * site data blocked throws on `indexedDB.open`. A missing badge must never
 * surface as an error on a dashboard.
 */
const BADGE_DB = 'perseus-badge';
const BADGE_STORE = 'state';

function resetStoredCount(): void {
  try {
    const req = indexedDB.open(BADGE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(BADGE_STORE)) {
        req.result.createObjectStore(BADGE_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        db.transaction(BADGE_STORE, 'readwrite')
          .objectStore(BADGE_STORE)
          .put(0, 'count');
      } catch {
        // Store missing or blocked — the badge simply stays until next time.
      }
    };
  } catch {
    // No IndexedDB at all (private mode, blocked site data).
  }
}

export default function AppBadge() {
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState !== 'visible') return;
      resetStoredCount();
      // `clearAppBadge` is only on navigator in browsers that implement the
      // Badging API; everywhere else this is a no-op rather than a throw.
      void navigator.clearAppBadge?.().catch(() => {});
    };
    clear();
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('focus', clear);
    return () => {
      document.removeEventListener('visibilitychange', clear);
      window.removeEventListener('focus', clear);
    };
  }, []);

  return null;
}
