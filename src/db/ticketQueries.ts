import 'server-only';
import { count, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { tickets } from '@/db/schema';
import type { Ticket } from '@/db/schema';
import type { TicketStatusSlug } from '@/lib/ticketFields';

/**
 * Read helpers for the admin tickets section, mirroring adminQueries.ts: one
 * server-only module so the query surface never reaches a client bundle.
 * Writes (create, status changes) live in `_actions/tickets.ts`, not here.
 *
 * NOTE: these helpers don't authorize — callers decide between listTickets
 * (triagers, everything) and listOwnTickets (everyone, own rows only) via
 * src/lib/ticketAccess.ts.
 */

// Guard id-by-string reads so a malformed /admin/tickets/[id] URL returns
// "not found" instead of throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize a raw `?status=` value to a valid tab, defaulting to open. */
export function resolveTicketView(value: string): TicketStatusSlug {
  return value === 'pending' || value === 'closed' ? value : 'open';
}

export const TICKETS_PER_PAGE = 25;

export type TicketsPage = {
  rows: Ticket[];
  total: number;
  page: number;
  totalPages: number;
};

async function pagedTickets(
  where: ReturnType<typeof eq>,
  page: number,
  perPage: number,
): Promise<TicketsPage> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(tickets)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await db
    .select()
    .from(tickets)
    .where(where)
    .orderBy(desc(tickets.createdAt))
    .limit(perPage)
    .offset((safePage - 1) * perPage);

  return { rows, total, page: safePage, totalPages };
}

/**
 * One page of ALL tickets in a status tab, newest first — triager view only.
 * `page` is clamped to the available range (see listSubmissions for why).
 */
export async function listTickets({
  view,
  page,
  perPage = TICKETS_PER_PAGE,
}: {
  view: TicketStatusSlug;
  page: number;
  perPage?: number;
}): Promise<TicketsPage> {
  return pagedTickets(eq(tickets.status, view), page, perPage);
}

/**
 * One page of the acting user's own tickets, every status mixed, newest
 * first — the non-triager view of /admin/tickets.
 */
export async function listOwnTickets({
  reporterId,
  page,
  perPage = TICKETS_PER_PAGE,
}: {
  reporterId: string;
  page: number;
  perPage?: number;
}): Promise<TicketsPage> {
  return pagedTickets(eq(tickets.reporterId, reporterId), page, perPage);
}

/** A single ticket by id, or null if the id is malformed / missing. */
export async function getTicketById(id: string): Promise<Ticket | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
  return row ?? null;
}

export type TicketStatusCounts = Record<TicketStatusSlug, number>;

/** Per-status counts — powers the tab badges and the sidebar open count. */
export async function getTicketStatusCounts(): Promise<TicketStatusCounts> {
  const rows = await db
    .select({ status: tickets.status, n: count() })
    .from(tickets)
    .groupBy(tickets.status);

  const counts: TicketStatusCounts = { open: 0, pending: 0, closed: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}
