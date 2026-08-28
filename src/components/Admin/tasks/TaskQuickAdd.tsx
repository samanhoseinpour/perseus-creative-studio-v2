'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  LuCheck,
  LuChevronDown,
  LuCornerDownRight,
  LuPlus,
  LuX,
} from 'react-icons/lu';

import {
  createTask,
  createTaskFromTemplate,
  findSimilarTasks,
  quickCreateClient,
  setTaskStatus,
  type SimilarTask,
  type TaskMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  formatMinutes,
  INTERNAL_CLIENT_LABEL,
  normalizeTaskTitle,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_SLUGS,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
  TIME_REQUIRED_ERROR,
} from '@/lib/taskFields';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { assigneeSummary } from '@/lib/taskAssigneeFields';
import { tagInScope, tagSummaryLabel } from '@/lib/taskTagFields';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { adminLink, GlassRim } from '@/components/Admin/Glass';
import { useFocusOnMount } from '@/hooks/useSearchFocus';
import { cn } from '@/lib/utils';
import AssigneeCellMenu from './AssigneeCellMenu';
import { AssigneeStrip } from './AssigneeStrip';
import ClientCombobox from './ClientCombobox';
import CompletedCellPopover from './CompletedCellPopover';
import DatesCellPopover from './DatesCellPopover';
import DurationField from './DurationField';
import { dueDateLabel } from './format';
import { cellField, dropdownMenuContent, menuItem } from './menu';
import TagPicker from './TagPicker';
import {
  clientHistoryKey,
  lookupEstimate,
  type PickerOption,
  type TaskFormOptions,
} from './types';

const SERVER_ERROR: TaskMutationResult = { ok: false, error: 'server' };

// The three real levels only. "No priority" is the menu's CLEAR row, not a
// fourth option — it was a radio item indistinguishable from a level, which is
// why members read the field as unclearable even though it worked. Same shape
// as the row cell's TaskPriorityMenu. '' is still the empty value in state
// (createTaskSchema turns it into undefined → NULL).
const PRIORITY_OPTIONS: PickerOption[] = TASK_PRIORITY_SLUGS.map((slug) => ({
  value: slug as string,
  label: TASK_PRIORITY_LABELS[slug],
}));

/** Every task is born 'todo' server-side; picking anything else here runs the
 *  status door straight after the create — the two steps a member does by hand
 *  when they log work that is already finished. */
const STATUS_OPTIONS: PickerOption[] = TASK_STATUS_SLUGS.map((slug) => ({
  value: slug,
  label: TASK_STATUS_LABELS[slug],
}));

type Pending = { tempId: string; title: string; failed?: boolean };

/**
 * Ties the phone's chevron to the fields it discloses. The wrapper it names is
 * `sm:contents`, which dissolves it at every width that fits the band on one
 * or two rows — so the desktop form keeps flowing every field in a single wrap
 * context, exactly as it did before the disclosure existed. A real nested flex
 * item there would have taken its own line.
 */
const QUICK_ADD_FIELDS_ID = 'quick-add-fields';

/** The shared cell skin on a content-sized trigger: `cellField` fills its
 *  container, while these size to their label — the later `w-auto` is what
 *  tailwind-merge keeps. */
const triggerField =
  'inline-flex w-auto max-w-40 cursor-pointer items-center gap-1.5';

/** The fields a submitted add leaves filled on purpose. Tags belong here
 *  with the other batch context: logging five reels for one client should not
 *  mean re-picking "Reels · Vertical" five times. */
type CarriedField = 'client' | 'category' | 'assignee' | 'tags';

/** Stable identity for "nothing is carried" — a fresh Set() per render would
 *  re-run every consumer's memo for no change. */
const NOTHING_CARRIED: ReadonlySet<CarriedField> = new Set();

/** A field the last add left filled. One step up from glassField's own wash
 *  (`bg-foreground/[0.04]`) rather than a new colour: this has to read as
 *  "held over", not as "selected" or "invalid". glassField already carries
 *  transition-colors, so it eases in as the add lands. */
const carriedField = 'border-foreground/30 bg-foreground/[0.10]';

/** A template as the band's picker sees it: the option's label is the
 *  template's NAME (what you look for), while `taskTitle` is what the created
 *  task will be called (what the toast and pending chip must say). */
export type QuickTemplate = PickerOption & { taskTitle: string };

/**
 * The Telegram-speed entry row: title → client → category → hours, Enter.
 * Assignee defaults to the viewer. Submitting clears title + hours, RETAINS
 * client/category/assignee (batch entry: five tasks for one client in five
 * Enters), and refocuses the title synchronously — the action settles in the
 * background and a dimmed pending chip bridges the refresh.
 *
 * Those three retained fields are MARKED once an add lands (`carried`) and
 * named in the line under the band, with a Clear beside them. Retention that
 * says nothing about itself is indistinguishable from a form that failed to
 * reset — which is exactly how it was read before the marking existed.
 *
 * The row appearing used to be the only feedback, and it isn't enough: the new
 * task is off-screen whenever the active tab, a filter, a grouping or page 2
 * excludes it, and a vanishing pending chip is then the whole story. So an add
 * also toasts its title and flashes its row through `onCreated`.
 */
export default function TaskQuickAdd({
  options,
  templates,
  todayKey,
  onCreated,
  autoFocus = true,
}: {
  options: TaskFormOptions;
  /** Saved shapes, offered as a picker in the band — the fastest path for
   *  routine work is not typing it at all. Empty = the picker is skipped. */
  templates: QuickTemplate[];
  /** The render's today in the READER's zone — the start-date default and
   *  dueDateLabel's year-elision anchor. */
  todayKey: string;
  /** Fired with the new task's id once the server confirms it, so the board can
   *  flash the row when it arrives. Never fired on failure. */
  onCreated?: (id: string) => void;
  /** Take the caret on arrival. False when the board is opening a ?task=
   *  dialog, or when the member landed mid-search and the filter box is the
   *  honest target instead. */
  autoFocus?: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  // "Add a task" is the reason most members open this screen, so the caret
  // starts here rather than in the filter box above it.
  useFocusOnMount(titleRef, autoFocus);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  /** Whether the member has typed in (or cleared) the hours field. Once true,
   *  no suggestion may touch it again — a default that fights a person is a
   *  bug, not a convenience. Reset on submit along with the field. */
  const hoursTouched = useRef(false);
  /** null = untouched; '' = Perseus (internal) chosen. */
  const [clientId, setClientId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  // Defaults to just the viewer — logging your own work is the common case,
  // and a crew is added on the rare shoot rather than picked every time.
  const [assigneeIds, setAssigneeIds] = useState<string[]>([
    options.viewer.id,
  ]);
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState<TaskStatusSlug>('todo');
  // Start defaults to today — the overwhelmingly common answer, and leaving
  // it blank is what had members typing the same date into both fields.
  // Due deliberately stays empty: it's a real decision, not a default.
  const [startDate, setStartDate] = useState(todayKey);
  const [dueDate, setDueDate] = useState('');
  /** The day a Done pick files under. Only shown, and only sent, while the
   *  status IS done — every other status leaves completedAt null. */
  const [completedOn, setCompletedOn] = useState(todayKey);
  /** Once the member has set the day themselves, no prefill may move it — the
   *  hoursTouched rule. Reset on submit along with the field. */
  const completedTouched = useRef(false);
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);
  const [pendingRows, setPendingRows] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** Which fields the last add left filled. Marked all three on submit,
   *  dropped one at a time as the member re-decides them. */
  const [carried, setCarried] =
    useState<ReadonlySet<CarriedField>>(NOTHING_CARRIED);
  /** Phone disclosure — see {@link QUICK_ADD_FIELDS_ID}. Starts CLOSED so the
   *  board is readable on arrival, and re-opens the moment the title takes
   *  focus. That second half is load-bearing, not polish: client, category and
   *  an estimate are all REQUIRED by onSubmit, so a band that stayed closed
   *  while you typed would answer Add with an error naming a field you cannot
   *  see. Closed serves READING the board; the first touch of writing a task
   *  is what opens it, which is why this is not a plain toggle. */
  const [fieldsOpen, setFieldsOpen] = useState(false);

  /**
   * The duplicate check: work for this client whose title describes the same
   * thing as what is being typed.
   *
   * `dismissed` is keyed on the normalised title, not a bare boolean, so
   * "It's separate" silences THIS title and a genuinely new one still gets
   * checked. `linkTo` is the parent a member accepted — it survives until the
   * task is added or the title changes underneath it.
   */
  /** Results are stored WITH the title they answer, so a reply that lands
   *  after the member has typed on cannot be shown against the new text. */
  const [similar, setSimilar] = useState<{ key: string; rows: SimilarTask[] }>({
    key: '',
    rows: [],
  });
  const [dismissed, setDismissed] = useState<string>('');
  const [linkTo, setLinkTo] = useState<SimilarTask | null>(null);
  /** Whether logging this revision also closes the round it replaces. Ticked
   *  by default, and never offered for a parent that is already done — see
   *  TaskDialog's completeParent for why that exclusion is load-bearing. */
  const [completeParent, setCompleteParent] = useState(true);

  const titleKey = normalizeTaskTitle(title);
  // A picked client is required before asking: the same title for two clients
  // is two different jobs, and an unscoped check would suggest constantly.
  const canCheckSimilar = clientId !== null && titleKey.length >= 4;

  useEffect(() => {
    // No synchronous reset on the way out — staleness is handled by the key
    // the result carries, and clearing state in an effect body is the
    // cascading-render pattern the lint rule is about.
    if (!canCheckSimilar) return;
    let cancelled = false;
    // Debounced so a fast typist costs one round trip, not twenty. The
    // suggestion is never awaited by anything — Add stays instant whether or
    // not this has come back.
    const timer = setTimeout(() => {
      void findSimilarTasks({ title, clientId })
        .then((rows) => {
          if (!cancelled) setSimilar({ key: titleKey, rows });
        })
        // A failed suggestion is silence, never a toast: it is help nobody
        // asked for, and an error about it would be pure noise mid-typing.
        .catch(() => {
          if (!cancelled) setSimilar({ key: titleKey, rows: [] });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, titleKey, clientId, canCheckSimilar]);

  // The one suggestion worth showing — derived, never stored: it must vanish
  // the instant the title changes, without waiting for the next round trip.
  const suggestion =
    canCheckSimilar && similar.key === titleKey && !linkTo && dismissed !== titleKey
      ? (similar.rows[0] ?? null)
      : null;

  /** Drop one field's carry-over mark — the member has chosen it themselves
   *  now, so it is no longer inherited. The other two stay marked. */
  function unmark(field: CarriedField) {
    setCarried((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next.size === 0 ? NOTHING_CARRIED : next;
    });
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
  const quickTagNames = options.tags
    .filter((t) => tagIds.includes(t.id))
    .map((t) => t.name);
  const assigneeLabel =
    assigneeIds.length === 0
      ? options.viewer.name
      : assigneeSummary(
          assigneeIds.map((id) => ({
            id,
            name:
              options.assignees.find((o) => o.value === id)?.label ??
              options.viewer.name,
          })),
        );
  /** The band's born state: only you. Drives the dirty check and the "you"
   *  shorthand on the carried-fields line. */
  const soloViewer =
    assigneeIds.length === 1 && assigneeIds[0] === options.viewer.id;
  const priorityLabel =
    PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? null;
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

  /**
   * The day a Done pick should file under, given the dates in the band.
   *
   * Deliberately NOT `dueDate`: a due date is a COMMITMENT, not evidence of
   * when the work finished, and filing a late delivery under it would quietly
   * mark it on time on the internal report. A start-only task is the opposite
   * case — it is quick-add's default shape and what a backfilled log entry
   * looks like, so the day the member typed is the best evidence there is.
   * Clamped, because a task may legitimately be planned to start tomorrow.
   */
  function completionSeed(nextStart: string, nextDue: string): string {
    if (nextDue) return todayKey;
    if (!nextStart || nextStart > todayKey) return todayKey;
    return nextStart;
  }

  /** Re-derive the completion day unless the member has set it themselves. */
  function suggestCompletion(nextStart: string, nextDue: string) {
    if (completedTouched.current) return;
    setCompletedOn(completionSeed(nextStart, nextDue));
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
    if (nextCategory !== categoryId) {
      setCategoryId(nextCategory);
      // The pick moved the category too (a remembered default), so that value
      // is freshly derived rather than held over from the last add.
      unmark('category');
    }
    unmark('client');
    suggestHours(next, nextCategory);
  }

  /** Blank the whole band, batch context included — the Clear button and the
   *  second stage of Escape. */
  function resetBand() {
    setTitle('');
    setClientId(null);
    setCategoryId('');
    setTagIds([]);
    setAssigneeIds([options.viewer.id]);
    hoursTouched.current = false;
    setHours(null);
    setPriority('');
    setStatus('todo');
    setStartDate(todayKey);
    setDueDate('');
    completedTouched.current = false;
    setCompletedOn(todayKey);
    setCarried(NOTHING_CARRIED);
    setError(null);
    titleRef.current?.focus();
  }

  /**
   * Anything the member would want undone in one go — Escape's second stage
   * and the Clear link's condition, derived once so the two can't disagree.
   *
   * Assignee, status and start were missing from the old inline copy, which
   * made an Escape that had only changed the member fall through to blur().
   * And Clear used to hang off `carried`, i.e. off a SUCCESSFUL SUBMIT — so
   * the way out of a mis-picked field was absent at exactly the moment it was
   * first needed, which is what sent members to the reload button.
   */
  const dirty =
    title !== '' ||
    clientId !== null ||
    categoryId !== '' ||
    tagIds.length > 0 ||
    hours !== null ||
    priority !== '' ||
    !soloViewer ||
    status !== 'todo' ||
    startDate !== todayKey ||
    dueDate !== '' ||
    carried.size > 0;

  /** Escape in two stages — the typed title first, the batch context only once
   *  there's nothing left to lose (a search field's grammar). Radix menus
   *  portal to <body>, so their own Escape closes the menu and never reaches
   *  this handler: anything arriving here is aimed at the band. */
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Escape') return;
    if (title) {
      e.preventDefault();
      setTitle('');
      setError(null);
      return;
    }
    if (dirty) {
      e.preventDefault();
      resetBand();
      return;
    }
    // Third stage: nothing left to clear, so hand the keyboard back — the
    // table's j/k/x/z shortcuts all skip events raised inside an input, and
    // the band now takes focus on arrival. Blur the EVENT TARGET, not the
    // title: this handler sits on the <form>, so Escape can arrive from the
    // duration field or a date input too.
    e.preventDefault();
    (e.target as HTMLElement | null)?.blur();
  }

  /** What the carry-over line names, in field order. "you" rather than the
   *  member's own name — this is their band. */
  const carriedLabels = [
    carried.has('client') ? clientTriggerLabel : null,
    carried.has('category') ? categoryLabel : null,
    carried.has('assignee') ? (soloViewer ? 'you' : assigneeLabel) : null,
    carried.has('tags') && quickTagNames.length > 0
      ? quickTagNames.join(' · ')
      : null,
  ].filter((v): v is string => Boolean(v));

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

  // Client-only, like datesLabel above — the chip renders after a pick, never
  // at hydration, so format.ts's server-side default doesn't apply.
  const completedLabel = completedOn
    ? dueDateLabel(completedOn, todayKey)
    : '—';

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
      toast.error('Could not create the task. Try again.');
      return;
    }
    toast.success(`Added “${template.taskTitle}”.`, { id: 'task-create' });
    onCreated?.(res.id);
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
          : 'Could not create the client. Try again.',
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
      setError(`Pick a client, or ${INTERNAL_CLIENT_LABEL} for studio work.`);
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
    // Read before the synchronous reset below wipes them.
    const chosenStatus = status;
    const chosenCompletedOn = completedOn;

    // Clear + refocus SYNCHRONOUSLY, then let the action settle behind a
    // dimmed pending chip — rapid entries must never wait on the network.
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Read BEFORE the reset: the create call below runs after this function
    // returns, so reading `linkTo` from there would see the cleared state and
    // silently drop the link the member accepted.
    const revisionParentId = linkTo?.id ?? null;
    // Same capture, same reason: read before the reset clears `linkTo`.
    const closeParent = Boolean(linkTo && !linkTo.isDone && completeParent);
    setError(null);
    setTitle('');
    // Per-task, like priority and due: the next row is a different piece of
    // work until the member says otherwise. The dismissal goes too, so the
    // same title typed again is checked again.
    setLinkTo(null);
    setDismissed('');
    setSimilar({ key: '', rows: [] });
    // Back to a suggestion for the retained client/category, not to blank —
    // batch entry of similar work should keep offering the same typical time.
    hoursTouched.current = false;
    const nextHint = lookupEstimate(options.estimates, clientId, categoryId);
    setHours(nextHint?.minutes ?? null);
    // Priority + due are per-task (unlike the retained client/category/
    // assignee batch context) — clear with the title. Start returns to today,
    // the default it was born with.
    setPriority('');
    setStatus('todo');
    setStartDate(todayKey);
    setDueDate('');
    completedTouched.current = false;
    setCompletedOn(todayKey);
    // Client/category/assignee survive on purpose (batch entry). Say so on the
    // fields themselves — until this mark existed, the only honest reading of
    // three still-filled inputs was that the form hadn't reset.
    setCarried(
      new Set<CarriedField>(
        tagIds.length > 0
          ? ['client', 'category', 'assignee', 'tags']
          : ['client', 'category', 'assignee'],
      ),
    );
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
            assigneeIds,
            estimatedMinutes,
            // '' → undefined in the schema; the popover already enforced
            // start ≤ due, matching the server's cross-field refine.
            priority,
            startDate,
            dueDate,
            tagIds,
            // Captured before the reset below cleared it, so a fast second
            // add can't inherit the previous row's parent.
            ...(revisionParentId ? { parentTaskId: revisionParentId } : {}),
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
            : 'Could not add the task. Try again.',
        );
        return;
      }
      // Status is its own door (setTaskStatus owns completedAt and the hours
      // coalesce) — so a non-todo pick is a second call, not a wider create.
      // The task already exists at this point: a failure here is reported and
      // left alone, never retried, or the member gets two rows.
      if (chosenStatus !== 'todo') {
        let moved: TaskMutationResult;
        try {
          moved =
            (await setTaskStatus(
              res.id,
              chosenStatus === 'needs_approval'
                ? // The schema requires a figure and a create has no Actual
                  // field — the estimate is the honest one.
                  { status: chosenStatus, actualMinutes: estimatedMinutes }
                : // 'done' → the server coalesces actual ?? estimate, and
                  // files it under the day shown on the band's Done chip
                  // (today's own key reads as "now" server-side).
                  { status: chosenStatus, completedOn: chosenCompletedOn },
            )) ?? SERVER_ERROR;
        } catch {
          moved = SERVER_ERROR;
        }
        if (!moved.ok) {
          setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
          toast.error(
            `Added “${trimmed}”, but the status didn’t stick. Set it from the row.`,
          );
          onCreated?.(res.id);
          return;
        }
      }
      // The round is logged, so the round it replaces is finished. Never
      // allowed to fail the add: the revision is what the member came to
      // record, and an original left open is one click from its own row.
      if (closeParent && revisionParentId) {
        try {
          const done = await setTaskStatus(revisionParentId, { status: 'done' });
          if (!done?.ok) {
            toast('Revision added, but marking the original done didn’t stick.');
          }
        } catch {
          toast('Revision added, but marking the original done didn’t stick.');
        }
      }
      // No router.refresh(): createTask's revalidatePath('/admin', 'layout')
      // already returns the re-seeded route on the action response.
      setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
      // One dedupe channel for both add paths, so eight fast entries leave one
      // toast rather than a stack the member has to read through.
      toast.success(`Added “${trimmed}”.`, { id: 'task-create' });
      onCreated?.(res.id);
    })();
  }

  return (
    <div className="border-b border-white/40 dark:border-white/10">
      <form
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
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
          // Opens the phone's field row — see `fieldsOpen`. Unconditional: at
          // sm+ the wrapper is `contents` whatever this says, so there is no
          // width test to keep in sync with the breakpoint.
          onFocus={() => setFieldsOpen(true)}
          placeholder="Add a task: what did you work on?"
          aria-label="New task title"
          autoComplete="off"
          className={cn(cellField, 'w-full min-w-40 flex-1 basis-52')}
        />
        {/* Phone only: fold the fields back down to read the board. Mostly the
            CLOSING half of the pair — focusing the title already opens them —
            so it carries no visible label and lets `aria-expanded` say which
            way it points, per the APG disclosure pattern (a name that changes
            with state double-speaks against the state AT already announces).
            32px square to keep the band's row rhythm: every control in here is
            an h-8 cell, and one 44px outlier would read as a mistake. */}
        <button
          type="button"
          onClick={() => setFieldsOpen((open) => !open)}
          aria-expanded={fieldsOpen}
          aria-controls={QUICK_ADD_FIELDS_ID}
          aria-label="More task fields"
          className={cn(
            cellField,
            'inline-flex w-8 shrink-0 items-center justify-center px-0 text-muted-foreground sm:hidden',
          )}
        >
          <LuChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
              fieldsOpen && 'rotate-180',
            )}
          />
        </button>
        <div
          id={QUICK_ADD_FIELDS_ID}
          className={cn(
            'flex w-full flex-wrap items-center gap-2 sm:contents',
            !fieldsOpen && 'max-sm:hidden',
          )}
        >
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
            onClear={() => {
              setClientId(null);
              unmark('client');
              setError(null);
            }}
            trigger={
              <button
                type="button"
                aria-label={`Client: ${clientTriggerLabel}${
                  carried.has('client') ? ' (kept from your last task)' : ''
                }. Change`}
                className={cn(
                  cellField,
                  triggerField,
                  clientId === null && 'text-muted-foreground',
                  carried.has('client') && carriedField,
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
            carried={carried.has('category')}
            options={options.categories}
            onSelect={(v) => {
              setCategoryId(v);
              // Tags follow the category, so a carried set from the LAST add
              // can strand tags the new category doesn't offer. Drop those and
              // keep the rest — clearing all of them would defeat the carry.
              setTagIds((current) =>
                current.filter((id) => {
                  const tag = options.tags.find((t) => t.id === id);
                  return tag ? tagInScope(tag, v) : false;
                }),
              );
              unmark('category');
              suggestHours(clientId, v);
              setError(null);
            }}
            clearLabel="No category"
            onClear={() => {
              setCategoryId('');
              // With no category only the global tags are still in scope; the
              // rest would be invisible in the picker but still submitted.
              setTagIds((current) =>
                current.filter((id) => {
                  const tag = options.tags.find((t) => t.id === id);
                  return tag ? tagInScope(tag, '') : false;
                }),
              );
              unmark('category');
              setError(null);
            }}
          />
          <TagPicker
            tags={options.tags}
            types={options.tagTypes}
            categoryId={categoryId}
            value={tagIds}
            onChange={(next) => {
              setTagIds(next);
              unmark('tags');
              setError(null);
            }}
            trigger={
              <button
                type="button"
                aria-label={
                  tagIds.length > 0
                    ? `Tags: ${quickTagNames.join(', ')}. Change`
                    : 'Add tags'
                }
                className={cn(
                  cellField,
                  triggerField,
                  carried.has('tags') && carriedField,
                  tagIds.length === 0 && 'text-muted-foreground',
                )}
              >
                <span className="truncate">
                  {tagSummaryLabel(quickTagNames, 'Tags')}
                </span>
                <LuChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
              </button>
            }
          />
          <span
            className="w-36 shrink-0"
            title={
              showEstimateHint
                ? `Suggested from ${estimate.sample} similar tasks. Edit freely`
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
          {/* The board's Member menu wearing the band's field skin — one
              multi-select, one set of rules (silent cap, never empty), rather
              than a second picker that could drift from it. There is no
              "clear" row: a task always has someone on it, so the way back to
              the default is to untick everyone but yourself. */}
          <AssigneeCellMenu
            ariaLabel={`Assignees: ${assigneeLabel}${
              carried.has('assignee') ? ' (kept from your last task)' : ''
            }. Change`}
            values={assigneeIds}
            options={options.assignees}
            onChange={(next) => {
              setAssigneeIds(next);
              unmark('assignee');
            }}
            triggerClassName={cn(
              cellField,
              triggerField,
              carried.has('assignee') && carriedField,
            )}
            chevronClassName="size-3.5 shrink-0"
          >
            <AssigneeStrip
              assignees={assigneeIds.map((id) => {
                const option = options.assignees.find((o) => o.value === id);
                return {
                  id,
                  name: option?.label ?? options.viewer.name,
                  avatar: option?.avatar ?? null,
                };
              })}
            />
          </AssigneeCellMenu>
          <QuickSelect
            label="Priority"
            value={priority}
            valueLabel={priorityLabel}
            options={PRIORITY_OPTIONS}
            onSelect={(v) => {
              setPriority(v);
              setError(null);
            }}
            clearLabel="No priority"
            onClear={() => {
              setPriority('');
              setError(null);
            }}
          />
          {/* Always shows its value rather than the field name (unlike every
              other picker here, which falls back to its label when unset): a
              task is never statusless, so there is no clear row either — what
              the member needs to see is where this one is about to land. */}
          <QuickSelect
            label="Status"
            value={status}
            valueLabel={TASK_STATUS_LABELS[status]}
            options={STATUS_OPTIONS}
            onSelect={(v) => {
              setStatus(v as TaskStatusSlug);
              // Picking Done is when the day first becomes visible, so seed it
              // from the dates as they stand right now.
              if (v === 'done') suggestCompletion(startDate, dueDate);
              setError(null);
            }}
          />
          <DatesCellPopover
            startDate={startDate}
            dueDate={dueDate}
            todayKey={todayKey}
            ariaLabel={datesLabel ? `Dates: ${datesLabel}. Edit` : 'Set dates'}
            onCommit={(patch) => {
              const nextStart =
                patch.startDate === undefined
                  ? startDate
                  : (patch.startDate ?? '');
              const nextDue =
                patch.dueDate === undefined ? dueDate : (patch.dueDate ?? '');
              if (patch.startDate !== undefined) setStartDate(nextStart);
              if (patch.dueDate !== undefined) setDueDate(nextDue);
              // The dates are the evidence the completion day is derived from,
              // so moving them re-derives it — until the member sets it.
              suggestCompletion(nextStart, nextDue);
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
          {/* Only while the pick IS Done — every other status leaves completedAt
              null, so the field would be asking for a value the server discards.
              Its own chip rather than a third field inside the dates popover:
              start/due are columns on the create, this is the status door's
              argument, and the two must not share one commit. */}
          {status === 'done' && (
            <CompletedCellPopover
              completedDate={completedOn}
              todayKey={todayKey}
              ariaLabel={`Completed ${completedLabel}. Change`}
              onCommit={(next) => {
                completedTouched.current = true;
                setCompletedOn(next);
                setError(null);
              }}
              triggerClassName={cn(cellField, triggerField)}
              chevronClassName="size-3.5 shrink-0"
            >
              <span className="truncate tabular-nums">
                Done {completedLabel}
              </span>
            </CompletedCellPopover>
          )}
        </div>
        {/* Real submit button so Enter works from every field AND there's a
            visible affordance; kept compact. Outside the disclosure on
            purpose: a phone shows [title][⌄][Add] while collapsed, so the band
            still reads as something you can complete. */}
        <button
          type="submit"
          className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-foreground/10 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          Add
        </button>
      </form>
      {/* The duplicate guard. Sits directly under the band because it is about
          the title just typed, and above the "kept from your last task" line
          because it is the more urgent of the two.

          Never blocks: Add stays live throughout, and both buttons are ways
          of ANSWERING rather than of getting past a gate. 22 titles on the
          live board are duplicated within one client, and every one of them
          was typed by someone who knew about the original — this is the only
          moment where saying so costs nothing. */}
      {(suggestion || linkTo) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-2 text-xs sm:px-11">
          <LuCornerDownRight
            aria-hidden="true"
            className="size-3 shrink-0 text-muted-foreground"
          />
          {linkTo ? (
            <>
              <span className="text-muted-foreground">
                Logging this as a revision of{' '}
                <span className="font-medium text-foreground">
                  {linkTo.title}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setLinkTo(null)}
                aria-label="Don't log this as a revision"
                className="inline-flex cursor-pointer items-center gap-0.5 text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                <LuX aria-hidden="true" className="size-3" />
                Undo
              </button>
              {/* Once a round two exists, round one is finished — the same
                  default the full dialog uses, so the two doors agree. Absent
                  for a parent already done, where firing it would restamp its
                  completion day into this month. */}
              {!linkTo.isDone && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={completeParent}
                    onChange={(e) => setCompleteParent(e.target.checked)}
                    className="size-3.5 cursor-pointer accent-foreground"
                  />
                  mark it done
                </label>
              )}
            </>
          ) : (
            suggestion && (
              <>
                <span className="text-muted-foreground">
                  Looks like{' '}
                  <span className="font-medium text-foreground">
                    {suggestion.title}
                  </span>{' '}
                  ({suggestion.stateLabel})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLinkTo(suggestion);
                    setCompleteParent(true);
                  }}
                  className={cn(adminLink, 'cursor-pointer font-medium text-foreground')}
                >
                  Log as a revision
                </button>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <button
                  type="button"
                  // Keyed on the normalised title, so this silences THIS
                  // title rather than the feature — retype something else and
                  // the check runs again.
                  onClick={() => setDismissed(titleKey)}
                  className="cursor-pointer text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  It&rsquo;s separate
                </button>
              </>
            )
          )}
        </p>
      )}
      {error ? (
        <p role="alert" className="px-4 pb-2 text-xs text-destructive sm:px-11">
          {error}
        </p>
      ) : dirty || showEstimateHint ? (
        // One line, three jobs, in priority order: name what the last add kept
        // (retention that says nothing about itself reads as a form that
        // failed to reset), say where a prefilled estimate came from, and
        // offer the way out. The sentence ABSORBS the estimate hint rather
        // than stacking a second line of small print — the hours field is
        // prefilled at exactly this moment and still has to read as a
        // suggestion to confirm.
        //
        // The Clear button hangs off `dirty`, NOT off `carried`: it used to
        // appear only after a successful submit, so the way out of a
        // mis-picked client was missing at precisely the moment it was first
        // wanted.
        <p className="flex flex-wrap items-center gap-x-1.5 px-4 pb-2 text-xs text-muted-foreground sm:px-11">
          {carriedLabels.length > 0 ? (
            <span>
              Kept from your last task: {carriedLabels.join(' · ')}
              {showEstimateHint
                ? `. Usually ${formatMinutes(estimate.minutes)}, change it freely.`
                : '.'}
            </span>
          ) : showEstimateHint ? (
            <span>
              Usually {formatMinutes(estimate.minutes)}, from {estimate.sample}{' '}
              similar task{estimate.sample === 1 ? '' : 's'}. Change it freely.
            </span>
          ) : null}
          {dirty && (
            <button
              type="button"
              onClick={resetBand}
              className={cn(adminLink, 'cursor-pointer text-foreground')}
            >
              Clear
            </button>
          )}
        </p>
      ) : null}
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
 *  a quieter trigger that fits the input row.
 *
 *  `clearLabel`/`onClear` add TaskPriorityMenu's clear item: a plain action row
 *  below the group, bordered and muted because it UNSETS rather than being one
 *  more thing to choose. Without it a mis-picked category or member could only
 *  be changed, never emptied — the options array holds real values only, so
 *  there was structurally nowhere for "none" to live, and reloading the page
 *  was the workaround members actually used. */
function QuickSelect({
  label,
  value,
  valueLabel,
  carried,
  options,
  onSelect,
  clearLabel,
  onClear,
}: {
  label: string;
  value: string;
  valueLabel: string | null;
  /** Held over from the last add — painted, and said out loud for AT. */
  carried?: boolean;
  options: PickerOption[];
  onSelect: (value: string) => void;
  /** Copy for the unset row; omit (with onClear) on a field that is never
   *  empty, like Status. */
  clearLabel?: string;
  /** Called only when the row is offered and picked. */
  onClear?: () => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${valueLabel ?? 'not set'}${
            carried ? ' (kept from your last task)' : ''
          }. Change`}
          className={cn(
            cellField,
            triggerField,
            !valueLabel && 'text-muted-foreground',
            carried && carriedField,
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
                // Re-picking the current value is a no-op, matching
                // CellSelectMenu — the two menus had drifted.
                onSelect={() => {
                  if (option.value !== value) onSelect(option.value);
                }}
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
          {clearLabel && onClear && valueLabel && (
            <DropdownMenu.Item
              className={cn(
                menuItem,
                'border-t border-white/40 text-muted-foreground dark:border-white/10',
              )}
              onSelect={onClear}
            >
              <span className="size-3.5 shrink-0" aria-hidden="true" />
              {clearLabel}
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
