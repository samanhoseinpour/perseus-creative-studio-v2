'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  setTasksStatusBulk,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import {
  TASK_STATUS_LABELS,
  formatMinutes,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  TASK_VIEW_STATUSES,
  type TaskGroupBy,
  type TaskView,
} from '@/lib/taskFilters';
import { getPageNumbers } from '@/utils/pagination';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import ClientMark from './ClientMark';
import CompleteTaskDialog from './CompleteTaskDialog';
import { safeTaskAction } from './safeTaskAction';
import TaskBulkBar from './TaskBulkBar';
import TaskDialog from './TaskDialog';
import TaskQuickAdd from './TaskQuickAdd';
import TaskRow from './TaskRow';
import type {
  PickerOption,
  RowAvatar,
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

/** One section of the grouped table — entries keep their FLAT index so the
 *  keyboard cursor, selection, and runPatch stay positionally honest. */
type RowGroup = {
  key: string;
  label: string;
  logo: string;
  avatar: RowAvatar | null;
  entries: { row: TaskRowData; index: number }[];
};

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
  formOptions,
  todayKey,
  group = '',
  empty,
}: {
  rows: TaskRowData[];
  view: TaskView;
  basePath: string;
  page: number;
  totalPages: number;
  /** Canonical qs incl. status + filters, excl. page (taskListQs). */
  filterQs: string;
  formOptions: TaskFormOptions;
  /** The render's Vancouver YYYY-MM-DD — optimistic date-cell recompute. */
  todayKey: string;
  /** Section the table by client/member (URL `group` param) — partitioned
   *  from the LIVE row state so optimistic edits move rows immediately. */
  group?: TaskGroupBy;
  /** Server-rendered <TasksEmpty> for the zero-rows case. */
  empty: React.ReactNode;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<TaskRowData[]>(propRows);
  const [selected, setSelected] = useState(0);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [editing, setEditing] = useState<TaskRowData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // The row only — NEVER a positional index: the list can re-seed while the
  // confirm dialog is open (background quick-add settle, a teammate's edit),
  // and a stale index would mark whatever row now sits there as done.
  const [completing, setCompleting] = useState<TaskRowData | null>(null);
  const [deleting, setDeleting] = useState<TaskRowData | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  /** Clients created inline from a CELL's combobox — merged into the option
   *  set the rows see, so the fresh pick resolves before router.refresh()
   *  (TaskDialog/TaskQuickAdd keep their own equivalents). */
  const [extraClients, setExtraClients] = useState<PickerOption[]>([]);
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
      editOpen || completing !== null || deleting !== null || bulkDeleting;
  }, [editOpen, completing, deleting, bulkDeleting]);

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

  // Re-seed from the server on every new list (refresh / page / tab / filter
  // change). Selection INTERSECTS rather than clears: refreshes now also fire
  // after every inline patch and background quick-add settle, where the
  // checked rows still exist and the selection is still meaningful — rows
  // that left the list drop out, and a page/tab/filter change (disjoint id
  // sets) still comes out empty, preserving the original intent.
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

    // Undoing back INTO done must re-carry the hours (the status door
    // requires them); the stored row still has them.
    const change =
      act.prevStatus === 'done'
        ? {
            status: 'done' as const,
            actualMinutes: act.row.actualMinutes ?? act.row.estimatedMinutes,
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
      toast.error('Undo failed — try again.');
      return;
    }
    router.refresh();
  }, [router, commitRows]);

  // Resolves the row BY ID at call time — callers must never hand this a
  // positional index, which can go stale across the awaits and re-seeds
  // (the wrong-task-marked-done class of bug).
  const runMove = useCallback(
    async (
      id: string,
      next: TaskStatusSlug,
      label: string,
      actualMinutes?: number,
    ) => {
      const current = rowsRef.current;
      const index = current.findIndex((r) => r.id === id);
      const row = index === -1 ? undefined : current[index];
      if (!row || row.status === next) return;
      const prevStatus = row.status;
      const removes = !TASK_VIEW_STATUSES[view].includes(next);

      if (removes) {
        commitRows(current.filter((r) => r.id !== row.id));
        commitSelected(Math.min(index, Math.max(0, current.length - 2)));
      } else {
        commitRows(
          current.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
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

      const change =
        next === 'done'
          ? { status: 'done' as const, actualMinutes: actualMinutes ?? row.estimatedMinutes }
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
        toast.error('Something went wrong — try again.');
        return;
      }
      router.refresh();
      toast(label, {
        id: 'task-status',
        action: { label: 'Undo', onClick: () => void undo() },
      });
    },
    [view, router, undo, commitRows, commitSelected],
  );

  // The inline-edit door: apply the optimistic overlay, send the field patch,
  // revert the WHOLE row on failure (one snapshot beats per-field inverses).
  // No undo toast — field edits are self-evident in the cell and re-editable
  // in place; undo stays a status-move affordance.
  const runPatch = useCallback(
    async (
      index: number,
      patch: TaskCellPatch,
      optimistic: Partial<TaskRowData>,
    ) => {
      const current = rowsRef.current;
      const row = current[index];
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
            : 'Something went wrong — try again.',
        );
        return;
      }
      router.refresh();
    },
    [router, commitRows],
  );

  const runDuplicate = useCallback(
    async (row: TaskRowData) => {
      const res = await safeTaskAction(duplicateTask(row.id));
      if (!res.ok) {
        toast.error('Could not duplicate the task — try again.');
        return;
      }
      router.refresh();
      toast('Task duplicated — back to to-do, dates cleared.', {
        id: 'task-duplicate',
      });
    },
    [router],
  );

  const confirmDelete = useCallback(async () => {
    const row = deleting;
    if (!row) return;
    setDeletePending(true);
    const res = await safeTaskAction(deleteTask(row.id));
    setDeletePending(false);
    setDeleting(null);
    if (!res.ok) {
      toast.error('error' in res ? res.error : 'Delete failed — try again.');
      return;
    }
    lastAction.current = null;
    commitRows(rowsRef.current.filter((r) => r.id !== row.id));
    router.refresh();
    toast('Task deleted.', { id: 'task-delete' });
  }, [deleting, router, commitRows]);

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
            : 'Could not create the client — try again.',
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
      router.refresh();
      const n = 'updated' in res ? (res.updated ?? ids.length) : ids.length;
      toast(
        `${label} — ${n} task${n === 1 ? '' : 's'}${
          status === 'done' ? ' · hours defaulted to estimates' : ''
        }`,
        { id: 'task-status' },
      );
    },
    [router, commitChecked],
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
      router.refresh();
      const updated = 'updated' in res ? res.updated : ids.length;
      const skipped = 'skipped' in res ? res.skipped : 0;
      toast(
        `${label} — ${updated} task${updated === 1 ? '' : 's'}${
          skipped > 0
            ? ` · ${skipped} skipped (dates out of order)`
            : ''
        }`,
        { id: 'task-bulk' },
      );
    },
    [router, commitChecked],
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
    router.refresh();
    const n = 'updated' in res ? (res.updated ?? ids.length) : ids.length;
    toast(`Deleted ${n} task${n === 1 ? '' : 's'}.`, { id: 'task-delete' });
  }, [router, commitRows, commitChecked]);

  const openComplete = useCallback((index: number) => {
    const row = rowsRef.current[index];
    if (!row || row.status === 'done') return;
    setCompleting(row);
  }, []);

  const openEdit = useCallback((row: TaskRowData) => {
    setEditing(row);
    setEditOpen(true);
  }, []);

  // Overflow cue: 10 columns inside overflow-x-auto silently clip on narrow
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
      // The role selectors cover open Radix popups (menu items are divs, not
      // buttons) — typing j/k inside one must not move the table cursor.
      if (
        t &&
        (t.isContentEditable ||
          t.closest(
            'input, textarea, select, a, button, [role="button"], [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="dialog"]',
          ))
      ) {
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
      if (key === 'd') {
        e.preventDefault();
        openComplete(selectedIndexRef.current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, openEdit, openComplete, commitSelected, commitChecked, toggleChecked]);

  const dateColumn = view === 'done' || view === 'all' ? 'completed' : 'due';
  // Dedupe against the server list: after router.refresh() the fresh
  // formOptions.clients already contains the inline-created client, and the
  // unpruned extra would render it twice (duplicate React keys) forever.
  const boardOptions: TaskFormOptions =
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
      : formOptions;

  // Partition the LIVE rows (not propRows) so optimistic edits move a row to
  // its new section immediately; first appearance in sort order orders the
  // sections, sort order survives inside each.
  const grouped: RowGroup[] | null =
    group === ''
      ? null
      : (() => {
          const map = new Map<string, RowGroup>();
          rows.forEach((row, index) => {
            const key =
              group === 'client'
                ? row.clientId || 'internal'
                : row.assigneeId || `name:${row.assigneeName}`;
            let section = map.get(key);
            if (!section) {
              section = {
                key,
                label: group === 'client' ? row.clientLabel : row.assigneeName,
                logo: group === 'client' ? row.clientLogo : '',
                avatar: group === 'member' ? row.assigneeAvatar : null,
                entries: [],
              };
              map.set(key, section);
            }
            section.entries.push({ row, index });
          });
          return [...map.values()];
        })();

  const renderRow = (row: TaskRowData, i: number) => (
    <TaskRow
      key={row.id}
      ref={i === selected ? selectedRef : undefined}
      row={row}
      dateColumn={dateColumn}
      todayKey={todayKey}
      options={boardOptions}
      selected={i === selected}
      checked={checkedIds.has(row.id)}
      onToggle={() => toggleChecked(row.id)}
      onEdit={() => openEdit(row)}
      onPatch={(patch, optimistic) => void runPatch(i, patch, optimistic)}
      onDuplicate={() => void runDuplicate(row)}
      onDelete={() => setDeleting(row)}
      onCreateClient={createClientInline}
      onStatusSelect={(next) => {
        if (next === 'done') {
          setCompleting(row);
          return;
        }
        void runMove(
          row.id,
          next,
          row.status === 'done'
            ? `Reopened — ${TASK_STATUS_LABELS[next].toLowerCase()}`
            : `Moved to ${TASK_STATUS_LABELS[next].toLowerCase()}`,
        );
      }}
    />
  );

  return (
    <>
      <TaskQuickAdd options={formOptions} todayKey={todayKey} />
      <TaskBulkBar
        view={view}
        count={checkedVisible.length}
        allChecked={allChecked}
        someChecked={checkedVisible.length > 0}
        pending={bulkPending}
        options={boardOptions}
        onToggleAll={toggleAll}
        onClear={() => commitChecked(new Set())}
        onAction={(status, label) => void runBulk(status, label)}
        onPatch={(patch, label) => void runBulkPatch(patch, label)}
        onDelete={() => setBulkDeleting(true)}
      />

      {rows.length === 0 ? (
        empty
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollCue}
            data-lenis-prevent
            className="overflow-x-auto"
          >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 dark:border-white/10">
                <th scope="col" className={cn(HEADER_CELL, 'w-10 pl-4 sm:pl-5')}>
                  <span className="sr-only">Select</span>
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
                  {dateColumn === 'due' ? 'Dates' : 'Done'}
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
                  <tr className="border-b border-white/40 dark:border-white/10">
                    <td colSpan={10} className="px-4 pt-4 pb-2 sm:px-5">
                      <span className="flex items-center gap-2.5">
                        {/* No coin for the Internal bucket — a fake "I"
                            monogram would read as a real client. */}
                        {group === 'client' ? (
                          section.key !== 'internal' && (
                            <ClientMark
                              name={section.label}
                              logo={section.logo || null}
                              size={20}
                            />
                          )
                        ) : (
                          <AdminAvatar
                            name={section.label}
                            size={20}
                            {...(section.avatar ?? {})}
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
              className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-linear-to-l from-white/70 to-transparent dark:from-black/40"
            />
          )}
        </div>
      )}

      {/* Page-scoped totals from the LIVE rows — tracks optimistic edits. */}
      {rows.length > 0 && (
        <p className="border-t border-white/40 px-4 py-2 text-right text-[0.7rem] tabular-nums text-muted-foreground sm:px-5 dark:border-white/10">
          {totalPages > 1 ? 'This page: ' : ''}
          {taskTally(rows)}
        </p>
      )}

      <p className="hidden border-t border-white/40 px-4 py-2.5 text-center text-[0.7rem] text-muted-foreground lg:block dark:border-white/10">
        {(
          [
            ['j/k', 'move'],
            ['x', 'select'],
            ['Enter', 'edit'],
            ['d', 'done'],
            ['z', 'undo'],
            ['/', 'search'],
          ] as [string, string][]
        ).map(([k, label], i) => (
          <span key={k}>
            {i > 0 ? ' · ' : ''}
            <Kbd>{k}</Kbd> {label}
          </span>
        ))}
      </p>

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
          key={completing.id}
          open
          onOpenChange={(next) => {
            if (!next) setCompleting(null);
          }}
          taskTitle={completing.title}
          defaultHours={completing.actualHours || completing.estHours}
          onConfirm={(actualMinutes) => {
            const done = completing;
            setCompleting(null);
            void runMove(
              done.id,
              'done',
              `Completed — ${formatMinutes(actualMinutes)}`,
              actualMinutes,
            );
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !deletePending && !next && setDeleting(null)}
        title="Delete this task?"
        description="It disappears from the list and from any monthly report it was counted in. This can’t be undone."
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

      <TaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={editing}
        options={formOptions}
      />
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/50 bg-white/40 px-1 font-sans text-[0.65rem] text-foreground dark:border-white/15 dark:bg-white/10">
      {children}
    </kbd>
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
