'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuFolderTree, LuPlus, LuTrash2 } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
// The label to control to hint/error slot, lifted out of ClientDialog so the
// dialogs that use it cannot drift. Generic rather than careers-specific, so
// this is the one to reach for instead of writing a third copy.
import { Field, textareaClasses } from '@/components/Admin/careers/FormField';
import type { BlogCategoryItem } from '@/components/Admin/blogs/taxonomyTypes';
import {
  dropIssues,
  taxonomyIssues,
} from '@/components/Admin/blogs/taxonomyForm';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/app/(admin)/admin/(protected)/_actions/blogTaxonomy';
import { blogUsageSentence } from '@/lib/blogFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

/** Matches `text(120, 1)` in blogCategoryFieldsSchema. */
const TITLE_MAX = 120;
const SEO_TITLE_MAX = 300;
const SEO_DESCRIPTION_MAX = 2000;

/** '' is stored as null, which is what the `branding` row already carries and
 *  what `categoryReady` treats as missing either way. */
const orNull = (value: string): string | null =>
  value.trim() === '' ? null : value.trim();

/** '' means "leave the order alone" (edit) or "put it last" (create): the key
 *  is left out of the payload entirely and the door fills it in. */
const numberOrUndefined = (s: string): number | undefined =>
  s.trim() === '' ? undefined : Number(s);

/**
 * The blog's categories, managed the way the careers headings are: every
 * existing row as an inline editor (Save appears once something changed), a
 * delete refused while anything still points at it, and an "Add category" form
 * at the bottom.
 *
 * A SLUG IS FIXED AFTER CREATION and only the add form derives one. It is the
 * `?category=` value on the public hub and thirteen permanent redirects in
 * next.config.ts point at it, so `updateCategory` refuses a change outright.
 * Offering a field the door will refuse is worse than not offering it.
 *
 * THE SEO PAIR IS THE ONE THING ON THIS SCREEN A WRITER MEETS AS A REFUSAL
 * SOMEWHERE ELSE. A post cannot be published into a category missing either
 * half (`categoryReady` in _actions/blogPosts.ts), and `branding` is the live
 * row carrying neither, so the rule is stated under the pair in every row
 * rather than left to be discovered at the publish button.
 *
 * Single column at a rung under 40rem, deliberately: a dialog earns width by
 * splitting its body into two columns, and four fields do not.
 *
 * State seeds per open for free: Radix unmounts the portal when the dialog
 * closes, so every row below is a fresh mount and a revalidated tree can never
 * land on top of something half typed.
 */
export default function CategoriesDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BlogCategoryItem[];
}) {
  // One write at a time across every row: each door revalidates the layout, so
  // two overlapping saves would race each other's fresh tree.
  const [busy, setBusy] = useState(false);

  function close(next: boolean) {
    if (busy) return;
    onOpenChange(next);
  }

  return (
    <GlassDialog
      open={open}
      onOpenChange={close}
      maxWidth="34rem"
      header={
        <>
          <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
            Categories
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            The shelves posts are filed under on the public blog. Lower order
            shows first.
          </Dialog.Description>
        </>
      }
      footer={
        <div className="flex flex-row-reverse">
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              disabled={busy}
            >
              Close
            </Button>
          </Dialog.Close>
        </div>
      }
    >
      {categories.length > 0 ? (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              busy={busy}
              setBusy={setBusy}
            />
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sm text-muted-foreground">
          No categories yet. Add the first one below.
        </p>
      )}

      <AddCategoryForm busy={busy} setBusy={setBusy} />
    </GlassDialog>
  );
}

/** The line under the SEO pair. Same sentence either way, so the rule reads
 *  the same in a filled row as in an empty one, with amber where it bites. */
function SeoNote({ ready }: { ready: boolean }) {
  return (
    <p
      className={cn(
        'px-1 text-xs',
        ready
          ? 'text-muted-foreground'
          : 'text-amber-700 dark:text-amber-400',
      )}
    >
      {ready
        ? 'Both are needed before a post can be published in this category.'
        : 'No post can be published in this category until both of these are filled in.'}
    </p>
  );
}

/** One existing category, edited in place. */
function CategoryRow({
  category,
  busy,
  setBusy,
}: {
  category: BlogCategoryItem;
  busy: boolean;
  setBusy: (next: boolean) => void;
}) {
  const [title, setTitle] = useState(category.title);
  const [seoTitle, setSeoTitle] = useState(category.seoTitle);
  const [seoDescription, setSeoDescription] = useState(category.seoDescription);
  const [order, setOrder] = useState(String(category.sortIndex));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Compared against what the server would actually store, so a padded field
  // settles clean after a save instead of leaving Save on screen for ever.
  const dirty =
    title.trim() !== category.title ||
    seoTitle.trim() !== category.seoTitle ||
    seoDescription.trim() !== category.seoDescription ||
    (order.trim() !== '' && Number(order) !== category.sortIndex);
  const inUse = category.usage.posts > 0 || category.usage.revisions > 0;
  const id = `blog-cat-${category.id}`;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBusy(true);
    let next: Record<string, string>;
    try {
      next = taxonomyIssues(
        await updateCategory(category.id, {
          slug: category.slug,
          title: title.trim(),
          seoTitle: orNull(seoTitle),
          seoDescription: orNull(seoDescription),
          sortIndex: numberOrUndefined(order),
        }),
      );
    } catch {
      next = taxonomyIssues(undefined);
    }
    setSaving(false);
    setBusy(false);
    setIssues(next);
    if (Object.keys(next).length > 0) return;
    toast.success(`Category saved: ${title.trim()}.`);
  }

  async function onDelete() {
    setDeleting(true);
    setBusy(true);
    let next: Record<string, string>;
    try {
      next = taxonomyIssues(await deleteCategory(category.id));
    } catch {
      next = taxonomyIssues(undefined);
    }
    setDeleting(false);
    setBusy(false);
    setConfirmingDelete(false);
    const problem = Object.values(next)[0];
    if (problem) {
      toast.error(problem);
      return;
    }
    toast.success(`Category deleted: ${category.title}.`);
  }

  const ready = seoTitle.trim() !== '' && seoDescription.trim() !== '';
  const formProblem = issues._form ?? issues.slug;

  return (
    <li className="py-4 first:pt-0">
      <form onSubmit={onSave} className="flex flex-col gap-3" noValidate>
        <div className="flex items-start gap-3">
          <Field
            id={`${id}-title`}
            label="Title"
            error={issues.title}
            className="min-w-0 flex-1"
          >
            <Input
              id={`${id}-title`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIssues((prev) => dropIssues(prev, 'title'));
              }}
              maxLength={TITLE_MAX}
              autoComplete="off"
              disabled={saving || deleting}
              aria-invalid={issues.title ? true : undefined}
            />
          </Field>
          <Field
            id={`${id}-order`}
            label="Order"
            error={issues.sortIndex}
            className="w-24 shrink-0"
          >
            <Input
              id={`${id}-order`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setIssues((prev) => dropIssues(prev, 'sortIndex'));
              }}
              autoComplete="off"
              disabled={saving || deleting}
              aria-invalid={issues.sortIndex ? true : undefined}
            />
          </Field>
        </div>

        <Field id={`${id}-seo-title`} label="SEO title" error={issues.seoTitle}>
          <Input
            id={`${id}-seo-title`}
            value={seoTitle}
            onChange={(e) => {
              setSeoTitle(e.target.value);
              setIssues((prev) => dropIssues(prev, 'seoTitle'));
            }}
            placeholder="The browser tab title on /blogs?category="
            maxLength={SEO_TITLE_MAX}
            autoComplete="off"
            disabled={saving || deleting}
            aria-invalid={issues.seoTitle ? true : undefined}
          />
        </Field>

        <Field
          id={`${id}-seo-description`}
          label="SEO description"
          error={issues.seoDescription}
        >
          <textarea
            id={`${id}-seo-description`}
            rows={2}
            value={seoDescription}
            onChange={(e) => {
              setSeoDescription(e.target.value);
              setIssues((prev) => dropIssues(prev, 'seoDescription'));
            }}
            maxLength={SEO_DESCRIPTION_MAX}
            disabled={saving || deleting}
            aria-invalid={issues.seoDescription ? true : undefined}
            className={cn(textareaClasses, 'min-h-16')}
          />
        </Field>
        <SeoNote ready={ready} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {category.slug} · {usageChip(category.usage)}
          </span>
          {formProblem && (
            <span role="alert" className="text-xs text-destructive">
              {formProblem}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              icon={LuTrash2}
              iconPosition="left"
              disabled={busy || inUse}
              onClick={() => setConfirmingDelete(true)}
              title={
                inUse
                  ? `${blogUsageSentence('category', category.usage)} Move them to another category first.`
                  : undefined
              }
              className="px-2.5 text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="sr-only">Delete {category.title}</span>
            </Button>
            {dirty && (
              <Button
                type="submit"
                size="small"
                shimmer={false}
                showIcon={false}
                disabled={busy}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <p className="mt-1 px-1 text-xs text-muted-foreground">
        The slug is fixed. It is the filter value on the public blog and old
        links redirect to it.
      </p>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title={`Delete “${category.title}”?`}
        description={`${blogUsageSentence('category', category.usage)} The shelf goes for good, and this cannot be undone.`}
        confirmLabel="Delete category"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </li>
  );
}

/** The posts and their history behind a row, compact enough for a meta line.
 *  Never a sum: an author on one post with twelve earlier versions of it is
 *  not on thirteen posts. */
function usageChip(usage: { posts: number; revisions: number }): string {
  if (usage.posts === 0 && usage.revisions === 0) return 'nothing points here';
  const posts = `${usage.posts} post${usage.posts === 1 ? '' : 's'}`;
  const revisions = `${usage.revisions} saved version${usage.revisions === 1 ? '' : 's'}`;
  return `${posts}, ${revisions}`;
}

/** The "Add category" form: title to auto slug until touched, order, SEO pair. */
function AddCategoryForm({
  busy,
  setBusy,
}: {
  busy: boolean;
  setBusy: (next: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [order, setOrder] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBusy(true);
    let next: Record<string, string>;
    try {
      next = taxonomyIssues(
        await createCategory({
          slug,
          title: title.trim(),
          seoTitle: orNull(seoTitle),
          seoDescription: orNull(seoDescription),
          sortIndex: numberOrUndefined(order),
        }),
      );
    } catch {
      next = taxonomyIssues(undefined);
    }
    setSaving(false);
    setBusy(false);
    setIssues(next);
    if (Object.keys(next).length > 0) return;
    toast.success(`Category added: ${title.trim()}.`);
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setSeoTitle('');
    setSeoDescription('');
    setOrder('');
  }

  const ready = seoTitle.trim() !== '' && seoDescription.trim() !== '';

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-col gap-3 border-t border-white/40 pt-4 dark:border-white/10"
      noValidate
    >
      <p className="text-sm font-medium text-foreground">Add category</p>
      {issues._form && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {issues._form}
        </p>
      )}
      <div className="flex items-start gap-3">
        <Field
          id="new-blog-cat-title"
          label="Title"
          error={issues.title}
          className="min-w-0 flex-1"
        >
          <Input
            id="new-blog-cat-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              setIssues((prev) => dropIssues(prev, 'title', 'slug'));
            }}
            placeholder="e.g. Drone"
            maxLength={TITLE_MAX}
            autoComplete="off"
            disabled={saving}
            aria-invalid={issues.title ? true : undefined}
          />
        </Field>
        <Field
          id="new-blog-cat-order"
          label="Order"
          error={issues.sortIndex}
          className="w-24 shrink-0"
        >
          <Input
            id="new-blog-cat-order"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setIssues((prev) => dropIssues(prev, 'sortIndex'));
            }}
            placeholder="Last"
            autoComplete="off"
            disabled={saving}
            aria-invalid={issues.sortIndex ? true : undefined}
          />
        </Field>
      </div>
      <Field
        id="new-blog-cat-slug"
        label="Slug"
        error={issues.slug}
        hint="Fixed once created, because it is the filter value on the public blog. Safe to leave auto-generated."
      >
        <Input
          id="new-blog-cat-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
            setIssues((prev) => dropIssues(prev, 'slug'));
          }}
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          aria-invalid={issues.slug ? true : undefined}
        />
      </Field>
      <Field id="new-blog-cat-seo-title" label="SEO title" error={issues.seoTitle}>
        <Input
          id="new-blog-cat-seo-title"
          value={seoTitle}
          onChange={(e) => {
            setSeoTitle(e.target.value);
            setIssues((prev) => dropIssues(prev, 'seoTitle'));
          }}
          maxLength={SEO_TITLE_MAX}
          autoComplete="off"
          disabled={saving}
          aria-invalid={issues.seoTitle ? true : undefined}
        />
      </Field>
      <Field
        id="new-blog-cat-seo-description"
        label="SEO description"
        error={issues.seoDescription}
      >
        <textarea
          id="new-blog-cat-seo-description"
          rows={2}
          value={seoDescription}
          onChange={(e) => {
            setSeoDescription(e.target.value);
            setIssues((prev) => dropIssues(prev, 'seoDescription'));
          }}
          maxLength={SEO_DESCRIPTION_MAX}
          disabled={saving}
          aria-invalid={issues.seoDescription ? true : undefined}
          className={cn(textareaClasses, 'min-h-16')}
        />
      </Field>
      <SeoNote ready={ready} />
      <div className="flex flex-row-reverse">
        <Button
          type="submit"
          size="small"
          shimmer={false}
          icon={LuPlus}
          iconPosition="left"
          disabled={busy}
        >
          {saving ? 'Adding…' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}

/** The posts list header's "Categories" affordance, which owns its own state. */
export function CategoriesButton({
  categories,
}: {
  categories: BlogCategoryItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="small"
        icon={LuFolderTree}
        iconPosition="left"
        onClick={() => setOpen(true)}
      >
        Categories
      </Button>
      <CategoriesDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
      />
    </>
  );
}
