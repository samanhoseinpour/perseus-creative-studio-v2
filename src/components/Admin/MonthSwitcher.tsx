'use client';

import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown, LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import { shiftMonthToken } from '@/lib/calendar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from '@/components/Admin/tasks/menu';

export type MonthOption = { value: string; label: string };

/** The "no month at all" row's value. A sentinel rather than `''` so it can
 *  sit in the same options list and be compared by equality like any other. */
export const ALL_MONTHS = 'all';

const arrowButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground transition-colors hover:bg-foreground/[0.09] disabled:cursor-not-allowed disabled:opacity-40';

/**
 * A month control — prev/next arrows plus a dropdown. Shared by the reports
 * (`?month=`) and the task board (`?drange=`), which is why the destination is
 * a caller-supplied `href` builder rather than a hardcoded param: the two
 * sections spell "which month" differently and always will, since the board's
 * month rides its general date facet.
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
  href,
  allowAll,
  allLabel = 'All time',
}: {
  basePath: string;
  month: string;
  monthLabel: string;
  currentMonth: string;
  options: MonthOption[];
  /** Where a token points. Defaults to the reports' `?month=` shape. */
  href?: (token: string) => string;
  allowAll?: boolean;
  allLabel?: string;
}) {
  const router = useRouter();
  const to = href ?? ((token: string) => `${basePath}?month=${token}`);
  const go = (token: string) => router.push(to(token));
  const unscoped = month === ALL_MONTHS;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Previous month"
        disabled={unscoped}
        onClick={() => go(shiftMonthToken(month, -1))}
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
            align="end"
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
                onSelect={() => go(ALL_MONTHS)}
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
                onSelect={() => go(option.value)}
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
        onClick={() => go(shiftMonthToken(month, 1))}
        className={arrowButton}
      >
        <LuChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
