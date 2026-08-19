import 'server-only';

import { requireArea } from '@/lib/adminAccess';
import { exportSubmissionsCsv } from '@/lib/adminExport';
import { logActivity } from '@/lib/activityLog';

/**
 * CSV export of career applications (`?range=` presets from the ExportMenu).
 * Route handlers are NOT covered by the protected layout's guard, so this
 * gates itself on the applications area (rows carry candidate PII). Scope +
 * column semantics (all statuses except spam, tab-independent) live in
 * src/lib/adminExport.ts.
 */
export async function GET(request: Request) {
  const profile = await requireArea('applications');
  // OWASP's "always log" list names access to sensitive data. A CSV lifts
  // rows out of the app entirely — after that the audit trail is the only
  // record the data left at all.
  const res = await exportSubmissionsCsv(request, 'career');
  // Logged only on success. Writing the row first meant a 404 from a stale
  // /admin/reports/<deleted-slug>/export link left a permanent "Exported ..."
  // entry for a file that never existed — the résumé route's rule, applied
  // consistently.
  if (res.ok) {
    logActivity(profile, {
      area: 'applications',
      entity: 'export',
      entityId: null,
      entityName: 'job applications',
      action: 'export',
      summary: 'Exported job applications as CSV',
    });
  }
  return res;
}
