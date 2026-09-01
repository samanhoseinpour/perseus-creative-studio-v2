'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  bulkDeleteTasks,
  bulkPatchTasks,
  deleteTask,
  duplicateTask,
  patchTask,
  quickCreateClient,
  setTaskStatus,
  setTaskAssignees,
  setTaskTags,
  setTasksStatusBulk,
  setTasksAssigneesBulk,
  setTasksTagsBulk,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  TASK_STATUS_LABELS,
  formatMinutes,
  isShipped,
  nextStage,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  TASK_VIEW_STATUSES,
  type TaskGroupBy,
  type TaskView,
} from '@/lib/taskFilters';
import type { TaskTagChipData } from '@/lib/taskTagFields';
import { shiftDayKey } from '@/lib/calendar';
import { getPageNumbers } from '@/utils/pagination';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { adminLink, glassRowHover } from '@/components/Admin/Glass';
import { EDITABLE_TARGET } from '@/hooks/useSearchFocus';
import { cn } from '@/lib/utils';
import ClientMark from './ClientMark';
import CompleteTaskDialog from './CompleteTaskDialog';
import { dueDateLabel } from './format';
import { safeTaskAction } from './safeTaskAction';
import SelectAllCheckbox from './SelectAllCheckbox';
import TaskBulkBar from './TaskBulkBar';
import TaskDialog from './TaskDialog';
import TaskTemplatesDialog, {
  seedFromTask,
  type TemplateItem,
  type TemplateSeed,
} from './TaskTemplatesDialog';
import Kbd from '@/components/Admin/Kbd';
import TaskQuickAdd, { type QuickTemplate } from './TaskQuickAdd';
import TaskCardList from './TaskCardList';
import TaskRow from './TaskRow';
import TaskShortcutsDialog from './TaskShortcutsDialog';
import type {
  PickerOption,
  RowAssignee,
  RowGroup,
  TaskCellPatch,
  TaskFormOptions,
  TaskRowData,
} from './types';

type LastAction = {
  id: string;
  prevStatus: TaskStatusSlug;
  nextStatus: TaskStatusSlug;
  index: number;
  removed: boolean;
  row: TaskRowData;
};

const HEADER_CELL =
  'px-0 pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground';

/**
 * Deadline-pressure sections for `?group=due` — the "my day" cut. Bucketing
 * is a lexical compare on the reader's day keys, the same rule that stamps
 * `dueState` server-side, so a row's section and its tint can never disagree.
 * A done row is never overdue (its deadline stopped mattering when it landed).
 */
const DUE_BUCKET_ORDER = [
  'overdue',
  'today',
  'week',
  'later',
  'none',
] as const;
type DueBucket = (typeof DUE_BUCKET_ORDER)[number];

const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'This week',
  later: 'Later',
  none: 'No due date',
};

function dueBucket(row: TaskRowData, todayKey: string): DueBucket {
  if (!row.dueDate) return 'none';
  if (isShipped(row.status)) return 'later';
  if (row.dueDate < todayKey) return 'overdue';
  if (row.dueDate === todayKey) return 'today';
  // Seven days out, matching the `due=week` filter window exactly.
  return row.dueDate < shiftDayKey(todayKey, 7) ? 'week' : 'later';
}

/** "3 tasks · est 4 h · logged 2 h" — group headers and the page totals. */
function taskTally(rows: TaskRowData[]): string {
  const est = rows.reduce((sum, r) => sum + r.estimatedMinutes, 0);
  const logged = rows.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0);
  return `${rows.length} task${rows.length === 1 ? '' : 's'} · est ${formatMinutes(
    est,
  )}${logged > 0 ? ` · logged ${formatMinutes(logged)}` : ''}`;
}

/**
 * The whole interactive task surface: quick-add band, bulk bar, the table
 * with its keyboard cursor (j/k/x/Enter/o/d/z/Esc), optimistic status moves
 * with single-level undo, the done-confirm, and the edit dialog. Rows are
 * handed down fully formed by the server page; the refs-not-closures
 * machinery is InboxKeyboardList's, cloned deliberately (generalizing it
 * would thread key maps and row renderers through props — worse than the
 * duplication; TicketTabs precedent).
 */
export default function TaskBoard({
  rows: propRows,
  view,
  basePath,
  page,
  totalPages,
  filterQs,
  openTask = null,
  formOptions,
  templates,
  todayKey,
  group = '',
  empty,
  quickAddAutoFocus = true,
  pastMonth = false,
  monthLabel = '',
  currentMonthHref = '',
  currentMonthLabel = '',
}: {
  rows: TaskRowData[];
  view: TaskView;
  basePath: string;
  page: number;
  totalPages: number;
  /** Canonical qs incl. status + filters, excl. page (taskListQs). */
  filterQs: string;
  /** Server-resolved ?task=<id> deep-link row (the ⌘K palette's door into
   *  the edit dialog) — opened once by the effect below, or null. */
  openTask?: TaskRowData | null;
  formOptions: TaskFormOptions;
  /** Saved task shapes — the row menu's "Save as template" opens the manager
   *  prefilled, so the list must already be here. */
  templates: TemplateItem[];
  /** The render's YYYY-MM-DD in the READER's zone — optimistic date-cell
   *  recompute. */
  todayKey: string;
  /** Section the table by client/member (URL `group` param) — partitioned
   *  from the LIVE row state so optimistic edits move rows immediately. */
  group?: TaskGroupBy;
  /** Server-rendered <TasksEmpty> for the zero-rows case. */
  empty: React.ReactNode;
  /** Whether the quick-add band claims the caret on arrival. */
  quickAddAutoFocus?: boolean;
  /** The board is showing a month the reader has already left. A new task is
   *  OPEN, so it belongs to the current month and would vanish from the board
   *  it was typed into — the band is replaced by a note that says where to go
   *  instead, and the bulk bar drops the moves that would silently evacuate a
   *  row out of the month being read. */
  pastMonth?: boolean;
  /** The month in scope, "July 2026". Empty at All time. */
  monthLabel?: string;
  currentMonthHref?: string;
  currentMonthLabel?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<TaskRowData[]>(propRows);
  const [selected, setSelected] = useState(0);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [editing, setEditing] = useState<TaskRowData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  /** The task an "Add revision" is hanging off — create mode, so `editing`
   *  is null and this seeds the form instead. */
  const [revisionOf, setRevisionOf] = useState<TaskRowData | null>(null);
  // The row only — NEVER a positional index: the list can re-seed while the
  // confirm dialog is open (background quick-add settle, a teammate's edit),
  // and a stale index would mark whatever row now sits there as done. `to`
  // records which transition the hours dialog fronts (done vs needs_approval).
  const [completing, setCompleting] = useState<{
    row: TaskRowData;
    to: TaskStatusSlug;
  } | null>(null);
  const [deleting, setDeleting] = useState<TaskRowData | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  /** Clients created inline from a CELL's combobox — merged into the option
   *  set the rows see, so the fresh pick resolves before the server re-seed
   *  lands (TaskDialog/TaskQuickAdd keep their own equivalents). */
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);
  /** The templates manager, opened from a row's "Save as template" with that
   *  row's shape as the seed (null = opened from the header, list first). */
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** The task the quick-add band just created, so its row can flash once the
   *  revalidated list brings it in. Cleared on a timer rather than by the row
   *  itself: a task that doesn't match the current tab or filters never
   *  arrives, and the flag must not outlive the animation either way. */
  const [flashId, setFlashId] = useState<string | null>(null);
  const [templateSeed, setTemplateSeed] = useState<TemplateSeed | null>(null);
  const lastAction = useRef<LastAction | null>(null);
  const selectedRef = useRef<HTMLTableRowElement>(null);

  // Authoritative values for the once-bound window listener (see
  // InboxKeyboardList for the full rationale): refs written synchronously,
  // state mirrors them for painting.
  const rowsRef = useRef(rows);
  const selectedIndexRef = useRef(selected);
  const checkedRef = useRef(checkedIds);
  // Written from an effect (never render — the react-hooks/refs rule): the
  // window keydown listener must stand down while a dialog owns the keyboard.
  const overlayOpenRef = useRef(false);
  useEffect(() => {
    overlayOpenRef.current =
      editOpen ||
      completing !== null ||
      deleting !== null ||
      bulkDeleting ||
      templatesOpen ||
      shortcutsOpen;
  }, [
    editOpen,
    completing,
    deleting,
    bulkDeleting,
    templatesOpen,
    shortcutsOpen,
  ]);

  useEffect(() => {
    if (!flashId) return;
    // Slightly longer than the 2.2s animation so the class is never pulled
    // mid-fade, which would snap the wash away instead of letting it settle.
    const timer = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timer);
  }, [flashId]);

  const handleCreated = useCallback((id: string) => setFlashId(id), []);

  const commitRows = useCallback((next: TaskRowData[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);
  const commitSelected = useCallback((next: number) => {
    selectedIndexRef.current = next;
    setSelected(next);
  }, []);
  const commitChecked = useCallback((next: ReadonlySet<string>) => {
    checkedRef.current = next;
    setCheckedIds(next);
  }, []);

  // Re-seed from the server on every new list. Server truth arrives on the
  // action POST itself — every task action ends in revalidatePath('/admin',
  // 'layout'), which piggybacks the re-rendered route on the action response —
  // so success paths must NOT also call router.refresh(): that renders the
  // identical tree a second time (~10 more Neon round trips per edit).
  // Selection INTERSECTS rather than clears: re-seeds fire after every inline
  // patch and background quick-add settle, where the checked rows still exist
  // and the selection is still meaningful — rows that left the list drop out,
  // and a page/tab/filter change (disjoint id sets) still comes out empty.
  useEffect(() => {
    commitRows(propRows);
    commitSelected(
      Math.min(selectedIndexRef.current, Math.max(0, propRows.length - 1)),
    );
    commitChecked(
      new Set(
        propRows
          .filter((r) => checkedRef.current.has(r.id))
          .map((r) => r.id),
      ),
    );
  }, [propRows, commitRows, commitSelected, commitChecked]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // The ?task= deep link: open the dialog once per arriving id, then strip
  // the param straight away — the filter bar rewrites this URL constantly
  // (taskListQs never carries `task`), and a revalidation re-render with the
  // param still present would reopen a dialog the user just closed. The ref
  // guards re-runs before the replace lands, and RESETS once the strip does
  // (openTask back to null) — without the reset, re-picking the SAME task
  // from the palette would silently no-op and leave ?task= stuck in the URL.
  const consumedOpenId = useRef<string | null>(null);
  useEffect(() => {
    if (!openTask) {
      consumedOpenId.current = null;
      return;
    }
    if (consumedOpenId.current === openTask.id) return;
    consumedOpenId.current = openTask.id;
    setEditing(openTask);
    setEditOpen(true);
    router.replace(`${basePath}${filterQs ? `?${filterQs}` : ''}`, {
      scroll: false,
    });
  }, [openTask, basePath, filterQs, router]);

  const toggleChecked = useCallback(
    (id: string) => {
      const next = new Set(checkedRef.current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commitChecked(next);
    },
    [commitChecked],
  );

  const checkedVisible = rows.filter((r) => checkedIds.has(r.id));
  const allChecked = rows.length > 0 && checkedVisible.length === rows.length;

  const toggleAll = useCallback(() => {
    const current = rowsRef.current;
    const visible = current.filter((r) => checkedRef.current.has(r.id));
    commitChecked(
      current.length > 0 && visible.length === current.length
        ? new Set()
        : new Set(current.map((r) => r.id)),
    );
  }, [commitChecked]);

  const undo = useCallback(async () => {
    const act = lastAction.current;
    if (!act) return;
    lastAction.current = null;

    const current = rowsRef.current;
    if (act.removed) {
      // Guard against a re-seed having already restored the row (the splice
      // would otherwise insert a duplicate id → duplicate React keys).
      if (!current.some((r) => r.id === act.id)) {
        const copy = current.slice();
        copy.splice(Math.min(act.index, copy.length), 0, {
          ...act.row,
          status: act.prevStatus,
        });
        commitRows(copy);
      }
    } else {
      commitRows(
        current.map((r) =>
          r.id === act.id ? { ...r, status: act.prevStatus } : r,
        ),
      );
    }

    // Undoing back INTO a shipped status or needs_approval must re-carry the
    // hours (the status door requires them); the stored row still has them.
    const change =
      isShipped(act.prevStatus) || act.prevStatus === 'needs_approval'
        ? {
            status: act.prevStatus,
            actualMinutes: act.row.actualMinutes ?? act.row.estimatedMinutes,
            // Undoing back into a shipped status RESTORES the original day
            // rather than re-stamping today: the snapshot still carries it, and
            // without this an undone reopen silently migrates the task into
            // this month's report (which is what the apology below covers).
            ...(isShipped(act.prevStatus) && act.row.completedDate
              ? { completedOn: act.row.completedDate }
              : {}),
          }
        : { status: act.prevStatus };
    const res = await safeTaskAction(setTaskStatus(act.id, change));
    if (!res.ok) {
      const latest = rowsRef.current;
      if (act.removed) {
        commitRows(latest.filter((r) => r.id !== act.id));
      } else {
        commitRows(
          latest.map((r) =>
            r.id === act.id ? { ...r, status: act.nextStatus } : r,
          ),
        );
      }
      if (!lastAction.current) lastAction.current = act;
      toast.error('Undo failed. Try again.');
      return;
    }
    // Undoing a reopen re-completes the task, and the change above re-files it
    // under the day it originally landed — so this really is a restore. Only
    // the pre-completedOn case (a snapshot with no day on it) still moves the
    // task into this month, and only that case gets the warning.
    if (isShipped(act.prevStatus)) {
      toast(
        act.row.completedDate
          ? 'Restored, back in its original month.'
          : 'Completed again. It now counts toward this month.',
        { id: 'task-status' },
      );
    }
  }, [commitRows]);

  // Resolves the row BY ID at call time — callers must never hand this a
  // positional index, which can go stale across the awaits and re-seeds
  // (the wrong-task-marked-done class of bug).
  const runMove = useCallback(
    async (
      id: string,
      next: TaskStatusSlug,
      label: string,
      actualMinutes?: number,
      /** The day a shipped move files under. Absent means "now" on →done and
       *  "keep the date it already has" on →delivered / →posted. Only the
       *  confirm dialog and undo supply it — the fast paths let the server
       *  decide. */
      completedOn?: string,
    ) => {
      const current = rowsRef.current;
      const index = current.findIndex((r) => r.id === id);
      const row = index === -1 ? undefined : current[index];
      if (!row || row.status === next) return;
      const prevStatus = row.status;
      const removes = !TASK_VIEW_STATUSES[view].includes(next);
      // The hours this move confirms, mirroring the server: an explicit
      // confirm wins, else the already-logged actual, else the estimate. The
      // overlay must carry them — a row still reading "no hours" during the
      // round trip makes an immediately-following →done re-prompt and
      // overwrite what was just confirmed.
      const confirmedMinutes =
        isShipped(next) || next === 'needs_approval'
          ? (actualMinutes ?? row.actualMinutes ?? row.estimatedMinutes)
          : undefined;

      if (removes) {
        commitRows(current.filter((r) => r.id !== row.id));
        commitSelected(Math.min(index, Math.max(0, current.length - 2)));
      } else {
        commitRows(
          current.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: next,
                  ...(confirmedMinutes !== undefined
                    ? { actualMinutes: confirmedMinutes }
                    : {}),
                  // On a view that KEEPS the row (All), a backdated completion
                  // would otherwise show yesterday's label until the re-seed.
                  // Same formatter the server uses in toRowData, so the
                  // optimistic label cannot disagree with the real one.
                  ...(isShipped(next) && completedOn
                    ? {
                        completedDate: completedOn,
                        completedLabel: dueDateLabel(completedOn, todayKey),
                      }
                    : {}),
                }
              : r,
          ),
        );
      }
      lastAction.current = {
        id: row.id,
        prevStatus,
        nextStatus: next,
        index,
        removed: removes,
        row,
      };

      // Shipped moves all take the same shape. completedOn is sent only when a
      // caller supplied one: on →delivered / →posted an ABSENT day is what
      // tells the server to preserve the date the work actually shipped on,
      // so the fast paths must never fill one in.
      const change = isShipped(next)
        ? {
            status: next,
            // Absent hours → the server coalesces (confirmed actual, else
            // estimate) — don't guess client-side.
            ...(actualMinutes !== undefined ? { actualMinutes } : {}),
            ...(completedOn ? { completedOn } : {}),
          }
        : next === 'needs_approval'
          ? {
              status: 'needs_approval' as const,
              actualMinutes:
                actualMinutes ?? row.actualMinutes ?? row.estimatedMinutes,
            }
          : { status: next };
      const res = await safeTaskAction(setTaskStatus(row.id, change));
      if (!res.ok) {
        if (lastAction.current?.id === row.id) lastAction.current = null;
        const reverted = rowsRef.current;
        if (removes) {
          // Same duplicate-id guard as undo: a re-seed during the await may
          // have already restored the row (the change never committed).
          if (!reverted.some((r) => r.id === row.id)) {
            const copy = reverted.slice();
            copy.splice(Math.min(index, copy.length), 0, row);
            commitRows(copy);
            commitSelected(Math.min(index, copy.length - 1));
          }
        } else {
          commitRows(
            reverted.map((r) =>
              r.id === row.id ? { ...r, status: prevStatus } : r,
            ),
          );
        }
        toast.error('Something went wrong. Try again.');
        return;
      }
      toast(label, {
        id: 'task-status',
        action: { label: 'Undo', onClick: () => void undo() },
      });
    },
    [view, undo, commitRows, commitSelected, todayKey],
  );

  // The one routing point for status changes (row menu, keyboard, dialog).
  // Both hours-confirming moves follow ONE rule: hours already on the row are
  // the answer, so the dialog interposes only when none were ever confirmed.
  // Asking again on a row that HAS them (every done row does — the status door
  // guarantees it) offers a choice whose only sane answer is the value already
  // shown, which is why done → needs approval used to re-prompt for nothing.
  const requestStatus = useCallback(
    (row: TaskRowData, next: TaskStatusSlug) => {
      if (row.status === next) return;
      if (next === 'done' || next === 'needs_approval') {
        if (row.actualMinutes != null) {
          void runMove(
            row.id,
            next,
            `${
              next === 'done' ? 'Completed' : 'Sent for approval'
            } · ${formatMinutes(row.actualMinutes)}`,
            row.actualMinutes,
          );
        } else {
          setCompleting({ row, to: next });
        }
        return;
      }
      void runMove(
        row.id,
        next,
        isShipped(row.status) && !isShipped(next)
          ? `Reopened as ${TASK_STATUS_LABELS[next].toLowerCase()}`
          : `Moved to ${TASK_STATUS_LABELS[next].toLowerCase()}`,
      );
    },
    [runMove],
  );

  // The SWIPE's door, and the reason it is not just requestStatus: a flick is
  // cheap to make by accident, so it always interposes the confirm even where
  // the menu moves straight through. Every gesture on this board ends in a
  // dialog — delete already did, and an advance files work into a client's
  // month, which is no smaller a thing.
  const advanceRow = useCallback((row: TaskRowData) => {
    const next = nextStage(row.status);
    if (next) setCompleting({ row, to: next });
  }, []);

  // The inline-edit door: apply the optimistic overlay, send the field patch,
  // revert the WHOLE row on failure (one snapshot beats per-field inverses).
  // No undo toast — field edits are self-evident in the cell and re-editable
  // in place; undo stays a status-move affordance. Resolves BY ID (the
  // runMove rule): a positional index can go stale across awaits/re-seeds.
  const runPatch = useCallback(
    async (
      id: string,
      patch: TaskCellPatch,
      optimistic: Partial<TaskRowData>,
    ) => {
      const current = rowsRef.current;
      const row = current.find((r) => r.id === id);
      if (!row) return;
      commitRows(
        current.map((r) => (r.id === row.id ? { ...r, ...optimistic } : r)),
      );
      const res = await safeTaskAction(patchTask(row.id, patch));
      if (!res.ok) {
        commitRows(rowsRef.current.map((r) => (r.id === row.id ? row : r)));
        toast.error(
          'issues' in res
            ? (Object.values(res.issues)[0] ?? 'Check the value and try again.')
            : 'Something went wrong. Try again.',
        );
        return;
      }
    },
    [commitRows],
  );

  // The completion DAY has its own runner because it has its own door:
  // setTaskStatus owns completed_at, and re-issuing →done with a day key is
  // what an amendment IS. It cannot ride runMove — that returns early on
  // `row.status === next`, which is true of every amendment by definition.
  // Same optimistic shape as runPatch: overlay, send, revert the row on
  // failure. No lastAction entry and no Undo affordance: nothing moved status,
  // so `z` must still undo the last real move.
  const runCompletedOn = useCallback(
    async (id: string, completedOn: string) => {
      const current = rowsRef.current;
      const row = current.find((r) => r.id === id);
      if (!row || !isShipped(row.status)) return;
      commitRows(
        current.map((r) =>
          r.id === id
            ? {
                ...r,
                completedDate: completedOn,
                // The same formatter the server used in toRowData, so the
                // optimistic label cannot disagree with the re-seeded one.
                completedLabel: dueDateLabel(completedOn, todayKey),
              }
            : r,
        ),
      );
      const res = await safeTaskAction(
        setTaskStatus(id, {
          status: row.status,
          // Carried explicitly rather than left to the server's coalesce, so a
          // confirmed figure can never be re-derived from the estimate by a
          // later change to that expression.
          ...(row.actualMinutes != null
            ? { actualMinutes: row.actualMinutes }
            : {}),
          completedOn,
        }),
      );
      if (!res.ok) {
        commitRows(rowsRef.current.map((r) => (r.id === id ? row : r)));
        toast.error(
          'issues' in res
            ? (Object.values(res.issues)[0] ?? 'Pick a day that has happened.')
            : 'Something went wrong. Try again.',
        );
        return;
      }
      toast('Completion date updated.', { id: 'task-status' });
    },
    [commitRows, todayKey],
  );

  // Tags have their OWN door (setTaskTags) because they live in a join table
  // — patchTask is a column patch and its schema has no tagIds key at all.
  // Same optimistic shape as runPatch: overlay, send, revert the whole row on
  // failure. The overlay is built from the vocabulary the picker was reading,
  // so a chip appears the moment it is ticked.
  const runTags = useCallback(
    async (row: TaskRowData, nextIds: string[]) => {
      const byId = new Map(formOptions.tags.map((t) => [t.id, t]));
      const optimistic: TaskTagChipData[] = nextIds
        .map((id) => byId.get(id))
        .filter((tag): tag is (typeof formOptions.tags)[number] => Boolean(tag))
        .map((tag) => ({
          id: tag.id,
          slug: tag.slug,
          name: tag.name,
          tone: tag.tone,
        }));
      const current = rowsRef.current;
      commitRows(
        current.map((r) => (r.id === row.id ? { ...r, tags: optimistic } : r)),
      );
      const res = await safeTaskAction(setTaskTags(row.id, { tagIds: nextIds }));
      if (!res.ok) {
        commitRows(rowsRef.current.map((r) => (r.id === row.id ? row : r)));
        toast.error(res.error);
      }
    },
    [commitRows, formOptions.tags],
  );

  // Assignees have their OWN door too (setTaskAssignees) — same join table,
  // same reason. runTags' optimistic shape: the overlay is built from the
  // picker's own roster, so a face appears the moment it is ticked.
  const runAssignees = useCallback(
    async (row: TaskRowData, nextIds: string[]) => {
      const byId = new Map(formOptions.assignees.map((a) => [a.value, a]));
      const optimistic: RowAssignee[] = nextIds.flatMap((id) => {
        const option = byId.get(id);
        return option
          ? [{ id, name: option.label, avatar: option.avatar ?? null }]
          : [];
      });
      const current = rowsRef.current;
      commitRows(
        current.map((r) =>
          r.id === row.id ? { ...r, assignees: optimistic } : r,
        ),
      );
      const res = await safeTaskAction(
        setTaskAssignees(row.id, { assigneeIds: nextIds }),
      );
      if (!res.ok) {
        commitRows(rowsRef.current.map((r) => (r.id === row.id ? row : r)));
        toast.error(res.error);
      }
    },
    [commitRows, formOptions.assignees],
  );

  const runDuplicate = useCallback(
    async (row: TaskRowData) => {
      const res = await safeTaskAction(duplicateTask(row.id));
      if (!res.ok) {
        toast.error('Could not duplicate the task. Try again.');
        return;
      }
      toast('Task duplicated. Back to to-do, dates cleared.', {
        id: 'task-duplicate',
      });
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    const row = deleting;
    if (!row) return;
    setDeletePending(true);
    const res = await safeTaskAction(deleteTask(row.id));
    setDeletePending(false);
    setDeleting(null);
    if (!res.ok) {
      toast.error('error' in res ? res.error : 'Delete failed. Try again.');
      return;
    }
    lastAction.current = null;
    commitRows(rowsRef.current.filter((r) => r.id !== row.id));
    toast('Task deleted.', { id: 'task-delete' });
  }, [deleting, commitRows]);

  /** Cell-level "+ New client" — TaskQuickAdd's createClientInline, hoisted
   *  so every row's combobox shares one extraClients merge. */
  const createClientInline = useCallback(
    async (name: string): Promise<PickerOption | null> => {
      let res: Awaited<ReturnType<typeof quickCreateClient>>;
      try {
        res = (await quickCreateClient({ name })) ?? {
          ok: false,
          error: 'server',
        };
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
    },
    [],
  );

  // NOT optimistic (InboxKeyboardList's rule): a multi-row rollback doesn't
  // compose with single-level undo, so the list waits and re-seeds.
  const runBulk = useCallback(
    async (status: TaskStatusSlug, label: string) => {
      const ids = rowsRef.current
        .filter((r) => checkedRef.current.has(r.id))
        .map((r) => r.id);
      if (ids.length === 0) return;
      setBulkPending(true);
      const res = await safeTaskAction(setTasksStatusBulk(ids, status));
      setBulkPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      lastAction.current = null;
      commitChecked(new Set());
      const n = 'updated' in res ? (res.updated ?? ids.length) : ids.length;
      toast(
        `${label}: ${n} task${n === 1 ? '' : 's'}${
          isShipped(status) || status === 'needs_approval'
            ? ' · hours defaulted to estimates'
            : ''
        }`,
        { id: 'task-status' },
      );
    },
    [commitChecked],
  );

  // Same non-optimistic rule as runBulk: a multi-row rollback doesn't compose
  // with the single-level undo, so the list waits and re-seeds.
  const runBulkPatch = useCallback(
    async (patch: TaskCellPatch, label: string) => {
      const ids = rowsRef.current
        .filter((r) => checkedRef.current.has(r.id))
        .map((r) => r.id);
      if (ids.length === 0) return;
      setBulkPending(true);
      const res = await safeTaskAction(bulkPatchTasks(ids, patch));
      setBulkPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      commitChecked(new Set());
      const updated = 'updated' in res ? res.updated : ids.length;
      const skipped = 'skipped' in res ? res.skipped : 0;
      toast(
        `${label}: ${updated} task${updated === 1 ? '' : 's'}${
          skipped > 0
            ? ` · ${skipped} skipped (dates out of order)`
            : ''
        }`,
        { id: 'task-bulk' },
      );
    },
    [commitChecked],
  );

  // Add/remove, never replace (setTasksTagsBulk's contract): one "set tags"
  // across a mixed selection would wipe whatever each row already carried.
  // Non-optimistic like every other bulk path — a multi-row rollback doesn't
  // compose with the single-level undo, so the list waits and re-seeds.
  const runBulkTags = useCallback(
    async (change: { add?: string[]; remove?: string[] }, label: string) => {
      const ids = rowsRef.current
        .filter((r) => checkedRef.current.has(r.id))
        .map((r) => r.id);
      if (ids.length === 0) return;
      setBulkPending(true);
      const res = await safeTaskAction(setTasksTagsBulk(ids, change));
      setBulkPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      commitChecked(new Set());
      const updated = 'updated' in res ? (res.updated ?? ids.length) : ids.length;
      toast(`${label}: ${updated} task${updated === 1 ? '' : 's'}`, {
        id: 'task-bulk',
      });
    },
    [commitChecked],
  );

  // Add/remove, never replace — setTasksAssigneesBulk's contract, and the
  // same rule the tag bulk follows one function up. `skipped` is surfaced
  // rather than swallowed: it means a task was left alone because the member
  // being removed was its last one, which the person would otherwise discover
  // as a row that simply didn't change.
  const runBulkAssignees = useCallback(
    async (change: { add?: string[]; remove?: string[] }, label: string) => {
      const ids = rowsRef.current
        .filter((r) => checkedRef.current.has(r.id))
        .map((r) => r.id);
      if (ids.length === 0) return;
      setBulkPending(true);
      const res = await safeTaskAction(setTasksAssigneesBulk(ids, change));
      setBulkPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      commitChecked(new Set());
      const skipped = 'skipped' in res ? (res.skipped ?? 0) : 0;
      const done = ids.length - skipped;
      toast(
        `${label}: ${done} task${done === 1 ? '' : 's'}` +
          (skipped > 0
            ? `, ${skipped} kept (a task needs at least one member)`
            : ''),
        { id: 'task-bulk' },
      );
    },
    [commitChecked],
  );

  const confirmBulkDelete = useCallback(async () => {
    const ids = rowsRef.current
      .filter((r) => checkedRef.current.has(r.id))
      .map((r) => r.id);
    if (ids.length === 0) {
      setBulkDeleting(false);
      return;
    }
    setBulkPending(true);
    const res = await safeTaskAction(bulkDeleteTasks(ids));
    setBulkPending(false);
    setBulkDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    lastAction.current = null;
    const gone = new Set(ids);
    commitRows(rowsRef.current.filter((r) => !gone.has(r.id)));
    commitChecked(new Set());
    const n = 'updated' in res ? (res.updated ?? ids.length) : ids.length;
    toast(`Deleted ${n} task${n === 1 ? '' : 's'}.`, { id: 'task-delete' });
  }, [commitRows, commitChecked]);

  const openComplete = useCallback(
    (index: number) => {
      const row = rowsRef.current[index];
      if (row) requestStatus(row, 'done');
    },
    [requestStatus],
  );

  const openApproval = useCallback(
    (index: number) => {
      const row = rowsRef.current[index];
      if (row) requestStatus(row, 'needs_approval');
    },
    [requestStatus],
  );

  const openEdit = useCallback((row: TaskRowData) => {
    setEditing(row);
    setRevisionOf(null);
    setEditOpen(true);
  }, []);

  const addRevision = useCallback((row: TaskRowData) => {
    // Create mode with a seed: `editing` must be cleared or the dialog would
    // open on the parent itself and the member would edit the delivered task
    // instead of logging a new round on it.
    setEditing(null);
    setRevisionOf(row);
    setEditOpen(true);
  }, []);

  // Overflow cue: 11 columns inside overflow-x-auto silently clip on narrow
  // panels (iPad, 13" with the rail expanded) — the glass panel's rounded
  // edge reads as "the table ends here", so users never learn the Status /
  // Time / Dates columns exist. A right-edge fade signals the hidden rest.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollableRight, setScrollableRight] = useState(false);
  const updateScrollCue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollableRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    updateScrollCue();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollCue);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollCue, rows.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (overlayOpenRef.current) return; // dialogs own the keyboard
      const t = e.target as HTMLElement | null;
      // The shared superset (useSearchFocus.ts) covers open Radix popups
      // (menu items are divs, not buttons) — typing j/k inside one must not
      // move the table cursor.
      if (t && (t.isContentEditable || t.closest(EDITABLE_TARGET))) {
        return;
      }

      const key = e.key;
      if (key === 'j' || key === 'ArrowDown') {
        e.preventDefault();
        commitSelected(
          Math.min(selectedIndexRef.current + 1, rowsRef.current.length - 1),
        );
        return;
      }
      if (key === 'k' || key === 'ArrowUp') {
        e.preventDefault();
        commitSelected(Math.max(selectedIndexRef.current - 1, 0));
        return;
      }
      if (key === 'Escape') {
        if (checkedRef.current.size === 0) return;
        e.preventDefault();
        commitChecked(new Set());
        return;
      }

      // Everything below MUTATES. OS key-repeat must never drive it: holding
      // 'd' on a tab where every row carries confirmed hours would complete
      // one row per repeat (one-click done skips the dialog that used to
      // interpose), and only the last is undoable. Navigation above still
      // repeats, which is what makes j/k feel right.
      if (e.repeat) return;

      // Before the row lookup: the shortcut list is exactly what you want on
      // an empty board, and it needs no task under the cursor. Shift+'/'
      // arrives as '?', so it can't collide with TaskFilterBar's '/' search.
      if (key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      const row = rowsRef.current[selectedIndexRef.current];
      if (!row) return;

      if (key === 'Enter' || key === 'o') {
        e.preventDefault();
        openEdit(row);
        return;
      }
      if (key === 'x') {
        e.preventDefault();
        toggleChecked(row.id);
        return;
      }
      if (key === 'z') {
        e.preventDefault();
        void undo();
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        openApproval(selectedIndexRef.current);
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        openComplete(selectedIndexRef.current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo,
    openEdit,
    openComplete,
    openApproval,
    commitSelected,
    commitChecked,
    toggleChecked,
  ]);

  // Dedupe against the server list: after the next server re-seed the fresh
  // formOptions.clients already contains the inline-created client, and the
  // unpruned extra would render it twice (duplicate React keys) forever.
  // useMemo keeps the object referentially stable across unrelated renders —
  // a fresh options object per render would defeat every TaskRow's memo().
  const boardOptions: TaskFormOptions = useMemo(
    () =>
      extraClients.length > 0
        ? {
            ...formOptions,
            clients: [
              ...formOptions.clients,
              ...extraClients.filter(
                (extra) =>
                  !formOptions.clients.some((c) => c.value === extra.value),
              ),
            ],
          }
        : formOptions,
    [formOptions, extraClients],
  );

  // ONE stable handler set shared by every row (TaskRow resolves the row/id
  // itself) — per-row closures would remount 25 rows' worth of Radix trees
  // on each board state change.
  const openDelete = useCallback((row: TaskRowData) => setDeleting(row), []);

  const patchRow = useCallback(
    (id: string, patch: TaskCellPatch, optimistic: Partial<TaskRowData>) =>
      void runPatch(id, patch, optimistic),
    [runPatch],
  );
  const completedOnRow = useCallback(
    (id: string, completedOn: string) => void runCompletedOn(id, completedOn),
    [runCompletedOn],
  );
  const duplicateRow = useCallback(
    (row: TaskRowData) => void runDuplicate(row),
    [runDuplicate],
  );
  const tagsRow = useCallback(
    (row: TaskRowData, next: string[]) => void runTags(row, next),
    [runTags],
  );
  const assigneesRow = useCallback(
    (row: TaskRowData, next: string[]) => void runAssignees(row, next),
    [runAssignees],
  );
  // The revised task's deep link, carrying the live filters so returning from
  // it lands on the board the member left rather than an unfiltered one. The
  // parent is often on another status tab (delivered, while the revision is
  // still in progress), so it can't be resolved from `rows`.
  const parentHref = useCallback(
    (parentId: string) =>
      `${basePath}?${filterQs ? `${filterQs}&` : ''}task=${parentId}`,
    [basePath, filterQs],
  );

  // A new object identity each time is deliberate: TaskTemplatesDialog keys
  // its seed effect on identity, so asking twice for the same row re-opens the
  // form instead of being swallowed as "already seeded".
  // Only ACTIVE templates are offered for one-tap spawning — a paused one is
  // paused for a reason, and it stays editable in the manager.
  const quickTemplates: QuickTemplate[] = useMemo(
    () =>
      templates
        .filter((t) => t.active)
        .map((t) => ({
          value: t.id,
          label: t.name,
          logo: t.clientLogo || undefined,
          taskTitle: t.title,
        })),
    [templates],
  );

  const saveRowAsTemplate = useCallback((row: TaskRowData) => {
    setTemplateSeed(seedFromTask(row));
    setTemplatesOpen(true);
  }, []);

  // Partition the LIVE rows (not propRows) so optimistic edits move a row to
  // its new section immediately; first appearance in sort order orders the
  // sections, sort order survives inside each.
  const grouped: RowGroup[] | null =
    group === ''
      ? null
      : (() => {
          const map = new Map<string, RowGroup>();
          rows.forEach((row, index) => {
            const bucket = group === 'due' ? dueBucket(row, todayKey) : null;
            // Member grouping is the one that can place a row in MORE THAN ONE
            // section: a task two people share belongs under both of them, and
            // showing it only under whoever happens to be first would hide it
            // from the other person's own view of their day. The section
            // counts therefore add up to more than the row count — the board
            // says so in the group header rather than leaving it to be found.
            const targets = bucket
              ? [{ key: bucket, label: DUE_BUCKET_LABELS[bucket], avatar: null }]
              : group === 'client'
                ? [
                    {
                      key: row.clientId || 'internal',
                      label: row.clientLabel,
                      avatar: null,
                    },
                  ]
                : row.assignees.map((who) => ({
                    key: who.id || `name:${who.name}`,
                    label: who.name,
                    avatar: who.avatar,
                  }));
            for (const target of targets) {
              let section = map.get(target.key);
              if (!section) {
                section = {
                  key: target.key,
                  label: target.label,
                  logo: group === 'client' ? row.clientLogo : '',
                  avatar: group === 'member' ? target.avatar : null,
                  entries: [],
                };
                map.set(target.key, section);
              }
              section.entries.push({ row, index });
            }
          });
          const sections = [...map.values()];
          // Deadline sections read in pressure order regardless of which
          // bucket happens to appear first in the current sort — "Overdue"
          // below "Later" would defeat the point of the grouping.
          return group === 'due'
            ? sections.sort(
                (a, b) =>
                  DUE_BUCKET_ORDER.indexOf(a.key as DueBucket) -
                  DUE_BUCKET_ORDER.indexOf(b.key as DueBucket),
              )
            : sections;
        })();

  const renderRow = (row: TaskRowData, i: number) => (
    <TaskRow
      key={row.id}
      ref={i === selected ? selectedRef : undefined}
      row={row}
      todayKey={todayKey}
      options={boardOptions}
      selected={i === selected}
      checked={checkedIds.has(row.id)}
      highlight={row.id === flashId}
      onToggle={toggleChecked}
      onEdit={openEdit}
      onAddRevision={addRevision}
      onPatch={patchRow}
      onCompletedOn={completedOnRow}
      onTagsChange={tagsRow}
      onAssigneesChange={assigneesRow}
      onDuplicate={duplicateRow}
      onSaveAsTemplate={saveRowAsTemplate}
      onDelete={openDelete}
      onCreateClient={createClientInline}
      onStatusSelect={requestStatus}
      parentHref={parentHref}
    />
  );

  return (
    <>
      {pastMonth ? (
        // Same box as the band it replaces (border + px + py + an h-8 row), so
        // the single skeleton in loading.tsx is correct for both states — it
        // gets no searchParams and therefore cannot branch on the month.
        <div className="border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          {/* h-8 on the INNER row, never on the wrapper: the padding is inside
              a border-box height, so h-8 out here would collapse the band to
              32px instead of the 53px the quick-add band measures — and the
              one skeleton in loading.tsx has to be right for both states.
              Kept to one short line for the same reason: two lines on a 360px
              phone would outgrow the band it stands in for. */}
          <p className="flex h-8 items-center text-xs text-muted-foreground">
            Add work on
            <Link
              href={currentMonthHref}
              className={cn('mx-1 font-medium', adminLink)}
            >
              {currentMonthLabel}
            </Link>
            .
          </p>
        </div>
      ) : (
        <TaskQuickAdd
          options={formOptions}
          templates={quickTemplates}
          todayKey={todayKey}
          onCreated={handleCreated}
          autoFocus={quickAddAutoFocus}
        />
      )}
      <TaskBulkBar
        view={view}
        pastMonth={pastMonth}
        count={checkedVisible.length}
        allChecked={allChecked}
        someChecked={checkedVisible.length > 0}
        pending={bulkPending}
        options={boardOptions}
        onToggleAll={toggleAll}
        onClear={() => commitChecked(new Set())}
        onAction={(status, label) => void runBulk(status, label)}
        onPatch={(patch, label) => void runBulkPatch(patch, label)}
        onTags={(change, label) => void runBulkTags(change, label)}
        onAssignees={(change, label) => void runBulkAssignees(change, label)}
        onDelete={() => setBulkDeleting(true)}
        todayKey={todayKey}
      />

      {rows.length === 0 ? (
        empty
      ) : (
        <>
        {/* Below 768px the eleven columns are the wrong shape — you pan
            sideways to reach Status/Time/Dates and lose which row they
            belonged to. Both trees are server-rendered and the switch is
            pure CSS, so the first paint is correct at every width with no
            JavaScript; the card list is a SIBLING of the scroller rather
            than a child of it, which keeps its swipe out of the horizontal
            pan this wrapper owns. */}
        <TaskCardList
          className="md:hidden"
          rows={rows}
          groups={grouped}
          group={group}
          tally={taskTally}
          checkedIds={checkedIds}
          flashId={flashId}
          onToggle={toggleChecked}
          onOpen={openEdit}
          onAddRevision={addRevision}
          onDuplicate={duplicateRow}
          onSaveAsTemplate={saveRowAsTemplate}
          onDelete={openDelete}
          onAdvance={advanceRow}
        />
        <div className="relative hidden md:block">
          <div
            ref={scrollRef}
            onScroll={updateScrollCue}
            /* Axis-scoped, NOT data-lenis-prevent: the blanket attribute makes
               Lenis bail on every gesture, so a vertical wheel anywhere over
               the table scrolled nothing at all — overflow-x-auto also computes
               overflow-y to `auto`. This keeps native horizontal panning of the
               columns while vertical wheel returns to Lenis.

               overscroll-x-contain is NOT redundant with that attribute, and
               the note that used to sit here claiming lenis.css contained the
               chaining was wrong on the surface that needed it. That rule is
               scoped `.lenis [data-lenis-prevent-horizontal]`, and SmartLenis
               mounts only at `(min-width:1024px) and (pointer:fine)` — so on a
               phone there is no `.lenis` ancestor, the rule never matches, and
               an end-of-scroll swipe on this table chained straight to the
               document and Safari's back gesture. AdminBottomBar has the same
               guard for the same reason. */
            data-lenis-prevent-horizontal
            className="overflow-x-auto overscroll-x-contain"
          >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 dark:border-foreground/10">
                <th
                  scope="col"
                  className={cn(HEADER_CELL, 'w-10 pt-2.5 pl-4 sm:pl-5')}
                >
                  <SelectAllCheckbox
                    allChecked={allChecked}
                    someChecked={checkedVisible.length > 0}
                    onToggleAll={toggleAll}
                  />
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Task
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Client
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Category
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Tags
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Member
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Priority
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Status
                </th>
                <th
                  scope="col"
                  className={cn(HEADER_CELL, 'pt-2.5 text-right')}
                  title="Estimated / actual"
                >
                  Time
                  {/* The title tooltip never reaches touch or AT users. */}
                  <span className="sr-only"> (estimated / actual)</span>
                </th>
                <th
                  scope="col"
                  className={cn(HEADER_CELL, 'pt-2.5 text-right')}
                >
                  Dates
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'w-10 pr-4 sm:pr-5')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {grouped ? (
              grouped.map((section) => (
                <tbody key={section.key}>
                  {/* Non-interactive header row — the keyboard cursor and
                      selection walk the flat row list, untouched. */}
                  <tr className="border-b border-white/40 dark:border-foreground/10">
                    <td colSpan={11} className="px-4 pt-4 pb-2 sm:px-5">
                      <span className="flex items-center gap-2.5">
                        {group === 'client' ? (
                          <ClientMark
                            name={section.label}
                            logo={section.logo || null}
                            mark={section.key === 'internal'}
                            size={20}
                          />
                        ) : group === 'member' ? (
                          <AdminAvatar
                            name={section.label}
                            size={20}
                            {...(section.avatar ?? {})}
                          />
                        ) : (
                          // Deadline sections have no entity to picture — a
                          // dot keeps the header's baseline aligned with the
                          // avatar/logo variants, and carries the urgency tint.
                          <span
                            aria-hidden="true"
                            className={cn(
                              'inline-block size-2 shrink-0 rounded-full',
                              section.key === 'overdue'
                                ? 'bg-destructive'
                                : section.key === 'today'
                                  ? 'bg-amber-500'
                                  : 'bg-foreground/25',
                            )}
                          />
                        )}
                        <span className="text-xs font-semibold text-foreground">
                          {section.label}
                        </span>
                        <span className="ml-auto shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
                          {taskTally(section.entries.map((e) => e.row))}
                        </span>
                      </span>
                    </td>
                  </tr>
                  {section.entries.map((entry) =>
                    renderRow(entry.row, entry.index),
                  )}
                </tbody>
              ))
            ) : (
              <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
            )}
          </table>
          </div>
          {scrollableRight && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-linear-to-l from-white/70 to-transparent dark:from-white/60"
            />
          )}
        </div>
        </>
      )}

      {/* Page-scoped totals from the LIVE rows — tracks optimistic edits. */}
      {rows.length > 0 && (
        <p className="border-t border-white/40 px-4 py-2 text-right text-[0.7rem] tabular-nums text-muted-foreground sm:px-5 dark:border-white/10">
          {totalPages > 1 ? 'This page: ' : ''}
          {taskTally(rows)}
        </p>
      )}

      {/* The legend is the discovery path for the sheet as much as for the
          keys — a member who never thinks to press '?' still reads this line,
          so the line itself has to be the thing you can click. Stays lg-only:
          these are only worth surfacing where there's a keyboard. */}
      <button
        type="button"
        onClick={() => setShortcutsOpen(true)}
        className="hidden w-full cursor-pointer border-t border-white/40 px-4 py-2.5 text-center text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground lg:block dark:border-white/10"
      >
        {(
          [
            ['j/k', 'move'],
            ['x', 'select'],
            ['Enter', 'edit'],
            ['a', 'approval'],
            ['d', 'done'],
            ['z', 'undo'],
            ['/', 'search'],
            ['Esc', 'leave a field'],
            ['?', 'all shortcuts'],
          ] as [string, string][]
        ).map(([k, label], i) => (
          <span key={k}>
            {i > 0 ? ' · ' : ''}
            <Kbd>{k}</Kbd> {label}
          </span>
        ))}
      </button>

      {totalPages > 1 && (
        <Pager
          basePath={basePath}
          filterQs={filterQs}
          page={page}
          totalPages={totalPages}
        />
      )}

      {/* key remounts per task so dialog state never leaks between rows. */}
      {completing && (
        <CompleteTaskDialog
          key={completing.row.id}
          open
          mode={completing.to}
          onOpenChange={(next) => {
            if (!next) setCompleting(null);
          }}
          taskTitle={completing.row.title}
          defaultMinutes={
            completing.row.actualMinutes ?? completing.row.estimatedMinutes
          }
          todayKey={todayKey}
          onConfirm={(actualMinutes, completedOn) => {
            const target = completing;
            setCompleting(null);
            void runMove(
              target.row.id,
              target.to,
              `${
                target.to === 'done'
                  ? 'Completed'
                  : target.to === 'needs_approval'
                    ? 'Sent for approval'
                    : `Marked ${TASK_STATUS_LABELS[target.to].toLowerCase()}`
              } · ${formatMinutes(actualMinutes)}`,
              actualMinutes,
              // Only →done files under a day here. An approval leaves
              // completedAt null so it would be meaningless, and →delivered /
              // →posted must send NOTHING so the server preserves the day the
              // work actually shipped on.
              target.to === 'done' ? completedOn : undefined,
            );
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !deletePending && !next && setDeleting(null)}
        title="Delete this task?"
        description={
          // The FK is `set null`, so deleting a deliverable does not delete
          // the rounds hanging off it — they survive as standalone tasks and
          // start counting as deliveries of their own. That is a real change
          // to next month's numbers, so it is said out loud rather than
          // discovered later.
          // DIRECT rounds, not the whole chain: rounds nest, so a third round
          // hangs off the second and keeps pointing at it. Only what pointed
          // at THIS row is set null and starts counting as delivered work, and
          // quoting the chain total here would overstate what a delete does.
          deleting && deleting.directRevisionCount > 0
            ? `Its ${deleting.directRevisionCount} revision${deleting.directRevisionCount === 1 ? '' : 's'} will become separate tasks and start counting as delivered work. It disappears from the list and from any monthly report it was counted in. This can’t be undone.`
            : 'It disappears from the list and from any monthly report it was counted in. This can’t be undone.'
        }
        confirmLabel="Delete task"
        onConfirm={() => void confirmDelete()}
        destructive
        pending={deletePending}
      />

      <ConfirmDialog
        open={bulkDeleting}
        onOpenChange={(next) => !bulkPending && !next && setBulkDeleting(false)}
        title={`Delete ${checkedVisible.length} task${
          checkedVisible.length === 1 ? '' : 's'
        }?`}
        description="They disappear from the list and from any monthly report they were counted in. This can’t be undone."
        confirmLabel="Delete tasks"
        onConfirm={() => void confirmBulkDelete()}
        destructive
        pending={bulkPending}
      />

      {/* boardOptions, not formOptions (the TaskBulkBar rule): a client just
          created from a row's cell must resolve here too, or the dialog opens
          showing the Client field as if nothing were picked. */}
      <TaskDialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          // Clear the seed on close so the next bare "New task" isn't still
          // pinned to the last thing someone revised.
          if (!next) setRevisionOf(null);
        }}
        task={editing}
        revisionOf={revisionOf}
        options={boardOptions}
        todayKey={todayKey}
      />

      {/* Mounted here rather than in the header so the row menu's "Save as
          template" can open it prefilled without lifting state a level up. */}
      <TaskShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      <TaskTemplatesDialog
        open={templatesOpen}
        onOpenChange={(next) => {
          setTemplatesOpen(next);
          if (!next) setTemplateSeed(null);
        }}
        templates={templates}
        options={boardOptions}
        seed={templateSeed}
      />
    </>
  );
}

// `filterQs` already carries status + filters in canonical order with `page`
// reserved for last, so appending keeps the URL canonical.
function pageHref(basePath: string, filterQs: string, p: number): string {
  const qs =
    p > 1 ? (filterQs ? `${filterQs}&page=${p}` : `page=${p}`) : filterQs;
  return qs ? `${basePath}?${qs}` : basePath;
}

function Pager({
  basePath,
  filterQs,
  page,
  totalPages,
}: {
  basePath: string;
  filterQs: string;
  page: number;
  totalPages: number;
}) {
  return (
    <nav
      className="flex items-center justify-center gap-1 border-t border-white/40 p-3 dark:border-white/10"
      aria-label="Pagination"
    >
      {getPageNumbers(page, totalPages).map((n, i) =>
        n === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={n}
            href={pageHref(basePath, filterQs, n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
              n === page
                ? 'bg-foreground text-background'
                : cn('text-muted-foreground hover:text-foreground', glassRowHover),
            )}
          >
            {n}
          </Link>
        ),
      )}
    </nav>
  );
}
