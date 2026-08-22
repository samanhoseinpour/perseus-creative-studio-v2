'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The two focus behaviours every /admin list bar wants, hoisted out of the
 * four hand-copied versions that had already drifted apart.
 *
 * Landing on a list and having to click before typing was the single most
 * repeated piece of member feedback about the dashboard. The catch is that
 * the inbox and the task table both bind single-key shortcuts (j/k, x, e, s,
 * z…) whose guards skip anything typed inside an input — so a focused search
 * box silently disables them. Escape is the way back out, and it is not
 * optional: see the two-stage handler below.
 */

/** The ⌘B gate, verbatim. Keyboard affordances in this dashboard are
 *  lg-and-mouse only (every shortcut legend is `hidden lg:block` for the same
 *  reason) — and on a phone an autofocused field means the software keyboard
 *  pops on every navigation, covering the list you came to read. */
const KEYBOARD_MEDIA = '(min-width: 64rem) and (pointer: fine)';

/**
 * Where a single-key shortcut must NOT fire — `/` here, and j/k/x/e/s/z on
 * the inbox and task lists, which import this rather than keeping a copy.
 * This is TaskFilterBar's superset, which is the correct one: Radix renders
 * menu items as divs, not buttons, so without the role selectors pressing
 * `/` with a filter dropdown open yanked focus into the search box sitting
 * behind the open menu. InboxFilterBar, ProjectsList and ClientsGrid all
 * shipped the short version and all had that bug — and InboxKeyboardList's
 * own j/k guard still had it after they were fixed, so type-ahead in an
 * open Role filter archived or spammed the row under the hidden cursor.
 * Radix's content handler only preventDefaults Tab/arrows/selection keys;
 * character keys feed its typeahead and bubble to window. Every Radix item
 * sits under the `[role="menu"]` content element, so `closest()` on that
 * one role covers menuitem / menuitemradio / menuitemcheckbox alike.
 */
export const EDITABLE_TARGET =
  'input, textarea, select, a, button, [role="button"], [role="menu"], ' +
  '[role="menuitem"], [role="listbox"], [role="option"], [role="dialog"]';

/**
 * Focus an input once, on mount, on a real keyboard. The decision is taken in
 * a `useState` initializer and never revisited: a plain effect dependency
 * would re-fire when the caller's `enabled` flips (ClientsGrid strips its
 * `?client=` param a render later), stealing focus out of the dialog that had
 * just opened.
 */
export function useFocusOnMount(
  ref: React.RefObject<HTMLInputElement | null>,
  enabled = true,
) {
  const [focusAtMount] = useState(
    () =>
      enabled &&
      typeof window !== 'undefined' &&
      window.matchMedia(KEYBOARD_MEDIA).matches,
  );

  useEffect(() => {
    if (!focusAtMount) return;
    const el = ref.current;
    if (!el) return;
    // preventScroll because App Router restores scroll after mount on a back
    // navigation — a focus-induced scroll-to-top would race it.
    el.focus({ preventScroll: true });
    // Caret to the END, never select(): a ⌘K "view all" handoff arrives with
    // its term already in the box, and the next keystroke should refine it,
    // not destroy it.
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [focusAtMount, ref]);
}

/**
 * The full search-box grammar: focus on arrival, `/` from anywhere, and
 * Escape to leave.
 *
 * Escape runs in two stages — "Escape empties, Escape again lets go" — so the
 * list shortcuts are always one keystroke away. Pass `onClear` to enable the
 * first stage; without it Escape blurs immediately.
 */
export function useSearchFocus(
  ref: React.RefObject<HTMLInputElement | null>,
  {
    autoFocus = true,
    onClear,
  }: { autoFocus?: boolean; onClear?: () => void } = {},
) {
  useFocusOnMount(ref, autoFocus);

  // Latest-ref so an inline arrow doesn't re-bind the listener on every
  // keystroke. Assigned in an effect, not during render (the `purity` rule).
  const clearRef = useRef(onClear);
  useEffect(() => {
    clearRef.current = onClear;
  });

  // `/` focuses the box from anywhere on the page. Deliberately NOT
  // preventScroll: someone pressing `/` from further down the list needs the
  // box brought into view, and a silently off-screen focused input is worse
  // than a scroll.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.closest(EDITABLE_TARGET))) return;
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ref]);

  // Escape, bound to the ELEMENT rather than the window, so a dialog's
  // Escape and the lists' own selection-clearing Escape are untouched.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Owned in both stages: WebKit and Blink natively empty a
      // type="search" on Escape, which would race stage 1 and skip stage 2.
      e.preventDefault();
      const clear = clearRef.current;
      if (clear && (e.currentTarget as HTMLInputElement).value !== '') {
        clear();
        return;
      }
      (e.currentTarget as HTMLInputElement).blur();
    }
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [ref]);
}
