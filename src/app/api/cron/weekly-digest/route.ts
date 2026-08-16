import { SITE_URL } from '@/constants';
import { taskAreaEmails } from '@/db/adminQueries';
import { listRecentDone } from '@/db/taskQueries';
import { sendMail } from '@/lib/mail';
import { INTERNAL_CLIENT_LABEL, formatMinutes } from '@/lib/taskFields';
import {
  shiftDayKey,
  vancouverDayKey,
  vancouverDayStart,
} from '@/lib/taskFilters';

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
    const todayKey = vancouverDayKey(new Date());
    // Weekday of the Vancouver calendar day (0 = Sunday) → this week's Monday.
    const dow = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
    const thisMonday = shiftDayKey(todayKey, -((dow + 6) % 7));
    const weekStart = shiftDayKey(thisMonday, -7);

    const rows = await listRecentDone({
      since: vancouverDayStart(weekStart),
      until: vancouverDayStart(thisMonday),
      limit: 500,
    });
    if (rows.length === 0) {
      return Response.json({ sent: false, reason: 'nothing completed last week' });
    }

    const recipients = await taskAreaEmails();
    if (recipients.length === 0) {
      return Response.json({ sent: false, reason: 'no recipients' });
    }

    // Fold by member, minutes-desc — the in-app digest's shape.
    const members = new Map<
      string,
      { name: string; minutes: number; lines: string[] }
    >();
    let totalMinutes = 0;
    for (const row of rows) {
      const minutes = row.actualMinutes ?? row.estimatedMinutes;
      totalMinutes += minutes;
      const key = row.assigneeId ?? `name:${row.assigneeName}`;
      const member = members.get(key) ?? {
        name: row.assigneeName,
        minutes: 0,
        lines: [],
      };
      member.minutes += minutes;
      member.lines.push(
        `  • ${row.title} — ${row.clientName ?? INTERNAL_CLIENT_LABEL} · ${formatMinutes(minutes)}`,
      );
      members.set(key, member);
    }

    const rangeLabel = `${labelKey(weekStart)} – ${labelKey(shiftDayKey(thisMonday, -1))}`;
    const body = [
      `Perseus weekly digest — ${rangeLabel}`,
      '',
      `${rows.length} task${rows.length === 1 ? '' : 's'} · ${formatMinutes(totalMinutes)} delivered`,
      '',
      ...[...members.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .flatMap((m) => [`${m.name} — ${formatMinutes(m.minutes)}`, ...m.lines, '']),
      `Full log: ${SITE_URL}/admin/tasks?status=done`,
    ].join('\n');

    await sendMail({
      to: recipients,
      subject: `Perseus weekly digest — ${rangeLabel}`,
      text: body,
    });
    return Response.json({
      sent: true,
      tasks: rows.length,
      recipients: recipients.length,
    });
  } catch (error) {
    console.error('[cron] weekly digest failed', error);
    return new Response('Digest failed', { status: 500 });
  }
}
