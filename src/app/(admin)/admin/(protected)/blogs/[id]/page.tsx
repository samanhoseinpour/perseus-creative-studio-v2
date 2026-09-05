import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import AdminPage from '@/components/Admin/AdminPage';
import PostEditor from '@/components/Admin/blogs/PostEditor';
import type {
  BlogEditorPost,
  BlogOption,
  BlogOptionGroup,
} from '@/components/Admin/blogs/postTypes';
import { formatDate, formatDateTime, formatRelative } from '@/components/Admin/inbox/format';
import {
  getAdminPost,
  listAuthorsAdmin,
  listCategoriesAdmin,
  postWordCountIsLegacy,
} from '@/db/blogAdminQueries';
import { canAccessArea, requireArea, viewerZone } from '@/lib/adminAccess';
import { publicUrlFor, slugLocked } from '@/lib/blogFields';
import { STUDIO_TZ, dayKeyIn, dayStartIn } from '@/lib/calendar';
import { CATEGORIES } from '@/constants/services';
import { SITE_URL } from '@/constants';

export const metadata: Metadata = {
  title: 'Post',
  description: 'Write and publish a blog post.',
};

/**
 * /admin/blogs/[id]: the writing surface.
 *
 * `wide` rather than `table` or `narrow`, and deliberately. The article column
 * has to hold a measure a person can read at, and the inspector rail beside it
 * is a form; `table`'s 2100px would stretch one and strand the other, while
 * `narrow` leaves no room for the rail at all. `BlogEditorSkeleton` passes the
 * same token, or `loading.tsx` renders at one measure and the page snaps to
 * another on swap.
 *
 * EVERYTHING THE BROWSER NEEDS TO KNOW ABOUT TIME IS RESOLVED HERE. The two
 * date controls edit different clocks and the difference is the whole point: a
 * SCHEDULE is a firing instant the writer picks in their own zone, so its day
 * and minute are split out in `viewerZone()`; a PUBLICATION DATE is what the
 * article says about itself, and every date the public blog prints is a
 * STUDIO_TZ day key, so that one is resolved in Vancouver. `todayKey` rides
 * along so the schedule field's default is not a `Date` built in the browser,
 * which would differ between the server render and the hydration.
 *
 * The category and author lists are read here rather than in the editor
 * because the pickers need every row, not the two this post happens to use.
 */
export default async function BlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireArea('blogs', '/admin');

  // Four reads in parallel, so the provenance one costs nothing in latency.
  // It is asked HERE rather than inside `getAdminPost` deliberately: that
  // reader is what `prepareSave` calls on every autosave, and a value only
  // this render reads has no business adding a round trip to a keystroke
  // timer.
  const [record, categories, authors, tz, wordCountIsLegacy] = await Promise.all([
    getAdminPost(id),
    listCategoriesAdmin(),
    listAuthorsAdmin(),
    viewerZone(),
    postWordCountIsLegacy(id),
  ]);
  if (record === null) notFound();

  const row = record.post;

  // The scheduled instant, split into the two things the control edits: a day
  // in the writer's own zone, and how far into that day it fires. Minutes are
  // measured as REAL elapsed time from the day's first moment, which is what
  // `dayTimeIn` puts back, so a schedule set on a DST day round-trips.
  const scheduleDayKey = row.publishAt ? dayKeyIn(tz, row.publishAt) : '';
  const scheduleMinutes =
    row.publishAt && scheduleDayKey
      ? Math.round(
          (row.publishAt.getTime() - dayStartIn(tz, scheduleDayKey).getTime()) / 60_000,
        )
      : 0;

  const post: BlogEditorPost = {
    id: row.id,
    version: row.version,
    status: row.status,
    everPublished: row.publishedAt !== null,
    slugLocked: slugLocked(row),
    publicPath: publicUrlFor(row.slug),
    // The STUDIO clock for both, because a publication date is what the
    // article claims about itself and the public blog prints it in Vancouver
    // time. Showing it in the reader's own zone would put a different day on
    // the screen from the one in the field that edits it.
    publishedLabel: row.publishedAt ? formatDate(STUDIO_TZ, row.publishedAt) : '',
    publishedDayKey: row.publishedAt ? dayKeyIn(STUDIO_TZ, row.publishedAt) : '',
    scheduledLabel: row.publishAt ? formatDateTime(tz, row.publishAt) : '',
    scheduleDayKey,
    scheduleMinutes,
    updatedLabel: formatRelative(tz, row.updatedAt),
    wordCount: row.wordCount,
    wordCountIsLegacy,
    values: {
      slug: row.slug,
      title: row.title,
      description: row.description,
      categorySlug: record.category.slug,
      authorSlug: record.author.slug,
      serviceSlug: row.serviceSlug ?? '',
      heroStaticPath: row.heroStaticPath ?? '',
      heroMedia: row.heroMedia ?? null,
      heroAlt: row.heroAlt,
      heroCaption: row.heroCaption ?? '',
      body: row.body,
      keyTakeaways: row.keyTakeaways,
      faqs: row.faqs,
      sources: row.sources,
      entities: record.entities,
      relatedSlugs: record.relatedSlugs,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      canonicalOverride: row.canonicalOverride ?? '',
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImageStaticPath: row.ogImageStaticPath ?? '',
      ogImageMedia: row.ogImageMedia ?? null,
      twitterCard:
        row.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      robotsIndex: row.robotsIndex,
      robotsFollow: row.robotsFollow,
      robotsExtra: row.robotsExtra ?? {},
      focusKeywords: row.focusKeywords,
      emitLegacyMetaKeywords: row.emitLegacyMetaKeywords,
      llmsInclude: row.llmsInclude,
    },
  };

  const authorOptions: BlogOption[] = authors.map((a) => ({
    value: a.slug,
    label: a.name,
  }));
  const categoryOptions: BlogOption[] = categories.map((c) => ({
    value: c.slug,
    label: c.title,
  }));

  // A slim projection of the services registry, built on the server: the
  // registry is enormous and `@/constants/services` must never reach a client
  // chunk (its own header says so).
  const serviceGroups: BlogOptionGroup[] = Object.values(CATEGORIES).map((category) => ({
    label: category.title,
    options: category.services.map((service) => ({
      value: service.slug,
      label: service.title,
    })),
  }));

  return (
    <AdminPage width="wide">
      <PostEditor
        post={post}
        authors={authorOptions}
        categories={categoryOptions}
        serviceGroups={serviceGroups}
        tz={tz}
        todayKey={dayKeyIn(tz, new Date())}
        canLogs={canAccessArea(profile, 'logs')}
        publicOrigin={SITE_URL}
      />
    </AdminPage>
  );
}
