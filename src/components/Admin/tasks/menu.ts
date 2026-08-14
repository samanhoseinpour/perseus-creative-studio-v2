import { glassSurface } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The task surface's shared dropdown/popover recipe — the same classes
 * InboxFilterBar and ExportMenu carry privately, hoisted once for this folder
 * (status menu, filter bar, client combobox all pop panels). Every class
 * below is a LITERAL string — Tailwind's scanner can't see computed names,
 * so the two available-height variants are spelled out per primitive.
 */

/** One selectable row; radix flags hover AND keyboard focus. */
export const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10';

const panelBase = cn(
  'relative z-50 min-w-44 p-1.5',
  glassSurface,
  // overflow-y-auto after glassSurface's overflow-hidden: tw-merge keeps
  // both, and longhands beat shorthands, so y scrolls while x stays clipped.
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
);

/** DropdownMenu.Content panel, viewport-capped via the Radix var. */
export const dropdownMenuContent = cn(
  panelBase,
  'max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto overscroll-contain',
);

/** Popover.Content panel (the client combobox), same treatment. */
export const popoverMenuContent = cn(
  panelBase,
  'max-h-(--radix-popover-content-available-height) overflow-y-auto overscroll-contain',
);

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

/** The compact input used inside cell popovers (quick-add's field skin). */
export const cellField =
  'h-8 w-full rounded-lg border border-white/50 bg-white/40 px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30';
