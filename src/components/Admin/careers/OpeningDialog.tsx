'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuBriefcase } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { Field, selectClasses, textareaClasses } from '@/components/Admin/careers/FormField';
import type {
  AdminCategoryItem,
  AdminOpeningItem,
} from '@/components/Admin/careers/types';
import {
  createJobOpening,
  deleteJobOpening,
  updateJobOpening,
  type CareersMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/careers';
import { flattenCareersIssues, jobOpeningSchema } from '@/lib/careersSchema';
import {
  JOB_CADENCE_MAX,
  JOB_EMPLOYMENT_TYPE_LABELS,
  JOB_EMPLOYMENT_TYPES,
  JOB_FIT_MAX,
  JOB_LEVEL_MAX,
  JOB_LOCATION_MAX,
  JOB_PAY_UNIT_LABELS,
  JOB_PAY_UNITS,
  JOB_REMOTE_LOCATION,
  JOB_SLUG_MAX,
  JOB_STATUS_HELP,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  JOB_SUMMARY_MAX,
  JOB_TAGS_MAX,
  JOB_TITLE_MAX,
  type JobEmploymentTypeField,
  type JobPayUnitField,
  type JobStatusField,
} from '@/lib/careerFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

const SERVER_ERROR: CareersMutationResult = { ok: false, error: 'server' };

const STATUS_OPTIONS = JOB_STATUSES.map((slug) => ({
  slug,
  label: JOB_STATUS_LABELS[slug],
}));

const TYPE_OPTIONS = JOB_EMPLOYMENT_TYPES.map((slug) => ({
  slug,
  label: JOB_EMPLOYMENT_TYPE_LABELS[slug],
}));

/** '' is the "no pay range yet" chip — a draft can sit without one. */
type PayUnitChoice = JobPayUnitField | '';
const PAY_UNIT_OPTIONS: readonly { slug: PayUnitChoice; label: string }[] = [
  { slug: '', label: 'Not set' },
  ...JOB_PAY_UNITS.map((slug) => ({ slug, label: JOB_PAY_UNIT_LABELS[slug] })),
];

const BLANK = {
  title: '',
  slug: '',
  categoryId: '',
  location: JOB_REMOTE_LOCATION,
  level: '',
  cadence: '',
  summary: '',
  fit: '',
  tags: '',
  payMin: '',
  payMax: '',
  datePosted: '',
  validThrough: '',
  sortIndex: '',
};

type Values = typeof BLANK;

/** The comma-separated tags box → trimmed, de-duplicated list. Never
 *  truncated here: the schema's "keep it to six" message is the user's cue,
 *  silently dropping the seventh would not be. */
function parseTags(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(',')) {
    const tag = raw.trim();
    if (tag && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      out.push(tag);
    }
  }
  return out;
}

/** The issues map minus the given keys — clearing a field's error as it is edited. */
const dropIssues = (issues: Record<string, string>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(issues).filter(([k]) => !keys.includes(k)));

/** '' → undefined, anything else → Number (the schema judges the result). */
const numberOrUndefined = (s: string): number | undefined =>
  s.trim() === '' ? undefined : Number(s);

/**
 * Create/edit form for one job opening, in the admin's glass dialog shell
 * (ClientDialog's pattern). Create mode auto-derives the slug from the title
 * until the slug field is touched; edit mode shows the slug read-only — it
 * is stored on every application for the role and is the contact form's
 * deep-link payload, so it never changes. The schema (run here first for
 * instant field errors, then authoritatively in the action) refuses the
 * 'open' status without a pay range and a posted date.
 */
/** The <form> the pinned footer's submit button points at. */
const FORM_ID = 'career-opening-form';

export default function OpeningDialog({
  open,
  onOpenChange,
  opening,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  opening: AdminOpeningItem | null;
  categories: AdminCategoryItem[];
}) {
  const [values, setValues] = useState<Values>(BLANK);
  const [status, setStatus] = useState<JobStatusField>('draft');
  const [employmentType, setEmploymentType] =
    useState<JobEmploymentTypeField>('full_time');
  const [payUnit, setPayUnit] = useState<PayUnitChoice>('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = opening !== null;

  // Which opening the form was last seeded from (a sentinel for create
  // mode). The roster derives `opening` from fresh server data, so a
  // revalidation re-render swaps the object identity mid-edit — and
  // `categories` is a fresh array on every parent render — so this ref is
  // what stops either from re-seeding (and clobbering) typed-but-unsaved
  // values. Reset on close so reopening seeds fresh.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    const seedKey = opening ? opening.id : '__create__';
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;
    if (opening) {
      setValues({
        title: opening.title,
        slug: opening.slug,
        categoryId: opening.categoryId,
        location: opening.location,
        level: opening.level,
        cadence: opening.cadence,
        summary: opening.summary,
        fit: opening.fit,
        tags: opening.tags.join(', '),
        payMin: opening.payMin,
        payMax: opening.payMax,
        datePosted: opening.datePosted,
        validThrough: opening.validThrough,
        sortIndex: '',
      });
      setStatus(opening.status);
      setEmploymentType(opening.employmentType);
      setPayUnit(opening.payUnit);
      setSlugTouched(true);
    } else {
      setValues({ ...BLANK, categoryId: categories[0]?.id ?? '' });
      setStatus('draft');
      setEmploymentType('full_time');
      setPayUnit('');
      setSlugTouched(false);
    }
    setIssues({});
  }, [open, opening, categories]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue(key: keyof Values, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Auto-derive within the slug cap (a long title would otherwise hand
      // the user a slug the schema refuses on submit).
      if (key === 'title' && !slugTouched) {
        next.slug = slugify(value).slice(0, JOB_SLUG_MAX).replace(/-+$/, '');
      }
      return next;
    });
    setIssues((prev) => dropIssues(prev, key));
  }

  function clearIssue(key: string) {
    setIssues((prev) => dropIssues(prev, key));
  }

  const tags = parseTags(values.tags);
  // A per-tag message lands under `tags.N`; surface the first one in the
  // tags slot rather than losing it.
  const tagsIssue =
    issues.tags ??
    Object.entries(issues).find(([k]) => k.startsWith('tags.'))?.[1];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = jobOpeningSchema.safeParse({
      title: values.title,
      slug: values.slug,
      categoryId: values.categoryId,
      location: values.location,
      employmentType,
      level: values.level,
      cadence: values.cadence,
      fit: values.fit,
      summary: values.summary,
      tags,
      status,
      datePosted: values.datePosted,
      validThrough: values.validThrough,
      payMin: numberOrUndefined(values.payMin),
      payMax: numberOrUndefined(values.payMax),
      payUnit: payUnit === '' ? undefined : payUnit,
      // Blank keeps the current slot (edit) / appends (create).
      sortIndex: numberOrUndefined(values.sortIndex),
    });
    if (!parsed.success) {
      setIssues(flattenCareersIssues(parsed.error));
      return;
    }
    setPending(true);
    let res: CareersMutationResult;
    try {
      res =
        (editing
          ? await updateJobOpening(opening.id, parsed.data)
          : await createJobOpening(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong. Try again.');
      return;
    }
    toast.success(editing ? 'Role saved.' : `Role created: ${parsed.data.title}.`);
    onOpenChange(false);
  }

  async function onDelete() {
    if (!opening) return;
    setDeleting(true);
    const res = await safeAction(deleteJobOpening(opening.id));
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Role deleted.');
    onOpenChange(false);
  }

  const applications = opening?.applicationCount ?? 0;

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={close}
        maxWidth="48rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              {editing ? opening.title : 'Add role'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {editing
                ? 'What the careers page, the application form, and Google see of this role.'
                : 'A new listing for the careers page. It starts as a draft until you open it.'}
            </Dialog.Description>
          </>
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              // The actions live in the pinned footer, outside the <form>.
              form={FORM_ID}
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending || deleting}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
            </Button>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending || deleting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Dialog.Close>
            {editing && (
              <div className="flex flex-1 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  disabled={pending || deleting}
                  onClick={() => setConfirmingDelete(true)}
                  className="text-destructive"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        }
      >
        {/* One flat grid: each top-level block is a cell, and only the blocks
            that genuinely need the full measure (prose, chip rows, the pay
            fieldset) span both. Seventeen fields stacked one-per-row ran well
            past any laptop viewport. */}
        <form
          id={FORM_ID}
          onSubmit={onSubmit}
          className="grid gap-4 md:grid-cols-2 md:items-start md:gap-x-6"
          noValidate
        >
          {issues._form && (
            <p role="alert" className="px-1 text-xs text-destructive md:col-span-2">
              {issues._form}
            </p>
          )}

          <Field id="role-title" label="Title" error={issues.title}>
            <Input
              id="role-title"
              value={values.title}
              onChange={(e) => setValue('title', e.target.value)}
              maxLength={JOB_TITLE_MAX}
              autoComplete="off"
              disabled={pending}
              aria-invalid={issues.title ? true : undefined}
              aria-describedby={issues.title ? 'role-title-error' : undefined}
            />
          </Field>

          <Field
            id="role-slug"
            label="Slug"
            error={issues.slug}
            hint={
              editing
                ? 'Fixed once created, because it is stored on every application for this role.'
                : 'The link name on the application form. Safe to leave auto-generated.'
            }
          >
            <Input
              id="role-slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setValue('slug', e.target.value);
              }}
              maxLength={JOB_SLUG_MAX}
              autoComplete="off"
              spellCheck={false}
              disabled={pending || editing}
              aria-invalid={issues.slug ? true : undefined}
              aria-describedby={issues.slug ? 'role-slug-error' : undefined}
            />
          </Field>

          <Field id="role-category" label="Category" error={issues.categoryId}>
            <select
              id="role-category"
              value={values.categoryId}
              onChange={(e) => setValue('categoryId', e.target.value)}
              disabled={pending}
              aria-invalid={issues.categoryId ? true : undefined}
              aria-describedby={issues.categoryId ? 'role-category-error' : undefined}
              className={selectClasses}
            >
              {values.categoryId === '' && (
                <option value="">Pick a category</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <ChipGroup
            legend="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(next) => {
              clearIssue('status');
              setStatus(next);
            }}
            disabled={pending}
            error={issues.status}
            help={JOB_STATUS_HELP[status]}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
            <Field
              id="role-location"
              label="Location"
              error={issues.location}
              hint="“Remote” makes the posting telecommute."
            >
              <Input
                id="role-location"
                value={values.location}
                onChange={(e) => setValue('location', e.target.value)}
                maxLength={JOB_LOCATION_MAX}
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.location ? true : undefined}
                aria-describedby={issues.location ? 'role-location-error' : undefined}
              />
            </Field>
            <Field id="role-level" label="Level" error={issues.level}>
              <Input
                id="role-level"
                value={values.level}
                onChange={(e) => setValue('level', e.target.value)}
                placeholder="e.g. Mid-level"
                maxLength={JOB_LEVEL_MAX}
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.level ? true : undefined}
                aria-describedby={issues.level ? 'role-level-error' : undefined}
              />
            </Field>
          </div>

          <ChipGroup
            legend="Employment type"
            options={TYPE_OPTIONS}
            value={employmentType}
            onChange={(next) => {
              clearIssue('employmentType');
              setEmploymentType(next);
            }}
            disabled={pending}
            error={issues.employmentType}
          />

          <Field id="role-cadence" label="Cadence" error={issues.cadence}>
            <Input
              id="role-cadence"
              value={values.cadence}
              onChange={(e) => setValue('cadence', e.target.value)}
              placeholder="e.g. Flexible hours"
              maxLength={JOB_CADENCE_MAX}
              autoComplete="off"
              disabled={pending}
              aria-invalid={issues.cadence ? true : undefined}
              aria-describedby={issues.cadence ? 'role-cadence-error' : undefined}
            />
          </Field>

          <Field
            id="role-summary"
            label="Summary"
            className="md:col-span-2"
            error={issues.summary}
            hint={`One line on the card and in the job posting. ${values.summary.length}/${JOB_SUMMARY_MAX}`}
          >
            <textarea
              id="role-summary"
              rows={2}
              value={values.summary}
              onChange={(e) => setValue('summary', e.target.value)}
              maxLength={JOB_SUMMARY_MAX}
              disabled={pending}
              aria-invalid={issues.summary ? true : undefined}
              aria-describedby={issues.summary ? 'role-summary-error' : undefined}
              className={cn(textareaClasses, 'min-h-16')}
            />
          </Field>

          <Field
            id="role-fit"
            label="Best for"
            className="md:col-span-2"
            error={issues.fit}
            hint={`Who the role suits. ${values.fit.length}/${JOB_FIT_MAX}`}
          >
            <textarea
              id="role-fit"
              rows={2}
              value={values.fit}
              onChange={(e) => setValue('fit', e.target.value)}
              maxLength={JOB_FIT_MAX}
              disabled={pending}
              aria-invalid={issues.fit ? true : undefined}
              aria-describedby={issues.fit ? 'role-fit-error' : undefined}
              className={cn(textareaClasses, 'min-h-16')}
            />
          </Field>

          <Field
            id="role-tags"
            label="Tags"
            className="md:col-span-2"
            error={tagsIssue}
            hint={`Comma-separated, up to ${JOB_TAGS_MAX}.`}
          >
            <Input
              id="role-tags"
              value={values.tags}
              onChange={(e) => {
                setValue('tags', e.target.value);
                setIssues((prev) =>
                  dropIssues(
                    prev,
                    ...Object.keys(prev).filter((k) => k.startsWith('tags.')),
                  ),
                );
              }}
              placeholder="e.g. Reels, Short-form, Premiere"
              autoComplete="off"
              disabled={pending}
              aria-invalid={tagsIssue ? true : undefined}
              aria-describedby={tagsIssue ? 'role-tags-error' : undefined}
            />
            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags as they will show">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {/* Pay — the one block that gates 'open'. */}
          <fieldset
            disabled={pending}
            className="flex flex-col gap-3 border-t border-white/40 pt-4 md:col-span-2 dark:border-white/10"
          >
            <legend className="float-left mb-2 text-sm font-medium text-foreground">
              Pay
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field id="role-pay-min" label="Minimum" error={issues.payMin}>
                <Input
                  id="role-pay-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={values.payMin}
                  onChange={(e) => setValue('payMin', e.target.value)}
                  autoComplete="off"
                  aria-invalid={issues.payMin ? true : undefined}
                  aria-describedby={issues.payMin ? 'role-pay-min-error' : undefined}
                />
              </Field>
              <Field id="role-pay-max" label="Maximum" error={issues.payMax}>
                <Input
                  id="role-pay-max"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={values.payMax}
                  onChange={(e) => setValue('payMax', e.target.value)}
                  autoComplete="off"
                  aria-invalid={issues.payMax ? true : undefined}
                  aria-describedby={issues.payMax ? 'role-pay-max-error' : undefined}
                />
              </Field>
            </div>
            <ChipGroup
              legend="Unit"
              options={PAY_UNIT_OPTIONS}
              value={payUnit}
              onChange={(next) => {
                clearIssue('payUnit');
                clearIssue('payMin');
                setPayUnit(next);
              }}
              disabled={pending}
              error={issues.payUnit}
              help="Whole CAD dollars. Required to open the role under the BC Pay Transparency Act."
            />
          </fieldset>

          <div className="grid grid-cols-1 gap-4 border-t border-white/40 pt-4 sm:grid-cols-2 md:col-span-2 dark:border-white/10">
            <Field
              id="role-posted"
              label="Posted"
              error={issues.datePosted}
              hint="Required to open the role. Google needs it."
            >
              <Input
                id="role-posted"
                type="date"
                value={values.datePosted}
                onChange={(e) => setValue('datePosted', e.target.value)}
                disabled={pending}
                aria-invalid={issues.datePosted ? true : undefined}
                aria-describedby={issues.datePosted ? 'role-posted-error' : undefined}
              />
            </Field>
            <Field
              id="role-expires"
              label="Expires"
              error={issues.validThrough}
              hint="Last valid day. After it, the role leaves Google’s listings."
            >
              <Input
                id="role-expires"
                type="date"
                value={values.validThrough}
                onChange={(e) => setValue('validThrough', e.target.value)}
                disabled={pending}
                aria-invalid={issues.validThrough ? true : undefined}
                aria-describedby={issues.validThrough ? 'role-expires-error' : undefined}
              />
            </Field>
          </div>

          <Field
            id="role-sort"
            label="Order"
            error={issues.sortIndex}
            hint={
              editing
                ? `Lower shows earlier within its category. Blank keeps the current slot (${opening.sortIndex}).`
                : 'Lower shows earlier within its category. Blank appends at the end.'
            }
          >
            <Input
              id="role-sort"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.sortIndex}
              onChange={(e) => setValue('sortIndex', e.target.value)}
              autoComplete="off"
              disabled={pending}
              aria-invalid={issues.sortIndex ? true : undefined}
              className="sm:w-40"
            />
          </Field>

        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this role?"
        description={
          applications > 0
            ? `${applications} application${applications === 1 ? '' : 's'} keep${applications === 1 ? 's' : ''} the role’s name; the listing itself is gone for good.`
            : 'No applications point at this role. The listing is gone for good.'
        }
        confirmLabel="Delete role"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

/** The header's "Add role" affordance — owns its dialog state. Nothing can be
 *  filed without a category to sit under, so it waits for the first one. */
export function AddOpeningButton({
  categories,
}: {
  categories: AdminCategoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const blocked = categories.length === 0;
  return (
    <>
      <Button
        type="button"
        size="small"
        icon={LuBriefcase}
        iconPosition="left"
        onClick={() => setOpen(true)}
        disabled={blocked}
        title={blocked ? 'Add a category first, since every role sits under one.' : undefined}
        className="disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add role
      </Button>
      <OpeningDialog
        open={open}
        onOpenChange={setOpen}
        opening={null}
        categories={categories}
      />
    </>
  );
}
