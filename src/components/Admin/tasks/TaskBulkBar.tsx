// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (BulkActionBar precedent) — adding it would make its function props a
// client-entry violation.
import { useEffect, useRef } from 'react';
import { DropdownMenu } from 'radix-ui';
import type { IconType } from 'react-icons';
import {
  LuChevronDown,
  LuCircle,
  LuCircleCheck,
  LuCircleDot,
  LuTrash2,
} from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { TASK_VIEW_STATUSES, type TaskView } from '@/lib/taskFilters';
import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import DatesCellPopover from './DatesCellPopover';
import { dropdownMenuContent, menuItem } from './menu';
import type {
  PickerOption,
  TaskCellPatch,
  TaskFormOptions,
} from './types';

type BulkAction = { status: TaskStatusSlug; label: string; icon: IconType };

// "Mark done" defaults actual hours to the estimate server-side; the toast
// says so.
const ACTIONS: BulkAction[] = [
  { status: 'todo', label: 'Mark to do', icon: LuCircle },
  { status: 'in_progress', label: 'In progress', icon: LuCircleDot },
  { status: 'done', label: 'Mark done', icon: LuCircleCheck },
];

// null clears the priority on every selected row.
const PRIORITY_OPTIONS: PickerOption[] = [
  { value: '', label: 'None' },
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    value: slug as string,
    label: TASK_PRIORITY_LABELS[slug],
  })),
];

/**
 * The select-all + bulk-actions row above the task table. Always rendered (it
 * hosts the select-all checkbox); the action buttons appear once anything is
 * selected. On a single-status tab the status action matching that tab is
 * dropped — it could only be a no-op. Besides status moves, the bar edits
 * fields across the selection (assignee / priority / client / dates through
 * bulkPatchTasks — one field set, many rows) and bulk-deletes behind the
 * board's ConfirmDialog. State lives in TaskBoard; this is presentation.
 */
export default function TaskBulkBar({
  view,
  count,
  allChecked,
  someChecked,
  pending,
  options,
  onToggleAll,
  onClear,
  onAction,
  onPatch,
  onDelete,
}: {
  view: TaskView;
  count: number;
  allChecked: boolean;
  someChecked: boolean;
  pending: boolean;
  /** The id-valued form option sets (assignees carry faces, clients logos). */
  options: TaskFormOptions;
  onToggleAll: () => void;
  onClear: () => void;
  onAction: (status: TaskStatusSlug, label: string) => void;
  /** One field set for every selected row; label seeds the result toast. */
  onPatch: (patch: TaskCellPatch, label: string) => void;
  onDelete: () => void;
}) {
  // `indeterminate` is a DOM property, not an attribute — set it imperatively.
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [someChecked, allChecked]);

  const viewStatuses = TASK_VIEW_STATUSES[view];
  const actions =
    viewStatuses.length === 1
      ? ACTIONS.filter((a) => a.status !== viewStatuses[0])
      : ACTIONS;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-4 py-2 sm:px-5 dark:border-white/10">
      <label className="flex cursor-pointer items-center">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          aria-label="Select all on this page"
          className="size-4 accent-foreground"
        />
      </label>
      {count > 0 ? (
        <>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {count} selected
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {actions.map(({ status, label, icon }) => (
              <Button
                key={label}
                type="button"
                size="small"
                variant="secondary"
                icon={icon}
                iconPosition="left"
                disabled={pending}
                onClick={() => onAction(status, label)}
              >
                {label}
              </Button>
            ))}
            <BulkSelect
              label="Assign"
              options={options.assignees}
              showAvatars
              disabled={pending}
              onSelect={(option) =>
                onPatch(
                  { assigneeId: option.value },
                  `Assigned to ${option.label}`,
                )
              }
            />
            <BulkSelect
              label="Priority"
              options={PRIORITY_OPTIONS}
              disabled={pending}
              onSelect={(option) =>
                onPatch(
                  { priority: (option.value || null) as TaskCellPatch['priority'] },
                  option.value
                    ? `Priority: ${option.label.toLowerCase()}`
                    : 'Priority cleared',
                )
              }
            />
            <ClientCombobox
              value={null}
              valueLabel={null}
              options={options.clients}
              disabled={pending}
              onSelect={(option) =>
                onPatch(
                  { clientId: option.value || null },
                  option.value ? `Client: ${option.label}` : 'Moved to Internal',
                )
              }
            />
            <DatesCellPopover
              startDate=""
              dueDate=""
              ariaLabel="Set dates for the selected tasks"
              onCommit={(patch) => onPatch(patch, 'Dates updated')}
              trigger={
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  icon={LuChevronDown}
                  iconPosition="right"
                  disabled={pending}
                >
                  Dates
                </Button>
              }
            />
            <Button
              type="button"
              size="small"
              variant="secondary"
              icon={LuTrash2}
              iconPosition="left"
              disabled={pending}
              onClick={onDelete}
              className="text-rose-600 dark:text-rose-400"
            >
              Delete
            </Button>
            <Button
              type="button"
              size="small"
              variant="secondary"
              showIcon={false}
              disabled={pending}
              onClick={onClear}
            >
              Clear
            </Button>
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Select all</span>
      )}
    </div>
  );
}

/** Value-less single-shot menu (there is no "current" value across a mixed
 *  selection) — plain items, avatars for the assignee list. */
function BulkSelect({
  label,
  options,
  showAvatars,
  disabled,
  onSelect,
}: {
  label: string;
  options: PickerOption[];
  showAvatars?: boolean;
  disabled?: boolean;
  onSelect: (option: PickerOption) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
          disabled={disabled}
        >
          {label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value || '__none__'}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect(option)}
            >
              {showAvatars && (
                <AdminAvatar
                  name={option.label}
                  size={20}
                  {...(option.avatar ?? {})}
                />
              )}
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
