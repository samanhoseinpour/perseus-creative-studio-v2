import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel } from '@/components/Admin/Glass';
import RevisionsTable from '@/components/Admin/blogs/RevisionsTable';
import type { BlogRevisionItem } from '@/components/Admin/blogs/postTypes';
import { formatDateTime, formatRelative } from '@/components/Admin/inbox/format';
import { getAdminPost, listRevisions } from '@/db/blogAdminQueries';
import { requireArea, viewerZone } from '@/lib/adminAccess';
import { canRestoreRevision, foldRevisionList, revisionMarker } from '@/lib/blogFields';

export const metadata: Metadata = {
  title: 'Saved versions',
  description: 'Every saved version of a blog post.',
};

/**
 * /admin/blogs/[id]/revisions: what this post has been.
 *
 * `wide` rather than `table`, and `BlogRevisionsSkeleton` passes the same
 * token: this is a single-column list of rows, so the extra width `table`
 * buys would only drag each row's right-hand meta away from the title it
 * belongs to. The blogs list makes the same call for the same reason.
 *
 * THE POST IS READ AS WELL AS ITS HISTORY, and the reason is one field:
 * `restoreRevision` takes the working row's `version` as its concurrency
 * token, and `listRevisions` deliberately does not carry it. `getAdminPost` is
 * the door that has it. It looks like three round trips against
 * `postIdentitiesFor`'s one, but its three reads are a single `Promise.all`,
 * so the LATENCY is the same one trip and the alternative would have meant
 * widening a shape the two bulk doors own for the sake of one screen.
 *
 * Every date is resolved HERE, in the viewer's own zone, and handed down as a
 * finished string. Nothing in `RevisionsTable` constructs a `Date`.
 */
export default async function BlogRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireArea('blogs', '/admin');

  const [record, revisions, tz] = await Promise.all([
    getAdminPost(id),
    listRevisions(id),
    viewerZone(),
  ]);
  if (record === null) notFound();

  const row = record.post;
  // Capped HERE rather than in the table, so the rows past the fold never enter
  // the payload at all. `listRevisions` already ordered them newest first, so
  // the slice keeps the end of the history anybody came here for.
  const { shown, hidden } = foldRevisionList(revisions);
  const items: BlogRevisionItem[] = shown.map((rev) => ({
    id: rev.id,
    number: rev.number,
    reason: rev.reason,
    title: rev.title,
    wordCount: rev.wordCount,
    actorName: rev.actorName,
    savedLabel: formatDateTime(tz, rev.createdAt),
    savedRelative: formatRelative(tz, rev.createdAt),
    marker: revisionMarker(rev),
  }));

  return (
    <AdminPage width="wide">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Website
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Saved versions
          </h1>
          <p className="truncate text-sm text-muted-foreground" title={row.title}>
            {row.title}
          </p>
        </div>
        <Link
          href={`/admin/blogs/${id}`}
          prefetch={false}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 px-3 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06]"
        >
          <LuArrowLeft aria-hidden="true" className="size-3.5" />
          Back to the editor
        </Link>
      </header>

      <GlassPanel className="mt-6">
        <RevisionsTable
          postId={id}
          version={row.version}
          items={items}
          hidden={hidden}
          // The door refuses a post in the bin with "Restore the post first",
          // so the button is not offered there either. One rule, mirrored.
          canRestore={canRestoreRevision(row.status)}
        />
      </GlassPanel>

      {/* The caveat the preview link owes the reader. `getDraftPost` joins the
          category and the author from the WORKING row even when a revision is
          named, because the selector is shared with the working-row path, so an
          old version renders under the post's current byline. That is harmless
          for proofreading the words and misleading if nobody says so. */}
      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Preview opens the words, pictures and SEO fields a version saved. The
        category and the byline it renders under are the current ones, not the ones
        the post carried when that version was written.
      </p>
      {!canRestoreRevision(row.status) && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          This post is in the trash, so a version cannot be restored into it. Take
          the post out of the trash first.
        </p>
      )}
    </AdminPage>
  );
}
