import Link from 'next/link';

import { TASK_STATUS_LABELS, type TaskStatusSlug } from '@/lib/taskFields';
import { cn } from '@/lib/utils';
import ClientMark from './ClientMark';

/**
 * One task on the calendar: a link, and nothing else.
 *
 * Server component, and the grid's whole interaction model rests on that. A
 * busy month puts ~150 of these on screen, so making the chip a client leaf
 * would hydrate the entire grid to deliver one click each. Instead the chip
 * points at `?task=<id>` on the calendar's own URL and CalendarDialogHost, the
 * one client leaf on the page, opens the editor when the server hands that row
 * back. That is the ⌘K palette's existing door, reused rather than rebuilt.
 *
 * `prefetch={false}` is load-bearing rather than tidy: Next prefetches every
 * in-viewport Link by default, so a month grid would fire a hundred and fifty
 * RSC requests on arrival for pages nobody asked for.
 */
export type CalendarChipData = {
  id: string;
  title: string;
  href: string;
  clientLabel: string;
  clientLogo: string;
  /** The null-client "Perseus" label, which draws the wordmark coin. */
  clientMark: boolean;
  status: TaskStatusSlug;
  /** Already formatted, "2h 30m" — the leaf owns the x60 math, not this. */
  hours: string;
  /** Mirrors the board's own tint exactly, and is strictly due-based: a
   *  start-only task is ongoing, never overdue. */
  dueState: '' | 'overdue' | 'today';
  shipped: boolean;
  revision: boolean;
};

/** One day of the grid, folded once and rendered twice (the month grid on a
 *  desktop, the agenda on a phone) so the two can never disagree about what a
 *  day holds. */
export type CalendarCell = {
  dayKey: string;
  /** False for the padding days either side of the month. Those draw dimmed
   *  and empty: the query windows the month exactly, so a chip there would
   *  vanish the moment you switched to the month it belongs to. */
  inMonth: boolean;
  /** The day's TRUE total, which is what the header states. `chips` is a
   *  sample of it whenever `hidden` is above zero. */
  count: number;
  minutes: number;
  hours: string;
  chips: CalendarChipData[];
  hidden: number;
  /** The list, filtered to this one day. Where "+N more" goes. */
  moreHref: string;
};

/** rose for a missed deadline and amber for one landing today, the two
 *  meanings tone.ts reserves them for. Everything else is ink: solid once the
 *  work has shipped, faint while it is still owed. No hue encodes a status
 *  here, which is what keeps amber from meaning both "in progress" and "due
 *  today" six pixels apart. */
function dot(chip: CalendarChipData): string {
  if (chip.dueState === 'overdue') return 'bg-rose-500';
  if (chip.dueState === 'today') return 'bg-amber-500';
  return chip.shipped ? 'bg-foreground/70' : 'bg-foreground/30';
}

export default function CalendarChip({
  chip,
  variant = 'compact',
}: {
  chip: CalendarChipData;
  /** `compact` is the grid's one-line chip; `full` is the phone agenda, where
   *  a full-width row has the space for the client and the hours. */
  variant?: 'compact' | 'full';
}) {
  // Everything the compact chip cannot show, for a hover. The visible title
  // stays the accessible name, so this adds context rather than replacing it.
  const detail = [
    chip.title,
    chip.clientLabel,
    chip.hours,
    TASK_STATUS_LABELS[chip.status],
  ].join(' · ');

  if (variant === 'full') {
    return (
      <Link
        href={chip.href}
        prefetch={false}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.06]"
      >
        <span
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', dot(chip))}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-xs',
              chip.shipped ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {chip.revision && (
              <span aria-hidden="true" className="text-muted-foreground">
                {'↳ '}
              </span>
            )}
            {chip.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            <ClientMark
              name={chip.clientLabel}
              logo={chip.clientLogo || null}
              mark={chip.clientMark}
              size={12}
            />
            <span className="truncate">{chip.clientLabel}</span>
          </span>
        </span>
        <span className="shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
          {chip.hours}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={chip.href}
      prefetch={false}
      title={detail}
      className="flex items-center gap-1.5 rounded px-1 py-[0.1875rem] transition-colors hover:bg-foreground/[0.07]"
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', dot(chip))}
      />
      <span
        className={cn(
          'truncate text-[0.7rem] leading-4',
          chip.shipped ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {chip.revision && (
          <span aria-hidden="true" className="text-muted-foreground">
            {'↳ '}
          </span>
        )}
        {chip.title}
      </span>
    </Link>
  );
}
