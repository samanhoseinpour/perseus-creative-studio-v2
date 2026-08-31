// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (BulkActionBar precedent) — adding it would make its function props a
// client-entry violation.
import { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuChevronDown,
  LuCircle,
  LuCircleCheck,
  LuCircleDot,
  LuCircleEllipsis,
  LuSend,
  LuTrash2,
  LuTruck,
} from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  INTERNAL_CLIENT_LABEL,
  TASK_PRIORITY_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { TASK_VIEW_STATUSES, type TaskView } from '@/lib/taskFilters';
import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { TaskTagOption, TaskTagType } from '@/lib/taskTagFields';
import ClientCombobox from './ClientCombobox';
import DatesCellPopover from './DatesCellPopover';
import SelectAllCheckbox from './SelectAllCheckbox';
import TagPicker from './TagPicker';
import { dropdownMenuContent, menuItem } from './menu';
import type {
  PickerOption,
  TaskCellPatch,
  TaskFormOptions,
} from './types';

const BULK_MORE_ID = 'task-bulk-more';

type BulkAction = { status: TaskStatusSlug; label: string; icon: IconType };

// Every shipped move and "Needs approval" default actual hours to the estimate
// server-side; the toast says so. A bulk →delivered / →posted sends no day at
// all, so each row keeps the date it shipped on and the batch cannot migrate
// between monthly reports.
const ACTIONS: BulkAction[] = [
  { status: 'todo', label: 'Mark to do', icon: LuCircle },
  { status: 'in_progress', label: 'In progress', icon: LuCircleDot },
  { status: 'needs_approval', label: 'Needs approval', icon: LuCircleEllipsis },
  { status: 'done', label: 'Mark done', icon: LuCircleCheck },
  { status: 'delivered', label: 'Mark delivered', icon: LuTruck },
  { status: 'posted', label: 'Mark posted', icon: LuSend },
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
   * The seven FIELD controls (member x2, priority, client, tags x2, dates) fold
   * behind "More"; the four status actions, Delete and Clear never do.
   *
   * It used to dissolve at `md` — but thirteen controls need ~1350px and the
   * bar sits inside a page that runs to 2100px, so every desktop narrower than
   * that wrapped them onto a second row, which buries the four actions people
   * actually reach for exactly as it does on a phone. So the fold now holds to
   * `2xl` (1536px) and only dissolves above it, where they genuinely fit on one
   * line. `2xl:contents` is what dissolves it, so the bar keeps exactly one
   * wrap context and its current order there.
   *
   * If the compact size or the labels change, re-measure before moving this:
   * the breakpoint is a statement about how much width thirteen of them need,
   * not a preference.
   *
   * Deliberately NOT reset when the selection empties: someone who reached
   * for a field control once usually wants it again on the next selection,
   * and the whole block is unmounted at zero anyway, so nothing is on screen
   * to be stale.
   */
  const [moreOpen, setMoreOpen] = useState(false);

  const viewStatuses = TASK_VIEW_STATUSES[view];
  const actions =
    viewStatuses.length === 1
      ? ACTIONS.filter((a) => a.status !== viewStatuses[0])
      : ACTIONS;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-white/40 px-4 py-2 sm:px-5 dark:border-foreground/10',
        // Idle, this bar is a tick box and the words "Select all" — which is
        // what the table's own header cell is for, so above md: it is gone and
        // TaskBoard's <thead> carries it. It cannot simply be deleted: this bar
        // sits above BOTH renderings and the card list has no <thead>, so on a
        // phone it is the only select-all there is. Once anything is picked it
        // returns at every width, because then it is the action bar.
        count === 0 && 'md:hidden',
      )}
    >
      <SelectAllCheckbox
        allChecked={allChecked}
        someChecked={someChecked}
        onToggleAll={onToggleAll}
      />
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
                size="compact"
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
              size="compact"
              variant="secondary"
              icon={LuChevronDown}
              iconPosition="right"
              disabled={pending}
              aria-expanded={moreOpen}
              aria-controls={BULK_MORE_ID}
              onClick={() => setMoreOpen((v) => !v)}
              className="2xl:hidden"
            >
              More
            </Button>
            <span
              id={BULK_MORE_ID}
              className={cn(
                'flex w-full flex-wrap items-center gap-1.5 2xl:contents',
                !moreOpen && 'max-2xl:hidden',
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
              size="compact"
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
                  size="compact"
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
              size="compact"
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
              size="compact"
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
          size="compact"
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
            size="compact"
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
          size="compact"
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
