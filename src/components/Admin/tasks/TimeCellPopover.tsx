// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuChevronDown } from 'react-icons/lu';

import {
  formatMinutes,
  parseHoursToMinutes,
  timeInputValue,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { GlassRim } from '@/components/Admin/Glass';
import HoursQuickPicks from '@/components/Admin/tasks/HoursQuickPicks';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cellChevron, cellField, cellTrigger, popoverMenuContent } from './menu';

/**
 * The time cell's editor: a small popover with the Estimated and Actual
 * fields (the cell shows both values, so a bare inline input can't say which
 * one it edits). Both accept the flexible vocabulary — 1.5, 45m, 1h 30m.
 * Actual is editable only on done / needs_approval rows (hours are confirmed
 * when work finishes); the server backstops it. Enter saves; only changed
 * fields reach the patch.
 */
export default function TimeCellPopover({
  status,
  estimatedMinutes,
  actualMinutes,
  onCommit,
  children,
}: {
  status: TaskStatusSlug;
  estimatedMinutes: number;
  actualMinutes: number | null;
  /** Called with only the fields that actually changed. */
  onCommit: (patch: { estimatedMinutes?: number; actualMinutes?: number }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [est, setEst] = useState('');
  const [actual, setActual] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Diff against the values SEEDED at open, not the live props: the row can
  // change underneath an open popover (teammate edit arriving via re-seed),
  // and diffing against fresh props would submit the stale seed as a
  // "change", silently reverting the newer value.
  const seed = useRef({ est: 0, actual: null as number | null });
  const actualEditable = status === 'done' || status === 'needs_approval';

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      seed.current = { est: estimatedMinutes, actual: actualMinutes };
      setEst(timeInputValue(estimatedMinutes));
      setActual(timeInputValue(actualMinutes));
      setError(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextEst = parseHoursToMinutes(est);
    if (nextEst === null) {
      setError('Estimated time — like 1.5h or 45m.');
      return;
    }
    let nextActual: number | undefined;
    if (actualEditable && actual.trim() === '' && seed.current.actual != null) {
      // These rows always carry an actual; the schema has no way to null it,
      // so say so instead of closing as if the clear saved.
      setError('Actual time can’t be cleared — enter the corrected time.');
      return;
    }
    if (actualEditable && actual.trim() !== '') {
      const parsed = parseHoursToMinutes(actual);
      if (parsed === null) {
        setError('Actual time — like 1.5h or 45m.');
        return;
      }
      if (parsed !== seed.current.actual) nextActual = parsed;
    }
    const patch: { estimatedMinutes?: number; actualMinutes?: number } = {};
    if (nextEst !== seed.current.est) patch.estimatedMinutes = nextEst;
    if (nextActual !== undefined) patch.actualMinutes = nextActual;
    setOpen(false);
    if (Object.keys(patch).length > 0) onCommit(patch);
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Time: ${formatMinutes(estimatedMinutes)} estimated${
            actualMinutes != null
              ? `, ${formatMinutes(actualMinutes)} actual`
              : ''
          } — edit`}
          className={cellTrigger}
        >
          {children}
          <LuChevronDown aria-hidden="true" className={cellChevron} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          data-lenis-prevent
          className={cn(popoverMenuContent, 'w-64 p-3')}
        >
          <GlassRim />
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-est-time" className="text-xs">
                Estimated
              </Label>
              <input
                id="cell-est-time"
                autoFocus
                value={est}
                onChange={(e) => {
                  setEst(e.target.value);
                  setError(null);
                }}
                placeholder="1.5h or 45m"
                autoComplete="off"
                className={cellField}
              />
              <HoursQuickPicks
                compact
                onPick={(v) => {
                  setEst(v);
                  setError(null);
                }}
              />
              <span className="text-[0.65rem] text-muted-foreground">
                1.5 = 1h 30m
              </span>
            </span>
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-actual-time" className="text-xs">
                Actual
              </Label>
              <input
                id="cell-actual-time"
                value={actual}
                onChange={(e) => {
                  setActual(e.target.value);
                  setError(null);
                }}
                placeholder={actualEditable ? '1.5h or 45m' : ''}
                autoComplete="off"
                disabled={!actualEditable}
                className={cn(cellField, 'disabled:opacity-50')}
              />
              {actualEditable ? (
                <HoursQuickPicks
                  compact
                  onPick={(v) => {
                    setActual(v);
                    setError(null);
                  }}
                />
              ) : (
                <span className="text-[0.65rem] text-muted-foreground">
                  Confirmed when the task is sent for approval or marked done.
                </span>
              )}
            </span>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-foreground/10 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Save
            </button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
