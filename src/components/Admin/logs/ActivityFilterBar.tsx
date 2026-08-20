'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown, LuSearch } from 'react-icons/lu';

import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTION_LABELS,
  activityListQs,
  hasActiveActivityFilters,
  type ActivityListParams,
} from '@/lib/activityFilters';
import { INBOX_RANGE_PRESETS } from '@/lib/inboxFilters';
import Button from '@/components/Button';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string; disabled?: boolean };

/** Same row recipe as InboxFilterBar/ExportMenu; radix flags hover AND
 *  keyboard focus. Carried privately here for the same reason it is carried
 *  privately there — see tasks/menu.ts for the per-folder hoist. */
const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10 data-[disabled]:cursor-default data-[disabled]:opacity-50';

const menuContent = cn(
  'relative z-50 min-w-44 p-1.5',
  glassSurface,
  'max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto overscroll-contain',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
);

/**
 * Filters for /admin/logs, on the InboxFilterBar recipe: search debounces at
 * 300 ms, every facet applies the moment it is picked, and the URL stays the
 * whole state (so each view is still bookmarkable and shareable).
 *
 * This screen used to be a plain GET <form> with a "Filter" button — the only
 * bar in the dashboard that needed a click, which members read as broken
 * rather than as deliberate. The <form> shell survives with mirrored hidden
 * inputs purely as pre-hydration insurance: typing and pressing Enter before
 * the JS lands does a real GET and keeps the facets that were already on.
 */
export default function ActivityFilterBar({
  params,
  areas,
  actors,
  basePath,
}: {
  params: ActivityListParams;
  areas: string[];
  actors: { id: string | null; name: string }[];
  basePath: string;
}) {
  const router = useRouter();

  const navigate = useCallback(
    (next: Partial<ActivityListParams>) => {
      // `page` lives INSIDE this params object (unlike inboxListQs/taskListQs,
      // which take it as an argument their bars simply never pass), so it has
      // to be reset by hand — otherwise changing a facet on page 7 lands on an
      // empty page.
      const qs = activityListQs(params, { ...next, page: 1 });
      router.replace(qs ? `${basePath}${qs}` : basePath, { scroll: false });
    },
    [router, basePath, params],
  );

  // --- Search: controlled input, 300 ms debounce (InboxFilterBar recipe).
  const inputRef = useRef<HTMLInputElement>(null);
  const [qValue, setQValue] = useState(params.q);

  // Re-sync when the URL's q changes underneath us (back/forward, Clear) —
  // but never mid-typing, or a landing navigation clobbers newer keystrokes.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQValue(params.q);
  }, [params.q]);

  useEffect(() => {
    // Clamp exactly like parseActivityListParams, or a >100-char query would
    // never equal the truncated value the server hands back and the effect
    // would re-navigate every 300 ms forever (the TaskFilterBar lesson).
    const trimmed = qValue.slice(0, 100).trim();
    if (trimmed === params.q) return;
    const timer = setTimeout(() => navigate({ q: trimmed }), 300);
    return () => clearTimeout(timer);
  }, [qValue, params.q, navigate]);

  // Focus on arrival, `/` from anywhere, Escape to clear then let go — the
  // same grammar as every other bar now that this one is a client island.
  useSearchFocus(inputRef, { onClear: () => setQValue('') });

  const actorOptions: Option[] = actors.map((a) => ({
    // A null actorId is a system/cron row — it has no id to filter by, so it
    // is listed for context but not selectable.
    value: a.id ?? '',
    label: a.name,
    disabled: !a.id,
  }));
  const areaOptions: Option[] = areas.map((a) => ({ value: a, label: a }));
  const actionOptions: Option[] = ACTIVITY_ACTIONS.map((a) => ({
    value: a,
    label: ACTIVITY_ACTION_LABELS[a],
  }));
  const rangeOptions: Option[] = INBOX_RANGE_PRESETS.map((p) => ({
    value: p.token,
    label: p.label,
  }));

  return (
    <div className="border-b border-white/40 dark:border-white/10">
      <form
        method="GET"
        action={basePath}
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4"
      >
        {/* Mirrors of the chip state, so a pre-hydration Enter carries the
            facets that are already on instead of silently clearing them. */}
        {params.actor && (
          <input type="hidden" name="actor" value={params.actor} />
        )}
        {params.area && <input type="hidden" name="area" value={params.area} />}
        {params.action && (
          <input type="hidden" name="action" value={params.action} />
        )}
        {params.range && (
          <input type="hidden" name="range" value={params.range} />
        )}

        <span className="relative w-full sm:w-64">
          <LuSearch
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={qValue}
            onChange={(e) => setQValue(e.target.value)}
            placeholder="Search the log…"
            aria-label="Search activity"
            className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
          />
        </span>

        <FilterSelect
          label="Person"
          allLabel="Anyone"
          value={params.actor}
          options={actorOptions}
          onSelect={(value) => navigate({ actor: value })}
        />
        <FilterSelect
          label="Area"
          allLabel="All areas"
          value={params.area}
          options={areaOptions}
          onSelect={(value) => navigate({ area: value })}
        />
        <FilterSelect
          label="Action"
          allLabel="All actions"
          value={params.action}
          options={actionOptions}
          onSelect={(value) =>
            navigate({ action: value as ActivityListParams['action'] })
          }
        />
        <FilterSelect
          label="Date"
          allLabel="Any time"
          value={params.range}
          options={rangeOptions}
          onSelect={(value) =>
            navigate({ range: value as ActivityListParams['range'] })
          }
        />

        {hasActiveActivityFilters(params) && (
          <Button
            type="button"
            size="small"
            variant="secondary"
            showIcon={false}
            onClick={() => router.replace(basePath, { scroll: false })}
          >
            Clear filters
          </Button>
        )}
      </form>
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
  options: Option[];
  onSelect: (value: string) => void;
}) {
  const active = value ? options.find((o) => o.value === value) : undefined;
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
          className={menuContent}
        >
          <GlassRim />
          <DropdownMenu.Item
            className={cn(menuItem, 'text-foreground')}
            onSelect={() => onSelect('')}
          >
            {!active && <LuCheck aria-hidden="true" className="size-3.5" />}
            {allLabel}
          </DropdownMenu.Item>
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value || option.label}
              disabled={option.disabled}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect(option.value)}
            >
              {option.value === value && (
                <LuCheck aria-hidden="true" className="size-3.5" />
              )}
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
