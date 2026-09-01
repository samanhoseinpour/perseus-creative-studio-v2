'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { advanceTargets, TASK_STATUS_LABELS, type TaskStatusSlug } from '@/lib/taskFields';

/**
 * The phone board's swipe grammar — the first gesture primitive in this
 * codebase, so the reasoning lives here rather than in the component.
 *
 * Three gestures share one finger on a task card: the page scrolls, the card
 * swipes, and a still finger selects. `resolveGesture` is the whole
 * arbitration and it is pure, so `scripts/check-swipe-actions.mts` can pin it
 * — a card that swipes when someone meant to scroll is unusable, and a card
 * that scrolls when someone meant to swipe just looks broken.
 *
 * `touch-action: pan-y` on the card does half the work for us: the browser
 * keeps vertical scrolling native and hands us the horizontal axis, firing
 * `pointercancel` the moment it decides the gesture is a scroll. We still run
 * our own dominance check for the handful of pixels before that decision, or
 * the card visibly twitches sideways at the start of every scroll.
 *
 * Hand-rolled rather than motion's `drag`, even though `motion` is already in
 * the admin chunk and would cost no bytes: `drag` models one gesture, not
 * three, and one active pointer beats fifty drag instances on a page.
 */

/** Movement, in px, that ends the "is this still a tap?" question. */
export const SWIPE_SLOP = 8;

/** How long a still finger rests before it means "select this one". */
export const LONG_PRESS_MS = 500;

/** Fraction of the card's OWN width a drag must cross to commit. A ratio and
 *  not a px constant: the same gesture has to feel identical on a 320px phone
 *  and a 760px tablet held in portrait. */
export const SWIPE_COMMIT_RATIO = 0.35;

/** How far past its width a card may be dragged — past this it rubber-bands,
 *  so a long flick can never leave the row visually empty. */
const SWIPE_MAX_RATIO = 0.6;

/** A drag the row cannot honour still MOVES, damped, rather than sticking:
 *  a card that refuses to budge reads as a broken gesture, where one that
 *  gives a little and springs back reads as "not here". */
const DAMPING = 4;

export type SwipeAction = 'delete' | 'advance';

export type Gesture = 'pending' | 'scroll' | 'swipe' | 'press';

/**
 * What a finger is doing, from its travel and how long it has been down.
 *
 * A tie between the axes resolves to `scroll` on purpose. The two mistakes are
 * not equal: reading a scroll as a swipe drags a card the reader never meant
 * to touch and can commit a delete, while reading a swipe as a scroll costs
 * one repeated gesture.
 */
export function resolveGesture(
  dx: number,
  dy: number,
  elapsedMs: number,
): Gesture {
  if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) {
    return elapsedMs >= LONG_PRESS_MS ? 'press' : 'pending';
  }
  return Math.abs(dy) >= Math.abs(dx) ? 'scroll' : 'swipe';
}

/**
 * Which action a horizontal travel of `dx` across a `width`-px card commits,
 * or null for "springs back".
 *
 * A right-swipe moves work FORWARD (`advanceTargets` in taskFields.ts):
 * anything open goes to done, and a done task goes on to one of the two
 * terminal stages. The refusal at the end is the load-bearing line and it is
 * the same argument it always was: a flick may only ever push work forward. It
 * can never reopen a task, which would pull it out of a month that has already
 * been reported — and `/share/reports/[token]` recomputes live, so a link
 * already sent to a client would change. Going backwards stays in the ⋯ menu
 * and the task window, where it is deliberate.
 *
 * A delivered or posted row therefore swipes nowhere to the right: it is
 * finished. The refusal is expressed as an EMPTY target list rather than
 * `status === 'posted'`, so a stage added later inherits it.
 *
 * Note the swipe does not decide WHICH terminal stage a done task takes — it
 * cannot, since delivered and posted are a fork. It commits the gesture and
 * the confirm asks, which is the same shape every other swipe here has: no
 * gesture on this board writes anything on its own.
 */
export function resolveSwipeAction(
  status: TaskStatusSlug,
  dx: number,
  width: number,
): SwipeAction | null {
  if (width <= 0) return null;
  if (Math.abs(dx) < width * SWIPE_COMMIT_RATIO) return null;
  if (dx > 0) return canSwipeAdvance(status) ? 'advance' : null;
  return 'delete';
}

/** True when a right-swipe has anywhere to go on a row in this status. */
export function canSwipeAdvance(status: TaskStatusSlug): boolean {
  return advanceTargets(status).length > 0;
}

/** What the reveal behind a right-swipe says. One target names itself; the
 *  fork after done cannot, so it names the question the confirm will ask. */
export function advanceLabel(status: TaskStatusSlug): string {
  const targets = advanceTargets(status);
  if (targets.length === 0) return '';
  if (targets.length === 1) return TASK_STATUS_LABELS[targets[0]];
  return 'Deliver or post';
}

type Options = {
  status: TaskStatusSlug;
  /** False while a selection is live — the bulk bar owns the actions then. */
  enabled: boolean;
  onDelete: () => void;
  onAdvance: () => void;
  onLongPress: () => void;
};

export function useSwipeReveal({
  status,
  enabled,
  onDelete,
  onAdvance,
  onLongPress,
}: Options) {
  const [dx, setDx] = useState(0);
  const [gesture, setGesture] = useState<Gesture>('pending');

  const start = useRef<{ x: number; y: number; at: number } | null>(null);
  /** The card's own width, measured once per gesture. STATE and not a ref
   *  because `armed` below is read during render — a ref would be stale to
   *  the renderer and the reveal would never reach its committed tone. */
  const [width, setWidth] = useState(0);
  const decided = useRef<Gesture>('pending');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set by a swipe or a long-press, read by the card's onClick — a pointer
   *  sequence that did either must not also fire the tap. */
  const consumed = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    start.current = null;
    decided.current = 'pending';
    setGesture('pending');
    setDx(0);
  }, [clearTimer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // The card's own controls (checkbox, ⋯ menu) opt out by attribute
      // rather than by tag: the card BODY is itself a <button>, so a
      // tag-based guard would refuse every swipe there is.
      if (!enabled || e.target instanceof Element === false) return;
      if ((e.target as Element).closest('[data-no-swipe]')) return;
      // Secondary buttons and pen erasers have no business here.
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      consumed.current = false;
      setWidth(e.currentTarget.getBoundingClientRect().width);
      start.current = { x: e.clientX, y: e.clientY, at: Date.now() };
      decided.current = 'pending';

      clearTimer();
      timer.current = setTimeout(() => {
        if (decided.current !== 'pending') return;
        decided.current = 'press';
        consumed.current = true;
        setGesture('press');
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [clearTimer, enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const from = start.current;
      if (!from) return;

      const moveX = e.clientX - from.x;
      const moveY = e.clientY - from.y;

      if (decided.current === 'pending') {
        const next = resolveGesture(moveX, moveY, Date.now() - from.at);
        if (next === 'pending') return;
        if (next === 'press') return; // the timer owns that transition
        clearTimer();
        decided.current = next;
        setGesture(next);
        if (next === 'scroll') {
          start.current = null;
          return;
        }
        // Capture only once we KNOW it is ours, so a scroll that began here
        // still reaches the document.
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      if (decided.current !== 'swipe') return;

      consumed.current = true;
      const allowed = moveX > 0 ? canSwipeAdvance(status) : true;
      const raw = allowed ? moveX : moveX / DAMPING;
      const cap = width * SWIPE_MAX_RATIO;
      setDx(Math.max(-cap, Math.min(cap, raw)));
    },
    [clearTimer, status, width],
  );

  const finish = useCallback(() => {
    const wasSwipe = decided.current === 'swipe';
    const travelled = dx;
    reset();
    if (!wasSwipe) return;
    const action = resolveSwipeAction(status, travelled, width);
    if (action === 'delete') onDelete();
    else if (action === 'advance') onAdvance();
  }, [dx, onAdvance, onDelete, reset, status, width]);

  const onPointerCancel = useCallback(() => reset(), [reset]);

  /** The card's onClick asks this first: a pointer sequence that swiped or
   *  long-pressed has already been spent. */
  const consumedTap = useCallback(() => {
    const spent = consumed.current;
    consumed.current = false;
    return spent;
  }, []);

  const armed = resolveSwipeAction(status, dx, width);

  return {
    dx,
    armed,
    swiping: gesture === 'swipe',
    consumedTap,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel,
    },
  };
}
