'use client';

import { useTransition } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import { toast } from 'sonner';

import { runMonitoringChecks } from '@/app/(admin)/admin/(protected)/_actions/monitoring';
import Button from '@/components/Button';

/**
 * "Check now": runs the evaluator on demand. The action revalidates the page
 * and the fresh tree rides back on its own response, so there is deliberately
 * no router.refresh() here (the no-double-render contract).
 */
export default function CheckNowButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      icon={LuRefreshCw}
      iconPosition="left"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await runMonitoringChecks();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          const parts = [`Checked ${result.checked} dependencies`];
          if (result.opened > 0) parts.push(`${result.opened} opened`);
          if (result.resolved > 0) parts.push(`${result.resolved} resolved`);
          if (result.stepsFailed.length > 0) {
            toast.warning(
              `${parts.join(' · ')} — ${result.stepsFailed.length} ${result.stepsFailed.length === 1 ? 'step' : 'steps'} could not run`,
            );
          } else {
            toast.success(parts.join(' · '));
          }
        })
      }
    >
      {pending ? 'Checking…' : 'Check now'}
    </Button>
  );
}
