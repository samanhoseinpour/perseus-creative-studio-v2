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
//               Neither banner nor analytics render in this state.
//   'pending' — first visit (or after a reset); banner shows.
//   'granted' — analytics allowed.
//   'denied'  — analytics blocked.
// Splitting 'unknown' from 'pending' prevents the banner from flashing for
// returning visitors before we've read their saved choice.
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
      } else {
        localStorage.removeItem(CONSENT_KEY);
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
