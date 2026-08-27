// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { LuCheck, LuChevronDown } from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { cellChevron, cellTrigger, dropdownMenuContent, menuItem } from './menu';
import type { PickerOption } from './types';

/**
 * Generic single-select cell editor (the Category and Member cells): the
 * cell's own content is the trigger, hover reveals the chevron, one click
 * opens, one click changes. `showAvatars` renders <AdminAvatar> beside each
 * option (Member) — options carry the server-resolved face, initials
 * otherwise. Selecting the current value just closes.
 */
export default function CellSelectMenu({
  ariaLabel,
  value,
  options,
  onSelect,
  showAvatars,
  children,
}: {
  ariaLabel: string;
  value: string;
  options: PickerOption[];
  /** Called only on an actual change. */
  onSelect: (option: PickerOption) => void;
  showAvatars?: boolean;
  /** The cell content rendered inside the trigger. */
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={ariaLabel} className={cellTrigger}>
          {children}
          <LuChevronDown aria-hidden="true" className={cellChevron} />
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
          {/* RadioGroup/RadioItem so AT hears which option is current
              (role=menuitemradio + aria-checked); the check/spacer pair keeps
              the visual alignment. */}
          <DropdownMenu.RadioGroup value={value}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => {
                  if (option.value !== value) onSelect(option);
                }}
              >
                {option.value === value ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {showAvatars && (
                  <AdminAvatar
                    name={option.label}
                    size={20}
                    {...(option.avatar ?? {})}
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
