import { requireArea } from '@/lib/adminAccess';
import { exportClientReportCsv } from '@/lib/taskExport';
import { logActivity } from '@/lib/activityLog';

// Route handlers are NOT covered by the protected layout guard — self-gate.
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const profile = await requireArea('reports');
  const { slug } = await ctx.params;

  const res = await exportClientReportCsv(request, slug);
  // OWASP's "always log" list names access to sensitive data: a CSV lifts rows
  // out of the app entirely, and after that the audit trail is the only record
  // the data left at all. Logged only on success — writing the row first meant
  // a stale /admin/reports/<deleted-slug>/export link left a permanent
  // "Exported ..." entry for a file that never existed.
  if (res.ok) {
    logActivity(profile, {
      area: 'reports',
      entity: 'export',
      entityId: null,
      entityName: slug,
      action: 'export',
      summary: `Exported the ${slug} client report as CSV`,
    });
  }
  return res;
}
