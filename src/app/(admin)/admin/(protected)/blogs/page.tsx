import type { Metadata } from 'next';
import Link from 'next/link';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { GlassPanel, glassRowHover } from '@/components/Admin/Glass';
import BlogsFilterBar, {
  type BlogFilterOption,
} from '@/components/Admin/blogs/BlogsFilterBar';
import BlogsList, {
  NewPostButton,
  type BlogPostItem,
} from '@/components/Admin/blogs/BlogsList';
import {
  panelDivider,
  postGrid,
  postHeadCell,
  postHeadRow,
  tabItem,
  tabStrip,
} from '@/components/Admin/blogs/listBox';
import { formatDate, formatDateTime, formatRelative } from '@/components/Admin/inbox/format';
import {
  listAdminPosts,
  listAuthorsAdmin,
  listCategoriesAdmin,
  statusCounts,
  type AdminPostRow,
} from '@/db/blogAdminQueries';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { requireArea, viewerZone } from '@/lib/adminAccess';
import { publicUrlFor } from '@/lib/blogFields';
import { blogListQs, parseBlogListParams, type BlogListParams } from '@/lib/blogFilters';
import {
  BLOG_LIST_TABS,
  BLOG_STATUS_DATE_LABELS,
  blogStatusDate,
  blogTabCount,
  blogTabLabel,
} from '@/lib/blogListFields';
import { getPageNumbers } from '@/utils/pagination';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'The posts behind the public blog.',
};

/**
 * /admin/blogs: every post, on one page, narrowed by the status tabs and the
 * filter bar.
 *
 * `wide` rather than `table`, and deliberately: this is a single-column list
 * of rows, not a horizontally scrolling table, and stretching a row past
 * 1600px only drags its right-hand columns away from the title they belong to.
 * `BlogsListSkeleton` passes the same token, or loading.tsx renders at one
 * measure and the page snaps to another on swap.
 *
 * Nothing here reads `searchParams` by hand and nothing writes a status
 * condition: `parseBlogListParams` owns the URL and `blogStatusFilter` (inside
 * `adminPostsWhere`, and inside `blogTabCount` through the same door) owns
 * "all excludes trash", so the tab badge and the rows under it are the same
 * set by construction.
 *
 * Every date leaves this file as a finished string, resolved once in the
 * viewer's own zone, so the list never constructs a `Date` in the browser.
 */
export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('blogs', '/admin');
  const params = parseBlogListParams(await searchParams);
  const tz = await viewerZone();

  const [page, counts, authors, categories] = await Promise.all([
    listAdminPosts(params),
    statusCounts(),
    listAuthorsAdmin(),
    listCategoriesAdmin(),
  ]);

  const authorOptions: BlogFilterOption[] = authors.map((a) => ({
    value: a.slug,
    label: a.name,
  }));
  const categoryOptions: BlogFilterOption[] = categories.map((c) => ({
    value: c.slug,
    label: c.title,
  }));

  const items: BlogPostItem[] = page.rows.map((row) => toItem(row, tz));
  const narrowed = Boolean(params.q || params.author || params.category);
  const clearQs = blogListQs({ status: params.status, sort: params.sort });

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Website
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Blog
            </h1>
            <HelpButton topic={ADMIN_HELP.blogs} />
          </div>
          <p className="text-sm text-muted-foreground">
            Drafts, scheduled posts and everything live on the public blog.
          </p>
        </div>
        <NewPostButton />
      </header>

      <GlassPanel className="mt-6">
        {/* The border lives on the wrapper and the -mb-px on the scroller
            inside it: overflow-x-auto makes the Y axis scrollable too, so a
            -mb-px child would let iOS rubber-band the strip off screen. */}
        <div className={panelDivider}>
          <div className={tabStrip}>
            {BLOG_LIST_TABS.map((tab) => {
              const active = tab === params.status;
              const n = blogTabCount(tab, counts);
              const qs = blogListQs({ ...params, status: tab, page: 1 });
              return (
                <Link
                  key={tab}
                  href={qs ? `/admin/blogs?${qs}` : '/admin/blogs'}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    tabItem,
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {blogTabLabel(tab)}
                  {n > 0 && (
                    <span
                      className={cn(
                        'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums',
                        active
                          ? 'bg-foreground text-background'
                          : 'bg-foreground/[0.08] text-muted-foreground',
                      )}
                    >
                      {n}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <BlogsFilterBar
          params={params}
          authors={authorOptions}
          categories={categoryOptions}
        />

        <div className={postHeadRow}>
          <div className={postGrid}>
            <span className={cn(postHeadCell, 'pl-[1.625rem]')}>Post</span>
            <span className={postHeadCell}>Status</span>
            <span className={postHeadCell}>Author</span>
            <span className={postHeadCell}>Category</span>
            <span className={postHeadCell}>Focus keyword</span>
            <span className={postHeadCell}>Updated</span>
            <span className={postHeadCell}>Published</span>
          </div>
        </div>

        <BlogsList
          items={items}
          filtered={narrowed}
          emptyTitle={emptyTitle(params, narrowed)}
          emptyDescription={emptyDescription(params, narrowed)}
          clearHref={clearQs ? `/admin/blogs?${clearQs}` : '/admin/blogs'}
        />

        {page.totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-1 border-t border-white/40 p-3 dark:border-white/10"
            aria-label="Pagination"
          >
            {getPageNumbers(page.page, page.totalPages).map((n, i) => {
              if (n === 'ellipsis') {
                return (
                  <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">
                    …
                  </span>
                );
              }
              const qs = blogListQs({ ...params, page: n });
              return (
                <Link
                  key={n}
                  href={qs ? `/admin/blogs?${qs}` : '/admin/blogs'}
                  aria-current={n === page.page ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                    n === page.page
                      ? 'bg-foreground text-background'
                      : cn('text-muted-foreground hover:text-foreground', glassRowHover),
                  )}
                >
                  {n}
                </Link>
              );
            })}
          </nav>
        )}
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Showing {items.length} of {page.total} post{page.total === 1 ? '' : 's'}.
        Publishing, scheduling and unpublishing all happen inside a post.
      </p>
    </AdminPage>
  );
}

// ── Serializing one row ─────────────────────────────────────────────────────

/**
 * The Status cell states the date its status is ABOUT, chosen by
 * `blogStatusDate` rather than by a condition here.
 *
 * A scheduled post gets the time as well as the day, which the others do not:
 * a publish time close to midnight lands on a different calendar day for a
 * reader in another zone, and the whole point of the cell is to say when the
 * post goes live. The instants themselves cannot be missing on the states that
 * name them (migration 0045's CHECK constraints make a published post without
 * `published_at` and a scheduled one without `publish_at` unstorable), but the
 * fallback to `updated_at` keeps the cell a sentence rather than a blank if
 * one ever were.
 */
function statusDateLabel(row: AdminPostRow, tz: string): string {
  const kind = blogStatusDate(row.status);
  const word = BLOG_STATUS_DATE_LABELS[kind];
  if (kind === 'scheduled') {
    return row.publishAt
      ? `${word} ${formatDateTime(tz, row.publishAt)}`
      : `${word} soon`;
  }
  const at =
    kind === 'published' ? row.publishedAt : kind === 'trashed' ? row.trashedAt : null;
  return `${word} ${formatDate(tz, at ?? row.updatedAt)}`;
}

function toItem(row: AdminPostRow, tz: string): BlogPostItem {
  const scheduled = row.status === 'scheduled';
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    version: row.version,
    noindex: !row.robotsIndex,
    authorName: row.author.name,
    categoryTitle: row.category.title,
    focusKeyword: row.focusKeywords[0] ?? '',
    extraKeywords: Math.max(0, row.focusKeywords.length - 1),
    statusDateLabel: statusDateLabel(row, tz),
    updatedLabel: formatRelative(tz, row.updatedAt),
    publishLabel: row.publishedAt
      ? formatDate(tz, row.publishedAt)
      : scheduled && row.publishAt
        ? formatDateTime(tz, row.publishAt)
        : '',
    // The date has not happened yet, so the column tints it the same amber the
    // Scheduled pill carries rather than reading as a publication that already
    // took place.
    publishIsFuture: scheduled && row.publishedAt === null,
    liveHref: publicUrlFor(row.slug),
  };
}

// ── Empty states ────────────────────────────────────────────────────────────
// A filtered empty page and a genuinely empty tab are different facts, and the
// tab a member is standing on decides which sentence is true.

function emptyTitle(params: BlogListParams, narrowed: boolean): string {
  if (narrowed) return 'No posts match';
  if (params.status === 'trash') return 'The trash is empty';
  if (params.status === 'all') return 'No posts yet';
  return `Nothing ${blogTabLabel(params.status).toLowerCase()}`;
}

function emptyDescription(params: BlogListParams, narrowed: boolean): string {
  if (narrowed) return 'Nothing matches the current search and filters.';
  if (params.status === 'trash') return 'Posts you move to trash collect here until you delete them for good.';
  if (params.status === 'all') return 'Start a post to fill the public blog.';
  if (params.status === 'scheduled') return 'Posts waiting for a publish time show up here.';
  if (params.status === 'archived') return 'Posts you unpublish are kept here, ready to go live again.';
  if (params.status === 'published') return 'Nothing is live on the public blog yet.';
  return 'Posts you are still writing show up here.';
}
