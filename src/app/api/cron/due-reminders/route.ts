import { SITE_URL } from '@/constants';
import { listOpenDueByAssignee } from '@/db/taskQueries';
import { sendMail } from '@/lib/mail';
import { INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { vancouverDayKey } from '@/lib/taskFilters';
import { logSystemActivity } from '@/lib/activityLog';
import { logError } from '@/lib/log';

/**
 * Daily due-date reminders (vercel.json cron, 15:00 UTC = 8am PDT / 7am PST —
 * DST drift accepted). Each member with overdue or due-today assignments
 * gets ONE plain-text email listing them, deep-linked to their filtered
 * task list; members with nothing get nothing. Deleted accounts drop out at
 * the query's join. Verified by CRON_SECRET; sends happen inline (cron —
 * nobody waits on the response), and one failed send never blocks the rest.
 */

export const dynamic = 'force-dynamic';

// Display-only label for a YYYY-MM-DD day key — the key IS the Vancouver
// calendar day, so pinning UTC is exact, not tz math.
const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const labelKey = (key: string) => DAY_LABEL.format(new Date(`${key}T00:00:00Z`));

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const todayKey = vancouverDayKey(new Date());
    const rows = await listOpenDueByAssignee(todayKey);
    if (rows.length === 0) return Response.json({ sent: 0, members: 0 });

    const byMember = new Map<
      string,
      { email: string; name: string; overdue: string[]; today: string[] }
    >();
    for (const row of rows) {
      const member = byMember.get(row.assigneeId) ?? {
        email: row.email,
        name: row.name,
        overdue: [],
        today: [],
      };
      const line = `  • ${row.title} — ${row.clientName ?? INTERNAL_CLIENT_LABEL} · due ${labelKey(row.dueDate)}`;
      (row.dueDate < todayKey ? member.overdue : member.today).push(line);
      byMember.set(row.assigneeId, member);
    }

    let sent = 0;
    for (const [assigneeId, member] of byMember) {
      const parts: string[] = [];
      if (member.overdue.length > 0) parts.push(`${member.overdue.length} overdue`);
      if (member.today.length > 0) parts.push(`${member.today.length} due today`);

      const sections: string[] = [];
      if (member.overdue.length > 0) {
        sections.push(`Overdue (${member.overdue.length}):`, ...member.overdue, '');
      }
      if (member.today.length > 0) {
        sections.push(`Due today (${member.today.length}):`, ...member.today, '');
      }

      const body = [
        `Hi ${member.name.split(' ')[0]},`,
        '',
        ...sections,
        `Your tasks: ${SITE_URL}/admin/tasks?assignee=${assigneeId}&sort=due`,
      ].join('\n');

      try {
        await sendMail({
          to: member.email,
          subject: `Your tasks: ${parts.join(' · ')}`,
          text: body,
        });
        sent += 1;
      } catch (error) {
        logError('[cron] reminder send failed', error, {
          recipient: member.email,
        });
      }
    }
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'due-reminders',
      action: 'send',
      summary: `Sent ${sent} due-task reminders`,
      payload: { count: sent, meta: { members: byMember.size } },
    });

    return Response.json({ sent, members: byMember.size });
  } catch (error) {
    logError('[cron] due reminders failed', error);
    return new Response('Reminders failed', { status: 500 });
  }
}
