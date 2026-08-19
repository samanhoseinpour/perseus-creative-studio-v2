import 'server-only';

import { requirePayrollAdmin } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { exportPayrollCsv } from '@/lib/payrollExport';

// Route handlers are NOT covered by the protected layout guard — self-gate.
// This one hands back every member's salary in a single file, so the gate is the
// whole security boundary.
export async function GET(request: Request) {
  const profile = await requirePayrollAdmin();
  // The single highest-value export in the app — every member's salary in one
  // file. It records THAT the file was taken and by whom; no figure, and not
  // even the month filter, crosses into activity_log.
  const res = await exportPayrollCsv(request);
  // Logged only on success. Writing the row first meant a 404 from a stale
  // /admin/reports/<deleted-slug>/export link left a permanent "Exported ..."
  // entry for a file that never existed — the résumé route's rule, applied
  // consistently.
  if (res.ok) {
    logActivity(profile, {
      area: 'payroll',
      entity: 'export',
      entityId: null,
      entityName: 'payroll',
      action: 'export',
      summary: 'Exported the payroll CSV',
    });
  }
  return res;
}
