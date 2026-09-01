'use client';

import { useRouter } from 'next/navigation';
import { LuCheck, LuChevronDown, LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { shiftMonthToken } from '@/lib/calendar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from '@/components/Admin/tasks/menu';

export type MonthOption = {
  value: string;
  label: string;
  /**
   * Where this row navigates. A STRING, built server-side — never a builder
   * function: this is a client component, and a function prop across that
   * boundary is a hard Next.js error ("Functions cannot be passed directly to
   * Client Components"). It took down the whole Done tab once; the type is the
   * guard now.
   *
   * Omitted = the reports' `?month=` shape, composed from `basePath` below.
   */
  href?: string;
};

/** The "no month at all" row's value. A sentinel rather than `''` so it can
 *  sit in the same options list and be compared by equality like any other. */
export const ALL_MONTHS = 'all';

// max-sm:size-11 is the 44px touch target: this used to live only in a desktop
// page header, and it is now the board's primary control on a phone.
const arrowButton =
  'inline-flex size-8 max-sm:size-11 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground transition-colors hover:bg-foreground/[0.09] disabled:cursor-not-allowed disabled:opacity-40';

/**
 * A month control — prev/next arrows plus a dropdown. Shared by the reports
 * (`?month=`) and the task board, whose month rides its general date facet
 * (`?drange=`) instead. The two spell "which month" differently and always
 * will, so the destination is caller-supplied.
 *
 * **Every destination arrives as a finished STRING.** Reports let this
 * component compose `?month=` from `basePath`; the board hands over precomputed
 * hrefs. It emphatically does NOT take a builder function — this is a client
 * component, and a function prop from a server component is a hard Next.js
 * error, not a lint nit. That is what broke `/admin/tasks?status=done`.
 *
 * `currentMonth` (resolved server-side, in the reader's zone) caps the forward
 * arrow; labels are server-formatted, so this client never does date math.
 *
 * With `allowAll`, the list gains an "All time" row and `month` may be
 * {@link ALL_MONTHS} — the arrows then have no anchor to step from and are
 * disabled rather than guessing one.
 */
export default function MonthSwitcher({
  basePath,
  month,
  monthLabel,
  currentMonth,
  options,
  prevHref,
  nextHref,
  allHref,
  allowAll,
  allLabel = 'All time',
  align = 'end',
}: {
  basePath: string;
  month: string;
  monthLabel: string;
  currentMonth: string;
  options: MonthOption[];
  /** Precomputed arrow destinations. Omitted = step `basePath?month=` by one,
   *  which is what Reports has always done. */
  prevHref?: string;
  nextHref?: string;
  /** Where the "All time" row points. Required in practice whenever
   *  `allowAll` is set, since "no month" has no token to compose from. */
  allHref?: string;
  allowAll?: boolean;
  allLabel?: string;
  /** Which edge the menu hangs from. 'end' suits a page header; the task
   *  board's month band sits at the LEFT of a full-width row, where a menu
   *  hanging right would open a screen away from its own trigger. */
  align?: 'start' | 'end';
}) {
  const router = useRouter();
  const monthHref = (token: string) => `${basePath}?month=${token}`;
  const go = (target: string) => router.push(target);
  const unscoped = month === ALL_MONTHS;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Previous month"
        disabled={unscoped}
        onClick={() => go(prevHref ?? monthHref(shiftMonthToken(month, -1)))}
        className={arrowButton}
      >
        <LuChevronLeft aria-hidden="true" className="size-4" />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-8 min-w-36 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.09]"
          >
            {monthLabel}
            <LuChevronDown aria-hidden="true" className="size-3.5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={align}
            sideOffset={8}
            data-lenis-prevent
            className={dropdownMenuContent}
          >
            <GlassRim />
            {allowAll && (
              <DropdownMenu.Item
                className={cn(
                  menuItem,
                  'border-b border-white/40 text-foreground dark:border-white/10',
                )}
                onSelect={() => go(allHref ?? basePath)}
              >
                {unscoped && (
                  <LuCheck aria-hidden="true" className="size-3.5" />
                )}
                {allLabel}
              </DropdownMenu.Item>
            )}
            {options.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => go(option.href ?? monthHref(option.value))}
              >
                {option.value === month && (
                  <LuCheck aria-hidden="true" className="size-3.5" />
                )}
                {option.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        type="button"
        aria-label="Next month"
        disabled={unscoped || month >= currentMonth}
        onClick={() => go(nextHref ?? monthHref(shiftMonthToken(month, 1)))}
        className={arrowButton}
      >
        <LuChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
