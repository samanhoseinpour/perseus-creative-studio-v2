import 'server-only';
import { get } from '@vercel/blob';

import { requireAdmin } from '@/lib/adminSession';
import { isPrivilegedAdmin } from '@/lib/adminAccess';
import { getTicketById } from '@/db/ticketQueries';

/**
 * Streams a ticket's screenshot — a PRIVATE Vercel Blob (no public URL).
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * re-checks the session with `requireAdmin()`, then authorizes: triagers can
 * see every screenshot, a reporter only their own ticket's. Unauthorized and
 * missing both answer 404 so foreign ticket ids aren't enumerable. The blob
 * pathname is read from the DB row by `id` (never taken from the URL) — the
 * upload used `addRandomSuffix`, so the pathname itself is non-guessable.
 *
 * `?dl` forces a download; otherwise the image opens inline.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireAdmin();
  const { id } = await params;

  const ticket = await getTicketById(id);
  const authorized =
    ticket && (isPrivilegedAdmin(user.email) || ticket.reporterId === user.id);
  if (!ticket || !authorized || !ticket.screenshotPath) {
    return new Response('Not found', { status: 404 });
  }

  const result = await get(ticket.screenshotPath, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  const filename = ticket.screenshotPath.split('/').pop() ?? 'screenshot';
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
