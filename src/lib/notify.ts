import 'server-only';

import { sendMail, type MailAttachment } from '@/lib/mail';
import { sendToUser } from '@/lib/push';
import { logError } from '@/lib/log';
import { recordDependencyFailure } from '@/lib/monitoringRecord';
import type { PushNotice } from '@/lib/pushFields';

/**
 * THE door for telling a member something.
 *
 * `mail.ts` owns Resend and `push.ts` owns Web Push; this composes them, and it
 * exists for one reason: **the two channels must never disagree about who was
 * told.** Before it, every notification site called sendMail and then, maybe,
 * sendToUser — two lists, two loops, two chances for a recipient to appear in
 * one and not the other. Here there is one call per person, so a divergence is
 * not something you can forget to prevent; there is nowhere for it to happen.
 *
 * ── THE EMAIL IS THE RECORD, THE PUSH IS THE INTERRUPT ──────────────────────
 *
 * They deliberately say DIFFERENT things, and that difference is a privacy
 * control rather than a style choice. The email carries the detail — task
 * titles, client names, the full list — because an inbox needs an unlocked
 * device and an authenticated account. The push carries counts and fixed
 * sentences only, because it renders on a LOCKED SCREEN, an audience wider
 * than /admin/logs. That is enforced by the type: `push` is a PushNotice, and
 * there is no parameter anywhere in this signature that accepts a title or a
 * body for the notification (see src/lib/pushFields.ts).
 *
 * ── BEING SIGNED OUT DOES NOT SUPPRESS A PUSH, AND SHOULD NOT ───────────────
 *
 * A push subscription is a capability granted to a BROWSER, not to a session.
 * It survives the 24-hour idle window, and there is no session to consult at
 * send time — the cron runs at 15:00 whether or not anyone is looking. Trying
 * to gate on "is this person currently signed in" would be both impossible
 * (nothing is signed in at 3am) and wrong: a reminder is most useful precisely
 * when the dashboard is closed.
 *
 * Nothing leaks by pushing to a signed-out device, because the payload is
 * counts and fixed sentences. And the deep link already handles the rest: the
 * notification points at an /admin path, `src/proxy.ts` bounces a sessionless
 * request to /admin/login?next=<that path>, and after signing in the member
 * lands exactly where the notification pointed. So "show it after they log in"
 * is already the behaviour — it is the return-path work from the session
 * change, reused.
 *
 * What DOES stop a push is the account being gone: `push_subscriptions`
 * cascades on user deletion, so offboarding silences that person's devices in
 * the same statement.
 *
 * ── FAILURE IS PER-CHANNEL ──────────────────────────────────────────────────
 *
 * Each channel gets its own try/catch: a dead push endpoint must never swallow
 * the fact that the email went, and a Resend outage must not stop the phones.
 * Callers get back what actually happened rather than a throw, because every
 * caller here is a cron or an after() — nobody is waiting on the response, and
 * one member's bad address must not abort the loop.
 */

export type NotifyResult = { emailed: boolean; pushed: number };

export async function notifyMember({
  userId,
  email,
  mail,
  push,
}: {
  /**
   * The member's account id, or null for an address with no account behind it
   * (in which case only the email is sent). Never a list — this door is one
   * call per person on purpose.
   */
  userId: string | null;
  email: string;
  mail: { subject: string; text: string };
  /** Omit to send email only — some notices genuinely have no push twin. */
  push?: PushNotice;
}): Promise<NotifyResult> {
  let emailed = false;
  let pushed = 0;

  try {
    await sendMail({ to: email, subject: mail.subject, text: mail.text });
    emailed = true;
  } catch (error) {
    // `recipient` is an email address, which the activity-log denylist would
    // refuse — but this is stdout diagnostics, not an audit row, and knowing
    // WHICH address bounced is the whole value of the line. The monitoring
    // signal beside it carries the error's CODE name and nothing else:
    // recordDependencyFailure takes no context, by design.
    logError('[notify] email failed', error, {
      event: 'notify.email.failed',
      recipient: email,
    });
    recordDependencyFailure('email', error);
  }

  if (push && userId) {
    try {
      pushed = await sendToUser(userId, push);
    } catch (error) {
      logError('[notify] push failed', error, {
        event: 'notify.push.failed',
        kind: push.kind,
      });
      recordDependencyFailure('push', error);
    }
  }

  return { emailed, pushed };
}

/**
 * The same contract for a notice that goes to a GROUP — the weekly digest, a
 * new ticket landing with the superadmins.
 *
 * The email is sent once to every address (so the thread reads as one message
 * rather than N copies), while the push is per person, because a subscription
 * belongs to a device. Both halves are driven from the SAME recipient list,
 * which is the point: a person cannot be on one and off the other.
 */
export async function notifyGroup({
  recipients,
  mail,
  push,
}: {
  recipients: { id: string; email: string }[];
  mail: {
    subject: string;
    text: string;
    replyTo?: string;
    /** The ticket screenshot. Only ever an EMAIL concern — a notification
     *  cannot carry one, and would not want to. */
    attachments?: MailAttachment[];
  };
  push?: PushNotice;
}): Promise<NotifyResult> {
  if (recipients.length === 0) return { emailed: false, pushed: 0 };

  let emailed = false;
  let pushed = 0;

  try {
    await sendMail({
      to: recipients.map((r) => r.email),
      subject: mail.subject,
      text: mail.text,
      replyTo: mail.replyTo,
      attachments: mail.attachments,
    });
    emailed = true;
  } catch (error) {
    logError('[notify] group email failed', error, {
      event: 'notify.email.failed',
      recipients: recipients.length,
    });
    recordDependencyFailure('email', error);
  }

  if (push) {
    for (const r of recipients) {
      // A recipient with no account id is a plain address (a shared inbox used
      // as a fallback) — there is nobody to push to, and that is not an error.
      if (!r.id) continue;
      try {
        pushed += await sendToUser(r.id, push);
      } catch (error) {
        logError('[notify] group push failed', error, {
          event: 'notify.push.failed',
          kind: push.kind,
        });
        recordDependencyFailure('push', error);
      }
    }
  }

  return { emailed, pushed };
}
