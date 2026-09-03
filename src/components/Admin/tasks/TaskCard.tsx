// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskRow precedent). It holds gesture state through useSwipeReveal, which
// carries the directive itself.
import { memo } from 'react';
import { LuCheck, LuCornerDownRight, LuLink, LuTrash2 } from 'react-icons/lu';

import {
  formatMinutes,
  linkLabelFor,
} from '@/lib/taskFields';
import { advanceLabel, useSwipeReveal } from '@/hooks/useSwipeReveal';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { AssigneeStrip } from './AssigneeStrip';
import ClientMark from './ClientMark';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskRowMenu from './TaskRowMenu';
import StageDates from './StageDates';
import { taskCardBody } from './menu';
import TaskStatusBadge from './TaskStatusBadge';
import { TaskTagStrip } from './TaskTagChip';
import { DUE_TONE, VARIANCE_OVER_TONE, WAITING_LONG_TONE } from './tone';
import type { TaskRowData } from './types';

/** How many link names fit on one card line before the rest fold into "+N".
 *  Two, because the line shares the card with the tags above it and a third
 *  name pushes the fold marker off the edge on a 360px screen. */
const CARD_LINKS_SHOWN = 2;

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
  onAdvance: (row: TaskRowData) => void;
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
  onAdvance,
}: Props) {
  const swipe = useSwipeReveal({
    status: row.status,
    enabled: !selecting,
    onDelete: () => onDelete(row),
    onAdvance: () => onAdvance(row),
    onLongPress: () => onToggle(row.id),
  });
  // The reveal names the stage the swipe would move to, not a fixed "Done".
  // On a done row it names the QUESTION instead ("Deliver or post"), because
  // the two endings are exclusive and a flick cannot say which was meant.
  const advanceTo = advanceLabel(row.status);

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
              swipe.armed === 'advance'
                ? 'bg-foreground text-background'
                : 'bg-foreground/10 text-foreground',
            )}
          >
            <LuCheck className="size-4 shrink-0" />
            {advanceTo}
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
          // The dark half is INK, not the white/* FLIP token. `white` maps to
          // --surface (globals.css), which is #0c0c0d in dark — so the old
          // `dark:border-white/10 dark:bg-white/5` was a 10%-alpha near-black
          // hairline over a panel that is 55% of the same near-black, and a
          // darkening wash where a raised card was meant. Not faint:
          // arithmetically invisible. Ink inverts with the text, so the card is
          // lifted off its panel in both themes — the lesson glassField's
          // comment already spells out, and the one this card's own `checked`
          // branch below was already following.
          'border-white/45 bg-white/35 dark:border-foreground/15 dark:bg-foreground/[0.06]',
          // Its own dark: variants, not bare utilities. cn() is tailwind-merge
          // and `dark:` is a separate key, so a bare `bg-foreground/[0.08]`
          // would not REPLACE the base's dark: fill — both would be emitted,
          // and our dark variant compiles to a zero-specificity :where(), so
          // which one paints would be decided by Tailwind's own source order
          // rather than by anything stated here.
          checked &&
            'border-foreground/30 bg-foreground/[0.08] dark:border-foreground/30 dark:bg-foreground/[0.12]',
          !swipe.swiping && 'transition-transform duration-200 ease-out',
          highlight && 'motion-safe:animate-task-flash',
        )}
      >
        {/* inset-x-3, not the token's inset-x-0: this card has no
            overflow-hidden (adding it would clip inner focus rings), so a
            full-bleed rim would run past the rounded-xl corners. The gradient
            fades to transparent at both ends anyway, so the inset reads as
            nothing. And via-foreground, not the token's dark:via-white/25 —
            that is 25% NEAR-BLACK, right as a soft line on a panel over the
            shader, wrong as the lit top edge of a raised card. */}
        <GlassRim className="inset-x-3 dark:via-foreground/25" />
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
          className={cn('cursor-pointer', taskCardBody)}
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

          {row.links.length > 0 && (
            <span className="flex min-w-0 max-w-full items-center gap-1.5 text-xs text-muted-foreground">
              <LuLink aria-hidden="true" className="size-3 shrink-0" />
              {/* Plain text, not anchors — parentTitle's rule above: the card
                  body IS the tap target and interactive content cannot nest
                  inside a button. Opening the card opens the dialog, where
                  every link is real and reachable. */}
              <span className="min-w-0 truncate">
                {row.links
                  .slice(0, CARD_LINKS_SHOWN)
                  .map((link) => linkLabelFor(link))
                  .join(' · ')}
                {row.links.length > CARD_LINKS_SHOWN &&
                  ` · +${row.links.length - CARD_LINKS_SHOWN}`}
              </span>
            </span>
          )}

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
              {/* Server-composed, so the card and the table say the same
                  thing: one line on a done row or when the two days match,
                  two when the work reached the client on a later day. */}
              <StageDates
                parts={row.stageDates}
                className="justify-end text-[0.65rem] lowercase tabular-nums"
              />
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

        {/* Both controls are 44px columns rather than the 16px box and the
            24px glyph they contain — the button's pl-11/pr-11 reserves exactly
            this much, so text never runs beneath them.
            Both are TOP-anchored (h-11, not inset-y-0). Full height centres the
            box on the whole card, which on an eight-line one floats it down
            beside the tags — nowhere near the title it selects. At h-11 its
            centre is 22px, against the body's py-3 + half a text-sm line =
            22.15px, so box, title and the menu opposite sit on one line.
            data-no-swipe is how the gesture opts them out: the card body is
            itself a <button>, so a tag-based guard would refuse every swipe. */}
        <label
          data-no-swipe
          className="absolute top-0 left-0 flex h-11 w-11 cursor-pointer items-center justify-center"
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
