// No 'use client' directive: a leaf of whichever entry renders it (TaskRow
// precedent) — it holds no state, so it costs the client graph nothing extra
// where a server parent uses it. The one interactive piece, the "+N" fold's
// tooltip, is isolated in TaskTagOverflow.tsx for exactly that reason.
import TaskTagOverflow from '@/components/Admin/tasks/TaskTagOverflow';
import {
  TASK_TAG_CHIP_MAX,
  TASK_TAG_ROW_VISIBLE,
  TASK_TAG_STRIP_MAX,
  TASK_TAG_TONES,
  type TaskTagChipData,
} from '@/lib/taskTagFields';
import { cn } from '@/lib/utils';

/**
 * The one tag chip, shared by the board row, the edit dialog, the picker, the
 * bulk bar and the filter trigger — so a tag looks the same everywhere.
 *
 * Deliberately MICRO, and deliberately BORDERLESS: a soft tint of the tag's
 * colour with the same hue for the label, no rim, no dot, no icon. Two chips
 * have to sit inside a width-capped table cell without wrapping the row, and
 * a border on each one reads as a box drawn around a box wherever a chip sits
 * inside something else (a picker row, a checkbox toggle). Tint alone carries
 * the colour and stays legible on every glass surface, light and dark.
 *
 * Colour comes from the tag's TYPE, resolved to a `tone` by the read layer —
 * never from a per-tag choice, which would turn a dense board into confetti.
 */
export default function TaskTagChip({
  tag,
  className,
}: {
  tag: Pick<TaskTagChipData, 'name' | 'tone'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-px text-[0.65rem] leading-[1.35] font-medium whitespace-nowrap',
        TASK_TAG_TONES[tag.tone].chip,
        className,
      )}
    >
      {tag.name}
    </span>
  );
}

/**
 * A row's chip strip: a bounded, non-wrapping line of chips plus a "+N" fold.
 *
 * The width cap is the load-bearing part, not the visible cap. The tasks table
 * is auto-layout, where a cell's min-content contribution is CLAMPED BY ITS
 * OWN max-width — so `TASK_TAG_STRIP_MAX` here is what stops a heavily tagged
 * task from widening the Tags column and pushing every other column off the
 * right edge. `whitespace-nowrap` then keeps the row one line high, and the
 * per-chip `truncate` keeps two 40-character names inside the budget.
 *
 * The visible cap is deliberately small (two), because "+N" must itself fit
 * inside that width — a cap large enough to overflow it would hide the very
 * affordance that says there is more. The picker popover and the task dialog
 * remain the full-fidelity view.
 */
export function TaskTagStrip({
  tags,
  max = TASK_TAG_ROW_VISIBLE,
  className,
}: {
  tags: TaskTagChipData[];
  /** Surfaces with room — the digest's task list — raise this. */
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  const hidden = tags.slice(shown.length);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 overflow-hidden whitespace-nowrap',
        TASK_TAG_STRIP_MAX,
        className,
      )}
    >
      {shown.map((tag) => (
        <TaskTagChip
          key={tag.id}
          tag={tag}
          className={cn('min-w-0 shrink truncate', TASK_TAG_CHIP_MAX)}
        />
      ))}
      {hidden.length > 0 && (
        <TaskTagOverflow
          count={hidden.length}
          names={hidden.map((tag) => tag.name).join(', ')}
        >
          {hidden.map((tag) => (
            <TaskTagChip key={tag.id} tag={tag} />
          ))}
        </TaskTagOverflow>
      )}
    </span>
  );
}

/**
 * "What shipped": a tag → count readout, shared by the digest and the
 * internal month report.
 *
 * INTERNAL SURFACES ONLY. There is no `tone` prop and no print variant, so
 * like InternalKpiPanel it structurally cannot render onto the client month
 * report, its print sheet, or a /share link — which is the decision, not a
 * convention to remember. Whether a deliverable mix belongs in front of a
 * client is its own call, and it needs its own copy pass when it is made.
 */
export function TagMixStrip({
  label = 'What shipped',
  mix,
  className,
}: {
  label?: string;
  mix: { tag: TaskTagChipData; n: number }[];
  className?: string;
}) {
  if (mix.length === 0) return null;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5',
        className,
      )}
    >
      <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      {mix.map(({ tag, n }) => (
        <span key={tag.id} className="inline-flex items-center gap-1">
          <TaskTagChip tag={tag} />
          <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
        </span>
      ))}
    </div>
  );
}
