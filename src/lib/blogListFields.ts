import { BLOG_POST_STATUSES, BLOG_POST_STATUS_LABELS, type BlogPostStatus } from '@/lib/blogFields';
import { blogStatusFilter, type BlogListStatus } from '@/lib/blogFilters';

/**
 * What the /admin/blogs posts LIST decides from a post's status: which tab it
 * counts under, which date its Status cell states, and which of the row menu's
 * destructive moves it is offered.
 *
 * Separate from blogFilters.ts (the URL contract) and from blogFields.ts (what
 * a post IS) because it is neither: it is the screen's own vocabulary, read by
 * the list, its row menu and its bulk bar. Zero runtime dependencies for the
 * same reason both of those are — the filter bar and the list are client
 * components, and scripts/check-blogs.mts imports this under plain node.
 *
 * THREE THINGS LIVE HERE, and each is silent on screen when it is wrong:
 *
 *  1. `blogTabCount` — the number on a tab must be the number of rows that tab
 *     returns. `all` is the one that can drift, because "all" is not "every
 *     row": the trash is excluded, and that rule lives in `blogStatusFilter`
 *     alone. Summing the whole counts record instead would put a number on the
 *     default tab that no page of it ever adds up to, and nothing on screen
 *     would say which half was wrong.
 *
 *  2. `blogRowActions` — Purge is the one irreversible act in this domain, and
 *     it is offered ONLY from the bin. Offering it a status early deletes a
 *     live article, its images and its history from a menu somebody opened to
 *     find "Edit". The trash/restore halves are asserted against
 *     `transitionProblem` in the check script rather than restated here, so a
 *     menu can never offer a move the state leaf refuses.
 *
 *  3. `blogStatusDate` — which instant the Status cell is describing. Label a
 *     scheduled post's future `publish_at` as "Published" and the list claims
 *     a post is live that is not.
 */

// ── Tabs ────────────────────────────────────────────────────────────────────

/**
 * The tab strip, left to right: the default view, then every stored status in
 * the order `BLOG_POST_STATUSES` declares (draft, scheduled, published,
 * archived, trash). DERIVED from that tuple rather than typed out, so a status
 * added to the vocabulary is a tab here without a second edit, and the trash
 * can never end up somewhere other than last.
 */
export const BLOG_LIST_TABS: readonly BlogListStatus[] = ['all', ...BLOG_POST_STATUSES];

/** The tab's label. `all` is the only one this file names; the rest are the
 *  same words the status pill uses, so a tab and a row cannot disagree about
 *  what a state is called. */
export function blogTabLabel(tab: BlogListStatus): string {
  return tab === 'all' ? 'All' : BLOG_POST_STATUS_LABELS[tab];
}

/**
 * The badge on a tab, from the one grouped count query.
 *
 * `all` folds over exactly the statuses `blogStatusFilter('all')` names, which
 * is the same list the WHERE clause applies, so the badge and the list are the
 * same set by construction. `blogStatusFilter` never returns null for a real
 * tab; the fallback is there only so this stays total.
 */
export function blogTabCount(
  tab: BlogListStatus,
  counts: Record<BlogPostStatus, number>,
): number {
  const statuses = blogStatusFilter(tab);
  if (statuses === null) return 0;
  return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
}

// ── The row menu ────────────────────────────────────────────────────────────

/** Which of the row menu's items this status may offer. Edit is absent because
 *  every row has it: a post with no editor door is unreachable. */
export type BlogRowActions = {
  /** The draft, as it will look once published. Any status: the preview reads
   *  the working copy, which exists whatever state the post is in. */
  preview: boolean;
  /** The public URL. Only `published` has one that resolves. */
  viewLive: boolean;
  trash: boolean;
  restore: boolean;
  /** Permanent. Only from the bin, so nothing can be destroyed without having
   *  been binned first, which is a second deliberate act. */
  purge: boolean;
};

export function blogRowActions(status: BlogPostStatus): BlogRowActions {
  const binned = status === 'trash';
  return {
    preview: true,
    viewLive: status === 'published',
    trash: !binned,
    restore: binned,
    purge: binned,
  };
}

// ── Bulk ────────────────────────────────────────────────────────────────────

/**
 * What a SELECTION may be moved through, and it is deliberately short.
 *
 * There is no bulk publish. Publishing runs a post's fields through the strict
 * schema and can refuse one row while taking the next, so a bulk version would
 * have to either swallow the failures or explain a mixed outcome, and both of
 * those are worse than making the writer publish each post from its own
 * editor, where the refusal is a sentence beside the field that caused it.
 * There is no bulk purge either: purge deletes uploaded images and cannot be
 * undone, so it stays a single row behind its own confirm.
 */
export const BLOG_BULK_ACTIONS = ['trash', 'restore'] as const;

export type BlogBulkAction = (typeof BLOG_BULK_ACTIONS)[number];

/**
 * What a bulk door DID, in words.
 *
 * `count` must be the number the door itself returned, never the size of the
 * selection that was sent. Both bulk doors have three `count: 0` early
 * returns, and the statement under them skips a row somebody else already
 * moved rather than restamping it, so a selection of five can legitimately
 * move none. "5 posts moved to the trash" over that is a report of work that
 * did not happen, and the returned count exists precisely to prevent it.
 *
 * Zero therefore gets its own sentence rather than the number: "0 posts moved
 * to the trash" is a confirmation of a non-event, and it reads as success.
 */
export function bulkOutcome(count: number, moved: string, none: string): string {
  if (count <= 0) return none;
  return `${count} post${count === 1 ? '' : 's'} ${moved}.`;
}

// ── The Status cell's date ──────────────────────────────────────────────────

/** Which instant the Status cell is stating. */
export type BlogStatusDateKind = 'published' | 'scheduled' | 'trashed' | 'updated';

/**
 * A published post states when it went live, a scheduled one when it will, a
 * binned one when it was binned, and everything else the last time anybody
 * touched it. Archived falls to `updated` on purpose: it HAS a publish date,
 * but "Published <date>" over a post that no longer resolves reads as a claim
 * that it is live.
 */
export function blogStatusDate(status: BlogPostStatus): BlogStatusDateKind {
  if (status === 'published') return 'published';
  if (status === 'scheduled') return 'scheduled';
  if (status === 'trash') return 'trashed';
  return 'updated';
}

/** The word in front of that date. Sentence-cased, because it opens a line. */
export const BLOG_STATUS_DATE_LABELS: Record<BlogStatusDateKind, string> = {
  published: 'Published',
  scheduled: 'Goes live',
  trashed: 'Binned',
  updated: 'Updated',
};
