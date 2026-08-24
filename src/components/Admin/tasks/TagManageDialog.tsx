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
  createTaskTag,
  deleteTaskTag,
  setTaskTagArchived,
  updateTaskTag,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  groupTags,
  TASK_TAG_GROUPS,
  TASK_TAG_GROUP_HINTS,
  TASK_TAG_GROUP_LABELS,
  type TaskTagGroup,
} from '@/lib/taskTagFields';
import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

export type TagManageItem = {
  id: string;
  slug: string;
  name: string;
  group: TaskTagGroup;
  archived: boolean;
  categoryIds: string[];
  taskCount: number;
};

/** The task categories a tag can be scoped to — id-valued, since scope is
 *  stored as FKs (unlike the filter bar's slug-valued options). */
export type TagScopeCategory = { id: string; name: string };

/**
 * Superadmin (and owner) management of the tag vocabulary — the
 * CategoryManageDialog recipe, one concept up: rename in place (Enter/blur
 * commits), regroup, rescope, archive/restore, delete only while unused.
 *
 * Slugs are immutable (filter URLs and saved views carry them) and archive is
 * the retirement path, so a rename never orphans a bookmark and a retirement
 * never strips a historical task of its label.
 *
 * No router.refresh() on success: every tag action revalidates '/admin'
 * layout-scope, so the fresh list rides the action response.
 */
export default function TagManageDialog({
  open,
  onOpenChange,
  tags,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagManageItem[];
  categories: TagScopeCategory[];
}) {
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<TaskTagGroup>('content');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TagManageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const active = tags.filter((t) => !t.archived);
  const archived = tags.filter((t) => t.archived);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 2) return;
    setAdding(true);
    const res = await createTaskTag({
      name: newName.trim(),
      group: newGroup,
      // Global by default: a brand-new tag offered everywhere is visible and
      // easy to narrow, where one scoped to nothing would simply never
      // appear and read as a broken save.
      categoryIds: [],
    }).catch(() => null);
    setAdding(false);
    if (!res?.ok) {
      toast.error(
        res && !res.ok && res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Could not add the tag — try again.',
      );
      return;
    }
    setNewName('');
    toast.success('Tag added — pick its categories below.');
  }

  async function onDelete() {
    const target = confirmDelete;
    if (!target) return;
    setDeleting(true);
    const res = await deleteTaskTag(target.id).catch(() => null);
    setDeleting(false);
    setConfirmDelete(null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed — try again.');
      return;
    }
    toast.success('Tag deleted.');
  }

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="48rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              Task tags
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Optional labels under a category. Each tag only appears for the
              categories you pick — that&rsquo;s what keeps the list short when
              someone is logging work.
            </Dialog.Description>
          </>
        }
        footer={
          // The add form is the footer, not the tail of the list: the
          // vocabulary is ~32 rows, and reaching "new tag" used to mean
          // scrolling past every one of them.
          <form
            onSubmit={onAdd}
            className="flex flex-wrap items-center gap-2"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag name"
              aria-label="New tag name"
              autoComplete="off"
              disabled={adding}
              className="h-8 w-full flex-1 basis-40 text-sm"
            />
            <GroupSelect value={newGroup} onSelect={setNewGroup} />
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
        {groupTags(active).map((section, i) => (
          <section key={section.group} className={i === 0 ? '' : 'mt-5'}>
            <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {TASK_TAG_GROUP_LABELS[section.group]}
              <span className="ml-2 normal-case tracking-normal opacity-70">
                {TASK_TAG_GROUP_HINTS[section.group]}
              </span>
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {section.tags.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  categories={categories}
                  onDeleteRequest={() => setConfirmDelete(tag)}
                />
              ))}
            </ul>
          </section>
        ))}

        {archived.length > 0 && (
          <>
            <p className="mt-5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Archived
            </p>
            <ul className="mt-2 flex flex-col gap-1 opacity-60">
              {archived.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  categories={categories}
                  onDeleteRequest={() => setConfirmDelete(tag)}
                />
              ))}
            </ul>
          </>
        )}
      </GlassDialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !deleting && !next && setConfirmDelete(null)}
        title="Delete this tag?"
        description="It isn’t on any task, so nothing else changes. This can’t be undone."
        confirmLabel="Delete tag"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

function TagRow({
  tag,
  categories,
  onDeleteRequest,
}: {
  tag: TagManageItem;
  categories: TagScopeCategory[];
  onDeleteRequest: () => void;
}) {
  // Local, never read from the prop at write time — CategoryRow's lesson: the
  // action writes ALL of name/group/scope, so each writer has to send the
  // other two as the user currently sees them, or a regroup fired before the
  // renamed props landed writes the OLD name back.
  const [name, setName] = useState(tag.name);
  const [group, setGroup] = useState(tag.group);
  const [categoryIds, setCategoryIds] = useState(tag.categoryIds);
  const [busy, setBusy] = useState(false);

  const safeName = () => (name.trim().length >= 2 ? name.trim() : tag.name);

  async function write(
    next: { name?: string; group?: TaskTagGroup; categoryIds?: string[] },
    onFail: () => void,
  ) {
    setBusy(true);
    const res = await updateTaskTag(tag.id, {
      name: next.name ?? safeName(),
      group: next.group ?? group,
      categoryIds: next.categoryIds ?? categoryIds,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      onFail();
      toast.error(
        res && !res.ok && res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Update failed — try again.',
      );
    }
  }

  async function commitRename() {
    const trimmed = name.trim();
    if (trimmed === tag.name || trimmed.length < 2) {
      setName(tag.name);
      return;
    }
    await write({ name: trimmed }, () => setName(tag.name));
  }

  async function regroup(next: TaskTagGroup) {
    // `busy` only disables the trigger — an ALREADY-open Radix menu keeps
    // accepting picks, so the guard has to live here too.
    if (busy || next === group) return;
    const previous = group;
    setGroup(next);
    await write({ group: next }, () => setGroup(previous));
  }

  async function toggleCategory(id: string) {
    if (busy) return;
    const previous = categoryIds;
    const next = categoryIds.includes(id)
      ? categoryIds.filter((c) => c !== id)
      : [...categoryIds, id];
    setCategoryIds(next);
    await write({ categoryIds: next }, () => setCategoryIds(previous));
  }

  async function toggleArchived() {
    if (busy) return;
    setBusy(true);
    const res = await setTaskTagArchived(tag.id, !tag.archived).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Update failed — try again.');
    }
  }

  const scopeLabel =
    categoryIds.length === 0
      ? 'Every category'
      : categoryIds.length === 1
        ? (categories.find((c) => c.id === categoryIds[0])?.name ?? '1 category')
        : `${categoryIds.length} categories`;

  return (
    // A grid, not a flex row: with `flex-1` on the name field every row sized
    // its own controls, so the group and scope triggers landed at a different
    // x on each line. Fixed track widths line all four columns up down the
    // list, which is what makes 32 rows scannable.
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] items-center gap-2">
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
        aria-label={`Rename ${tag.name}`}
        disabled={busy}
        className="h-8 w-full min-w-0 text-sm"
      />
      <GroupSelect
        value={group}
        onSelect={(next) => void regroup(next)}
        disabled={busy}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={busy}
            title="Which categories offer this tag. None picked = every category."
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2.5 text-xs text-foreground disabled:opacity-50"
          >
            <span className="max-w-28 truncate">{scopeLabel}</span>
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
            <DropdownMenu.Label className="px-3 pt-1.5 pb-1 text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Offered under
            </DropdownMenu.Label>
            {categories.map((category) => {
              const on = categoryIds.includes(category.id);
              return (
                <DropdownMenu.CheckboxItem
                  key={category.id}
                  checked={on}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => void toggleCategory(category.id)}
                  className={cn(menuItem, 'text-foreground')}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                      on
                        ? 'border-transparent bg-foreground text-background'
                        : 'border-foreground/30',
                    )}
                  >
                    {on && <LuCheck className="size-2.5" />}
                  </span>
                  {category.name}
                </DropdownMenu.CheckboxItem>
              );
            })}
            <p className="px-3 pt-1.5 pb-1 text-[0.65rem] text-muted-foreground">
              None picked = offered everywhere.
            </p>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {tag.taskCount}
      </span>
      <button
        type="button"
        onClick={() => void toggleArchived()}
        disabled={busy}
        aria-label={tag.archived ? `Restore ${tag.name}` : `Archive ${tag.name}`}
        title={
          tag.archived
            ? 'Restore to the pickers'
            : 'Archive — tasks keep it; it just leaves the pickers'
        }
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {tag.archived ? (
          <LuArchiveRestore aria-hidden="true" className="size-4" />
        ) : (
          <LuArchive aria-hidden="true" className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={onDeleteRequest}
        disabled={busy || tag.taskCount > 0}
        aria-label={`Delete ${tag.name}`}
        title={tag.taskCount > 0 ? 'In use — archive it instead' : 'Delete (unused)'}
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

function GroupSelect({
  value,
  onSelect,
  disabled,
}: {
  value: TaskTagGroup;
  onSelect: (next: TaskTagGroup) => void;
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
            {TASK_TAG_GROUP_LABELS[value]}
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
          {TASK_TAG_GROUPS.map((slug) => (
            <DropdownMenu.Item
              key={slug}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect(slug)}
            >
              {slug === value ? (
                <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="flex flex-col">
                {TASK_TAG_GROUP_LABELS[slug]}
                <span className="text-[0.65rem] font-normal text-muted-foreground">
                  {TASK_TAG_GROUP_HINTS[slug]}
                </span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
