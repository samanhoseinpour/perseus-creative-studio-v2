'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { LuCheck, LuChevronDown, LuSearch, LuTags } from 'react-icons/lu';

import Button from '@/components/Button';
import { GlassRim } from '@/components/Admin/Glass';
import {
  groupTags,
  splitTagsForCategory,
  TASK_TAG_GROUP_HINTS,
  TASK_TAG_GROUP_LABELS,
  TASK_TAG_MAX_PER_TASK,
  tagSummaryLabel,
  type TaskTagOption,
} from '@/lib/taskTagFields';
import { cn } from '@/lib/utils';
import { comboList, comboPanel, menuItem } from './menu';
import TaskTagChip from './TaskTagChip';

/**
 * The multi-select tag picker — ClientCombobox's recipe (Radix Popover, an
 * embedded search input, an ArrowUp/Down cursor over a hand-rolled listbox),
 * with three differences that make it a multi-select: aria-multiselectable,
 * a checkbox glyph instead of a single check, and it STAYS OPEN on pick.
 *
 * The list is scoped: only tags offered for the current task category, plus
 * the globals. That scoping is the whole feature — a flat vocabulary of every
 * tag in the studio is exactly the long list this replaced. Tags already on
 * the task that fall outside its category are still shown, in a trailing
 * "Other" section, because hiding a value the row actually carries would make
 * the picker lie about it.
 */
export default function TagPicker({
  tags,
  categoryId,
  value,
  onChange,
  modal = false,
  disabled,
  trigger,
  placeholder = 'Tags',
  onManage,
}: {
  /** The whole vocabulary, archived included (an archived tag still renders
   *  on the tasks that carry it — it just can't be newly added). */
  tags: TaskTagOption[];
  /** The task's current category id; '' before one is chosen; `null` to
   *  disable scoping entirely (the bulk bar — a mixed selection has no one
   *  category to follow). */
  categoryId: string | null;
  /** Selected tag ids. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Inside a modal Dialog the popover MUST be modal too — Radix's dialog
   *  scroll-lock only whitelists the dialog content, and this portals to
   *  document.body (the ClientCombobox gotcha, verbatim). */
  modal?: boolean;
  disabled?: boolean;
  /** Custom trigger (the table's tags cell) — must forward props/ref. */
  trigger?: React.ReactElement;
  placeholder?: string;
  /** Superadmins get a way out to the vocabulary manager when a category has
   *  nothing to offer yet — otherwise the empty state is a dead end. */
  onManage?: () => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = useMemo(() => new Set(value), [value]);
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const { sections, flat } = useMemo(() => {
    const { inScope, other } = splitTagsForCategory(tags, categoryId, value);
    const needle = query.trim().toLowerCase();
    const match = (list: TaskTagOption[]) =>
      needle ? list.filter((t) => t.name.toLowerCase().includes(needle)) : list;

    const built: { key: string; label: string; hint?: string; tags: TaskTagOption[] }[] =
      groupTags(match(inScope)).map((section) => ({
        key: section.group as string,
        label: TASK_TAG_GROUP_LABELS[section.group],
        hint: TASK_TAG_GROUP_HINTS[section.group],
        tags: section.tags,
      }));

    const otherMatched = match(other);
    if (otherMatched.length > 0) {
      built.push({
        key: 'other',
        label: 'Other',
        hint: 'On this task, but not offered for its category',
        tags: otherMatched,
      });
    }
    // The cursor indexes the RENDERED order, so each section carries the
    // offset where its rows start. Derived, never accumulated into a mutable
    // local — a render-phase mutation is what breaks under re-entrant
    // rendering, and there are at most four sections to walk.
    const withOffsets = built.map((section, i) => ({
      ...section,
      start: built
        .slice(0, i)
        .reduce((n, prior) => n + prior.tags.length, 0),
    }));
    return {
      sections: withOffsets,
      flat: withOffsets.flatMap((s) => s.tags),
    };
  }, [tags, categoryId, value, query]);

  const clampedActive = Math.min(active, Math.max(0, flat.length - 1));
  const full = value.length >= TASK_TAG_MAX_PER_TASK;

  function toggle(tag: TaskTagOption) {
    if (selected.has(tag.id)) {
      onChange(value.filter((id) => id !== tag.id));
      return;
    }
    // The cap is silent rather than an error: the picker simply stops adding,
    // and the counter under the list says why.
    if (full) return;
    onChange([...value, tag.id]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(clampedActive + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(clampedActive - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const tag = flat[clampedActive];
      if (tag) toggle(tag);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Trigger label follows the selection, not the scope: a task keeps showing
  // its own tags even when the category no longer offers them.
  const names = value
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery('');
          setActive(0);
        }
      }}
      modal={modal}
    >
      <Popover.Trigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon={LuChevronDown}
            iconPosition="right"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn('max-w-56', names.length === 0 && 'text-muted-foreground')}
          >
            <span className="truncate">
              {tagSummaryLabel(names, placeholder)}
            </span>
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
          className={cn(comboPanel, 'w-72')}
        >
          <GlassRim />
          {/* shrink-0 — the field stays put while the results move under
              it (ClientCombobox's rule). */}
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
                flat.length > 0 ? `${listId}-${clampedActive}` : undefined
              }
              aria-label="Search tags"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search tags…"
              autoComplete="off"
              spellCheck={false}
              className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/35 focus:outline-none"
            />
          </span>

          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            aria-label="Tags"
            className={comboList}
          >
            {sections.map((section) => (
              <li key={section.key}>
                <p
                  className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
                  title={section.hint}
                >
                  {section.label}
                </p>
                <ul>
                  {section.tags.map((tag, i) => {
                    const index = section.start + i;
                    const isOn = selected.has(tag.id);
                    return (
                      <li
                        key={tag.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={isOn}
                        aria-disabled={!isOn && full}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => toggle(tag)}
                        className={cn(
                          menuItem,
                          'text-foreground',
                          index === clampedActive && 'bg-white/45 dark:bg-white/10',
                          !isOn && full && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                            isOn
                              ? 'border-transparent bg-foreground text-background'
                              : 'border-foreground/30',
                          )}
                        >
                          {isOn && <LuCheck className="size-2.5" />}
                        </span>
                        <TaskTagChip tag={tag} />
                        {tag.archived && (
                          <span className="ml-auto shrink-0 pl-2 text-[0.6rem] text-muted-foreground">
                            archived
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            {flat.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {query.trim()
                  ? 'No tags match.'
                  : categoryId
                    ? 'No tags for this category yet.'
                    : 'Pick a category first — tags follow it.'}
                {onManage && !query.trim() && categoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onManage();
                    }}
                    className="mt-1 block cursor-pointer text-xs font-medium text-foreground underline underline-offset-2"
                  >
                    Manage tags
                  </button>
                )}
              </li>
            )}
          </ul>

          {value.length > 0 && (
            <p className="shrink-0 border-t border-white/40 px-3 pt-2 pb-1 text-[0.65rem] text-muted-foreground dark:border-white/10">
              {value.length} of {TASK_TAG_MAX_PER_TASK} ·{' '}
              <button
                type="button"
                onClick={() => onChange([])}
                className="cursor-pointer font-medium text-foreground underline underline-offset-2"
              >
                Clear
              </button>
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The empty-cell / empty-field affordance, so the icon and wording match
 *  everywhere the picker is offered without a selection. */
export function TagPickerGhost({ label = 'Tags' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <LuTags aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}
