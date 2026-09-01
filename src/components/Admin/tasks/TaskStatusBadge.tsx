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
// The three SHIPPED statuses are INK at two weights, not three hues: done at
// 60%, and the two terminal stages both solid. The admin theme carries no
// chroma, so opacity is the house way to say "further along" (the Spend
// buckets, the report bars), and it survives dark mode and a colour-blind
// reader with no second palette. Rose and amber are spoken for (overdue, due
// today), so a hue was never available anyway.
//
// Two weights and not three, deliberately: delivered and posted are EXCLUSIVE
// terminal stages (TERMINAL_STATUSES in taskFields.ts), so a ramp between them
// would assert an order that does not exist — a posted task is not further
// along than a delivered one, it went a different way. What separates them is
// the word, which is the only thing that can. `done` stays lighter because it
// genuinely does come before both.
const STYLES: Record<TaskStatusSlug, string> = {
  todo: 'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  in_progress:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  needs_approval:
    'border-violet-500/40 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-400',
  done: 'border-transparent bg-foreground/60 text-background',
  delivered: 'border-transparent bg-foreground text-background',
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
