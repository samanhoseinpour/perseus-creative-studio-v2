'use client';

import { useRef, useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import { LuCheck, LuChevronDown, LuPlus } from 'react-icons/lu';

import {
  createTask,
  quickCreateClient,
  type TaskMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  parseHoursToMinutes,
  INTERNAL_CLIENT_LABEL,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
} from '@/lib/taskFields';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import ClientCombobox from './ClientCombobox';
import DatesCellPopover from './DatesCellPopover';
import { dueDateLabel } from './format';
import HoursQuickPicks from './HoursQuickPicks';
import { dropdownMenuContent, menuItem } from './menu';
import type { PickerOption, TaskFormOptions } from './types';

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

const fieldClasses =
  'h-8 rounded-lg border border-white/50 bg-white/40 px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30';

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
  todayKey,
}: {
  options: TaskFormOptions;
  /** The render's Vancouver today — dueDateLabel's year-elision anchor. */
  todayKey: string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  /** null = untouched; '' = Perseus (internal) chosen. */
  const [clientId, setClientId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [assigneeId, setAssigneeId] = useState(options.viewer.id);
  const [priority, setPriority] = useState('');
  const [startDate, setStartDate] = useState('');
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
  const categoryLabel =
    options.categories.find((o) => o.value === categoryId)?.label ?? null;
  const assigneeLabel =
    options.assignees.find((o) => o.value === assigneeId)?.label ??
    options.viewer.name;
  const priorityLabel =
    PRIORITY_OPTIONS.find((o) => o.value === priority && o.value !== '')
      ?.label ?? null;
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
    const estimatedMinutes = parseHoursToMinutes(hours);
    if (estimatedMinutes === null) {
      setError('Estimated time — like 1.5 or 45m.');
      return;
    }

    // Clear + refocus SYNCHRONOUSLY, then let the action settle behind a
    // dimmed pending chip — rapid entries must never wait on the network.
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setError(null);
    setTitle('');
    setHours('');
    // Priority + dates are per-task (unlike the retained client/category/
    // assignee batch context) — clear with the title.
    setPriority('');
    setStartDate('');
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
          className={cn(fieldClasses, 'w-full min-w-40 flex-1 basis-52')}
        />
        <ClientCombobox
          value={clientId}
          valueLabel={clientLabel}
          options={clientList}
          onSelect={(option) => {
            setClientId(option.value);
            setError(null);
          }}
          onCreate={createClientInline}
        />
        <QuickSelect
          label="Category"
          value={categoryId}
          valueLabel={categoryLabel}
          options={options.categories}
          onSelect={(v) => {
            setCategoryId(v);
            setError(null);
          }}
        />
        <input
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            setError(null);
          }}
          placeholder="1.5h or 45m"
          aria-label="Estimated time"
          autoComplete="off"
          className={cn(fieldClasses, 'w-24 text-right tabular-nums')}
        />
        {/* lg-only: five chips would crowd the wrap on narrow panels. */}
        <HoursQuickPicks
          compact
          className="hidden lg:flex"
          onPick={(v) => {
            setHours(v);
            setError(null);
          }}
        />
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
          ariaLabel={datesLabel ? `Dates: ${datesLabel} — edit` : 'Set dates'}
          onCommit={(patch) => {
            if (patch.startDate !== undefined)
              setStartDate(patch.startDate ?? '');
            if (patch.dueDate !== undefined) setDueDate(patch.dueDate ?? '');
            setError(null);
          }}
          triggerClassName={cn(
            fieldClasses,
            'inline-flex max-w-40 cursor-pointer items-center gap-1.5',
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
      {error && (
        <p role="alert" className="px-4 pb-2 text-xs text-destructive sm:px-11">
          {error}
        </p>
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
            fieldClasses,
            'inline-flex max-w-40 cursor-pointer items-center gap-1.5',
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
