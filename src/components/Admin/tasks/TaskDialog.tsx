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
  formatMinutes,
  INTERNAL_CLIENT_LABEL,
  TIME_CLEARED_ERROR,
  TIME_REQUIRED_ERROR,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import TagPicker from './TagPicker';
import TaskTagChip from './TaskTagChip';
import DurationField from './DurationField';
import TaskActivity from './TaskActivity';
import {
  clientHistoryKey,
  lookupEstimate,
  type PickerOption,
  type TaskFormOptions,
  type TaskRowData,
} from './types';

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
  estimatedMinutes: null as number | null,
  actualMinutes: null as number | null,
  startDate: '',
  dueDate: '',
  deliverableUrl: '',
  tagIds: [] as string[],
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
  todayKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  task: TaskRowData | null;
  options: TaskFormOptions;
  /** The render's Vancouver today — the create-mode start-date default. */
  todayKey: string;
}) {
  const [values, setValues] = useState(BLANK);
  /** Suggestions fill the estimate only while it's untouched (quick-add's
   *  rule). Reset whenever the dialog re-seeds. */
  const estimateTouched = useRef(false);
  const [status, setStatus] = useState<TaskStatusSlug>('todo');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Clients created inline this session — merged into the picker so the
   *  fresh option resolves before the next server re-seed. */
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);

  const editing = task !== null;

  // Resolved from the vocabulary, not from task.tags: the picker edits ids,
  // and a freshly ticked tag has to render its chip before any server round
  // trip. Order follows the vocabulary so chips read like the picker.
  const selectedTags = options.tags.filter((t) => values.tagIds.includes(t.id));

  // seededFor guard (ClientDialog): a server re-seed mid-edit swaps the row
  // object identity — don't let that clobber typed-but-unsaved values.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (task && seededFor.current === task.id) return;
    // An edit seeds real values; a create starts with nothing typed, so a
    // suggestion is free to fill the estimate until the member touches it.
    estimateTouched.current = task !== null;
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
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
        startDate: task.startDate,
        dueDate: task.dueDate,
        deliverableUrl: task.deliverableUrl,
        tagIds: task.tags.map((t) => t.id),
      });
      setStatus(task.status);
    } else {
      // Start date defaults to today (quick-add's rule); due stays empty —
      // it's a decision, not a default, and pre-filling both is what produced
      // a backlog of tasks whose start and due dates were the same day.
      setValues({
        ...BLANK,
        clientId: null,
        assigneeId: options.viewer.id,
        startDate: todayKey,
      });
      setStatus('todo');
    }
    setIssues({});
  }, [open, task, options.viewer.id, todayKey]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue<K extends keyof typeof BLANK>(
    key: K,
    value: (typeof BLANK)[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues(({ [key]: _cleared, ...rest }) => rest);
  }

  /**
   * Prefill the estimate from history — create mode only, and only while the
   * field is untouched. On an EDIT the estimate is a real saved value; a
   * suggestion overwriting it would silently rewrite the row's hours.
   */
  function suggestEstimate(nextClientId: string | null, nextCategoryId: string) {
    if (editing || estimateTouched.current) return;
    const hint = lookupEstimate(
      options.estimates,
      nextClientId,
      nextCategoryId,
    );
    setValue('estimatedMinutes', hint?.minutes ?? null);
  }

  /** A client pick also carries the category that client's work usually goes
   *  under — into an EMPTY category only, never over a deliberate choice. */
  function pickClient(next: string | null) {
    setValue('clientId', next);
    if (editing) return;
    const historyKey = clientHistoryKey(next);
    const remembered = historyKey
      ? options.clientDefaults[historyKey]?.categoryId
      : undefined;
    const nextCategory =
      values.categoryId ||
      (remembered &&
      options.categories.some((option) => option.value === remembered)
        ? remembered
        : '');
    if (nextCategory !== values.categoryId) setValue('categoryId', nextCategory);
    suggestEstimate(next, nextCategory);
  }

  // Create mode only: on an edit the estimate is a saved value, and calling
  // it "usual" would suggest the row is showing a suggestion. Shown only while
  // the field still holds that suggestion — derived from the value rather than
  // read off `estimateTouched` (refs may not be read during render), which
  // also means typing anything else dismisses the hint on its own.
  const estimateHint = editing
    ? null
    : lookupEstimate(options.estimates, values.clientId, values.categoryId);
  const showEstimateHint =
    estimateHint !== null && values.estimatedMinutes === estimateHint.minutes;

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

  // Hours are confirmed when work finishes: →needs_approval (and a →done that
  // still lacks them) prefers the actual field, falling back to the estimate
  // (mirroring the table's prefilled confirm).
  const becomingDone = editing && status === 'done' && task.status !== 'done';
  const becomingApproval =
    editing && status === 'needs_approval' && task.status !== 'needs_approval';
  // Where the server APPLIES actualMinutes — drives the Actual field.
  const actualEnabled =
    editing &&
    (task.status === 'done' ||
      task.status === 'needs_approval' ||
      becomingDone ||
      becomingApproval);
  // Create mode offers the same control as a shortcut for "add it, then move
  // it" — the two calls a member makes by hand today. There is deliberately no
  // Actual field on a create (one time entry is enough for work being logged
  // after the fact), so the estimate IS the confirmed figure.
  const creatingWithHours =
    !editing && (status === 'done' || status === 'needs_approval');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const estimatedMinutes = values.estimatedMinutes;
    if (estimatedMinutes === null) {
      setIssues((i) => ({ ...i, estimatedMinutes: TIME_REQUIRED_ERROR }));
      return;
    }
    let actualMinutes: number | undefined;
    if (values.actualMinutes === null) {
      // Emptying the field looked like it saved (the server just ignores an
      // absent value) — say what TimeCellPopover says instead: confirmed
      // hours are correctable, not clearable.
      if (actualEnabled && task?.actualMinutes != null) {
        setIssues((i) => ({ ...i, actualMinutes: TIME_CLEARED_ERROR }));
        return;
      }
    } else {
      actualMinutes = values.actualMinutes;
    }
    if (values.clientId === null) {
      setIssues((i) => ({
        ...i,
        clientId: `Pick a client — or ${INTERNAL_CLIENT_LABEL} for studio work.`,
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
      // Always sent from here (even empty): this form OWNS the task's tags,
      // so an emptied picker has to clear them. Callers with no tag UI omit
      // the key instead, which the server reads as "leave them alone".
      tagIds: values.tagIds,
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

    // Status is its own door — run it after the field save so →needs_approval
    // carries the confirmed hours, →done keeps them (server coalesce), and a
    // reopen clears completedAt. A create runs the SAME door against the fresh
    // id rather than widening createTaskSchema: setTaskStatus stays the only
    // writer of completedAt and of the `status` event, so a task logged as done
    // still lands on a real month and still says how it got there.
    // Captured BEFORE the status door can overwrite `res`: if the door fails
    // after a create, the task exists and pressing Add again would duplicate
    // it — so that case must not fall through to the retry-able error path.
    const createdId = !editing && res.ok ? res.id : null;

    if (res.ok && (editing ? status !== task.status : status !== 'todo')) {
      const targetId = res.id;
      const change =
        status === 'needs_approval'
          ? {
              status,
              // Same order as the table's door: an explicit entry wins, else
              // hours already logged (a reopened task keeps them), else the
              // estimate — clearing the field must not downgrade a confirmed
              // actual to the estimate. A create has only the estimate.
              actualMinutes:
                actualMinutes ?? task?.actualMinutes ?? estimatedMinutes,
            }
          : status === 'done'
            ? {
                status,
                ...(actualMinutes !== undefined ? { actualMinutes } : {}),
              }
            : { status };
      try {
        res = (await setTaskStatus(targetId, change)) ?? SERVER_ERROR;
      } catch {
        res = SERVER_ERROR;
      }
    }
    setPending(false);

    if (!res.ok) {
      if (createdId) {
        toast.error(
          'Task added, but the status didn’t stick — set it from the row.',
        );
        onOpenChange(false);
        return;
      }
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
    // Same wording AND same dedupe channel as the row-menu delete
    // (TaskBoard's confirmDelete) — one action shouldn't announce itself two
    // different ways depending on which door the member used.
    toast('Task deleted.', { id: 'task-delete' });
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
              onSelect={(option) => pickClient(option.value)}
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
            onChange={(next) => {
              setValue('categoryId', next);
              suggestEstimate(values.clientId, next);
            }}
            disabled={pending}
            error={issues.categoryId}
          />

          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap items-center gap-2">
              {/* modal, for the same reason ClientCombobox above is: this
                  popover portals to document.body and the dialog's
                  scroll-lock would otherwise swallow its wheel events. */}
              <TagPicker
                tags={options.tags}
                categoryId={values.categoryId}
                value={values.tagIds}
                onChange={(next) => setValue('tagIds', next)}
                modal
                disabled={pending}
                placeholder="Add tags"
              />
              {/* The chips repeat the selection outside the popover so the
                  choice is legible with the picker closed. */}
              {selectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setValue(
                      'tagIds',
                      values.tagIds.filter((id) => id !== tag.id),
                    )
                  }
                  aria-label={`Remove ${tag.name}`}
                  className="cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                >
                  <TaskTagChip tag={tag} />
                </button>
              ))}
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              Optional. The list follows the category above.
            </p>
            {issues.tagIds && (
              <p role="alert" className="px-1 text-xs text-destructive">
                {issues.tagIds}
              </p>
            )}
          </div>

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

          <ChipGroup
            legend="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            disabled={pending}
            help={
              becomingDone
                ? 'Marking done — confirm the actual hours below.'
                : becomingApproval
                  ? 'Sending for approval — confirm the actual hours below.'
                  : creatingWithHours
                    ? 'Added as “To do”, then moved — the time above is recorded as the hours spent.'
                    : undefined
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="task-est-hours"
              label="Estimated time"
              error={issues.estimatedMinutes}
              hint={
                showEstimateHint
                  ? `Usually ${formatMinutes(estimateHint.minutes)} for this kind of work — from ${estimateHint.sample} similar task${estimateHint.sample === 1 ? '' : 's'}. Change it freely.`
                  : creatingWithHours
                    ? 'The time this took — it’s recorded as the hours spent.'
                    : 'Your best guess — you’ll confirm the real time when the work wraps.'
              }
            >
              <DurationField
                id="task-est-hours"
                label="Estimated"
                minutes={values.estimatedMinutes}
                disabled={pending}
                invalid={issues.estimatedMinutes ? true : undefined}
                describedBy={
                  issues.estimatedMinutes ? 'task-est-hours-error' : undefined
                }
                onChange={(next) => {
                  estimateTouched.current = true;
                  setValue('estimatedMinutes', next);
                }}
              />
            </Field>
            <Field
              id="task-actual-hours"
              label="Actual time"
              error={issues.actualMinutes}
              hint={
                actualEnabled
                  ? 'The time actually spent on this task.'
                  : 'Confirmed when the task is sent for approval or marked done.'
              }
            >
              <DurationField
                id="task-actual-hours"
                label="Actual"
                minutes={values.actualMinutes}
                // Enabled only where the server APPLIES it (done/needs_approval
                // rows, or a move to either in this submit) — an always-on
                // field silently discarded typed values on other saves.
                disabled={pending || !actualEnabled}
                invalid={issues.actualMinutes ? true : undefined}
                describedBy={
                  issues.actualMinutes ? 'task-actual-hours-error' : undefined
                }
                onChange={(next) => setValue('actualMinutes', next)}
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

        {/* Key-remounted per task so feed/composer state can't leak across
            rows (the dialog itself is reused). Outside the task <form> —
            the composer is its own form. */}
        {editing && <TaskActivity key={task.id} taskId={task.id} open={open} />}
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
