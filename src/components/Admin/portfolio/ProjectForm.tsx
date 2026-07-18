'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup, MultiChipGroup } from './PortfolioChips';
import {
  createProject,
  deleteProject,
  updateProject,
  type ProjectMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/projects';
import { flattenPortfolioIssues, projectSchema } from '@/lib/portfolioSchema';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_CATEGORY_SLUGS,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_SERVICE_TAGS,
  PROJECT_STAT_FOOTNOTE_MAX,
  PROJECT_STAT_LABEL_MAX,
  PROJECT_STAT_VALUE_MAX,
  PROJECT_STATS_MAX,
  PROJECT_SUMMARY_MAX,
  PROJECT_TITLE_MAX,
  PROJECT_VISIBILITY_HELP,
  PROJECT_VISIBILITY_LABELS,
  PROJECT_VISIBILITY_SLUGS,
  type ProjectCategoryField,
  type ProjectVisibilityField,
} from '@/lib/portfolioFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

/** One highlights row as the form holds it ('' for empty fields). */
export type ProjectStatFormRow = {
  label: string;
  value: string;
  footnote: string;
};

/** Core field values as the form holds them ('' for empty optionals). */
export type ProjectFormValues = {
  title: string;
  slug: string;
  category: ProjectCategoryField;
  clientId: string;
  clientName: string;
  industry: string;
  location: string;
  year: string;
  summary: string;
  description: string;
  services: string[];
  externalUrl: string;
  stats: ProjectStatFormRow[];
  testimonialQuote: string;
  testimonialName: string;
  testimonialRole: string;
  featured: boolean;
  visibility: ProjectVisibilityField;
};

export type ClientOption = { id: string; name: string };

const SERVER_ERROR: ProjectMutationResult = { ok: false, error: 'server' };

const CATEGORY_OPTIONS = PROJECT_CATEGORY_SLUGS.map((slug) => ({
  slug,
  label: PROJECT_CATEGORY_LABELS[slug],
}));

const VISIBILITY_OPTIONS = PROJECT_VISIBILITY_SLUGS.map((slug) => ({
  slug,
  label: PROJECT_VISIBILITY_LABELS[slug],
}));

const BLANK: ProjectFormValues = {
  title: '',
  slug: '',
  category: 'production',
  clientId: '',
  clientName: '',
  industry: '',
  location: '',
  year: String(new Date().getFullYear()),
  summary: '',
  description: '',
  services: [],
  externalUrl: '',
  stats: [],
  testimonialQuote: '',
  testimonialName: '',
  testimonialRole: '',
  featured: false,
  visibility: 'draft',
};

// The Input primitive's look on native textarea/select (NewTicketForm idiom —
// no heavier form deps in the admin).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';
const selectClasses =
  'border-input flex h-9 w-full min-w-0 cursor-pointer rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

/**
 * The core-fields editor for one project, create and edit. Create is
 * deliberately two-step (the ticket form's redirect-on-success pattern):
 * save the fields → land on /admin/projects/<id>, where the media sections
 * (cover, gallery, embeds) unlock — media rows need a project id to belong
 * to. Validation is shared zod (portfolioSchema) parsed on both sides; the
 * services picker is a controlled vocabulary because those strings drive the
 * public filter rails and service-page matching.
 */
export default function ProjectForm({
  mode,
  projectId,
  initialValues,
  clients,
}: {
  mode: 'create' | 'edit';
  /** Present in edit mode. */
  projectId?: string;
  initialValues?: ProjectFormValues;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormValues>(
    initialValues ?? BLANK,
  );
  // An existing slug is a live URL — only create mode auto-derives it.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Last-saved snapshot — a long case study is easy to lose to a stray
  // refresh/⌘W, so unsaved edits arm a beforeunload prompt. Tab close and
  // reload only; in-app navigation is not intercepted (App Router has no
  // supported nav-blocking API).
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialValues ?? BLANK),
  );
  const dirty = JSON.stringify(values) !== savedSnapshot;

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function clearIssue(key: string) {
    setIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setValue<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === 'title' && !slugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
    clearIssue(key);
  }

  function toggleService(tag: string) {
    clearIssue('services');
    setValues((v) => ({
      ...v,
      services: v.services.includes(tag)
        ? v.services.filter((s) => s !== tag)
        : [...v.services, tag],
    }));
  }

  // Any stats change invalidates every stats.* issue — row indexes shift on
  // remove, so per-key clearing would mislabel errors.
  function clearStatIssues() {
    setIssues((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.startsWith('stats')),
      );
      return Object.keys(next).length === Object.keys(prev).length
        ? prev
        : next;
    });
  }

  function setStat(index: number, key: keyof ProjectStatFormRow, value: string) {
    clearStatIssues();
    setValues((v) => ({
      ...v,
      stats: v.stats.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  }

  function addStat() {
    clearStatIssues();
    setValues((v) =>
      v.stats.length >= PROJECT_STATS_MAX
        ? v
        : { ...v, stats: [...v.stats, { label: '', value: '', footnote: '' }] },
    );
  }

  function removeStat(index: number) {
    clearStatIssues();
    setValues((v) => ({ ...v, stats: v.stats.filter((_, i) => i !== index) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    // Fully-empty highlight rows are UI scaffolding, not input — drop them
    // before the parse (a blank row would trip min(1)), and map '' footnotes
    // to undefined. keptIndices translates zod's filtered-array issue paths
    // back onto the rows the form displays.
    const keptIndices: number[] = [];
    const stats = values.stats.flatMap((row, i) => {
      if (!row.label.trim() && !row.value.trim() && !row.footnote.trim()) {
        return [];
      }
      keptIndices.push(i);
      return [
        {
          label: row.label,
          value: row.value,
          footnote: row.footnote.trim() ? row.footnote : undefined,
        },
      ];
    });
    const parsed = projectSchema.safeParse({ ...values, stats });
    if (!parsed.success) {
      const flat = flattenPortfolioIssues(parsed.error);
      const remapped = Object.fromEntries(
        Object.entries(flat).map(([key, message]) => {
          const match = key.match(/^stats\.(\d+)(\..+)?$/);
          if (!match) return [key, message];
          const original = keptIndices[Number(match[1])] ?? match[1];
          return [`stats.${original}${match[2] ?? ''}`, message];
        }),
      );
      setIssues(remapped);
      toast.error('Check the highlighted fields.');
      return;
    }

    setPending(true);
    let res: ProjectMutationResult;
    try {
      res =
        (mode === 'edit' && projectId
          ? await updateProject(projectId, parsed.data)
          : await createProject(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }

    if (res.ok) {
      if (mode === 'create') {
        toast.success('Project created — now add its media.');
        // Keep `pending` on while the redirect lands — no double submits.
        router.push(`/admin/projects/${res.id}`);
        return;
      }
      setPending(false);
      setSavedSnapshot(JSON.stringify(values));
      toast.success('Project saved.');
      router.refresh();
      return;
    }
    setPending(false);
    if (res.error === 'validation') {
      setIssues(res.issues);
      toast.error('Check the highlighted fields.');
      return;
    }
    toast.error('Something went wrong — try again.');
  }

  async function onDelete() {
    if (!projectId) return;
    setDeleting(true);
    let res: Awaited<ReturnType<typeof deleteProject>>;
    try {
      res = (await deleteProject(projectId)) ?? {
        ok: false,
        error: 'Delete failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Delete failed — try again.' };
    }
    if (!res.ok) {
      setDeleting(false);
      setConfirmingDelete(false);
      toast.error(res.error);
      return;
    }
    toast.success('Project deleted.');
    // Keep `deleting` on while the redirect lands.
    router.push('/admin/projects');
  }

  const busy = pending || deleting;

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="project-title" label="Title" error={issues.title}>
            <Input
              id="project-title"
              value={values.title}
              maxLength={PROJECT_TITLE_MAX}
              onChange={(e) => setValue('title', e.target.value)}
              placeholder="e.g. Mystica 80 Skylounge"
              autoComplete="off"
              disabled={busy}
              aria-invalid={issues.title ? true : undefined}
            />
          </Field>
          <Field
            id="project-slug"
            label="Slug"
            error={issues.slug}
            hint={`URL: /projects/${values.category}/${values.slug || '…'}`}
          >
            <Input
              id="project-slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setValue('slug', e.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              aria-invalid={issues.slug ? true : undefined}
            />
          </Field>
        </div>

        <ChipGroup
          legend="Category"
          options={CATEGORY_OPTIONS}
          value={values.category}
          onChange={(next) => setValue('category', next)}
          disabled={busy}
          error={issues.category}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="project-client"
            label="Client"
            error={issues.clientId}
            hint="Manage the roster on the Clients page."
          >
            <select
              id="project-client"
              value={values.clientId}
              onChange={(e) => setValue('clientId', e.target.value)}
              disabled={busy}
              aria-invalid={issues.clientId ? true : undefined}
              className={selectClasses}
            >
              <option value="">— No linked client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="project-client-name"
            label="Client display name"
            error={issues.clientName}
            hint={
              values.clientId
                ? 'Optional — overrides the client’s name on this card only.'
                : 'Required when no client is linked (e.g. “Private Residence”).'
            }
          >
            <Input
              id="project-client-name"
              value={values.clientName}
              onChange={(e) => setValue('clientName', e.target.value)}
              autoComplete="off"
              disabled={busy}
              aria-invalid={issues.clientName ? true : undefined}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="project-industry" label="Industry" error={issues.industry}>
            <Input
              id="project-industry"
              value={values.industry}
              onChange={(e) => setValue('industry', e.target.value)}
              placeholder="e.g. Boats & Yachts"
              autoComplete="off"
              disabled={busy}
              aria-invalid={issues.industry ? true : undefined}
            />
          </Field>
          <Field id="project-location" label="Location" error={issues.location}>
            <Input
              id="project-location"
              value={values.location}
              onChange={(e) => setValue('location', e.target.value)}
              placeholder="e.g. North Vancouver, BC"
              autoComplete="off"
              disabled={busy}
              aria-invalid={issues.location ? true : undefined}
            />
          </Field>
          <Field
            id="project-year"
            label="Year"
            error={issues.year}
            hint="2025, or a range like 2023–2024."
          >
            <Input
              id="project-year"
              value={values.year}
              onChange={(e) => setValue('year', e.target.value)}
              autoComplete="off"
              disabled={busy}
              aria-invalid={issues.year ? true : undefined}
            />
          </Field>
        </div>

        <Field
          id="project-summary"
          label="Card summary"
          error={issues.summary}
          hint="One or two sentences on the card and in search results."
        >
          <textarea
            id="project-summary"
            data-lenis-prevent
            rows={2}
            value={values.summary}
            maxLength={PROJECT_SUMMARY_MAX}
            onChange={(e) => setValue('summary', e.target.value)}
            disabled={busy}
            aria-invalid={issues.summary ? true : undefined}
            className={cn(textareaClasses, 'min-h-16')}
          />
        </Field>

        <MultiChipGroup
          legend="Services on this project"
          options={PROJECT_SERVICE_TAGS}
          values={values.services}
          onToggle={toggleService}
          disabled={busy}
          error={issues.services}
          help="These chips drive the public filters — that’s why it’s a fixed list."
        />

        <fieldset disabled={busy} className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium text-foreground">
            Highlights — the results row
          </legend>
          <p className="-mt-2 text-xs text-muted-foreground">
            Up to {PROJECT_STATS_MAX} outcome figures shown big on the detail
            page (“+48%”, “3.1M”, “6 weeks”). Footnotes render as fine print.
          </p>
          {values.stats.map((row, i) => {
            const rowError =
              issues[`stats.${i}.value`] ??
              issues[`stats.${i}.label`] ??
              issues[`stats.${i}.footnote`];
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_1.5fr_auto]">
                  <Input
                    aria-label={`Highlight ${i + 1} — figure`}
                    value={row.value}
                    maxLength={PROJECT_STAT_VALUE_MAX}
                    onChange={(e) => setStat(i, 'value', e.target.value)}
                    placeholder="+48%"
                    autoComplete="off"
                    aria-invalid={
                      issues[`stats.${i}.value`] ? true : undefined
                    }
                  />
                  <Input
                    aria-label={`Highlight ${i + 1} — label`}
                    value={row.label}
                    maxLength={PROJECT_STAT_LABEL_MAX}
                    onChange={(e) => setStat(i, 'label', e.target.value)}
                    placeholder="Organic traffic"
                    autoComplete="off"
                    aria-invalid={
                      issues[`stats.${i}.label`] ? true : undefined
                    }
                  />
                  <Input
                    aria-label={`Highlight ${i + 1} — footnote (optional)`}
                    value={row.footnote}
                    maxLength={PROJECT_STAT_FOOTNOTE_MAX}
                    onChange={(e) => setStat(i, 'footnote', e.target.value)}
                    placeholder="Footnote (optional) — e.g. 6 months post-launch"
                    autoComplete="off"
                    aria-invalid={
                      issues[`stats.${i}.footnote`] ? true : undefined
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    onClick={() => removeStat(i)}
                    aria-label={`Remove highlight ${i + 1}`}
                  >
                    Remove
                  </Button>
                </div>
                {rowError && (
                  <p role="alert" className="px-1 text-xs text-destructive">
                    {rowError}
                  </p>
                )}
              </div>
            );
          })}
          {issues.stats && (
            <p role="alert" className="px-1 text-xs text-destructive">
              {issues.stats}
            </p>
          )}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={addStat}
              disabled={busy || values.stats.length >= PROJECT_STATS_MAX}
            >
              Add highlight
            </Button>
          </div>
        </fieldset>

        <Field
          id="project-description"
          label="Case study"
          error={issues.description}
          hint="Blank line = new paragraph. The detail page goes live once the project has this text or any media."
        >
          <textarea
            id="project-description"
            data-lenis-prevent
            rows={8}
            value={values.description}
            maxLength={PROJECT_DESCRIPTION_MAX}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="The brief, the approach, what shipped, the results…"
            disabled={busy}
            aria-invalid={issues.description ? true : undefined}
            className={cn(textareaClasses, 'min-h-40')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="project-external-url"
            label="Live link"
            error={issues.externalUrl}
            hint="E.g. the website that shipped — shown as a button on the detail page."
          >
            <Input
              id="project-external-url"
              type="url"
              value={values.externalUrl}
              onChange={(e) => setValue('externalUrl', e.target.value)}
              placeholder="https://…"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              aria-invalid={issues.externalUrl ? true : undefined}
            />
          </Field>
          <Field
            id="project-testimonial-name"
            label="Testimonial — who said it"
            error={issues.testimonialName}
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="project-testimonial-name"
                value={values.testimonialName}
                onChange={(e) => setValue('testimonialName', e.target.value)}
                placeholder="Name"
                autoComplete="off"
                disabled={busy}
              />
              <Input
                aria-label="Testimonial — their role"
                value={values.testimonialRole}
                onChange={(e) => setValue('testimonialRole', e.target.value)}
                placeholder="Role"
                autoComplete="off"
                disabled={busy}
              />
            </div>
          </Field>
        </div>

        <Field
          id="project-testimonial-quote"
          label="Testimonial"
          error={issues.testimonialQuote}
        >
          <textarea
            id="project-testimonial-quote"
            data-lenis-prevent
            rows={2}
            value={values.testimonialQuote}
            onChange={(e) => setValue('testimonialQuote', e.target.value)}
            placeholder="What the client said (optional)"
            disabled={busy}
            aria-invalid={issues.testimonialQuote ? true : undefined}
            className={cn(textareaClasses, 'min-h-16')}
          />
        </Field>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <ChipGroup
            legend="Visibility"
            options={VISIBILITY_OPTIONS}
            value={values.visibility}
            onChange={(next) => setValue('visibility', next)}
            disabled={busy}
            error={issues.visibility}
            help={PROJECT_VISIBILITY_HELP[values.visibility]}
          />
          <fieldset disabled={busy}>
            <legend className="mb-2 text-sm font-medium text-foreground">
              Featured
            </legend>
            <label
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                'has-[:focus-visible]:ring-[1.5px] has-[:focus-visible]:ring-ring',
                values.featured
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
                busy && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                checked={values.featured}
                onChange={(e) => setValue('featured', e.target.checked)}
                className="sr-only"
              />
              Fronts the hub’s “Now screening”
            </label>
          </fieldset>
        </div>

        {issues._form && (
          <p role="alert" className="text-xs text-destructive">
            {issues._form}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/40 pt-4 dark:border-white/10">
          {mode === 'edit' ? (
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
              className="text-destructive"
            >
              Delete project
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Cover, gallery, and videos unlock after this first save.
            </span>
          )}
          <Button type="submit" size="small" showIcon={false} disabled={busy}>
            {pending
              ? 'Saving…'
              : mode === 'create'
                ? 'Create project'
                : 'Save changes'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this project?"
        description="Its detail page, card, and every uploaded image disappear immediately. This can’t be undone."
        confirmLabel="Delete project"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </GlassPanel>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
