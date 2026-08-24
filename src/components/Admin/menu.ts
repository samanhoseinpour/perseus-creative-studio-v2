import { glassSurface } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The dashboard's ONE dropdown/popover panel recipe — the filter bars, the
 * export menu, the row menus, the cell editors, the comboboxes and the profile
 * menu all pop the same glass panel, so the classes live here once instead of
 * in a private copy per bar (there were five, and they had already drifted).
 *
 * Every class below is a LITERAL string — Tailwind's scanner can't see computed
 * names, so the two available-height variants are spelled out per primitive.
 */

/** One selectable row; radix flags hover AND keyboard focus, and marks an
 *  unavailable option `data-disabled` (the activity bar's month list is the
 *  only user today, but a row that can't be picked has to look that way in
 *  every menu, not just that one). */
export const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10 data-[disabled]:cursor-default data-[disabled]:opacity-50';

/**
 * How tall a menu may get before it scrolls itself. The Radix
 * `*-available-height` var alone means "as much of the viewport as there is",
 * which is how the 85-row client list became a full-page column with its search
 * field scrolled off the top. `min()` keeps the var as the OUTER bound — a
 * short viewport or a trigger near the fold still shrinks the panel — while
 * pinning a comfortable ceiling of roughly nine rows everywhere else. Same
 * register as the ⌘K palette's `min(60svh,24rem)`.
 */
const MENU_MAX_H =
  'max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))]';
const POPOVER_MAX_H =
  'max-h-[min(22rem,var(--radix-popover-content-available-height))]';

const panelBase = cn(
  'relative z-50 min-w-44 p-1.5',
  glassSurface,
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
);

/** DropdownMenu.Content panel — the whole panel is the scroller. */
export const dropdownMenuContent = cn(
  panelBase,
  MENU_MAX_H,
  // overflow-y-auto after glassSurface's overflow-hidden: tw-merge keeps
  // both, and longhands beat shorthands, so y scrolls while x stays clipped.
  'overflow-y-auto overscroll-contain',
);

/** Popover.Content panel, same treatment. */
export const popoverMenuContent = cn(
  panelBase,
  POPOVER_MAX_H,
  'overflow-y-auto overscroll-contain',
);

/**
 * A popover whose first child is a search field (the client and tag pickers).
 * The panel itself must NOT scroll here: the field has to stay put while the
 * results move under it, so the cap lives on the panel and the scrolling is
 * delegated to {@link comboList} below.
 */
export const comboPanel = cn(panelBase, POPOVER_MAX_H, 'flex flex-col');

/** The results list inside a {@link comboPanel}. `min-h-0` is load-bearing —
 *  a flex child's default `min-height:auto` refuses to shrink below its
 *  content, so without it the list pushes the panel past its own cap and
 *  nothing scrolls at all. */
export const comboList = 'min-h-0 flex-1 overflow-y-auto overscroll-contain';
