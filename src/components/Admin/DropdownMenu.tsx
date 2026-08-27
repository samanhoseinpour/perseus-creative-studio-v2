// No 'use client' directive on purpose: every importer is a client entry or a
// leaf of one (the TaskStatusMenu precedent), and Radix's own primitives carry
// the directive already — adding it here would only make the function props a
// client-entry boundary for nothing.
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useRef,
  type ComponentProps,
  type ComponentPropsWithoutRef,
} from 'react';
import { DropdownMenu as Radix } from 'radix-ui';
import { useControllableState } from 'radix-ui/internal';

import { clickShouldOpen, radixHandlesPointerDown } from './menuTrigger';

/**
 * The dashboard's ONE dropdown-menu primitive — Radix's DropdownMenu with a
 * Trigger that also opens on `click`.
 *
 * Radix opens a menu on `pointerdown` and ignores the `click` that follows.
 * On a machine where pointerdown never reaches the page (see menuTrigger.ts
 * for the 2026-08-27 report), that leaves every menu in the dashboard dead
 * while every click-driven control beside it keeps working. The Trigger below
 * records whether Radix acted on the press and, if it did not, opens the menu
 * itself on the click — open only, never toggle, so a working machine sees no
 * difference at all.
 *
 * Everything else is re-exported unchanged, so the JSX at every call site is
 * byte-identical to Radix's own; only the import line moved. ESLint refuses a
 * direct `DropdownMenu` import from 'radix-ui' anywhere else — a menu built on
 * the raw primitive would silently be the one that doesn't open.
 */

type OpenState = { open: boolean; setOpen: (next: boolean) => void };

const OpenContext = createContext<OpenState | null>(null);

function Root({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
  ...rest
}: ComponentProps<typeof Radix.Root>) {
  // Controllable, the way Radix's own Root is, so TaskDateFilter's controlled
  // `open` keeps working and every uncontrolled site keeps its own state.
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: 'DropdownMenu',
  });
  const state = useMemo<OpenState>(() => ({ open, setOpen }), [open, setOpen]);
  return (
    <OpenContext.Provider value={state}>
      <Radix.Root {...rest} open={open} onOpenChange={setOpen}>
        {children}
      </Radix.Root>
    </OpenContext.Provider>
  );
}

const Trigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Radix.Trigger>
>(function Trigger(props, ref) {
  const state = useContext(OpenContext);
  if (!state) {
    throw new Error(
      'DropdownMenu.Trigger needs the Root from @/components/Admin/DropdownMenu above it',
    );
  }
  /** When Radix last acted on a pointerdown here — performance.now(), which is
   *  monotonic; Date.now() is not, and the leaf treats a backward clock as
   *  "stand down". */
  const handledAt = useRef<number | null>(null);
  return (
    <Radix.Trigger
      {...props}
      ref={ref}
      // Both handlers compose the site's own BY HAND rather than through
      // composeEventHandlers: that is a call made during render with a closure
      // that touches a ref, which the React-Compiler lint (react-hooks/refs)
      // cannot tell apart from a render-time ref read. The contract is the
      // same one Radix applies to us a moment later — the site's handler runs
      // first, and preventing default cancels everything after it.
      //
      // Ours runs BEFORE Radix's, so the record is a prediction — the same
      // predicate Radix is about to apply, pinned against its source by the
      // check script.
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        if (event.defaultPrevented) return;
        if (radixHandlesPointerDown(event, props.disabled)) {
          handledAt.current = performance.now();
        }
      }}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        if (
          clickShouldOpen({
            open: state.open,
            handledAt: handledAt.current,
            now: performance.now(),
          })
        ) {
          state.setOpen(true);
        }
      }}
    />
  );
});

export const DropdownMenu = {
  ...Radix,
  Root,
  Trigger,
  DropdownMenu: Root,
  DropdownMenuTrigger: Trigger,
};
