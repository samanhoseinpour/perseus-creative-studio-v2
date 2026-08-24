'use client';

import { useMemo, useState } from 'react';
import { Dialog, DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import {
  LuArchive,
  LuArchiveRestore,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuGlobe,
  LuPlus,
  LuTrash2,
} from 'react-icons/lu';

import {
  createTaskTag,
  deleteTaskTag,
  setCategoryTagOffers,
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
import TaskTagChip from './TaskTagChip';
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

/** The left rail's selection. A category id, or one of two special panes. */
const EVERYWHERE = '__everywhere';
const ALL_TAGS = '__all';

/**
 * Management of the tag vocabulary, open to anyone holding the 'tasks' area.
 *
 * CATEGORY-FIRST, which is the whole point of the shape. Scope is *stored*
 * per tag, but nobody thinks that way: the question people actually have is
 * "when I log Video Editing work, which labels should I see?". Answering that
 * through the old per-tag rows meant opening one dropdown per tag — thirty-odd
 * of them — and each tick was its own round trip. Here a category is a pane,
 * its tags are a checklist, and the whole pane saves once.
 *
 * The tag-major view survives as "All tags", because renaming, regrouping,
 * archiving and deleting are genuinely per-tag acts.
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
  const [picked, setPane] = useState<string>(categories[0]?.id ?? ALL_TAGS);
  const [confirmDelete, setConfirmDelete] = useState<TagManageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Derived, not an effect: a category can be archived out from under the
  // selection while the dialog is open, and falling back during render beats
  // a setState that would paint the empty pane for one frame first.
  const fallback = categories[0]?.id ?? ALL_TAGS;
  const pane =
    picked === ALL_TAGS ||
    picked === EVERYWHERE ||
    categories.some((c) => c.id === picked)
      ? picked
      : fallback;

  const active = useMemo(() => tags.filter((t) => !t.archived), [tags]);
  const globals = useMemo(
    () => active.filter((t) => t.categoryIds.length === 0),
    [active],
  );

  const current = categories.find((c) => c.id === pane) ?? null;

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
        maxWidth="52rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              Task tags
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Optional labels under a category. Pick a category and tick what it
              offers — that&rsquo;s what keeps the list short when someone is
              logging work.
            </Dialog.Description>
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)]">
          <nav
            aria-label="Tag settings"
            className="flex flex-col gap-0.5 md:sticky md:top-0 md:self-start"
          >
            <p className="px-2 pb-1 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Categories
            </p>
            {categories.map((category) => (
              <RailButton
                key={category.id}
                active={pane === category.id}
                label={category.name}
                count={
                  active.filter((t) => t.categoryIds.includes(category.id))
                    .length
                }
                onClick={() => setPane(category.id)}
              />
            ))}
            <RailButton
              active={pane === EVERYWHERE}
              label="Every category"
              icon={LuGlobe}
              count={globals.length}
              onClick={() => setPane(EVERYWHERE)}
            />
            <div className="my-1.5 border-t border-white/40 dark:border-white/10" />
            <RailButton
              active={pane === ALL_TAGS}
              label="All tags"
              chevron
              count={tags.length}
              onClick={() => setPane(ALL_TAGS)}
            />
          </nav>

          <div className="min-w-0">
            {pane === ALL_TAGS ? (
              <AllTagsPane
                tags={tags}
                categories={categories}
                onDeleteRequest={setConfirmDelete}
              />
            ) : pane === EVERYWHERE ? (
              <EverywherePane tags={globals} />
            ) : current ? (
              <CategoryPane
                key={current.id}
                category={current}
                tags={active}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a task category first — tags hang off them.
              </p>
            )}
          </div>
        </div>
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

function RailButton({
  active,
  label,
  count,
  icon: Icon,
  chevron,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  chevron?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-foreground/[0.08] font-medium text-foreground'
          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {count}
      </span>
      {chevron && (
        <LuChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
      )}
    </button>
  );
}

/**
 * One category's offer sheet — the pane this redesign exists for.
 *
 * The draft is local and saves ONCE, replacing the old per-checkbox write.
 * `offered` is seeded from props and the component is keyed by category id, so
 * switching panes re-seeds rather than carrying a stale set across.
 *
 * Two tags can't be toggled here, both for the same reason — empty scope means
 * "offered everywhere", so the model can't express "offered nowhere":
 *
 *  - a GLOBAL tag would have to become "every category except this one",
 *    silently demoting it so no category added later would pick it up;
 *  - a tag whose only category is this one would land on zero rows and
 *    reappear under every category instead of none.
 *
 * Both render ticked and disabled with a reason, and the server refuses them
 * again in setCategoryTagOffers — a stale client is exactly the case that
 * matters.
 */
function CategoryPane({
  category,
  tags,
}: {
  category: TagScopeCategory;
  tags: TagManageItem[];
}) {
  const scoped = useMemo(
    () => tags.filter((t) => t.categoryIds.length > 0),
    [tags],
  );
  const globals = useMemo(
    () => tags.filter((t) => t.categoryIds.length === 0),
    [tags],
  );
  const saved = useMemo(
    () =>
      new Set(
        scoped.filter((t) => t.categoryIds.includes(category.id)).map((t) => t.id),
      ),
    [scoped, category.id],
  );

  const [offered, setOffered] = useState<Set<string>>(() => new Set(saved));
  const [saving, setSaving] = useState(false);

  const changed = useMemo(() => {
    if (offered.size !== saved.size) return true;
    for (const id of offered) if (!saved.has(id)) return true;
    return false;
  }, [offered, saved]);

  /** Would unticking this leave the tag with no category at all? */
  const isOnlyHere = (tag: TagManageItem) =>
    tag.categoryIds.length === 1 && tag.categoryIds[0] === category.id;

  function toggle(tag: TagManageItem) {
    if (isOnlyHere(tag)) return;
    setOffered((prev) => {
      const next = new Set(prev);
      if (next.has(tag.id)) next.delete(tag.id);
      else next.add(tag.id);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    const res = await setCategoryTagOffers({
      categoryId: category.id,
      tagIds: [...offered],
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Update failed — try again.');
      return;
    }
    toast.success(`Saved — ${category.name} tags updated.`);
  }

  const sections = groupTags(scoped);

  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        Offered when logging {category.name} work
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tick a label to put it in this category&rsquo;s picker. Nothing here
        changes the tasks that already carry a tag.
      </p>

      {sections.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No category-specific tags yet. Add one below.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.group} className="mt-4">
          <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {TASK_TAG_GROUP_LABELS[section.group]}
            <span className="ml-2 normal-case tracking-normal opacity-70">
              {TASK_TAG_GROUP_HINTS[section.group]}
            </span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {section.tags.map((tag) => {
              const on = offered.has(tag.id);
              const locked = isOnlyHere(tag);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => toggle(tag)}
                    disabled={saving || locked}
                    aria-pressed={on}
                    title={
                      locked
                        ? `Only ${category.name} offers "${tag.name}" — archive it from All tags instead of removing it here.`
                        : undefined
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors',
                      on
                        ? 'border-foreground/25 bg-foreground/[0.06]'
                        : 'border-foreground/10 opacity-60 hover:opacity-100',
                      locked ? 'cursor-not-allowed' : 'cursor-pointer',
                      saving && 'opacity-50',
                    )}
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
                    <TaskTagChip tag={tag} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {globals.length > 0 && (
        <section className="mt-5">
          <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Always offered
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {globals.map((tag) => (
              <li key={tag.id}>
                <span
                  title={`"${tag.name}" is offered under every category. Narrow it from All tags.`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-2 py-1 text-xs"
                >
                  <LuGlobe
                    aria-hidden="true"
                    className="size-3 shrink-0 text-muted-foreground"
                  />
                  <TaskTagChip tag={tag} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
            These reach every category, so they aren&rsquo;t ticked here. Change
            one under &ldquo;All tags&rdquo;.
          </p>
        </section>
      )}

      <NewTagForm
        categoryId={category.id}
        hint={`Added to ${category.name} only`}
        onCreated={(id) => setOffered((prev) => new Set(prev).add(id))}
      />

      <div className="sticky bottom-0 -mx-1 mt-5 flex items-center justify-end gap-3 bg-linear-to-t from-white/80 to-transparent px-1 pt-3 pb-1 dark:from-neutral-950/70">
        {changed && (
          <span className="text-xs text-muted-foreground">
            Unsaved changes
          </span>
        )}
        <Button
          type="button"
          size="small"
          shimmer={false}
          showIcon={false}
          disabled={saving || !changed}
          onClick={() => void onSave()}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

/** The global tags, read-only here plus a create door — the one place where
 *  making a tag that reaches everything is the obvious action. */
function EverywherePane({ tags }: { tags: TagManageItem[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        Offered under every category
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Labels that describe the work rather than the craft — &ldquo;Revision&rdquo;,
        &ldquo;Urgent&rdquo;. They appear in every picker, including categories
        added later.
      </p>

      {tags.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          None yet. Add one below.
        </p>
      ) : (
        groupTags(tags).map((section) => (
          <section key={section.group} className="mt-4">
            <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {TASK_TAG_GROUP_LABELS[section.group]}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {section.tags.map((tag) => (
                <li key={tag.id}>
                  <TaskTagChip tag={tag} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <NewTagForm categoryId={null} hint="Offered everywhere" />
    </div>
  );
}

/**
 * Create a tag already scoped where it was created — the fix for the old flow,
 * which made every new tag global and then told you by toast to go find its
 * row and narrow it.
 */
function NewTagForm({
  categoryId,
  hint,
  onCreated,
}: {
  /** `null` creates a global tag (the Every category pane). */
  categoryId: string | null;
  hint: string;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<TaskTagGroup>('content');
  const [adding, setAdding] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setAdding(true);
    const res = await createTaskTag({
      name: name.trim(),
      group,
      categoryIds: categoryId ? [categoryId] : [],
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
    setName('');
    onCreated?.(res.id);
    toast.success('Tag added.');
  }

  return (
    <form
      onSubmit={onAdd}
      className="mt-5 border-t border-white/40 pt-4 dark:border-white/10"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag name"
          aria-label="New tag name"
          autoComplete="off"
          disabled={adding}
          className="h-8 w-full flex-1 basis-40 text-sm"
        />
        <GroupSelect value={group} onSelect={setGroup} disabled={adding} />
        <Button
          type="submit"
          size="small"
          variant="secondary"
          icon={LuPlus}
          iconPosition="left"
          shimmer={false}
          disabled={adding || name.trim().length < 2}
        >
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </div>
      <p className="mt-1.5 text-[0.65rem] text-muted-foreground">{hint}</p>
    </form>
  );
}

/**
 * The tag-major view: rename, regroup, rescope wholesale, archive, delete.
 * These are genuinely per-tag acts, which is why this pane survives the
 * category-first redesign rather than being replaced by it.
 */
function AllTagsPane({
  tags,
  categories,
  onDeleteRequest,
}: {
  tags: TagManageItem[];
  categories: TagScopeCategory[];
  onDeleteRequest: (tag: TagManageItem) => void;
}) {
  const active = tags.filter((t) => !t.archived);
  const archived = tags.filter((t) => t.archived);

  return (
    <div>
      <p className="text-sm font-medium text-foreground">Every tag</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Rename, move between groups, or change which categories offer a tag. A
        tag&rsquo;s name can change; its filter link never does.
      </p>

      <TagHeaderRow />

      {groupTags(active).map((section) => (
        <section key={section.group} className="mt-3">
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
                onDeleteRequest={() => onDeleteRequest(tag)}
              />
            ))}
          </ul>
        </section>
      ))}

      {archived.length > 0 && (
        <>
          <p className="mt-5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Archived
            <span className="ml-2 normal-case tracking-normal opacity-70">
              Off the pickers; still on the tasks that carry them
            </span>
          </p>
          <ul className="mt-2 flex flex-col gap-1 opacity-60">
            {archived.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                categories={categories}
                onDeleteRequest={() => onDeleteRequest(tag)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Column headings for the rows below. Six controls per row with nothing
 *  naming them is what made the old list unreadable — the task count in
 *  particular rendered as a bare number with no label anywhere on screen. */
function TagHeaderRow() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] items-center gap-2 border-b border-white/40 pb-1.5 text-[0.6rem] font-medium tracking-[0.15em] text-muted-foreground uppercase dark:border-white/10"
    >
      <span>Tag</span>
      <span className="w-24 text-center">Group</span>
      <span className="w-32 text-center">Offered under</span>
      <span className="w-8 text-right">Tasks</span>
      <span className="w-7" />
      <span className="w-7" />
    </div>
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

  async function setScope(next: string[]) {
    if (busy) return;
    const previous = categoryIds;
    setCategoryIds(next);
    await write({ categoryIds: next }, () => setCategoryIds(previous));
  }

  function toggleCategory(id: string) {
    setScope(
      categoryIds.includes(id)
        ? categoryIds.filter((c) => c !== id)
        : [...categoryIds, id],
    );
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

  const everywhere = categoryIds.length === 0;
  const scopeLabel = everywhere
    ? 'Every category'
    : categoryIds.length === 1
      ? (categories.find((c) => c.id === categoryIds[0])?.name ?? '1 category')
      : `${categoryIds.length} categories`;

  return (
    // A grid, not a flex row: with `flex-1` on the name field every row sized
    // its own controls, so the group and scope triggers landed at a different
    // x on each line. Fixed track widths line all four columns up down the
    // list, which is what makes 32 rows scannable — and lets TagHeaderRow
    // above sit on the same tracks.
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
            aria-label={`Categories offering ${tag.name}`}
            className="inline-flex h-8 w-32 shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2.5 text-xs text-foreground disabled:opacity-50"
          >
            <span className="truncate">{scopeLabel}</span>
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
            {/* An explicit row, because "every category" used to be spelled
                only as the ABSENCE of ticks plus a line of fine print. */}
            <DropdownMenu.Item
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => void setScope([])}
            >
              {everywhere ? (
                <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              Every category
            </DropdownMenu.Item>
            <div className="my-1 border-t border-white/40 dark:border-white/10" />
            {categories.map((category) => {
              const on = categoryIds.includes(category.id);
              return (
                <DropdownMenu.CheckboxItem
                  key={category.id}
                  checked={on}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleCategory(category.id)}
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
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <span
        title={`On ${tag.taskCount} task${tag.taskCount === 1 ? '' : 's'}`}
        className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
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
        className="w-7 shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
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
        className="w-7 shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
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
          aria-label="Group"
          className="inline-flex h-8 w-24 shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2.5 text-xs text-foreground disabled:opacity-50"
        >
          <span className="truncate">{TASK_TAG_GROUP_LABELS[value]}</span>
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
