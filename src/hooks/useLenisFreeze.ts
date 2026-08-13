'use client';

import { useEffect } from 'react';

import { useLenis } from '@/utils/lenis';

// Module-level ref-count: stacked overlays (ClientDialog → its nested
// ConfirmDialog) each freeze, and only the last one to close may start
// Lenis again.
let freezes = 0;

/**
 * Pause root Lenis while `active` — MobileSheet's stop()/start() idiom,
 * ref-counted for nested overlays. Radix's own scroll lock only sets
 * body{overflow:hidden}, which can't stop Lenis: it preventDefault()s the
 * wheel itself and then scrolls programmatically. Safe alongside
 * data-lenis-prevent — Lenis checks that attribute BEFORE its isStopped
 * branch, so opted-out scrollers (a dialog's inner scroller) keep scrolling
 * natively while the page behind stays frozen. No-op off-desktop, where
 * SmartLenis renders no provider and useLenis() is undefined.
 */
export function useLenisFreeze(active: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!active || !lenis) return;
    freezes += 1;
    lenis.stop();
    return () => {
      freezes -= 1;
      if (freezes === 0) lenis.start();
    };
  }, [active, lenis]);
}
