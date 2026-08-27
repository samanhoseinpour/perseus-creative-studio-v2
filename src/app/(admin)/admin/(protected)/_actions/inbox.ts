'use server';

/**
 * Write actions for the admin submissions inbox (status triage + delete). Reads
 * live in `@/db/adminQueries`; keeping the writes here as a `'use server'`
 * module means only an action reference stub ever reaches the client.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — each
 * one re-resolves `getAccessProfile()` itself (redirects to /admin/login if
 * signed out) and may only touch submissions whose kind maps to one of the
 * caller's granted inbox areas; the kind rides in the mutation's WHERE clause
 * so the check and the write can't diverge. Ids are shape-validated before
 * touching Postgres so a malformed one can't 500 on the uuid cast.
 *
 * FAILURE CONTRACT: DB/Blob errors resolve to `{ ok: false }` instead of
 * rejecting — the optimistic inbox UIs roll back on that value, and an
 * unhandled rejection would strand them showing a state the DB never reached.
 * (`getAccessProfile()` stays outside the try: its redirect throw must
 * propagate.)
 */
import { and, eq, inArray } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

import { db, contactSubmissions } from '@/db';
import type { ContactSubmission } from '@/db/schema';
import { getAccessProfile, visibleKinds } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { reportError } from '@/lib/monitoringRecord';

/**
 * Submissions are referenced by kind + short id, never by the submitter's
 * name or email. The audit trail's job is proving WHO on the team acted, not
 * preserving a third party's details in a second place with a second
 * retention window (PIPEDA Principle 5). The admin clicks through to the row
 * for the actual person.
 */
const submissionLabel = (kind: 'project' | 'career', id: string) =>
  `${kind === 'career' ? 'Application' : 'Inquiry'} #${id.slice(0, 8)}`;

type SubmissionStatus = ContactSubmission['status'];
const STATUSES: readonly SubmissionStatus[] = [
  'new',
  'read',
  'archived',
  'spam',
];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboxActionResult =
  | { ok: true; updated?: number }
  | { ok: false; error: string };

/**
 * Move a submission to a new status. One generic covering every triage action:
 * mark read (`read`), mark unread (`new`), archive (`archived`), unarchive
 * (`read`), and restore-from-spam (`new`).
 */
export async function setSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<InboxActionResult> {
  const profile = await getAccessProfile();
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid submission.' };
  if (!STATUSES.includes(status)) {
    return { ok: false, error: 'Invalid status.' };
  }
  const kinds = visibleKinds(profile);
  if (kinds.length === 0) {
    return { ok: false, error: 'You do not have access to the inboxes.' };
  }

  try {
    const updated = await db
      .update(contactSubmissions)
      .set({ status })
      .where(
        and(
          eq(contactSubmissions.id, id),
          inArray(contactSubmissions.kind, kinds),
        ),
      )
      // kind rides the RETURNING so the audit label is right without a
      // second read.
      .returning({ id: contactSubmissions.id, kind: contactSubmissions.kind });
    if (updated.length === 0) {
      return { ok: false, error: 'Submission not found in your inboxes.' };
    }
    const label = submissionLabel(updated[0].kind, id);
    logActivity(profile, {
      area: updated[0].kind === 'career' ? 'applications' : 'inquiries',
      entity: 'submission',
      entityId: id,
      entityName: label,
      action: 'status',
      summary: `Marked ${label} as ${status}`,
      payload: { meta: { status } },
    });
  } catch (error) {
    reportError('[admin] setSubmissionStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }

  // `layout` scope clears the whole /admin subtree from the Router/Data cache,
  // so the lists + sidebar/dashboard counts are fresh on Back-navigation.
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// Select-all is page-scoped (25 rows) — 50 leaves headroom while keeping a
// hard cap on the ids payload a client can send.
const MAX_BULK = 50;

/**
 * Bulk variant of {@link setSubmissionStatus} for the multi-select triage bar.
 * One idempotent UPDATE: ids the caller can't see (other kind), already
 * deleted, or duplicated simply fall out of RETURNING, and `updated` reports
 * how many rows actually moved so the toast can tell the truth.
 */
export async function setSubmissionsStatusBulk(
  ids: string[],
  status: SubmissionStatus,
): Promise<InboxActionResult> {
  const profile = await getAccessProfile();
  if (!Array.isArray(ids)) return { ok: false, error: 'Invalid selection.' };
  const unique = [...new Set(ids)];
  if (unique.length === 0 || unique.length > MAX_BULK) {
    return { ok: false, error: 'Invalid selection.' };
  }
  if (unique.some((id) => !UUID_RE.test(id))) {
    return { ok: false, error: 'Invalid selection.' };
  }
  if (!STATUSES.includes(status)) {
    return { ok: false, error: 'Invalid status.' };
  }
  const kinds = visibleKinds(profile);
  if (kinds.length === 0) {
    return { ok: false, error: 'You do not have access to the inboxes.' };
  }

  try {
    const updated = await db
      .update(contactSubmissions)
      .set({ status })
      .where(
        and(
          inArray(contactSubmissions.id, unique),
          inArray(contactSubmissions.kind, kinds),
        ),
      )
      // kind rides the RETURNING so the audit row files under the right
      // area. Nothing constrains a batch to one kind server-side, so the
      // distinct set is derived rather than assumed.
      .returning({ id: contactSubmissions.id, kind: contactSubmissions.kind });
    if (updated.length === 0) {
      return { ok: false, error: 'No matching submissions in your inboxes.' };
    }
    // One row PER KIND, not one per submission: 50 near-identical lines would
    // bury everything else in the feed, but a single row hardcoded to
    // 'inquiries' made /admin/logs?area=applications miss every bulk triage
    // of job applications (the filter is an equality match).
    const byKind = new Map<'project' | 'career', number>();
    for (const row of updated) {
      byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);
    }
    logActivity(
      profile,
      [...byKind].map(([kind, n]) => ({
        area: kind === 'career' ? 'applications' : 'inquiries',
        entity: 'submission',
        entityId: null,
        entityName: `${n} ${kind === 'career' ? 'applications' : 'inquiries'}`,
        action: 'status' as const,
        summary: `Marked ${n} ${kind === 'career' ? 'applications' : 'inquiries'} as ${status}`,
        payload: { count: n, meta: { status, bulk: true } },
      })),
    );
    revalidatePath('/admin', 'layout');
    return { ok: true, updated: updated.length };
  } catch (error) {
    reportError('[admin] setSubmissionsStatusBulk failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * Permanently delete a submission and clean up its résumé blob (career rows).
 * Irreversible — the UI gates it behind a confirm. The blob delete is
 * best-effort and runs AFTER the row delete: a failed blob delete only orphans
 * a private object, while blob-first could leave a surviving row whose
 * resume_path dangles (breaking the /admin résumé stream).
 */
export async function deleteSubmission(
  id: string,
): Promise<InboxActionResult> {
  const profile = await getAccessProfile();
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid submission.' };
  const kinds = visibleKinds(profile);
  if (kinds.length === 0) {
    return { ok: false, error: 'You do not have access to the inboxes.' };
  }

  try {
    const [row] = await db
      .select({
        resumePath: contactSubmissions.resumePath,
        kind: contactSubmissions.kind,
      })
      .from(contactSubmissions)
      .where(
        and(
          eq(contactSubmissions.id, id),
          inArray(contactSubmissions.kind, kinds),
        ),
      )
      .limit(1);
    if (!row) {
      return { ok: false, error: 'Submission not found in your inboxes.' };
    }

    const deleted = await db
      .delete(contactSubmissions)
      .where(
        and(
          eq(contactSubmissions.id, id),
          inArray(contactSubmissions.kind, kinds),
        ),
      )
      .returning({ id: contactSubmissions.id });
    if (deleted.length === 0) {
      return { ok: false, error: 'Submission not found in your inboxes.' };
    }
    if (row.resumePath) await del(row.resumePath).catch(() => {});
    // resumePath is deliberately absent from the payload — the blob pathname
    // IS the capability to fetch that file, and the denylist would refuse it
    // anyway.
    logActivity(profile, {
      area: row.kind === 'career' ? 'applications' : 'inquiries',
      entity: 'submission',
      entityId: id,
      entityName: submissionLabel(row.kind, id),
      action: 'delete',
      summary: `Deleted ${submissionLabel(row.kind, id)}`,
      // `hadAttachment`, not `hadResume`: the denylist matches `resume`
      // (résumé blob paths are capabilities), so the old key stored
      // '[redacted]' — blanking the one fact the payload existed to keep.
      payload: { meta: { hadAttachment: Boolean(row.resumePath) } },
    });
  } catch (error) {
    reportError('[admin] deleteSubmission failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
