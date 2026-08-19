// No 'use client' directive on purpose: a leaf of the client dialog/board
// entries (TimeCellPopover precedent) — adding it would make the function props
// a client-entry violation.
import { useRef, useState } from 'react';

import {
  composeMinutes,
  parseHoursToMinutes,
  splitMinutes,
  stepMinutes,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';

/**
 * The duration input for every surface where a member types time — two number
 * segments, hours and minutes, inside one field frame.
 *
 * It replaced a single free-text box that took decimal hours. Members asked how
 * to enter 1 hour 45 minutes and the honest answer was "1.75", which is not how
 * anyone says it; the tolerant parser DID accept "1h 45m" too, but a box
 * labelled "Estimated time" never taught anyone that. Two labelled segments
 * remove the question: type 1, Tab, 45.
 *
 * Speaks MINUTES to its parent — matching the integer-minutes columns and the
 * zod schemas, so no caller converts anything. The segment strings are local so
 * a half-typed value ("0", or an empty box mid-edit) doesn't round-trip through
 * the parent and vanish; the prop only reseeds them when it changes from
 * OUTSIDE (a prefill, a quick-pick, an estimate suggestion, a dialog reset),
 * which `synced` distinguishes from our own last emission.
 *
 * Fast paths kept from the old field:
 *  - minutes overflow normalises when focus leaves — typing 90 reads back 1 hr
 *    30 min, so "90 minutes" is still a valid thought
 *  - ArrowUp/Down steps (hours ±1, minutes ±5) and rolls over between segments
 *  - pasting "1.75", "1h 45m" or "45m" still lands, via parseHoursToMinutes —
 *    the tolerant vocabulary survives as an escape hatch instead of being the
 *    only way in
 */
export default function DurationField({
  id,
  minutes,
  onChange,
  label,
  size = 'field',
  disabled,
  invalid,
  describedBy,
  autoFocus,
  hoursRef,
  className,
}: {
  /** Base id — lands on the hours segment, so a `<Label htmlFor>` focuses it. */
  id: string;
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  /** Names the segments for screen readers: "<label> hours" / "… minutes".
   *  An aria-label rather than an sr-only span so it REPLACES the surrounding
   *  visible <Label htmlFor> instead of concatenating with it. */
  label: string;
  /** 'field' matches the Input primitive (h-10); 'cell' the compact popover and
   *  quick-add skin (h-8). Both keep 16px text on mobile so iOS won't zoom. */
  size?: 'field' | 'cell';
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  /** Reaches the hours segment for focus()/select() — the mark-done dialog
   *  selects the prefill so Enter confirms it in one keystroke. */
  hoursRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const [segments, setSegments] = useState(() => splitMinutes(minutes));
  const minutesRef = useRef<HTMLInputElement | null>(null);
  const ownHoursRef = useRef<HTMLInputElement | null>(null);
  const hours = hoursRef ?? ownHoursRef;

  // Reseed the segments only when the prop changes from OUTSIDE. `synced` is
  // the last value this field itself put into the parent, so our own emissions
  // come back down recognised and leave the raw typing alone — without it,
  // typing 459 into the minutes box would re-split under the cursor to 8 hr 39
  // min mid-keystroke. State rather than a ref because refs may not be read
  // during render (the react-hooks/refs rule the board components all note),
  // and adjusting state during render is React's documented alternative to a
  // sync effect — the guard is what keeps it from looping.
  const [synced, setSynced] = useState(minutes);
  if (minutes !== synced) {
    setSynced(minutes);
    setSegments(splitMinutes(minutes));
  }

  function commit(next: { hours: string; minutes: string }) {
    setSegments(next);
    const total = composeMinutes(next.hours, next.minutes);
    setSynced(total);
    onChange(total);
  }

  /** Arrow steps and pastes set both segments from a total at once. */
  function commitTotal(total: number | null) {
    setSegments(splitMinutes(total));
    setSynced(total);
    onChange(total);
  }

  function handleStep(delta: number) {
    commitTotal(stepMinutes(composeMinutes(segments.hours, segments.minutes), delta));
  }

  /** Fold "1.75" / "1h 45m" / "45m" into the pair. Bare digits are left alone —
   *  they belong to the segment being pasted into, and the hours parser would
   *  read a plain "45" in the minutes box as 45 HOURS. */
  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text').trim();
    if (!text || /^\d+$/.test(text)) return;
    const parsed = parseHoursToMinutes(text);
    if (parsed == null) return;
    event.preventDefault();
    commitTotal(parsed);
  }

  /** Normalise once focus leaves the whole frame, not between the segments —
   *  reshuffling the digits under someone still typing is worse than waiting. */
  function handleFrameBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const total = composeMinutes(segments.hours, segments.minutes);
    const next = splitMinutes(total);
    if (next.hours !== segments.hours || next.minutes !== segments.minutes) {
      setSegments(next);
    }
  }

  const cell = size === 'cell';
  const segmentClasses =
    'w-full min-w-0 bg-transparent text-right text-base tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed md:text-sm';
  const unitClasses = cn(
    'shrink-0 select-none text-muted-foreground',
    cell ? 'text-[0.65rem]' : 'text-xs',
  );

  return (
    <div
      onBlur={handleFrameBlur}
      data-invalid={invalid ? '' : undefined}
      className={cn(
        'flex w-full min-w-0 items-stretch transition-[color,box-shadow]',
        cell
          ? 'h-8 rounded-lg border border-foreground/15 bg-foreground/[0.04] focus-within:border-foreground/35'
          : 'border-input h-10 rounded-md border bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-[1px]',
        'data-invalid:border-destructive data-invalid:ring-destructive/20',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <label
        className={cn(
          'flex min-w-0 flex-1 cursor-text items-center gap-1',
          cell ? 'pl-2 pr-1.5' : 'pl-3 pr-2',
        )}
      >
        <input
          ref={hours}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label={`${label} hours`}
          maxLength={4}
          placeholder="0"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          value={segments.hours}
          onChange={(event) =>
            commit({
              ...segments,
              hours: event.target.value.replace(/\D/g, ''),
            })
          }
          onPaste={handlePaste}
          onKeyDown={(event) => {
            // 'h' and ':' are how people write it out loud — both hand over to
            // the minutes box rather than typing a character the field rejects.
            if (event.key === 'h' || event.key === ':') {
              event.preventDefault();
              minutesRef.current?.focus();
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              handleStep(60);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              handleStep(-60);
            }
          }}
          className={segmentClasses}
        />
        <span aria-hidden className={unitClasses}>
          hr
        </span>
      </label>

      <span
        aria-hidden
        className={cn(
          'my-1.5 w-px shrink-0',
          cell ? 'bg-foreground/15' : 'bg-border',
        )}
      />

      <label
        className={cn(
          'flex min-w-0 flex-1 cursor-text items-center gap-1',
          cell ? 'pl-1.5 pr-2' : 'pl-2 pr-3',
        )}
      >
        <input
          ref={minutesRef}
          id={`${id}-min`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} minutes`}
          maxLength={3}
          placeholder="0"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          value={segments.minutes}
          onChange={(event) =>
            commit({
              ...segments,
              minutes: event.target.value.replace(/\D/g, ''),
            })
          }
          onPaste={handlePaste}
          onKeyDown={(event) => {
            // Backspace out of an empty minutes box steps back to hours, the
            // way a single field would have let you keep deleting.
            if (event.key === 'Backspace' && segments.minutes === '') {
              event.preventDefault();
              hours.current?.focus();
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              handleStep(5);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              handleStep(-5);
            }
          }}
          className={segmentClasses}
        />
        <span aria-hidden className={unitClasses}>
          min
        </span>
      </label>
    </div>
  );
}
