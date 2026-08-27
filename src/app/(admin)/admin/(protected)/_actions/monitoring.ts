'use server';

/**
 * The one write action on /admin/monitoring: "Check now". It runs the SAME
 * evaluator the cron runs (probes, incident decision, alerts — everything but
 * the retention sweep, which stays on the scheduled run), so a manual check
 * can never disagree with a scheduled one.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — this
 * gates itself on the `monitoring` area, an owner-granted SENSITIVE_AREA.
 *
 * Cache contract: `revalidatePath('/admin/monitoring')` and nothing else. The
 * fresh page rides back on the action's own POST response, so the client must
 * never follow up with `router.refresh()` (the invalidateTasks rule). No
 * activity row: a check is a read of the world, not a change to the studio's
 * data, and the incidents it may open live on this page rather than in the
 * audit trail.
 */
import { revalidatePath } from 'next/cache';

import { requireArea } from '@/lib/adminAccess';
import { evaluateMonitoring } from '@/lib/monitoringEvaluate';
import { reportError } from '@/lib/monitoringRecord';

export type CheckNowResult =
  | {
      ok: true;
      checked: number;
      opened: number;
      resolved: number;
      stepsFailed: string[];
    }
  | { ok: false; error: string };

export async function runMonitoringChecks(): Promise<CheckNowResult> {
  await requireArea('monitoring', '/admin');
  try {
    const summary = await evaluateMonitoring({ trigger: 'manual' });
    revalidatePath('/admin/monitoring');
    return {
      ok: true,
      checked: summary.checked,
      opened: summary.opened,
      resolved: summary.resolved,
      stepsFailed: summary.stepsFailed,
    };
  } catch (error) {
    reportError('[monitoring] runMonitoringChecks failed', error);
    return { ok: false, error: 'The checks could not run. Try again in a moment.' };
  }
}
