'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';

import { TIME_REQUIRED_ERROR } from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import DurationField from '@/components/Admin/tasks/DurationField';
import HoursQuickPicks from '@/components/Admin/tasks/HoursQuickPicks';
import { Label } from '@/components/ui/label';

/**
 * The actual-time confirm that fronts "send for approval" and any "mark done"
 * that still lacks confirmed hours: the duration field is prefilled with the
 * estimate (or the prior actual) and its hours segment pre-selected, so a
 * correct guess is a single Enter and a correction is just typing. Controlled
 * by TaskBoard; `key`-remounted per task so state never leaks between rows.
 */
export default function CompleteTaskDialog({
  open,
  onOpenChange,
  mode,
  taskTitle,
  defaultMinutes,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which transition the confirm fronts — sets the title + button copy. */
  mode: 'done' | 'needs_approval';
  taskTitle: string;
  /** Prefill in minutes — the row's confirmed actual, else its estimate. */
  defaultMinutes: number | null;
  pending?: boolean;
  onConfirm: (actualMinutes: number) => void;
}) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const [minutes, setMinutes] = useState<number | null>(defaultMinutes);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (minutes === null) {
      setError(TIME_REQUIRED_ERROR);
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
        // Focus the hours segment with its content selected: typing overwrites,
        // Enter confirms the prefill as-is.
        e.preventDefault();
        hoursRef.current?.focus();
        hoursRef.current?.select();
      }}
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        {mode === 'done' ? 'Complete task' : 'Send for approval'}
      </Dialog.Title>
      <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">
        {taskTitle}
      </Dialog.Description>

      <form onSubmit={submit} className="mt-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complete-task-hours">Actual time</Label>
          <DurationField
            id="complete-task-hours"
            label="Actual"
            hoursRef={hoursRef}
            minutes={minutes}
            disabled={pending}
            invalid={error != null}
            describedBy={error ? 'complete-task-hours-error' : undefined}
            onChange={(next) => {
              setMinutes(next);
              setError(null);
            }}
          />
          <HoursQuickPicks
            compact
            disabled={pending}
            onPick={(next) => {
              setMinutes(next);
              setError(null);
            }}
          />
          {error ? (
            <p
              id="complete-task-hours-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The time actually spent on this task.
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
            {pending
              ? 'Working…'
              : mode === 'done'
                ? 'Mark done'
                : 'Send for approval'}
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
