// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useId, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuChevronDown } from 'react-icons/lu';

import { GlassRim } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { Label } from '@/components/ui/label';
import { shiftDayKey } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { cellChevron, cellField, cellTrigger, popoverMenuContent } from './menu';

/**
 * Relative due-date shortcuts, anchored to the server-computed today in the
 * READER's zone.
 * "Fri" is the coming Friday — and is skipped when today already IS Friday
 * (it would duplicate Today) or when it lands within the next two days
 * (Tomorrow already covers it).
 */
function dueChips(
  todayKey: string,
): { label: string; spoken: string; value: string }[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  // getUTCDay on a UTC-parsed calendar key: no timezone shift can move the
  // weekday, which is the whole reason the keys are strings.
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const untilFriday = (5 - weekday + 7) % 7;
  return [
    { label: 'Today', spoken: 'today', value: todayKey },
    { label: 'Tomorrow', spoken: 'tomorrow', value: shiftDayKey(todayKey, 1) },
    ...(untilFriday > 2
      ? [
          {
            label: 'Fri',
            spoken: 'Friday',
            value: shiftDayKey(todayKey, untilFriday),
          },
        ]
      : []),
    { label: '+1w', spoken: 'in one week', value: shiftDayKey(todayKey, 7) },
    { label: '+2w', spoken: 'in two weeks', value: shiftDayKey(todayKey, 14) },
  ];
}

function ClearButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer text-[0.7rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      Clear
    </button>
  );
}

/**
 * The dates cell's editor: Start + Due in one popover (they're one decision —
 * when work begins, when it lands). Native date inputs, cleared field = date
 * removed. Deliberately no end-date field: completedAt is the real end, only
 * setTaskStatus writes it, and its own editor is CompletedCellPopover — a
 * sibling rather than a third field here, because one submit must not fire two
 * different server actions. The start ≤ due check mirrors the server's
 * merged-row rule.
 *
 * Closing COMMITS. Clicking away from a date you have just picked reads as
 * saving it, and the Save-or-lose grammar this replaced silently dropped the
 * edit — the single most-reported thing about this cell. Escape still
 * discards, which is the pair that makes "click away" safe to mean "keep".
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
  todayKey,
}: {
  /** Raw YYYY-MM-DD, '' when unset. */
  startDate: string;
  dueDate: string;
  /** Server-computed today in the reader's zone — the chips' anchor.
   *  Omit and the chips don't render (the native inputs still work), so no
   *  caller is forced to thread a date it doesn't have. */
  todayKey?: string;
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
  const startId = useId();
  const dueId = useId();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Diff against the open-time seed, not live props (TimeCellPopover rule):
  // a row change underneath the open popover must not make untouched fields
  // read as edits.
  const seed = useRef({ start: '', due: '' });
  // Set by Escape so the close handler can tell "cancel" from "click away",
  // which commits. Radix fires onEscapeKeyDown before onOpenChange.
  const discard = useRef(false);

  /** The one commit path. False = refused, and the caller keeps us open. */
  function commit(): boolean {
    if (start && due && start > due) {
      setError('The due date is before the start date.');
      return false;
    }
    const patch: { startDate?: string | null; dueDate?: string | null } = {};
    if (start !== seed.current.start) patch.startDate = start || null;
    if (due !== seed.current.due) patch.dueDate = due || null;
    if (Object.keys(patch).length > 0) onCommit(patch);
    return true;
  }

  function onOpenChange(next: boolean) {
    if (next) {
      seed.current = { start: startDate, due: dueDate };
      setStart(startDate);
      setDue(dueDate);
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
    // `open` is controlled, so simply not clearing it is what holds the
    // popover open on a refusal — no preventDefault plumbing needed.
    if (commit()) setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Load-bearing: React propagates events through the REACT tree, not the
    // DOM one, so this form's submit reaches any ancestor <form> even though
    // the portal lifts it out of the DOM. Without this, saving dates in the
    // quick-add band also submitted the band's own form — creating the task
    // (dateless: the commit below hadn't applied yet) on the way past.
    e.stopPropagation();
    if (commit()) setOpen(false);
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
          onEscapeKeyDown={() => {
            discard.current = true;
          }}
          className={cn(popoverMenuContent, 'w-56 p-3')}
        >
          <GlassRim />
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <span className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-2">
                <Label htmlFor={startId} className="text-xs">
                  Start
                </Label>
                {start && (
                  <ClearButton
                    label="Clear start date"
                    onClick={() => {
                      setStart('');
                      setError(null);
                    }}
                  />
                )}
              </span>
              <input
                id={startId}
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
              <span className="flex items-baseline justify-between gap-2">
                <Label htmlFor={dueId} className="text-xs">
                  Due
                </Label>
                {due && (
                  <ClearButton
                    label="Clear due date"
                    onClick={() => {
                      setDue('');
                      setError(null);
                    }}
                  />
                )}
              </span>
              <input
                id={dueId}
                type="date"
                value={due}
                onChange={(e) => {
                  setDue(e.target.value);
                  setError(null);
                }}
                className={cellField}
              />
              {/* The 90% of due dates are a few days out — reaching into a
                  native calendar widget for "Friday" is the slow path. */}
              {todayKey && (
                <span className="flex flex-wrap gap-1">
                  {dueChips(todayKey).map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      aria-label={`Due ${chip.spoken}`}
                      aria-pressed={due === chip.value}
                      onClick={() => {
                        setDue(chip.value);
                        setError(null);
                      }}
                      // chipClasses is a FUNCTION — passing the reference
                      // meant clsx silently dropped it, so these chips had no
                      // border, radius, padding or cursor at all, and the
                      // active state below was standing in for the whole skin.
                      className={cn(
                        chipClasses(due === chip.value),
                        'px-2 py-0.5 text-[0.7rem]',
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
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
