'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';

import {
  isTerminalStage,
  TASK_STATUS_LABELS,
  TERMINAL_STATUSES,
  TIME_REQUIRED_ERROR,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import DurationField from '@/components/Admin/tasks/DurationField';
import { otherMonthNote } from '@/components/Admin/tasks/format';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { Label } from '@/components/ui/label';
import { cellField } from '@/components/Admin/tasks/menu';

/**
 * `'handover'` is the phone swipe's mode, and the only one where the dialog
 * decides the target status rather than being told it. Delivered and posted
 * are a FORK after done, so a gesture cannot name which of the two it meant —
 * it commits the intent and this asks. Every other caller already knows.
 */
export type CompleteMode = TaskStatusSlug | 'handover';

export type CompleteResult = {
  /** Resolved here, because of `'handover'` above. */
  status: TaskStatusSlug;
  actualMinutes: number;
  /** Present only when the day field was offered — absent lets the server
   *  keep the date the task already shipped on. */
  completedOn?: string;
  releasedOn?: string;
};

/**
 * The confirm that fronts every move onto or past the shipped set: the hours a
 * task took, the day it was finished, and the day it reached the client.
 * Controlled by TaskBoard; `key`-remounted per task so state never leaks
 * between rows.
 *
 * Every field is conditional, because asking a question that has already been
 * answered is how a confirm becomes something people click through unread:
 *
 *  - HOURS on →done and →needs_approval, the moment work finishes, and on any
 *    move where the task still has no confirmed actual. A done → delivered
 *    move does not re-ask.
 *  - COMPLETED ON on →done (re-issuing it is how a completion day is amended),
 *    and on a terminal move only when the task has never shipped, which is a
 *    task logged straight to Delivered or Posted after the fact.
 *  - HANDED OVER ON on the two terminal stages, always. It is the whole fact
 *    the move records.
 *
 * The two dates are not the same kind of thing and only one carries a warning:
 * a completion day decides which month's report a task lands in, so it gets
 * `otherMonthNote`. A handover day windows nothing at all.
 */
export default function CompleteTaskDialog({
  open,
  onOpenChange,
  mode,
  taskTitle,
  defaultMinutes,
  confirmedMinutes,
  completedDay,
  todayKey,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which transition the confirm fronts — sets the title, the fields and the
   *  button copy. */
  mode: CompleteMode;
  taskTitle: string;
  /** Prefill in minutes — the row's confirmed actual, else its estimate. */
  defaultMinutes: number | null;
  /** The row's CONFIRMED hours, or null when it has none yet. Distinct from
   *  the prefill: this decides whether the question gets asked at all. */
  confirmedMinutes: number | null;
  /** The row's existing completion day key, '' when it has never shipped.
   *  Floors the handover day and decides whether to ask for a completion one. */
  completedDay: string;
  /** The render's today in the reader's zone: both day fields' default, their
   *  ceiling, and what the month note compares against. */
  todayKey: string;
  pending?: boolean;
  onConfirm: (result: CompleteResult) => void;
}) {
  const leadRef = useRef<HTMLInputElement>(null);
  const [minutes, setMinutes] = useState<number | null>(defaultMinutes);
  const [day, setDay] = useState(completedDay || todayKey);
  const [released, setReleased] = useState(todayKey);
  const [pick, setPick] = useState<TaskStatusSlug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const forking = mode === 'handover';
  const target: TaskStatusSlug | null = forking ? pick : mode;
  const terminal = forking || isTerminalStage(mode as TaskStatusSlug);

  const showHours =
    mode === 'done' || mode === 'needs_approval' || confirmedMinutes === null;
  const showDay = mode === 'done' || (terminal && !completedDay);
  const showRelease = terminal;

  /** The day the handover cannot precede: whichever completion date this save
   *  will leave on the row. */
  const releaseFloor = showDay ? day : completedDay;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalMinutes = minutes ?? confirmedMinutes;
    if (finalMinutes === null) {
      setError(TIME_REQUIRED_ERROR);
      return;
    }
    if (!target) {
      setPickError('Pick one.');
      return;
    }
    // The native `max` greys future days out but is not a guarantee — typed
    // input and non-Chromium pickers get past it. The server re-checks both.
    if (showDay) {
      if (!day) {
        setDayError('Pick the day this was finished.');
        return;
      }
      if (day > todayKey) {
        setDayError('That day hasn’t happened yet.');
        return;
      }
    }
    if (showRelease) {
      if (!released) {
        setReleaseError('Pick the day the client got this.');
        return;
      }
      if (released > todayKey) {
        setReleaseError('That day hasn’t happened yet.');
        return;
      }
      if (releaseFloor && released < releaseFloor) {
        setReleaseError('That is before the work was finished.');
        return;
      }
    }
    onConfirm({
      status: target,
      actualMinutes: finalMinutes,
      ...(showDay ? { completedOn: day } : {}),
      ...(showRelease ? { releasedOn: released } : {}),
    });
  }

  const monthNote = showDay ? otherMonthNote(day, todayKey) : null;
  const targetWord = target ? TASK_STATUS_LABELS[target].toLowerCase() : '';
  const confirmCopy =
    mode === 'needs_approval'
      ? 'Send for approval'
      : target
        ? `Mark ${targetWord}`
        : 'Confirm';

  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="24rem"
      onOpenAutoFocus={(e) => {
        // Focus whichever field leads: typing overwrites, Enter confirms the
        // prefill as-is. On a fork there is nothing to preselect, so the
        // choice keeps the browser's own focus.
        if (forking) return;
        e.preventDefault();
        const lead = leadRef.current;
        if (!lead) return;
        lead.focus();
        // Only a text field gets its content selected. `select()` is a no-op
        // on a date input by spec, but the point is that "typing overwrites"
        // is a promise this cannot keep there — a date input takes segment
        // input and has no selection to replace.
        if (lead.type === 'text') lead.select();
      }}
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        {mode === 'done'
          ? 'Complete task'
          : mode === 'needs_approval'
            ? 'Send for approval'
            : forking
              ? 'Deliver or post'
              : `Mark ${TASK_STATUS_LABELS[mode as TaskStatusSlug].toLowerCase()}`}
      </Dialog.Title>
      <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">
        {taskTitle}
      </Dialog.Description>

      <form onSubmit={submit} className="mt-5">
        {forking && (
          <fieldset disabled={pending} className="mb-4">
            <legend className="mb-2 text-sm font-medium text-foreground">
              Which one
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {TERMINAL_STATUSES.map((slug) => (
                <label key={slug} className={chipClasses(pick === slug, pending)}>
                  <input
                    type="radio"
                    name="complete-task-stage"
                    value={slug}
                    checked={pick === slug}
                    onChange={() => {
                      setPick(slug);
                      setPickError(null);
                    }}
                    className="sr-only"
                  />
                  {TASK_STATUS_LABELS[slug]}
                </label>
              ))}
            </div>
            {pickError ? (
              <p
                id="complete-task-pick-error"
                role="alert"
                className="mt-2 px-1 text-xs text-destructive"
              >
                {pickError}
              </p>
            ) : (
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                Delivered means the client has the files. Posted means we put it
                live on their channels.
              </p>
            )}
          </fieldset>
        )}

        {showHours && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="complete-task-hours">Actual time</Label>
            <DurationField
              id="complete-task-hours"
              label="Actual"
              hoursRef={leadRef}
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
        )}

        {showDay && (
          <div className={showHours ? 'mt-4 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
            <Label htmlFor="complete-task-day">Completed on</Label>
            <input
              id="complete-task-day"
              ref={showHours ? undefined : leadRef}
              type="date"
              value={day}
              max={todayKey}
              disabled={pending}
              aria-invalid={dayError != null}
              aria-describedby={dayError ? 'complete-task-day-error' : undefined}
              onChange={(e) => {
                setDay(e.target.value);
                setDayError(null);
                setReleaseError(null);
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

        {showRelease && (
          <div
            className={
              showHours || showDay
                ? 'mt-4 flex flex-col gap-1.5'
                : 'flex flex-col gap-1.5'
            }
          >
            <Label htmlFor="complete-task-released">
              {target ? `${TASK_STATUS_LABELS[target]} on` : 'Handed over on'}
            </Label>
            <input
              id="complete-task-released"
              ref={showHours || showDay ? undefined : leadRef}
              type="date"
              value={released}
              min={releaseFloor || undefined}
              max={todayKey}
              disabled={pending}
              aria-invalid={releaseError != null}
              aria-describedby={
                releaseError ? 'complete-task-released-error' : undefined
              }
              onChange={(e) => {
                setReleased(e.target.value);
                setReleaseError(null);
              }}
              className={cellField}
            />
            {releaseError ? (
              <p
                id="complete-task-released-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {releaseError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {/* No month note here, deliberately: this day is recorded and
                    shown, but no report, leaderboard or digest windows on it,
                    so it cannot move the task anywhere. */}
                The day it reached the client. It does not change which month
                the task counts in.
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
            {pending ? 'Working…' : confirmCopy}
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
