// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (BulkActionBar precedent) — adding it would make the function prop a
// client-entry violation.
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import {
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';
import TaskStatusBadge from './TaskStatusBadge';

/**
 * The in-row status control: the status pill itself is the trigger (one click
 * to open, one to change). Selecting the current status just closes; →done is
 * routed through the parent so the actual-hours confirm can interpose.
 */
export default function TaskStatusMenu({
  status,
  onSelect,
}: {
  status: TaskStatusSlug;
  /** Called only on an actual change ('done' included — parent confirms). */
  onSelect: (next: TaskStatusSlug) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Status: ${TASK_STATUS_LABELS[status]} — change`}
          className="group/status inline-flex cursor-pointer items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        >
          <TaskStatusBadge status={status} />
          <LuChevronDown
            aria-hidden="true"
            className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/status:opacity-100 group-focus-visible/status:opacity-100"
          />
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
          {/* RadioGroup so AT hears the current status (aria-checked). */}
          <DropdownMenu.RadioGroup value={status}>
            {TASK_STATUS_SLUGS.map((slug) => (
              <DropdownMenu.RadioItem
                key={slug}
                value={slug}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => {
                  if (slug !== status) onSelect(slug);
                }}
              >
                {slug === status && (
                  <LuCheck aria-hidden="true" className="size-3.5" />
                )}
                {TASK_STATUS_LABELS[slug]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
