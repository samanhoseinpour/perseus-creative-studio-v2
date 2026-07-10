import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/adminSession';
import { isPrivilegedAdmin } from '@/lib/adminAccess';
import { getTicketById, resolveTicketView } from '@/db/ticketQueries';
import { firstParam } from '@/utils/pagination';
import TicketDetail from '@/components/Admin/tickets/TicketDetail';

export const metadata: Metadata = {
  title: 'Ticket',
  description: 'Ticket detail.',
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const ticket = await getTicketById(id);
  const canTriage = isPrivilegedAdmin(user.email);
  // Reporters may only open their own tickets. Unauthorized answers 404 (not
  // 403) so foreign ticket ids aren't enumerable.
  if (!ticket || (!canTriage && ticket.reporterId !== user.id)) notFound();

  // `?from=` remembers which status tab the triager came in from.
  const from = resolveTicketView(firstParam(sp.from));
  const listHref =
    canTriage && from !== 'open'
      ? `/admin/tickets?status=${from}`
      : '/admin/tickets';

  return (
    <TicketDetail ticket={ticket} listHref={listHref} canTriage={canTriage} />
  );
}
