// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (InboxRow precedent).
import { forwardRef, memo } from 'react';

import {
  formatMinutes,
  timeInputValue,
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
import DatesCellPopover from './DatesCellPopover';
import { dueDateLabel } from './format';
import { cellGhost, cellTrigger } from './menu';
import TaskPriorityMenu from './TaskPriorityMenu';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskRowMenu from './TaskRowMenu';
import TaskStatusBadge from './TaskStatusBadge';
import TaskStatusMenu from './TaskStatusMenu';
import TimeCellPopover from './TimeCellPopover';
import TitleCell from './TitleCell';
import type {
  PickerOption,
  TaskCellPatch,
  TaskFormOptions,
  TaskRowData,
} from './types';

type Props = {
  row: TaskRowData;
  /** Which date the trailing column shows — start→due on working views,
   *  completed on Done/All (TaskBoard decides per view). */
  dateColumn: 'due' | 'completed';
  /** The render's Vancouver YYYY-MM-DD — optimistic dueState recompute. */
  todayKey: string;
  options: TaskFormOptions;
  selected?: boolean;
  checked?: boolean;
  /** Quick-add optimistic row: dimmed, non-interactive, not yet on the server. */
  pending?: boolean;
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
  onDuplicate?: (row: TaskRowData) => void;
  onSaveAsTemplate?: (row: TaskRowData) => void;
  onDelete?: (row: TaskRowData) => void;
  /** Inline "+ New client" from the cell's combobox (quickCreateClient). */
  onCreateClient?: (name: string) => Promise<PickerOption | null>;
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
    dateColumn,
    todayKey,
    options,
    selected,
    checked,
    pending,
    onToggle,
    onEdit,
    onStatusSelect,
    onPatch,
    onDuplicate,
    onSaveAsTemplate,
    onDelete,
    onCreateClient,
  },
  ref,
) {
  const editable = Boolean(onPatch) && !pending;

  const timeLabel = (
    <span className="tabular-nums">
      {formatMinutes(row.estimatedMinutes)}
      {row.actualMinutes != null && (
        <span className="text-foreground">
          {' / '}
          {formatMinutes(row.actualMinutes)}
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
                  ? {
                      estimatedMinutes: patch.estimatedMinutes,
                      estHours: timeInputValue(patch.estimatedMinutes),
                    }
                  : {}),
                ...(patch.actualMinutes !== undefined
                  ? {
                      actualMinutes: patch.actualMinutes,
                      actualHours: timeInputValue(patch.actualMinutes),
                    }
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
      <td className={cn(cellText, 'pr-3 text-right')}>
        {dateColumn === 'completed' ? (
          <span className="tabular-nums">{row.completedLabel}</span>
        ) : editable ? (
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
