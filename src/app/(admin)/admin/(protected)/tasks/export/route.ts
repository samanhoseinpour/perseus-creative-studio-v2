import { requireArea } from '@/lib/adminAccess';
import { exportTasksCsv } from '@/lib/taskExport';
import { logActivity } from '@/lib/activityLog';

// Route handlers are NOT covered by the protected layout guard — self-gate.
export async function GET(request: Request) {
  const profile = await requireArea('tasks');
  // OWASP's "always log" list names access to sensitive data. A CSV lifts
  // rows out of the app entirely — after that the audit trail is the only
  // record the data left at all.
  const res = await exportTasksCsv(request);
  // Logged only on success. Writing the row first meant a 404 from a stale
  // /admin/reports/<deleted-slug>/export link left a permanent "Exported ..."
  // entry for a file that never existed — the résumé route's rule, applied
  // consistently.
  if (res.ok) {
    logActivity(profile, {
      area: 'tasks',
      entity: 'export',
      entityId: null,
      entityName: 'the task log',
      action: 'export',
      summary: 'Exported the task log as CSV',
    });
  }
  return res;
}
