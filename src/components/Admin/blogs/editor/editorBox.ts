/**
 * Every box the blog editor draws, as class strings, so the canvas, its
 * toolbar, its menus and (task 17) its skeleton import one definition instead
 * of hand-copying five. `Admin/blogs/listBox.ts` states the reasoning at
 * length: a skeleton is only worth having if each row is the height of the row
 * it stands in for.
 *
 * The canvas is WHITE and its text is black, in both themes, because it is a
 * rendering of the public article and the public article is on white. The
 * chrome around it (toolbar, menus, bubbles) is white too, for the same
 * reason: a translucent glass bar over a white sheet reads as a smudge.
 *
 * Literal strings only, per the Tailwind-scanner rule.
 */

/** The sheet the article sits on. */
export const editorShell =
  'relative overflow-hidden rounded-2xl border border-foreground/12 bg-white shadow-sm';

/** The toolbar strip. Sticky inside the shell so it survives a long article. */
export const editorToolbar =
  'sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-black/10 bg-white/95 px-2 py-1.5 backdrop-blur-sm';

/** One toolbar control. `aria-pressed` carries the active state, so the styling
 *  and the accessible state cannot disagree. */
export const editorToolButton =
  'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.06] hover:text-black disabled:pointer-events-none disabled:opacity-35 aria-pressed:bg-black/[0.09] aria-pressed:text-black';

/** The hairline between toolbar groups. */
export const editorToolDivider = 'mx-1 h-5 w-px shrink-0 bg-black/10';

/** The writing area's own padding. The prose class lands on the ProseMirror
 *  root inside it, never on a wrapper: its selectors are direct-child. */
export const editorCanvas = 'px-4 py-6 sm:px-8 sm:py-10';

/** Floating chrome: the slash menu and both bubble menus. */
export const editorPopover =
  'z-50 flex max-h-[min(20rem,60svh)] w-64 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl shadow-neutral-950/15';

/** The bubble menus are a row rather than a list, so they size to content. */
export const editorBubble =
  'z-50 flex items-center gap-0.5 rounded-xl border border-black/10 bg-white p-1 shadow-xl shadow-neutral-950/15';

/** One row in the slash menu. */
export const editorMenuItem =
  'flex w-full cursor-pointer select-none flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left outline-none';

/** The highlighted row. Applied by index rather than by :hover, because the
 *  keyboard drives this list and a stale mouse position must not out-rank the
 *  arrow keys. */
export const editorMenuItemActive = 'bg-black/[0.07]';
