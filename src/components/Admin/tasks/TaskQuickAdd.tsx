'use client';

import { useRef, useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import { LuCheck, LuChevronDown, LuPlus } from 'react-icons/lu';

import {
  createTask,
  createTaskFromTemplate,
  quickCreateClient,
  type TaskMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  formatMinutes,
  INTERNAL_CLIENT_LABEL,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  TIME_REQUIRED_ERROR,
} from '@/lib/taskFields';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import DatesCellPopover from './DatesCellPopover';
import DurationField from './DurationField';
import { dueDateLabel } from './format';
import { cellField, dropdownMenuContent, menuItem } from './menu';
import {
  clientHistoryKey,
  lookupEstimate,
  type PickerOption,
  type TaskFormOptions,
} from './types';

const SERVER_ERROR: TaskMutationResult = { ok: false, error: 'server' };

// '' = no priority (createTaskSchema turns it into undefined → NULL).
const PRIORITY_OPTIONS: PickerOption[] = [
  { value: '', label: 'None' },
  ...TASK_PRIORITY_SLUGS.map((slug) => ({
    value: slug as string,
    label: TASK_PRIORITY_LABELS[slug],
  })),
];

type Pending = { tempId: string; title: string; failed?: boolean };

/** The shared cell skin on a content-sized trigger: `cellField` fills its
 *  container, while these size to their label — the later `w-auto` is what
 *  tailwind-merge keeps. */
const triggerField =
  'inline-flex w-auto max-w-40 cursor-pointer items-center gap-1.5';

/** A template as the band's picker sees it: the option's label is the
 *  template's NAME (what you look for), while `taskTitle` is what the created
 *  task will be called (what the toast and pending chip must say). */
export type QuickTemplate = PickerOption & { taskTitle: string };

/**
 * The Telegram-speed entry row: title → client → category → hours, Enter.
 * Assignee defaults to the viewer. Submitting clears title + hours, RETAINS
 * client/category/assignee (batch entry: five tasks for one client in five
 * Enters), and refocuses the title synchronously — the action settles in the
 * background and a dimmed pending chip bridges the refresh. No success toast:
 * the row appearing is the feedback.
 */
export default function TaskQuickAdd({
  options,
  templates,
  todayKey,
}: {
  options: TaskFormOptions;
  /** Saved shapes, offered as a picker in the band — the fastest path for
   *  routine work is not typing it at all. Empty = the picker is skipped. */
  templates: QuickTemplate[];
  /** The render's Vancouver today — dueDateLabel's year-elision anchor. */
  todayKey: string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  /** Whether the member has typed in (or cleared) the hours field. Once true,
   *  no suggestion may touch it again — a default that fights a person is a
   *  bug, not a convenience. Reset on submit along with the field. */
  const hoursTouched = useRef(false);
  /** null = untouched; '' = Perseus (internal) chosen. */
  const [clientId, setClientId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState(options.viewer.id);
  const [priority, setPriority] = useState('');
  // Start defaults to today — the overwhelmingly common answer, and leaving
  // it blank is what had members typing the same date into both fields.
  // Due deliberately stays empty: it's a real decision, not a default.
  const [startDate, setStartDate] = useState(todayKey);
  const [dueDate, setDueDate] = useState('');
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);
  const [pendingRows, setPendingRows] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dedupe against the server list — after a refresh it already contains the
  // inline-created client (TaskBoard's boardOptions rule).
  const clientList = [
    ...options.clients,
    ...extraClients.filter(
      (extra) => !options.clients.some((c) => c.value === extra.value),
    ),
  ];
  const clientLabel =
    clientId === null || clientId === ''
      ? null
      : (clientList.find((o) => o.value === clientId)?.label ?? null);
  // clientLabel is null for BOTH "nothing picked yet" (null) and internal work
  // (''), so the trigger has to split them the way ClientCombobox's own default
  // trigger does — otherwise picking Perseus reads back as an empty field.
  const clientTriggerLabel =
    clientId === '' ? INTERNAL_CLIENT_LABEL : (clientLabel ?? 'Client');
  const categoryLabel =
    options.categories.find((o) => o.value === categoryId)?.label ?? null;
  const assigneeLabel =
    options.assignees.find((o) => o.value === assigneeId)?.label ??
    options.viewer.name;
  const priorityLabel =
    PRIORITY_OPTIONS.find((o) => o.value === priority && o.value !== '')
      ?.label ?? null;
  const estimate = lookupEstimate(options.estimates, clientId, categoryId);
  // Whether the field is still showing the suggestion, derived from the value
  // rather than read off the `hoursTouched` ref — refs may not be read during
  // render. Typing anything else hides the hint on its own, which is exactly
  // the behaviour the flag was standing in for.
  const showEstimateHint = estimate !== null && hours === estimate.minutes;

  /**
   * Fill the hours field from history, but only into an empty, untouched
   * field. Called after a client or category pick — those two together are
   * what identify "this kind of work", so the suggestion can only be made
   * once both are known.
   */
  function suggestHours(nextClientId: string | null, nextCategoryId: string) {
    if (hoursTouched.current) return;
    const hint = lookupEstimate(options.estimates, nextClientId, nextCategoryId);
    setHours(hint?.minutes ?? null);
  }

  /** Apply everything a client pick implies: the client itself, and the
   *  category it was last filed under when the member hasn't chosen one. */
  function pickClient(next: string | null) {
    setClientId(next);
    const historyKey = clientHistoryKey(next);
    const remembered = historyKey
      ? options.clientDefaults[historyKey]?.categoryId
      : undefined;
    // Only into an empty category — a remembered default must never override
    // a deliberate pick.
    const nextCategory =
      categoryId ||
      (remembered &&
      options.categories.some((option) => option.value === remembered)
        ? remembered
        : '');
    if (nextCategory !== categoryId) setCategoryId(nextCategory);
    suggestHours(next, nextCategory);
  }

  // Client-only label (renders after a pick, never at hydration) — safe to
  // format here despite format.ts's server-side default.
  const datesLabel = (() => {
    const s = startDate ? dueDateLabel(startDate, todayKey) : '';
    const d = dueDate ? dueDateLabel(dueDate, todayKey) : '';
    if (s && d) return `${s} → ${d}`;
    if (s) return `${s} →`;
    if (d) return `→ ${d}`;
    return null;
  })();

  /** Spawn straight from a saved shape — no fields to fill, so this bypasses
   *  the band's own form entirely and settles behind a pending chip like a
   *  normal add. */
  async function spawnFromTemplate(templateId: string) {
    const template = templates.find((t) => t.value === templateId);
    if (!template) return;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setError(null);
    setPendingRows((rows) => [...rows, { tempId, title: template.taskTitle }]);
    const res = await createTaskFromTemplate(templateId).catch(() => null);
    setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
    if (!res?.ok) {
      toast.error('Could not create the task — try again.');
      return;
    }
    toast.success(`Added “${template.taskTitle}”.`);
  }

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only OUR form creates a task. The band hosts popover editors that render
    // their own <form> in a portal, and React bubbles those submits up the
    // React tree to here — a stray one would create the task mid-edit, before
    // the editor's own commit had applied (the dateless-quick-add bug). The
    // editors stopPropagation too; this is the structural backstop.
    if (e.target !== e.currentTarget) return;
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      setError('Give the task a title.');
      titleRef.current?.focus();
      return;
    }
    if (clientId === null) {
      setError(`Pick a client — or ${INTERNAL_CLIENT_LABEL} for studio work.`);
      return;
    }
    if (!categoryId) {
      setError('Pick a category.');
      return;
    }
    if (hours === null) {
      setError(TIME_REQUIRED_ERROR);
      return;
    }
    const estimatedMinutes = hours;

    // Clear + refocus SYNCHRONOUSLY, then let the action settle behind a
    // dimmed pending chip — rapid entries must never wait on the network.
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setError(null);
    setTitle('');
    // Back to a suggestion for the retained client/category, not to blank —
    // batch entry of similar work should keep offering the same typical time.
    hoursTouched.current = false;
    const nextHint = lookupEstimate(options.estimates, clientId, categoryId);
    setHours(nextHint?.minutes ?? null);
    // Priority + due are per-task (unlike the retained client/category/
    // assignee batch context) — clear with the title. Start returns to today,
    // the default it was born with.
    setPriority('');
    setStartDate(todayKey);
    setDueDate('');
    setPendingRows((rows) => [...rows, { tempId, title: trimmed }]);
    titleRef.current?.focus();

    void (async () => {
      let res: TaskMutationResult;
      try {
        res =
          (await createTask({
            title: trimmed,
            clientId,
            categoryId,
            assigneeId,
            estimatedMinutes,
            // '' → undefined in the schema; the popover already enforced
            // start ≤ due, matching the server's cross-field refine.
            priority,
            startDate,
            dueDate,
          })) ?? SERVER_ERROR;
      } catch {
        res = SERVER_ERROR;
      }
      if (!res.ok) {
        // Restore the title into the input (unless newer typing arrived) so
        // nothing typed is ever lost.
        setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
        setTitle((current) => current || trimmed);
        toast.error(
          res.error === 'validation'
            ? Object.values(res.issues)[0]
            : 'Could not add the task — try again.',
        );
        return;
      }
      // No router.refresh(): createTask's revalidatePath('/admin', 'layout')
      // already returns the re-seeded route on the action response.
      setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
    })();
  }

  return (
    <div className="border-b border-white/40 dark:border-white/10">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4"
      >
        <LuPlus
          aria-hidden="true"
          className="hidden size-4 shrink-0 text-muted-foreground sm:block"
        />
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="Add a task — what did you work on?"
          aria-label="New task title"
          autoComplete="off"
          className={cn(cellField, 'w-full min-w-40 flex-1 basis-52')}
        />
        {templates.length > 0 && (
          <QuickSelect
            label="Template"
            value=""
            valueLabel={null}
            options={templates}
            onSelect={(v) => void spawnFromTemplate(v)}
          />
        )}
        {/* A `trigger`, like TaskRow passes for the table cell: without one
            ClientCombobox falls back to its default <Button variant="secondary">
            pill, which is right in the FILTER bar but wrong here — this is a row
            of fields, and Client was the lone pill among them. Same cellField
            skin the Category/Assignee/Priority pickers wear. */}
        <ClientCombobox
          value={clientId}
          valueLabel={clientLabel}
          options={clientList}
          onSelect={(option) => {
            pickClient(option.value);
            setError(null);
          }}
          onCreate={createClientInline}
          trigger={
            <button
              type="button"
              aria-label={`Client: ${clientTriggerLabel} — change`}
              className={cn(
                cellField,
                triggerField,
                clientId === null && 'text-muted-foreground',
              )}
            >
              <span className="truncate">{clientTriggerLabel}</span>
              <LuChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
            </button>
          }
        />
        <QuickSelect
          label="Category"
          value={categoryId}
          valueLabel={categoryLabel}
          options={options.categories}
          onSelect={(v) => {
            setCategoryId(v);
            suggestHours(clientId, v);
            setError(null);
          }}
        />
        <span
          className="w-36 shrink-0"
          title={
            showEstimateHint
              ? `Suggested from ${estimate.sample} similar tasks — edit freely`
              : undefined
          }
        >
          <DurationField
            id="quick-add-time"
            size="cell"
            label="Estimated"
            minutes={hours}
            onChange={(next) => {
              hoursTouched.current = true;
              setHours(next);
              setError(null);
            }}
          />
        </span>
        <QuickSelect
          label="Assignee"
          value={assigneeId}
          valueLabel={assigneeLabel}
          options={options.assignees}
          onSelect={setAssigneeId}
        />
        <QuickSelect
          label="Priority"
          value={priority}
          valueLabel={priorityLabel}
          options={PRIORITY_OPTIONS}
          onSelect={(v) => {
            setPriority(v);
            setError(null);
          }}
        />
        <DatesCellPopover
          startDate={startDate}
          dueDate={dueDate}
          todayKey={todayKey}
          ariaLabel={datesLabel ? `Dates: ${datesLabel} — edit` : 'Set dates'}
          onCommit={(patch) => {
            if (patch.startDate !== undefined)
              setStartDate(patch.startDate ?? '');
            if (patch.dueDate !== undefined) setDueDate(patch.dueDate ?? '');
            setError(null);
          }}
          triggerClassName={cn(
            cellField,
            triggerField,
            !datesLabel && 'text-muted-foreground',
          )}
          chevronClassName="size-3.5 shrink-0"
        >
          <span className="truncate tabular-nums">{datesLabel ?? 'Dates'}</span>
        </DatesCellPopover>
        {/* Real submit button so Enter works from every field AND there's a
            visible affordance; kept compact. */}
        <button
          type="submit"
          className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-foreground/10 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          Add
        </button>
      </form>
      {error ? (
        <p role="alert" className="px-4 pb-2 text-xs text-destructive sm:px-11">
          {error}
        </p>
      ) : (
        showEstimateHint && (
          // Says where the number came from, so a prefilled field reads as a
          // suggestion to confirm rather than a value someone else entered.
          <p className="px-4 pb-2 text-xs text-muted-foreground sm:px-11">
            Usually {formatMinutes(estimate.minutes)} — from {estimate.sample}{' '}
            similar task{estimate.sample === 1 ? '' : 's'}. Change it freely.
          </p>
        )
      )}
      {pendingRows.length > 0 && (
        <ul aria-live="polite" className="px-4 pb-2 sm:px-11">
          {pendingRows.map((row) => (
            <li
              key={row.tempId}
              className="animate-pulse truncate py-0.5 text-xs text-muted-foreground"
            >
              Saving “{row.title}”…
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact single-select for the quick-add band — FilterSelect's recipe with
 *  a quieter trigger that fits the input row. */
function QuickSelect({
  label,
  value,
  valueLabel,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  valueLabel: string | null;
  options: PickerOption[];
  onSelect: (value: string) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            cellField,
            triggerField,
            !valueLabel && 'text-muted-foreground',
          )}
        >
          {/* Assignee options carry a face — surface it on the trigger too. */}
          {active?.avatar !== undefined && (
            <AdminAvatar
              name={active.label}
              size={18}
              {...(active.avatar ?? {})}
            />
          )}
          <span className="truncate">{valueLabel ?? label}</span>
          <LuChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          {/* RadioGroup so AT hears the current pick (aria-checked); the
              check/spacer pair keeps alignment (CellSelectMenu rule). */}
          <DropdownMenu.RadioGroup value={value}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(menuItem, 'text-foreground')}
                onSelect={() => onSelect(option.value)}
              >
                {option.value === value ? (
                  <LuCheck aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                {option.avatar !== undefined && (
                  <AdminAvatar
                    name={option.label}
                    size={20}
                    {...(option.avatar ?? {})}
                  />
                )}
                <span className="truncate">{option.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
