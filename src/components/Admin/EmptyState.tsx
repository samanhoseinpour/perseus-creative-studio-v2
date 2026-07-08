import type { IconType } from 'react-icons';

import { glassChip } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The shared empty-state block for the admin: a glass-chip icon, a title, a line
 * of copy, and an optional caller-supplied action (a Link/Button). Pure server
 * component — no interactivity, imports only Glass tokens + cn.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          glassChip,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-xs text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
