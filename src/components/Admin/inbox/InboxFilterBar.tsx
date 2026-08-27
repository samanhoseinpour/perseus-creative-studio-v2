'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import {
  LuArrowDownWideNarrow,
  LuArrowUpNarrowWide,
  LuCheck,
  LuChevronDown,
  LuSearch,
} from 'react-icons/lu';

import type { InboxView } from '@/db/adminQueries';
import {
  INBOX_RANGE_PRESETS,
  hasActiveInboxFilters,
  inboxListQs,
  type InboxListParams,
} from '@/lib/inboxFilters';
import Button from '@/components/Button';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { GlassRim } from '@/components/Admin/Glass';
import { dropdownMenuContent as menuContent, menuItem } from '@/components/Admin/menu';
import { cn } from '@/lib/utils';

export type FilterOption = { value: string; label: string };

const dateInput =
  'h-8 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2 text-xs text-foreground outline-none';

/**
 * Search + filter toolbar for the inbox lists. Purely URL-state: every change
 * routes through `router.replace` with the canonical query string from
 * inboxListQs (which drops `page`, so any change resets pagination). Options
 * arrive as slim {value,label} pairs resolved server-side — this file must
 * never import services.ts or the DB-backed careers store (chunk hygiene).
 */
export default function InboxFilterBar({
  basePath,
  view,
  params,
  facetParam,
  facetLabel,
  facetOptions,
  sourceOptions,
  searchPlaceholder,
}: {
  basePath: string;
  view: InboxView;
  params: InboxListParams;
  facetParam: 'service' | 'role';
  facetLabel: string;
  facetOptions: FilterOption[];
  sourceOptions: FilterOption[];
  searchPlaceholder: string;
}) {
  const router = useRouter();

  const navigate = useCallback(
    (next: Partial<InboxListParams>) => {
      const qs = inboxListQs(view, { ...params, ...next });
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [router, basePath, view, params],
  );

  // --- Search: controlled input, 300 ms debounce (CommandPalette precedent).
  const inputRef = useRef<HTMLInputElement>(null);
  const [qValue, setQValue] = useState(params.q);

  // Re-sync when the URL's q changes underneath us (back/forward, Clear
  // filters) — but never while the admin is mid-typing, or a landing
  // navigation would clobber their newer keystrokes.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQValue(params.q);
  }, [params.q]);

  useEffect(() => {
    const trimmed = qValue.trim();
    if (trimmed === params.q) return;
    const timer = setTimeout(() => navigate({ q: trimmed }), 300);
    return () => clearTimeout(timer);
  }, [qValue, params.q, navigate]);

  // Focus on arrival, `/` from anywhere, Escape to hand the keyboard back to
  // the list's j/k triage — which a focused search box would otherwise mute.
  useSearchFocus(inputRef, { onClear: () => setQValue('') });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
      <span className="relative w-full sm:w-64">
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={qValue}
          onChange={(e) => setQValue(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
        />
      </span>

      <FilterSelect
        label={facetLabel}
        allLabel={`All ${facetLabel.toLowerCase()}s`}
        value={facetParam === 'service' ? params.service : params.role}
        options={facetOptions}
        onSelect={(value) => navigate({ [facetParam]: value })}
      />
      <FilterSelect
        label="Source"
        allLabel="All sources"
        value={params.source}
        options={sourceOptions}
        onSelect={(value) => navigate({ source: value })}
      />
      <DateSelect params={params} onNavigate={navigate} />

      <Button
        type="button"
        size="compact"
        variant="secondary"
        icon={params.sort === 'oldest' ? LuArrowUpNarrowWide : LuArrowDownWideNarrow}
        iconPosition="left"
        onClick={() =>
          navigate({ sort: params.sort === 'oldest' ? 'newest' : 'oldest' })
        }
      >
        {params.sort === 'oldest' ? 'Oldest' : 'Newest'}
      </Button>

      {hasActiveInboxFilters(params) && (
        <Button
          type="button"
          size="compact"
          variant="secondary"
          showIcon={false}
          onClick={() =>
            router.replace(
              view === 'inbox' ? basePath : `${basePath}?status=${view}`,
              { scroll: false },
            )
          }
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
          size="compact"
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
              key={option.value}
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

function DateSelect({
  params,
  onNavigate,
}: {
  params: InboxListParams;
  onNavigate: (next: Partial<InboxListParams>) => void;
}) {
  // Controlled so opening re-seeds the custom inputs from the URL.
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);

  const activePreset = INBOX_RANGE_PRESETS.find((p) => p.token === params.range);
  const custom = params.from || params.to;
  const triggerLabel = activePreset
    ? activePreset.label
    : custom
      ? `${params.from || '…'} – ${params.to || '…'}`
      : 'Date';

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFrom(params.from);
          setTo(params.to);
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="compact"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
        >
          {triggerLabel}
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
            onSelect={() => onNavigate({ range: '', from: '', to: '' })}
          >
            {!activePreset && !custom && (
              <LuCheck aria-hidden="true" className="size-3.5" />
            )}
            All time
          </DropdownMenu.Item>
          {INBOX_RANGE_PRESETS.map(({ token, label }) => (
            <DropdownMenu.Item
              key={token}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onNavigate({ range: token, from: '', to: '' })}
            >
              {params.range === token && (
                <LuCheck aria-hidden="true" className="size-3.5" />
              )}
              {label}
            </DropdownMenu.Item>
          ))}
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
                onNavigate({ range: '', from, to });
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
