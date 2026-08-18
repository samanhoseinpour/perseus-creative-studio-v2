import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import {
  defaultDateField,
  isForwardDateField,
  isRangeAllowed,
  resolveTaskDateField,
  type TaskDateField,
  type TaskListParams,
  type TaskView,
} from '@/lib/taskFilters';
import Button from '@/components/Button';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';
import type { FilterOption } from './TaskFilterBar';

/**
 * The task board's date facet: one control over four columns, replacing the
 * old Due (three deadline presets, working views only) and Month (Done view
 * only) dropdowns — net one FEWER control in an already-crowded bar.
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
  'h-8 w-full rounded-lg border border-white/50 bg-white/40 px-2 text-xs text-foreground outline-none dark:border-white/15 dark:bg-white/10';

const FIELD_OPTIONS: { value: TaskDateField; label: string }[] = [
  { value: 'due', label: 'Due date' },
  { value: 'start', label: 'Start date' },
  { value: 'completed', label: 'Completed' },
  { value: 'created', label: 'Created' },
];

/** Same tokens either way — the labels flip with the field's direction, so the
 *  menu never offers "Next 7 days" for something that already happened. */
function presetOptions(field: TaskDateField): FilterOption[] {
  const forward = isForwardDateField(field);
  const rows: FilterOption[] = [];
  if (forward) rows.push({ value: 'overdue', label: 'Overdue' });
  rows.push({ value: 'today', label: 'Today' });
  rows.push({ value: 'week', label: forward ? 'Next 7 days' : 'Last 7 days' });
  rows.push({ value: 'd30', label: forward ? 'Next 30 days' : 'Last 30 days' });
  rows.push({ value: 'month', label: 'This month' });
  rows.push({ value: 'lastmonth', label: 'Last month' });
  if (field !== 'created') rows.push({ value: 'none', label: 'No date' });
  return rows;
}

/** The trigger's label — what's actually narrowing the list, or the bare noun. */
function triggerLabel(
  field: TaskDateField,
  params: TaskListParams,
  monthOptions: FilterOption[],
): string {
  if (params.from || params.to) {
    return `${params.from || '…'} – ${params.to || '…'}`;
  }
  if (!params.drange || !isRangeAllowed(field, params.drange)) return 'Date';
  const preset = presetOptions(field).find((o) => o.value === params.drange);
  if (preset) return preset.label;
  return (
    monthOptions.find((o) => o.value === params.drange)?.label ?? params.drange
  );
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
  monthOptions,
  digest,
  onNavigate,
}: {
  view: TaskView;
  params: TaskListParams;
  /** Recent months, newest first — the Done tab's picker, kept alive inside
   *  the facet so a routine monthly lookup isn't a custom-range chore. */
  monthOptions: FilterOption[];
  /** Digest mode: its window IS the rolling N days, so only the forward
   *  fields are offered (taskListQs drops the rest there anyway). */
  digest?: boolean;
  onNavigate: (next: Partial<TaskListParams>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);

  const field = resolveTaskDateField(params.dfield, view);
  const fields = digest
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
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
        >
          {triggerLabel(field, params, monthOptions)}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={cn(dropdownMenuContent, 'min-w-56')}
        >
          <GlassRim />

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
            {!isForwardDateField(field) && monthOptions.length > 0 && (
              <>
                <div className="my-1 border-t border-white/40 dark:border-white/10" />
                {monthOptions.map((option) => (
                  <Row
                    key={option.value}
                    value={option.value}
                    active={activePreset}
                    onSelect={() => selectRange(option.value)}
                  >
                    {option.label}
                  </Row>
                ))}
              </>
            )}
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
              size="small"
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
