// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import {
  LuCopy,
  LuCornerDownRight,
  LuEllipsis,
  LuPencil,
  LuRepeat,
  LuTrash2,
} from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

/**
 * The row's ⋯ actions: Edit (the dialog), Add revision (another round on this
 * same deliverable — a linked row, not a second delivered thing), Duplicate (a
 * one-off copy — same shape, lifecycle reset), Save as template (the same
 * shape, kept — for work that comes back), Delete (fronted by TaskBoard's
 * ConfirmDialog). Fades in on row hover; always reachable by keyboard.
 *
 * Add revision sits directly under Edit and above Duplicate deliberately: it
 * is the action members reach for when they would otherwise have typed the
 * title again with "(Eslahie)" on the end, and Duplicate is the near-miss it
 * has to beat to the eye.
 */
export default function TaskRowMenu({
  title,
  onEdit,
  onAddRevision,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
}: {
  title: string;
  onEdit: () => void;
  onAddRevision: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${title}`}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/40 group-hover/row:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
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
          <DropdownMenu.Item
            className={cn(menuItem, 'text-foreground')}
            onSelect={onEdit}
          >
            <LuPencil aria-hidden="true" className="size-3.5 shrink-0" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(menuItem, 'text-foreground')}
            onSelect={onAddRevision}
          >
            <LuCornerDownRight
              aria-hidden="true"
              className="size-3.5 shrink-0"
            />
            Add revision
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(menuItem, 'text-foreground')}
            onSelect={onDuplicate}
          >
            <LuCopy aria-hidden="true" className="size-3.5 shrink-0" />
            Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(menuItem, 'text-foreground')}
            onSelect={onSaveAsTemplate}
          >
            <LuRepeat aria-hidden="true" className="size-3.5 shrink-0" />
            Save as template
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(
              menuItem,
              'border-t border-white/40 text-destructive dark:border-white/10',
            )}
            onSelect={onDelete}
          >
            <LuTrash2 aria-hidden="true" className="size-3.5 shrink-0" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
