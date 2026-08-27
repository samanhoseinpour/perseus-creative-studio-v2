'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuCheck, LuChevronDown, LuPlus, LuSearch } from 'react-icons/lu';

import Button from '@/components/Button';
import { GlassRim } from '@/components/Admin/Glass';
import { INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { cn } from '@/lib/utils';
import ClientMark from './ClientMark';
import { comboList, comboPanel, menuItem } from './menu';
import type { PickerOption } from './types';
import { matchesAllTokens } from '@/lib/searchTerms';

/** The sentinel row for "no client" — internal Perseus work (wordmark coin). */
export const INTERNAL_OPTION: PickerOption = {
  value: '',
  label: INTERNAL_CLIENT_LABEL,
  mark: true,
};

/**
 * Searchable client picker for the task forms — the repo's first Radix
 * Popover (DropdownMenu's typeahead fights embedded inputs; Popover doesn't).
 * Hand-rolled listbox semantics on the CommandPalette recipe: controlled
 * input, substring filter (client-side is the blessed pattern at ~100 rows),
 * ArrowUp/Down cursor via aria-activedescendant, Enter picks, Escape closes.
 *
 * With `onCreate` set, a non-matching query pins a "+ New client" row —
 * wired to the 'tasks'-gated quickCreateClient action upstream, so any
 * member logging work can add the client it belongs to (name-only; stays off
 * the public logo wall).
 */
export default function ClientCombobox({
  value,
  valueLabel,
  options,
  onSelect,
  onCreate,
  allowInternal = true,
  modal = false,
  disabled,
  invalid,
  placeholder = 'Client',
  trigger,
  size = 'small',
  onClear,
}: {
  /** Selected client id, '' = internal, null = nothing chosen yet. */
  value: string | null;
  /** Display label for the current value (parent resolves). */
  valueLabel: string | null;
  options: PickerOption[];
  onSelect: (option: PickerOption) => void;
  /** Resolves the created client to an option, or null on failure. */
  onCreate?: (name: string) => Promise<PickerOption | null>;
  allowInternal?: boolean;
  /** Inside a modal Dialog the popover MUST be modal too: Radix's dialog
   *  scroll-lock only whitelists the dialog content, and this popover portals
   *  to document.body — non-modal, its wheel events get swallowed. */
  modal?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /** Custom trigger element (the table's client cell) — replaces the default
   *  Button; must accept forwarded props/ref (Popover.Trigger asChild). */
  trigger?: React.ReactElement;
  /** The default trigger's Button size. `compact` is for the dense bars — the
   *  filter bar, the bulk bar, the add band — where this control sits in a row
   *  of a dozen and its own size decides whether the row wraps. Dialogs and
   *  forms keep `small`. Ignored when a custom `trigger` is passed. */
  size?: 'small' | 'compact';
  /** Offers a footer row that returns the field to "nothing picked" (null).
   *  Only the quick-add band passes it: on a task ROW there is no such state —
   *  a client-less task is Perseus, which is already a real option. Rendered
   *  BELOW the listbox on purpose, so the keyboard cursor's index arithmetic
   *  over `rows.list` + the create row stays untouched. */
  onClear?: () => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);

  const trimmed = query.trim();
  const rows = useMemo(() => {
    const needle = trimmed.toLowerCase();
    // Perseus joins the candidates BEFORE the filter runs. Prepending it only
    // to an EMPTY query made the studio's own name the one label the search
    // could never find — and typing it in full then pinned a "New client:
    // Perseus" row that quickCreateClient refuses as a reserved slug.
    const candidates = allowInternal ? [INTERNAL_OPTION, ...options] : options;
    const list = needle
      ? candidates.filter((o) => matchesAllTokens(trimmed, [o.label]))
      : candidates;
    // Over the rendered list, not `options` — otherwise an exact "Perseus"
    // still counts as unmatched and offers the create row. Deliberately still
    // a WHOLE-STRING comparison while the filter above is tokenized: this asks
    // "did they type this client's name exactly", and a tokenized equality
    // would let "vela street" count as an exact match for "Vela 21st Street"
    // and silently withdraw the create row.
    const exact = list.some(
      (o) => o.label.toLowerCase() === needle && needle !== '',
    );
    const canCreate = Boolean(onCreate) && trimmed.length >= 2 && !exact;
    return { list, canCreate };
  }, [options, trimmed, allowInternal, onCreate]);

  // The create row sits after the matches; `active` indexes the combined list.
  const totalRows = rows.list.length + (rows.canCreate ? 1 : 0);
  const clampedActive = Math.min(active, Math.max(0, totalRows - 1));

  // Bumped whenever the popover closes — an in-flight create compares the
  // token it started with and abandons its result if this moved (see pick()).
  const attempt = useRef(0);

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery('');
      setActive(0);
    } else {
      // Dismissing (Escape, outside click) CANCELS a pending create.
      attempt.current += 1;
    }
  }

  async function pick(index: number) {
    // While a create is in flight, ALL picks freeze: a list pick made now
    // would be overridden seconds later when the create resolves and fires
    // its own onSelect — the user's visible choice must stay final.
    if (creating) return;
    if (index < rows.list.length) {
      onSelect(rows.list[index]);
      setOpen(false);
      return;
    }
    if (!rows.canCreate || !onCreate) return;
    const token = attempt.current;
    setCreating(true);
    let created: PickerOption | null;
    try {
      created = await onCreate(trimmed);
    } finally {
      // finally, not a trailing call: a rejected onCreate would otherwise
      // leave `creating` true forever, freezing every subsequent pick.
      setCreating(false);
    }
    // The client row still gets created server-side (nothing to roll back),
    // but a user who dismissed the popover mid-create did NOT choose it —
    // committing anyway silently repointed the task's client a second later.
    if (attempt.current !== token) return;
    if (created) {
      onSelect(created);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(clampedActive + 1, totalRows - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(clampedActive - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void pick(clampedActive);
    } else if (e.key === 'Escape') {
      // reset(), not setOpen(): Escape is a dismissal, so it must cancel a
      // pending create like an outside click does.
      reset(false);
    }
  }

  const triggerLabel =
    value === '' && allowInternal
      ? INTERNAL_OPTION.label
      : (valueLabel ?? placeholder);

  return (
    <Popover.Root open={open} onOpenChange={reset} modal={modal}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size={size}
            variant="secondary"
            icon={LuChevronDown}
            iconPosition="right"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={invalid ? true : undefined}
            className={cn(
              'max-w-48',
              invalid && 'border-destructive/60',
              value === null && valueLabel === null && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{triggerLabel}</span>
          </Button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className={cn(comboPanel, 'w-64')}
        >
          <GlassRim />
          {/* shrink-0: the field is the one part of this panel that must
              never scroll away — searching 85 clients means typing, reading,
              and typing again. */}
          <span className="relative mb-1.5 block shrink-0">
            <LuSearch
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                totalRows > 0 ? `${listId}-${clampedActive}` : undefined
              }
              aria-label="Search clients"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search clients…"
              autoComplete="off"
              spellCheck={false}
              className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
            />
          </span>
          <ul id={listId} role="listbox" aria-label="Clients" className={comboList}>
            {rows.list.map((option, i) => (
              <li
                key={option.value || '__internal__'}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => void pick(i)}
                className={cn(
                  menuItem,
                  'text-foreground',
                  i === clampedActive && 'bg-white/45 dark:bg-white/10',
                )}
              >
                {option.value === value ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {option.mark ? (
                  <ClientMark name={option.label} logo={null} mark size={18} />
                ) : option.value !== '' && !option.bare ? (
                  <ClientMark
                    name={option.label}
                    logo={option.logo ?? null}
                    size={18}
                  />
                ) : null}
                <span className={cn('truncate', option.bare && 'italic')}>
                  {option.label}
                </span>
                {option.hint && (
                  <span
                    className={cn(
                      'ml-auto shrink-0 pl-2 text-[0.65rem] tabular-nums',
                      option.hintOver
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground',
                    )}
                  >
                    {option.hint}
                  </span>
                )}
              </li>
            ))}
            {rows.canCreate && (
              <li
                id={`${listId}-${rows.list.length}`}
                role="option"
                aria-selected={false}
                onMouseEnter={() => setActive(rows.list.length)}
                onClick={() => void pick(rows.list.length)}
                className={cn(
                  menuItem,
                  'border-t border-white/40 text-foreground dark:border-white/10',
                  clampedActive === rows.list.length &&
                    'bg-white/45 dark:bg-white/10',
                )}
              >
                <LuPlus aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  {creating ? 'Creating…' : `New client: “${trimmed}”`}
                </span>
              </li>
            )}
            {totalRows === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No clients match.
              </li>
            )}
          </ul>
          {onClear && value !== null && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="mt-1 shrink-0 cursor-pointer border-t border-white/40 px-3 pt-2 pb-1 text-left text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground dark:border-white/10"
            >
              Clear
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
