'use server';

/**
 * The site's only server mutation: unified contact-form submissions.
 *
 * One action handles both tabs (project inquiry / job application) and both
 * transports (live submit + offline-outbox replay). Order matters:
 * validate → dedup → store → notify. The DB row is the source of truth — a
 * failed notification email must never lose a captured lead, so the Resend
 * send happens last and its failure only leaves `email_sent = false`.
 *
 * Bot traps (honeypot / too-fast fill) don't drop the submission: it's stored
 * with status 'spam' (no email) so a false positive — e.g. browser autofill
 * quirks — is recoverable from the future /admin inbox, while scripts still
 * get an indistinguishable success response.
 *
 * Idempotency: the client generates one `client_id` per fill session and the
 * table has a unique constraint on it, so the outbox's at-least-once replay
 * (or a double-fired retry) resolves to `duplicate: true` instead of a second
 * row + second email.
 *
 * Importing `CATEGORIES`/`JOBS` here is safe for the client bundle: server
 * imports of a 'use server' module never reach the browser — only the action
 * reference stub does.
 */
import { eq } from 'drizzle-orm';
import { del, put } from '@vercel/blob';
import { Resend } from 'resend';
import { contactSubmissions, db } from '@/db';
import { CATEGORIES } from '@/constants/services';
import { GENERAL_APPLICATION, JOBS } from '@/constants/careers';
import {
  contactSubmissionSchema,
  flattenIssues,
  MIN_FILL_MS,
  OTHER_SERVICE_SLUG,
  REFERRAL_OPTIONS,
  resumeProblem,
  RESUME_MIME,
  type ResumeKind,
  sniffResumeKind,
  submissionFromFormData,
  type SubmitContactResult,
} from '@/lib/contactSchema';

const NOTIFY_TO = [
  'info@perseustudio.com',
  'samangithoseinpour@gmail.com',
  'aryangh1a@gmail.com',
];
const NOTIFY_FROM = 'Perseus Creative Studio <forms@perseustudio.com>';

// The authoritative allow-lists. contactSchema.ts only shape-checks slugs (it
// must stay leaf, see its header). Unknown slugs are degraded (folded into
// 'other' / stored raw), never rejected — a queued offline replay can carry
// slugs the catalog dropped since queue time, and a validation rejection
// would make the outbox permanently delete that record (lead silently lost).
const SERVICE_TITLES = new Map<string, string>([
  ...Object.values(CATEGORIES).flatMap((category) =>
    category.services.map((s) => [s.slug, s.title] as const),
  ),
  [OTHER_SERVICE_SLUG, 'Something else / not sure'],
]);

// All openings (including expired ones — a queued replay may carry a role
// that was delisted between queue time and flush time) + General application.
const ROLE_TITLES = new Map<string, string>([
  ...JOBS.flatMap((group) =>
    group.openings.map((o) => [o.slug, o.title] as const),
  ),
  [GENERAL_APPLICATION.slug, GENERAL_APPLICATION.title],
]);

// "How did you hear about us?" allow-list (schema only shape-checks the slug).
const REFERRAL_LABELS = new Map<string, string>(
  REFERRAL_OPTIONS.map((o) => [o.slug, o.label] as const),
);

function textLine(label: string, value?: string | null): string | null {
  return value ? `${label}: ${value}` : null;
}

export async function submitContact(
  formData: FormData,
): Promise<SubmitContactResult> {
  try {
    // Bot traps: don't reject — flag. The response stays indistinguishable
    // from success so scripts get no signal to adapt to, but the submission
    // is stored as 'spam' instead of destroyed (autofill false positives are
    // recoverable). Only structurally-invalid flagged payloads are dropped.
    const honeypot = formData.get('pcs_extra');
    const elapsed = Number(formData.get('elapsed_ms'));
    const flagged =
      (typeof honeypot === 'string' && honeypot.trim() !== '') ||
      !Number.isFinite(elapsed) ||
      elapsed < MIN_FILL_MS;

    const parsed = contactSubmissionSchema.safeParse(
      submissionFromFormData(formData),
    );
    if (!parsed.success) {
      if (flagged) return { ok: true };
      return {
        ok: false,
        error: 'validation',
        issues: flattenIssues(parsed.error),
      };
    }
    const data = parsed.data;
    if (flagged) {
      console.warn('[contact] bot trap tripped', {
        clientId: data.client_id,
        honeypot: typeof honeypot === 'string' && honeypot.trim() !== '',
        elapsed,
      });
    }

    // Referral source is optional and only shape-checked (zod slug regex). An
    // unknown value is stored raw rather than rejected — rejecting would
    // permanently drop a queued replay over a renamed option; the email and
    // /admin fall back to rendering the raw slug.

    let resume: File | null = null;
    let resumeKind: ResumeKind | null = null;
    let services: string[] = [];
    let projectMessage: string | undefined;
    if (data.kind === 'project') {
      // Service slugs unknown to the current catalog degrade to 'other' with
      // the raw slugs preserved in the message (same pattern as the legacy
      // mapping in contactOutbox.ts) instead of failing validation — see the
      // SERVICE_TITLES note above for why rejecting would lose queued leads.
      const unknown = data.services.filter((s) => !SERVICE_TITLES.has(s));
      services = data.services.filter((s) => SERVICE_TITLES.has(s));
      projectMessage = data.message;
      if (unknown.length > 0) {
        if (!services.includes(OTHER_SERVICE_SLUG)) {
          services.push(OTHER_SERVICE_SLUG);
        }
        projectMessage = [projectMessage, `[Requested: ${unknown.join(', ')}]`]
          .filter(Boolean)
          .join('\n');
      }
    } else {
      if (!ROLE_TITLES.has(data.role)) {
        if (flagged) return { ok: true };
        return {
          ok: false,
          error: 'validation',
          issues: { role: 'Choose a role from the list.' },
        };
      }
      const file = formData.get('resume');
      const problem =
        file instanceof File
          ? resumeProblem(file)
          : 'Attach your resume (PDF or Word).';
      if (problem) {
        if (flagged) return { ok: true };
        return { ok: false, error: 'validation', issues: { resume: problem } };
      }
      // Authoritative content sniff — derives the stored extension and
      // content-type; the filename is never trusted.
      resumeKind = await sniffResumeKind(file as File);
      if (!resumeKind) {
        if (flagged) return { ok: true };
        return {
          ok: false,
          error: 'validation',
          issues: { resume: 'Resume must be a PDF or Word document.' },
        };
      }
      resume = file as File;
    }

    // Cheap replay pre-check before the Blob upload so a re-flushed career
    // application doesn't stack duplicate resume objects in storage. The
    // unique-constraint insert below stays the race-safe backstop.
    const existing = await db
      .select({ id: contactSubmissions.id })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.clientId, data.client_id))
      .limit(1);
    if (existing.length > 0) {
      return { ok: true, duplicate: true };
    }

    // Private storage: no public URL exists for the resume. The notification
    // email carries the PDF as an attachment; /admin streams it via
    // get(pathname, { access: 'private' }). Flagged submissions upload too:
    // the spam row is the recovery path for a false-positive applicant, and
    // without the resume it recovers nothing (only the email is skipped).
    let resumePath: string | undefined;
    if (resume && resumeKind) {
      const blob = await put(`resumes/${data.client_id}.${resumeKind}`, resume, {
        access: 'private',
        addRandomSuffix: true,
        contentType: RESUME_MIME[resumeKind],
      });
      resumePath = blob.pathname;
    }

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(contactSubmissions)
        .values(
          data.kind === 'project'
            ? {
                clientId: data.client_id,
                kind: data.kind,
                status: flagged ? ('spam' as const) : ('new' as const),
                name: data.name,
                email: data.email,
                phone: data.phone,
                country: data.country,
                referralSource: data.referral_source,
                company: data.company,
                instagram: data.instagram,
                website: data.website,
                services,
                message: projectMessage,
              }
            : {
                clientId: data.client_id,
                kind: data.kind,
                status: flagged ? ('spam' as const) : ('new' as const),
                name: data.name,
                email: data.email,
                phone: data.phone,
                country: data.country,
                referralSource: data.referral_source,
                role: data.role,
                portfolioUrl: data.portfolioUrl,
                linkedinUrl: data.linkedinUrl,
                message: data.coverNote,
                resumePath,
              },
        )
        .onConflictDoNothing({ target: contactSubmissions.clientId })
        .returning({ id: contactSubmissions.id });
    } catch (dbError) {
      // Don't strand an orphaned resume object when the row never landed.
      if (resumePath) await del(resumePath).catch(() => {});
      throw dbError;
    }

    if (inserted.length === 0) {
      // Lost the insert race to a concurrent replay — that request already
      // stored the row (and its resume) and sent the email.
      if (resumePath) await del(resumePath).catch(() => {});
      return { ok: true, duplicate: true };
    }

    if (flagged) {
      // Stored for /admin review; no notification email for suspected spam.
      return { ok: true };
    }

    // Notify — isolated so an email failure can't fail the stored lead.
    const roleTitle =
      data.kind === 'career' ? ROLE_TITLES.get(data.role) : undefined;
    // Collapse any whitespace (incl. newlines) in the user-supplied name so
    // it can't distort the subject line.
    const safeName = data.name.replace(/\s+/g, ' ');
    const subject =
      data.kind === 'project'
        ? `[Contact] Project inquiry — ${safeName}`
        : `[Careers] ${roleTitle} — ${safeName}`;
    const body = [
      data.kind === 'project' ? 'New project inquiry' : 'New job application',
      '',
      textLine('Name', data.name),
      textLine('Email', data.email),
      textLine('Phone', data.phone),
      textLine('Country', data.country),
      textLine(
        'Heard about us via',
        data.referral_source &&
          (REFERRAL_LABELS.get(data.referral_source) ?? data.referral_source),
      ),
      ...(data.kind === 'project'
        ? [
            textLine('Company', data.company),
            textLine('Instagram', data.instagram),
            textLine('Website', data.website),
            textLine(
              'Services',
              services.map((s) => SERVICE_TITLES.get(s) ?? s).join(', '),
            ),
            textLine('Message', projectMessage && `\n${projectMessage}`),
          ]
        : [
            textLine('Role', roleTitle),
            textLine('Portfolio', data.portfolioUrl),
            textLine('LinkedIn', data.linkedinUrl),
            `Resume: attached (${(resumeKind ?? 'file').toUpperCase()})`,
            textLine('Cover note', data.coverNote && `\n${data.coverNote}`),
          ]),
      '',
      'Reply to this email to respond directly to the sender.',
    ]
      .filter((l): l is string => l !== null)
      .join('\n');

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        replyTo: data.email,
        subject,
        text: body,
        attachments: resume
          ? [
              {
                filename:
                  resume.name.replace(/[^\w.-]+/g, '_').slice(0, 80) ||
                  `resume.${resumeKind ?? 'pdf'}`,
                content: Buffer.from(await resume.arrayBuffer()),
              },
            ]
          : undefined,
      });
      if (error) throw error;
      await db
        .update(contactSubmissions)
        .set({ emailSent: true })
        .where(eq(contactSubmissions.id, inserted[0].id));
    } catch (emailError) {
      // Row is stored; /admin will surface email_sent=false rows later.
      console.error('[contact] notification email failed', emailError);
    }

    return { ok: true };
  } catch (error) {
    console.error('[contact] submission failed', error);
    return { ok: false, error: 'server' };
  }
}
