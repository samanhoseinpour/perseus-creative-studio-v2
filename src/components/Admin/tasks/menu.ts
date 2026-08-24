import { glassField } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The task surface's dropdown recipe used to live here, which is why seventeen
 * files across reports, payroll and the dialogs still import it from this path.
 * The panel tokens now live in `@/components/Admin/menu` — the one door for
 * every menu in the dashboard — and are re-exported so those paths keep
 * working. What stays below is genuinely task-specific: the in-cell editor
 * grammar the board's inline edits are built from.
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
