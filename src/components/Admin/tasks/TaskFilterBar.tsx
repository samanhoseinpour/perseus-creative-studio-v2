'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import type { IconType } from 'react-icons';
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
  isUntaggedFilter,
  Q_MAX_LENGTH,
  taskListQs,
  type TaskListParams,
  type TaskSort,
  type TaskView,
} from '@/lib/taskFilters';
import {
  groupTags,
  TASK_TAG_GROUP_LABELS,
  TASK_TAG_MAX_IN_FILTER,
  tagSummaryLabel,
  UNTAGGED,
  type TaskTagOption,
} from '@/lib/taskTagFields';
import Button from '@/components/Button';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import SavedViews, { type SavedView } from './SavedViews';
import TaskTagChip from './TaskTagChip';
import TaskDateFilter from './TaskDateFilter';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import { dropdownMenuContent, menuItem } from './menu';
import type { PickerOption, RowAvatar } from './types';

export type FilterOption = {
  value: string;
  label: string;
  /** Member options: server-resolved face (null → initials monogram). */
  avatar?: RowAvatar | null;
  /** Sort options: per-option glyph beside the label. */
  icon?: IconType;
};

/** The combobox's "no filter" row — bare: no initials coin, italic. */
const ALL_CLIENTS: PickerOption = { value: '', label: 'All clients', bare: true };

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
const SORT_OPTIONS: FilterOption[] = (
  ['newest', 'oldest', 'due', 'priority'] satisfies TaskSort[]
).map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
  icon: SORT_ICONS[sort],
}));

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
  monthOptions,
  viewerId,
  savedViews,
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
  /** The vocabulary, ARCHIVED INCLUDED. The facet is unscoped on purpose: a
   *  filter is a question about the whole board, so narrowing it by the
   *  category chip would hide the tag you were looking for the moment the two
   *  disagreed. Archived rows are carried so a bookmarked ?tag= can always
   *  resolve its own name — the withActiveOption rule: a facet that narrows
   *  the list while its chip reads "Tags" is the bug this repo already had
   *  once with months and deleted members. */
  tagOptions: TaskTagOption[];
  /** Server-derived recent months (value = YYYY-MM) — the date facet's month
   *  list, offered on the backward-looking fields. */
  monthOptions: FilterOption[];
  viewerId: string;
  /** This member's saved views plus every shared one. */
  savedViews: SavedView[];
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
  // handoff) or is in digest mode, which renders no quick-add at all.
  useSearchFocus(inputRef, {
    autoFocus: Boolean(digest) || params.q !== '',
    onClear: () => setQValue(''),
  });

  const mine = params.assignee === viewerId;
  // The canonical string for what's on screen — the same function that writes
  // every filter URL, so a saved view's stored query and this can be compared
  // by equality rather than by re-parsing.
  const currentQs = taskListQs(view, params, undefined, digest);

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
          placeholder="Search title or notes"
          aria-label="Search tasks by title or notes"
          maxLength={Q_MAX_LENGTH}
          className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
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
      <TagFilter
        tags={tagOptions}
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
        monthOptions={monthOptions}
        digest={digest}
        onNavigate={navigate}
      />

      {/* No allLabel: sort always has an active value ('newest' is a real
          default, not "no filter"). */}
      {!digest && (
        <FilterSelect
          label="Sort"
          value={params.sort}
          options={SORT_OPTIONS}
          onSelect={(value) => navigate({ sort: value as TaskSort })}
        />
      )}

      <SavedViews
        views={savedViews}
        basePath={basePath}
        currentQs={currentQs}
        // A bare unfiltered list is the default view — there is nothing to
        // name, and saving it would just be a link to the page you're on.
        canSave={currentQs !== ''}
      />

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

      {hasActiveTaskFilters(params, view) && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          showIcon={false}
          onClick={() => {
            // Grouping and sort are view preferences, not filters (the same
            // reason hasActiveTaskFilters ignores both) — they survive Clear.
            const qs = taskListQs(
              view,
              { group: params.group, sort: params.sort },
              undefined,
              digest,
            );
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
  /** Omit for always-active facets (Sort) — no "All" row is rendered. */
  allLabel?: string;
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
            {allLabel !== undefined && (
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
            )}
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
                {option.icon && (
                  <option.icon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground"
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

/**
 * The tag facet — the bar's only MULTI-select, so it is a checkbox menu
 * rather than a FilterSelect radio group. Three things it has to get right:
 *
 *  - "Untagged" is exclusive. Ticking it drops every other choice, because
 *    "has no tags" and "has this tag" cannot both be true (the parser
 *    enforces the same rule, so a hand-typed URL agrees with the menu).
 *  - "Match all" only appears once two tags are picked, since with one it
 *    means exactly what "match any" already means.
 *  - Picks apply on change, like every other bar in the dashboard (the
 *    /admin/logs lesson: a menu that needs a submit button reads as broken).
 */
function TagFilter({
  tags,
  value,
  mode,
  onChange,
}: {
  tags: TaskTagOption[];
  value: string[];
  mode: 'any' | 'all';
  onChange: (tags: string[], mode: 'any' | 'all') => void;
}) {
  const untagged = isUntaggedFilter(value);
  const picked = new Set(value);
  // Names resolve from the WHOLE vocabulary so the trigger can always say
  // what it is filtering by; the MENU hides archived rows unless one is
  // already picked, since offering retired tags is just noise.
  const names = tags.filter((t) => picked.has(t.slug)).map((t) => t.name);
  const listed = tags.filter((t) => !t.archived || picked.has(t.slug));
  const label = untagged ? 'Untagged' : tagSummaryLabel(names, 'Tags');
  const active = value.length > 0;

  function toggle(slug: string) {
    if (picked.has(slug)) {
      onChange(
        value.filter((s) => s !== slug),
        mode,
      );
      return;
    }
    // Adding a real tag clears the untagged sentinel; the cap mirrors the
    // parser's, so the menu can never build a URL the parser would truncate.
    const next = (untagged ? [] : value).concat(slug);
    if (next.length > TASK_TAG_MAX_IN_FILTER) return;
    onChange(next, mode);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
          className="max-w-48"
        >
          <span className="truncate">
            {label}
            {!untagged && value.length > 1 && mode === 'all' ? ' · all' : ''}
          </span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={cn(dropdownMenuContent, 'w-64')}
        >
          <GlassRim />
          <DropdownMenu.CheckboxItem
            checked={untagged}
            // Radix closes on select by default; a multi-select menu must
            // stay open or every tick costs another trip to the trigger.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(next) => onChange(next ? [UNTAGGED] : [], 'any')}
            className={cn(menuItem, 'text-foreground')}
          >
            <CheckBox on={untagged} />
            <span className="italic text-muted-foreground">Untagged</span>
          </DropdownMenu.CheckboxItem>

          {groupTags(listed).map((section) => (
            <DropdownMenu.Group key={section.group}>
              <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {TASK_TAG_GROUP_LABELS[section.group]}
              </DropdownMenu.Label>
              {section.tags.map((tag) => {
                const on = !untagged && picked.has(tag.slug);
                return (
                  <DropdownMenu.CheckboxItem
                    key={tag.id}
                    checked={on}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggle(tag.slug)}
                    className={cn(menuItem, 'text-foreground')}
                  >
                    <CheckBox on={on} />
                    <TaskTagChip tag={tag} />
                    {tag.archived && (
                      <span className="ml-auto shrink-0 pl-2 text-[0.6rem] text-muted-foreground">
                        archived
                      </span>
                    )}
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Group>
          ))}

          {!untagged && value.length > 1 && (
            <DropdownMenu.CheckboxItem
              checked={mode === 'all'}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(next) => onChange(value, next ? 'all' : 'any')}
              className={cn(
                menuItem,
                'mt-1 border-t border-white/40 text-foreground dark:border-white/10',
              )}
            >
              <CheckBox on={mode === 'all'} />
              Match all of them
            </DropdownMenu.CheckboxItem>
          )}

          {active && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-muted-foreground')}
              onSelect={() => onChange([], 'any')}
            >
              <span className="size-3.5 shrink-0" aria-hidden="true" />
              Clear tags
            </DropdownMenu.Item>
          )}

          {listed.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No tags yet.
            </p>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The picker's tick box, shared by every row of the tag menu so the labels
 *  stay aligned whether or not anything is checked (the CellSelectMenu rule,
 *  which the radio menus above solve with a check/spacer pair). */
function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        on
          ? 'border-transparent bg-foreground text-background'
          : 'border-foreground/30',
      )}
    >
      {on && <LuCheck className="size-2.5" />}
    </span>
  );
}

