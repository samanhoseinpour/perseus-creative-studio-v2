import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import { ticketAreasFor } from '@/lib/ticketFields';
import { adminLink } from '@/components/Admin/Glass';
import NewTicketForm from '@/components/Admin/tickets/NewTicketForm';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'New ticket',
  description: 'Report a bug or issue in the admin panel.',
};

export default async function NewTicketPage() {
  const profile = await requireArea('tickets');
  // Slim server-derived props: the picker only offers areas this viewer can
  // actually reach (restricted routes stay hidden, as in the sidebar).
  const areas = ticketAreasFor({
    superadmin: profile.superadmin,
    areas: profile.areas,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href="/admin/tickets"
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to tickets
      </Link>

      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New ticket
        </h1>
        <p className="text-sm text-muted-foreground">
          Spotted a bug or something off in the admin panel? Describe it here —
          the team is notified right away.
        </p>
      </header>

      <NewTicketForm areas={areas} />
    </div>
  );
}
