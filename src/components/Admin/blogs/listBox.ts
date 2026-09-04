/**
 * Every box the /admin/blogs posts list draws, as class strings both the list
 * and `BlogsListSkeleton` import.
 *
 * They live here rather than beside the component for the reason
 * `Admin/tasks/menu.ts` states at length: a skeleton is only worth having if
 * each row is the height of the row it stands in for, and the tasks skeleton
 * had been hand-copying five class strings until its head row measured 26px
 * against the table's 44. Imported on both sides, a padding change can no
 * longer desync them.
 *
 * Literal strings only, per the Tailwind-scanner rule.
 */

/** The hairline under every full-width row in the panel. */
export const panelDivider = 'border-b border-white/40 dark:border-white/10';

/** A panel row's own padding. Separate from the divider because the tab strip
 *  splits them: the border sits on the wrapper and the scroller lifts into it. */
export const panelRowPad = 'px-3 py-2.5 sm:px-4';

/** The filter bar and the bulk bar: a bordered, padded, full-width row. */
export const panelRow = `${panelDivider} ${panelRowPad}`;

/**
 * The tab strip's inner scroller. Six tabs do not fit a phone, so it scrolls,
 * and the `-mb-px` that lifts it into the wrapper's border MUST live here
 * rather than on a tab: `overflow-x-auto` makes the Y axis scrollable too, so
 * a `-mb-px` child inside the scroller lets iOS rubber-band the whole strip
 * off screen. The border sits on the wrapper for the same reason.
 */
export const tabStrip =
  'no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto overscroll-x-contain px-2 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-0.75rem),transparent)] sm:px-3';

/** One tab. The `border-b-2` is the active underline's track and is part of the
 *  row's height whether or not it is coloured. */
export const tabItem =
  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors';

/**
 * The seven columns, shared by the head row and every post row.
 *
 * One column set in one place: a head row whose widths are written separately
 * from the rows under it is a head row that lines up until the next edit.
 * Below `lg` the whole grid collapses to a single column and each row stacks,
 * which is why the head row is `lg:grid` only.
 */
export const postGrid =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_10rem_8.5rem_8.5rem_9rem_5rem_6.5rem] lg:items-center lg:gap-x-4';

/** The head row above the list. `pr-11` is the ⋯ gutter every row reserves, so
 *  the last label lines up with the last cell rather than with the menu. */
export const postHeadRow = `${panelDivider} hidden py-2 pr-11 pl-3 sm:pl-4 lg:block`;

/** One label in the head row. */
export const postHeadCell =
  'text-[0.65rem] font-medium tracking-[0.15em] text-muted-foreground uppercase';

/** One post row. `group/row` is what fades the ⋯ trigger in on hover. */
export const postRowShell = 'group/row flex items-center';

/** A row's cell block. No right padding: the ⋯ gutter beside it supplies it,
 *  which is what keeps the seven columns the same width in both rows. */
export const postRowPad = 'py-3 pl-3 sm:pl-4';

/** The ⋯ column, the same 44px the head row reserves. */
export const postMenuGutter = 'flex w-11 shrink-0 items-center justify-center';
