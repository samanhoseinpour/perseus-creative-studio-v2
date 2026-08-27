'use client';

import { useEffect, type RefObject } from 'react';
import Lenis from 'lenis';

import { useLenis } from '@/utils/lenis';

/**
 * Smooth-scroll a NESTED scroller — the admin rail's nav — with the same feel
 * as the page: a second Lenis instance whose `wrapper` is the scrolling element
 * and whose `content` is its single child (Lenis measures the content box with
 * a ResizeObserver, so the children must sit in one wrapper, not loose).
 *
 * Gated on the ROOT instance existing rather than on a media query of its own.
 * `SmartLenis` is the one place the desktop-only / reduced-motion decision is
 * made; `useLenis()` reads the root through the global store, so it answers
 * from a sibling of the provider too. No root → no nested instance → the
 * element keeps scrolling natively, and a phone or a reduced-motion viewer
 * pays for nothing here either.
 *
 * `overscroll: false` is the wheel-side twin of `overscroll-contain`: the
 * nested instance marks every event it handles as consumed
 * (`event.lenisStopPropagation`, which the root checks first), so reaching the
 * end of the rail never scrolls the page behind it. Keep `data-lenis-prevent`
 * on the wrapper as well — the root checks the attribute before anything else,
 * and it is what keeps the element natively scrollable whenever no nested
 * instance is mounted. The nested instance is unaffected by it: Lenis slices
 * the event path BEFORE its own root element, so an attribute on the wrapper
 * itself is never in the list it inspects.
 *
 * Runs its own rAF loop (`autoRaf`), like the root does through ReactLenis —
 * an idle Lenis tick is a no-op, and the alternative (driving it from the
 * root's loop) has no public hook to hang from.
 */
export function useNestedLenis(
  wrapper: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
) {
  const root = useLenis();
  useEffect(() => {
    const wrapperEl = wrapper.current;
    const contentEl = content.current;
    if (!root || !wrapperEl || !contentEl) return;
    const lenis = new Lenis({
      wrapper: wrapperEl,
      content: contentEl,
      autoRaf: true,
      overscroll: false,
    });
    return () => lenis.destroy();
  }, [root, wrapper, content]);
}
