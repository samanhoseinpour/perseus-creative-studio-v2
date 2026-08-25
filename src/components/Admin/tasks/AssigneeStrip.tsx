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
 * Who is on a task, as one line: an overlapped stack of faces and a name.
 *
 * Server-safe on purpose (no 'use client') — TaskTagChip's rule. It carries no
 * interactivity of its own, so the read-only report and print surfaces can
 * render it without dragging a client runtime onto the page.
 *
 * TWO DIFFERENT JOBS, deliberately not merged. The faces are recognition: you
 * know your teammates by their photo faster than by reading a name, and a
 * bounded stack keeps the cell one line high. The TEXT is the count —
 * "Ali +2" — so three faces above a "+4" is not a contradiction, because the
 * stack never claimed to be exhaustive. Merging them (a "+N" bubble inside the
 * stack as well) would put two different numbers side by side, counting two
 * different things.
 *
 * The WIDTH CAP is structural, the TaskTagStrip lesson: the tasks table is
 * auto-layout, so a cell's min-content contribution is clamped by its own
 * max-width. Without it a task crewed by four people widens the Member column
 * and no other column can give the space back.
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
      <span className="flex shrink-0 items-center -space-x-1.5">
        {faces.map((who, i) => (
          <span
            key={who.id || `name:${who.name}`}
            // The ring is what separates two overlapping faces; it paints the
            // card's own ground, so the stack reads as depth rather than as a
            // border drawn round each face. Later faces sit UNDER earlier ones
            // (descending z), so the leftmost — the name in the text — is the
            // one that stays fully visible.
            style={{ zIndex: faces.length - i }}
            className="relative rounded-full ring-2 ring-[var(--card)]"
          >
            <AdminAvatar name={who.name} size={20} {...(who.avatar ?? {})} />
          </span>
        ))}
      </span>
      <span className="truncate">{assigneeSummary(assignees)}</span>
    </span>
  );
}
