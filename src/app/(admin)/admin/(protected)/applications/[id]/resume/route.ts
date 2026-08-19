import 'server-only';
import { get } from '@vercel/blob';

import { requireArea } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { getSubmissionById } from '@/db/adminQueries';

/**
 * Streams a job application's résumé — a PRIVATE Vercel Blob (no public URL).
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * gates itself on the applications area (résumés are candidate PII — holding
 * some other area must not grant them). The blob pathname is read from the DB
 * row by `id` (never taken from the URL): the upload used `addRandomSuffix`,
 * so the pathname is non-guessable — both the authorization and the
 * non-enumerability come from resolving it here.
 *
 * `?dl` forces a download; otherwise the résumé opens inline (new tab).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Gate + row lookup overlap (independent inputs; Promise.all pairs them so
  // a gate redirect can't leave the fetch floating) — the authorization still
  // resolves before any blob byte is fetched.
  const [profile, submission] = await Promise.all([
    requireArea('applications'),
    getSubmissionById(id),
  ]);
  if (!submission || submission.kind !== 'career' || !submission.resumePath) {
    return new Response('Not found', { status: 404 });
  }

  // Token defaults to BLOB_READ_WRITE_TOKEN; `get` resolves + fetches the
  // private blob and hands back a stream (@vercel/blob v2).
  const result = await get(submission.resumePath, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  // Logged only once the blob actually resolved, so a 404 leaves no row
  // claiming a résumé was read. The applicant is referenced by submission id,
  // never by name — and the blob pathname stays out of the payload because it
  // IS the capability to fetch the file.
  logActivity(profile, {
    area: 'applications',
    entity: 'submission',
    entityId: id,
    entityName: `Application #${id.slice(0, 8)}`,
    action: 'access',
    summary: `Opened the résumé for application #${id.slice(0, 8)}`,
  });

  const filename = submission.resumePath.split('/').pop() ?? 'resume';
  const download = new URL(request.url).searchParams.has('dl');

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Length': String(result.blob.size),
      'Content-Disposition': `${
        download ? 'attachment' : 'inline'
      }; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
