import 'server-only';
import { get } from '@vercel/blob';

import { requireAdmin } from '@/lib/adminSession';
import { getSubmissionById } from '@/db/adminQueries';

/**
 * Streams a job application's résumé — a PRIVATE Vercel Blob (no public URL).
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * re-checks the session with `requireAdmin()`. The blob pathname is read from
 * the DB row by `id` (never taken from the URL): the upload used
 * `addRandomSuffix`, so the pathname is non-guessable — both the authorization
 * and the non-enumerability come from resolving it here.
 *
 * `?dl` forces a download; otherwise the résumé opens inline (new tab).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const submission = await getSubmissionById(id);
  if (!submission || submission.kind !== 'career' || !submission.resumePath) {
    return new Response('Not found', { status: 404 });
  }

  // Token defaults to BLOB_READ_WRITE_TOKEN; `get` resolves + fetches the
  // private blob and hands back a stream (@vercel/blob v2).
  const result = await get(submission.resumePath, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

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
