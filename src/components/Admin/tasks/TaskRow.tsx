// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (InboxRow precedent).
import { forwardRef, memo } from 'react';

import {
  formatMinutes,
  INTERNAL_CLIENT_LABEL,
  type TaskPrioritySlug,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import CellSelectMenu from './CellSelectMenu';
import ClientCombobox from './ClientCombobox';
import ClientMark from './ClientMark';
import CompletedCellPopover from './CompletedCellPopover';
import DatesCellPopover from './DatesCellPopover';
import { dueDateLabel } from './format';
import { cellChevron, cellGhost, cellTrigger } from './menu';
import TaskPriorityMenu from './TaskPriorityMenu';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskRowMenu from './TaskRowMenu';
import TaskStatusBadge from './TaskStatusBadge';
import TaskStatusMenu from './TaskStatusMenu';
import TimeCellPopover from './TimeCellPopover';
import TagPicker, { TagPickerGhost } from './TagPicker';
import { TaskTagStrip } from './TaskTagChip';
import TitleCell from './TitleCell';
import type {
  PickerOption,
  TaskCellPatch,
  TaskFormOptions,
  TaskRowData,
} from './types';

type Props = {
  row: TaskRowData;
  /** The render's Vancouver YYYY-MM-DD — optimistic dueState recompute. */
  todayKey: string;
  options: TaskFormOptions;
  selected?: boolean;
  checked?: boolean;
  /** Quick-add optimistic row: dimmed, non-interactive, not yet on the server. */
  pending?: boolean;
  /** Just created from the quick-add band — flash once so the eye finds it.
   *  A per-row boolean rather than the id itself, so the memo() below still
   *  spares the other 24 rows when one of them lights up. */
  highlight?: boolean;
  // Handlers take the row/id so TaskBoard can pass ONE stable callback set to
  // every row — fresh per-row closures would defeat the memo() below and
  // re-render all 25 rows on every cursor move / keystroke.
  onToggle?: (id: string) => void;
  onEdit?: (row: TaskRowData) => void;
  onStatusSelect?: (row: TaskRowData, next: TaskStatusSlug) => void;
  /** The inline-edit door: field patch + the optimistic row overlay. */
  onPatch?: (
    id: string,
    patch: TaskCellPatch,
    optimistic: Partial<TaskRowData>,
  ) => void;
  /** The completion day rides the STATUS door (setTaskStatus), not patchTask,
   *  so it gets its own prop rather than a key on TaskCellPatch — that type
   *  mirrors patchTaskSchema and must stay unable to express this. Done rows
   *  only; TaskBoard owns the optimistic overlay, as it does for onPatch. */
  onCompletedOn?: (id: string, completedOn: string) => void;
  onDuplicate?: (row: TaskRowData) => void;
  onSaveAsTemplate?: (row: TaskRowData) => void;
  onDelete?: (row: TaskRowData) => void;
  /** Inline "+ New client" from the cell's combobox (quickCreateClient). */
  onCreateClient?: (name: string) => Promise<PickerOption | null>;
  /** Tags have their own door (setTaskTags) — they live in a join table, so
   *  they can't ride onPatch's column patch. Same rule as status. */
  onTagsChange?: (row: TaskRowData, next: string[]) => void;
};

const cellText = 'whitespace-nowrap text-xs text-muted-foreground';

/** Recompute the deadline tone after an optimistic date edit — the same rule
 *  TasksListView applies server-side. */
function dueStateOf(
  dueDate: string,
  todayKey: string,
): TaskRowData['dueState'] {
  if (!dueDate) return '';
  if (dueDate < todayKey) return 'overdue';
  return dueDate === todayKey ? 'today' : '';
}

/** Over-estimate reads as attention, not alarm — amber, where rose stays
 *  reserved for overdue, an actual missed commitment. */
const VARIANCE_OVER_TONE = 'text-amber-700 dark:text-amber-400';

const DUE_TONE: Record<Exclude<TaskRowData['dueState'], ''>, string> = {
  overdue: 'font-medium text-rose-600 dark:text-rose-400',
  today: 'font-medium text-amber-600 dark:text-amber-400',
};

// One task as a table row — every cell is its own inline editor sharing the
// status pill's grammar (hover chevron, one click to open, optimistic apply
// through onPatch). The checkbox lives in its own cell as a SIBLING of the
// title (InboxRow rule: selecting must never open). The row highlight sits on
// the <tr> so every cell shares it; `group/row` drives the hover reveals
// (ghost "+ …", the Open pill, the ⋯ menu); the ref lets the keyboard cursor
// scroll the active row into view. memo(): each row is ~8 Radix roots, so a
// j/k cursor move must re-render exactly the two rows whose `selected`
// changed, not the whole 25-row page at key-repeat rate.
const TaskRow = memo(
  forwardRef<HTMLTableRowElement, Props>(function TaskRow(
  {
    row,
    todayKey,
    options,
    selected,
    checked,
    pending,
    highlight,
    onToggle,
    onEdit,
    onStatusSelect,
    onPatch,
    onCompletedOn,
    onDuplicate,
    onSaveAsTemplate,
    onDelete,
    onCreateClient,
    onTagsChange,
  },
  ref,
) {
  const editable = Boolean(onPatch) && !pending;

  const timeLabel = (
    <span className="flex flex-col items-end tabular-nums">
      <span>
        {formatMinutes(row.estimatedMinutes)}
        {row.actualMinutes != null && (
          <span className="text-foreground">
            {' / '}
            {formatMinutes(row.actualMinutes)}
          </span>
        )}
      </span>
      {/* Where the hours actually landed. Only 'over' is tinted: finishing
          under estimate isn't a problem to flag, but a habit of running over
          is the signal that the estimates need work, not the people. */}
      {row.varianceLabel && (
        <span
          className={cn(
            'text-[0.65rem]',
            row.varianceState === 'over'
              ? VARIANCE_OVER_TONE
              : 'text-muted-foreground',
          )}
          title={`${row.varianceLabel} ${row.varianceState} the ${formatMinutes(row.estimatedMinutes)} estimate`}
        >
          {row.varianceLabel}
        </span>
      )}
    </span>
  );

  const dueTone = row.dueState ? DUE_TONE[row.dueState] : undefined;
  const datesAria = row.dueDate
    ? `Dates: ${
        row.startLabel ? `${row.startLabel} to ${row.dueLabel}` : row.dueLabel
      }${
        row.dueState === 'overdue'
          ? ' (overdue)'
          : row.dueState === 'today'
            ? ' (due today)'
            : ''
      } — edit`
    : row.startLabel
      ? `Dates: starts ${row.startLabel} — edit`
      : 'Add dates';
  const datesLabel = row.dueDate ? (
    <span
      className={cn('tabular-nums', dueTone)}
      title={
        row.dueState === 'overdue'
          ? 'Overdue'
          : row.dueState === 'today'
            ? 'Due today'
            : undefined
      }
    >
      {row.startLabel ? `${row.startLabel} → ${row.dueLabel}` : row.dueLabel}
    </span>
  ) : row.startLabel ? (
    <span className="tabular-nums">{row.startLabel} →</span>
  ) : editable ? (
    <span className={cn('text-xs', cellGhost)}>+ Dates</span>
  ) : null;

  const clientContent = (
    <>
      {row.clientId ? (
        <ClientMark name={row.clientLabel} logo={row.clientLogo || null} size={18} />
      ) : (
        <ClientMark name={row.clientLabel} logo={null} mark size={18} />
      )}
      <span className="truncate">{row.clientLabel}</span>
    </>
  );

  const memberContent = (
    <>
      <AdminAvatar
        name={row.assigneeName}
        size={20}
        {...(row.assigneeAvatar ?? {})}
      />
      <span className="truncate">{row.assigneeName}</span>
    </>
  );

  const clientUsage = row.clientId
    ? options.clients.find((o) => o.value === row.clientId)?.hint
    : undefined;

  return (
    <tr
      ref={ref}
      className={cn(
        'group/row border-b border-white/40 last:border-b-0 dark:border-white/10',
        selected ? 'bg-white/60 dark:bg-white/10' : glassRowHover,
        checked && 'bg-white/50 dark:bg-white/[0.08]',
        pending && 'animate-pulse opacity-60',
        highlight && 'motion-safe:animate-task-flash',
      )}
    >
      <td className="w-10 pl-4 sm:pl-5">
        {onToggle ? (
          <label className="flex cursor-pointer items-center py-3">
            <input
              type="checkbox"
              checked={checked ?? false}
              onChange={() => onToggle(row.id)}
              aria-label={`Select ${row.title}`}
              className="size-4 accent-foreground"
            />
          </label>
        ) : (
          <span className="block size-4" aria-hidden="true" />
        )}
      </td>
      <td className="min-w-56 max-w-96 py-2 pr-3">
        {editable && onEdit ? (
          <TitleCell
            title={row.title}
            notes={row.notes}
            deliverableUrl={row.deliverableUrl}
            selected={selected}
            onCommit={(title) => onPatch?.(row.id, { title }, { title })}
            onOpen={() => onEdit(row)}
          />
        ) : (
          <span className="flex min-w-0 flex-col">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {row.title}
            </span>
            {row.notes && (
              <span className="mt-0.5 line-clamp-1 max-w-80 text-xs text-muted-foreground">
                {row.notes}
              </span>
            )}
          </span>
        )}
      </td>
      <td className={cn(cellText, 'pr-3')} title={clientUsage}>
        {editable && onCreateClient ? (
          <ClientCombobox
            value={row.clientId}
            valueLabel={row.clientId ? row.clientLabel : null}
            options={options.clients}
            onCreate={onCreateClient}
            onSelect={(option) =>
              onPatch?.(
                row.id,
                { clientId: option.value || null },
                {
                  clientId: option.value,
                  clientLabel: option.value
                    ? option.label
                    : INTERNAL_CLIENT_LABEL,
                  clientLogo: option.logo ?? '',
                },
              )
            }
            trigger={
              <button
                type="button"
                aria-label={`Client: ${row.clientLabel} — change`}
                className={cellTrigger}
              >
                {clientContent}
              </button>
            }
          />
        ) : (
          <span className="inline-flex max-w-full items-center gap-1.5">
            {clientContent}
          </span>
        )}
      </td>
      <td className={cn(cellText, 'pr-3')}>
        {editable ? (
          <CellSelectMenu
            ariaLabel={`Category: ${row.categoryLabel} — change`}
            value={row.categoryId}
            options={options.categories}
            onSelect={(option) =>
              onPatch?.(
                row.id,
                { categoryId: option.value },
                { categoryId: option.value, categoryLabel: option.label },
              )
            }
          >
            <span className="truncate">{row.categoryLabel}</span>
          </CellSelectMenu>
        ) : (
          row.categoryLabel
        )}
      </td>
      {/* Tags. `whitespace-nowrap` keeps the row one line high; the WIDTH
          CAP lives on TaskTagStrip, and it is what stops this column growing.
          The table is auto-layout, so a cell's min-content contribution is
          clamped by its content's own max-width — before that cap a heavily
          tagged task added ~400px no other column could give back, and the
          whole board scrolled sideways. No fixed width on the header either:
          the cap bounds the column, and a fixed one would spend 13rem on
          boards where most rows carry no tags at all. */}
      <td className={cn(cellText, 'pr-3 whitespace-nowrap')}>
        {editable && onTagsChange ? (
          <TagPicker
            tags={options.tags}
            types={options.tagTypes}
            categoryId={row.categoryId}
            value={row.tags.map((t) => t.id)}
            onChange={(next) => onTagsChange(row, next)}
            trigger={
              <button
                type="button"
                aria-label={
                  row.tags.length > 0
                    ? `Tags: ${row.tags.map((t) => t.name).join(', ')} — change`
                    : 'Add tags'
                }
                className={cellTrigger}
              >
                {row.tags.length > 0 ? (
                  <TaskTagStrip tags={row.tags} />
                ) : (
                  <span className={cellGhost}>
                    <TagPickerGhost label="+ Tags" />
                  </span>
                )}
              </button>
            }
          />
        ) : (
          <TaskTagStrip tags={row.tags} />
        )}
      </td>
      <td className={cn(cellText, 'pr-3')}>
        {editable ? (
          <CellSelectMenu
            ariaLabel={`Member: ${row.assigneeName} — change`}
            value={row.assigneeId}
            options={options.assignees}
            showAvatars
            onSelect={(option) =>
              onPatch?.(
                row.id,
                { assigneeId: option.value },
                {
                  assigneeId: option.value,
                  assigneeName: option.label,
                  assigneeAvatar: option.avatar ?? null,
                },
              )
            }
          >
            {memberContent}
          </CellSelectMenu>
        ) : (
          <span className="inline-flex max-w-full items-center gap-1.5">
            {memberContent}
          </span>
        )}
      </td>
      <td className="pr-3">
        {editable ? (
          <TaskPriorityMenu
            priority={row.priority}
            onSelect={(next: TaskPrioritySlug | null) =>
              onPatch?.(row.id, { priority: next }, { priority: next })
            }
          />
        ) : row.priority ? (
          <TaskPriorityBadge priority={row.priority} />
        ) : null}
      </td>
      <td className="pr-3">
        {onStatusSelect && !pending ? (
          <TaskStatusMenu
            status={row.status}
            onSelect={(next) => onStatusSelect(row, next)}
          />
        ) : (
          <TaskStatusBadge status={row.status} />
        )}
      </td>
      <td className={cn(cellText, 'pr-3 text-right')}>
        {editable ? (
          <TimeCellPopover
            status={row.status}
            estimatedMinutes={row.estimatedMinutes}
            actualMinutes={row.actualMinutes}
            onCommit={(patch) =>
              onPatch?.(row.id, patch, {
                ...(patch.estimatedMinutes !== undefined
                  ? { estimatedMinutes: patch.estimatedMinutes }
                  : {}),
                ...(patch.actualMinutes !== undefined
                  ? { actualMinutes: patch.actualMinutes }
                  : {}),
              })
            }
          >
            {timeLabel}
          </TimeCellPopover>
        ) : (
          timeLabel
        )}
      </td>
      {/* One column on EVERY tab, always start→due. It used to swap to the
          completion day on Done alone, and a column that silently changes
          which FIELD it shows reads as a date that changed by itself — the
          bug report that produced all of this. A done row keeps its
          completion day, demoted to a second line (the Time cell's grammar
          above), because that day is what decides the month it counts in. */}
      <td className={cn(cellText, 'pr-3 text-right')}>
        <span className="flex flex-col items-end">
          {editable ? (
            <DatesCellPopover
              startDate={row.startDate}
              dueDate={row.dueDate}
              todayKey={todayKey}
              ariaLabel={datesAria}
              onCommit={(patch) => {
                const nextStart =
                  patch.startDate === undefined
                    ? row.startDate
                    : (patch.startDate ?? '');
                const nextDue =
                  patch.dueDate === undefined ? row.dueDate : (patch.dueDate ?? '');
                onPatch?.(row.id, patch, {
                  startDate: nextStart,
                  startLabel: nextStart ? dueDateLabel(nextStart, todayKey) : '',
                  dueDate: nextDue,
                  dueLabel: nextDue ? dueDateLabel(nextDue, todayKey) : '',
                  dueState: dueStateOf(nextDue, todayKey),
                });
              }}
            >
              {datesLabel ?? <span aria-hidden="true" />}
            </DatesCellPopover>
          ) : (
            datesLabel
          )}
          {/* `completedDate` rather than the status alone: it also covers the
              row still rendering as done while an in-flight reopen settles. */}
          {row.status === 'done' && row.completedDate ? (
            editable && onCompletedOn ? (
              <CompletedCellPopover
                completedDate={row.completedDate}
                todayKey={todayKey}
                ariaLabel={`Completed ${row.completedLabel} — change`}
                chevronClassName={cn(cellChevron, 'size-2.5')}
                onCommit={(next) => onCompletedOn(row.id, next)}
              >
                <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                  done {row.completedLabel}
                </span>
              </CompletedCellPopover>
            ) : (
              <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                done {row.completedLabel}
              </span>
            )
          ) : null}
        </span>
      </td>
      <td className="pr-4 text-right sm:pr-5">
        {editable && onEdit && onDuplicate && onSaveAsTemplate && onDelete ? (
          <TaskRowMenu
            title={row.title}
            onEdit={() => onEdit(row)}
            onDuplicate={() => onDuplicate(row)}
            onSaveAsTemplate={() => onSaveAsTemplate(row)}
            onDelete={() => onDelete(row)}
          />
        ) : (
          <span className="block size-6" aria-hidden="true" />
        )}
      </td>
    </tr>
  );
  }),
);

export default TaskRow;
