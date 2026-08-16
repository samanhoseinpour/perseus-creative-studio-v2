import 'server-only';

import { Resend } from 'resend';

/**
 * The one Resend door. Senders used to construct their own client and
 * duplicate the from-address strings at three call sites (auth reset, contact
 * notification, ticket notification) — those are migrated here, and every new
 * sender (weekly digest, due reminders, assignment pings) goes through this
 * module. Plain-text bodies only — the house email style; there is no HTML
 * template layer on purpose.
 */

/** Notification sends (contact, tickets, task emails). */
export const NOTIFY_FROM = 'Perseus Creative Studio <forms@perseustudio.com>';
/** Transactional auth sends (password reset). */
export const AUTH_EMAIL_FROM =
  'Perseus Creative Studio <no-reply@perseustudio.com>';

export type MailAttachment = { filename: string; content: Buffer };

/**
 * Send one plain-text email. Throws on transport AND API-level failure (the
 * raw SDK resolves with `{ error }` — swallowing that silently killed sends
 * before the `if (error) throw` idiom). Callers decide severity: row-backed
 * notifications catch + log and leave their `email_sent` flag false.
 */
export async function sendMail({
  from = NOTIFY_FROM,
  to,
  subject,
  text,
  replyTo,
  attachments,
}: {
  from?: string;
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    ...(replyTo ? { replyTo } : {}),
    ...(attachments ? { attachments } : {}),
  });
  if (error) throw error;
}
