import { and, eq, inArray } from 'drizzle-orm';

import { SITE_URL } from '@/constants';
import { db } from '@/db';
import { payrollPayments } from '@/db/schema';
import { listUnconfirmedForNudge } from '@/db/payrollQueries';
import { notifyMember } from '@/lib/notify';
import { logSystemActivity } from '@/lib/activityLog';
import { runCron } from '@/lib/cronRun';

/**
 * Daily nudge for payments nobody has confirmed receiving (vercel.json cron,
 * 16:00 UTC = 9am PDT / 8am PST — DST drift accepted, same as due-reminders).
 *
 * Chases each payment ONCE, not daily: `nudged_at` is stamped after the send, and
 * the query only picks up rows where it is still null. A re-sent payment clears
 * the stamp (see applyStatus in _actions/payroll.ts), so a genuine second attempt
 * gets chased again.
 *
 * Members with no linked account, or with self-view switched off, are excluded at
 * the query's joins — there is no point emailing someone about a page they can't
 * open.
 *
 * NO FIGURES in the body, by design: an amount in an inbox outlives the reason it
 * was sent there. Runs inside runCron (src/lib/cronRun.ts), which owns the
 * CRON_SECRET check and stamps the outcome for /admin/monitoring — the summary
 * it stamps is a count, never a figure; sends happen inline (nobody waits on
 * the response) and one failed send never blocks the rest.
 */
export const dynamic = 'force-dynamic';

/** Give the money four days to land before chasing anyone. */
const GRACE_DAYS = 4;

export async function GET(request: Request) {
  return runCron('payroll-nudge', request, async () => {
    const before = new Date(Date.now() - GRACE_DAYS * 86_400_000);
    const rows = await listUnconfirmedForNudge(before);
    if (rows.length === 0) {
      return {
        body: { sent: 0, members: 0, pushed: 0 },
        summary: 'Nothing waiting for confirmation — no nudges sent',
      };
    }

    // One email per member even when two months are outstanding.
    const byEmail = new Map<
      string,
      { userId: string; name: string; paymentIds: string[]; months: number }
    >();
    for (const row of rows) {
      const entry =
        byEmail.get(row.email) ??
        { userId: row.userId, name: row.name, paymentIds: [], months: 0 };
      entry.paymentIds.push(row.paymentId);
      entry.months += 1;
      byEmail.set(row.email, entry);
    }

    let sent = 0;
    let pushed = 0;
    const stamped: string[] = [];
    for (const [email, member] of byEmail) {
      const body = [
        `Hi ${member.name.split(' ')[0]},`,
        '',
        member.months === 1
          ? 'A payment was sent to you a few days ago and hasn’t been confirmed yet.'
          : `${member.months} payments were sent to you and haven’t been confirmed yet.`,
        '',
        'If it arrived, please confirm it. If it didn’t, report it and payroll will look into it:',
        `${SITE_URL}/admin/my-pay`,
        '',
        '— Perseus Creative Studio',
      ].join('\n');

      // The email is ALREADY figure-free by design, and the push is a strictly
      // smaller surface again: no amount, no month, and none of the words
      // "payment", "salary" or "pay" in the title — a lock screen is an
      // audience payroll's own-vs-admin projection split never contemplated.
      const result = await notifyMember({
        userId: member.userId,
        email,
        mail: {
          subject:
            member.months === 1
              ? 'Did your payment arrive?'
              : 'Did your payments arrive?',
          text: body,
        },
        push: { kind: 'payroll', months: member.months },
      });
      if (result.emailed) {
        sent += 1;
        // Stamp only what the EMAIL carried. The email is the record; a push
        // that landed without it must not silence tomorrow's retry.
        stamped.push(...member.paymentIds);
      }
      pushed += result.pushed;
    }

    // Stamp only what actually went out, so a failed send is retried tomorrow.
    if (stamped.length > 0) {
      await db
        .update(payrollPayments)
        .set({ nudgedAt: new Date() })
        .where(
          and(
            inArray(payrollPayments.id, stamped),
            // Don't stamp a row that got confirmed while we were emailing.
            eq(payrollPayments.status, 'sent'),
          ),
        );
    }

    // Count only — a nudge is about unconfirmed payments, and no figure
    // from that domain ever reaches activity_log.
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'payroll-nudge',
      action: 'send',
      summary: `Sent ${sent} payment-confirmation nudges`,
      payload: { count: sent, meta: { members: byEmail.size, pushed } },
    });

    return {
      body: { sent, members: byEmail.size, pushed },
      summary: `Sent ${sent} ${sent === 1 ? 'nudge' : 'nudges'} to ${byEmail.size} ${byEmail.size === 1 ? 'person' : 'people'}`,
      warnings:
        sent < byEmail.size ? [`${byEmail.size - sent} nudge emails failed`] : [],
    };
  });
}
