import { glassField } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The task surface's dropdown recipe used to live here, which is why seventeen
 * files across reports, payroll and the dialogs still import it from this path.
 * The panel tokens now live in `@/components/Admin/menu` — the one door for
 * every menu in the dashboard — and are re-exported so those paths keep
 * working. What stays below is genuinely task-specific: the in-cell editor
 * grammar the board's inline edits are built from, and the panel-row boxes the
 * loading skeleton has to reproduce.
 */
export {
  comboList,
  comboPanel,
  dropdownMenuContent,
  menuItem,
  popoverMenuContent,
} from '@/components/Admin/menu';

// ── In-cell editor grammar ──────────────────────────────────────────────────
// The status pill's affordance generalized for every inline-editable cell:
// the cell content is the trigger, a chevron fades in on hover/focus, and
// empty cells surface a ghost "+ …" when the ROW is hovered (the <tr> carries
// `group/row`). All literal strings — the Tailwind scanner rule.

export const cellTrigger =
  'group/cell inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

// pointer-coarse: touch has no hover, so every hover-revealed affordance is
// permanently visible there — otherwise the editors are invisible on iPads.
export const cellChevron =
  'size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100 pointer-coarse:opacity-100';

/** Ghost placeholder for an empty editable cell. */
export const cellGhost =
  'text-muted-foreground/80 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100';

/**
 * The compact input used inside cell popovers (quick-add's field skin).
 * Colour comes from {@link glassField} — the ink-tint token — so the field
 * still reads as a field on the dark frost; only the metrics live here.
 */
export const cellField = cn(glassField, 'h-8 w-full px-2.5 text-sm');

// ── Panel row boxes ─────────────────────────────────────────────────────────
// Every full-width row inside the tasks GlassPanel, plus the table's head cell
// and the two rows under it.
//
// These live here, rather than beside the component that draws them, for one
// reason: AdminSkeletons.tsx has to reproduce each box at exactly the same
// height, and it had been doing that by hand-copying five class strings. It
// drifted, silently and in the direction the file exists to prevent — the
// header row measured 26px against the table's 44, the page tally was missing
// outright, and the tabs were 3px short, so every arrival at /admin/tasks
// jumped. Imported on both sides, a padding change can no longer desync them.
//
// Literal strings only, per the Tailwind-scanner rule above.

/** The hairline under every row in the panel. */
export const panelDivider = 'border-b border-white/40 dark:border-white/10';

/** A panel row's own padding. Separate from {@link panelDivider} because
 *  TaskQuickAdd splits them: the border sits on its wrapper and the padding on
 *  the <form> inside it. */
export const panelRowPad = 'px-3 py-2.5 sm:px-4';

/** The month band, the filter bar and the past-month note: a bordered,
 *  padded, full-width row. */
export const panelRow = cn(panelDivider, panelRowPad);

/** TaskTabs' inner scroller. The `-mb-px` lifts the strip into the wrapper's
 *  border and MUST stay on the strip rather than on a tab — see the long
 *  comment in TaskTabs.tsx for the iOS rubber-band this caused. */
export const tabStrip =
  'no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto overscroll-x-contain px-2 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-0.75rem),transparent)] sm:px-3';

/** One tab. The `border-b-2` is the active underline's track and is part of
 *  the row's height whether or not it is coloured. */
export const tabItem =
  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors';

/**
 * A <th> in the board's table. `pt-2.5` is in here rather than repeated at all
 * nine call sites, which is where the skeleton's copy lost it.
 */
export const tableHeadCell =
  'px-0 pt-2.5 pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground';

/** The header label's box (ColumnHeaderMenu's HeaderTrigger). Geometry only —
 *  the hover, focus and active-sort colours stay with the button, which is the
 *  half the skeleton must NOT reproduce. The `py-0.5` is why the head row is
 *  44px and not the 40 it was before the labels became menu triggers, and the
 *  absent `max-w-full` is deliberate — see the trigger's own comment. */
export const tableHeadTrigger =
  'group/th -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5';

/** The page-scoped totals line under the table. */
export const tallyRow =
  'border-t border-white/40 px-4 py-2 text-right text-[0.7rem] tabular-nums text-muted-foreground sm:px-5 dark:border-white/10';

/** The phone card's tap target. `gap-1`, not the gap-2 the skeleton had:
 *  four lines at 4px apart is 12px of card, six cards is most of a row. */
export const taskCardBody =
  'flex w-full flex-col items-start gap-1 py-3 pr-11 pl-11 text-left';

/** One weekday heading above the month grid. */
export const calendarWeekday =
  'px-2 py-1.5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase';

/** One day cell. `min-h-[7.5rem]` is the whole height budget of the grid:
 *  five or six of these stacked ARE the calendar, so a skeleton that guesses
 *  it moves the page by rows rather than by pixels. */
export const calendarCell =
  'flex min-h-[7.5rem] flex-col gap-1 border-r border-b border-white/40 p-1.5 [&:nth-child(7n)]:border-r-0 dark:border-white/10';

/** One day section in the phone agenda. */
export const agendaDay =
  'border-b border-white/40 px-3 py-2.5 last:border-b-0 dark:border-white/10';
