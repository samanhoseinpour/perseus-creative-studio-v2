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

// ── What a skeleton of the canvas draws ─────────────────────────────────────
// Two boxes, exported for the reason every box in this file is: `BodyEditorLazy`
// draws the canvas while the editor chunk loads and `BlogEditorSkeleton` draws
// it while the PAGE loads, and the two have to be the same height or the
// article column steps twice on the way in. They were hand-copied between the
// two until the task 17 review caught it.

/** One line of stand-in prose inside the canvas. Sits in a text-sized span,
 *  the `SkeletonText` shape: a bare `h-2.5` div measures itself and comes out
 *  short of the line box the sentence would have had. Darker than the
 *  dashboard's own `foreground/10` because the canvas is white in both themes,
 *  where an ink-tinted bar would disappear. */
export const editorSkeletonLine =
  'inline-block h-2.5 rounded bg-black/[0.07] align-middle';

/** The toolbar strip's stand-in, at the height the real controls occupy. */
export const editorSkeletonToolbar = 'h-8 w-full rounded-lg bg-black/[0.05]';

/** Floating chrome: the slash menu and both bubble menus. */
export const editorPopover =
  'z-50 flex max-h-[min(20rem,60svh)] w-64 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl shadow-neutral-950/15';

/** The bubble menus are a row rather than a list, so they size to content. */
export const editorBubble =
  'z-50 flex items-center gap-0.5 rounded-xl border border-black/10 bg-white p-1 shadow-xl shadow-neutral-950/15';

// ── The node views ──────────────────────────────────────────────────────────
// The eight custom nodes render as themselves in the canvas, and these are the
// boxes they draw. They ECHO `Mdx/HowTo` and `Mdx/ProsCons` (a hairline card, a
// mono uppercase label, no chroma) rather than importing them: those are server
// components that introspect their React children, which a node view does not
// have — its children are ProseMirror's contentDOM.

/** A custom node's card. `my-8` matches the article's own block rhythm so the
 *  canvas keeps the spacing the published page has. */
export const editorNodeShell = 'my-8 overflow-hidden rounded-2xl border border-black/12';

/** The strip along the top of a card: what the block is, and its controls. */
export const editorNodeBar =
  'flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-black/10 bg-black/[0.02] px-3 py-2';

/** What the block is called. Never a heading: a heading inside the body would
 *  join the article's heading order and demand a TOC entry, which is the same
 *  reason `Mdx/HowTo` uses a bare span. */
export const editorNodeLabel =
  'font-mono text-[10px] uppercase tracking-[0.15em] text-black/55';

/** A value the writer can change, sitting inline in the bar. Bordered only on
 *  hover and focus, so a row of them does not read as a form. */
export const editorNodeInput =
  'min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-black outline-none placeholder:text-black/35 hover:border-black/10 focus:border-black/25 disabled:cursor-default';

/** The media well inside an atom's card: the picture, or the video poster.
 *  Not the editable region of a container node, which is a `NodeViewContent`
 *  carrying whatever grammar its own block needs. */
export const editorNodeWell = 'px-3 py-3';

/** A short, quiet line of explanation inside a card. */
export const editorNodeNote = 'px-3 py-2 text-xs text-black/55';

/** The same line when the block cannot be saved as it stands (an image with
 *  no description, a step with no title). Not rose: `--destructive` is the
 *  dashboard's own refusal colour and the canvas already borrows nothing else
 *  from the glass theme, so this is the one token that crosses. */
export const editorNodeProblem = 'px-3 py-2 text-xs text-[var(--destructive)]';

/** The white controls panel a card's popover opens. */
export const editorNodePanel =
  'z-50 flex w-72 flex-col gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-xl shadow-neutral-950/15';

/** A field label inside that panel. */
export const editorNodeFieldLabel = 'text-xs font-medium text-black/70';

/** A field inside that panel. Boxed, unlike the inline ones: a panel IS a
 *  form and reads better as one. */
export const editorNodeField =
  'w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black outline-none placeholder:text-black/35 focus:border-black/35';

/** One row in the slash menu. */
export const editorMenuItem =
  'flex w-full cursor-pointer select-none flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left outline-none';

/** The highlighted row. Applied by index rather than by :hover, because the
 *  keyboard drives this list and a stale mouse position must not out-rank the
 *  arrow keys. */
export const editorMenuItemActive = 'bg-black/[0.07]';
