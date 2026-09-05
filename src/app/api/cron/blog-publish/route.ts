import { db } from '@/db';
import { postIdentitiesFor, publishedRevisionsFor } from '@/db/blogAdminQueries';
import { publishDuePostRows } from '@/db/blogStatements';
import { logSystemActivity } from '@/lib/activityLog';
import {
  hiddenRef,
  invalidateBlogCoarseFromCron,
  invalidateBlogFromCron,
  publishedRef,
} from '@/lib/blogInvalidate';
import { reportCronStep, runCron } from '@/lib/cronRun';

/**
 * Publish every schedule that has come due (vercel.json cron, every 15
 * minutes). The only thing in the app that moves a post from `scheduled` to
 * `published`, and the only reason a post goes live with nobody present.
 *
 * IT SHARES THE MONITORING JOB'S SLOT ON PURPOSE. `parseCronSchedule` accepts
 * four shapes and none of them can express an offset, so `*\/15` cannot be
 * staggered off `*\/15` at this granularity without a fifth shape and the
 * two-way drift guard that rides on it. Sharing is the better answer anyway:
 * this Neon database scales to zero, the monitoring probe has already woken it
 * at exactly that minute, and a staggered blog job would be a second wake
 * every hour for nothing. The cost is that a post goes live up to 15 minutes
 * after the minute the writer picked, which the editor's own copy says.
 *
 * `revalidateTag` AND NEVER `updateTag`, and that is the one trap in this file.
 * `updateTag` throws outside a server action (Next's `revalidate.js`, error
 * E872), so copying an editor door's invalidation block in here would publish
 * every due row and THEN throw: `runCron` would stamp the job failed and return
 * a 500, the ping and the activity row would never run, and the site would keep
 * serving the pre-publish snapshot for a whole day while /admin/monitoring
 * reddened every fifteen minutes. That is why the invalidation goes through
 * `invalidateBlogFromCron` rather than `invalidateBlog`, why the two differ
 * only in that one function, and why scripts/check-blogs.mts refuses to pass
 * while any file under src/app/api/cron/ names `updateTag` OUTSIDE A COMMENT
 * (that sweep reads comment-stripped source, which is what lets this header
 * name it seven times while the rule still bites on one line of code).
 *
 * Runs inside runCron (src/lib/cronRun.ts), which owns the CRON_SECRET check
 * before any write, the duration, and the outcome stamp on the job's
 * monitoring_checks row.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return runCron('blog-publish', request, async () => {
    // ONE atomic UPDATE, and idempotence comes from its own WHERE rather than
    // from a read-then-write check: neon-http has no transactions, and Vercel
    // documents duplicate cron invocations, so two runs racing in the same
    // minute is the ordinary case. After the first, `status` is no longer
    // `scheduled` and the second matches nothing.
    const published = await publishDuePostRows(db, new Date());
    if (published.length === 0) {
      // No activity row on a zero-work day, the house cron rule: three of the
      // other four write none either, which is why activity_log alone can
      // never answer "did it run?" and the checks row this returns to can.
      return { body: { published: 0 }, summary: 'Nothing due. No posts published' };
    }

    // EVERYTHING PAST THIS POINT IS BEST EFFORT, AND THE TRY IS THE WHOLE
    // REASON. The publish above is one atomic UPDATE with no transaction round
    // it, so those rows are already live; if a read below throws — a cold start
    // on a scale-to-zero database is the realistic one, and this job runs at
    // the same minute as the probe that wakes it — an unguarded handler would
    // reject with nothing invalidated and no activity row, and the retry
    // fifteen minutes later would match nothing and report zero. Nobody would
    // learn that N posts were live and invisible until the store's 24-hour TTL
    // lapsed, and the alert would say "the cron threw". So a failure here
    // degrades to the coarse invalidation, which is on its own enough to make
    // the posts visible, and says what happened through `warnings`.
    const warnings: string[] = [];
    try {
      const ids = published.map((row) => row.id);
      // Two batched reads rather than one per row, and both are doors the
      // editor's own bulk transitions already use. `postIdentitiesFor` answers
      // where each post LIVES (its slug, category and author on the working
      // row); `publishedRevisionsFor` joins through the pointer this UPDATE
      // just moved, so what it returns is the snapshot the public now renders.
      const [identities, revisions] = await Promise.all([
        postIdentitiesFor(ids),
        publishedRevisionsFor(ids),
      ]);
      const identityById = new Map(identities.map((row) => [row.id, row]));

      for (const row of published) {
        const identity = identityById.get(row.id);
        const revision = revisions.get(row.id);
        if (identity === undefined || revision === undefined) {
          // Structurally unreachable: both reads are keyed by ids this
          // statement just returned, `published_revision_id` is now non-null
          // (the WHERE required a non-null pending one), its FK is ON DELETE
          // RESTRICT, and the category and author joins are on NOT NULL
          // columns. A gap is a broken database rather than an ordinary
          // absence, so it is reported as a failed STEP: the run stays green
          // for the rows that did resolve, and expiring the coarse `blogs` tag
          // for any one of them is what makes every post the store has never
          // seen visible, this one included.
          warnings.push('A published post could not be read back for invalidation');
          continue;
        }
        if (revision.id !== row.publishedRevisionId) {
          // Someone republished this post between the UPDATE and the read. The
          // ref below is still right, because it describes what a visitor
          // renders NOW rather than what this run promoted; the line exists
          // because this is the one condition under which the cron's own
          // account of what it did and the bytes that went live name different
          // revisions.
          warnings.push('A post was republished while the cron was announcing it');
        }
        // The previous ref is `hiddenRef`, not nothing: a scheduled post is not
        // on the site, so the ping fires because the URL APPEARED rather than
        // because anything changed, and the fingerprint on the current ref is
        // never compared against anything on this path. It is built from the
        // real snapshot anyway. A placeholder would work today and rot silently
        // the first time a scheduled update to an already-live post ships,
        // which `blog_posts_pending_only_scheduled` defers rather than forbids
        // for ever.
        invalidateBlogFromCron(publishedRef(identity.slug, revision.snapshot), hiddenRef(identity));
      }
    } catch (error) {
      // Counts only, like every other line this job emits: the message reaches
      // the checks row, the stdout log and a monitoring signal at once.
      warnings.push(
        reportCronStep(
          'blog-publish',
          `${published.length} published ${published.length === 1 ? 'post' : 'posts'} could not be announced`,
          error,
        ),
      );
      invalidateBlogCoarseFromCron();
    }

    // ONE row per RUN, not per post, with counts and no titles: /admin/logs is
    // a wider audience than the blogs area, and a cron that published six posts
    // would otherwise write six lines nobody filed.
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'blog-publish',
      action: 'status',
      summary: `Published ${published.length} scheduled ${published.length === 1 ? 'post' : 'posts'}`,
      payload: { count: published.length },
    });

    return {
      body: { published: published.length },
      summary: `Published ${published.length} scheduled ${published.length === 1 ? 'post' : 'posts'}`,
      warnings,
    };
  });
}
