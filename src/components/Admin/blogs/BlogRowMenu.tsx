// No 'use client' directive on purpose: a leaf of the client BlogsList entry
// (the TaskRowMenu precedent) — adding it would make the function props a
// client-entry violation.
import Link from 'next/link';
import {
  LuEllipsis,
  LuExternalLink,
  LuEye,
  LuPencil,
  LuRotateCcw,
  LuTrash2,
} from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import { dropdownMenuContent, menuItem } from '@/components/Admin/menu';
import { blogRowActions } from '@/lib/blogListFields';
import type { BlogPostStatus } from '@/lib/blogFields';
import { cn } from '@/lib/utils';

/**
 * A row's ⋯ actions. Which of them appear is `blogRowActions`, never a
 * condition written here: the same decision drives the bulk bar and is swept
 * against `transitionProblem` in scripts/check-blogs.mts, so the menu can
 * never offer a move the state leaf refuses.
 *
 * Edit, Preview and View live are LINKS, so middle-click and "open in new tab"
 * work the way they do everywhere else in the dashboard. Preview and View live
 * are plain anchors with `target="_blank"`: preview is a second window on
 * purpose, and the public site is outside the installed dashboard's scope.
 * Trash, Restore and Purge are the three that write, and each one is handed
 * back to BlogsList, which fronts it with the shared ConfirmDialog.
 */
export default function BlogRowMenu({
  title,
  postId,
  status,
  liveHref,
  onTrash,
  onRestore,
  onPurge,
}: {
  title: string;
  postId: string;
  status: BlogPostStatus;
  /** The public URL, only ever passed for a post that actually has one. */
  liveHref: string;
  onTrash: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const actions = blogRowActions(status);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${title}`}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/40 group-hover/row:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
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
          <DropdownMenu.Item asChild>
            <Link
              href={`/admin/blogs/${postId}`}
              className={cn(menuItem, 'text-foreground')}
            >
              <LuPencil aria-hidden="true" className="size-3.5 shrink-0" />
              Edit
            </Link>
          </DropdownMenu.Item>
          {actions.preview && (
            <DropdownMenu.Item asChild>
              <a
                href={`/admin/blogs/${postId}/preview`}
                target="_blank"
                rel="noreferrer"
                className={cn(menuItem, 'text-foreground')}
              >
                <LuEye aria-hidden="true" className="size-3.5 shrink-0" />
                Preview
              </a>
            </DropdownMenu.Item>
          )}
          {actions.viewLive && (
            <DropdownMenu.Item asChild>
              <a
                href={liveHref}
                target="_blank"
                rel="noreferrer"
                className={cn(menuItem, 'text-foreground')}
              >
                <LuExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                View live
              </a>
            </DropdownMenu.Item>
          )}
          {actions.restore && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-foreground')}
              onSelect={onRestore}
            >
              <LuRotateCcw aria-hidden="true" className="size-3.5 shrink-0" />
              Restore
            </DropdownMenu.Item>
          )}
          {actions.trash && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-destructive')}
              onSelect={onTrash}
            >
              <LuTrash2 aria-hidden="true" className="size-3.5 shrink-0" />
              Move to trash
            </DropdownMenu.Item>
          )}
          {actions.purge && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-destructive')}
              onSelect={onPurge}
            >
              <LuTrash2 aria-hidden="true" className="size-3.5 shrink-0" />
              Delete permanently
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
