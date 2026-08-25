import AdminAvatar from '@/components/Admin/AdminAvatar';
import {
  TASK_ASSIGNEE_ROW_VISIBLE,
  TASK_ASSIGNEE_STRIP_MAX,
  assigneeNames,
  assigneeSummary,
} from '@/lib/taskAssigneeFields';
import { cn } from '@/lib/utils';
import type { RowAssignee } from './types';

/**
 * Who is on a task, as one line: the faces, and a name.
 *
 * Server-safe on purpose (no 'use client') — TaskTagChip's rule. It carries no
 * interactivity of its own, so the read-only report and print surfaces can
 * render it without dragging a client runtime onto the page.
 *
 * TWO DIFFERENT JOBS, deliberately not merged. The faces are recognition: you
 * know your teammates by their photo faster than by reading a name, and a
 * bounded row keeps the cell one line high. The TEXT is the count —
 * "Ali +2" — so two faces above a "+4" is not a contradiction, because the
 * faces never claimed to be exhaustive.
 *
 * FACES SIT BESIDE EACH OTHER, NEVER OVERLAPPED, and that is a fix rather than
 * a preference. The overlapped version wrapped every avatar in its own
 * `rounded-full ring-2 ring-[var(--card)]` span, and got two things wrong at
 * once. The wrapper's only child is an INLINE-BLOCK box, so it established a
 * line box and inherited its descender leading — a 20x24 rectangle, on which
 * `rounded-full` draws a PILL, sitting low behind a circular face. And
 * `--card` is the wrong ground anyway: board rows are translucent glass, so
 * the ring painted a grey disc that matched nothing beneath it. A 2px gap
 * needs no separator, so there is no ground left to guess at, and each face
 * keeps AdminAvatar's own concentric `ring-1 ring-border`.
 *
 * Which is also why AdminAvatar is the flex child DIRECTLY: as a flex item it
 * is blockified to an exact square box, so the ring can never drift off the
 * photo again. A single-member row is then byte-identical to the cell that
 * shipped before tasks could be shared.
 *
 * The WIDTH CAP is structural, the TaskTagStrip lesson: the tasks table is
 * auto-layout, so a cell's min-content contribution is clamped by its own
 * max-width. Without it a task crewed by several people widens the Member
 * column and no other column can give the space back.
 */
export function AssigneeStrip({
  assignees,
  max = TASK_ASSIGNEE_ROW_VISIBLE,
  className,
}: {
  assignees: readonly RowAssignee[];
  max?: number;
  className?: string;
}) {
  if (assignees.length === 0) {
    return <span className="text-muted-foreground">Unassigned</span>;
  }
  const faces = assignees.slice(0, max);

  return (
    <span
      // Every name, so the whole crew is reachable without opening the picker
      // — for a screen reader, and for the read-only surfaces that have none.
      aria-label={assigneeNames(assignees)}
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap',
        TASK_ASSIGNEE_STRIP_MAX,
        className,
      )}
    >
      <span className="flex shrink-0 items-center gap-0.5">
        {faces.map((who) => (
          <AdminAvatar
            key={who.id || `name:${who.name}`}
            name={who.name}
            size={20}
            {...(who.avatar ?? {})}
          />
        ))}
      </span>
      <span className="truncate">{assigneeSummary(assignees)}</span>
    </span>
  );
}
