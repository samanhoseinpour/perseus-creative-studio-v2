'use client';

import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
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
    <GlassDialog open={open} onOpenChange={onOpenChange} maxWidth="24rem">
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
    </GlassDialog>
  );
}
