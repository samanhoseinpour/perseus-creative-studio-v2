'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuLayoutList, LuPlus, LuTrash2 } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { Field } from '@/components/Admin/careers/FormField';
import type { AdminCategoryItem } from '@/components/Admin/careers/types';
import {
  createJobCategory,
  deleteJobCategory,
  updateJobCategory,
  type CareersMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/careers';
import { flattenCareersIssues, jobCategorySchema } from '@/lib/careersSchema';
import {
  JOB_CATEGORY_ICON_FALLBACK,
  JOB_CATEGORY_ICON_KEYS,
  JOB_CATEGORY_ICON_LABELS,
  JOB_CATEGORY_NAME_MAX,
  isJobCategoryIconKey,
  type JobCategoryIconKey,
} from '@/lib/careerFields';
import { JOB_CATEGORY_ICONS } from '@/lib/jobCategoryIcons';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

const SERVER_ERROR: CareersMutationResult = { ok: false, error: 'server' };

/** The issues map minus the given keys — clearing a field's error as it is edited. */
const dropIssues = (issues: Record<string, string>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(issues).filter(([k]) => !keys.includes(k)));

/** '' → undefined (keep / append), else Number — the schema judges it. */
const numberOrUndefined = (s: string): number | undefined =>
  s.trim() === '' ? undefined : Number(s);

/**
 * The category headings on the careers page — name, icon, order — managed
 * in one glass dialog: every existing category as an inline-editable row
 * (save appears once something changed), a delete that is refused while
 * roles still sit under it, and an "Add category" row at the bottom. Slugs
 * are fixed after creation (the page's filter value and the seed key), so
 * only the add row derives one.
 */
export default function CategoriesDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AdminCategoryItem[];
}) {
  // One in-flight write at a time across every row — the action's
  // revalidation re-renders the whole list, and two overlapping saves would
  // race each other's fresh tree.
  const [busy, setBusy] = useState(false);

  function close(next: boolean) {
    if (busy) return;
    onOpenChange(next);
  }

  return (
    <GlassDialog
      open={open}
      onOpenChange={close}
      maxWidth="40rem"
      header={
        <>
          <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
            Categories
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            The headings roles are grouped under on the careers page. Lower
            order shows first.
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
          No categories yet — add the first one below.
        </p>
      )}

      <AddCategoryRow busy={busy} setBusy={setBusy} />
    </GlassDialog>
  );
}

/**
 * One existing category, edited in place. Local state seeds from the row
 * once (keyed by id in the parent); after a successful save the fresh props
 * carry exactly what was typed, so there is nothing to re-seed.
 */
function CategoryRow({
  category,
  busy,
  setBusy,
}: {
  category: AdminCategoryItem;
  busy: boolean;
  setBusy: (next: boolean) => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState<JobCategoryIconKey>(
    isJobCategoryIconKey(category.icon) ? category.icon : JOB_CATEGORY_ICON_FALLBACK,
  );
  const [order, setOrder] = useState(String(category.sortIndex));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Compare what the server would persist (trimmed name, numeric order),
  // so a padded or blank order field settles clean after a save.
  const dirty =
    name.trim() !== category.name ||
    icon !== category.icon ||
    (order.trim() !== '' && Number(order) !== category.sortIndex);
  const inUse = category.openingCount > 0;
  const id = `cat-${category.id}`;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = jobCategorySchema.safeParse({
      name,
      slug: category.slug,
      icon,
      sortIndex: numberOrUndefined(order),
    });
    if (!parsed.success) {
      setIssues(flattenCareersIssues(parsed.error));
      return;
    }
    setSaving(true);
    setBusy(true);
    let res: CareersMutationResult;
    try {
      res = (await updateJobCategory(category.id, parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setSaving(false);
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong — try again.');
      return;
    }
    setIssues({});
    toast.success(`Category saved: ${parsed.data.name}.`);
  }

  async function onDelete() {
    setDeleting(true);
    setBusy(true);
    const res = await safeAction(deleteJobCategory(category.id));
    setDeleting(false);
    setBusy(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Category deleted: ${category.name}.`);
  }

  const error = issues._form ?? issues.slug;

  return (
    <li className="py-4 first:pt-0">
      <form onSubmit={onSave} className="flex flex-col gap-3" noValidate>
        <div className="flex items-start gap-3">
          <Field id={`${id}-name`} label="Name" error={issues.name} className="min-w-0 flex-1">
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIssues((prev) => dropIssues(prev, 'name'));
              }}
              maxLength={JOB_CATEGORY_NAME_MAX}
              autoComplete="off"
              disabled={saving || deleting}
              aria-invalid={issues.name ? true : undefined}
            />
          </Field>
          <Field id={`${id}-order`} label="Order" error={issues.sortIndex} className="w-24 shrink-0">
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

        <IconPicker
          name={`${id}-icon`}
          value={icon}
          onChange={(next) => {
            setIcon(next);
            setIssues((prev) => dropIssues(prev, 'icon'));
          }}
          disabled={saving || deleting}
          error={issues.icon}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {category.slug} ·{' '}
            {category.openingCount === 0
              ? 'no roles'
              : `${category.openingCount} role${category.openingCount === 1 ? '' : 's'}`}
          </span>
          {error && (
            <span role="alert" className="text-xs text-destructive">
              {error}
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
                  ? `Move or delete its ${category.openingCount} role${category.openingCount === 1 ? '' : 's'} first`
                  : undefined
              }
              className="px-2.5 text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="sr-only">Delete {category.name}</span>
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

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title={`Delete “${category.name}”?`}
        description="The heading leaves the careers page. This can’t be undone."
        confirmLabel="Delete category"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </li>
  );
}

/** The "Add category" row: name → auto slug until touched, icon, optional order. */
function AddCategoryRow({
  busy,
  setBusy,
}: {
  busy: boolean;
  setBusy: (next: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [icon, setIcon] = useState<JobCategoryIconKey>(JOB_CATEGORY_ICON_FALLBACK);
  const [order, setOrder] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = jobCategorySchema.safeParse({
      name,
      slug,
      icon,
      sortIndex: numberOrUndefined(order),
    });
    if (!parsed.success) {
      setIssues(flattenCareersIssues(parsed.error));
      return;
    }
    setSaving(true);
    setBusy(true);
    let res: CareersMutationResult;
    try {
      res = (await createJobCategory(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setSaving(false);
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong — try again.');
      return;
    }
    toast.success(`Category added: ${parsed.data.name}.`);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setIcon(JOB_CATEGORY_ICON_FALLBACK);
    setOrder('');
    setIssues({});
  }

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
        <Field id="new-cat-name" label="Name" error={issues.name} className="min-w-0 flex-1">
          <Input
            id="new-cat-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              setIssues((prev) => dropIssues(prev, 'name', 'slug'));
            }}
            placeholder="e.g. Motion Design"
            maxLength={JOB_CATEGORY_NAME_MAX}
            autoComplete="off"
            disabled={saving}
            aria-invalid={issues.name ? true : undefined}
          />
        </Field>
        <Field id="new-cat-order" label="Order" error={issues.sortIndex} className="w-24 shrink-0">
          <Input
            id="new-cat-order"
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
        id="new-cat-slug"
        label="Slug"
        error={issues.slug}
        hint="Fixed once created — safe to leave auto-generated."
      >
        <Input
          id="new-cat-slug"
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
      <IconPicker
        name="new-cat-icon"
        value={icon}
        onChange={(next) => {
          setIcon(next);
          setIssues((prev) => dropIssues(prev, 'icon'));
        }}
        disabled={saving}
        error={issues.icon}
      />
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

/**
 * The fixed icon vocabulary as a radio group of small square toggles
 * (ChipGroup's radio-in-a-label idiom, sized for a glyph). Each carries its
 * label for screen readers and as a hover title.
 */
function IconPicker({
  name,
  value,
  onChange,
  disabled,
  error,
}: {
  name: string;
  value: JobCategoryIconKey;
  onChange: (next: JobCategoryIconKey) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-foreground">Icon</legend>
      <div className="flex flex-wrap gap-1.5">
        {JOB_CATEGORY_ICON_KEYS.map((key) => {
          const Icon = JOB_CATEGORY_ICONS[key];
          const active = value === key;
          return (
            <label
              key={key}
              title={JOB_CATEGORY_ICON_LABELS[key]}
              className={cn(
                'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors',
                'has-[:focus-visible]:ring-[1.5px] has-[:focus-visible]:ring-ring',
                active
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={key}
                checked={active}
                onChange={() => onChange(key)}
                className="sr-only"
              />
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{JOB_CATEGORY_ICON_LABELS[key]}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The header's "Categories" affordance — owns its dialog state. */
export function CategoriesButton({
  categories,
}: {
  categories: AdminCategoryItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="small"
        icon={LuLayoutList}
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
