'use client';

import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * A small reusable glass confirm dialog (radix Dialog + the admin glass material),
 * so destructive confirmations match the rest of the admin instead of a native
 * window.confirm. Controlled: the caller owns `open`/`pending`.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* Flex-centering scroll container (see PasskeyPrompt): centre via
            flexbox so `transform` stays free for the open animation and the
            panel can't land off-centre or push the page. */}
        <div className="fixed inset-0 z-50 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Content
              className={cn(
                'relative w-[min(92vw,24rem)] p-6',
                glassSurface,
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <GlassRim />
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  type="button"
                  size="small"
                  shimmer={false}
                  showIcon={false}
                  onClick={onConfirm}
                  disabled={pending}
                  background={destructive ? 'var(--destructive)' : undefined}
                  className={cn(
                    'w-full sm:w-auto',
                    destructive && 'border-transparent [color:#fafafa]',
                  )}
                >
                  {pending ? 'Working…' : confirmLabel}
                </Button>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
