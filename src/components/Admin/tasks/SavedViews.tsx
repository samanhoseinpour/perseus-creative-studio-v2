// No 'use client' directive on purpose: a leaf of the client TaskFilterBar
// entry (TaskStatusMenu precedent) — adding it would make the function props
// a client-entry violation.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuBookmark, LuCheck, LuChevronDown, LuTrash2, LuUsers } from 'react-icons/lu';

import {
  deleteTaskView,
  saveTaskView,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { TASK_VIEW_NAME_MAX } from '@/lib/taskFields';
import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassDialog from '@/components/Admin/GlassDialog';
import { GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

export type SavedView = {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  mine: boolean;
  ownerName: string;
};

/**
 * Named filter combinations. The URL contract in taskFilters.ts is already the
 * complete list state, so a view is nothing but that query string plus a name —
 * which is why applying one is a plain navigation and no filter needs to know
 * this feature exists.
 *
 * A view is matched to the current URL by exact query-string equality. That
 * works because `taskListQs` emits a canonical form (fixed key order, defaults
 * dropped), so two identical filter sets can't produce two different strings.
 */
export default function SavedViews({
  views,
  basePath,
  currentQs,
  canSave,
}: {
  views: SavedView[];
  basePath: string;
  /** The canonical qs for what's on screen now (no leading '?'). */
  currentQs: string;
  /** False on a bare, unfiltered list — there'd be nothing to save. */
  canSave: boolean;
}) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [pending, setPending] = useState(false);

  const active = views.find((view) => view.query === currentQs) ?? null;

  function apply(view: SavedView) {
    router.replace(view.query ? `${basePath}?${view.query}` : basePath, {
      scroll: false,
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setPending(true);
    const res = await saveTaskView({
      name: trimmed,
      query: currentQs,
      shared,
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Could not save — try again.');
      return;
    }
    setNaming(false);
    setName('');
    setShared(false);
    toast.success(`Saved “${trimmed}”.`);
  }

  async function onDelete(view: SavedView) {
    const res = await deleteTaskView(view.id).catch(() => null);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Delete failed — try again.');
      return;
    }
    toast.success('View deleted.');
  }

  return (
    <>
      <DropdownMenu.Root>
        {/* The shared secondary pill, not a hand-rolled field well: Views is a
            FILTER, and every control beside it in this bar (Client, Category,
            Member, Priority, Date, sort, Group, Clear filters) is this same
            Button. It used to hand-write `h-8 rounded-lg`, which read as an
            editable field sitting in a row of pills. Comment kept OUTSIDE the
            asChild trigger: Radix runs React.Children.only on it. */}
        <DropdownMenu.Trigger asChild>
          <Button
            type="button"
            size="compact"
            variant="secondary"
            icon={LuChevronDown}
            iconPosition="right"
          >
            <LuBookmark aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="max-w-32 truncate">
              {active ? active.name : 'Views'}
            </span>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            data-lenis-prevent
            className={dropdownMenuContent}
          >
            <GlassRim />
            {views.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No saved views yet.
              </p>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-1 pr-1.5"
                >
                  <DropdownMenu.Item
                    className={cn(menuItem, 'flex-1 text-foreground')}
                    onSelect={() => apply(view)}
                  >
                    <LuCheck
                      aria-hidden="true"
                      className={cn(
                        'size-3.5 shrink-0',
                        // Check/spacer pair rather than conditional rendering:
                        // the labels must stay on one left edge (CellSelectMenu
                        // rule).
                        active?.id === view.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{view.name}</span>
                      {!view.mine && (
                        <span className="truncate text-[0.7rem] text-muted-foreground">
                          shared by {view.ownerName}
                        </span>
                      )}
                    </span>
                    {view.shared && view.mine && (
                      <LuUsers
                        aria-hidden="true"
                        className="ml-auto size-3 shrink-0 text-muted-foreground"
                      />
                    )}
                  </DropdownMenu.Item>
                  {view.mine && (
                    <button
                      type="button"
                      aria-label={`Delete ${view.name}`}
                      onClick={() => void onDelete(view)}
                      className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <LuTrash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
            {canSave && (
              <DropdownMenu.Item
                className={cn(
                  menuItem,
                  'border-t border-white/40 text-foreground dark:border-white/10',
                )}
                onSelect={() => {
                  setName(active?.name ?? '');
                  setShared(active?.shared ?? false);
                  setNaming(true);
                }}
              >
                <LuBookmark aria-hidden="true" className="size-3.5 shrink-0" />
                {active ? 'Update this view' : 'Save this view'}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <GlassDialog open={naming} onOpenChange={setNaming} maxWidth="24rem">
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          Save this view
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          The current filters, sorting and grouping, under a name you can come
          back to.
        </Dialog.Description>
        <form onSubmit={onSave} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="view-name" className="text-sm">
              Name
            </Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={TASK_VIEW_NAME_MAX}
              placeholder="e.g. My overdue"
              autoComplete="off"
              disabled={pending}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              disabled={pending}
              className="size-4 cursor-pointer accent-foreground"
            />
            Share with the team
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="compact"
              variant="secondary"
              disabled={pending}
              onClick={() => setNaming(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="compact"
              shimmer={false}
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Save view'}
            </Button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
}
