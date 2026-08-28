import { useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { toast } from 'sonner';

import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { Input } from '@/components/ui/input';
import {
  addTaskComment,
  deleteTaskComment,
  getTaskActivity,
  type TaskActivityItem,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import { TASK_COMMENT_MAX } from '@/lib/taskFields';
import { cn } from '@/lib/utils';

/**
 * The edit dialog's activity feed + comment composer. Loads through the
 * gate-first getTaskActivity action when the dialog opens (CommandPalette's
 * read-via-action recipe — the dialog opens without a navigation, so there is
 * no server render to ride). Everything arrives server-formatted; the parent
 * key-remounts this per task so state can never leak across rows. Rendered
 * OUTSIDE the task <form> — the composer is its own form.
 */
export default function TaskActivity({
  taskId,
  open,
}: {
  taskId: string;
  open: boolean;
}) {
  const [items, setItems] = useState<TaskActivityItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    (async () => {
      let res: Awaited<ReturnType<typeof getTaskActivity>> | null;
      try {
        res = await getTaskActivity(taskId);
      } catch {
        res = null;
      }
      if (cancelled) return;
      if (res?.ok) setItems(res.items);
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, taskId, reloadKey]);

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    const body = comment.trim();
    if (!body) return;
    setBusy(true);
    let res: Awaited<ReturnType<typeof addTaskComment>> | null;
    try {
      res = await addTaskComment(taskId, { body });
    } catch {
      res = null;
    }
    setBusy(false);
    if (!res?.ok) {
      toast.error(
        res && !res.ok && res.error === 'validation'
          ? Object.values(res.issues)[0]
          : 'Could not post the comment. Try again.',
      );
      return;
    }
    setComment('');
    setReloadKey((k) => k + 1);
  }

  async function onDeleteComment(id: string) {
    setBusy(true);
    let res: Awaited<ReturnType<typeof deleteTaskComment>> | null;
    try {
      res = await deleteTaskComment(id);
    } catch {
      res = null;
    }
    setBusy(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed. Try again.');
      return;
    }
    setItems((list) => list?.filter((item) => item.id !== id) ?? list);
  }

  return (
    <section className="mt-6 border-t border-white/40 pt-4 dark:border-white/10">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Activity
      </h3>

      {failed ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Could not load activity.{' '}
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="cursor-pointer font-medium text-foreground underline underline-offset-2"
          >
            Retry
          </button>
        </p>
      ) : items === null ? (
        <div className="mt-3 flex flex-col gap-2" aria-hidden="true">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-foreground/[0.07]" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-foreground/[0.07]" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <AdminAvatar
                name={item.actorName}
                size={22}
                {...(item.avatar ?? {})}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5">
                  <span className="font-medium text-foreground">
                    {item.actorName}
                  </span>{' '}
                  {item.kind === 'comment' ? (
                    <span className="text-muted-foreground">commented</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {item.headline}
                    </span>
                  )}
                  <span className="text-muted-foreground/70">
                    {' '}
                    · {item.timeLabel}
                  </span>
                </p>
                {item.body && (
                  <div className="mt-1 flex items-start gap-1.5">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 text-xs text-foreground">
                      {item.body}
                    </p>
                    {item.canDelete && (
                      <button
                        type="button"
                        aria-label="Delete this comment"
                        disabled={busy}
                        onClick={() => onDeleteComment(item.id)}
                        className="mt-1 shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <LuX aria-hidden="true" className="size-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={onPost} className="mt-3 flex items-center gap-2">
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          maxLength={TASK_COMMENT_MAX}
          autoComplete="off"
          disabled={busy}
          className={cn('h-9 flex-1 text-sm')}
        />
        <Button
          type="submit"
          size="small"
          variant="secondary"
          showIcon={false}
          disabled={busy || comment.trim().length === 0}
        >
          Post
        </Button>
      </form>
    </section>
  );
}
