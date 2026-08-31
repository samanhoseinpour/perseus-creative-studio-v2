import { SITE_URL } from '@/constants';
import { taskAreaRecipients } from '@/db/adminQueries';
import { listRecentDone } from '@/db/taskQueries';
import { notifyGroup } from '@/lib/notify';
import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  splitMinutesAcross,
} from '@/lib/taskFields';
import { logSystemActivity } from '@/lib/activityLog';
import { runCron } from '@/lib/cronRun';
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
 * never drops Sunday. Runs inside runCron (src/lib/cronRun.ts), which owns
 * the CRON_SECRET check and stamps the run's outcome for /admin/monitoring;
 * sends happen inline — nobody is waiting on this response, so after() would
 * buy nothing.
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
  return runCron('weekly-digest', request, async () => {
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
      return {
        body: { sent: false, reason: 'nothing completed last week' },
        summary: 'Nothing completed last week, so no digest sent',
      };
    }

    const recipients = await taskAreaRecipients();
    if (recipients.length === 0) {
      return {
        body: { sent: false, reason: 'no recipients' },
        summary: 'Nobody holds the tasks area. No digest sent',
      };
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
      // The headline above counted this row ONCE; the per-member sections
      // below list it under everyone who worked it, with the hours split so
      // the sections still add up to the week's real total.
      const shares = splitMinutesAcross(minutes, row.assignees.length);
      row.assignees.forEach((who, i) => {
        const key = who.id ?? `name:${who.name}`;
        const member = members.get(key) ?? {
          name: who.name,
          minutes: 0,
          lines: [],
        };
        member.minutes += shares[i];
        member.lines.push(
          `  ${isRevision ? '↳ revision:' : '•'} ${row.title} · ${row.clientName ?? INTERNAL_CLIENT_LABEL} · ${formatMinutes(shares[i])}${row.assignees.length > 1 ? ` (shared, ${formatMinutes(minutes)} total)` : ''}`,
        );
        members.set(key, member);
      });
    }

    const rangeLabel = `${labelKey(weekStart)} – ${labelKey(shiftDayKey(thisMonday, -1))}`;
    const body = [
      `Perseus weekly digest: ${rangeLabel}`,
      '',
      `${delivered} task${delivered === 1 ? '' : 's'}` +
        (revisions > 0
          ? ` · ${revisions} revision${revisions === 1 ? '' : 's'}`
          : '') +
        ` · ${formatMinutes(totalMinutes)} delivered`,
      '',
      ...[...members.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .flatMap((m) => [`${m.name}: ${formatMinutes(m.minutes)}`, ...m.lines, '']),
      // The ALL tab, not ?status=done: the digest above counts every shipped
      // stage, so a link filtered to Done alone would show fewer tasks than
      // the email it sits under.
      `Full log: ${SITE_URL}/admin/tasks?status=all`,
    ].join('\n');

    // One door, so the digest email and its push twin are driven from the
    // SAME recipient list — nobody can be on one and off the other. The email
    // carries the per-member breakdown and every task title; the push carries
    // two counts, because it lands on a lock screen.
    const delivery = await notifyGroup({
      recipients,
      mail: { subject: `Perseus weekly digest: ${rangeLabel}`, text: body },
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

    return {
      body: {
        sent: delivery.emailed,
        tasks: rows.length,
        recipients: recipients.length,
        pushed: delivery.pushed,
      },
      summary: delivery.emailed
        ? `Sent the digest to ${recipients.length} people · ${rows.length} tasks`
        : 'The digest email did not send',
      warnings: delivery.emailed ? [] : ['digest email failed'],
    };
  });
}
