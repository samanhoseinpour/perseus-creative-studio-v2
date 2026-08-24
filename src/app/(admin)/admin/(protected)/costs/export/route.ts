import 'server-only';

import { requireArea } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { exportCostsCsv } from '@/lib/costExport';

/**
 * CSV of the studio's own spend. Route handlers are NOT covered by the
 * protected layout guard — self-gate, like the payroll export.
 *
 * Mechanics live in src/lib/costExport.ts; this stays auth + delegation + the
 * ok-branch audit row.
 */
export async function GET(request: Request) {
  const profile = await requireArea('costs', '/admin');
  const res = await exportCostsCsv(request);
  // Logged only on success: logging first left permanent "Exported…" entries
  // for files that were never produced (the 400 path).
  if (res.ok) {
    logActivity(profile, {
      area: 'costs',
      entity: 'export',
      entityId: null,
      entityName: 'costs',
      action: 'export',
      summary: 'Exported the costs CSV',
    });
  }
  return res;
}
