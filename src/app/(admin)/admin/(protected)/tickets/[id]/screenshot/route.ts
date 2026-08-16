import 'server-only';
import { createHash } from 'node:crypto';
import { get } from '@vercel/blob';

import { canAccessArea, getAccessProfile } from '@/lib/adminAccess';
import { getTicketById } from '@/db/ticketQueries';

/**
 * Streams a ticket's screenshot — a PRIVATE Vercel Blob (no public URL).
 *
 * Route handlers are NOT covered by the protected layout's guard, so this
 * resolves the caller's access profile itself, then authorizes: the viewer
 * needs the tickets area, and within it superadmins can see every screenshot,
 * a reporter only their own ticket's. Unauthorized and missing both answer
 * 404 so foreign ticket ids aren't enumerable. The blob pathname is read from
 * the DB row by `id` (never taken from the URL) — the upload used
 * `addRandomSuffix`, so the pathname itself is non-guessable.
 *
 * `?dl` forces a download; otherwise the image opens inline.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // The profile and the ticket row key on independent inputs, so they fetch
  // together (one neon-http round trip of wall time instead of two); the
  // authorization predicate still runs before any blob byte is fetched.
  const [profile, ticket] = await Promise.all([
    getAccessProfile(),
    getTicketById(id),
  ]);
  const { user } = profile.session;

  const authorized =
    ticket &&
    canAccessArea(profile, 'tickets') &&
    (profile.superadmin || ticket.reporterId === user.id);
  if (!ticket || !authorized || !ticket.screenshotPath) {
    return new Response('Not found', { status: 404 });
  }

  const filename = ticket.screenshotPath.split('/').pop() ?? 'screenshot';
  const download = new URL(request.url).searchParams.has('dl');

  // Conditional-request caching, NOT `immutable`: the blob never changes
  // (screenshotPath is written exactly once in createTicket), but a year of
  // browser cache would keep serving these private bytes after sign-out on a
  // shared machine without re-running the auth above. `no-cache` + ETag keeps
  // every view re-authorized while a 304 — answered here BEFORE the blob
  // fetch — skips the Blob round trip and the up-to-4MB transfer on repeat
  // ticket opens. The ETag hashes the stored pathname (unique per upload);
  // the pathname itself is never exposed. ?dl downloads stay no-store.
  const etag = `"${createHash('sha256')
    .update(ticket.screenshotPath)
    .digest('hex')
    .slice(0, 32)}"`;
  if (!download && request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
    });
  }

  const result = await get(ticket.screenshotPath, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Length': String(result.blob.size),
      'Content-Disposition': `${
        download ? 'attachment' : 'inline'
      }; filename="${filename}"`,
      'Cache-Control': download ? 'private, no-store' : 'private, no-cache',
      ...(download ? {} : { ETag: etag }),
    },
  });
}
