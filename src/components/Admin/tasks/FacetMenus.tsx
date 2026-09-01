'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuChevronDown,
  LuX,
} from 'react-icons/lu';

import {
  isUntaggedFilter,
  taskScopeQs,
  type TaskSort,
  type TaskListParams,
  type TaskView,
  type TaskViewMode,
} from '@/lib/taskFilters';
import {
  sectionTags,
  TASK_TAG_MAX_IN_FILTER,
  tagSummaryLabel,
  UNTAGGED,
  type TaskTagOption,
  type TaskTagType,
} from '@/lib/taskTagFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import {
  taskSortLabel,
  TASK_COLUMN_LABELS,
  TASK_DEFAULT_SORT,
  TASK_SORT_DIRECTION,
  TASK_SORT_SECTIONS,
  TASK_SORT_SHORT_LABELS,
} from '@/lib/taskColumns';
import TaskTagChip from './TaskTagChip';
import { dropdownMenuContent, menuItem } from './menu';
import { cn } from '@/lib/utils';
import type { RowAvatar } from './types';

/**
 * The task board's facet menus, and the one function that writes a filter URL.
 *
 * They live here rather than inside TaskFilterBar because the bar is no longer
 * the only place they are mounted: each one also opens from its own column
 * header on the table, with a different trigger and a sort section above it.
 * Two copies would drift, and a facet that answers differently depending on
 * which door you opened is worse than a facet with only one door.
 *
 * That is the whole shape of `trigger` and `leading`: the caller supplies the
 * thing you click and the block above the options, and the OPTIONS, their
 * semantics and their keyboard behaviour stay defined once.
 */

export type FilterOption = {
  value: string;
  label: string;
  /** Member options: server-resolved face (null → initials monogram). */
  avatar?: RowAvatar | null;
  /** Sort options: per-option glyph beside the label. */
  icon?: IconType;
};

/**
 * Writes a filter change to the URL, carrying the month scope and the view
 * mode with it. Every control on the board routes through this: the bar, the
 * column headers, and Clear. `router.replace` rather than push, because a
 * filter is a restatement of where you already are, not a place you go back
 * from one facet at a time.
 *
 * `replaceAll` is what lets Clear come through the same door instead of
 * keeping a router of its own: clearing is the one change expressed by what it
 * DROPS, so it hands over the whole next state rather than a patch over the
 * current one.
 */
export function useTaskNavigate(
  basePath: string,
  view: TaskView,
  params: TaskListParams,
  scope: { month: string; currentMonth: string; mode?: TaskViewMode },
) {
  const router = useRouter();
  return useCallback(
    (next: Partial<TaskListParams>, replaceAll = false) => {
      const qs = taskScopeQs(
        view,
        replaceAll ? next : { ...params, ...next },
        scope,
      );
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [router, basePath, view, params, scope],
  );
}

export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onSelect,
  trigger,
  leading,
  narrows,
}: {
  label: string;
  /** Omit for always-active facets (Sort) — no "All" row is rendered. */
  allLabel?: string;
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
  trigger?: React.ReactElement;
  leading?: React.ReactNode;
  /** True when a value here NARROWS the board, which is what earns the ink.
   *  Group sets a value too and stays quiet, because it reorders rather than
   *  narrows — the same line hasActiveTaskFilters and "Clear filters" draw. */
  narrows?: boolean;
}) {
  const active = options.find((o) => o.value === value);
  // Member options carry a face (possibly null → initials); when any row has
  // one, the "All" row gets a matching spacer so labels stay aligned.
  const hasAvatars = options.some((o) => o.avatar !== undefined);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="compact"
            variant={narrows && active ? 'primary' : 'secondary'}
            icon={LuChevronDown}
            iconPosition="right"
          >
            {active ? active.label : label}
          </Button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          {leading}
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
export function TagFilter({
  tags,
  types,
  value,
  mode,
  onChange,
  trigger,
  leading,
}: {
  tags: TaskTagOption[];
  types: TaskTagType[];
  value: string[];
  mode: 'any' | 'all';
  onChange: (tags: string[], mode: 'any' | 'all') => void;
  trigger?: React.ReactElement;
  leading?: React.ReactNode;
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
        {trigger ?? (
          <Button
            type="button"
            size="compact"
            // Tags only ever narrow, so `active` is the whole question here.
            variant={active ? 'primary' : 'secondary'}
            icon={LuChevronDown}
            iconPosition="right"
            className="max-w-48"
          >
            <span className="truncate">
              {label}
              {!untagged && value.length > 1 && mode === 'all' ? ' · all' : ''}
            </span>
          </Button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={cn(dropdownMenuContent, 'w-64')}
        >
          <GlassRim />
          {leading}
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

          {sectionTags(listed, types).map((section) => (
            <DropdownMenu.Group key={section.type.id}>
              <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {section.type.name}
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

/**
 * The rows that pick an order, wherever an order is picked: the Sort chip on
 * the bar, and every column header on the table.
 *
 * Two renderings, one definition. Inside a DropdownMenu they are Radix radio
 * items, so arrow keys and `aria-checked` work as they do in every other menu
 * here; inside a Popover (the client combobox, the date filter) Radix's menu
 * items do not exist, so they are plain buttons carrying the same role by
 * hand. The alternative was a second copy of the labels and the navigation for
 * the popover columns, which is how a header and a chip end up naming one
 * order two ways.
 */
export function SortRows({
  value,
  sorts,
  onSelect,
  variant = 'menu',
}: {
  value: TaskSort;
  sorts: readonly TaskSort[];
  onSelect: (sort: TaskSort) => void;
  variant?: 'menu' | 'plain';
}) {
  return (
    <>
      {sorts.map((sort) => {
        const on = sort === value;
        const Arrow =
          TASK_SORT_DIRECTION[sort] === 'ascending' ? LuArrowUp : LuArrowDown;
        const body = (
          <>
            {on ? (
              <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
            ) : (
              <span className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <Arrow
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{TASK_SORT_SHORT_LABELS[sort]}</span>
          </>
        );
        return variant === 'menu' ? (
          <DropdownMenu.RadioItem
            key={sort}
            value={sort}
            className={cn(menuItem, 'text-foreground')}
            onSelect={() => onSelect(sort)}
          >
            {body}
          </DropdownMenu.RadioItem>
        ) : (
          <button
            key={sort}
            type="button"
            role="menuitemradio"
            aria-checked={on}
            className={cn(menuItem, 'w-full text-left text-foreground')}
            onClick={() => onSelect(sort)}
          >
            {body}
          </button>
        );
      })}
    </>
  );
}

/**
 * The way back to the board's own order, offered wherever an order is picked.
 *
 * It exists because "Clear filters" deliberately does NOT reset the sort (it is
 * a preference, not a filter, and a member who sorted on purpose should not
 * lose it when they clear a client). That rule is right, but it left sorting
 * with no visible undo at all: pick "High first" from the Priority heading and
 * the only way back was to know that "Newest" in another menu is the default.
 * So the escape lives next to the thing it undoes.
 */
export function SortClearRow({
  onClear,
  variant = 'menu',
}: {
  onClear: () => void;
  variant?: 'menu' | 'plain';
}) {
  const body = (
    <>
      <LuX aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">Clear sort</span>
    </>
  );
  const className = cn(
    menuItem,
    'mt-1 border-t border-white/40 text-muted-foreground dark:border-white/10',
  );
  return variant === 'menu' ? (
    <DropdownMenu.Item className={className} onSelect={onClear}>
      {body}
    </DropdownMenu.Item>
  ) : (
    <button type="button" className={cn(className, 'w-full text-left')} onClick={onClear}>
      {body}
    </button>
  );
}

/**
 * The bar's Sort chip. Sectioned by column, because the vocabulary is one row
 * per direction per column and sixteen flat rows read as a list to search
 * rather than a handful of columns to pick from. The board's own two orders
 * lead, having no column to sit under.
 */
export function SortMenu({
  value,
  onSelect,
}: {
  value: TaskSort;
  onSelect: (sort: TaskSort) => void;
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
          className="max-w-52"
        >
          <span className="truncate">{taskSortLabel(value)}</span>
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
          <DropdownMenu.RadioGroup value={value}>
            {TASK_SORT_SECTIONS.map((section) => (
              <DropdownMenu.Group key={section.column ?? 'board'}>
                {section.column && (
                  <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    {TASK_COLUMN_LABELS[section.column]}
                  </DropdownMenu.Label>
                )}
                <SortRows
                  value={value}
                  sorts={section.sorts}
                  onSelect={onSelect}
                />
              </DropdownMenu.Group>
            ))}
          </DropdownMenu.RadioGroup>
          {value !== TASK_DEFAULT_SORT && (
            <SortClearRow onClear={() => onSelect(TASK_DEFAULT_SORT)} />
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
