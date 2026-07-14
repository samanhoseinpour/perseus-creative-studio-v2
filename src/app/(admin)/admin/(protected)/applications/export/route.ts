import 'server-only';

import { requireArea } from '@/lib/adminAccess';
import { exportSubmissionsCsv } from '@/lib/adminExport';

/**
 * CSV export of career applications (`?range=` presets from the ExportMenu).
 * Route handlers are NOT covered by the protected layout's guard, so this
 * gates itself on the applications area (rows carry candidate PII). Scope +
 * column semantics (all statuses except spam, tab-independent) live in
 * src/lib/adminExport.ts.
 */
export async function GET(request: Request) {
  await requireArea('applications');
  return exportSubmissionsCsv(request, 'career');
}
