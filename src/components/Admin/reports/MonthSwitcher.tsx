'use client';

import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown, LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import { shiftMonthToken } from '@/lib/calendar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from '@/components/Admin/tasks/menu';

export type MonthOption = { value: string; label: string };

const arrowButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground transition-colors hover:bg-foreground/[0.09] disabled:cursor-not-allowed disabled:opacity-40';

/**
 * The report's month control — pure `?month=` URL state: prev/next arrows
 * plus a dropdown of months with activity. `currentMonth` (the studio's
 * reader's current month, resolved server-side) caps the forward arrow;
 * labels are server-formatted so this client never does date math.
 */
export default function MonthSwitcher({
  basePath,
  month,
  monthLabel,
  currentMonth,
  options,
}: {
  basePath: string;
  month: string;
  monthLabel: string;
  currentMonth: string;
  options: MonthOption[];
}) {
  const router = useRouter();
  const go = (token: string) => router.push(`${basePath}?month=${token}`);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Previous month"
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
        disabled={month >= currentMonth}
        onClick={() => go(shiftMonthToken(month, 1))}
        className={arrowButton}
      >
        <LuChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
