// No 'use client' directive: a leaf of whichever entry renders it (TaskRow
// precedent) — it holds no state, so it costs the client graph nothing extra
// where a server parent uses it.
import {
  TASK_TAG_GROUP_TONES,
  TASK_TAG_ROW_VISIBLE,
  type TaskTagChipData,
} from '@/lib/taskTagFields';
import { cn } from '@/lib/utils';

/**
 * The one tag chip, shared by the board row, the edit dialog, the picker, the
 * bulk bar and the filter trigger — so a tag looks the same everywhere.
 *
 * Deliberately MICRO. Four or five chips have to sit on a single table row
 * without wrapping to a second line, which rules out padding, icons, dots and
 * a border; what is left is tinted text on a tint. Colour comes from the
 * tag's GROUP, never from a per-tag choice: the vocabulary is what carries
 * meaning, and a free colour picker would turn a dense board into confetti.
 */
export default function TaskTagChip({
  tag,
  className,
}: {
  tag: Pick<TaskTagChipData, 'name' | 'group'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-px text-[0.65rem] leading-[1.35] font-medium whitespace-nowrap',
        TASK_TAG_GROUP_TONES[tag.group],
        className,
      )}
    >
      {tag.name}
    </span>
  );
}

/**
 * A row's chip strip: every tag in one non-wrapping line.
 *
 * `whitespace-nowrap` on the container is what makes "four or five tags never
 * become two rows" STRUCTURAL rather than merely likely — the cell grows and
 * the table's own overflow-x-auto absorbs it. The visible cap exists for the
 * opposite case: one task carrying the full eight would otherwise push every
 * other column hundreds of pixels to the right.
 */
export function TaskTagStrip({
  tags,
  className,
}: {
  tags: TaskTagChipData[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, TASK_TAG_ROW_VISIBLE);
  const hidden = tags.length - shown.length;
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)}
      // The full set for the folded case, and for anyone reading the cell
      // through a tooltip rather than the picker.
      title={tags.map((t) => t.name).join(' · ')}
    >
      {shown.map((tag) => (
        <TaskTagChip key={tag.id} tag={tag} />
      ))}
      {hidden > 0 && (
        <span className="shrink-0 text-[0.65rem] font-medium text-muted-foreground">
          +{hidden}
        </span>
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

