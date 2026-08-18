'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuPencil, LuPlay, LuPlus, LuTrash2 } from 'react-icons/lu';

import {
  createTaskFromTemplate,
  createTaskTemplate,
  deleteTaskTemplate,
  setTaskTemplateActive,
  updateTaskTemplate,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import { taskTemplateSchema, flattenTaskIssues } from '@/lib/taskSchema';
import {
  INTERNAL_CLIENT_LABEL,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  TASK_REPEAT_LABELS,
  TASK_REPEAT_SLUGS,
  WEEKDAY_LABELS,
  formatMinutes,
  ordinal,
  repeatLabel,
  TIME_REQUIRED_ERROR,
  type TaskRepeatSlug,
} from '@/lib/taskFields';
import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { GlassRim, glassRowHover } from '@/components/Admin/Glass';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import ClientMark from './ClientMark';
import DurationField from './DurationField';
import HoursQuickPicks from './HoursQuickPicks';
import type { TaskFormOptions, TaskRowData } from './types';

/**
 * Saved task shapes — the routine work the studio was retyping every week.
 * One dialog does both jobs: a list of what exists (spawn, edit, pause,
 * delete) and the form that creates or edits one.
 *
 * A template is deliberately NOT a task: no status, no hours logged, no
 * dates. Everything time-bound is stamped when it mints, so a template can
 * sit unused for a season and still produce a correct task.
 *
 * No router.refresh() anywhere: every template action revalidates the
 * '/admin' layout, so the fresh list rides the action response.
 */

export type TemplateItem = {
  id: string;
  name: string;
  title: string;
  notes: string | null;
  clientId: string | null;
  clientName: string | null;
  clientLogo: string;
  categoryId: string;
  categoryName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: string | null;
  estimatedMinutes: number;
  repeat: TaskRepeatSlug;
  repeatDay: number | null;
  dueOffsetDays: number | null;
  active: boolean;
};

/** The seed a "Save as template" from an existing task hands over. */
export type TemplateSeed = {
  name: string;
  title: string;
  notes: string;
  clientId: string | null;
  categoryId: string;
  assigneeId: string;
  priority: string;
  estimatedMinutes: number | null;
};

const BLANK: TemplateSeed = {
  name: '',
  title: '',
  notes: '',
  clientId: null,
  categoryId: '',
  assigneeId: '',
  priority: '',
  estimatedMinutes: null,
};

/** A task row → the shape a template would save. The template name defaults
 *  to the task's title; both stay editable before saving. */
export function seedFromTask(row: TaskRowData): TemplateSeed {
  return {
    name: row.title,
    title: row.title,
    notes: row.notes,
    // TaskRowData flattens a null client to '' (= Perseus), which is exactly
    // the vocabulary the template form speaks.
    clientId: row.clientId,
    categoryId: row.categoryId,
    assigneeId: row.assigneeId,
    priority: row.priority ?? '',
    estimatedMinutes: row.estimatedMinutes,
  };
}

const PRIORITY_OPTIONS = [
  { slug: '', label: 'None' },
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    slug: slug as string,
    label: TASK_PRIORITY_LABELS[slug],
  })),
];

const REPEAT_OPTIONS = TASK_REPEAT_SLUGS.map((slug) => ({
  slug: slug as string,
  label: TASK_REPEAT_LABELS[slug],
}));

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, i) => ({
  slug: String(i + 1),
  label: label.slice(0, 3),
}));

// 1–28 only: capped so a monthly schedule can never skip February.
const MONTH_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  slug: String(i + 1),
  label: String(i + 1),
}));

export default function TaskTemplatesDialog({
  open,
  onOpenChange,
  templates,
  options,
  seed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateItem[];
  options: TaskFormOptions;
  /** Non-null opens straight into the form, prefilled — the "Save as
   *  template" path from a task row. */
  seed?: TemplateSeed | null;
}) {
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TemplateItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // A seed arriving means the caller asked for the FORM, not the list. State
  // rather than a ref: the render below reads it, and refs may not be read
  // during render. Re-running with the same seed object is a no-op (React
  // bails on an identical value), so this can't loop.
  const [formSeed, setFormSeed] = useState<TemplateSeed | null>(null);
  useEffect(() => {
    if (!open) {
      setFormSeed(null);
      setComposing(false);
      setEditing(null);
      return;
    }
    if (seed) {
      setFormSeed(seed);
      setEditing(null);
      setComposing(true);
    }
  }, [open, seed]);

  async function onSpawn(template: TemplateItem) {
    setBusyId(template.id);
    const res = await createTaskFromTemplate(template.id).catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      toast.error('Could not create the task — try again.');
      return;
    }
    toast.success(`Added “${template.title}”.`);
  }

  async function onToggleActive(template: TemplateItem) {
    setBusyId(template.id);
    const res = await setTaskTemplateActive(
      template.id,
      !template.active,
    ).catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Could not update — try again.');
      return;
    }
    toast.success(template.active ? 'Paused.' : 'Resumed.');
  }

  async function onDelete() {
    const target = confirmDelete;
    if (!target) return;
    setDeleting(true);
    const res = await deleteTaskTemplate(target.id).catch(() => null);
    setDeleting(false);
    setConfirmDelete(null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed — try again.');
      return;
    }
    toast.success('Template deleted.');
  }

  const showForm = composing || editing !== null;

  return (
    <>
      <GlassDialog open={open} onOpenChange={onOpenChange} maxWidth="34rem">
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          {showForm
            ? editing
              ? 'Edit template'
              : 'New template'
            : 'Task templates'}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {showForm
            ? 'Save the shape of the work. Dates and hours are stamped when it becomes a task.'
            : 'Routine work you shouldn’t have to retype. Spawn one on demand, or let it repeat on a schedule.'}
        </Dialog.Description>

        {showForm ? (
          <TemplateForm
            // Remount on every switch between rows (and between edit and new)
            // so the form's seeded state is rebuilt rather than synced.
            key={editing?.id ?? 'new'}
            options={options}
            template={editing}
            seed={editing ? null : (formSeed ?? BLANK)}
            onDone={() => {
              setComposing(false);
              setEditing(null);
              setFormSeed(null);
            }}
          />
        ) : (
          <>
            {templates.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center text-sm text-muted-foreground">
                No templates yet. Save the shape of anything you do more than
                once.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-1">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2 py-2',
                      glassRowHover,
                      !template.active && 'opacity-55',
                    )}
                  >
                    <ClientMark
                      name={template.clientName ?? INTERNAL_CLIENT_LABEL}
                      logo={template.clientLogo}
                      mark={template.clientId === null}
                      size={26}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {template.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[
                          template.clientName ?? INTERNAL_CLIENT_LABEL,
                          template.categoryName,
                          formatMinutes(template.estimatedMinutes),
                          repeatLabel(template.repeat, template.repeatDay) ||
                            'On demand',
                          template.active ? '' : 'Paused',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <IconAction
                        label={`Add a task from ${template.name}`}
                        icon={LuPlay}
                        disabled={busyId === template.id}
                        onClick={() => void onSpawn(template)}
                      />
                      <IconAction
                        label={`Edit ${template.name}`}
                        icon={LuPencil}
                        disabled={busyId === template.id}
                        onClick={() => setEditing(template)}
                      />
                      <IconAction
                        label={`Delete ${template.name}`}
                        icon={LuTrash2}
                        disabled={busyId === template.id}
                        onClick={() => setConfirmDelete(template)}
                      />
                    </span>
                    {template.repeat !== 'none' && (
                      <button
                        type="button"
                        disabled={busyId === template.id}
                        onClick={() => void onToggleActive(template)}
                        className="shrink-0 cursor-pointer rounded-full border border-foreground/15 px-2 py-0.5 text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {template.active ? 'Pause' : 'Resume'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                size="small"
                icon={LuPlus}
                iconPosition="left"
                shimmer={false}
                onClick={() => {
                  setFormSeed(null);
                  setComposing(true);
                }}
              >
                New template
              </Button>
            </div>
          </>
        )}
      </GlassDialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !next && setConfirmDelete(null)}
        title="Delete this template?"
        description={`“${confirmDelete?.name ?? ''}” will stop producing tasks. Tasks it already created are unaffected.`}
        confirmLabel="Delete"
        destructive
        pending={deleting}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}

function IconAction({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

function TemplateForm({
  options,
  template,
  seed,
  onDone,
}: {
  options: TaskFormOptions;
  /** Non-null = editing an existing row. */
  template: TemplateItem | null;
  seed: TemplateSeed | null;
  onDone: () => void;
}) {
  const [values, setValues] = useState(() =>
    template
      ? {
          name: template.name,
          title: template.title,
          notes: template.notes ?? '',
          clientId: template.clientId,
          categoryId: template.categoryId,
          assigneeId: template.assigneeId ?? '',
          priority: template.priority ?? '',
          estimatedMinutes: template.estimatedMinutes,
        }
      : (seed ?? BLANK),
  );
  const [repeat, setRepeat] = useState<TaskRepeatSlug>(
    template?.repeat ?? 'none',
  );
  const [repeatDay, setRepeatDay] = useState(
    // A fresh weekly schedule defaults to Monday, a monthly one to the 1st —
    // both real answers, so the form is never invalid on first switch.
    String(template?.repeatDay ?? 1),
  );
  const [dueOffset, setDueOffset] = useState(
    template?.dueOffsetDays === null || template?.dueOffsetDays === undefined
      ? ''
      : String(template.dueOffsetDays),
  );
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // No inline client creation here (unlike the task composer): a template is
  // long-lived config, and naming a client that doesn't exist yet is a task's
  // problem, not a shape's.
  const clientLabel =
    values.clientId === null || values.clientId === ''
      ? null
      : (options.clients.find((o) => o.value === values.clientId)?.label ??
        null);

  function setValue<K extends keyof TemplateSeed>(
    key: K,
    value: TemplateSeed[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues(({ [key]: _cleared, ...rest }) => rest);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Same structural backstop the quick-add band carries: the client
    // combobox portals its own form out of the DOM, but React still bubbles
    // its submit up the React tree to here.
    if (e.target !== e.currentTarget) return;

    const estimatedMinutes = values.estimatedMinutes;
    if (estimatedMinutes === null) {
      setIssues({ estimatedMinutes: TIME_REQUIRED_ERROR });
      return;
    }

    const payload = {
      name: values.name.trim(),
      title: values.title.trim(),
      notes: values.notes.trim() || undefined,
      clientId: values.clientId || undefined,
      categoryId: values.categoryId,
      assigneeId: values.assigneeId || undefined,
      priority: values.priority || undefined,
      estimatedMinutes,
      repeat,
      repeatDay: repeat === 'none' ? undefined : Number(repeatDay),
      dueOffsetDays: dueOffset === '' ? undefined : Number(dueOffset),
      active: template?.active ?? true,
    };

    const parsed = taskTemplateSchema.safeParse(payload);
    if (!parsed.success) {
      setIssues(flattenTaskIssues(parsed.error));
      return;
    }

    setPending(true);
    const res = await (template
      ? updateTaskTemplate(template.id, payload)
      : createTaskTemplate(payload)
    ).catch(() => null);
    setPending(false);

    if (!res?.ok) {
      if (res && !res.ok && res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Could not save the template — try again.');
      return;
    }
    toast.success(template ? 'Template updated.' : 'Template saved.');
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
      <Field id="tpl-name" label="Template name" error={issues.name}>
        <Input
          id="tpl-name"
          value={values.name}
          onChange={(e) => setValue('name', e.target.value)}
          placeholder="e.g. Weekly reel edit"
          disabled={pending}
          aria-invalid={issues.name ? true : undefined}
        />
      </Field>

      <Field
        id="tpl-title"
        label="Task title"
        error={issues.title}
        hint="What the created task will be called."
      >
        <Input
          id="tpl-title"
          value={values.title}
          onChange={(e) => setValue('title', e.target.value)}
          disabled={pending}
          aria-invalid={issues.title ? true : undefined}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Client</Label>
        <ClientCombobox
          value={values.clientId}
          valueLabel={clientLabel}
          options={options.clients}
          onSelect={(option) => setValue('clientId', option.value)}
          modal
          disabled={pending}
          invalid={Boolean(issues.clientId)}
        />
        {issues.clientId && (
          <p role="alert" className="px-1 text-xs text-destructive">
            {issues.clientId}
          </p>
        )}
      </div>

      <ChipGroup
        legend="Category"
        options={options.categories.map((o) => ({
          slug: o.value,
          label: o.label,
        }))}
        value={values.categoryId}
        onChange={(next) => setValue('categoryId', next)}
        disabled={pending}
        error={issues.categoryId}
      />

      <ChipGroup
        legend="Assignee"
        options={options.assignees.map((o) => ({
          slug: o.value,
          label: o.label,
        }))}
        value={values.assigneeId}
        onChange={(next) => setValue('assigneeId', next)}
        disabled={pending}
        error={issues.assigneeId}
      />

      <ChipGroup
        legend="Priority"
        options={PRIORITY_OPTIONS}
        value={values.priority}
        onChange={(next) => setValue('priority', next)}
        disabled={pending}
      />

      <Field
        id="tpl-hours"
        label="Estimated time"
        error={issues.estimatedMinutes}
        hint="How long this work usually takes."
      >
        <DurationField
          id="tpl-hours"
          label="Estimated"
          minutes={values.estimatedMinutes}
          disabled={pending}
          invalid={issues.estimatedMinutes ? true : undefined}
          onChange={(next) => setValue('estimatedMinutes', next)}
        />
        <HoursQuickPicks
          className="mt-1.5"
          disabled={pending}
          onPick={(next) => setValue('estimatedMinutes', next)}
        />
      </Field>

      <ChipGroup
        legend="Repeat"
        options={REPEAT_OPTIONS}
        value={repeat}
        onChange={(next) => {
          setRepeat(next as TaskRepeatSlug);
          // Switching between weekly and monthly reinterprets the number, so
          // reset to a valid answer for the new mode rather than carrying a
          // weekday into a day-of-month field.
          setRepeatDay('1');
          setIssues(({ repeatDay: _cleared, ...rest }) => rest);
        }}
        disabled={pending}
      />

      {repeat !== 'none' && (
        <ChipGroup
          legend={repeat === 'weekly' ? 'On which day' : 'On which date'}
          options={repeat === 'weekly' ? WEEKDAY_OPTIONS : MONTH_DAY_OPTIONS}
          value={repeatDay}
          onChange={setRepeatDay}
          disabled={pending}
          error={issues.repeatDay}
        />
      )}

      <Field
        id="tpl-due-offset"
        label="Due after (days)"
        error={issues.dueOffsetDays}
        hint={
          dueOffset === ''
            ? 'Leave empty for no due date.'
            : `Due ${dueOffset === '0' ? 'the same day' : `${dueOffset} day${dueOffset === '1' ? '' : 's'} after`} it’s created.`
        }
      >
        <Input
          id="tpl-due-offset"
          type="number"
          min={0}
          max={365}
          value={dueOffset}
          onChange={(e) => setDueOffset(e.target.value)}
          placeholder="—"
          disabled={pending}
          aria-invalid={issues.dueOffsetDays ? true : undefined}
        />
      </Field>

      {repeat !== 'none' && (
        <p className="rounded-xl border border-foreground/10 px-3 py-2 text-xs text-muted-foreground">
          <GlassRim />
          {repeatLabel(repeat, Number(repeatDay))}
          {repeat === 'monthly' &&
            ` — the ${ordinal(Number(repeatDay))} of every month`}
          . A task appears that morning, already assigned.
        </p>
      )}

      <div className="mt-1 flex justify-end gap-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          disabled={pending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" size="small" shimmer={false} disabled={pending}>
          {pending ? 'Saving…' : template ? 'Save changes' : 'Save template'}
        </Button>
      </div>
    </form>
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
