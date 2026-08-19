'use server';

/**
 * Write actions for the admin bug tickets. Reads live in `@/db/ticketQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions —
 * `createTicket` gates itself on the tickets area (`requireArea`), and
 * `setTicketStatus` goes through `requireSuperadmin()` (only superadmins
 * triage). Ids are shape-validated before touching Postgres so a malformed
 * one can't 500 on the uuid cast.
 *
 * Order in `createTicket` mirrors `submitContact`: validate → store → notify.
 * The DB row is the source of truth — a failed notification email must never
 * lose a captured ticket, so the Resend send happens last and its failure only
 * leaves `email_sent = false`.
 */
import { eq } from 'drizzle-orm';
import { del, put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import { db } from '@/db';
import { tickets } from '@/db/schema';
import { SITE_URL } from '@/constants';
import { requireArea, requireSuperadmin } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { superadminEmails } from '@/db/adminQueries';
import { sendMail } from '@/lib/mail';
import { flattenIssues } from '@/lib/contactSchema';
import { ticketFromFormData, ticketSchema } from '@/lib/ticketSchema';
import { logError } from '@/lib/log';
import {
  MAX_SCREENSHOT_PIXELS,
  SCREENSHOT_BAD_TYPE,
  SCREENSHOT_MIME,
  SCREENSHOT_TOO_LARGE,
  screenshotProblem,
  sniffImageDimensions,
  sniffScreenshotKind,
  ticketAreaLabel,
  TICKET_SEVERITY_LABELS,
  TICKET_STATUS_SLUGS,
  type ScreenshotKind,
  type TicketStatusSlug,
} from '@/lib/ticketFields';

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
  const profile = await requireArea('tickets', '/admin');
  const { user } = profile.session;

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
      // Decompression-bomb gate: the byte cap doesn't bound decode cost, and
      // the client reduce step that honestly caps dimensions is skipped by a
      // direct action invocation — re-derive them from the header here.
      const dims = await sniffImageDimensions(file, screenshotKind);
      if (!dims) {
        return {
          ok: false,
          error: 'validation',
          issues: { screenshot: SCREENSHOT_BAD_TYPE },
        };
      }
      if (dims.width * dims.height > MAX_SCREENSHOT_PIXELS) {
        return {
          ok: false,
          error: 'validation',
          issues: { screenshot: SCREENSHOT_TOO_LARGE },
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

    // Materialize the attachment while the request is alive — the File is only
    // readable inside the action — then hand the rest off.
    const attachments = screenshot
      ? [
          {
            filename:
              screenshot.name.replace(/[^\w.-]+/g, '_').slice(0, 80) ||
              `screenshot.${screenshotKind}`,
            content: Buffer.from(await screenshot.arrayBuffer()),
          },
        ]
      : undefined;

    // Notification only: the ticket is committed. This used to make the reporter
    // wait on a recipients lookup + Resend + a second write before the form
    // returned. `after()` runs it once the response is out; failure handling is
    // unchanged (email_sent stays false).
    after(async () => {
      try {
        // Triage notifications go to whoever holds the superadmin role NOW —
        // the DB query replaced the retired PRIVILEGED_ADMINS constant.
        const recipients = await superadminEmails();
        if (recipients.length === 0) {
          throw new Error('no superadmin recipients — skipping notification');
        }
        await sendMail({
          to: recipients,
          replyTo: user.email,
          subject,
          text: body,
          attachments,
        });
        await db
          .update(tickets)
          .set({ emailSent: true })
          .where(eq(tickets.id, id));
        // The detail page schedules one re-read once the send verdict is in
        // (TicketEmailStatusRefresh); drop the router-cache entry so that read
        // sees this row rather than the pre-send snapshot.
        revalidatePath(`/admin/tickets/${id}`);
      } catch (emailError) {
        // Row is stored; email_sent stays false.
        logError('[tickets] notification email failed', emailError);
      }
    });

    logActivity(profile, {
      area: 'tickets',
      entity: 'ticket',
      entityId: id,
      entityName: safeTitle,
      action: 'create',
      summary: `Raised the ticket "${safeTitle}"`,
      // description is omitted (and denylisted): a ticket body is free text a
      // reporter may paste anything into, including a token from a stack trace.
      payload: {
        meta: {
          severity: data.severity,
          ticketArea: data.area,
          hasScreenshot: Boolean(screenshotPath),
        },
      },
    });

    revalidatePath('/admin', 'layout');
    return { ok: true, id };
  } catch (error) {
    logError('[tickets] createTicket failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Move a ticket between open / pending / closed. Superadmins only. */
export async function setTicketStatus(
  id: string,
  status: TicketStatusSlug,
): Promise<TicketActionResult> {
  const profile = await requireSuperadmin('/admin/tickets');
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid ticket.' };
  if (!TICKET_STATUS_SLUGS.includes(status)) {
    return { ok: false, error: 'Invalid status.' };
  }

  try {
    // `.returning()` so a stale tab acting on a row that's gone gets told so,
    // instead of a cheerful "Ticket closed." for an update that matched nothing.
    const moved = await db
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      // title rides the RETURNING so the audit row names the ticket without a
      // second read.
      .returning({ id: tickets.id, title: tickets.title });
    if (moved.length === 0) {
      return { ok: false, error: 'That ticket no longer exists.' };
    }
    logActivity(profile, {
      area: 'tickets',
      entity: 'ticket',
      entityId: id,
      entityName: moved[0].title,
      action: 'status',
      summary: `Moved the ticket "${moved[0].title}" to ${status}`,
      payload: { meta: { status } },
    });
  } catch (error) {
    logError('[tickets] setTicketStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
