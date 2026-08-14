import {
  TASK_STATUS_LABELS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';

// TicketStatusBadge's pill, remapped to the task lifecycle: done is the
// settled inverted state, in_progress the working amber, todo the untouched
// frost. The non-inverted variants carry a frosted fill + rim so they read
// off the glass in both themes.
const STYLES: Record<TaskStatusSlug, string> = {
  todo: 'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  in_progress:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  done: 'border-transparent bg-foreground text-background',
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
