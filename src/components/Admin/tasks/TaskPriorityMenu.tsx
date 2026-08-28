// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function prop a
// client-entry violation.
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  type TaskPrioritySlug,
} from '@/lib/taskFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { cellGhost, dropdownMenuContent, menuItem } from './menu';
import TaskPriorityBadge from './TaskPriorityBadge';

/**
 * The in-cell priority control — TaskStatusMenu's grammar with a nullable
 * value: the pill (or, when unset, a row-hover ghost) is the trigger, and a
 * "No priority" item clears back to null. Selecting the current level just
 * closes.
 */
export default function TaskPriorityMenu({
  priority,
  onSelect,
}: {
  priority: TaskPrioritySlug | null;
  /** Called only on an actual change; null clears. */
  onSelect: (next: TaskPrioritySlug | null) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={
            priority
              ? `Priority: ${TASK_PRIORITY_LABELS[priority]}. Change`
              : 'Set priority'
          }
          className="group/status inline-flex cursor-pointer items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        >
          {priority ? (
            <>
              <TaskPriorityBadge priority={priority} />
              <LuChevronDown
                aria-hidden="true"
                className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/status:opacity-100 group-focus-visible/status:opacity-100"
              />
            </>
          ) : (
            <span className={cn('text-xs', cellGhost)}>+ Priority</span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          {/* RadioGroup so AT hears the current level (aria-checked); "No
              priority" below stays a plain action item — it clears, it isn't
              a fourth level. */}
          <DropdownMenu.RadioGroup value={priority ?? ''}>
            {TASK_PRIORITY_SLUGS.map((slug) => (
              <DropdownMenu.RadioItem
                key={slug}
                value={slug}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => {
                  if (slug !== priority) onSelect(slug);
                }}
              >
                {slug === priority ? (
                  <LuCheck aria-hidden="true" className="size-3.5" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {TASK_PRIORITY_LABELS[slug]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          {priority && (
            <DropdownMenu.Item
              className={cn(
                menuItem,
                'border-t border-white/40 text-muted-foreground dark:border-white/10',
              )}
              onSelect={() => onSelect(null)}
            >
              <span className="size-3.5 shrink-0" aria-hidden="true" />
              No priority
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
