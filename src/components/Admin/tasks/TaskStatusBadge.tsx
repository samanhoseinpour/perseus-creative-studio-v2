import {
  TASK_STATUS_LABELS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';

// TicketStatusBadge's pill, remapped to the task lifecycle: in_progress the
// working amber, needs_approval the waiting violet (paused on the client, not
// on us), todo the untouched frost. The non-inverted variants carry a frosted
// fill + rim so they read off the glass in both themes.
//
// The three SHIPPED statuses are one INK RAMP toward solid — done 60%,
// delivered 80%, posted full — not three hues. Two reasons it has to be a ramp:
// the ladder is ordered, and only a ramp shows that ordering at a glance, where
// three colours would just read as three unrelated states; and the admin theme
// carries no chroma, so an opacity ramp is the house way to measure something
// (the Spend buckets, the report bars). It also survives dark mode and a
// colour-blind reader with no second palette. Rose and amber are spoken for
// (overdue, due today), so a fourth hue was never available anyway.
//
// This does dim `done` from the solid fill it used to have. Deliberate: done
// is no longer the end of the line, and leaving it darkest than what follows
// would say the wrong thing about the order.
const STYLES: Record<TaskStatusSlug, string> = {
  todo: 'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  in_progress:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  needs_approval:
    'border-violet-500/40 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-400',
  done: 'border-transparent bg-foreground/60 text-background',
  delivered: 'border-transparent bg-foreground/80 text-background',
  posted: 'border-transparent bg-foreground text-background',
};

export default function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatusSlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
        STYLES[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
