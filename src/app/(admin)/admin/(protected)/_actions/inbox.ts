'use server';

/**
 * Write actions for the admin submissions inbox (status triage + delete). Reads
 * live in `@/db/adminQueries`; keeping the writes here as a `'use server'`
 * module means only an action reference stub ever reaches the client.
 *
 * SECURITY: the protected layout's `requireAdmin()` guard does NOT wrap server
 * actions — each one re-checks the session itself (redirects to /admin/login if
 * missing). Ids are shape-validated before touching Postgres so a malformed one
 * can't 500 on the uuid cast.
 *
 * FAILURE CONTRACT: DB/Blob errors resolve to `{ ok: false }` instead of
 * rejecting — the optimistic inbox UIs roll back on that value, and an
 * unhandled rejection would strand them showing a state the DB never reached.
 * (`requireAdmin()` stays outside the try: its redirect throw must propagate.)
 */
import { eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

import { db, contactSubmissions } from '@/db';
import type { ContactSubmission } from '@/db/schema';
import { requireAdmin } from '@/lib/adminSession';

type SubmissionStatus = ContactSubmission['status'];
const STATUSES: readonly SubmissionStatus[] = [
  'new',
  'read',
  'archived',
  'spam',
];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboxActionResult = { ok: true } | { ok: false; error: string };

/**
 * Move a submission to a new status. One generic covering every triage action:
 * mark read (`read`), mark unread (`new`), archive (`archived`), unarchive
 * (`read`), and restore-from-spam (`new`).
 */
export async function setSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<InboxActionResult> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid submission.' };
  if (!STATUSES.includes(status)) {
    return { ok: false, error: 'Invalid status.' };
  }

  try {
    await db
      .update(contactSubmissions)
      .set({ status })
      .where(eq(contactSubmissions.id, id));
  } catch (error) {
    console.error('[admin] setSubmissionStatus failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }

  // `layout` scope clears the whole /admin subtree from the Router/Data cache,
  // so the lists + sidebar/dashboard counts are fresh on Back-navigation.
  revalidatePath('/admin', 'layout');
  return { ok: true };
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
  await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid submission.' };

  try {
    const [row] = await db
      .select({ resumePath: contactSubmissions.resumePath })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id))
      .limit(1);
    if (!row) return { ok: false, error: 'Submission not found.' };

    await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
    if (row.resumePath) await del(row.resumePath).catch(() => {});
  } catch (error) {
    console.error('[admin] deleteSubmission failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
