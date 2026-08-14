import { requireArea } from '@/lib/adminAccess';
import { exportTasksCsv } from '@/lib/taskExport';

// Route handlers are NOT covered by the protected layout guard — self-gate.
export async function GET(request: Request) {
  await requireArea('tasks');
  return exportTasksCsv(request);
}
