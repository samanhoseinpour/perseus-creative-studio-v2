'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ConsentState = 'unknown' | 'pending' | 'granted' | 'denied';

type ConsentContextValue = {
  consent: ConsentState;
  grant: () => void;
  deny: () => void;
  reset: () => void;
};

const CONSENT_KEY = 'perseus.consent';
const STORED_STATES: ReadonlySet<ConsentState> = new Set([
  'granted',
  'denied',
]);

const ConsentContext = createContext<ConsentContextValue | null>(null);

// State machine:
//   'unknown' — server-rendered placeholder; localStorage hasn't been read.
//               Analytics never render here. The BANNER does render (it must
//               be in the static HTML so it paints at FCP instead of becoming
//               a ~4.7s hydration-time LCP on throttled mobile) — returning
//               visitors are covered by the pre-paint inline script +
//               `data-consent-resolved` CSS hook, not by this state.
//   'pending' — first visit (or after a reset); banner shows.
//   'granted' — analytics allowed.
//   'denied'  — analytics blocked.
export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const [consent, setConsent] = useState<ConsentState>('unknown');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved && STORED_STATES.has(saved as ConsentState)) {
        setConsent(saved as ConsentState);
      } else {
        setConsent('pending');
      }
    } catch {
      // localStorage may throw in private-browsing edge cases.
      setConsent('pending');
    }
  }, []);

  const persist = useCallback((next: ConsentState) => {
    setConsent(next);
    try {
      if (STORED_STATES.has(next)) {
        localStorage.setItem(CONSENT_KEY, next);
        // Mirrors the choice for the pre-paint inline script's CSS hook (the
        // banner ships in the static HTML and is display:none'd for visitors
        // with a stored choice — see ConsentBanner). Kept in sync here so a
        // same-session reset() can re-show the banner.
        document.documentElement.setAttribute('data-consent-resolved', '');
      } else {
        localStorage.removeItem(CONSENT_KEY);
        document.documentElement.removeAttribute('data-consent-resolved');
      }
    } catch {
      // see above
    }
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      grant: () => persist('granted'),
      deny: () => persist('denied'),
      reset: () => persist('pending'),
    }),
    [consent, persist],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
};

export const useConsent = (): ConsentContextValue => {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used within <ConsentProvider>');
  }
  return ctx;
};
