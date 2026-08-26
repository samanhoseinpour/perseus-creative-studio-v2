// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (BulkActionBar precedent) — adding it would make its function props a
// client-entry violation.
import { useEffect, useRef, useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import type { IconType } from 'react-icons';
import {
  LuChevronDown,
  LuCircle,
  LuCircleCheck,
  LuCircleDot,
  LuCircleEllipsis,
  LuTrash2,
} from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  INTERNAL_CLIENT_LABEL,
  TASK_PRIORITY_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { TASK_VIEW_STATUSES, type TaskView } from '@/lib/taskFilters';
import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { TaskTagOption, TaskTagType } from '@/lib/taskTagFields';
import ClientCombobox from './ClientCombobox';
import DatesCellPopover from './DatesCellPopover';
import TagPicker from './TagPicker';
import { dropdownMenuContent, menuItem } from './menu';
import type {
  PickerOption,
  TaskCellPatch,
  TaskFormOptions,
} from './types';

const BULK_MORE_ID = 'task-bulk-more';

type BulkAction = { status: TaskStatusSlug; label: string; icon: IconType };

// "Mark done" / "Needs approval" default actual hours to the estimate
// server-side; the toast says so.
const ACTIONS: BulkAction[] = [
  { status: 'todo', label: 'Mark to do', icon: LuCircle },
  { status: 'in_progress', label: 'In progress', icon: LuCircleDot },
  { status: 'needs_approval', label: 'Needs approval', icon: LuCircleEllipsis },
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
  onTags,
  onAssignees,
  onDelete,
  todayKey,
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
  /** Tags are ADD/REMOVE across the selection, never a replace — a "set
   *  tags" over a mixed selection would wipe what each row already carried. */
  onTags: (change: { add?: string[]; remove?: string[] }, label: string) => void;
  /** Assignees the same way, and for the same reason. This one replaced a
   *  single-select "Assign" that WAS a replace — harmless while a task held
   *  one member, and a silent way to drop someone off a shoot once it can
   *  hold several. */
  onAssignees: (
    change: { add?: string[]; remove?: string[] },
    label: string,
  ) => void;
  onDelete: () => void;
  /** Server-computed today in the READER's zone — the popover's chips. */
  todayKey: string;
}) {
  /**
   * Below md the board is a card list, and this bar is where a selection is
   * acted on — but the seven FIELD controls (member x2, priority, client,
   * tags x2, dates) wrap into a wall six rows tall on a 360px screen, which
   * buries the four status actions people actually reach for. Same disclosure
   * the filter chips and the add band on this page already use, at the same
   * breakpoint as the cards: `md:contents` dissolves the wrapper on desktop,
   * so the bar keeps exactly one wrap context and its current order there.
   *
   * Deliberately NOT reset when the selection empties: someone who reached
   * for a field control once usually wants it again on the next selection,
   * and the whole block is unmounted at zero anyway, so nothing is on screen
   * to be stale.
   */
  const [moreOpen, setMoreOpen] = useState(false);

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
            <Button
              type="button"
              size="small"
              variant="secondary"
              icon={LuChevronDown}
              iconPosition="right"
              disabled={pending}
              aria-expanded={moreOpen}
              aria-controls={BULK_MORE_ID}
              onClick={() => setMoreOpen((v) => !v)}
              className="md:hidden"
            >
              More
            </Button>
            <span
              id={BULK_MORE_ID}
              className={cn(
                'flex w-full flex-wrap items-center gap-1.5 md:contents',
                !moreOpen && 'max-md:hidden',
              )}
            >
            {/* Two controls, not one, for the tag pickers' reason below: on a
                mixed selection "put this person on" and "take this person off"
                are different intents, and the destructive one must not be a
                mis-click away from the other. A row already carrying the
                member is left alone rather than duplicated, and the server
                refuses to strip a task's last member. */}
            <BulkSelect
              label="Add member"
              options={options.assignees}
              showAvatars
              disabled={pending}
              onSelect={(option) =>
                onAssignees({ add: [option.value] }, `Added ${option.label}`)
              }
            />
            <BulkSelect
              label="Remove member"
              options={options.assignees}
              showAvatars
              disabled={pending}
              onSelect={(option) =>
                onAssignees(
                  { remove: [option.value] },
                  `Removed ${option.label}`,
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
                  option.value
                    ? `Client: ${option.label}`
                    : `Moved to ${INTERNAL_CLIENT_LABEL}`,
                )
              }
            />
            {/* Two pickers, not one with a mode switch: "add these" and
                "take these off" are different intents, and a shared control
                would make the destructive one a mis-click away. Each resets
                to empty after firing — the bar is stateless between edits. */}
            <BulkTagPicker
              label="Add tags"
              tags={options.tags}
              tagTypes={options.tagTypes}
              disabled={pending}
              onCommit={(ids, names) =>
                onTags({ add: ids }, `Added ${names}`)
              }
            />
            <BulkTagPicker
              label="Remove tags"
              tags={options.tags}
              tagTypes={options.tagTypes}
              disabled={pending}
              onCommit={(ids, names) =>
                onTags({ remove: ids }, `Removed ${names}`)
              }
            />
            <DatesCellPopover
              startDate=""
              dueDate=""
              todayKey={todayKey}
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
            </span>
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

/**
 * A tag picker whose selection is a one-shot instruction, not a value.
 *
 * The row picker edits "this task's tags"; this one says "apply these to all
 * of them", so it holds its own draft, fires once on Apply, and resets. There
 * is no category to scope by across a mixed selection, so it offers the whole
 * ACTIVE vocabulary — the one place the flat list is the honest answer.
 */
function BulkTagPicker({
  label,
  tags,
  tagTypes,
  disabled,
  onCommit,
}: {
  label: string;
  tags: TaskTagOption[];
  tagTypes: TaskTagType[];
  disabled?: boolean;
  onCommit: (ids: string[], names: string) => void;
}) {
  const [draft, setDraft] = useState<string[]>([]);
  const chosen = tags.filter((t) => draft.includes(t.id));

  return (
    <span className="inline-flex items-center gap-1.5">
      <TagPicker
        tags={tags}
        types={tagTypes}
        // null = no scoping. A mixed selection has no single category to
        // follow, so this is the one place the flat vocabulary is the honest
        // list rather than the long one scoping was introduced to replace.
        categoryId={null}
        value={draft}
        onChange={setDraft}
        disabled={disabled}
        placeholder={label}
        trigger={
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon={LuChevronDown}
            iconPosition="right"
            disabled={disabled}
          >
            {draft.length > 0 ? `${label} (${draft.length})` : label}
          </Button>
        }
      />
      {draft.length > 0 && (
        <Button
          type="button"
          size="small"
          shimmer={false}
          showIcon={false}
          disabled={disabled}
          onClick={() => {
            onCommit(draft, chosen.map((t) => t.name).join(', '));
            setDraft([]);
          }}
        >
          Apply
        </Button>
      )}
    </span>
  );
}
