'use client';

import { useState } from 'react';
import { ReactLenis } from '@/utils/lenis';

// Lenis smooth-scroll is a desktop-only enhancement here. On touch / small
// screens it adds a permanent requestAnimationFrame loop and scroll listeners
// for no real gain (mobile already has native momentum scrolling), so we skip
// it there entirely — and for anyone who prefers reduced motion.
//
// The choice is made once, synchronously, on the first client render. Because
// `root` Lenis renders no DOM wrapper, the server markup (no Lenis) and the
// client markup (Lenis on desktop) are identical, so deciding here causes
// neither a hydration mismatch nor a remount of the app subtree. The three
// `useLenis()` consumers already fall back to native scroll when the provider
// is absent, so mobile keeps working.
const SmartLenis = ({ children }: { children: React.ReactNode }) => {
  const [smooth] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(
        '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      ).matches,
  );

  if (!smooth) return <>{children}</>;
  return <ReactLenis root>{children}</ReactLenis>;
};

export default SmartLenis;
