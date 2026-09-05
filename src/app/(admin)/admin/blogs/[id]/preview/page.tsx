import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft, LuSquareStack } from 'react-icons/lu';

// Direct paths, never the `@/components` barrel: the barrel re-exports the
// whole marketing surface, and this file lives in the deliberately barrel-free
// `(admin)` tree. Navbar and Footer are the REAL ones on purpose. The promise
// this page makes is that what a writer proofreads is what a reader gets, and
// a second rendering of the chrome would be the first thing to drift.
import ArticlePage from '@/components/Blogs/post/ArticlePage';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { requireArea } from '@/lib/adminAccess';
import {
  BLOG_PREVIEW_REVISION_PARAM,
  blogRevisionsHref,
} from '@/lib/blogFields';
import { getDraftPost } from '@/lib/blogStore';

/**
 * /admin/blogs/[id]/preview — the draft, rendered as the public page.
 *
 * WHERE THIS FILE SITS IS THE FEATURE. It is OUTSIDE `(protected)` and INSIDE
 * `(admin)`, and both halves are load-bearing:
 *
 *  - Outside `(protected)` it inherits no dashboard shell, which is what lets
 *    it put the marketing Navbar and Footer around the article instead. There
 *    is no conflict with `(protected)/blogs/[id]/page.tsx`: both use `[id]`,
 *    but the leaf segments differ, so none of Next's route-conflict checks
 *    fires. `/admin/login` is the existing precedent for a page outside
 *    `(protected)`.
 *  - Inside `(admin)` it inherits three controls for free: that layout's
 *    `robots: { index: false, follow: false }`, the `/admin/:path*` cookie
 *    bounce in src/proxy.ts, and public/sw.js's rule that nothing under
 *    /admin is ever written to Cache Storage.
 *
 * DO NOT ADD a `layout.tsx` under `(admin)/admin/blogs/`: it would apply to
 * this branch alone and silently diverge from the protected pages beside it.
 * DO NOT ADD a `loading.tsx` here either: a route-level loading file commits a
 * 200 shell before the page runs, which turns an unknown id into a soft 404
 * instead of a real one. `/share/reports/[token]` documents the same trap.
 *
 * The proxy in front of this is a COOKIE CHECK and nothing more, so the
 * authorization boundary is `requireArea` below, in the page itself. Without
 * it, every signed-in account would be able to read every unpublished draft,
 * including the ones whose whole point is that they are not ready.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // Its own title, because the `(admin)` layout's template only supplies the
  // suffix; with none of its own this page would read "Admin".
  title: 'Preview',
  description: 'Preview a blog post before it goes live.',
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BlogPreviewPage({ params, searchParams }: Props) {
  await requireArea('blogs', '/admin');
  const { id } = await params;
  const sp = await searchParams;

  // One key, spelled in the leaf, so the links that build this URL and the
  // page that reads it cannot disagree. They fail silently if they do:
  // `getDraftPost` reads a missing revision as "show the working row", so a
  // mis-spelled key previews the current draft under a URL claiming to name a
  // saved version.
  const raw = sp[BLOG_PREVIEW_REVISION_PARAM];
  const revisionId = Array.isArray(raw) ? raw[0] : raw;

  // Null covers all three: an unknown post, a malformed id, and a revision id
  // belonging to a DIFFERENT post. The last one is a real refusal rather than
  // a fallback (`selectPostForPreview` requires the join to match), so a
  // guessed revision id cannot be used to read another post's history.
  const view = await getDraftPost(id, revisionId);
  if (!view) notFound();

  const pinned = Boolean(revisionId);

  return (
    <>
      {/*
        The strip is FIXED AT THE BOTTOM, and the bottom is not a style choice:
        the marketing Navbar is fixed at the top, and a second fixed bar up
        there would sit on top of it. It is first in the DOM so that the way
        out is the first thing a keyboard reaches, and a spacer under the
        Footer keeps it from covering the last rows of the page.
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#141414] text-[#fafafa] print:hidden">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-8">
          <p className="min-w-0 flex-1 text-xs leading-5">
            <span className="font-semibold">
              {pinned ? 'Preview of a saved version.' : 'Draft preview.'}
            </span>{' '}
            <span className="text-[#fafafa]/70">
              {pinned
                ? 'These are that version’s words and pictures. The category and the byline are the post’s current ones, not the ones it carried when the version was saved.'
                : 'Nobody outside the dashboard can open this page. Publishing is what puts it on the public blog.'}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={blogRevisionsHref(id)}
              prefetch={false}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/25 px-3 text-xs font-medium text-[#fafafa] transition-colors hover:bg-white/10"
            >
              <LuSquareStack aria-hidden="true" className="size-3.5" />
              Saved versions
            </Link>
            {/* prefetch={false} on both: the editor route runs five Neon
                reads and the history one runs three, and a preview window is
                opened to be READ. Prefetching would spend them on a hover. */}
            <Link
              href={`/admin/blogs/${id}`}
              prefetch={false}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#fafafa] px-3 text-xs font-medium text-[#141414] transition-colors hover:bg-white"
            >
              <LuArrowLeft aria-hidden="true" className="size-3.5" />
              Back to the editor
            </Link>
          </div>
        </div>
      </div>

      <Navbar />
      <ArticlePage view={view} preview />
      <Footer />
      {/* Clears the strip. Two rungs because the sentence wraps to a second
          line on a phone and would otherwise hide the footer's last row. */}
      <div aria-hidden="true" className="h-24 sm:h-14 print:hidden" />
    </>
  );
}
