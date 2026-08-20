'use client';

import { Dialog } from 'radix-ui';

import Kbd from '@/components/Admin/Kbd';
import GlassDialog from '@/components/Admin/GlassDialog';

/**
 * The full keyboard map for the tasks board.
 *
 * The board has always had these keys, but the only place they were written
 * down was a one-line legend under the table that renders at `lg` and up and
 * lists seven of them. This is the whole set, opened with `?` or by clicking
 * that legend — the keys are worth far more to a member who uses tasks daily
 * than a hidden feature can be.
 *
 * Grouped by what the member is doing, not by keycap: moving around the list
 * is a different intent from changing a task's state, and mixing the two is
 * what makes shortcut sheets unreadable.
 */
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Move around',
    keys: [
      ['j  ↓', 'Next task'],
      ['k  ↑', 'Previous task'],
      ['Esc', 'Clear the cursor'],
    ],
  },
  {
    title: 'Act on the task under the cursor',
    keys: [
      ['Enter  o', 'Open it for editing'],
      ['x', 'Tick it for a bulk action'],
      ['d', 'Mark it done'],
      ['a', 'Send it for approval'],
      ['z', 'Undo the last status change'],
    ],
  },
  {
    title: 'Anywhere in the dashboard',
    keys: [
      ['/', 'Jump to the task search'],
      ['Esc', 'Leave the field you are in and return to the list'],
      ['⌘K  Ctrl K', 'Open the command palette'],
      ['⌘B  Ctrl B', 'Collapse or expand the sidebar'],
      ['?', 'Open this list'],
    ],
  },
];

export default function TaskShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <GlassDialog open={open} onOpenChange={onOpenChange} maxWidth="26rem">
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        Keyboard shortcuts
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        The list keeps the cursor, so you can work a whole day of tasks without
        reaching for the mouse.
      </Dialog.Description>

      <div className="mt-5 flex flex-col gap-5">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {group.title}
            </h3>
            <dl className="mt-2 flex flex-col gap-1.5">
              {group.keys.map(([keys, label]) => (
                <div key={keys} className="flex items-baseline gap-3">
                  {/* Fixed-width key column so the descriptions line up into a
                      readable second column instead of ragging off each chip. */}
                  <dt className="flex w-28 shrink-0 flex-wrap gap-1">
                    {keys.split('  ').map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </dt>
                  <dd className="text-sm text-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </GlassDialog>
  );
}
