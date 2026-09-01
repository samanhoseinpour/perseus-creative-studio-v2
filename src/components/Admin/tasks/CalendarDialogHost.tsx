'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import TaskDialog from './TaskDialog';
import type { TaskFormOptions, TaskRowData } from './types';

/**
 * The calendar's only client leaf: it opens the task editor for whichever row
 * `?task=<id>` named, and hands the rest of the page back to the server.
 *
 * The grid is ~150 links and no JavaScript. Making a chip open a dialog
 * directly would have meant hydrating every one of them; instead a chip is a
 * plain Link to this view's own URL plus `?task=`, the server resolves that
 * row through the reader the ⌘K palette already uses, and this component turns
 * the arrival into an open dialog. TaskBoard has done exactly this since the
 * palette shipped; the only thing that is new is that the calendar has no
 * other reason to run client code at all.
 *
 * The param is stripped as soon as it is consumed, and the ref that guards
 * re-runs RESETS when `openTask` returns to null. Both halves are load-bearing
 * and both were learned in TaskBoard: without the strip, any revalidation
 * re-render reopens a dialog somebody just closed; without the reset,
 * re-opening the SAME task silently no-ops and leaves `?task=` stuck in the
 * URL.
 */
export default function CalendarDialogHost({
  openTask,
  options,
  todayKey,
  basePath,
  filterQs,
}: {
  openTask: TaskRowData | null;
  options: TaskFormOptions;
  todayKey: string;
  basePath: string;
  /** The calendar's own query string, which the strip navigates back to so the
   *  reader keeps the month, the tab and the filters they were looking at. */
  filterQs: string;
}) {
  const router = useRouter();
  const [task, setTask] = useState<TaskRowData | null>(null);
  const [open, setOpen] = useState(false);
  const consumedId = useRef<string | null>(null);

  useEffect(() => {
    if (!openTask) {
      consumedId.current = null;
      return;
    }
    if (consumedId.current === openTask.id) return;
    consumedId.current = openTask.id;
    setTask(openTask);
    setOpen(true);
    router.replace(`${basePath}${filterQs ? `?${filterQs}` : ''}`, {
      scroll: false,
    });
  }, [openTask, basePath, filterQs, router]);

  return (
    <TaskDialog
      open={open}
      onOpenChange={setOpen}
      task={task}
      options={options}
      todayKey={todayKey}
    />
  );
}
