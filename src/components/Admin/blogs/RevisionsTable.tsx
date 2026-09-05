'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { LuEye, LuRotateCcw } from 'react-icons/lu';

import Button from '@/components/Button';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import EmptyState from '@/components/Admin/EmptyState';
import { glassRowHover } from '@/components/Admin/Glass';
import { panelDivider, postHeadCell } from '@/components/Admin/blogs/listBox';
import {
  revisionChip,
  revisionChipCell,
  revisionGrid,
  revisionHeadRow,
  revisionRowActions,
  revisionRowPad,
  revisionRowShell,
  revisionTitleCell,
} from '@/components/Admin/blogs/postBox';
import type { BlogRevisionItem } from '@/components/Admin/blogs/postTypes';
import {
  restoreRevision,
  type BlogMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import {
  BLOG_REVISION_MARKER_LABELS,
  BLOG_REVISION_REASON_LABELS,
  blogPreviewHref,
} from '@/lib/blogFields';
import { cn } from '@/lib/utils';

/** What a failed restore says. Never a raw error: `_form` is where every blog
 *  action puts the sentence a member can act on. */
const TRANSPORT = 'Something went wrong. Try again.';

function problemFrom(res: BlogMutationResult | undefined): string | null {
  if (!res) return TRANSPORT;
  if (res.ok) return null;
  if (res.error === 'validation') return Object.values(res.issues)[0] ?? TRANSPORT;
  if (res.error === 'conflict') {
    return 'Somebody else changed this post while you were looking at it. Reload the page and try again.';
  }
  return TRANSPORT;
}

/**
 * A post's saved versions, newest first, each one previewable and each one
 * restorable.
 *
 * THREE THINGS IT DELIBERATELY DOES NOT DO.
 *
 * It infers nothing from a row's POSITION. A version may exist that neither of
 * the post's two pointers names, and one may exist that no completed save ever
 * produced: `restoreRevision` and both save doors insert the revision row
 * before they claim the version, and delete it again when they lose that race,
 * so a crash in the gap leaves a real row nothing points at. Numbers can
 * therefore have gaps, the newest row is not necessarily the working copy, and
 * the only things this screen states about a version are the ones the query
 * actually answered. Render what is there.
 *
 * It does not offer Restore on a post in the bin. That is `canRestoreRevision`,
 * a mirror of the door's own refusal, for the reason `blogRowActions` exists:
 * a control whose only outcome is a sentence saying it should not have been
 * offered is worse than no control.
 *
 * And it never calls `router.refresh()`. `restoreRevision` ends with
 * `revalidatePath('/admin', 'layout')`, so the fresh tree, including the row
 * the restore itself just wrote, rides back on the action's own response.
 */
export default function RevisionsTable({
  postId,
  version,
  items,
  hidden,
  canRestore,
}: {
  postId: string;
  /** The working row's version, the concurrency token the door takes. Read
   *  from the props on every attempt rather than mirrored into state, the
   *  `BlogsList` contract: the action revalidates this page, so the prop is
   *  what moves, and a local copy would be the thing that went stale. */
  version: number;
  items: BlogRevisionItem[];
  /** How many older versions the page's cap left out. Stated rather than
   *  silently dropped: a capped list that does not say what it cut reads as
   *  the whole history. */
  hidden: number;
  /** Whether the post's status allows a restore at all. */
  canRestore: boolean;
}) {
  const [pending, setPending] = useState<BlogRevisionItem | null>(null);
  const [busy, startTransition] = useTransition();

  function confirmRestore() {
    if (pending === null) return;
    const target = pending;
    startTransition(async () => {
      let res: BlogMutationResult | undefined;
      try {
        res = await restoreRevision(postId, target.id, version);
      } catch {
        toast.error(TRANSPORT);
        return;
      }
      const problem = problemFrom(res);
      if (problem !== null) {
        toast.error(problem);
        return;
      }
      setPending(null);
      toast.success(`Version ${target.number} is back in the editor.`);
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={LuRotateCcw}
        title="No saved versions yet"
        description="A version is written every time this post is saved, published, scheduled, unpublished or restored. Autosave writes none, so the first one appears when you press Save."
      />
    );
  }

  return (
    <>
      <div className={revisionHeadRow}>
        <div className={revisionGrid}>
          {['Version', 'What happened', 'Title', 'Saved by', 'Words', 'When', ''].map(
            (label, i) => (
              <span key={i} className={postHeadCell}>
                {label}
              </span>
            ),
          )}
        </div>
      </div>

      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(revisionRowShell, panelDivider, glassRowHover, 'last:border-b-0')}
          >
            <div className={cn(revisionRowPad, revisionGrid, 'min-w-0 flex-1')}>
              {/* 1. The number. Tabular so a two-digit history stays in a
                  column, and it is the version's own number, never its rank. */}
              <span className="text-sm font-medium tabular-nums text-foreground">
                #{item.number}
              </span>

              {/* 2. Why it exists, plus the marker when one of the post's two
                  pointers names it. On a phone these ride the same line as the
                  number, above the title. */}
              <span className={revisionChipCell}>
                <span
                  className={cn(
                    revisionChip,
                    'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
                  )}
                >
                  {BLOG_REVISION_REASON_LABELS[item.reason]}
                </span>
                {item.marker && (
                  <span
                    className={cn(
                      revisionChip,
                      item.marker === 'published'
                        ? 'border-transparent bg-foreground text-background'
                        : 'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {BLOG_REVISION_MARKER_LABELS[item.marker]}
                  </span>
                )}
              </span>

              {/* 3. The headline as it stood, and on a phone the three columns
                  after it folded onto one line beneath. The fold lives INSIDE
                  this cell rather than beside it, the BlogsList grammar: a
                  `lg:hidden` sibling would be an eighth child of a seven-column
                  grid, and reading "it is display:none at lg so the grid never
                  sees it" is a load-bearing fact about a layout that should not
                  need one. */}
              <span className={revisionTitleCell}>
                <span title={item.title} className="block truncate text-sm text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground lg:hidden">
                  {[
                    item.actorName,
                    `${item.wordCount.toLocaleString('en-US')} words`,
                    item.savedLabel,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>

              {/* 4. Who. */}
              <span
                title={item.actorName ?? undefined}
                className="hidden truncate text-xs text-muted-foreground lg:block"
              >
                {item.actorName ?? <span aria-hidden="true">—</span>}
              </span>

              {/* 5. How long it was. */}
              <span className="hidden truncate text-xs tabular-nums text-muted-foreground lg:block">
                {item.wordCount.toLocaleString('en-US')}
              </span>

              {/* 6. When, in the reader's own zone. The full stamp is the
                  title, so "3d" stays checkable without a second column. */}
              <span
                title={item.savedLabel}
                className="hidden truncate text-xs tabular-nums text-muted-foreground lg:block"
              >
                {item.savedRelative}
              </span>

              {/* 7. The two controls.

                  Preview is a plain anchor with target="_blank", exactly as it
                  is in the editor bar and the row menu: the preview renders the
                  real marketing Navbar and Footer, whose links point at `/`,
                  and following one from inside the installed dashboard app
                  ejects the member out of it. */}
              <span className={revisionRowActions}>
                <a
                  href={blogPreviewHref(postId, item.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Preview version ${item.number}`}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 px-3 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06]"
                >
                  <LuEye aria-hidden="true" className="size-3.5" />
                  Preview
                </a>
                {canRestore && (
                  <Button
                    type="button"
                    size="compact"
                    variant="secondary"
                    showIcon={false}
                    icon={LuRotateCcw}
                    iconPosition="left"
                    disabled={busy}
                    aria-label={`Restore version ${item.number}`}
                    onClick={() => setPending(item)}
                  >
                    Restore
                  </Button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <p className={cn(panelDivider, 'border-t border-b-0 px-3 py-2.5 text-xs text-muted-foreground sm:px-4')}>
          Showing the newest {items.length}. {hidden} older{' '}
          {hidden === 1 ? 'version is' : 'versions are'} not listed.
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
        title={pending ? `Restore version ${pending.number}?` : 'Restore this version?'}
        // Says what restore does NOT touch, because the reasonable expectation
        // is that going back to an old version brings back the address and the
        // date with it, and it does not.
        //
        // Two different guarantees, and it is worth not conflating them.
        // `BlogWorkingUpdate` structurally omits the status, the three date
        // columns and both pointers, so naming one of those in `restoreRevision`
        // would be a type error. The SLUG it can express: what keeps the address
        // still is that the door simply never puts one in `columns`, stated in
        // its own header. Either way this sentence is the only place a writer
        // can learn it.
        description={
          pending
            ? `This replaces what is in the editor now with the words, pictures and SEO fields from version ${pending.number}. It leaves the address, the publication dates and the status exactly as they are, and nothing reaches the public blog until you publish.`
            : ''
        }
        confirmLabel={pending ? `Restore version ${pending.number}` : 'Restore'}
        onConfirm={confirmRestore}
        pending={busy}
      />
    </>
  );
}
