'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Keep native touch scrolling alive on a scroller inside an open Radix modal.
 *
 * Radix mounts react-remove-scroll on the Overlay with shards=[Content], and
 * its document-level non-passive touchmove listener re-judges every move of a
 * gesture: a first move with a zero/ambiguous delta, a horizontal wobble, or a
 * downward settle while the scroller sits at scrollTop 0 gets
 * preventDefault()ed — and per the touch-events spec, cancelling the FIRST
 * touchmove disables scrolling for the remainder of that touch. A results
 * list that always opens at the top therefore reads as "won't scroll" on
 * phones, while desktop wheel (judged per-event, no first-move rule) works.
 *
 * The escape is a native stopPropagation ON THE SCROLLER: its touchmoves
 * never bubble to the document listener, so the browser scrolls natively.
 * It must be a real addEventListener — React 19 under the App Router
 * delegates synthetic events at `document`, the same node react-remove-scroll
 * listens on, where stopPropagation can no longer shield a sibling listener.
 * The page behind stays still: the scroller's own `overscroll-contain` stops
 * chaining, and the modal's body lock holds everything else. Gestures that
 * start outside the scroller (header, backdrop) keep the full lock treatment.
 */
export function useTouchScrollEscape(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const keepNative = (e: TouchEvent) => e.stopPropagation();
    node.addEventListener('touchmove', keepNative, { passive: true });
    return () => node.removeEventListener('touchmove', keepNative);
  }, [ref, active]);
}
