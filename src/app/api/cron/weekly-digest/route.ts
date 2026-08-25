import { SITE_URL } from '@/constants';
import { taskAreaRecipients } from '@/db/adminQueries';
import { listRecentDone } from '@/db/taskQueries';
import { notifyGroup } from '@/lib/notify';
import { INTERNAL_CLIENT_LABEL, formatMinutes } from '@/lib/taskFields';
import { logSystemActivity } from '@/lib/activityLog';
import { logError } from '@/lib/log';
import {
  dayKeyIn,
  dayStartIn,
  shiftDayKey,
  STUDIO_TZ,
} from '@/lib/calendar';

/**
 * Monday-morning studio digest (vercel.json cron, 15:00 UTC = 8am PDT /
 * 7am PST — DST drift accepted). One plain-text email to every tasks-area
 * member covering the PREVIOUS Vancouver Mon–Sun week — the exact week, not
 * a rolling 7 days, so Monday-morning work never leaks in and a late send
 * never drops Sunday. Verified by CRON_SECRET (Vercel attaches it as a
 * Bearer header when the env var is set); sends happen inline — nobody is
 * waiting on this response, so after() would buy nothing.
 */

export const dynamic = 'force-dynamic';

// Display-only label for a YYYY-MM-DD day key ('Aug 4'). The key already IS
// the Vancouver calendar day, so pinning UTC here is exact, not tz math.
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
    // STUDIO_TZ, not a viewer's: this is one studio Mon–Sun week emailed to
    // everybody, so the window must be identical in every copy.
    const todayKey = dayKeyIn(STUDIO_TZ, new Date());
    // Weekday of the Vancouver calendar day (0 = Sunday) → this week's Monday.
    const dow = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
    const thisMonday = shiftDayKey(todayKey, -((dow + 6) % 7));
    const weekStart = shiftDayKey(thisMonday, -7);

    const rows = await listRecentDone({
      since: dayStartIn(STUDIO_TZ, weekStart),
      until: dayStartIn(STUDIO_TZ, thisMonday),
      limit: 500,
    });
    if (rows.length === 0) {
      return Response.json({ sent: false, reason: 'nothing completed last week' });
    }

    const recipients = await taskAreaRecipients();
    if (recipients.length === 0) {
      return Response.json({ sent: false, reason: 'no recipients' });
    }

    // Fold by member, minutes-desc — the in-app digest's shape.
    const members = new Map<
      string,
      { name: string; minutes: number; lines: string[] }
    >();
    let totalMinutes = 0;
    let delivered = 0;
    let revisions = 0;
    for (const row of rows) {
      const minutes = row.actualMinutes ?? row.estimatedMinutes;
      totalMinutes += minutes;
      // Minutes take every row; the headline counts split. A revision line is
      // marked so a reader scanning the week can see a round of notes for what
      // it is rather than reading it as a second delivery.
      const isRevision = row.parentId !== null;
      if (isRevision) revisions += 1;
      else delivered += 1;
      const key = row.assigneeId ?? `name:${row.assigneeName}`;
      const member = members.get(key) ?? {
        name: row.assigneeName,
        minutes: 0,
        lines: [],
      };
      member.minutes += minutes;
      member.lines.push(
        `  ${isRevision ? '↳ revision:' : '•'} ${row.title} — ${row.clientName ?? INTERNAL_CLIENT_LABEL} · ${formatMinutes(minutes)}`,
      );
      members.set(key, member);
    }

    const rangeLabel = `${labelKey(weekStart)} – ${labelKey(shiftDayKey(thisMonday, -1))}`;
    const body = [
      `Perseus weekly digest — ${rangeLabel}`,
      '',
      `${delivered} task${delivered === 1 ? '' : 's'}` +
        (revisions > 0
          ? ` · ${revisions} revision${revisions === 1 ? '' : 's'}`
          : '') +
        ` · ${formatMinutes(totalMinutes)} delivered`,
      '',
      ...[...members.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .flatMap((m) => [`${m.name} — ${formatMinutes(m.minutes)}`, ...m.lines, '']),
      `Full log: ${SITE_URL}/admin/tasks?status=done`,
    ].join('\n');

    // One door, so the digest email and its push twin are driven from the
    // SAME recipient list — nobody can be on one and off the other. The email
    // carries the per-member breakdown and every task title; the push carries
    // two counts, because it lands on a lock screen.
    const delivery = await notifyGroup({
      recipients,
      mail: { subject: `Perseus weekly digest — ${rangeLabel}`, text: body },
      push: { kind: 'digest', tasks: delivered, members: members.size },
    });
    // A cron leaves no other trace. "The Monday digest silently stopped
    // three weeks ago" is invisible to every signal this app has — an
    // activity row per run makes the ABSENCE of a run visible on /admin/logs.
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'weekly-digest',
      action: 'send',
      summary: `Sent the weekly digest to ${recipients.length} people`,
      payload: {
        count: rows.length,
        meta: { recipients: recipients.length, pushed: delivery.pushed },
      },
    });

    return Response.json({
      sent: delivery.emailed,
      tasks: rows.length,
      recipients: recipients.length,
      pushed: delivery.pushed,
    });
  } catch (error) {
    logError('[cron] weekly digest failed', error);
    return new Response('Digest failed', { status: 500 });
  }
}
