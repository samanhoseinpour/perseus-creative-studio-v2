import { SITE_URL } from '@/constants';
import { listOpenDueByAssignee } from '@/db/taskQueries';
import { notifyMember } from '@/lib/notify';
import { INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { dayKeyIn, resolveZone, shiftDayKey, STUDIO_TZ } from '@/lib/calendar';
import { logSystemActivity } from '@/lib/activityLog';
import { runCron } from '@/lib/cronRun';

/**
 * Daily due-date reminders (vercel.json cron, 15:00 UTC = 8am PDT / 7am PST —
 * DST drift accepted). Each member with overdue or due-today assignments
 * gets ONE plain-text email listing them, deep-linked to their filtered
 * task list; members with nothing get nothing. Deleted accounts drop out at
 * the query's join. Runs inside runCron (src/lib/cronRun.ts), which owns the
 * CRON_SECRET check and stamps the outcome for /admin/monitoring; sends
 * happen inline (cron — nobody waits on the response), and one failed send
 * never blocks the rest.
 *
 * "Today" is EACH MEMBER'S today, resolved from their own stored zone — the
 * whole point of the email is to say what is due for the person reading it,
 * and the team spans Vancouver and Tehran. The send TIME is unchanged and
 * global; only the overdue/due-today split is per member.
 */

export const dynamic = 'force-dynamic';

// Display-only label for a YYYY-MM-DD day key. The key is a calendar value
// with no instant behind it, so pinning UTC is exact — not tz math.
const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const labelKey = (key: string) => DAY_LABEL.format(new Date(`${key}T00:00:00Z`));

export async function GET(request: Request) {
  return runCron('due-reminders', request, async () => {
    const now = new Date();
    // One read wide enough to cover every member's today: the furthest-ahead
    // zone can already be on tomorrow's date while studio time is still on
    // yesterday's, so the bound is studio-today + 1 and each member's own zone
    // narrows it below. Rows past a given member's today are simply skipped.
    const rows = await listOpenDueByAssignee(
      shiftDayKey(dayKeyIn(STUDIO_TZ, now), 1),
    );
    if (rows.length === 0) {
      return {
        body: { sent: 0, members: 0, pushed: 0 },
        summary: 'Nothing due — no reminders sent',
      };
    }

    const byMember = new Map<
      string,
      { email: string; name: string; overdue: string[]; today: string[] }
    >();
    for (const row of rows) {
      // The member's own clock decides overdue vs due-today vs not-yet — the
      // fold-in-JS rule, which is exactly why the query bound is loose.
      const todayKey = dayKeyIn(resolveZone(row.timezone), now);
      if (row.dueDate > todayKey) continue;
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
    if (byMember.size === 0) {
      return {
        body: { sent: 0, members: 0, pushed: 0 },
        summary: 'Nothing due in anyone’s own timezone — no reminders sent',
      };
    }

    let sent = 0;
    let pushed = 0;
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

      // ONE call per member, so the email and the push cannot end up with
      // different recipient lists. The email carries the task TITLES; the push
      // carries counts only, because a title in this studio routinely IS a
      // client name and a notification renders on a lock screen.
      const result = await notifyMember({
        userId: assigneeId,
        email: member.email,
        mail: { subject: `Your tasks: ${parts.join(' · ')}`, text: body },
        push: {
          kind: 'due',
          overdue: member.overdue.length,
          today: member.today.length,
        },
      });
      if (result.emailed) sent += 1;
      pushed += result.pushed;
    }
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'due-reminders',
      action: 'send',
      summary: `Sent ${sent} due-task reminders`,
      // `count` stays the EMAIL count — it is the record, and changing what
      // that number means would silently rewrite the history of this cron.
      // Push rides along in meta.
      payload: { count: sent, meta: { members: byMember.size, pushed } },
    });

    return {
      body: { sent, members: byMember.size, pushed },
      summary: `Sent ${sent} ${sent === 1 ? 'reminder' : 'reminders'} to ${byMember.size} ${byMember.size === 1 ? 'person' : 'people'}`,
      warnings:
        sent < byMember.size
          ? [`${byMember.size - sent} reminder emails failed`]
          : [],
    };
  });
}
