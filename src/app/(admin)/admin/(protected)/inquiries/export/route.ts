import 'server-only';

import { requireArea } from '@/lib/adminAccess';
import { exportSubmissionsCsv } from '@/lib/adminExport';

/**
 * CSV export of project inquiries (`?range=` presets from the ExportMenu).
 * Route handlers are NOT covered by the protected layout's guard, so this
 * gates itself on the inquiries area. Scope + column semantics (all statuses
 * except spam, tab-independent) live in src/lib/adminExport.ts.
 */
export async function GET(request: Request) {
  await requireArea('inquiries');
  return exportSubmissionsCsv(request, 'project');
}
