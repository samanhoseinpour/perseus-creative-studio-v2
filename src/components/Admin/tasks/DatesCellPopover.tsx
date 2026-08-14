// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useState } from 'react';
import { Popover } from 'radix-ui';
import { LuChevronDown } from 'react-icons/lu';

import { GlassRim } from '@/components/Admin/Glass';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cellChevron, cellField, cellTrigger, popoverMenuContent } from './menu';

/**
 * The dates cell's editor: Start + Due in one popover (they're one decision —
 * when work begins, when it lands). Native date inputs, cleared field = date
 * removed. Deliberately no end-date field: completedAt is the real end and
 * only setTaskStatus writes it. The start ≤ due check mirrors the server's
 * merged-row rule.
 */
export default function DatesCellPopover({
  startDate,
  dueDate,
  onCommit,
  children,
}: {
  /** Raw YYYY-MM-DD, '' when unset. */
  startDate: string;
  dueDate: string;
  /** Called with only the fields that actually changed; null clears. */
  onCommit: (patch: { startDate?: string | null; dueDate?: string | null }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStart(startDate);
      setDue(dueDate);
      setError(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (start && due && start > due) {
      setError('The due date is before the start date.');
      return;
    }
    const patch: { startDate?: string | null; dueDate?: string | null } = {};
    if (start !== startDate) patch.startDate = start || null;
    if (due !== dueDate) patch.dueDate = due || null;
    setOpen(false);
    if (Object.keys(patch).length > 0) onCommit(patch);
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Edit dates" className={cellTrigger}>
          {children}
          <LuChevronDown aria-hidden="true" className={cellChevron} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          data-lenis-prevent
          className={cn(popoverMenuContent, 'w-56 p-3')}
        >
          <GlassRim />
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-start-date" className="text-xs">
                Start
              </Label>
              <input
                id="cell-start-date"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setError(null);
                }}
                className={cellField}
              />
            </span>
            <span className="flex flex-col gap-1.5">
              <Label htmlFor="cell-due-date" className="text-xs">
                Due
              </Label>
              <input
                id="cell-due-date"
                type="date"
                value={due}
                onChange={(e) => {
                  setDue(e.target.value);
                  setError(null);
                }}
                className={cellField}
              />
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
