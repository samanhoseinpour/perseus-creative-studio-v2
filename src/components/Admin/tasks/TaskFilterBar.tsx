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
import { GlassRim } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

export type FilterOption = { value: string; label: string };

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
  clientOptions: FilterOption[];
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

      <FilterSelect
        label="Client"
        allLabel="All clients"
        value={params.client}
        options={clientOptions}
        onSelect={(value) => navigate({ client: value })}
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

      {hasActiveTaskFilters(params) && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          showIcon={false}
          onClick={() => {
            const qs = taskListQs(view, {}, undefined, digest);
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
              "All" row is value='' inside the same group. */}
          <DropdownMenu.RadioGroup value={value}>
            <DropdownMenu.RadioItem
              value=""
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect('')}
            >
              {!active && <LuCheck aria-hidden="true" className="size-3.5" />}
              {allLabel}
            </DropdownMenu.RadioItem>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => onSelect(option.value)}
              >
                {option.value === value && (
                  <LuCheck aria-hidden="true" className="size-3.5" />
                )}
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
