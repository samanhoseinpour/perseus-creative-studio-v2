import { requireArea } from '@/lib/adminAccess';
import { exportClientReportCsv } from '@/lib/taskExport';

// Route handlers are NOT covered by the protected layout guard — self-gate.
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  await requireArea('reports');
  return exportClientReportCsv(request, (await ctx.params).slug);
}
