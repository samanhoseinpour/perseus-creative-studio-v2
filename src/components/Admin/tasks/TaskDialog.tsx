'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
import {
  createTask,
  deleteTask,
  quickCreateClient,
  setTaskStatus,
  updateTask,
  type TaskMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  createTaskSchema,
  flattenTaskIssues,
  updateTaskSchema,
} from '@/lib/taskSchema';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  timeInputValue,
  parseHoursToMinutes,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import type { PickerOption, TaskFormOptions, TaskRowData } from './types';

const SERVER_ERROR: TaskMutationResult = { ok: false, error: 'server' };

const STATUS_OPTIONS = TASK_STATUS_SLUGS.map((slug) => ({
  slug,
  label: TASK_STATUS_LABELS[slug],
}));

// '' = no priority (the schema turns it into undefined → NULL).
const PRIORITY_OPTIONS = [
  { slug: '', label: 'None' },
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    slug: slug as string,
    label: TASK_PRIORITY_LABELS[slug],
  })),
];

// The Input primitive's look on a native textarea (ClientDialog's idiom).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

// InboxFilterBar's native date-input skin.
const dateInputClasses =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] disabled:cursor-not-allowed disabled:opacity-50';

const BLANK = {
  title: '',
  notes: '',
  clientId: '' as string | null, // null = untouched in create mode
  categoryId: '',
  assigneeId: '',
  priority: '',
  estHours: '',
  actualHours: '',
  startDate: '',
  dueDate: '',
  deliverableUrl: '',
};

/**
 * Create/edit form for one task (ClientDialog recipe: controlled state,
 * client-side zod safeParse, per-field issues, sonner toasts). No
 * router.refresh() on success: every task action ends in
 * revalidatePath('/admin', 'layout'), so the action response already carries
 * the re-rendered route — a refresh would render it a second time.
 * Status lives here too on edits — a change submits through setTaskStatus
 * AFTER updateTask, so →done still can't skip the actual-hours contract.
 */
export default function TaskDialog({
  open,
  onOpenChange,
  task,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  task: TaskRowData | null;
  options: TaskFormOptions;
}) {
  const [values, setValues] = useState(BLANK);
  const [status, setStatus] = useState<TaskStatusSlug>('todo');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Clients created inline this session — merged into the picker so the
   *  fresh option resolves before the next server re-seed. */
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);

  const editing = task !== null;

  // seededFor guard (ClientDialog): a server re-seed mid-edit swaps the row
  // object identity — don't let that clobber typed-but-unsaved values.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (task && seededFor.current === task.id) return;
    if (task) {
      seededFor.current = task.id;
      setValues({
        title: task.title,
        notes: task.notes,
        clientId: task.clientId, // '' = internal (an explicit choice on edits)
        categoryId: task.categoryId,
        // '' = the assignee's account was deleted (name snapshot remains).
        // NEVER substitute the viewer here: saving would silently reassign
        // the row — and its hours on past client reports — to the editor.
        assigneeId: task.assigneeId,
        priority: task.priority ?? '',
        estHours: timeInputValue(task.estimatedMinutes),
        actualHours: timeInputValue(task.actualMinutes),
        startDate: task.startDate,
        dueDate: task.dueDate,
        deliverableUrl: task.deliverableUrl,
      });
      setStatus(task.status);
    } else {
      setValues({ ...BLANK, clientId: null, assigneeId: options.viewer.id });
      setStatus('todo');
    }
    setIssues({});
  }, [open, task, options.viewer.id]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue<K extends keyof typeof BLANK>(
    key: K,
    value: (typeof BLANK)[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    const issueKey = key === 'estHours' ? 'estimatedMinutes' : key === 'actualHours' ? 'actualMinutes' : key;
    setIssues(({ [issueKey]: _cleared, ...rest }) => rest);
  }

  // Dedupe against the server list — after a refresh it already contains the
  // inline-created client (TaskBoard's boardOptions rule).
  const clientList = [
    ...options.clients,
    ...extraClients.filter(
      (extra) => !options.clients.some((c) => c.value === extra.value),
    ),
  ];
  const clientLabel =
    values.clientId === null || values.clientId === ''
      ? null
      : (clientList.find((o) => o.value === values.clientId)?.label ?? null);

  async function createClientInline(name: string): Promise<PickerOption | null> {
    let res: Awaited<ReturnType<typeof quickCreateClient>>;
    try {
      res = (await quickCreateClient({ name })) ?? { ok: false, error: 'server' };
    } catch {
      res = { ok: false, error: 'server' };
    }
    if (!res.ok) {
      toast.error(
        res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Could not create the client — try again.',
      );
      return null;
    }
    const option = { value: res.id, label: res.name };
    setExtraClients((list) => [...list, option]);
    return option;
  }

  // →done needs confirmed hours: prefer the actual field, fall back to the
  // estimate (mirroring the table's prefilled confirm).
  const becomingDone = editing && status === 'done' && task.status !== 'done';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const estimatedMinutes = parseHoursToMinutes(values.estHours);
    if (estimatedMinutes === null) {
      setIssues((i) => ({
        ...i,
        estimatedMinutes: 'Enter the estimated time — like 1.5 or 45m.',
      }));
      return;
    }
    let actualMinutes: number | undefined;
    if (values.actualHours.trim() !== '') {
      const parsed = parseHoursToMinutes(values.actualHours);
      if (parsed === null) {
        setIssues((i) => ({
          ...i,
          actualMinutes: 'Enter the time spent — like 1.5 or 45m.',
        }));
        return;
      }
      actualMinutes = parsed;
    }
    if (values.clientId === null) {
      setIssues((i) => ({
        ...i,
        clientId: 'Pick a client — or Internal for studio work.',
      }));
      return;
    }

    const input = {
      title: values.title,
      notes: values.notes,
      clientId: values.clientId, // '' → undefined via the schema transform
      categoryId: values.categoryId,
      // On edits, '' (deleted-account row, untouched) omits the field so the
      // server keeps the NULL id + name snapshot; create still requires one.
      assigneeId: editing ? values.assigneeId || undefined : values.assigneeId,
      priority: values.priority, // '' → undefined via the schema transform
      estimatedMinutes,
      startDate: values.startDate,
      dueDate: values.dueDate,
      deliverableUrl: values.deliverableUrl,
      ...(editing ? { actualMinutes } : {}),
    };
    const parsed = (editing ? updateTaskSchema : createTaskSchema).safeParse(input);
    if (!parsed.success) {
      setIssues(flattenTaskIssues(parsed.error));
      return;
    }

    setPending(true);
    let res: TaskMutationResult;
    try {
      res =
        (editing
          ? await updateTask(task.id, parsed.data)
          : await createTask(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }

    // Status is its own door — run it after the field save so →done carries
    // the confirmed hours and a reopen clears completedAt.
    if (res.ok && editing && status !== task.status) {
      const change =
        status === 'done'
          ? { status, actualMinutes: actualMinutes ?? estimatedMinutes }
          : { status };
      try {
        res = (await setTaskStatus(task.id, change)) ?? SERVER_ERROR;
      } catch {
        res = SERVER_ERROR;
      }
    }
    setPending(false);

    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong — try again.');
      return;
    }
    toast.success(editing ? 'Task saved.' : 'Task added.');
    onOpenChange(false);
  }

  async function onDelete() {
    if (!task) return;
    setDeleting(true);
    let res: Awaited<ReturnType<typeof deleteTask>>;
    try {
      res = (await deleteTask(task.id)) ?? {
        ok: false,
        error: 'Delete failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Delete failed — try again.' };
    }
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Task deleted.');
    onOpenChange(false);
  }

  return (
    <>
      <GlassDialog open={open} onOpenChange={close} maxWidth="30rem">
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          {editing ? 'Edit task' : 'New task'}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {editing
            ? 'Everything about this task — hours land on the client’s monthly report.'
            : 'Log a piece of work: what, for whom, and the estimated hours.'}
        </Dialog.Description>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <Field id="task-title" label="Title" error={issues.title}>
            <Input
              id="task-title"
              value={values.title}
              onChange={(e) => setValue('title', e.target.value)}
              placeholder="e.g. Edited the Samba youth-camp reel"
              autoComplete="off"
              disabled={pending}
              aria-invalid={issues.title ? true : undefined}
              aria-describedby={issues.title ? 'task-title-error' : undefined}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <Label>Client</Label>
            {/* modal: inside the modal dialog the popover needs its own
                scroll-lock scope or wheel events over the list are swallowed
                (the dialog's RemoveScroll only whitelists the dialog content,
                and the popover portals to document.body). */}
            <ClientCombobox
              value={values.clientId}
              valueLabel={clientLabel}
              options={clientList}
              onSelect={(option) => setValue('clientId', option.value)}
              onCreate={createClientInline}
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
            help={
              editing && !task.assigneeId && !values.assigneeId
                ? `Assigned to ${task.assigneeName} (account removed) — pick a member only to reassign.`
                : undefined
            }
          />

          <ChipGroup
            legend="Priority"
            options={PRIORITY_OPTIONS}
            value={values.priority}
            onChange={(next) => setValue('priority', next)}
            disabled={pending}
            error={issues.priority}
          />

          {editing && (
            <ChipGroup
              legend="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              disabled={pending}
              help={
                becomingDone
                  ? 'Marking done — confirm the actual hours below.'
                  : undefined
              }
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="task-est-hours"
              label="Estimated time"
              error={issues.estimatedMinutes}
            >
              <Input
                id="task-est-hours"
                value={values.estHours}
                onChange={(e) => setValue('estHours', e.target.value)}
                placeholder="e.g. 1.5h or 45m"
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.estimatedMinutes ? true : undefined}
              />
            </Field>
            <Field
              id="task-actual-hours"
              label="Actual time"
              error={issues.actualMinutes}
              hint={
                editing && (task.status === 'done' || becomingDone)
                  ? undefined
                  : 'Confirmed when the task is marked done.'
              }
            >
              <Input
                id="task-actual-hours"
                value={values.actualHours}
                onChange={(e) => setValue('actualHours', e.target.value)}
                placeholder={becomingDone ? values.estHours || 'e.g. 1.5h or 45m' : ''}
                autoComplete="off"
                // Enabled only where the server APPLIES it (done rows, or
                // ->done in this submit) — an always-on field silently
                // discarded typed values on not-done saves.
                disabled={
                  pending ||
                  !editing ||
                  (task.status !== 'done' && !becomingDone)
                }
                aria-invalid={issues.actualMinutes ? true : undefined}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="task-start"
              label="Start date"
              error={issues.startDate}
            >
              <input
                id="task-start"
                type="date"
                value={values.startDate}
                onChange={(e) => setValue('startDate', e.target.value)}
                disabled={pending}
                aria-invalid={issues.startDate ? true : undefined}
                className={dateInputClasses}
              />
            </Field>
            <Field id="task-due" label="Due date" error={issues.dueDate}>
              <input
                id="task-due"
                type="date"
                value={values.dueDate}
                onChange={(e) => setValue('dueDate', e.target.value)}
                disabled={pending}
                aria-invalid={issues.dueDate ? true : undefined}
                className={dateInputClasses}
              />
            </Field>
          </div>

          <Field
            id="task-deliverable"
            label="Deliverable link"
            error={issues.deliverableUrl}
          >
            <Input
              id="task-deliverable"
              type="url"
              value={values.deliverableUrl}
              onChange={(e) => setValue('deliverableUrl', e.target.value)}
              placeholder="https://…"
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              aria-invalid={issues.deliverableUrl ? true : undefined}
            />
          </Field>

          <Field
            id="task-notes"
            label="Description"
            error={issues.notes}
            hint="What this task covers — shown under the title in the list and in the internal CSV export; never sent to clients."
          >
            <textarea
              id="task-notes"
              rows={3}
              value={values.notes}
              onChange={(e) => setValue('notes', e.target.value)}
              disabled={pending}
              aria-invalid={issues.notes ? true : undefined}
              className={cn(textareaClasses, 'min-h-20')}
            />
          </Field>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending || deleting}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
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
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this task?"
        description="It disappears from the list and from any monthly report it was counted in. This can’t be undone."
        confirmLabel="Delete task"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
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
