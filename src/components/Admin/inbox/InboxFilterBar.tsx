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
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

export type FilterOption = { value: string; label: string };

/** Same row recipe as ExportMenu; radix flags hover AND keyboard focus. */
const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10';

const menuContent = cn(
  'relative z-50 min-w-44 p-1.5',
  glassSurface,
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
);

const dateInput =
  'h-8 rounded-lg border border-white/50 bg-white/40 px-2 text-xs text-foreground outline-none dark:border-white/15 dark:bg-white/10';

/**
 * Search + filter toolbar for the inbox lists. Purely URL-state: every change
 * routes through `router.replace` with the canonical query string from
 * inboxListQs (which drops `page`, so any change resets pagination). Options
 * arrive as slim {value,label} pairs resolved server-side — this file must
 * never import services.ts/careers.ts (chunk hygiene).
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

  // `/` focuses the search box (same editable-target guard as the list keys).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          t.closest('input, textarea, select, a, button, [role="button"]'))
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          className="h-8 w-full rounded-lg border border-white/50 bg-white/40 pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30"
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
        size="small"
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
          size="small"
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
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
        >
          {active ? active.label : label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={8} className={menuContent}>
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
          size="small"
          variant="secondary"
          icon={LuChevronDown}
          iconPosition="right"
        >
          {triggerLabel}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={8} className={menuContent}>
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
              size="small"
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
