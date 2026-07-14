'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { ContactSubmission } from '@/db/schema';
import type { InboxView } from '@/db/adminQueries';
import {
  setSubmissionStatus,
  setSubmissionsStatusBulk,
} from '@/app/(admin)/admin/(protected)/_actions/inbox';
import { getPageNumbers } from '@/utils/pagination';
import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import BulkActionBar from './BulkActionBar';
import InboxRow from './InboxRow';
import { safeAction } from './safeAction';

type Status = ContactSubmission['status'];

export type InboxRowData = {
  id: string;
  name: string;
  email: string;
  secondary: string | null;
  dateLabel: string;
  status: Status;
  href: string;
};

type LastAction = {
  id: string;
  prevStatus: Status;
  /** Status the move applied — undo's failure path reverts back to it. */
  nextStatus: Status;
  index: number;
  removed: boolean;
  row: InboxRowData;
};

// Keyboard-driven, optimistic inbox list. Rows are handed down fully formed by
// the server page (so services.ts/careers.ts stay server-only). This component
// owns the selection cursor, the j/k/e/s/r/z/x key handling, optimistic status
// changes, single-level undo, and the bulk-select set. It is desktop-first;
// rows remain plain links, so tap/click still works everywhere.
export default function InboxKeyboardList({
  rows: propRows,
  view,
  basePath,
  page,
  totalPages,
  filterQs,
}: {
  rows: InboxRowData[];
  view: InboxView;
  basePath: string;
  page: number;
  totalPages: number;
  /**
   * Canonical query string for the current view INCLUDING status + filters,
   * EXCLUDING page (built server-side with inboxListQs) — pager links append
   * `page=` to it so pagination preserves the active search/filters/sort.
   */
  filterQs: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<InboxRowData[]>(propRows);
  const [selected, setSelected] = useState(0);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const lastAction = useRef<LastAction | null>(null);
  const selectedRef = useRef<HTMLLIElement>(null);

  // The window keydown listener (bound once) must read the CURRENT rows +
  // cursor, never a stale render closure — a quick `j` then `e` has to act on
  // the row the cursor just moved to. So these refs are the authoritative
  // values, written synchronously through commitRows/commitSelected (from event
  // handlers + effects — never during render, which the react-hooks/refs rule
  // forbids), and the `rows`/`selected` state only mirrors them for painting.
  const rowsRef = useRef(rows);
  const selectedIndexRef = useRef(selected);
  const checkedRef = useRef(checkedIds);

  const commitRows = useCallback((next: InboxRowData[]) => {
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

  // Re-seed from the server whenever the page hands down a new list (a
  // router.refresh() after an action, or pagination / tab / filter change).
  // The optimistic local mutation only fills the gap until that refresh lands.
  // Selection is cleared on EVERY new list on purpose: what "the selected rows"
  // meant is gone once the list underneath changes.
  useEffect(() => {
    commitRows(propRows);
    commitSelected(
      Math.min(selectedIndexRef.current, Math.max(0, propRows.length - 1)),
    );
    commitChecked(new Set());
  }, [propRows, commitRows, commitSelected, commitChecked]);

  // Keep the active row in view as the cursor moves.
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

  // An optimistic single-row removal can leave a stale id in the set until the
  // refresh lands, so everything selection-derived counts only ids that are
  // still visible rows.
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

  // Declared before runMove so runMove can list it as a dependency without a
  // temporal-dead-zone trap; undo does not reference runMove, so there's no cycle.
  const undo = useCallback(async () => {
    const act = lastAction.current;
    if (!act) return;
    lastAction.current = null;

    // Optimistic restore to the prior status/position.
    const current = rowsRef.current;
    if (act.removed) {
      const copy = current.slice();
      copy.splice(Math.min(act.index, copy.length), 0, {
        ...act.row,
        status: act.prevStatus,
      });
      commitRows(copy);
    } else {
      commitRows(
        current.map((r) =>
          r.id === act.id ? { ...r, status: act.prevStatus } : r,
        ),
      );
    }

    const res = await safeAction(setSubmissionStatus(act.id, act.prevStatus));
    if (!res.ok) {
      // The DB still holds the triaged status — take the optimistic restore
      // back, and re-arm the action (unless a newer one landed meanwhile) so
      // `z` can retry it.
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
      toast.error(res.error);
      return;
    }
    router.refresh();
  }, [router, commitRows]);

  const runMove = useCallback(
    async (index: number, next: Status, label: string, removes: boolean) => {
      const current = rowsRef.current;
      const row = current[index];
      if (!row) return;
      const prevStatus = row.status;

      // Optimistic
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

      const res = await safeAction(setSubmissionStatus(row.id, next));
      if (!res.ok) {
        // Revert rows AND cursor, and disarm undo — a `z` after a failed move
        // would otherwise re-insert the row a second time.
        if (lastAction.current?.id === row.id) lastAction.current = null;
        const reverted = rowsRef.current;
        if (removes) {
          const copy = reverted.slice();
          copy.splice(Math.min(index, copy.length), 0, row);
          commitRows(copy);
          commitSelected(Math.min(index, copy.length - 1));
        } else {
          commitRows(
            reverted.map((r) =>
              r.id === row.id ? { ...r, status: prevStatus } : r,
            ),
          );
        }
        toast.error(res.error);
        return;
      }
      router.refresh();
      toast(label, {
        id: 'inbox-triage',
        action: { label: 'Undo', onClick: () => void undo() },
      });
    },
    [router, undo, commitRows, commitSelected],
  );

  // NOT optimistic, unlike runMove: a multi-row rollback doesn't compose with
  // the single-level undo, so the list waits for the server and re-seeds. The
  // toast reports the count the UPDATE actually touched (rows that moved or
  // vanished concurrently fall out of RETURNING).
  const runBulk = useCallback(
    async (status: Status, label: string) => {
      const ids = rowsRef.current
        .filter((r) => checkedRef.current.has(r.id))
        .map((r) => r.id);
      if (ids.length === 0) return;
      setBulkPending(true);
      const res = await safeAction(setSubmissionsStatusBulk(ids, status));
      setBulkPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // A bulk move can't be represented by the single-level undo — disarm it.
      lastAction.current = null;
      commitChecked(new Set());
      router.refresh();
      const n = res.updated ?? ids.length;
      toast(`${label} — ${n} submission${n === 1 ? '' : 's'}`, {
        id: 'inbox-triage',
      });
    },
    [router, commitChecked],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          t.closest('input, textarea, select, a, button, [role="button"]'))
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
        // Only claim Escape while a selection exists; otherwise let it fall
        // through to whatever overlay owns it.
        if (checkedRef.current.size === 0) return;
        e.preventDefault();
        commitChecked(new Set());
        return;
      }

      const row = rowsRef.current[selectedIndexRef.current];
      if (!row) return;

      if (key === 'Enter' || key === 'o') {
        e.preventDefault();
        router.push(row.href);
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
      if (key === 'e') {
        e.preventDefault();
        if (view === 'inbox')
          void runMove(selectedIndexRef.current, 'archived', 'Archived', true);
        else if (view === 'archived')
          void runMove(selectedIndexRef.current, 'read', 'Moved to inbox', true);
        return;
      }
      if (key === 's') {
        e.preventDefault();
        if (view === 'inbox')
          void runMove(selectedIndexRef.current, 'spam', 'Marked as spam', true);
        else if (view === 'spam')
          void runMove(
            selectedIndexRef.current,
            'new',
            'Restored — not spam',
            true,
          );
        return;
      }
      if (key === 'r' && view === 'inbox') {
        e.preventDefault();
        const next: Status = row.status === 'new' ? 'read' : 'new';
        void runMove(
          selectedIndexRef.current,
          next,
          next === 'read' ? 'Marked read' : 'Marked unread',
          false,
        );
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, router, runMove, undo, commitSelected, commitChecked, toggleChecked]);

  const hintKeys: [string, string][] =
    view === 'inbox'
      ? [['j/k', 'move'], ['x', 'select'], ['e', 'archive'], ['s', 'spam'], ['r', 'read'], ['z', 'undo'], ['/', 'search']]
      : view === 'archived'
        ? [['j/k', 'move'], ['x', 'select'], ['e', 'unarchive'], ['z', 'undo'], ['/', 'search']]
        : [['j/k', 'move'], ['x', 'select'], ['s', 'not spam'], ['z', 'undo'], ['/', 'search']];

  return (
    <>
      <BulkActionBar
        view={view}
        count={checkedVisible.length}
        allChecked={allChecked}
        someChecked={checkedVisible.length > 0}
        pending={bulkPending}
        onToggleAll={toggleAll}
        onClear={() => commitChecked(new Set())}
        onAction={(status, label) => void runBulk(status, label)}
      />

      <ul className="divide-y divide-white/40 dark:divide-white/10">
        {rows.map((row, i) => (
          <InboxRow
            key={row.id}
            ref={i === selected ? selectedRef : undefined}
            href={row.href}
            name={row.name}
            email={row.email}
            secondary={row.secondary}
            dateLabel={row.dateLabel}
            status={row.status}
            selected={i === selected}
            checked={checkedIds.has(row.id)}
            onToggle={() => toggleChecked(row.id)}
          />
        ))}
      </ul>

      <p className="hidden border-t border-white/40 px-4 py-2.5 text-center text-[0.7rem] text-muted-foreground lg:block dark:border-white/10">
        {hintKeys.map(([k, label], i) => (
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
