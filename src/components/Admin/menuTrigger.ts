/**
 * Dropdown-menu triggers — the decision half, as a pure leaf.
 *
 * WHY THIS EXISTS AT ALL: a Radix DropdownMenu opens on `pointerdown`, not on
 * `click` — deliberately, so a press-drag-release can open the menu and pick
 * an item in one motion — and its trigger acts only on the LEFT button with
 * NO Ctrl held (macOS ctrl-click is a right click). Everything else a person
 * can press in the dashboard runs on `click`: a Dialog trigger, a link, a
 * NavButton, a form. So on a machine where `pointerdown` never reaches the
 * page — a mouse-gesture or translate extension that stops it at the window,
 * a pen-tablet driver, voice control or a screen reader that activates a
 * button with a synthesised click, a modifier the OS believes is held — every
 * menu in the dashboard is dead while every other button still works. That is
 * exactly what a member reported on 2026-08-27 ("the buttons don't work"): the
 * status, priority and member pills did nothing on two builds a day apart,
 * after a fresh sign-in and a hard refresh, while the row's Edit button opened
 * the dialog beside them. Forty-two triggers across eighteen files ride that
 * primitive, which is why the fallback lives in ONE door (DropdownMenu.tsx)
 * rather than on the pill that happened to be filmed.
 *
 * A PURE LEAF (the `resolvePull` shape): no React, no DOM. The wrapper owns
 * the events; the two decisions live here so scripts/check-menu-trigger.mts
 * can pin them without a browser. Both are silent when wrong — a fallback
 * that fires after Radix already acted toggles the menu straight shut again,
 * which reads as the very bug it exists to fix.
 */

/**
 * Whether Radix's own trigger will act on this press. Mirrors
 * @radix-ui/react-dropdown-menu's predicate byte for byte (react-dropdown-menu
 * 2.1.20, dist/index.mjs:76 — `!disabled && event.button === 0 &&
 * event.ctrlKey === false`); the check script reads that file and refuses to
 * pass if the literal moves, so a Radix upgrade that changes the rule fails
 * here rather than silently double-toggling every menu.
 */
export function radixHandlesPointerDown(
  press: { button: number; ctrlKey: boolean },
  disabled = false,
): boolean {
  return !disabled && press.button === 0 && press.ctrlKey === false;
}

/**
 * How long after a pointerdown Radix acted on a `click` still belongs to
 * that press. A click follows its pointerdown within a few hundred
 * milliseconds; the window is generous because the two mistakes are not
 * symmetric — a stale record costs the fallback standing down once (the
 * person clicks again), while a window too short lets the fallback REOPEN a
 * non-modal menu that a long press had just toggled shut.
 */
export const CLICK_FALLBACK_WINDOW_MS = 1500;

/**
 * Whether a `click` on the trigger should open the menu itself.
 *
 * OPEN ONLY, NEVER TOGGLE. Closing stays Radix's job — Escape, a pick, a
 * pointerdown outside — so the worst a mistaken fallback can do is open a menu
 * that was already closing, never shut one that was just opened. Three
 * refusals:
 *
 * - **Already open.** The click that follows the pointerdown which opened the
 *   menu is the ordinary case on every working machine; it must be a no-op.
 * - **Radix acted on this press.** A handled pointerdown inside the window
 *   means the toggle already happened, whichever way it went.
 * - **A backward clock.** `now` before `handledAt` is a clock artefact within
 *   one press, not a stale record; stand down, because a missed fallback costs
 *   one repeat and a wrong one costs a reopened menu.
 */
export function clickShouldOpen(input: {
  open: boolean;
  /** When Radix last acted on a pointerdown of this trigger, or null. */
  handledAt: number | null;
  now: number;
}): boolean {
  if (input.open) return false;
  if (input.handledAt === null) return true;
  const elapsed = input.now - input.handledAt;
  return elapsed > CLICK_FALLBACK_WINDOW_MS;
}
