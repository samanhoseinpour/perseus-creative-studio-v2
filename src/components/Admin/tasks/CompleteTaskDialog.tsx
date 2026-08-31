'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';

import {
  TASK_STATUS_LABELS,
  TIME_REQUIRED_ERROR,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import DurationField from '@/components/Admin/tasks/DurationField';
import { otherMonthNote } from '@/components/Admin/tasks/format';
import { Label } from '@/components/ui/label';
import { cellField } from '@/components/Admin/tasks/menu';

/**
 * The actual-time confirm that fronts "send for approval" and any "mark done"
 * that still lacks confirmed hours: the duration field is prefilled with the
 * estimate (or the prior actual) and its hours segment pre-selected, so a
 * correct guess is a single Enter and a correction is just typing. Controlled
 * by TaskBoard; `key`-remounted per task so state never leaks between rows.
 *
 * A →done also picks the DAY the work finished, defaulted to today — most of
 * this board's rows are logged after the fact. It is sent unconditionally:
 * the server reads today's own key as "now", so there is no "did they change
 * it" bookkeeping here, and the common path stays byte-identical. The field is
 * absent on →needs_approval, where completedAt stays null by contract.
 */
export default function CompleteTaskDialog({
  open,
  onOpenChange,
  mode,
  taskTitle,
  defaultMinutes,
  todayKey,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which transition the confirm fronts — sets the title + button copy.
   *  The shipped stages past done share one branch: they confirm the move and
   *  the hours, never a day (see the day field below). */
  mode: TaskStatusSlug;
  taskTitle: string;
  /** Prefill in minutes — the row's confirmed actual, else its estimate. */
  defaultMinutes: number | null;
  /** The render's today in the reader's zone: the day field's default, its
   *  ceiling, and what the month note compares against. */
  todayKey: string;
  pending?: boolean;
  /** `completedOn` is always sent on a done confirm (the server reads today's
   *  key as "now"), and is ignored by the caller on every other mode. */
  onConfirm: (actualMinutes: number, completedOn: string) => void;
}) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const [minutes, setMinutes] = useState<number | null>(defaultMinutes);
  const [day, setDay] = useState(todayKey);
  const [error, setError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (minutes === null) {
      setError(TIME_REQUIRED_ERROR);
      return;
    }
    if (mode === 'done') {
      if (!day) {
        setDayError('Pick the day this was finished.');
        return;
      }
      // The native `max` greys future days out but is not a guarantee — typed
      // input and non-Chromium pickers get past it. The server re-checks too.
      if (day > todayKey) {
        setDayError('That day hasn’t happened yet.');
        return;
      }
    }
    onConfirm(minutes, day);
  }

  const monthNote = mode === 'done' ? otherMonthNote(day, todayKey) : null;

  const stageWord = TASK_STATUS_LABELS[mode].toLowerCase();

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
        {mode === 'done'
          ? 'Complete task'
          : mode === 'needs_approval'
            ? 'Send for approval'
            : `Mark ${stageWord}`}
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

        {/* Only →done offers a day. On →delivered and →posted the task keeps
            the date it shipped on, which is the whole reason those stages can
            be moved through without a task changing months: offering a field
            here would invite overwriting it. On →needs_approval completedAt
            stays null by contract, so it would mean nothing. */}
        {mode === 'done' && (
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="complete-task-day">Completed on</Label>
            <input
              id="complete-task-day"
              type="date"
              value={day}
              max={todayKey}
              disabled={pending}
              aria-invalid={dayError != null}
              aria-describedby={dayError ? 'complete-task-day-error' : undefined}
              onChange={(e) => {
                setDay(e.target.value);
                setDayError(null);
              }}
              className={cellField}
            />
            {dayError ? (
              <p
                id="complete-task-day-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {dayError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {monthNote ?? 'The day the work was finished.'}
              </p>
            )}
          </div>
        )}

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
              : mode === 'needs_approval'
                ? 'Send for approval'
                : `Mark ${stageWord}`}
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
