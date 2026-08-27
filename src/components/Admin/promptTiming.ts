/**
 * When an unbidden dialog may open — shared by every admin surface that opens
 * one at the viewer rather than in reply to a click: ReleaseNotice and
 * NotificationsPrompt today, PasskeyPrompt's plain 400ms timer predating it.
 *
 * One door, because the SELECTOR below is the whole point and a second copy of
 * it would drift away from the lesson baked into it.
 */

/** Long enough to clear PasskeyPrompt's 400ms, and to let the shader paint. */
// The dialog selector lives in pullToRefresh.ts and is SHARED, not copied:
// two gestures now ask "does a dialog own the screen?" and a second copy is
// how one of them silently stops covering the hand-rolled mobile nav.
import { PULL_DIALOG_SELECTOR } from '@/components/Admin/pullTiming';

export const OPEN_DELAY_MS = 1200;
/** How often to look again while something else owns the screen. */
export const RETRY_MS = 3000;
/** ~1 minute of patience, then leave it to the next page load. */
export const MAX_TRIES = 20;

/**
 * Whether it is rude to open right now.
 *
 * Two blockers, both learned the hard way:
 *
 *  - ANOTHER DIALOG. PasskeyPrompt opens on a 400ms timer, so on any first
 *    sign-in without a passkey we would land on top of it. The selector is
 *    plain `[role="dialog"]` rather than the Radix-specific
 *    `[role="dialog"][data-state="open"]`, because MobileSheet (the admin nav
 *    on phones) is hand-rolled: it carries role="dialog" but NO data-state, so
 *    the narrower selector missed it entirely and we would open over the open
 *    nav. Nothing here mounts a closed dialog, so presence in the DOM is the
 *    same thing as open.
 *  - SOMEONE TYPING. Every admin list autofocuses its search on arrival
 *    (useSearchFocus), so a dialog appearing 1.2s in would take the field away
 *    mid-word and eat what they had typed.
 */
export function blockedFromOpening(): boolean {
  if (document.querySelector(PULL_DIALOG_SELECTOR)) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

/**
 * Open on a beat, and keep trying while something else owns the screen.
 * Returns the cleanup for the caller's effect.
 *
 * A RETRY, not a one-shot. The earlier version returned when something else
 * owned the screen, and because these components are mounted in the protected
 * layout — which App Router preserves across client navigation — the effect
 * never ran again. So "stand down for one navigation" was really "stand down
 * for the whole session", and for anyone signing in without a passkey that was
 * guaranteed, every time.
 */
export function scheduleDialogOpen(open: () => void): () => void {
  let tries = 0;
  let timer: ReturnType<typeof setTimeout>;

  const attempt = () => {
    if (!blockedFromOpening()) {
      open();
      return;
    }
    tries += 1;
    // Give up eventually rather than poll for ever: it opens on the next full
    // page load.
    if (tries >= MAX_TRIES) return;
    timer = setTimeout(attempt, RETRY_MS);
  };

  // The first beat is deliberate, per PasskeyPrompt: "let the dashboard and
  // its shader paint first; a dialog that appears mid hydration reads as a
  // glitch."
  timer = setTimeout(attempt, OPEN_DELAY_MS);
  return () => clearTimeout(timer);
}
