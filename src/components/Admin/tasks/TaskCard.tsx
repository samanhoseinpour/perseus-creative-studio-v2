// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskRow precedent). It holds gesture state through useSwipeReveal, which
// carries the directive itself.
import { memo } from 'react';
import { LuCheck, LuCornerDownRight, LuTrash2 } from 'react-icons/lu';

import { formatMinutes } from '@/lib/taskFields';
import { useSwipeReveal } from '@/hooks/useSwipeReveal';
import { cn } from '@/lib/utils';
import { AssigneeStrip } from './AssigneeStrip';
import ClientMark from './ClientMark';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskRowMenu from './TaskRowMenu';
import TaskStatusBadge from './TaskStatusBadge';
import { TaskTagStrip } from './TaskTagChip';
import { DUE_TONE, VARIANCE_OVER_TONE, WAITING_LONG_TONE } from './tone';
import type { TaskRowData } from './types';

type Props = {
  row: TaskRowData;
  checked: boolean;
  /** Anything at all is selected — a plain tap then TOGGLES rather than
   *  opening, and the swipe stands down (the bulk bar owns the actions). */
  selecting: boolean;
  highlight?: boolean;
  onToggle: (id: string) => void;
  onOpen: (row: TaskRowData) => void;
  onAddRevision: (row: TaskRowData) => void;
  onDuplicate: (row: TaskRowData) => void;
  onSaveAsTemplate: (row: TaskRowData) => void;
  onDelete: (row: TaskRowData) => void;
  onDone: (row: TaskRowData) => void;
};

/**
 * One task as an independent card — the phone rendering of TaskRow.
 *
 * Below 768px the eleven-column table is the wrong shape: you pan sideways to
 * reach Status, Time and Dates, and by the time you get there you have lost
 * which row the cell belonged to. A card keeps the task and its facts in one
 * object you can hold in your eye.
 *
 * It is deliberately READ-ONLY. The table's whole ergonomic is editing in
 * place, and reproducing eleven in-cell popovers on a 360px screen would be
 * worse than the scroll it replaces — so a tap opens TaskDialog, which is
 * already the full editor, and every field lives there.
 *
 * Fills are TINTED, never blurred: the card sits inside an already-frosted
 * GlassPanel and ~50 stacked backdrop-filters is pure paint cost (the
 * ClientsGrid rule).
 */
const TaskCard = memo(function TaskCard({
  row,
  checked,
  selecting,
  highlight,
  onToggle,
  onOpen,
  onAddRevision,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onDone,
}: Props) {
  const swipe = useSwipeReveal({
    status: row.status,
    enabled: !selecting,
    onDelete: () => onDelete(row),
    onDone: () => onDone(row),
    onLongPress: () => onToggle(row.id),
  });

  const dueTone = row.dueState ? DUE_TONE[row.dueState] : undefined;
  const dates = row.dueDate ? (
    <span className={cn('tabular-nums', dueTone)}>
      {row.startLabel ? `${row.startLabel} → ${row.dueLabel}` : row.dueLabel}
    </span>
  ) : row.startLabel ? (
    <span className="tabular-nums">{row.startLabel} →</span>
  ) : null;

  return (
    <li className="relative">
      {/* The revealed action, under the card and clipped to its radius. Which
          side shows follows the direction of travel: dragging LEFT uncovers
          the right edge, dragging RIGHT uncovers the left. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      >
        {swipe.dx > 0 && (
          <span
            style={{ width: swipe.dx }}
            className={cn(
              'absolute inset-y-0 left-0 flex items-center gap-2 overflow-hidden pl-4 text-xs font-medium whitespace-nowrap transition-colors',
              // Ink, not green: the admin theme carries no chroma, and the
              // house rule is that colour identifies while ink measures.
              swipe.armed === 'done'
                ? 'bg-foreground text-background'
                : 'bg-foreground/10 text-foreground',
            )}
          >
            <LuCheck className="size-4 shrink-0" />
            Done
          </span>
        )}
        {swipe.dx < 0 && (
          <span
            style={{ width: -swipe.dx }}
            className={cn(
              'absolute inset-y-0 right-0 flex items-center justify-end gap-2 overflow-hidden pr-4 text-xs font-medium whitespace-nowrap transition-colors',
              swipe.armed === 'delete'
                ? 'bg-destructive [color:#fafafa]'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            Delete
            <LuTrash2 className="size-4 shrink-0" />
          </span>
        )}
      </span>

      <div
        {...swipe.handlers}
        style={{ transform: `translate3d(${swipe.dx}px,0,0)` }}
        className={cn(
          // touch-pan-y hands the browser the vertical axis and keeps the
          // horizontal one for us. Without it a swipe fights the page scroll
          // — and on iOS, where there is no Lenis below 1024px, it is also
          // part of what keeps Safari's back gesture out of this.
          'relative touch-pan-y rounded-xl border select-none',
          'border-white/45 bg-white/35 dark:border-white/10 dark:bg-white/5',
          checked && 'border-foreground/30 bg-foreground/[0.08]',
          !swipe.swiping && 'transition-transform duration-200 ease-out',
          highlight && 'motion-safe:animate-task-flash',
        )}
      >
        <button
          type="button"
          onClick={() => {
            // A pointer sequence that swiped or long-pressed has been spent —
            // without this, every swipe would also open the task it acted on.
            if (swipe.consumedTap()) return;
            if (selecting) onToggle(row.id);
            else onOpen(row);
          }}
          aria-label={selecting ? `Select ${row.title}` : `Open ${row.title}`}
          className="flex w-full cursor-pointer flex-col items-start gap-1 py-3 pr-11 pl-11 text-left"
        >
          <span className="line-clamp-2 text-sm font-medium text-foreground">
            {row.title}
          </span>

          {/* BOTH, not one or the other — revisions nest, so a middle card
              really is a revision AND has revisions of its own. */}
          {row.parentTitle && (
            <span className="flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground">
              <LuCornerDownRight aria-hidden="true" className="size-3 shrink-0" />
              <span className="shrink-0">Revision of</span>
              {/* Plain text, not a link: the card body IS the tap target, and
                  interactive content cannot nest inside a button. */}
              <span className="min-w-0 truncate">{row.parentTitle}</span>
            </span>
          )}
          {row.revisionCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {row.revisionCount} revision{row.revisionCount === 1 ? '' : 's'}
              {row.revisionMinutesLabel && ` · ${row.revisionMinutesLabel}`}
            </span>
          )}

          {row.notes && (
            <span className="line-clamp-1 max-w-full text-xs text-muted-foreground">
              {row.notes}
            </span>
          )}

          <span className="flex min-w-0 max-w-full items-center gap-1.5 text-xs text-muted-foreground">
            <ClientMark
              name={row.clientLabel}
              logo={row.clientId ? row.clientLogo || null : null}
              mark={!row.clientId}
              size={16}
            />
            <span className="min-w-0 truncate">{row.clientLabel}</span>
            <span aria-hidden="true" className="shrink-0">
              ·
            </span>
            <span className="min-w-0 truncate">{row.categoryLabel}</span>
          </span>

          {/* max-w-none unwinds TASK_TAG_STRIP_MAX, and flex-wrap the
              nowrap: both are clamps on an AUTO-LAYOUT TABLE's min-content
              contribution, and a card has a whole row of width to give. */}
          {row.tags.length > 0 && (
            <TaskTagStrip
              tags={row.tags}
              max={4}
              className="max-w-none flex-wrap gap-1"
            />
          )}

          <span className="mt-0.5 flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
            <AssigneeStrip assignees={row.assignees} max={3} className="max-w-none" />
            <span className="flex shrink-0 flex-col items-end tabular-nums">
              <span>
                {formatMinutes(row.estimatedMinutes)}
                {row.actualMinutes != null && (
                  <span className="text-foreground">
                    {' / '}
                    {formatMinutes(row.actualMinutes)}
                  </span>
                )}
              </span>
              {row.varianceLabel && (
                <span
                  className={cn(
                    'text-[0.65rem]',
                    row.varianceState === 'over'
                      ? VARIANCE_OVER_TONE
                      : 'text-muted-foreground',
                  )}
                >
                  {row.varianceLabel}
                </span>
              )}
            </span>
          </span>

          <span className="flex w-full items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <TaskStatusBadge status={row.status} />
              {row.priority && <TaskPriorityBadge priority={row.priority} />}
            </span>
            <span className="flex shrink-0 flex-col items-end text-muted-foreground">
              {dates}
              {row.status === 'done' && row.completedDate && (
                <span className="text-[0.65rem] tabular-nums">
                  done {row.completedLabel}
                </span>
              )}
              {row.waitingLabel && (
                <span
                  className={cn(
                    'text-[0.65rem]',
                    row.waitingState === 'long'
                      ? WAITING_LONG_TONE
                      : 'text-muted-foreground',
                  )}
                >
                  {row.waitingLabel}
                </span>
              )}
            </span>
          </span>
        </button>

        {/* Both controls are full-height 44px columns rather than the 16px
            box and the 24px glyph they contain — the button's pl-11/pr-11
            reserves exactly this much, so text never runs beneath them.
            data-no-swipe is how the gesture opts them out: the card body is
            itself a <button>, so a tag-based guard would refuse every swipe. */}
        <label
          data-no-swipe
          className="absolute inset-y-0 left-0 flex w-11 cursor-pointer items-center justify-center"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(row.id)}
            aria-label={`Select ${row.title}`}
            className="size-4 accent-foreground"
          />
        </label>
        <span
          data-no-swipe
          className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center"
        >
          <TaskRowMenu
            title={row.title}
            onEdit={() => onOpen(row)}
            onAddRevision={() => onAddRevision(row)}
            onDuplicate={() => onDuplicate(row)}
            onSaveAsTemplate={() => onSaveAsTemplate(row)}
            onDelete={() => onDelete(row)}
          />
        </span>
      </div>
    </li>
  );
});

export default TaskCard;
