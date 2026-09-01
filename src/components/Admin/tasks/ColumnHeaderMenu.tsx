// No 'use client' directive on purpose: a leaf of the client TaskBoard entry.
import { LuArrowDown, LuArrowUp, LuChevronDown } from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
} from '@/lib/taskFields';
import {
  columnForSort,
  TASK_COLUMN_LABELS,
  TASK_COLUMN_SORTS,
  TASK_DEFAULT_SORT,
  TASK_SORT_DIRECTION,
  type TaskColumn,
} from '@/lib/taskColumns';
import type {
  TaskListParams,
  TaskSort,
  TaskView,
  TaskViewMode,
} from '@/lib/taskFilters';
import type { TaskTagOption, TaskTagType } from '@/lib/taskTagFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import ClientCombobox from './ClientCombobox';
import TaskDateFilter from './TaskDateFilter';
import {
  FilterSelect,
  SortClearRow,
  SortRows,
  TagFilter,
  type FilterOption,
} from './FacetMenus';
import { dropdownMenuContent } from './menu';
import { cn } from '@/lib/utils';
import type { PickerOption } from './types';

/**
 * A column header that does what it looks like it does.
 *
 * Members read the eleven labels above the table as buttons and tried to click
 * them, which is the whole reason this exists. Each one opens ONE menu: the
 * orders that column offers, then that column's own filter underneath.
 *
 * The filter half is not a new control. It is the SAME component the Filters
 * bar mounts, handed a different trigger and a block to render above its
 * options, so the two doors cannot answer differently. What a column offers is
 * decided in taskColumns.ts, not here: Tags and Member carry a filter and no
 * sort (a task has several of each, so ordering by "the first one
 * alphabetically" would be an answer to a question nobody asked), while Task,
 * Status and Time carry a sort and no filter (the search box, the status tabs
 * and nothing at all, respectively, already are those filters).
 */

/** Everything the header menus need to draw their filter halves — the same
 *  arrays the Filters bar already receives, passed by reference, so the second
 *  mount costs a reference in the payload rather than a second copy. */
export type ColumnFacets = {
  clientOptions: PickerOption[];
  categoryOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  tagOptions: TaskTagOption[];
  tagTypes: TaskTagType[];
};

const ALL_CLIENTS: PickerOption = { value: '', label: 'All clients', bare: true };

const PRIORITY_OPTIONS: FilterOption[] = [
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    value: slug,
    label: TASK_PRIORITY_LABELS[slug],
  })),
  { value: 'none', label: 'No priority' },
];

/**
 * The clickable label. It looks exactly like the static header did until you
 * point at it: the chevron fades in on hover and focus (the in-cell editors'
 * `cellTrigger` grammar), and the arrow appears only on the column actually
 * sorting, so the resting table is as quiet as it was.
 */
function HeaderTrigger({
  label,
  sort,
  align = 'start',
  className,
  ...rest
}: {
  label: string;
  /** The active order, when it belongs to THIS column. */
  sort: TaskSort | null;
  align?: 'start' | 'end';
} & React.ComponentPropsWithoutRef<'button'>) {
  const Arrow =
    sort && TASK_SORT_DIRECTION[sort] === 'ascending' ? LuArrowUp : LuArrowDown;
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        // `uppercase` is repeated from the cell, and it is the ONE typography
        // class that has to be: Tailwind's preflight re-inherits `font`,
        // `letter-spacing` and `color` on a form control but NOT
        // `text-transform` (it appears nowhere in preflight.css), so the
        // browser's own `button { text-transform: none }` wins and the label
        // renders as "Task" rather than "TASK". Size, weight and tracking all
        // survive on their own, so they are deliberately NOT restated here.
        'uppercase',
        // No `max-w-full`: the table is auto-layout, so a percentage max-width
        // on the cell's content clamps that cell's min-content contribution
        // (the TASK_TAG_STRIP_MAX mechanism, used there on purpose and wrong
        // here). With the arrow now sharing the cell it made "PRIORITY" render
        // as "PRIOR...". The label is one short word, so letting the column
        // size to it costs nothing.
        'group/th -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
        'hover:text-foreground focus-visible:text-foreground focus-visible:outline-none',
        'focus-visible:ring-1 focus-visible:ring-foreground/30',
        sort && 'text-foreground',
        align === 'end' && 'flex-row-reverse',
        // Merged, not overwritten: `{...rest}` spreads before this, so an
        // incoming className would otherwise be dropped on the floor.
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {sort ? (
        <Arrow aria-hidden="true" className="size-3 shrink-0" />
      ) : (
        <LuChevronDown
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 opacity-0 transition-opacity',
            'group-hover/th:opacity-60 group-focus-visible/th:opacity-60',
          )}
        />
      )}
    </button>
  );
}

/** Sorts with no filter under them: their own small menu. */
function SortOnlyMenu({
  trigger,
  value,
  sorts,
  onSelect,
  onClear,
  align,
}: {
  trigger: React.ReactElement;
  value: TaskSort;
  sorts: readonly TaskSort[];
  onSelect: (sort: TaskSort) => void;
  onClear?: () => void;
  align: 'start' | 'end';
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          <DropdownMenu.RadioGroup value={value}>
            <SortRows value={value} sorts={sorts} onSelect={onSelect} />
          </DropdownMenu.RadioGroup>
          {onClear && <SortClearRow onClear={onClear} />}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** A hairline between the orders and the filter under them. */
function SortSection({
  value,
  sorts,
  onSelect,
  onClear,
  variant,
}: {
  value: TaskSort;
  sorts: readonly TaskSort[];
  onSelect: (sort: TaskSort) => void;
  /** Offered only while THIS column owns the board's order. On a heading that
   *  is not sorting anything, a clear would undo somebody else's column. */
  onClear?: () => void;
  variant?: 'menu' | 'plain';
}) {
  if (sorts.length === 0) return null;
  const rows = (
    <SortRows
      value={value}
      sorts={sorts}
      onSelect={onSelect}
      variant={variant}
    />
  );
  return (
    <div className="mb-1 border-b border-white/40 pb-1 dark:border-white/10">
      {variant === 'plain' ? (
        rows
      ) : (
        <DropdownMenu.RadioGroup value={value}>{rows}</DropdownMenu.RadioGroup>
      )}
      {onClear && <SortClearRow onClear={onClear} variant={variant} />}
    </div>
  );
}

export default function TaskColumnHeader({
  column,
  params,
  view,
  mode,
  facets,
  navigate,
  className,
  align = 'start',
  children,
}: {
  column: TaskColumn;
  params: TaskListParams;
  view: TaskView;
  mode: TaskViewMode;
  facets: ColumnFacets;
  navigate: (next: Partial<TaskListParams>) => void;
  className?: string;
  align?: 'start' | 'end';
  /** Anything the cell says beyond its label, e.g. Time's sr-only gloss. */
  children?: React.ReactNode;
}) {
  const sorts = TASK_COLUMN_SORTS[column];
  const active = columnForSort(params.sort) === column ? params.sort : null;
  const onSort = (sort: TaskSort) => navigate({ sort });
  const onClearSort = active
    ? () => navigate({ sort: TASK_DEFAULT_SORT })
    : undefined;
  const label = TASK_COLUMN_LABELS[column];
  const trigger = (
    <HeaderTrigger label={label} sort={active} align={align} />
  );
  const leadingMenu = (
    <SortSection
      value={params.sort}
      sorts={sorts}
      onSelect={onSort}
      onClear={onClearSort}
    />
  );

  const control = (() => {
    switch (column) {
      case 'client':
        return (
          <ClientCombobox
            size="compact"
            value={params.client}
            valueLabel={
              facets.clientOptions.find((o) => o.value === params.client)
                ?.label ?? null
            }
            options={[ALL_CLIENTS, ...facets.clientOptions]}
            allowInternal={false}
            onSelect={(option) => navigate({ client: option.value })}
            trigger={trigger}
            // The client panel is a Popover, so its rows are buttons rather
            // than menu items — the one place the two renderings differ.
            leading={
              <SortSection
                value={params.sort}
                sorts={sorts}
                onSelect={onSort}
                onClear={onClearSort}
                variant="plain"
              />
            }
          />
        );
      case 'category':
        return (
          <FilterSelect
            label={label}
            allLabel="All categories"
            value={params.category}
            options={facets.categoryOptions}
            onSelect={(value) => navigate({ category: value })}
            trigger={trigger}
            leading={leadingMenu}
          />
        );
      case 'member':
        return (
          <FilterSelect
            label={label}
            allLabel="Everyone"
            value={params.assignee}
            options={facets.assigneeOptions}
            onSelect={(value) => navigate({ assignee: value })}
            trigger={trigger}
          />
        );
      case 'tags':
        return (
          <TagFilter
            tags={facets.tagOptions}
            types={facets.tagTypes}
            value={params.tags}
            mode={params.tagMode}
            onChange={(tags, tagMode) => navigate({ tags, tagMode })}
            trigger={trigger}
          />
        );
      case 'priority':
        return (
          <FilterSelect
            label={label}
            allLabel="Any priority"
            value={params.priority}
            options={PRIORITY_OPTIONS}
            onSelect={(value) =>
              navigate({ priority: value as TaskListParams['priority'] })
            }
            trigger={trigger}
            leading={leadingMenu}
          />
        );
      case 'dates':
        return (
          <TaskDateFilter
            view={view}
            params={params}
            mode={mode}
            onNavigate={navigate}
            trigger={trigger}
            leading={leadingMenu}
          />
        );
      default:
        return (
          <SortOnlyMenu
            trigger={trigger}
            value={params.sort}
            sorts={sorts}
            onSelect={onSort}
            onClear={onClearSort}
            align={align}
          />
        );
    }
  })();

  return (
    <th
      scope="col"
      // Only ever set where a sort is on offer: announcing "none" on a column
      // that cannot be sorted tells a screen reader the table sorts by it and
      // currently is not.
      aria-sort={
        sorts.length === 0 ? undefined : active ? TASK_SORT_DIRECTION[active] : 'none'
      }
      className={className}
    >
      {control}
      {children}
    </th>
  );
}
