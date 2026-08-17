'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Renders nothing; schedules ONE re-read of the ticket detail at the moment the
 * notification-email verdict becomes trustworthy (see
 * ticketEmailVerdictPendingMs).
 *
 * createTicket hands the Resend call to `after()` and redirects immediately, so
 * the reporter's render always lands while `email_sent` is still false and the
 * page — being dynamic — never re-renders on its own. Without this one refresh a
 * real failure would stay invisible to the only person on the page.
 *
 * This is NOT the "router.refresh() after a revalidating action" anti-pattern:
 * nothing was mutated from the client here, and the action already revalidates.
 * It's a timer for a server-side side effect that completes after the response,
 * mounted only while the verdict is genuinely pending.
 */
export default function TicketEmailStatusRefresh({
  delayMs,
}: {
  delayMs: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, router]);

  return null;
}
