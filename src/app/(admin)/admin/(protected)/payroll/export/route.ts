import 'server-only';

import { requirePayrollAdmin } from '@/lib/adminAccess';
import { exportPayrollCsv } from '@/lib/payrollExport';

// Route handlers are NOT covered by the protected layout guard — self-gate.
// This one hands back every member's salary in a single file, so the gate is the
// whole security boundary.
export async function GET(request: Request) {
  await requirePayrollAdmin();
  return exportPayrollCsv(request);
}
