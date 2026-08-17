'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Dialog } from 'radix-ui';

import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { useLenisFreeze } from '@/hooks/useLenisFreeze';
import { cn } from '@/lib/utils';

/** Literal classes only — Tailwind's scanner can't see computed names. */
const MAX_WIDTHS = {
  '24rem': 'max-w-96',
  '26rem': 'max-w-104',
  '28rem': 'max-w-112',
  '30rem': 'max-w-120',
  '34rem': 'max-w-136',
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
 */
export default function GlassDialog({
  open,
  onOpenChange,
  maxWidth = '24rem',
  className,
  children,
  ...contentProps
}: GlassDialogProps) {
  useLenisFreeze(open);
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
            <div
              data-lenis-prevent
              className={cn(
                'min-h-0 overflow-y-auto overscroll-contain p-6',
                className,
              )}
            >
              {children}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
