import { adminTopBarTop, glassCard, glassChrome } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * Every box the post editor draws, as class strings, so the screen and
 * `BlogEditorSkeleton` import one definition instead of hand-copying it.
 *
 * `Admin/blogs/listBox.ts` states the reasoning at length: a skeleton is only
 * worth having if each row is the height of the row it stands in for, and the
 * tasks skeleton had been hand-copying five class strings until its head row
 * measured 26px against the table's 44.
 *
 * Literal strings only, per the Tailwind-scanner rule. `cn` is used only to
 * join tokens that are already literals somewhere the scanner can see them.
 */

/**
 * The editor's own sticky bar.
 *
 * Below `lg` it sticks UNDER the dashboard's fixed mobile top bar rather than
 * at the viewport edge, which is what `adminTopBarTop` exists for (the four
 * places that must stay in lockstep). At `lg` that bar is gone and the rail
 * takes over, so the offset drops to zero.
 *
 * `-mx-*` pulls it out to the page gutters so the frosted band spans the
 * measure rather than floating inside it, and the matching padding puts its
 * contents back on the text edge.
 */
export const editorBar = cn(
  'sticky z-30 -mx-5 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-5 py-3 sm:-mx-8 sm:px-8 lg:top-0',
  adminTopBarTop,
  glassChrome,
);

/** The left half of the bar: back, status, save state. */
export const editorBarLead = 'flex min-w-0 flex-1 items-center gap-3';

/** The right half: preview, save, the primary action, the overflow menu. */
export const editorBarActions = 'flex shrink-0 items-center gap-2';

/** The save-state readout. Fixed leading so swapping "Saved" for "Unsaved
 *  changes" cannot move the bar's height. */
export const editorSaveState = 'truncate text-xs leading-5 text-muted-foreground';

/** Canvas on the left, inspector rail on the right. One column until `lg`,
 *  where the rail appears; the rail is `hidden` below that and the same
 *  inspector opens in a dialog instead. */
export const editorLayout = 'grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]';

/** The article column. */
export const editorCanvasColumn = 'flex min-w-0 flex-col gap-6';

/** The inspector rail. Sticky under the editor bar, and its own scroller so a
 *  long metadata pane never runs the page off the bottom. */
export const editorRail =
  'hidden lg:sticky lg:top-[4.25rem] lg:block lg:max-h-[calc(100svh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain';

/** The title. A textarea rather than an input so a long headline wraps instead
 *  of scrolling sideways, sized by its own content in the browser. */
export const editorTitleField =
  'w-full resize-none border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-4xl';

/** The inspector's own panel. */
export const inspectorPanel = cn(glassCard, 'flex flex-col');

/** Post / SEO. The list's tab grammar at the inspector's smaller measure. */
export const inspectorTabStrip =
  'flex items-center gap-1 border-b border-white/40 px-2 dark:border-white/10';

export const inspectorTab =
  'flex flex-1 shrink-0 items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors';

/** The pane under the tabs. */
export const inspectorBody = 'flex flex-col gap-5 p-4';

/** A labelled group inside a pane. */
export const inspectorGroup = 'flex flex-col gap-2';

/** The hairline between groups. */
export const inspectorDivider = 'border-t border-white/40 dark:border-white/10';

/** One editable row in a list field (a takeaway, a keyword, a source). */
export const inspectorRow = 'flex items-start gap-2';

/** The small square button that removes a row. */
export const inspectorRowRemove =
  'mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

/** A card holding one multi-field row (an FAQ, an entity). */
export const inspectorCard =
  'flex flex-col gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3';

/** The Google-style snippet preview. Deliberately NOT glass: it is a picture
 *  of a search result, and framing it as another dashboard panel would make it
 *  read as one more field rather than as a preview of somewhere else. */
export const snippetShell =
  'flex flex-col gap-1 rounded-xl border border-foreground/12 bg-background/60 p-3';
