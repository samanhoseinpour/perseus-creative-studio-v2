// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuChevronDown } from 'react-icons/lu';

import {
  formatMinutes,
  TIME_CLEARED_ERROR,
  TIME_REQUIRED_ERROR,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { GlassRim } from '@/components/Admin/Glass';
import DurationField from '@/components/Admin/tasks/DurationField';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cellChevron, cellTrigger, popoverMenuContent } from './menu';

/**
 * The time cell's editor: a small popover with the Estimated and Actual
 * fields (the cell shows both values, so a bare inline input can't say which
 * one it edits), each a split hours/minutes DurationField. Actual is editable
 * only on done / needs_approval rows (hours are confirmed
 * when work finishes); the server backstops it. Enter saves; only changed
 * fields reach the patch.
 *
 * Closing COMMITS, and Escape discards — the same pair as DatesCellPopover.
 * The two cells sit in one table, so they cannot follow different rules about
 * what clicking away means.
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
  const [est, setEst] = useState<number | null>(null);
  const [actual, setActual] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Diff against the values SEEDED at open, not the live props: the row can
  // change underneath an open popover (teammate edit arriving via re-seed),
  // and diffing against fresh props would submit the stale seed as a
  // "change", silently reverting the newer value.
  const seed = useRef({ est: 0, actual: null as number | null });
  // Set by Escape so the close handler can tell "cancel" from "click away",
  // which commits. Radix fires onEscapeKeyDown before onOpenChange.
  const discard = useRef(false);
  const actualEditable = status === 'done' || status === 'needs_approval';

  /** The one commit path. False = refused, and the caller keeps us open. */
  function commit(): boolean {
    if (est === null) {
      setError(TIME_REQUIRED_ERROR);
      return false;
    }
    let nextActual: number | undefined;
    if (actualEditable && actual === null && seed.current.actual != null) {
      // These rows always carry an actual; the schema has no way to null it,
      // so say so instead of closing as if the clear saved.
      setError(TIME_CLEARED_ERROR);
      return false;
    }
    if (actualEditable && actual !== null && actual !== seed.current.actual) {
      nextActual = actual;
    }
    const patch: { estimatedMinutes?: number; actualMinutes?: number } = {};
    if (est !== seed.current.est) patch.estimatedMinutes = est;
    if (nextActual !== undefined) patch.actualMinutes = nextActual;
    if (Object.keys(patch).length > 0) onCommit(patch);
    return true;
  }

  function onOpenChange(next: boolean) {
    if (next) {
      seed.current = { est: estimatedMinutes, actual: actualMinutes };
      setEst(estimatedMinutes);
      setActual(actualMinutes);
      setError(null);
      discard.current = false;
      setOpen(true);
      return;
    }
    if (discard.current) {
      discard.current = false;
      setOpen(false);
      return;
    }
    // `open` is controlled, so not clearing it is what holds the popover open
    // on a refusal — no preventDefault plumbing needed.
    if (commit()) setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // A cell editor's submit must never escape its popover — see
    // DatesCellPopover for the React-portal propagation rule this guards.
    e.stopPropagation();
    if (commit()) setOpen(false);
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
          onEscapeKeyDown={() => {
            discard.current = true;
          }}
          className={cn(popoverMenuContent, 'w-64 p-3')}
        >
          <GlassRim />
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-est-time" className="text-xs">
                Estimated
              </Label>
              <DurationField
                id="cell-est-time"
                size="cell"
                label="Estimated"
                autoFocus
                minutes={est}
                invalid={error != null && est === null}
                onChange={(next) => {
                  setEst(next);
                  setError(null);
                }}
              />
            </span>
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-actual-time" className="text-xs">
                Actual
              </Label>
              <DurationField
                id="cell-actual-time"
                size="cell"
                label="Actual"
                minutes={actual}
                disabled={!actualEditable}
                onChange={(next) => {
                  setActual(next);
                  setError(null);
                }}
              />
              {!actualEditable && (
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
