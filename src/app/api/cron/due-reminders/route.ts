import { SITE_URL } from '@/constants';
import { listOpenDueByAssignee } from '@/db/taskQueries';
import { sendMail } from '@/lib/mail';
import { sendToUser } from '@/lib/push';
import { INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { dayKeyIn, resolveZone, shiftDayKey, STUDIO_TZ } from '@/lib/calendar';
import { logSystemActivity } from '@/lib/activityLog';
import { logError } from '@/lib/log';

/**
 * Daily due-date reminders (vercel.json cron, 15:00 UTC = 8am PDT / 7am PST —
 * DST drift accepted). Each member with overdue or due-today assignments
 * gets ONE plain-text email listing them, deep-linked to their filtered
 * task list; members with nothing get nothing. Deleted accounts drop out at
 * the query's join. Verified by CRON_SECRET; sends happen inline (cron —
 * nobody waits on the response), and one failed send never blocks the rest.
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
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    // One read wide enough to cover every member's today: the furthest-ahead
    // zone can already be on tomorrow's date while studio time is still on
    // yesterday's, so the bound is studio-today + 1 and each member's own zone
    // narrows it below. Rows past a given member's today are simply skipped.
    const rows = await listOpenDueByAssignee(
      shiftDayKey(dayKeyIn(STUDIO_TZ, now), 1),
    );
    if (rows.length === 0) {
      return Response.json({ sent: 0, members: 0, pushed: 0 });
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
      return Response.json({ sent: 0, members: 0, pushed: 0 });
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

      // Push SUPPLEMENTS the email; it never replaces it. Push is structurally
      // unreliable — iOS needs the app installed, permission can be revoked,
      // subscriptions expire, a phone can be off — so the email stays the
      // RECORD and the push is only the interrupt.
      //
      // That split is also what keeps this private: the email lists the task
      // titles because an inbox needs an unlocked device and an authenticated
      // account, while the notification carries COUNTS ONLY. A task title in
      // this studio routinely IS a client name, so a body listing them would
      // put the client roster on a lock screen. sendToUser cannot be handed a
      // title even by mistake — see src/lib/pushFields.ts.
      //
      // Its own try/catch, like the mail send: one member's dead endpoint must
      // not abort the loop.
      try {
        pushed += await sendToUser(assigneeId, {
          kind: 'due',
          overdue: member.overdue.length,
          today: member.today.length,
        });
      } catch (error) {
        logError('[cron] reminder push failed', error);
      }
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

    return Response.json({ sent, members: byMember.size, pushed });
  } catch (error) {
    logError('[cron] due reminders failed', error);
    return new Response('Reminders failed', { status: 500 });
  }
}
