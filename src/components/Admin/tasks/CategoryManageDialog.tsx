'use client';

import { useState } from 'react';
import { Dialog, DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import {
  LuArchive,
  LuArchiveRestore,
  LuCheck,
  LuChevronDown,
  LuTrash2,
} from 'react-icons/lu';

import {
  createTaskCategory,
  deleteTaskCategory,
  setTaskCategoryArchived,
  updateTaskCategory,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_CATEGORY_SLUGS,
  type ProjectCategoryField,
} from '@/lib/portfolioFields';
import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

export type CategoryManageItem = {
  id: string;
  slug: string;
  name: string;
  siteCategory: ProjectCategoryField;
  archived: boolean;
  taskCount: number;
};

/**
 * Superadmin management of the task-category vocabulary. Rename in place
 * (Enter/blur commits), remap the site-category rollup via a dropdown,
 * archive/restore (soft — history keeps reporting), and delete only while
 * unused. Slugs are immutable (filter URLs and report history carry them).
 * No router.refresh() on success: every category action revalidates
 * '/admin' layout-scope, so the fresh list rides the action response.
 */
export default function CategoryManageDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryManageItem[];
}) {
  const [newName, setNewName] = useState('');
  const [newSite, setNewSite] = useState<ProjectCategoryField>('production');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CategoryManageItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 2) return;
    setAdding(true);
    const res = await createTaskCategory({
      name: newName.trim(),
      siteCategory: newSite,
    }).catch(() => null);
    setAdding(false);
    if (!res?.ok) {
      toast.error(
        res && !res.ok && res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Could not add the category — try again.',
      );
      return;
    }
    setNewName('');
    toast.success('Category added.');
  }

  async function onDelete() {
    const target = confirmDelete;
    if (!target) return;
    setDeleting(true);
    const res = await deleteTaskCategory(target.id).catch(() => null);
    setDeleting(false);
    setConfirmDelete(null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed — try again.');
      return;
    }
    toast.success('Category deleted.');
  }

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="40rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              Task categories
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Fine-grained categories roll up into the site&rsquo;s five service
              areas on client reports.
            </Dialog.Description>
          </>
        }
        footer={
          // Add stays reachable without scrolling the vocabulary (the tag
          // manager's rule — same shape, same reason).
          <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              aria-label="New category name"
              autoComplete="off"
              disabled={adding}
              className="h-8 w-full flex-1 basis-40 text-sm"
            />
            <SiteCategorySelect value={newSite} onSelect={setNewSite} />
            <Button
              type="submit"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={adding || newName.trim().length < 2}
            >
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </form>
        }
      >
        <ul className="flex flex-col gap-1">
          {active.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onDeleteRequest={() => setConfirmDelete(category)}
            />
          ))}
        </ul>

        {archived.length > 0 && (
          <>
            <p className="mt-5 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Archived
            </p>
            <ul className="mt-2 flex flex-col gap-1 opacity-60">
              {archived.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onDeleteRequest={() => setConfirmDelete(category)}
                />
              ))}
            </ul>
          </>
        )}
      </GlassDialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !deleting && !next && setConfirmDelete(null)}
        title="Delete this category?"
        description="It has no tasks, so nothing else changes. This can’t be undone."
        confirmLabel="Delete category"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

function CategoryRow({
  category,
  onDeleteRequest,
}: {
  category: CategoryManageItem;
  onDeleteRequest: () => void;
}) {
  const [name, setName] = useState(category.name);
  // Local, not read from the prop at write time: the action updates BOTH
  // columns, so each writer has to send the other field as the user currently
  // sees it. Reading the prop meant a remap fired before the renamed props
  // landed wrote the OLD name back — silently undoing the rename (and the
  // mirror case for a rename right after a remap).
  const [siteCategory, setSiteCategory] = useState(category.siteCategory);
  const [busy, setBusy] = useState(false);

  /** The name a non-rename write should carry: the typed one once it's valid,
   *  else the last known-good one — never a value the schema would reject. */
  const safeName = () =>
    name.trim().length >= 2 ? name.trim() : category.name;

  async function commitRename() {
    const trimmed = name.trim();
    if (trimmed === category.name || trimmed.length < 2) {
      setName(category.name);
      return;
    }
    setBusy(true);
    const res = await updateTaskCategory(category.id, {
      name: trimmed,
      siteCategory,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setName(category.name);
      toast.error('Rename failed — try again.');
      return;
    }
  }

  async function remap(next: ProjectCategoryField) {
    // `busy` only disables the trigger — an ALREADY-open Radix menu keeps
    // accepting picks, so the guard has to live here too.
    if (busy || next === siteCategory) return;
    const previous = siteCategory;
    setSiteCategory(next);
    setBusy(true);
    const res = await updateTaskCategory(category.id, {
      name: safeName(),
      siteCategory: next,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setSiteCategory(previous);
      toast.error('Update failed — try again.');
      return;
    }
  }

  async function toggleArchived() {
    if (busy) return;
    setBusy(true);
    const res = await setTaskCategoryArchived(
      category.id,
      !category.archived,
    ).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Update failed — try again.');
      return;
    }
  }

  return (
    // Grid, not flex: fixed tracks line the select, the count and the two
    // icon buttons up down the list instead of letting each row size its own
    // (TagManageDialog's rule).
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void commitRename()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label={`Rename ${category.name}`}
        disabled={busy}
        className="h-8 w-full min-w-0 text-sm"
      />
      <SiteCategorySelect
        value={siteCategory}
        onSelect={(next) => void remap(next)}
        disabled={busy}
      />
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {category.taskCount}
      </span>
      <button
        type="button"
        onClick={() => void toggleArchived()}
        disabled={busy}
        aria-label={
          category.archived
            ? `Restore ${category.name}`
            : `Archive ${category.name}`
        }
        title={
          category.archived
            ? 'Restore to the pickers'
            : 'Archive — existing tasks keep it; it just leaves the pickers'
        }
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {category.archived ? (
          <LuArchiveRestore aria-hidden="true" className="size-4" />
        ) : (
          <LuArchive aria-hidden="true" className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={onDeleteRequest}
        disabled={busy || category.taskCount > 0}
        aria-label={`Delete ${category.name}`}
        title={
          category.taskCount > 0
            ? 'In use — archive it instead'
            : 'Delete (unused)'
        }
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

function SiteCategorySelect({
  value,
  onSelect,
  disabled,
}: {
  value: ProjectCategoryField;
  onSelect: (next: ProjectCategoryField) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2.5 text-xs text-foreground disabled:opacity-50"
        >
          <span className="max-w-24 truncate">
            {PROJECT_CATEGORY_LABELS[value]}
          </span>
          <LuChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
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
          {PROJECT_CATEGORY_SLUGS.map((slug) => (
            <DropdownMenu.Item
              key={slug}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect(slug)}
            >
              {slug === value && (
                <LuCheck aria-hidden="true" className="size-3.5" />
              )}
              {PROJECT_CATEGORY_LABELS[slug]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
