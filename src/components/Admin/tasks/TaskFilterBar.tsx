'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import {
  LuArrowDownWideNarrow,
  LuArrowUpNarrowWide,
  LuCalendarClock,
  LuCheck,
  LuChevronDown,
  LuFlag,
  LuSearch,
} from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
} from '@/lib/taskFields';
import {
  hasActiveTaskFilters,
  taskListQs,
  type TaskListParams,
  type TaskSort,
  type TaskView,
} from '@/lib/taskFilters';
import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import { dropdownMenuContent, menuItem } from './menu';
import type { PickerOption, RowAvatar } from './types';

export type FilterOption = {
  value: string;
  label: string;
  /** Member options: server-resolved face (null → initials monogram). */
  avatar?: RowAvatar | null;
};

/** The combobox's "no filter" row — bare: no initials coin, italic. */
const ALL_CLIENTS: PickerOption = { value: '', label: 'All clients', bare: true };

const SORT_CYCLE: TaskSort[] = ['newest', 'oldest', 'due', 'priority'];
const SORT_LABELS: Record<TaskSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  due: 'Due date',
  priority: 'Priority',
};
const SORT_ICONS = {
  newest: LuArrowDownWideNarrow,
  oldest: LuArrowUpNarrowWide,
  due: LuCalendarClock,
  priority: LuFlag,
} as const;

const PRIORITY_OPTIONS: FilterOption[] = TASK_PRIORITY_SLUGS.map((slug) => ({
  value: slug,
  label: TASK_PRIORITY_LABELS[slug],
}));

// The tints already exist on the Dates cell — this is how you see ONLY the
// at-risk rows. Windows resolve server-side against the Vancouver today.
const DUE_OPTIONS: FilterOption[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'This week' },
];

const GROUP_OPTIONS: FilterOption[] = [
  { value: 'client', label: 'By client' },
  { value: 'member', label: 'By member' },
];

/**
 * Search + filter toolbar for /admin/tasks (list AND digest views). Purely
 * URL-state: every change routes through `router.replace` with the canonical
 * query string from taskListQs (which drops `page`, so any change resets
 * pagination). Options arrive as slim {value,label} pairs resolved
 * server-side — slug-valued (URL vocabulary), unlike the form pickers' ids.
 */
export default function TaskFilterBar({
  basePath,
  view,
  params,
  clientOptions,
  categoryOptions,
  assigneeOptions,
  monthOptions,
  viewerId,
  digest,
}: {
  basePath: string;
  view: TaskView;
  params: TaskListParams;
  /** Slug-valued client rows WITH logos — the filter reuses the form combobox
   *  (search beats scanning ~85 rows), minus create-from-filter. */
  clientOptions: PickerOption[];
  categoryOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  /** Server-derived recent months (value = YYYY-MM). Done view only. */
  monthOptions: FilterOption[];
  viewerId: string;
  /** Digest mode: same filters, no sort (fixed newest-first), `view=digest`
   *  kept in every URL this bar writes. */
  digest?: boolean;
}) {
  const router = useRouter();

  const navigate = useCallback(
    (next: Partial<TaskListParams>) => {
      const qs = taskListQs(view, { ...params, ...next }, undefined, digest);
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [router, basePath, view, params, digest],
  );

  // --- Search: controlled input, 300 ms debounce (InboxFilterBar recipe).
  const inputRef = useRef<HTMLInputElement>(null);
  const [qValue, setQValue] = useState(params.q);

  // Re-sync when the URL's q changes underneath us (back/forward, Clear
  // filters) — but never while mid-typing, or a landing navigation would
  // clobber newer keystrokes.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQValue(params.q);
  }, [params.q]);

  useEffect(() => {
    const trimmed = qValue.trim();
    if (trimmed === params.q) return;
    const timer = setTimeout(() => navigate({ q: trimmed }), 300);
    return () => clearTimeout(timer);
  }, [qValue, params.q, navigate]);

  // `/` focuses the search box (same editable-target guard as the table keys).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // Role selectors cover open Radix popups (TaskBoard's guard rule).
      if (
        t &&
        (t.isContentEditable ||
          t.closest(
            'input, textarea, select, a, button, [role="button"], [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="dialog"]',
          ))
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const mine = params.assignee === viewerId;
  const sortNext =
    SORT_CYCLE[(SORT_CYCLE.indexOf(params.sort) + 1) % SORT_CYCLE.length];
  const SortIcon = SORT_ICONS[params.sort];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
      <span className="relative w-full sm:w-56">
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={qValue}
          onChange={(e) => setQValue(e.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="h-8 w-full rounded-lg border border-white/50 bg-white/40 pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30"
        />
      </span>

      {/* One-tap "just my tasks" — writes the viewer's real id so the URL
          stays shareable and deterministic. */}
      <label className={chipClasses(mine)}>
        <input
          type="checkbox"
          checked={mine}
          onChange={() => navigate({ assignee: mine ? '' : viewerId })}
          className="sr-only"
        />
        Mine
      </label>

      <ClientCombobox
        value={params.client}
        valueLabel={
          clientOptions.find((o) => o.value === params.client)?.label ?? null
        }
        options={[ALL_CLIENTS, ...clientOptions]}
        allowInternal={false}
        onSelect={(option) => navigate({ client: option.value })}
      />
      <FilterSelect
        label="Category"
        allLabel="All categories"
        value={params.category}
        options={categoryOptions}
        onSelect={(value) => navigate({ category: value })}
      />
      <FilterSelect
        label="Member"
        allLabel="Everyone"
        value={params.assignee}
        options={assigneeOptions}
        onSelect={(value) => navigate({ assignee: value })}
      />
      <FilterSelect
        label="Priority"
        allLabel="Any priority"
        value={params.priority}
        options={PRIORITY_OPTIONS}
        onSelect={(value) =>
          navigate({ priority: value as TaskListParams['priority'] })
        }
      />
      <FilterSelect
        label="Due"
        allLabel="Any due date"
        value={params.due}
        options={DUE_OPTIONS}
        onSelect={(value) =>
          navigate({ due: value as TaskListParams['due'] })
        }
      />
      {view === 'done' && !digest && (
        <FilterSelect
          label="Month"
          allLabel="Any month"
          value={params.month}
          options={monthOptions}
          onSelect={(value) => navigate({ month: value })}
        />
      )}

      {!digest && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={SortIcon}
          iconPosition="left"
          aria-label={`Sort: ${SORT_LABELS[params.sort]} — switch to ${SORT_LABELS[sortNext]}`}
          onClick={() => navigate({ sort: sortNext })}
        >
          {SORT_LABELS[params.sort]}
        </Button>
      )}

      {!digest && (
        <FilterSelect
          label="Group"
          allLabel="No grouping"
          value={params.group}
          options={GROUP_OPTIONS}
          onSelect={(value) =>
            navigate({ group: value as TaskListParams['group'] })
          }
        />
      )}

      {hasActiveTaskFilters(params) && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          showIcon={false}
          onClick={() => {
            // Grouping is a view preference, not a filter — it survives Clear.
            const qs = taskListQs(view, { group: params.group }, undefined, digest);
            router.replace(qs ? `${basePath}?${qs}` : basePath, {
              scroll: false,
            });
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onSelect,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
}) {
  const active = options.find((o) => o.value === value);
  // Member options carry a face (possibly null → initials); when any row has
  // one, the "All" row gets a matching spacer so labels stay aligned.
  const hasAvatars = options.some((o) => o.avatar !== undefined);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
        >
          {active ? active.label : label}
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
          {/* RadioGroup so AT hears the active facet (aria-checked) — the
              "All" row is value='' inside the same group. The check/spacer
              pair keeps the visual alignment (CellSelectMenu rule). */}
          <DropdownMenu.RadioGroup value={value}>
            <DropdownMenu.RadioItem
              value=""
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect('')}
            >
              {!active ? (
                <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {hasAvatars && (
                <span className="size-5 shrink-0" aria-hidden="true" />
              )}
              {allLabel}
            </DropdownMenu.RadioItem>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => onSelect(option.value)}
              >
                {option.value === value ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {option.avatar !== undefined && (
                  <AdminAvatar
                    name={option.label}
                    size={20}
                    {...(option.avatar ?? {})}
                  />
                )}
                <span className="truncate">{option.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
