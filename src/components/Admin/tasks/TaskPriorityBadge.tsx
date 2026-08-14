import {
  TASK_PRIORITY_LABELS,
  type TaskPrioritySlug,
} from '@/lib/taskFields';
import { cn } from '@/lib/utils';

// TaskStatusBadge's pill shape in the priority palette: high is the alarm
// rose, medium the working amber (status shares it — both mean "attention"),
// low the calm sky. No pill for null — the cell renders a ghost instead.
const STYLES: Record<TaskPrioritySlug, string> = {
  high: 'border-rose-500/40 bg-rose-500/10 text-rose-700 backdrop-blur-sm dark:text-rose-400',
  medium:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  low: 'border-sky-500/40 bg-sky-500/10 text-sky-700 backdrop-blur-sm dark:text-sky-400',
};

export default function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPrioritySlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
        STYLES[priority],
        className,
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}
