'use server';

/**
 * Write actions for the admin bug tickets. Reads live in `@/db/ticketQueries`.
 *
 * SECURITY: the protected layout's `requireAdmin()` guard does NOT wrap server
 * actions — `createTicket` re-checks the session itself (any signed-in admin
 * user may report), and `setTicketStatus` goes through
 * `requirePrivilegedAdmin()` (only the allow-list may triage). Ids are
 * shape-validated before touching Postgres so a malformed one can't 500 on
 * the uuid cast.
 *
 * Order in `createTicket` mirrors `submitContact`: validate → store → notify.
 * The DB row is the source of truth — a failed notification email must never
 * lose a captured ticket, so the Resend send happens last and its failure only
 * leaves `email_sent = false`.
 */
import { eq } from 'drizzle-orm';
import { del, put } from '@vercel/blob';
import { Resend } from 'resend';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { tickets } from '@/db/schema';
import { SITE_URL } from '@/constants';
import { requireAdmin } from '@/lib/adminSession';
import { PRIVILEGED_ADMINS, requirePrivilegedAdmin } from '@/lib/adminAccess';
import { flattenIssues } from '@/lib/contactSchema';
import { ticketFromFormData, ticketSchema } from '@/lib/ticketSchema';
import {
  SCREENSHOT_BAD_TYPE,
  SCREENSHOT_MIME,
  screenshotProblem,
  sniffScreenshotKind,
  ticketAreaLabel,
  TICKET_SEVERITY_LABELS,
  TICKET_STATUS_SLUGS,
  type ScreenshotKind,
  type TicketStatusSlug,
} from '@/lib/ticketFields';

const NOTIFY_FROM = 'Perseus Creative Studio <forms@perseustudio.com>';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateTicketResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type TicketActionResult = { ok: true } | { ok: false; error: string };

export async function createTicket(
  formData: FormData,
): Promise<CreateTicketResult> {
  const { user } = await requireAdmin();

  try {
    const parsed = ticketSchema.safeParse(ticketFromFormData(formData));
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenIssues(parsed.error),
      };
    }
    const data = parsed.data;

    // Screenshot is optional; when present, the magic-byte sniff (not the
    // filename) decides the stored extension and content-type.
    let screenshot: File | null = null;
    let screenshotKind: ScreenshotKind | null = null;
    const file = formData.get('screenshot');
    if (file instanceof File && file.size > 0) {
      const problem = screenshotProblem(file);
      if (problem) {
        return { ok: false, error: 'validation', issues: { screenshot: problem } };
      }
      screenshotKind = await sniffScreenshotKind(file);
      if (!screenshotKind) {
        return {
          ok: false,
          error: 'validation',
          issues: { screenshot: SCREENSHOT_BAD_TYPE },
        };
      }
      screenshot = file;
    }

    // Private storage: no public URL. Authorized viewers stream it via
    // /admin/tickets/[id]/screenshot; the notification email attaches it.
    let screenshotPath: string | undefined;
    if (screenshot && screenshotKind) {
      const blob = await put(
        `tickets/${crypto.randomUUID()}.${screenshotKind}`,
        screenshot,
        {
          access: 'private',
          addRandomSuffix: true,
          contentType: SCREENSHOT_MIME[screenshotKind],
        },
      );
      screenshotPath = blob.pathname;
    }

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(tickets)
        .values({
          reporterId: user.id,
          reporterName: user.name,
          reporterEmail: user.email,
          title: data.title,
          description: data.description,
          severity: data.severity,
          area: data.area,
          screenshotPath,
        })
        .returning({ id: tickets.id });
    } catch (dbError) {
      // Don't strand an orphaned screenshot when the row never landed.
      if (screenshotPath) await del(screenshotPath).catch(() => {});
      throw dbError;
    }
    const id = inserted[0].id;

    // Notify — isolated so an email failure can't fail the stored ticket.
    // Collapse whitespace in the user-supplied title so it can't distort the
    // subject line.
    const safeTitle = data.title.replace(/\s+/g, ' ');
    const subject = `[Ticket] ${TICKET_SEVERITY_LABELS[data.severity]} — ${safeTitle}`;
    const body = [
      'New admin bug ticket',
      '',
      `Reporter: ${user.name} <${user.email}>`,
      `Area: ${ticketAreaLabel(data.area)}`,
      `Severity: ${TICKET_SEVERITY_LABELS[data.severity]}`,
      screenshot ? 'Screenshot: attached' : null,
      '',
      data.description,
      '',
      `Triage: ${SITE_URL}/admin/tickets/${id}`,
    ]
      .filter((l): l is string => l !== null)
      .join('\n');

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: NOTIFY_FROM,
        to: PRIVILEGED_ADMINS,
        replyTo: user.email,
        subject,
        text: body,
        attachments: screenshot
          ? [
              {
                filename:
                  screenshot.name.replace(/[^\w.-]+/g, '_').slice(0, 80) ||
                  `screenshot.${screenshotKind}`,
                content: Buffer.from(await screenshot.arrayBuffer()),
              },
            ]
          : undefined,
      });
      if (error) throw error;
      await db.update(tickets).set({ emailSent: true }).where(eq(tickets.id, id));
    } catch (emailError) {
      // Row is stored; email_sent stays false.
      console.error('[tickets] notification email failed', emailError);
    }

    revalidatePath('/admin', 'layout');
    return { ok: true, id };
  } catch (error) {
    console.error('[tickets] createTicket failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Move a ticket between open / pending / closed. Triagers only. */
export async function setTicketStatus(
  id: string,
  status: TicketStatusSlug,
): Promise<TicketActionResult> {
  await requirePrivilegedAdmin('/admin/tickets');
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid ticket.' };
  if (!TICKET_STATUS_SLUGS.includes(status)) {
    return { ok: false, error: 'Invalid status.' };
  }

  try {
    await db
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id));
  } catch (error) {
    console.error('[tickets] setTicketStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
