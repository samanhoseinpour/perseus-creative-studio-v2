import { forwardRef } from 'react';
import Link from 'next/link';

import type { ContactSubmission } from '@/db/schema';
import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  name: string;
  email: string;
  secondary: string | null;
  dateLabel: string;
  status: ContactSubmission['status'];
  selected?: boolean;
  checked?: boolean;
  onToggle?: () => void;
};

// One submission as a list row. `new` rows read as "unread" — a filled dot and a
// heavier name. `selected` is the keyboard-triage highlight (see
// InboxKeyboardList); the ref lets the list scroll the active row into view.
// The bulk-select checkbox is a SIBLING of the Link (not a child) so checking a
// row never navigates; the row highlight lives on the <li> so the checkbox
// gutter shares it.
const InboxRow = forwardRef<HTMLLIElement, Props>(function InboxRow(
  { href, name, email, secondary, dateLabel, status, selected, checked, onToggle },
  ref,
) {
  const unread = status === 'new';

  return (
    <li
      ref={ref}
      className={cn(
        'flex items-center',
        selected ? 'bg-white/60 dark:bg-white/10' : glassRowHover,
        checked && 'bg-white/50 dark:bg-white/[0.08]',
      )}
    >
      {onToggle && (
        <label className="flex cursor-pointer items-center self-stretch pl-4 sm:pl-5">
          <input
            type="checkbox"
            checked={checked ?? false}
            onChange={onToggle}
            aria-label={`Select ${name}`}
            className="size-4 accent-foreground"
          />
        </label>
      )}
      <Link
        href={href}
        aria-current={selected ? true : undefined}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pr-4 sm:pr-5',
          onToggle ? 'pl-3' : 'pl-4 sm:pl-5',
        )}
      >
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            unread ? 'bg-foreground' : 'bg-transparent',
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm text-foreground',
              unread ? 'font-semibold' : 'font-medium',
            )}
          >
            {name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{email}</span>
            {secondary && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{secondary}</span>
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {dateLabel}
        </span>
      </Link>
    </li>
  );
});

export default InboxRow;
