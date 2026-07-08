import Link from 'next/link';
import { LuInbox, LuArchive, LuShieldCheck } from 'react-icons/lu';

import type { InboxView } from '@/db/adminQueries';
import EmptyState from '@/components/Admin/EmptyState';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/** The per-tab empty state for an inbox view. Pure server component. */
export default function InboxEmpty({ view }: { view: InboxView }) {
  if (view === 'archived') {
    return (
      <EmptyState
        icon={LuArchive}
        title="Nothing archived"
        description="Submissions you archive are kept here."
      />
    );
  }
  if (view === 'spam') {
    return (
      <EmptyState
        icon={LuShieldCheck}
        title="No spam caught"
        description="Bot-flagged submissions collect here — rescue a false positive if one slips in."
      />
    );
  }
  return (
    <EmptyState
      icon={LuInbox}
      title="Inbox zero"
      description="New submissions from the contact form will land here."
      action={
        <Link
          href="/"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          View the live site
        </Link>
      }
    />
  );
}
