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
};

// One submission as a list row. `new` rows read as "unread" — a filled dot and
// a heavier name — so untriaged leads stand out inside the Inbox tab (the tab
// context already conveys archived/spam, so no per-row status pill).
export default function InboxRow({
  href,
  name,
  email,
  secondary,
  dateLabel,
  status,
}: Props) {
  const unread = status === 'new';

  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3.5 px-4 py-3.5 sm:px-5',
          glassRowHover,
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
}
