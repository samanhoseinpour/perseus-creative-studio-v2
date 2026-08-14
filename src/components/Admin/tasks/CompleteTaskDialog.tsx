'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';

import { parseHoursToMinutes } from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The actual-hours confirm that fronts every single-task "mark done": input
 * prefilled with the estimate (or the prior actual) and pre-selected, so a
 * correct guess is a single Enter and a correction is just typing. Controlled
 * by TaskBoard; `key`-remounted per task so state never leaks between rows.
 */
export default function CompleteTaskDialog({
  open,
  onOpenChange,
  taskTitle,
  defaultHours,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  /** Bare hours string ('2', '1.5') — the prefill. */
  defaultHours: string;
  pending?: boolean;
  onConfirm: (actualMinutes: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultHours);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseHoursToMinutes(value);
    if (minutes === null) {
      setError('Enter the hours spent — like 2 or 1.5.');
      return;
    }
    onConfirm(minutes);
  }

  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="24rem"
      onOpenAutoFocus={(e) => {
        // Focus the hours input with its content selected: typing overwrites,
        // Enter confirms the prefill as-is.
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }}
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        Complete task
      </Dialog.Title>
      <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">
        {taskTitle}
      </Dialog.Description>

      <form onSubmit={submit} className="mt-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complete-task-hours">Actual hours</Label>
          <Input
            id="complete-task-hours"
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'complete-task-hours-error' : undefined}
            disabled={pending}
          />
          {error && (
            <p
              id="complete-task-hours-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="submit"
            size="small"
            shimmer={false}
            showIcon={false}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? 'Working…' : 'Mark done'}
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
      </form>
    </GlassDialog>
  );
}
