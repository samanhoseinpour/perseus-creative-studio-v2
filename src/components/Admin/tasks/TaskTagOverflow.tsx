'use client';

import { Tooltip } from 'radix-ui';

import { glassCard } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The "+N" fold at the end of a bounded chip strip, and what it hides.
 *
 * Its own client leaf so TaskTagChip.tsx stays server-safe: the internal month
 * report renders TagMixStrip from a server component, and nothing about a
 * static chip should drag a tooltip runtime onto that page.
 *
 * The panel is PORTALLED, and that is the requirement rather than a
 * preference: the tasks table lives inside `overflow-x-auto`, which clips
 * anything positioned within it — an in-flow popover would be cut off at the
 * cell edge or scroll away with the row. RailTip's shape, side="top".
 *
 * The hidden chips arrive as CHILDREN rather than as tag data, so this file
 * never imports TaskTagChip — which would close a module cycle across the
 * client boundary, since the chip's own module imports this one.
 */
export default function TaskTagOverflow({
  count,
  names,
  children,
}: {
  count: number;
  names: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            tabIndex={0}
            aria-label={`${count} more: ${names}`}
            className="shrink-0 cursor-default rounded bg-foreground/[0.06] px-1 py-px text-[0.65rem] leading-[1.35] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            +{count}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="end"
            sideOffset={6}
            className={cn(
              glassCard,
              'z-50 flex max-w-56 flex-wrap gap-1 rounded-lg p-2',
              'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
            )}
          >
            {children}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
