// No 'use client' directive on purpose: a leaf of PostEditor, which is the
// client entry (the BlogRowMenu / TaskRowMenu precedent). Adding one would
// only turn the function props into a client-entry boundary for nothing.
import Link from 'next/link';
import {
  LuArrowLeft,
  LuCalendarClock,
  LuCalendarDays,
  LuEllipsis,
  LuExternalLink,
  LuEye,
  LuHistory,
  LuRotateCcw,
  LuScrollText,
  LuSettings2,
  LuSquareStack,
  LuTrash2,
  LuUpload,
} from 'react-icons/lu';

import Button from '@/components/Button';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import { dropdownMenuContent, menuItem } from '@/components/Admin/menu';
import BlogStatusPill from '@/components/Admin/blogs/BlogStatusPill';
import type { PublishMode } from '@/components/Admin/blogs/PublishDialog';
import {
  editorBar,
  editorBarActions,
  editorBarLead,
  editorSaveState,
} from '@/components/Admin/blogs/postBox';
import type { BlogEditorPost } from '@/components/Admin/blogs/postTypes';
import { activityHistoryHref } from '@/lib/activityFilters';
import { blogPreviewHref, blogRevisionsHref } from '@/lib/blogFields';
import {
  BLOG_SAVE_STATE_LABELS,
  PRIMARY_ACTION_GATE,
  blogEditorActions,
  primaryAction,
  type BlogSaveState,
} from '@/lib/blogEditorFields';
import { cn } from '@/lib/utils';

/**
 * The editor's sticky bar: where you are, whether it is saved, and every move
 * that changes what the public can see.
 *
 * WHAT APPEARS IS `blogEditorActions`, never a condition written here, and that
 * leaf derives its answer from `transitionProblem`. A menu that offers a move
 * the state leaf refuses is a button whose only outcome is a sentence saying it
 * should not have been offered. `blogRowActions` and the list's ⋯ menu are the
 * same arrangement.
 *
 * PREVIEW OPENS IN A NEW TAB, and it is a plain anchor rather than a `Link` so
 * that middle-click and "open in new tab" behave the way they do everywhere
 * else. The new tab is the point: the preview renders the real marketing
 * Navbar and Footer, whose links point at `/`, and following one of those from
 * inside the installed dashboard app ejects the member out of it.
 *
 * The overflow carries the moves that are rarer than the primary one, plus the
 * two read surfaces. History is gated on the viewer's own `logs` grant,
 * because a deep link into a section they do not hold bounces them to Overview
 * with nothing on screen to explain it.
 */
export default function EditorTopBar({
  post,
  saveState,
  dirty,
  blocked,
  busy,
  canLogs,
  onSave,
  onOpenDialog,
  onAmendDate,
  onUnschedule,
  onUnpublish,
  onTrash,
  onRestore,
  onOpenSettings,
}: {
  post: BlogEditorPost;
  saveState: BlogSaveState;
  dirty: boolean;
  blocked: boolean;
  /** An explicit action is in flight, so nothing else may be started. */
  busy: boolean;
  canLogs: boolean;
  onSave: () => void;
  onOpenDialog: (mode: PublishMode) => void;
  onAmendDate: () => void;
  onUnschedule: () => void;
  onUnpublish: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onOpenSettings: () => void;
}) {
  const actions = blogEditorActions(post.status, { everPublished: post.everPublished });
  const primary = primaryAction(post.status);
  const frozen = blocked || busy;

  return (
    <div className={editorBar}>
      <GlassRim />
      <div className={editorBarLead}>
        <Link
          href="/admin/blogs"
          aria-label="Back to the posts list"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <LuArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <BlogStatusPill status={post.status} />
        <span className={editorSaveState} aria-live="polite">
          {BLOG_SAVE_STATE_LABELS[saveState]}
        </span>
      </div>

      <div className={editorBarActions}>
        <Button
          type="button"
          size="compact"
          variant="secondary"
          showIcon={false}
          icon={LuSettings2}
          iconPosition="left"
          className="lg:hidden"
          onClick={onOpenSettings}
        >
          Settings
        </Button>

        <a
          href={blogPreviewHref(post.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 px-3 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06]"
        >
          <LuEye aria-hidden="true" className="size-3.5" />
          Preview
        </a>

        {actions.save && (
          <Button
            type="button"
            size="compact"
            variant="secondary"
            showIcon={false}
            disabled={frozen || !dirty}
            onClick={onSave}
          >
            Save
          </Button>
        )}

        {/* Gated on the flag for the action it actually fires, never on
            `publish`: a scheduled post's primary opens the schedule dialog. */}
        {primary && actions[PRIMARY_ACTION_GATE[primary.action]] && (
          <Button
            type="button"
            size="compact"
            shimmer={false}
            showIcon={false}
            disabled={frozen}
            onClick={() => onOpenDialog(primary.action)}
          >
            {primary.label}
          </Button>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="More actions for this post"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              <LuEllipsis aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              data-lenis-prevent
              className={dropdownMenuContent}
            >
              <GlassRim />

              {actions.schedule && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={() => onOpenDialog('schedule')}
                >
                  <LuCalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                  Schedule instead
                </DropdownMenu.Item>
              )}

              {post.status === 'scheduled' && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={() => onOpenDialog('publish-now')}
                >
                  <LuUpload aria-hidden="true" className="size-3.5 shrink-0" />
                  Publish now
                </DropdownMenu.Item>
              )}

              {actions.unschedule && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={onUnschedule}
                >
                  <LuCalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                  Cancel the schedule
                </DropdownMenu.Item>
              )}

              {actions.amendDate && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={onAmendDate}
                >
                  <LuCalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                  Change the publication date
                </DropdownMenu.Item>
              )}

              {actions.unpublish && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={onUnpublish}
                >
                  <LuScrollText aria-hidden="true" className="size-3.5 shrink-0" />
                  Unpublish
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item asChild>
                <Link
                  href={blogRevisionsHref(post.id)}
                  className={cn(menuItem, 'text-foreground')}
                >
                  <LuSquareStack aria-hidden="true" className="size-3.5 shrink-0" />
                  Saved versions
                </Link>
              </DropdownMenu.Item>

              {post.status === 'published' && (
                <DropdownMenu.Item asChild>
                  <a
                    href={post.publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(menuItem, 'text-foreground')}
                  >
                    <LuExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                    View live
                  </a>
                </DropdownMenu.Item>
              )}

              {canLogs && (
                <DropdownMenu.Item asChild>
                  <Link
                    href={activityHistoryHref('blog-post', post.id)}
                    className={cn(menuItem, 'text-foreground')}
                  >
                    <LuHistory aria-hidden="true" className="size-3.5 shrink-0" />
                    History
                  </Link>
                </DropdownMenu.Item>
              )}

              {actions.restore && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-foreground')}
                  onSelect={onRestore}
                >
                  <LuRotateCcw aria-hidden="true" className="size-3.5 shrink-0" />
                  Restore
                </DropdownMenu.Item>
              )}

              {actions.trash && (
                <DropdownMenu.Item
                  disabled={frozen}
                  className={cn(menuItem, 'text-destructive')}
                  onSelect={onTrash}
                >
                  <LuTrash2 aria-hidden="true" className="size-3.5 shrink-0" />
                  Move to trash
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
