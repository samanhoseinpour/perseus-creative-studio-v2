// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (CellSelectMenu precedent) — adding it would make the function props a
// client-entry violation.
import { DropdownMenu } from 'radix-ui';
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { TASK_ASSIGNEE_MAX } from '@/lib/taskAssigneeFields';
import { cn } from '@/lib/utils';
import { cellChevron, cellTrigger, dropdownMenuContent, menuItem } from './menu';
import type { PickerOption } from './types';

/**
 * The Member cell's editor: CellSelectMenu's multi-select twin.
 *
 * Three differences from that one, all forced by a task carrying several
 * people (the TagPicker's list of the same three):
 *
 *  - CheckboxItem, not RadioItem, so AT hears "checked" rather than "current".
 *  - It STAYS OPEN on a pick (`preventDefault` on select). Crewing a shoot is
 *    two or three ticks, and a menu that closed after each would make the
 *    common case three round trips through the same dropdown.
 *  - It hands back the WHOLE next set rather than one option, because the
 *    caller's write door takes a set — there is no "the value" to change.
 *
 * The cap is silent, the TagPicker rule: an unticked row past the limit stops
 * responding and the footer says why. Unticking the last member is refused
 * here as well as on the server — a task always has someone on it, and the
 * board has no "unassigned" state to fall back to.
 */
export default function AssigneeCellMenu({
  ariaLabel,
  values,
  options,
  onChange,
  triggerClassName,
  chevronClassName,
  children,
}: {
  ariaLabel: string;
  values: readonly string[];
  options: PickerOption[];
  onChange: (next: string[]) => void;
  /** The quick-add band wears the field skin instead of the cell trigger —
   *  same menu, same rules, a different surround. Defaults to the cell. */
  triggerClassName?: string;
  /** Hover-revealed in a table cell, always visible on a form field. */
  chevronClassName?: string;
  /** The cell content rendered inside the trigger. */
  children: React.ReactNode;
}) {
  const full = values.length >= TASK_ASSIGNEE_MAX;
  const last = values.length <= 1;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={triggerClassName ?? cellTrigger}
        >
          {children}
          <LuChevronDown
            aria-hidden="true"
            className={chevronClassName ?? cellChevron}
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          {options.map((option) => {
            const on = values.includes(option.value);
            const blocked = on ? last : full;
            return (
              <DropdownMenu.CheckboxItem
                key={option.value}
                checked={on}
                disabled={blocked}
                className={cn(
                  menuItem,
                  'text-foreground',
                  blocked && 'opacity-50',
                )}
                onSelect={(event) => {
                  // Keep the menu open — see the note above.
                  event.preventDefault();
                  if (blocked) return;
                  onChange(
                    on
                      ? values.filter((v) => v !== option.value)
                      : [...values, option.value],
                  );
                }}
              >
                {on ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <AdminAvatar
                  name={option.label}
                  size={20}
                  {...(option.avatar ?? {})}
                />
                <span className="truncate">{option.label}</span>
              </DropdownMenu.CheckboxItem>
            );
          })}
          <p className="mt-1 border-t border-foreground/10 px-2.5 pt-1.5 text-[0.7rem] text-muted-foreground">
            {full
              ? `${TASK_ASSIGNEE_MAX} is the limit`
              : last
                ? 'A task keeps at least one member'
                : 'Hours split evenly; each is credited the delivery'}
          </p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
