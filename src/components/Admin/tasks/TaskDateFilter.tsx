import { useState } from 'react';
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import {
  defaultDateField,
  isForwardDateField,
  isRangeAllowed,
  resolveTaskDateField,
  type TaskDateField,
  type TaskListParams,
  type TaskView,
  type TaskViewMode,
} from '@/lib/taskFilters';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import Button from '@/components/Button';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';
import type { FilterOption } from './FacetMenus';

/**
 * The task board's date facet: one control over the task dates (the composite
 * due-or-start default plus the four real columns), replacing the old Due
 * (three deadline presets, working views only) and Month (Done view only)
 * dropdowns — net one FEWER control in an already-crowded bar.
 *
 * Cloned from InboxFilterBar's private DateSelect rather than generalized, the
 * house precedent (TaskBoard clones InboxKeyboardList): the field radio group
 * has no inbox counterpart, and sharing would mean refactoring a working
 * inbox to serve a shape it doesn't have. Two details carried over verbatim
 * because both were learned the hard way — the controlled `open` that re-seeds
 * the custom inputs from the URL, and the stopPropagation that keeps Radix
 * typeahead off the native date inputs.
 *
 * No directive: a leaf of TaskFilterBar's client entry (DatesCellPopover's
 * rule — adding 'use client' here would make its function props a violation).
 */

const dateInput =
  'h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2 text-xs text-foreground outline-none';

const FIELD_OPTIONS: { value: TaskDateField; label: string }[] = [
  // 'date' = due ?? start — the date the Dates column shows as the row's own,
  // and the working tabs' default: quick-add's tasks are start-only, so a
  // due-only default hid the board's most common shape from every preset.
  { value: 'date', label: 'Due or start' },
  { value: 'due', label: 'Due date' },
  { value: 'start', label: 'Start date' },
  { value: 'completed', label: 'Completed' },
  { value: 'created', label: 'Created' },
];

/** The short name the trigger chip prefixes when the facet is windowing a
 *  non-default column — "Start · Today" — so the chip never claims a window
 *  it isn't applying to the date the reader assumes. */
const FIELD_CHIP: Record<TaskDateField, string> = {
  date: 'Due or start',
  due: 'Due',
  start: 'Start',
  completed: 'Completed',
  created: 'Created',
};

/** Same tokens either way — the labels flip with the field's direction, so the
 *  menu never offers "Next 7 days" for something that already happened.
 *  Overdue rides isRangeAllowed, not direction: on the Start field it would
 *  really mean "started before today", which is ongoing, not overdue. */
function presetOptions(field: TaskDateField): FilterOption[] {
  const forward = isForwardDateField(field);
  const rows: FilterOption[] = [];
  if (isRangeAllowed(field, 'overdue')) {
    rows.push({ value: 'overdue', label: 'Overdue' });
  }
  rows.push({ value: 'today', label: 'Today' });
  rows.push({ value: 'week', label: forward ? 'Next 7 days' : 'Last 7 days' });
  rows.push({ value: 'd30', label: forward ? 'Next 30 days' : 'Last 30 days' });
  rows.push({ value: 'month', label: 'This month' });
  rows.push({ value: 'lastmonth', label: 'Last month' });
  if (field !== 'created') rows.push({ value: 'none', label: 'No date' });
  return rows;
}

/** The trigger's label — what's actually narrowing the list, or the bare
 *  noun. A non-default field prefixes its name ("Start · Today"): with five
 *  possible columns behind one chip, a bare preset label would hide WHICH
 *  date is being windowed — the original "Today hid a task dated today"
 *  confusion, restated on the trigger. */
function triggerLabel(
  view: TaskView,
  field: TaskDateField,
  params: TaskListParams,
  mode: TaskViewMode,
): string {
  // On a calendar the field is the WHOLE control, so it is the whole label.
  // "Date" there would name the one thing the reader already knows.
  if (mode === 'calendar') return FIELD_CHIP[field];
  const prefix = field === defaultDateField(view) ? '' : `${FIELD_CHIP[field]} · `;
  if (params.from || params.to) {
    return `${prefix}${params.from || '…'} – ${params.to || '…'}`;
  }
  if (!params.drange || !isRangeAllowed(field, params.drange)) return 'Date';
  const preset = presetOptions(field).find((o) => o.value === params.drange);
  // A token with no row is not a window this menu can claim — presets are all
  // it carries now. Months moved out to the board's own month band, which is
  // where they always belonged: a month says which board you are looking at,
  // not which rows within it.
  return preset ? `${prefix}${preset.label}` : 'Date';
}

/** One window row. The real token is the radio value so AT hears the active
 *  facet (aria-checked); the check/spacer pair keeps labels aligned whether or
 *  not a row is selected (the CellSelectMenu rule). */
function Row({
  value,
  active,
  onSelect,
  children,
}: {
  value: string;
  active: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      className={cn(menuItem, 'text-foreground')}
      onSelect={onSelect}
    >
      {value === active ? (
        <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <span className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{children}</span>
    </DropdownMenu.RadioItem>
  );
}

export default function TaskDateFilter({
  view,
  params,
  mode,
  onNavigate,
  trigger,
  leading,
}: {
  view: TaskView;
  params: TaskListParams;
  /** Digest: its window IS the rolling N days, so only the forward fields are
   *  offered (taskListQs drops the rest there anyway). Calendar: the GRID is
   *  the window, picked by the month band, so this menu offers the field alone
   *  and no range at all. */
  mode: TaskViewMode;
  onNavigate: (next: Partial<TaskListParams>) => void;
  /** Custom trigger (the Dates column header) — replaces the default Button;
   *  must accept forwarded props/ref (DropdownMenu.Trigger asChild). */
  trigger?: React.ReactElement;
  /** A block above the fields — the header's sort rows. */
  leading?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);

  const calendar = mode === 'calendar';
  const field = resolveTaskDateField(params.dfield, view);
  const fields =
    mode === 'digest'
      ? FIELD_OPTIONS.filter((f) => isForwardDateField(f.value))
      : FIELD_OPTIONS;
  const presets = presetOptions(field);
  const custom = Boolean(params.from || params.to);
  const activePreset =
    !custom && params.drange && isRangeAllowed(field, params.drange)
      ? params.drange
      : '';

  // Switching the column keeps the window when it still means something there
  // and drops it when it doesn't (a completion can't be "overdue"), rather
  // than leaving a chip that claims a filter the query isn't applying.
  const selectField = (next: TaskDateField) => {
    // On a calendar there is no window to keep or drop: the month band owns it.
    if (calendar) {
      onNavigate({ dfield: next === defaultDateField(view) ? '' : next });
      return;
    }
    const keep = custom || isRangeAllowed(next, params.drange);
    onNavigate({
      // '' when it matches the view's default, so the URL stays short.
      dfield: next === defaultDateField(view) ? '' : next,
      drange: keep && !custom ? params.drange : '',
      from: keep ? params.from : '',
      to: keep ? params.to : '',
    });
  };

  const selectRange = (token: string) => {
    onNavigate({
      dfield: field === defaultDateField(view) ? '' : field,
      drange: token,
      from: '',
      to: '',
    });
  };

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Re-seed from the URL on every open, so a discarded edit doesn't
        // linger in the inputs and get applied on the next visit.
        if (next) {
          setFrom(params.from);
          setTo(params.to);
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="compact"
            variant="secondary"
            icon={LuChevronDown}
            iconPosition="right"
          >
            {triggerLabel(view, field, params, mode)}
          </Button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={cn(dropdownMenuContent, 'min-w-56')}
        >
          <GlassRim />
          {leading}

          <DropdownMenu.RadioGroup value={field}>
            {fields.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => selectField(option.value)}
              >
                {option.value === field ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{option.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          {!calendar && (
            <>
          <div className="my-1 border-t border-white/40 dark:border-white/10" />

          <DropdownMenu.RadioGroup value={activePreset}>
            <Row
              value=""
              active={custom ? '__custom' : activePreset}
              onSelect={() => onNavigate({ drange: '', from: '', to: '' })}
            >
              Any
            </Row>
            {presets.map((option) => (
              <Row
                key={option.value}
                value={option.value}
                active={activePreset}
                onSelect={() => selectRange(option.value)}
              >
                {option.label}
              </Row>
            ))}
          </DropdownMenu.RadioGroup>

          {/* stopPropagation keeps radix typeahead off the date inputs */}
          <div
            className="mt-1 border-t border-white/40 px-3 pt-2 pb-1.5 dark:border-white/10"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <p className="pb-1.5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase select-none">
              Custom range
            </p>
            <span className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From date"
                className={dateInput}
              />
              <span aria-hidden="true" className="text-xs text-muted-foreground">
                –
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To date"
                className={dateInput}
              />
            </span>
            <Button
              type="button"
              size="compact"
              variant="secondary"
              showIcon={false}
              className="mt-2 w-full"
              disabled={!from && !to}
              onClick={() => {
                onNavigate({
                  dfield: field === defaultDateField(view) ? '' : field,
                  drange: '',
                  from,
                  to,
                });
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
