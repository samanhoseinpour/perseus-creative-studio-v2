// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useRef, useState } from 'react';
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
  ariaLabel,
  onCommit,
  children,
  triggerClassName = cellTrigger,
  chevronClassName = cellChevron,
  trigger,
}: {
  /** Raw YYYY-MM-DD, '' when unset. */
  startDate: string;
  dueDate: string;
  /** Value-bearing accessible name ("Dates: Aug 12 → Aug 20 — edit") — a bare
   *  "Edit dates" would hide from AT what sighted users read in the cell. */
  ariaLabel: string;
  /** Called with only the fields that actually changed; null clears. */
  onCommit: (patch: { startDate?: string | null; dueDate?: string | null }) => void;
  children?: React.ReactNode;
  /** Cell grammar by default; the quick-add row passes its field skin (and an
   *  always-visible chevron — outside a cell there's no hover reveal). */
  triggerClassName?: string;
  chevronClassName?: string;
  /** Full custom trigger element (ClientCombobox's rule) — replaces the
   *  default button+chevron entirely; must accept forwarded props/ref. */
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Diff against the open-time seed, not live props (TimeCellPopover rule):
  // a row change underneath the open popover must not make untouched fields
  // read as edits.
  const seed = useRef({ start: '', due: '' });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      seed.current = { start: startDate, due: dueDate };
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
    if (start !== seed.current.start) patch.startDate = start || null;
    if (due !== seed.current.due) patch.dueDate = due || null;
    setOpen(false);
    if (Object.keys(patch).length > 0) onCommit(patch);
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={ariaLabel}
            className={triggerClassName}
          >
            {children}
            <LuChevronDown aria-hidden="true" className={chevronClassName} />
          </button>
        )}
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
