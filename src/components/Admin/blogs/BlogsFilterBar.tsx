'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowDownWideNarrow, LuCheck, LuChevronDown, LuSearch } from 'react-icons/lu';

import Button from '@/components/Button';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim, glassField } from '@/components/Admin/Glass';
import { dropdownMenuContent, menuItem } from '@/components/Admin/menu';
import { panelRow } from '@/components/Admin/blogs/listBox';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { blogListQs, type BlogListParams, type BlogListSort } from '@/lib/blogFilters';
import { cn } from '@/lib/utils';

/** A picker's options, resolved server-side. This file must never import the
 *  blog store or the admin queries: it is a client entry. */
export type BlogFilterOption = { value: string; label: string };

const SORT_LABELS: Record<BlogListSort, string> = {
  updated: 'Recently updated',
  published: 'Publish date',
  title: 'Title A to Z',
};

const SORTS: BlogListSort[] = ['updated', 'published', 'title'];

/**
 * Search, author, category and sort for /admin/blogs, on the InboxFilterBar
 * recipe: purely URL state, every change through `router.replace` with the
 * canonical string from `blogListQs`, which drops `page` so any change resets
 * pagination.
 *
 * NO SUBMIT BUTTON, and that is documented rather than a preference: the
 * activity log shipped as a zero-JS GET form with one, and members read it as
 * broken because every other bar in this dashboard applies on change.
 */
export default function BlogsFilterBar({
  params,
  authors,
  categories,
}: {
  params: BlogListParams;
  authors: BlogFilterOption[];
  categories: BlogFilterOption[];
}) {
  const router = useRouter();

  const navigate = useCallback(
    (next: Partial<BlogListParams>) => {
      const qs = blogListQs({ ...params, ...next, page: 1 });
      router.replace(qs ? `/admin/blogs?${qs}` : '/admin/blogs', { scroll: false });
    },
    [router, params],
  );

  // Controlled input, 300 ms debounce (the InboxFilterBar timing).
  const inputRef = useRef<HTMLInputElement>(null);
  const [qValue, setQValue] = useState(params.q);

  // Re-sync when the URL's q moves underneath us (back/forward, Clear) but
  // never mid-typing, or a landing navigation clobbers newer keystrokes.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQValue(params.q);
  }, [params.q]);

  useEffect(() => {
    const trimmed = qValue.trim();
    if (trimmed === params.q) return;
    const timer = setTimeout(() => navigate({ q: trimmed }), 300);
    return () => clearTimeout(timer);
  }, [qValue, params.q, navigate]);

  // Focus on arrival, `/` from anywhere, and the two-stage Escape. The Escape
  // stage is mandatory rather than polish: the list binds single-key
  // shortcuts whose guards skip anything typed inside an input, so a focused
  // search box mutes them until there is a way back out.
  useSearchFocus(inputRef, { onClear: () => setQValue('') });

  const narrowed = Boolean(params.q || params.author || params.category);

  return (
    <div className={cn(panelRow, 'flex flex-wrap items-center gap-2')}>
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
          placeholder="Search title, address, or author"
          aria-label="Search posts by title, address, description, author, or category"
          className={cn(glassField, 'h-8 w-full pr-2.5 pl-8 text-sm')}
        />
      </span>

      <PickerMenu
        label="Author"
        allLabel="All authors"
        value={params.author}
        options={authors}
        onSelect={(value) => navigate({ author: value })}
      />
      <PickerMenu
        label="Category"
        allLabel="All categories"
        value={params.category}
        options={categories}
        onSelect={(value) => navigate({ category: value })}
      />
      <PickerMenu
        label="Sort"
        icon={LuArrowDownWideNarrow}
        value={params.sort}
        options={SORTS.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }))}
        onSelect={(value) => navigate({ sort: value as BlogListSort })}
      />

      {narrowed && (
        <Button
          type="button"
          size="compact"
          variant="secondary"
          showIcon={false}
          onClick={() => navigate({ q: '', author: '', category: '' })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * One facet. `allLabel` is what picking nothing means; a menu without one (the
 * sort) always has a value, so it never offers the empty row.
 */
function PickerMenu({
  label,
  allLabel,
  icon = LuChevronDown,
  value,
  options,
  onSelect,
}: {
  label: string;
  allLabel?: string;
  icon?: typeof LuChevronDown;
  value: string;
  options: BlogFilterOption[];
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
          icon={icon}
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
          {allLabel && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect('')}
            >
              {!active && <LuCheck aria-hidden="true" className="size-3.5" />}
              {allLabel}
            </DropdownMenu.Item>
          )}
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
