// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (DatesCellPopover precedent) — adding one would make the function props a
// client-entry violation.
import { useId, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuChevronDown } from 'react-icons/lu';

import { GlassRim } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { Label } from '@/components/ui/label';
import { shiftDayKey } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { otherMonthNote } from './format';
import { cellChevron, cellField, cellTrigger, popoverMenuContent } from './menu';

/**
 * The completed cell's editor — the sibling of DatesCellPopover, and separate
 * from it because the value goes out a DIFFERENT DOOR: start/due are a
 * patchTask column patch, while the completion day is a setTaskStatus
 * re-issue (the one writer of completed_at). One popover writing both would
 * be a single submit firing two actions, with two failure modes, two
 * optimistic overlays and no sane partial-failure story.
 *
 * It DOES carry a second field on a delivered or posted row — the day the
 * client got the work — and that is not a contradiction of the paragraph
 * above: `released_on` goes out the SAME door in the SAME statement, so the
 * two days share one failure mode and one overlay. The handover day is floored
 * at the completion day, since work cannot reach a client before it is
 * finished, and carries no month note: nothing windows on it.
 *
 * No Clear button, unlike the dates popover: a done row always has a
 * completion date. Unfiling one is "leave done", which is the status menu.
 *
 * Closing COMMITS, the way the dates and time cells do — clicking away from a
 * date you just picked reads as saving it, and a silent discard is the bug
 * this grammar was changed to fix. Escape still discards.
 */
export default function CompletedCellPopover({
  completedDate,
  releasedOn,
  stageLabel,
  todayKey,
  ariaLabel,
  onCommit,
  children,
  triggerClassName = cellTrigger,
  chevronClassName = cellChevron,
  trigger,
}: {
  /** Raw YYYY-MM-DD in the reader's zone. Done rows only, so never ''. */
  completedDate: string;
  /** The handover day, raw. '' on a row that has one to set but has not. */
  releasedOn?: string;
  /** 'Delivered' or 'Posted'. Its PRESENCE is what adds the second field, so
   *  a done row (and the quick-add band) keeps exactly the old single-field
   *  popover. */
  stageLabel?: string;
  /** Server-computed today in the reader's zone: the ceiling, the chips'
   *  anchor, and what the different-month note compares against. */
  todayKey: string;
  /** Value-bearing accessible name ("Completed Aug 20 — change") — a bare
   *  "Edit" would hide from AT what sighted users read in the cell. */
  ariaLabel: string;
  /** Fires only when something actually changed, carrying both days so the
   *  caller makes ONE re-issue. */
  onCommit: (days: { completedOn: string; releasedOn?: string }) => void;
  children?: React.ReactNode;
  /** Cell grammar by default; the quick-add band passes its field skin (and
   *  an always-visible chevron — outside a cell there is no hover reveal). */
  triggerClassName?: string;
  chevronClassName?: string;
  /** Full custom trigger element (ClientCombobox's rule) — replaces the
   *  default button+chevron; must accept forwarded props/ref. */
  trigger?: React.ReactElement;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [released, setReleased] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Diff against the open-time seed, not live props (TimeCellPopover's rule):
  // a row change underneath the open popover must not make an untouched field
  // read as an edit.
  const seed = useRef('');
  const releasedSeed = useRef('');
  // Set by Escape, so the close handler below can tell "cancel" from "click
  // away", which commits. Radix fires onEscapeKeyDown before onOpenChange.
  const discard = useRef(false);

  /** The one commit path. False = refused, and the caller keeps us open. */
  function commit(): boolean {
    if (!value) {
      setError('Pick the day this was finished.');
      return false;
    }
    // The native `max` greys future days out but is not a guarantee — typed
    // input and non-Chromium pickers get past it. The server re-checks too.
    if (value > todayKey) {
      setError('That day hasn’t happened yet.');
      return false;
    }
    if (stageLabel) {
      if (!released) {
        setError(`Pick the day this was ${stageLabel.toLowerCase()}.`);
        return false;
      }
      if (released > todayKey) {
        setError('That day hasn’t happened yet.');
        return false;
      }
      if (released < value) {
        setError('That is before the work was finished.');
        return false;
      }
    }
    const changed =
      value !== seed.current ||
      Boolean(stageLabel && released !== releasedSeed.current);
    if (changed) {
      onCommit({
        completedOn: value,
        ...(stageLabel ? { releasedOn: released } : {}),
      });
    }
    return true;
  }

  function onOpenChange(next: boolean) {
    if (next) {
      seed.current = completedDate;
      // A terminal row with no day on file yet opens on the completion day
      // rather than on today: it is the closer guess, and it is also the floor.
      releasedSeed.current = releasedOn || completedDate;
      setValue(completedDate);
      setReleased(releasedOn || completedDate);
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
    // Because `open` is controlled, simply not clearing it is what holds the
    // popover open on a refusal — no preventDefault plumbing needed.
    if (commit()) setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // React propagates through the REACT tree, not the DOM one, so a portalled
    // form's submit still reaches an ancestor <form> — the quick-add band's,
    // which would create the task mid-edit (DatesCellPopover's rule).
    e.stopPropagation();
    if (commit()) setOpen(false);
  }

  const monthNote = error ? null : otherMonthNote(value, todayKey);

  // Backward-looking, unlike the due chips: a completion already happened.
  const chips = [
    { label: 'Today', spoken: 'today', value: todayKey },
    { label: 'Yesterday', spoken: 'yesterday', value: shiftDayKey(todayKey, -1) },
    { label: '−2d', spoken: 'two days ago', value: shiftDayKey(todayKey, -2) },
  ];

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <button type="button" aria-label={ariaLabel} className={triggerClassName}>
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
              <Label htmlFor={fieldId} className="text-xs">
                Completed on
              </Label>
              <input
                id={fieldId}
                type="date"
                value={value}
                max={todayKey}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                className={cellField}
              />
              <span className="flex flex-wrap gap-1">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    aria-label={`Completed ${chip.spoken}`}
                    aria-pressed={value === chip.value}
                    onClick={() => {
                      setValue(chip.value);
                      setError(null);
                    }}
                    // chipClasses is a FUNCTION — passing the reference means
                    // clsx silently drops it (DatesCellPopover's scar).
                    className={cn(
                      chipClasses(value === chip.value),
                      'px-2 py-0.5 text-[0.7rem]',
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </span>
            </span>
            {stageLabel && (
              <span className="flex flex-col gap-1.5">
                <Label htmlFor={`${fieldId}-released`} className="text-xs">
                  {stageLabel} on
                </Label>
                <input
                  id={`${fieldId}-released`}
                  type="date"
                  value={released}
                  min={value || undefined}
                  max={todayKey}
                  onChange={(e) => {
                    setReleased(e.target.value);
                    setError(null);
                  }}
                  className={cellField}
                />
              </span>
            )}
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : monthNote ? (
              <p className="text-xs text-muted-foreground">{monthNote}</p>
            ) : null}
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
