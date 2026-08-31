import 'server-only';

import { Resend } from 'resend';

/**
 * The one Resend door. Senders used to construct their own client and
 * duplicate the from-address strings at three call sites (auth reset, contact
 * notification, ticket notification) — those are migrated here, and every new
 * sender (weekly digest, due reminders, assignment pings) goes through this
 * module.
 *
 * ── TEXT IS MANDATORY, HTML IS OPTIONAL, AND THEY MUST AGREE ────────────────
 *
 * This was plain-text only for most of the app's life, and for every sender but
 * one it still is: a transactional single-link email is best served plain, and
 * eleven bodies in two renderings is eleven chances for the two to drift.
 *
 * The weekly digest earned the exception, because a studio's Monday letter to
 * itself is the one email that is READ rather than acted on. So `html` is an
 * optional SECOND rendering of a message `text` already carries in full. Both
 * halves ship together as multipart/alternative and the client picks, which
 * means a recipient whose client refuses HTML loses nothing.
 *
 * The rule that keeps them honest is not in this file: a sender passing both
 * must derive them from ONE fold (src/lib/digestEmail.ts returns
 * `{ subject, text, html }` from a single pass) rather than writing each by
 * hand. Never add an `html` without its `text`.
 */

/** Notification sends (contact, tickets, task emails). */
export const NOTIFY_FROM = 'Perseus Creative Studio <forms@perseustudio.com>';
/** Transactional auth sends (password reset). */
export const AUTH_EMAIL_FROM =
  'Perseus Creative Studio <no-reply@perseustudio.com>';

export type MailAttachment = { filename: string; content: Buffer };

/**
 * Send one email. Throws on transport AND API-level failure (the
 * raw SDK resolves with `{ error }` — swallowing that silently killed sends
 * before the `if (error) throw` idiom). Callers decide severity: row-backed
 * notifications catch + log and leave their `email_sent` flag false.
 */
export async function sendMail({
  from = NOTIFY_FROM,
  to,
  subject,
  text,
  html,
  replyTo,
  attachments,
}: {
  from?: string;
  to: string | string[];
  subject: string;
  /** Always required, even alongside `html` — it is the multipart fallback. */
  text: string;
  /** An optional second rendering of the SAME message. See the note above. */
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(attachments ? { attachments } : {}),
  });
  if (error) throw error;
}
