'use client';

import { useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuSearch, LuX } from 'react-icons/lu';

import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
} from '@/lib/taskFields';
import {
  countActiveTaskFilters,
  hasActiveTaskFilters,
  Q_MAX_LENGTH,
  taskListQs,
  type TaskListParams,
  type TaskView,
  type TaskViewMode,
} from '@/lib/taskFilters';
import type { TaskTagOption, TaskTagType } from '@/lib/taskTagFields';
import Button from '@/components/Button';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import SavedViews, { type SavedView } from './SavedViews';
import TaskDateFilter from './TaskDateFilter';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import { TASK_DEFAULT_SORT } from '@/lib/taskColumns';
import {
  FilterSelect,
  SortMenu,
  TagFilter,
  useTaskNavigate,
  type FilterOption,
} from './FacetMenus';
import type { PickerOption } from './types';

/** Ties the phone's Filters button to the chips it discloses. A constant, not
 *  a useId: one bar renders per page, and a stable value keeps the attribute
 *  readable in the DOM. */
const FILTER_CHIPS_ID = 'task-filter-chips';

/** The combobox's "no filter" row — bare: no initials coin, italic. */
const ALL_CLIENTS: PickerOption = { value: '', label: 'All clients', bare: true };

const PRIORITY_OPTIONS: FilterOption[] = [
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    value: slug,
    label: TASK_PRIORITY_LABELS[slug],
  })),
  // Priority is nullable by design (most routine tasks never need one), so
  // unflagged rows get their own facet — the date facet's "No date" pattern.
  { value: 'none', label: 'No priority' },
];

const GROUP_OPTIONS: FilterOption[] = [
  { value: 'due', label: 'By deadline' },
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
  tagOptions,
  tagTypes,
  scope,
  viewerId,
  savedViews,
  mode,
}: {
  basePath: string;
  view: TaskView;
  params: TaskListParams;
  /** Slug-valued client rows WITH logos — the filter reuses the form combobox
   *  (search beats scanning ~85 rows), minus create-from-filter. */
  clientOptions: PickerOption[];
  categoryOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  /** The vocabulary, ARCHIVED INCLUDED. The facet is unscoped on purpose: a
   *  filter is a question about the whole board, so narrowing it by the
   *  category chip would hide the tag you were looking for the moment the two
   *  disagreed. Archived rows are carried so a bookmarked ?tag= can always
   *  resolve its own name — the withActiveOption rule: a facet that narrows
   *  the list while its chip reads "Tags" is the bug this repo already had
   *  once with months and deleted members. */
  tagOptions: TaskTagOption[];
  tagTypes: TaskTagType[];
  /** Server-derived recent months (value = YYYY-MM) — the date facet's month
   *  list, offered on the backward-looking fields. */
  /** The month the board is about, carried onto every URL this bar writes —
   *  a filter change must never move the reader to a different month. It is
   *  deliberately absent from `currentQs` below: that string is what a saved
   *  view stores, and a view must not pin the month it was saved in. */
  scope: { month: string; currentMonth: string; mode?: TaskViewMode };
  viewerId: string;
  /** This member's saved views plus every shared one. */
  savedViews: SavedView[];
  /** Which rendering this bar sits on, kept in every URL it writes. Only the
   *  list takes a sort and a grouping: the digest is fixed newest-first, and on
   *  the calendar a chip's place is decided by its own date and its urgency
   *  within the day, so neither control would reach anything. */
  mode: TaskViewMode;
}) {
  const navigate = useTaskNavigate(basePath, view, params, scope);

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
    // Clamp exactly like parseTaskListParams: the server hands back a
    // truncated `q`, so comparing the raw input against it would never match
    // for a long query — and the effect would re-navigate every 300 ms forever.
    const trimmed = qValue.trim().slice(0, Q_MAX_LENGTH);
    if (trimmed === params.q) return;
    const timer = setTimeout(() => navigate({ q: trimmed }), 300);
    return () => clearTimeout(timer);
  }, [qValue, params.q, navigate]);

  // `/` from anywhere, Escape to leave, and focus on arrival — but only where
  // the quick-add band isn't the better landing: the board hands the caret to
  // "what did you work on?" unless the member arrived mid-search (a ⌘K
  // handoff) or is on a view that renders no quick-add band at all.
  useSearchFocus(inputRef, {
    autoFocus: mode !== 'list' || params.q !== '',
    onClear: () => setQValue(''),
  });

  const mine = params.assignee === viewerId;
  // The canonical string for what's on screen — the same function that writes
  // every filter URL, so a saved view's stored query and this can be compared
  // by equality rather than by re-parsing.
  const currentQs = taskListQs(view, params, undefined, mode);

  // --- Phone disclosure. Ten chips wrap to three rows on a 390px board, and
  // together with the quick-add band they filled the whole viewport: the first
  // task row landed under the bottom bar, so arriving at the work log showed
  // no work. Below `sm:` the chips fold behind one button; `sm:contents` on
  // their wrapper dissolves it at every width that fits them, so the desktop
  // bar keeps flowing the chips straight after the search box as one wrap
  // context — a real nested flex item there would have taken its own line.
  //
  // Seeded OPEN when the list arrives already narrowed (a saved view, a ⌘K
  // handoff, a bookmarked URL): a filtered board that doesn't say what it is
  // filtered by reads exactly like an empty one. Deliberately an initializer
  // and not an effect — re-opening on every `navigate()` would fight the
  // member who just collapsed it to see their tasks.
  const activeFilters = countActiveTaskFilters(params, view);
  const [filtersOpen, setFiltersOpen] = useState(() => activeFilters > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
      {/* max-sm:* only, so the sm+ box is byte-identical to what it was: on a
          phone the field yields its full width to sit beside the button.
          The floor is load-bearing: `min-w-0` let the field shrink without
          limit, so once Sort and Clear joined this row it would be squeezed to
          a sliver rather than letting them wrap. With a floor the row wraps,
          which is the right answer at 360px: nothing filtered still fits on one
          line, and the wrap only appears when Clear does. */}
      <span className="relative w-full max-sm:w-auto max-sm:min-w-36 max-sm:flex-1 sm:w-56">
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={qValue}
          onChange={(e) => setQValue(e.target.value)}
          placeholder="Search tasks, clients, people…"
          aria-label="Search tasks by title, notes, client, member, category or tag"
          maxLength={Q_MAX_LENGTH}
          className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
        />
      </span>

      {/* The phone's one filter affordance. Carries the count because the
          chips it hides are the only other place an active facet shows, and a
          board narrowed by an invisible filter is the bug this bar exists to
          prevent. `sm:hidden`, so nothing changes for a viewer who can see
          the chips themselves. */}
      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        aria-controls={FILTER_CHIPS_ID}
        className={cn(
          chipClasses(activeFilters > 0),
          'inline-flex shrink-0 items-center gap-1.5 sm:hidden',
        )}
      >
        Filters
        {activeFilters > 0 && (
          <span className="tabular-nums">{activeFilters}</span>
        )}
        <LuChevronDown
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
            filtersOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        id={FILTER_CHIPS_ID}
        className={cn(
          'flex w-full flex-wrap items-center gap-2 sm:contents',
          !filtersOpen && 'max-sm:hidden',
        )}
      >
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
          size="compact"
          narrows
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
          narrows
        />
        <FilterSelect
          label="Member"
          allLabel="Everyone"
          value={params.assignee}
          options={assigneeOptions}
          onSelect={(value) => navigate({ assignee: value })}
          narrows
        />
        <FilterSelect
          label="Priority"
          allLabel="Any priority"
          value={params.priority}
          options={PRIORITY_OPTIONS}
          onSelect={(value) =>
            navigate({ priority: value as TaskListParams['priority'] })
          }
          narrows
        />
        <TagFilter
          tags={tagOptions}
          types={tagTypes}
          value={params.tags}
          mode={params.tagMode}
          onChange={(tags, tagMode) => navigate({ tags, tagMode })}
        />
        {/* One control over four dates. It defaults to the column the current
            tab's rows actually carry — completedAt on Done, dueDate elsewhere —
            so switching tabs re-points the facet instead of stranding it. */}
        <TaskDateFilter
          view={view}
          params={params}
          mode={mode}
          onNavigate={navigate}
        />

        <SavedViews
          views={savedViews}
          basePath={basePath}
          currentQs={currentQs}
          // A bare unfiltered list is the default view — there is nothing to
          // name, and saving it would just be a link to the page you're on.
          canSave={currentQs !== ''}
        />

        {mode === 'list' && (
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
      </div>

      {/* Sort sits OUTSIDE the chip group, and after it. Outside, because that
          group is the "Filters" disclosure on a phone and sort is not one of
          them: it reorders, it never narrows, which is why Clear preserves it
          and the badge ignores it. Being behind a fold labelled with something
          it is not was why members could not find it. After, because the
          filters lead: "Mine" is the first FILTER in the row, and on desktop
          `sm:contents` puts this back beside Group, the other preference. */}
      {mode === 'list' && (
        <SortMenu value={params.sort} onSelect={(sort) => navigate({ sort })} />
      )}

      {/* The two escapes: last in the row, and OUTSIDE the chip group. Outside
          is the load-bearing half. That group is the "Filters" fold on a phone,
          and burying the way out inside the thing you are undoing is what made
          Clear unfindable: `q` counts for hasActiveTaskFilters but NOT for
          countActiveTaskFilters (deliberately, it has its own always-visible
          field), so a search-narrowed board showed an uncounted "Filters" pill,
          left the fold shut, and hid the only control that could undo it.

          Two buttons rather than one that clears both. They are separate
          questions - a member who narrows to one client and sorts by deadline
          may well want the client gone and the order kept - and each says
          exactly what it will do, which one adaptive label cannot.

          They carry the destructive fill and the same near-white ink
          ConfirmDialog gives Delete. That is Saman's call, made twice: the
          house palette is otherwise ink-only and rose means a missed deadline
          on this very board, so this is the one control that spends colour on
          something that is not a deadline and not a deletion. If it ever reads
          as too loud, `variant="secondary"` plus `text-destructive` is the
          quieter form of the same idea, and nothing else has to change. */}
      {hasActiveTaskFilters(params, view) && (
        <Button
          type="button"
          size="compact"
          shimmer={false}
          icon={LuX}
          iconPosition="right"
          background="var(--destructive)"
          className="border-transparent [color:#fafafa]"
          onClick={() => {
            // Grouping and sort are view preferences, not filters (the same
            // reason hasActiveTaskFilters ignores both) — they survive Clear.
            // The month is a scope, not a filter, so Clear keeps it too —
            // clearing filters must never silently move you to another month.
            navigate({ group: params.group, sort: params.sort }, true);
          }}
        >
          Clear filters
        </Button>
      )}

      {mode === 'list' && params.sort !== TASK_DEFAULT_SORT && (
        <Button
          type="button"
          size="compact"
          shimmer={false}
          icon={LuX}
          iconPosition="right"
          background="var(--destructive)"
          className="border-transparent [color:#fafafa]"
          onClick={() => navigate({ sort: TASK_DEFAULT_SORT })}
        >
          Clear sort
        </Button>
      )}
    </div>
  );
}
