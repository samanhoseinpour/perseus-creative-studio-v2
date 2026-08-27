'use client';

import { useMemo, useState } from 'react';
import { Dialog } from 'radix-ui';
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
  createTaskTagType,
  deleteTaskTag,
  deleteTaskTagType,
  setCategoryTagOffers,
  setTaskTagArchived,
  setTaskTagTypeArchived,
  updateTaskTag,
  updateTaskTagType,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  sectionTags,
  TASK_TAG_TONE_KEYS,
  TASK_TAG_TONES,
  type TaskTagTone,
  type TaskTagType,
} from '@/lib/taskTagFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
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
  typeId: string;
  tone: TaskTagTone;
  archived: boolean;
  typeArchived: boolean;
  categoryIds: string[];
  taskCount: number;
};

/** A tag type with the tally that decides archive-vs-delete. */
export type TagTypeItem = TaskTagType & { tagCount: number };

/** The task categories a tag can be scoped to — id-valued, since scope is
 *  stored as FKs (unlike the filter bar's slug-valued options). */
export type TagScopeCategory = { id: string; name: string };

/** The left rail's selection. A category id, or one of three special panes. */
const EVERYWHERE = '__everywhere';
const ALL_TAGS = '__all';
const TYPES = '__types';

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
 * Two tag-major panes survive, because their acts are genuinely per-row:
 * "All tags" (rename, retype, rescope, archive, delete) and "Tag types" (the
 * axes themselves — rows since 2026-08-24, so the studio names its own).
 *
 * Slugs are immutable (filter URLs and saved views carry them) and archive is
 * the retirement path, so a rename never orphans a bookmark and a retirement
 * never strips a historical task of its label.
 *
 * THE CATEGORY DRAFT LIVES HERE, not in CategoryPane, because Save sits in the
 * dialog's footer slot — outside the scroller, where it stays reachable
 * without the sticky gradient bar that used to float across the pane. The
 * draft is keyed by category id and falls back during render when the pane
 * changes (the derived-not-effect idiom this file already runs on `pane`),
 * which is what the old `key={category.id}` remount did.
 *
 * No router.refresh() on success: every tag action revalidates '/admin'
 * layout-scope, so the fresh list rides the action response.
 */
export default function TagManageDialog({
  open,
  onOpenChange,
  tags,
  tagTypes,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagManageItem[];
  tagTypes: TagTypeItem[];
  categories: TagScopeCategory[];
}) {
  const [picked, setPane] = useState<string>(categories[0]?.id ?? ALL_TAGS);
  const [confirmDelete, setConfirmDelete] = useState<TagManageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmType, setConfirmType] = useState<TagTypeItem | null>(null);
  const [deletingType, setDeletingType] = useState(false);
  const [draft, setDraft] = useState<{
    categoryId: string;
    offered: Set<string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Derived, not an effect: a category can be archived out from under the
  // selection while the dialog is open, and falling back during render beats
  // a setState that would paint the empty pane for one frame first.
  const fallback = categories[0]?.id ?? ALL_TAGS;
  const pane =
    picked === ALL_TAGS ||
    picked === EVERYWHERE ||
    picked === TYPES ||
    categories.some((c) => c.id === picked)
      ? picked
      : fallback;

  // "Active" means offered somewhere: a tag is out of the pickers if it is
  // archived OR its whole type is. Both are invisible in the category pane,
  // and setCategoryTagOffers freezes both for exactly that reason.
  const active = useMemo(
    () => tags.filter((t) => !t.archived && !t.typeArchived),
    [tags],
  );
  const globals = useMemo(
    () => active.filter((t) => t.categoryIds.length === 0),
    [active],
  );
  const liveTypes = useMemo(
    () => tagTypes.filter((t) => !t.archived),
    [tagTypes],
  );

  const current = categories.find((c) => c.id === pane) ?? null;

  const savedOffered = useMemo(() => {
    if (!current) return new Set<string>();
    return new Set(
      active
        .filter(
          (t) => t.categoryIds.length > 0 && t.categoryIds.includes(current.id),
        )
        .map((t) => t.id),
    );
  }, [active, current]);

  // The draft only applies to the category it was started on; switching panes
  // re-seeds from props without an effect, and a save clears it so the next
  // render reads the revalidated list.
  const live = draft && current && draft.categoryId === current.id;
  const offered = live ? draft.offered : savedOffered;
  const changed = useMemo(() => {
    if (!live) return false;
    if (offered.size !== savedOffered.size) return true;
    for (const id of offered) if (!savedOffered.has(id)) return true;
    return false;
  }, [live, offered, savedOffered]);

  function toggleOffer(tag: TagManageItem) {
    if (!current) return;
    const next = new Set(offered);
    if (next.has(tag.id)) next.delete(tag.id);
    else next.add(tag.id);
    setDraft({ categoryId: current.id, offered: next });
  }

  async function onSave() {
    if (!current) return;
    setSaving(true);
    const res = await setCategoryTagOffers({
      categoryId: current.id,
      tagIds: [...offered],
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Update failed — try again.');
      return;
    }
    setDraft(null);
    toast.success(`Saved — ${current.name} tags updated.`);
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

  async function onDeleteType() {
    const target = confirmType;
    if (!target) return;
    setDeletingType(true);
    const res = await deleteTaskTagType(target.id).catch(() => null);
    setDeletingType(false);
    setConfirmType(null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed — try again.');
      return;
    }
    toast.success('Tag type deleted.');
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
        footer={
          // Only the category pane has anything to save. Passing nothing on
          // the other three leaves the dialog byte-identical to a footerless
          // one, which is why the tag-major panes keep their old shape.
          current && pane === current.id ? (
            <div className="flex items-center justify-end gap-3">
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
          ) : undefined
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
            <RailButton
              active={pane === TYPES}
              label="Tag types"
              chevron
              count={tagTypes.length}
              onClick={() => setPane(TYPES)}
            />
          </nav>

          <div className="min-w-0">
            {pane === TYPES ? (
              <TypesPane
                types={tagTypes}
                onDeleteRequest={setConfirmType}
              />
            ) : pane === ALL_TAGS ? (
              <AllTagsPane
                tags={tags}
                types={tagTypes}
                liveTypes={liveTypes}
                categories={categories}
                onDeleteRequest={setConfirmDelete}
              />
            ) : pane === EVERYWHERE ? (
              <EverywherePane tags={globals} types={liveTypes} />
            ) : current ? (
              <CategoryPane
                category={current}
                tags={active}
                types={liveTypes}
                offered={offered}
                saving={saving}
                onToggle={toggleOffer}
                onCreated={(id) =>
                  setDraft({
                    categoryId: current.id,
                    offered: new Set(offered).add(id),
                  })
                }
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

      <ConfirmDialog
        open={confirmType !== null}
        onOpenChange={(next) => !deletingType && !next && setConfirmType(null)}
        title="Delete this tag type?"
        description="No tags use it, so nothing else changes. This can’t be undone."
        confirmLabel="Delete type"
        onConfirm={onDeleteType}
        destructive
        pending={deletingType}
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
 * Presentational: the draft and its Save live in the parent, because the
 * button sits in the dialog's footer slot. Everything below is a rendering of
 * `offered` plus a toggle callback.
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
  types,
  offered,
  saving,
  onToggle,
  onCreated,
}: {
  category: TagScopeCategory;
  tags: TagManageItem[];
  types: TagTypeItem[];
  offered: Set<string>;
  saving: boolean;
  onToggle: (tag: TagManageItem) => void;
  onCreated: (id: string) => void;
}) {
  const scoped = useMemo(
    () => tags.filter((t) => t.categoryIds.length > 0),
    [tags],
  );
  const globals = useMemo(
    () => tags.filter((t) => t.categoryIds.length === 0),
    [tags],
  );

  /** Would unticking this leave the tag with no category at all? */
  const isOnlyHere = (tag: TagManageItem) =>
    tag.categoryIds.length === 1 && tag.categoryIds[0] === category.id;

  const sections = sectionTags(scoped, types);

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
        <section key={section.type.id} className="mt-4">
          <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {section.type.name}
            {section.type.hint && (
              <span className="ml-2 normal-case tracking-normal opacity-70">
                {section.type.hint}
              </span>
            )}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {section.tags.map((tag) => {
              const on = offered.has(tag.id);
              const locked = isOnlyHere(tag);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(tag)}
                    disabled={saving || locked}
                    aria-pressed={on}
                    title={
                      locked
                        ? `Only ${category.name} offers "${tag.name}" — archive it from All tags instead of removing it here.`
                        : undefined
                    }
                    // The chip IS the control. It used to be a chip nested in
                    // an ink-tinted bordered button — a box drawn around a box
                    // — which read as heavy on a pane holding thirty of them.
                    // Ticking now simply gives the label its type's colour;
                    // unticked is a neutral tint. The check slot is always
                    // rendered so toggling never shifts the row.
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      on
                        ? TASK_TAG_TONES[tag.tone].chip
                        : 'bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground',
                      locked ? 'cursor-not-allowed' : 'cursor-pointer',
                      saving && 'opacity-50',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-3 shrink-0 items-center justify-center"
                    >
                      {on && <LuCheck className="size-3" />}
                    </span>
                    {tag.name}
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
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                    TASK_TAG_TONES[tag.tone].chip,
                  )}
                >
                  <LuGlobe
                    aria-hidden="true"
                    className="size-3 shrink-0 opacity-70"
                  />
                  {tag.name}
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
        types={types}
        hint={`Added to ${category.name} only`}
        onCreated={onCreated}
      />
    </div>
  );
}

/** The global tags, read-only here plus a create door — the one place where
 *  making a tag that reaches everything is the obvious action. */
function EverywherePane({
  tags,
  types,
}: {
  tags: TagManageItem[];
  types: TagTypeItem[];
}) {
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
        sectionTags(tags, types).map((section) => (
          <section key={section.type.id} className="mt-4">
            <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {section.type.name}
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

      <NewTagForm
        categoryId={null}
        types={types}
        hint="Offered everywhere"
      />
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
  types,
  hint,
  onCreated,
}: {
  /** `null` creates a global tag (the Every category pane). */
  categoryId: string | null;
  types: TagTypeItem[];
  hint: string;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [adding, setAdding] = useState(false);

  // Derived, not seeded state: the type list can change under this form (the
  // Tag types pane is one click away), so the fallback re-resolves rather than
  // stranding a stale id.
  const chosen = types.some((t) => t.id === typeId) ? typeId : types[0]?.id;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || !chosen) return;
    setAdding(true);
    const res = await createTaskTag({
      name: name.trim(),
      typeId: chosen,
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

  if (types.length === 0) {
    return (
      <p className="mt-5 border-t border-white/40 pt-4 text-xs text-muted-foreground dark:border-white/10">
        Add a tag type first — every tag belongs to one.
      </p>
    );
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
        <TypeSelect
          types={types}
          value={chosen ?? ''}
          onSelect={setTypeId}
          disabled={adding}
        />
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
 * The tag-major view: rename, retype, rescope wholesale, archive, delete.
 * These are genuinely per-tag acts, which is why this pane survives the
 * category-first redesign rather than being replaced by it.
 */
function AllTagsPane({
  tags,
  types,
  liveTypes,
  categories,
  onDeleteRequest,
}: {
  tags: TagManageItem[];
  /** Every type, archived included — a tag under a retired type still has to
   *  be findable here, which is where it gets moved to a live one. */
  types: TagTypeItem[];
  liveTypes: TagTypeItem[];
  categories: TagScopeCategory[];
  onDeleteRequest: (tag: TagManageItem) => void;
}) {
  const active = tags.filter((t) => !t.archived);
  const archived = tags.filter((t) => t.archived);

  return (
    <div>
      <p className="text-sm font-medium text-foreground">Every tag</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Rename, move between types, or change which categories offer a tag. A
        tag&rsquo;s name can change; its filter link never does.
      </p>

      <TagHeaderRow />

      {sectionTags(active, types).map((section) => (
        <section key={section.type.id} className="mt-3">
          <p className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {section.type.name}
            <span className="ml-2 normal-case tracking-normal opacity-70">
              {section.type.archived
                ? 'Type archived — these are off every picker'
                : section.type.hint}
            </span>
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {section.tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                types={liveTypes}
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
                types={liveTypes}
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
      <span className="w-24 text-center">Type</span>
      <span className="w-32 text-center">Offered under</span>
      <span className="w-8 text-right">Tasks</span>
      <span className="w-7" />
      <span className="w-7" />
    </div>
  );
}

function TagRow({
  tag,
  types,
  categories,
  onDeleteRequest,
}: {
  tag: TagManageItem;
  types: TagTypeItem[];
  categories: TagScopeCategory[];
  onDeleteRequest: () => void;
}) {
  // Local, never read from the prop at write time — CategoryRow's lesson: the
  // action writes ALL of name/type/scope, so each writer has to send the
  // other two as the user currently sees them, or a retype fired before the
  // renamed props landed writes the OLD name back.
  const [name, setName] = useState(tag.name);
  const [typeId, setTypeId] = useState(tag.typeId);
  const [categoryIds, setCategoryIds] = useState(tag.categoryIds);
  const [busy, setBusy] = useState(false);

  const safeName = () => (name.trim().length >= 2 ? name.trim() : tag.name);

  async function write(
    next: { name?: string; typeId?: string; categoryIds?: string[] },
    onFail: () => void,
  ) {
    setBusy(true);
    const res = await updateTaskTag(tag.id, {
      name: next.name ?? safeName(),
      typeId: next.typeId ?? typeId,
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

  async function retype(next: string) {
    // `busy` only disables the trigger — an ALREADY-open Radix menu keeps
    // accepting picks, so the guard has to live here too.
    if (busy || next === typeId) return;
    const previous = typeId;
    setTypeId(next);
    await write({ typeId: next }, () => setTypeId(previous));
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
    // its own controls, so the type and scope triggers landed at a different
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
      <TypeSelect
        types={types}
        value={typeId}
        onSelect={(next) => void retype(next)}
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

/**
 * The axes themselves — the pane that replaced a Postgres enum.
 *
 * Rename, re-describe, recolour, archive, delete. Two acts are refused, both
 * here and again in the actions: a type carrying tags can only be archived
 * (the count says how many are in the way), and the LAST live type can be
 * neither archived nor deleted, because every tag needs one to be filed under.
 *
 * Recolouring is the reason colour lives here rather than on a tag: one pick
 * repaints every chip under the type at once, everywhere in the dashboard.
 */
function TypesPane({
  types,
  onDeleteRequest,
}: {
  types: TagTypeItem[];
  onDeleteRequest: (type: TagTypeItem) => void;
}) {
  const active = types.filter((t) => !t.archived);
  const archived = types.filter((t) => t.archived);
  const last = active.length <= 1;

  return (
    <div>
      <p className="text-sm font-medium text-foreground">Tag types</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The axes a tag can sit on. A type gives its tags their section in every
        picker and their colour on the board — so recolouring one repaints all
        of them at once.
      </p>

      <div
        aria-hidden="true"
        className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 border-b border-white/40 pb-1.5 text-[0.6rem] font-medium tracking-[0.15em] text-muted-foreground uppercase dark:border-white/10"
      >
        <span>Type &amp; description</span>
        <span className="w-40 text-center">Colour</span>
        <span className="w-8 text-right">Tags</span>
        <span className="w-7" />
        <span className="w-7" />
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {active.map((type) => (
          <TypeRow
            key={type.id}
            type={type}
            last={last}
            onDeleteRequest={() => onDeleteRequest(type)}
          />
        ))}
      </ul>

      {archived.length > 0 && (
        <>
          <p className="mt-5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Archived
            <span className="ml-2 normal-case tracking-normal opacity-70">
              These and every tag under them are off the pickers
            </span>
          </p>
          <ul className="mt-2 flex flex-col gap-2 opacity-60">
            {archived.map((type) => (
              <TypeRow
                key={type.id}
                type={type}
                last={false}
                onDeleteRequest={() => onDeleteRequest(type)}
              />
            ))}
          </ul>
        </>
      )}

      <NewTypeForm />
    </div>
  );
}

function TypeRow({
  type,
  last,
  onDeleteRequest,
}: {
  type: TagTypeItem;
  /** The only live type left — archiving or deleting it is refused. */
  last: boolean;
  onDeleteRequest: () => void;
}) {
  // Same rule as TagRow: updateTaskTagType writes all three fields, so every
  // writer sends the other two as they currently read on screen.
  const [name, setName] = useState(type.name);
  const [hint, setHint] = useState(type.hint ?? '');
  const [tone, setTone] = useState(type.tone);
  const [busy, setBusy] = useState(false);

  const safeName = () => (name.trim().length >= 2 ? name.trim() : type.name);

  async function write(
    next: { name?: string; hint?: string; tone?: TaskTagTone },
    onFail: () => void,
  ) {
    setBusy(true);
    const res = await updateTaskTagType(type.id, {
      name: next.name ?? safeName(),
      hint: next.hint ?? hint,
      tone: next.tone ?? tone,
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
    if (trimmed === type.name || trimmed.length < 2) {
      setName(type.name);
      return;
    }
    await write({ name: trimmed }, () => setName(type.name));
  }

  async function commitHint() {
    const trimmed = hint.trim();
    if (trimmed === (type.hint ?? '')) return;
    await write({ hint: trimmed }, () => setHint(type.hint ?? ''));
  }

  async function recolour(next: TaskTagTone) {
    if (busy || next === tone) return;
    const previous = tone;
    setTone(next);
    await write({ tone: next }, () => setTone(previous));
  }

  async function toggleArchived() {
    if (busy) return;
    setBusy(true);
    const res = await setTaskTagTypeArchived(type.id, !type.archived).catch(
      () => null,
    );
    setBusy(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Update failed — try again.');
    }
  }

  const blocked = type.tagCount > 0;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2">
      <span className="flex min-w-0 flex-col gap-1">
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
          aria-label={`Rename ${type.name}`}
          disabled={busy}
          className="h-8 w-full min-w-0 text-sm"
        />
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          onBlur={() => void commitHint()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder="What this axis means (optional)"
          aria-label={`Describe ${type.name}`}
          disabled={busy}
          className="h-7 w-full min-w-0 text-xs"
        />
      </span>
      <ToneDots
        value={tone}
        onSelect={(next) => void recolour(next)}
        disabled={busy}
        label={type.name}
      />
      <span
        title={`${type.tagCount} tag${type.tagCount === 1 ? '' : 's'} under this type`}
        className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
        {type.tagCount}
      </span>
      <button
        type="button"
        onClick={() => void toggleArchived()}
        disabled={busy || (!type.archived && last)}
        aria-label={
          type.archived ? `Restore ${type.name}` : `Archive ${type.name}`
        }
        title={
          type.archived
            ? 'Restore to the pickers'
            : last
              ? 'The last type — a tag has to have one'
              : 'Archive — takes this type and its tags off every picker'
        }
        className="w-7 shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {type.archived ? (
          <LuArchiveRestore aria-hidden="true" className="size-4" />
        ) : (
          <LuArchive aria-hidden="true" className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={onDeleteRequest}
        disabled={busy || blocked || last}
        aria-label={`Delete ${type.name}`}
        title={
          blocked
            ? `${type.tagCount} tag${type.tagCount === 1 ? '' : 's'} use this — move or delete ${type.tagCount === 1 ? 'it' : 'them'} first`
            : last
              ? 'The last type — a tag has to have one'
              : 'Delete (unused)'
        }
        className="w-7 shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

function NewTypeForm() {
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const [tone, setTone] = useState<TaskTagTone>('sky');
  const [adding, setAdding] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setAdding(true);
    const res = await createTaskTagType({
      name: name.trim(),
      hint: hint.trim(),
      tone,
    }).catch(() => null);
    setAdding(false);
    if (!res?.ok) {
      toast.error(
        res && !res.ok && res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Could not add the type — try again.',
      );
      return;
    }
    setName('');
    setHint('');
    toast.success('Tag type added.');
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
          placeholder="New type name"
          aria-label="New type name"
          autoComplete="off"
          disabled={adding}
          className="h-8 w-full flex-1 basis-32 text-sm"
        />
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="What it means (optional)"
          aria-label="What the new type means"
          autoComplete="off"
          disabled={adding}
          className="h-8 w-full flex-1 basis-40 text-sm"
        />
        <ToneDots
          value={tone}
          onSelect={setTone}
          disabled={adding}
          label="the new type"
        />
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
      <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
        Its name becomes a section heading in every tag picker.
      </p>
    </form>
  );
}

/**
 * The colour picker: eight swatches, no hex field.
 *
 * A fixed palette rather than a free colour, for reasons that both bite — the
 * Tailwind scanner cannot see a computed class name, and a hex has no
 * dark-mode answer. Red and amber are deliberately absent: the task table
 * spends them on overdue and due-today.
 */
function ToneDots({
  value,
  onSelect,
  disabled,
  label,
}: {
  value: TaskTagTone;
  onSelect: (next: TaskTagTone) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <span
      role="radiogroup"
      aria-label={`Colour for ${label}`}
      className="flex w-40 shrink-0 items-center justify-center gap-1"
    >
      {TASK_TAG_TONE_KEYS.map((tone) => {
        const on = tone === value;
        return (
          <button
            key={tone}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={tone}
            title={tone}
            disabled={disabled}
            onClick={() => onSelect(tone)}
            className={cn(
              'size-4 shrink-0 cursor-pointer rounded-full transition-transform disabled:cursor-not-allowed disabled:opacity-40',
              TASK_TAG_TONES[tone].dot,
              on
                ? 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-transparent'
                : 'opacity-55 hover:opacity-100',
            )}
          />
        );
      })}
    </span>
  );
}

function TypeSelect({
  types,
  value,
  onSelect,
  disabled,
}: {
  types: TagTypeItem[];
  value: string;
  onSelect: (next: string) => void;
  disabled?: boolean;
}) {
  const current = types.find((t) => t.id === value);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Type"
          className="inline-flex h-8 w-24 shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] px-2.5 text-xs text-foreground disabled:opacity-50"
        >
          <span className="truncate">{current?.name ?? 'Type'}</span>
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
          {types.map((type) => (
            <DropdownMenu.Item
              key={type.id}
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => onSelect(type.id)}
            >
              {type.id === value ? (
                <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="flex flex-col">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      TASK_TAG_TONES[type.tone].dot,
                    )}
                  />
                  {type.name}
                </span>
                {type.hint && (
                  <span className="text-[0.65rem] font-normal text-muted-foreground">
                    {type.hint}
                  </span>
                )}
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
