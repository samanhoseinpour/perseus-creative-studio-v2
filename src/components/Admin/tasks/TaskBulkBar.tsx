// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (BulkActionBar precedent) — adding it would make its function props a
// client-entry violation.
import { useEffect, useRef } from 'react';
import type { IconType } from 'react-icons';
import { LuCircle, LuCircleCheck, LuCircleDot } from 'react-icons/lu';

import type { TaskStatusSlug } from '@/lib/taskFields';
import { TASK_VIEW_STATUSES, type TaskView } from '@/lib/taskFilters';
import Button from '@/components/Button';

type BulkAction = { status: TaskStatusSlug; label: string; icon: IconType };

// Status moves only — bulk delete is deliberately absent (deleting stays
// one-at-a-time in the edit dialog behind its confirm). "Mark done" defaults
// actual hours to the estimate server-side; the toast says so.
const ACTIONS: BulkAction[] = [
  { status: 'todo', label: 'Mark to do', icon: LuCircle },
  { status: 'in_progress', label: 'In progress', icon: LuCircleDot },
  { status: 'done', label: 'Mark done', icon: LuCircleCheck },
];

/**
 * The select-all + bulk-move row above the task table. Always rendered (it
 * hosts the select-all checkbox); the action buttons appear once anything is
 * selected. On a single-status tab the action matching that tab is dropped —
 * it could only be a no-op. State lives in TaskBoard; this is presentation.
 */
export default function TaskBulkBar({
  view,
  count,
  allChecked,
  someChecked,
  pending,
  onToggleAll,
  onClear,
  onAction,
}: {
  view: TaskView;
  count: number;
  allChecked: boolean;
  someChecked: boolean;
  pending: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onAction: (status: TaskStatusSlug, label: string) => void;
}) {
  // `indeterminate` is a DOM property, not an attribute — set it imperatively.
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [someChecked, allChecked]);

  const viewStatuses = TASK_VIEW_STATUSES[view];
  const actions =
    viewStatuses.length === 1
      ? ACTIONS.filter((a) => a.status !== viewStatuses[0])
      : ACTIONS;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-4 py-2 sm:px-5 dark:border-white/10">
      <label className="flex cursor-pointer items-center">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          aria-label="Select all on this page"
          className="size-4 accent-foreground"
        />
      </label>
      {count > 0 ? (
        <>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {count} selected
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {actions.map(({ status, label, icon }) => (
              <Button
                key={label}
                type="button"
                size="small"
                variant="secondary"
                icon={icon}
                iconPosition="left"
                disabled={pending}
                onClick={() => onAction(status, label)}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              size="small"
              variant="secondary"
              showIcon={false}
              disabled={pending}
              onClick={onClear}
            >
              Clear
            </Button>
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Select all</span>
      )}
    </div>
  );
}
