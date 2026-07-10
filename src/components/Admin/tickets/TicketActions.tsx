'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuCheck, LuClock, LuRotateCcw } from 'react-icons/lu';

import Button from '@/components/Button';
import { setTicketStatus } from '@/app/(admin)/admin/(protected)/_actions/tickets';
import type { TicketStatusSlug } from '@/lib/ticketFields';
import { safeAction } from '@/components/Admin/inbox/safeAction';

/**
 * Triager-only status bar on the ticket detail page. The detail stays visible
 * after every move (unlike inbox triage, a status flip doesn't remove the
 * ticket from its page), so each action just toasts and refreshes.
 */
export default function TicketActions({
  id,
  status,
}: {
  id: string;
  status: TicketStatusSlug;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function move(next: TicketStatusSlug, success: string) {
    setPending(true);
    const res = await safeAction(setTicketStatus(id, next));
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(success);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'open' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuRotateCcw}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('open', 'Ticket reopened.')}
        >
          Reopen
        </Button>
      )}
      {status !== 'pending' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuClock}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('pending', 'Marked pending.')}
        >
          Mark pending
        </Button>
      )}
      {status !== 'closed' && (
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuCheck}
          iconPosition="left"
          disabled={pending}
          onClick={() => move('closed', 'Ticket closed.')}
        >
          Close
        </Button>
      )}
    </div>
  );
}
