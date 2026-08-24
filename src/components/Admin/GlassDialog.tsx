'use client';

import { useRef, type ComponentPropsWithoutRef } from 'react';
import { Dialog } from 'radix-ui';

import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { useLenisFreeze } from '@/hooks/useLenisFreeze';
import { useTouchScrollEscape } from '@/hooks/useTouchScrollEscape';
import { cn } from '@/lib/utils';

/** Literal classes only — Tailwind's scanner can't see computed names.
 *
 *  The rungs below 40rem are single-column dialogs — a confirm, a password
 *  field, a short form — where more width would only stretch the line. From
 *  40rem up the body is expected to SPLIT (`md:grid-cols-2`): the tall forms
 *  and the vocabulary managers earn their width by trading height for it,
 *  which is the whole point of widening them. Don't reach for a wide rung
 *  without giving the body columns to fill. */
const MAX_WIDTHS = {
  '24rem': 'max-w-96',
  '26rem': 'max-w-104',
  '28rem': 'max-w-112',
  '30rem': 'max-w-120',
  '34rem': 'max-w-136',
  // The tag manager: name + group + scope + count + two icon buttons per row
  // needs more than the category manager's single dropdown.
  '40rem': 'max-w-160',
  '44rem': 'max-w-176',
  '48rem': 'max-w-192',
  '52rem': 'max-w-208',
} as const;

type GlassDialogProps = Omit<
  ComponentPropsWithoutRef<typeof Dialog.Content>,
  'className'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Panel cap; default matches ConfirmDialog's 24rem. */
  maxWidth?: keyof typeof MAX_WIDTHS;
  /** Extra classes for the inner scroller (padding tweaks etc.). */
  className?: string;
  /** Title + description, pinned above the scroller. Optional: a dialog whose
   *  body never scrolls reads better with them inline in `children`. */
  header?: React.ReactNode;
  /** Primary actions, pinned below the scroller — so a long form's Save button
   *  is reachable without scrolling to the bottom of it. */
  footer?: React.ReactNode;
};

/**
 * The admin's glass dialog shell. Two structural rules, both learned the
 * hard way (CommandPalette is the precedent that always worked):
 *
 *  1. The scroller must live INSIDE Dialog.Content. Radix mounts
 *     react-remove-scroll on the Overlay with shards=[content], and the
 *     shard's scroll-capacity walk never ascends past Content — an ancestor
 *     scroll wrapper is invisible to it, so every wheel/touch over the panel
 *     gets preventDefault()ed and tall dialogs become unreachable.
 *  2. The Overlay needs data-lenis-prevent. Backdrop wheel targets it (the
 *     centering wrapper inherits the locked body's pointer-events:none, so
 *     hit-testing falls through), and without the attribute root Lenis
 *     scrolls the page behind the modal — its programmatic scroll ignores
 *     Radix's body{overflow:hidden} lock.
 *
 * Belt-and-braces, Lenis is also paused while open (ref-counted for the
 * nested-ConfirmDialog case). Title/Description/Close stay in the caller —
 * Dialog.Root's context reaches them through the portal.
 *
 * `header` and `footer` are optional slots rendered OUTSIDE the scroller, so a
 * tall dialog keeps its title and its Save button in view while the body
 * moves. Passing neither is byte-identical to the original single-scroller
 * shape, which is why the small dialogs were never touched. Note rule 1 above
 * still holds: the shard walk stops at Content, and the scroller is a child of
 * it either way.
 */
export default function GlassDialog({
  open,
  onOpenChange,
  maxWidth = '24rem',
  className,
  header,
  footer,
  children,
  ...contentProps
}: GlassDialogProps) {
  useLenisFreeze(open);
  // Off-desktop there is no Lenis to freeze and the threat inverts: Radix's
  // own lock (react-remove-scroll) preventDefault()s the first touchmove of
  // most real thumb gestures over the scroller, which spec-kills the whole
  // touch — tall dialogs read as unscrollable on phones. The hook lets the
  // scroller's touchmoves bypass that lock; wheel handling is unchanged.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useTouchScrollEscape(scrollerRef, open);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-lenis-prevent
          className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        {/* Centering wrapper — NOT the scroller. No pointer-events class:
            it inherits `none` from the Radix-locked body, so backdrop hits
            fall through to the Overlay and outside-dismiss keeps working. */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Dialog.Content
            {...contentProps}
            className={cn(
              'relative flex max-h-full w-full flex-col',
              MAX_WIDTHS[maxWidth],
              glassSurface,
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            )}
          >
            <GlassRim />
            {header && (
              <div className="shrink-0 border-b border-white/40 px-6 pt-6 pb-4 dark:border-white/10">
                {header}
              </div>
            )}
            <div
              ref={scrollerRef}
              data-lenis-prevent
              // No `flex-1` here: `flex: 1 1 0%` zeroes the flex basis, and in
              // an auto-height container (Content is max-h-full, not h-full)
              // there is no free space to grow back from — the body collapses.
              // Default shrink against `shrink-0` slots is what does the work:
              // the panel is content-sized until it hits the cap, then the
              // scroller is the only child allowed to give.
              className={cn(
                'min-h-0 overflow-y-auto overscroll-contain p-6',
                header && 'pt-5',
                footer && 'pb-5',
                className,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-white/40 px-6 py-4 dark:border-white/10">
                {footer}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
