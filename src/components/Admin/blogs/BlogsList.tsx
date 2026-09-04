'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LuNewspaper, LuPlus, LuRotateCcw, LuSearch, LuTrash2 } from 'react-icons/lu';

import Button from '@/components/Button';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import EmptyState from '@/components/Admin/EmptyState';
import BlogRowMenu from '@/components/Admin/blogs/BlogRowMenu';
import BlogStatusPill from '@/components/Admin/blogs/BlogStatusPill';
import {
  panelRow,
  postGrid,
  postMenuGutter,
  postRowPad,
  postRowShell,
} from '@/components/Admin/blogs/listBox';
import { adminLink, glassRowHover } from '@/components/Admin/Glass';
import {
  createPost,
  purgePost,
  restorePost,
  restorePosts,
  trashPost,
  trashPosts,
  type BlogActionResult,
  type BlogBulkResult,
  type BlogMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import type { BlogPostStatus } from '@/lib/blogFields';
import { blogRowActions } from '@/lib/blogListFields';
import { cn } from '@/lib/utils';

/**
 * One row of /admin/blogs, already serialized by the page: every date is a
 * finished STRING and every decision that needed the viewer's zone was taken
 * on the server, so nothing here constructs a `Date` (the CareersRoster
 * contract, and what keeps the server render and the browser agreeing).
 */
export type BlogPostItem = {
  id: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
  /** The concurrency token the single-post doors take. */
  version: number;
  /** `robots_index` is false, so search engines are told to skip the page. */
  noindex: boolean;
  authorName: string;
  categoryTitle: string;
  /** The primary focus keyword, empty when the post has none yet. */
  focusKeyword: string;
  /** How many keywords beyond the primary one, for the `+N` after it. */
  extraKeywords: number;
  /** "Published Aug 3, 2026", "Goes live ...", "Binned ...", "Updated ...". */
  statusDateLabel: string;
  updatedLabel: string;
  /** The publish date, or the scheduled one, already formatted. */
  publishLabel: string;
  /** Whether that date has happened yet, so the column can say which it is. */
  publishIsFuture: boolean;
  /** The public URL. Only followed for a published post. */
  liveHref: string;
};

/** What a failed action says. Never a raw error: `_form` is where every blog
 *  action puts the sentence a member can act on. */
const TRANSPORT = 'Something went wrong. Try again.';

function problemFrom(
  res: BlogMutationResult | BlogBulkResult | BlogActionResult | undefined,
): string | null {
  if (!res) return TRANSPORT;
  if (res.ok) return null;
  if (res.error === 'validation') return Object.values(res.issues)[0] ?? TRANSPORT;
  if (res.error === 'conflict') {
    return 'Somebody else changed this post while you were looking at it. Reload the page and try again.';
  }
  return TRANSPORT;
}

/** What is being confirmed. `null` means no dialog is open. */
type Pending =
  | { kind: 'trash'; item: BlogPostItem }
  | { kind: 'purge'; item: BlogPostItem }
  | { kind: 'bulk-trash'; ids: string[]; published: number }
  | null;

/**
 * The posts list: a head row, one row per post, selection with a bulk bar, and
 * the row menu's three writes fronted by the shared ConfirmDialog.
 *
 * Every navigation that narrows the list belongs to BlogsFilterBar and the tab
 * links, which are URL state; nothing here filters in the browser. What lives
 * here is only what has to: the selection, the confirms, and the calls.
 *
 * No `router.refresh()` on any success path. Every door calls
 * `invalidateBlog`, which does `revalidatePath('/admin', 'layout')`, so the
 * fresh tree already rides back on the action's own response; refreshing again
 * would be roughly ten extra Neon round trips for a render we have.
 */
export default function BlogsList({
  items,
  filtered,
  emptyTitle,
  emptyDescription,
  clearHref,
}: {
  items: BlogPostItem[];
  /** Whether anything is narrowing the list, so an empty page can say which
   *  kind of empty it is. */
  filtered: boolean;
  emptyTitle: string;
  emptyDescription: string;
  clearHref: string;
}) {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [busy, startTransition] = useTransition();

  // Intersected with the rows actually on screen rather than pruned in an
  // effect: a stale id left behind by a navigation is then harmless, and the
  // count beside "selected" can never name a row nobody can see.
  const selected = useMemo(
    () => items.filter((item) => checkedIds.has(item.id)),
    [items, checkedIds],
  );

  const canTrash = selected.some((item) => blogRowActions(item.status).trash);
  const canRestore = selected.some((item) => blogRowActions(item.status).restore);
  const allChecked = items.length > 0 && selected.length === items.length;

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setCheckedIds(allChecked ? new Set() : new Set(items.map((item) => item.id)));
  }

  /** Run one door, report a refusal, and clear the selection on success. */
  function run(
    label: string,
    call: () => Promise<
      BlogMutationResult | BlogBulkResult | BlogActionResult | undefined
    >,
  ) {
    startTransition(async () => {
      let problem: string | null;
      try {
        problem = problemFrom(await call());
      } catch {
        problem = TRANSPORT;
      }
      if (problem) {
        toast.error(problem);
        return;
      }
      setPending(null);
      setCheckedIds(new Set());
      toast.success(label);
    });
  }

  function confirmPending() {
    if (pending === null) return;
    if (pending.kind === 'trash') {
      const { item } = pending;
      run(`${item.title} is in the trash.`, () => trashPost(item.id, item.version));
      return;
    }
    if (pending.kind === 'purge') {
      const { item } = pending;
      run(`${item.title} is gone.`, () => purgePost(item.id));
      return;
    }
    const { ids } = pending;
    run(
      `${ids.length} post${ids.length === 1 ? '' : 's'} moved to the trash.`,
      () => trashPosts(ids),
    );
  }

  const bulkPublished = selected.filter((item) => item.status === 'published').length;

  // `indeterminate` is a DOM property rather than an attribute, so it is set
  // imperatively (the BulkActionBar precedent). Without it a part-selected
  // page draws an EMPTY box, which reads as "nothing is selected" beside a
  // line that says four are.
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.length > 0 && !allChecked;
    }
  }, [selected.length, allChecked]);

  return (
    <>
      {/* The bulk bar is not drawn over an empty list: it hosts the select-all
          checkbox, and there is nothing to select. */}
      {items.length > 0 && (
        <div className={cn(panelRow, 'flex flex-wrap items-center gap-2')}>
          <label className="flex cursor-pointer items-center pl-0.5">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              aria-label="Select every post on this page"
              className="size-4 accent-foreground"
            />
          </label>
          {selected.length > 0 ? (
            <>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {selected.length} selected
              </span>
              {/* Trash and Restore only. There is no bulk publish: publishing
                  runs each post through the strict schema and can refuse one row
                  while taking the next, so a bulk version would have to swallow
                  the failures or explain a mixed outcome. */}
              {canTrash && (
                <Button
                  type="button"
                  size="compact"
                  variant="secondary"
                  icon={LuTrash2}
                  iconPosition="left"
                  disabled={busy}
                  onClick={() =>
                    setPending({
                      kind: 'bulk-trash',
                      ids: selected
                        .filter((item) => blogRowActions(item.status).trash)
                        .map((item) => item.id),
                      published: bulkPublished,
                    })
                  }
                >
                  Move to trash
                </Button>
              )}
              {canRestore && (
                <Button
                  type="button"
                  size="compact"
                  variant="secondary"
                  icon={LuRotateCcw}
                  iconPosition="left"
                  disabled={busy}
                  onClick={() =>
                    run('Restored.', () =>
                      restorePosts(
                        selected
                          .filter((item) => blogRowActions(item.status).restore)
                          .map((item) => item.id),
                      ),
                    )
                  }
                >
                  Restore
                </Button>
              )}
              <Button
                type="button"
                size="compact"
                variant="secondary"
                showIcon={false}
                disabled={busy}
                onClick={() => setCheckedIds(new Set())}
              >
                Clear
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Select all</span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={filtered ? LuSearch : LuNewspaper}
          title={emptyTitle}
          description={emptyDescription}
          action={
            filtered ? (
              <Link
                href={clearHref}
                className={cn(
                  adminLink,
                  'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {items.map((item) => (
            <BlogRow
              key={item.id}
              item={item}
              checked={checkedIds.has(item.id)}
              onToggle={() => toggle(item.id)}
              onTrash={() => setPending({ kind: 'trash', item })}
              onPurge={() => setPending({ kind: 'purge', item })}
              onRestore={() =>
                run(`${item.title} is back.`, () => restorePost(item.id, item.version))
              }
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(next) => !next && setPending(null)}
        title={confirmTitle(pending)}
        description={confirmDescription(pending)}
        confirmLabel={pending?.kind === 'purge' ? 'Delete permanently' : 'Move to trash'}
        destructive
        pending={busy}
        onConfirm={confirmPending}
      />
    </>
  );
}

// ── The confirm copy ────────────────────────────────────────────────────────
// Trashing a PUBLISHED post takes a live URL off the internet, and the dialog
// says so in those words rather than "this cannot be undone", which is not
// even true of the bin. Purge is the sentence that has to carry three facts:
// it is permanent, it takes the post's uploaded images with it, and the reader
// feedback votes SURVIVE, because they are keyed by slug with no foreign key
// and /admin/feedback already renders an orphan as the slug plus "(removed
// post)". Somebody about to purge a post deserves to know the tally does not
// go with it.

function confirmTitle(pending: Pending): string {
  if (pending === null) return '';
  if (pending.kind === 'purge') return 'Delete this post for good?';
  if (pending.kind === 'trash') return `Move "${pending.item.title}" to the trash?`;
  return `Move ${pending.ids.length} post${pending.ids.length === 1 ? '' : 's'} to the trash?`;
}

function confirmDescription(pending: Pending): string {
  if (pending === null) return '';
  if (pending.kind === 'purge') {
    return 'This removes the post, every saved version of it, and the images uploaded to it. It cannot be undone. Reader feedback votes are kept, and show on the feedback page under the address the post used to have.';
  }
  const live =
    pending.kind === 'trash'
      ? pending.item.status === 'published'
        ? 1
        : 0
      : pending.published;
  const opening =
    pending.kind === 'trash'
      ? 'You can restore it from the Trash tab.'
      : 'You can restore them from the Trash tab.';
  if (live === 0) return opening;
  const url = live === 1 ? 'Its public address' : 'Their public addresses';
  const verb = live === 1 ? 'starts' : 'start';
  return `${url} ${verb} returning "not found" straight away. ${opening}`;
}

/**
 * One post. The switch between the seven-column grid and the phone stack is
 * CSS alone (`postGrid` is `lg:grid`), so the first paint is right at every
 * width with no JavaScript, and there is no `useMediaQuery` to flip a render
 * later.
 */
function BlogRow({
  item,
  checked,
  onToggle,
  onTrash,
  onRestore,
  onPurge,
}: {
  item: BlogPostItem;
  checked: boolean;
  onToggle: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const meta = [item.authorName, item.categoryTitle, item.statusDateLabel]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={cn(postRowShell, glassRowHover)}>
      <div className={cn(postRowPad, postGrid, 'min-w-0 flex-1')}>
        {/* 1. Title */}
        <div className="flex min-w-0 items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`Select ${item.title}`}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/admin/blogs/${item.id}`}
                title={item.title}
                className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                {item.title}
              </Link>
              {item.noindex && <Chip>No index</Chip>}
              <span className="lg:hidden">
                <BlogStatusPill status={item.status} />
              </span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              /blogs/{item.slug}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground lg:hidden">
              {meta}
            </span>
          </span>
        </div>

        {/* 2. Status, with the date it is describing */}
        <div className="hidden min-w-0 lg:block">
          <BlogStatusPill status={item.status} />
          <span className="mt-1 block truncate text-[0.7rem] text-muted-foreground">
            {item.statusDateLabel}
          </span>
        </div>

        {/* 3. Author */}
        <span
          title={item.authorName}
          className="hidden truncate text-xs text-muted-foreground lg:block"
        >
          {item.authorName}
        </span>

        {/* 4. Category */}
        <span
          title={item.categoryTitle}
          className="hidden truncate text-xs text-muted-foreground lg:block"
        >
          {item.categoryTitle}
        </span>

        {/* 5. Focus keyword */}
        <span
          title={item.focusKeyword || undefined}
          className="hidden min-w-0 truncate text-xs text-muted-foreground lg:block"
        >
          {item.focusKeyword ? (
            <>
              {item.focusKeyword}
              {item.extraKeywords > 0 && (
                <span className="text-muted-foreground/70"> +{item.extraKeywords}</span>
              )}
            </>
          ) : (
            <span aria-hidden="true">—</span>
          )}
        </span>

        {/* 6. Updated */}
        <span className="hidden truncate text-xs tabular-nums text-muted-foreground lg:block">
          {item.updatedLabel}
        </span>

        {/* 7. Published, or the day it is due to be */}
        <span className="hidden truncate text-xs tabular-nums text-muted-foreground lg:block">
          {item.publishLabel ? (
            <span className={cn(item.publishIsFuture && 'text-amber-700 dark:text-amber-400')}>
              {item.publishLabel}
            </span>
          ) : (
            <span aria-hidden="true">—</span>
          )}
        </span>
      </div>

      <div className={postMenuGutter}>
        <BlogRowMenu
          title={item.title}
          postId={item.id}
          status={item.status}
          liveHref={item.liveHref}
          onTrash={onTrash}
          onRestore={onRestore}
          onPurge={onPurge}
        />
      </div>
    </li>
  );
}

/** A quiet marker beside a title. Ink, not colour: nothing here is a warning. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * The header's "New post".
 *
 * It calls `createPost`, which inserts a draft and redirects into the editor.
 * It is NOT a link to a page that creates on render: Next prefetches every
 * in-viewport link, so a GET that writes a row would mint a draft every time
 * the header scrolled into view.
 *
 * A successful call resolves with no value, because the action redirected and
 * the router is already navigating. Only a result that came back and refused
 * is worth a toast; treating the silent case as a failure would put an error
 * on the screen of every post that was created correctly.
 */
export function NewPostButton() {
  const [busy, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="small"
      icon={LuPlus}
      iconPosition="left"
      shimmer={false}
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          try {
            const res: BlogMutationResult | undefined = await createPost();
            if (res && !res.ok) toast.error(problemFrom(res));
          } catch {
            toast.error(TRANSPORT);
          }
        })
      }
    >
      {busy ? 'Starting…' : 'New post'}
    </Button>
  );
}
