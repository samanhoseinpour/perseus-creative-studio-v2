/**
 * Pull-to-refresh — the decision half, as a pure leaf.
 *
 * WHY THIS EXISTS AT ALL: an installed dashboard runs in a standalone window
 * with no address bar, so there is no reload button anywhere. Pull down and
 * iOS rubber-bands the page and nothing happens — the app can sit on stale
 * data with no way for the person holding it to ask for more.
 *
 * A PURE LEAF (the `resolveGesture` shape in useSwipeReveal.ts): no React, no
 * DOM, no `window`. The component below it owns the listeners and the paint;
 * everything that can be got WRONG lives here, where
 * scripts/check-pull-to-refresh.mts can reach it without a browser. Every
 * mistake this can make is silent — a gesture that fires too readily eats the
 * task board's card swipes, and one that never fires is indistinguishable from
 * the bug it replaces.
 */

/**
 * How far the finger travels before the pull commits.
 *
 * A PIXEL DISTANCE, and deliberately not a fraction of the viewport — which
 * contradicts its sibling `resolveSwipeAction`, where the threshold is a
 * fraction of the card's own width. The rule there exists because a card is a
 * box the gesture moves, so the same flick must mean the same thing on a
 * 320px phone and a tablet. A pull is not that: it is a thumb reaching down
 * the screen, an ergonomic distance that is the same centimetre of travel on
 * any device. Scaling it to viewport height would make a tall phone demand a
 * longer stretch for no reason.
 */
export const PULL_THRESHOLD_PX = 72;

/** Where the indicator stops following the finger. */
export const PULL_MAX_PX = 96;

/**
 * "A dialog owns the screen, so this gesture is not ours."
 *
 * The BROAD form on purpose, and shared with promptTiming.ts rather than
 * copied: the admin's mobile nav is hand-rolled and carries `role="dialog"`
 * with NO `data-state`, so the Radix-specific selector misses it — and a pull
 * inside the open nav would refresh the page out from under it.
 */
export const PULL_DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

export type PullPhase =
  /** Not a pull: wrong place, wrong direction, or another gesture's. */
  | 'idle'
  /** A pull in progress, not yet far enough to commit. */
  | 'pulling'
  /** Far enough — releasing now refreshes. */
  | 'armed';

/**
 * What a finger that has travelled (dx, dy) from where it landed means.
 *
 * Three refusals, each guarding a gesture this one could steal:
 *
 * - **Not at the top.** Anywhere else the page is scrolling and the finger
 *   belongs to the scroll.
 * - **Upward.** Only a downward drag is a pull; the sign is not decoration.
 * - **Horizontal wins, INCLUDING the tie.** Below 768px the task board is card
 *   swipes — left deletes, right marks done — and reading one of those as a
 *   refresh throws away a gesture the person meant. The reverse costs them one
 *   repeated pull. So the tie goes to `idle`, the mirror of `resolveGesture`
 *   sending its own tie to `scroll` for the same reason.
 */
export function resolvePull(input: {
  dx: number;
  dy: number;
  atTop: boolean;
}): PullPhase {
  const { dx, dy, atTop } = input;
  if (!atTop) return 'idle';
  if (dy <= 0) return 'idle';
  if (Math.abs(dx) >= Math.abs(dy)) return 'idle';
  return dy >= PULL_THRESHOLD_PX ? 'armed' : 'pulling';
}

/**
 * How far the indicator has travelled, in px, for a finger that has moved `dy`.
 *
 * Damped and capped: the indicator follows at half speed and stops at
 * PULL_MAX_PX, so a long drag cannot run it down the screen. Monotonic and
 * never negative — an indicator that went backwards while the finger went
 * forwards would read as the gesture being lost.
 */
export function pullOffset(dy: number): number {
  if (dy <= 0) return 0;
  return Math.min(PULL_MAX_PX, dy * 0.5);
}
