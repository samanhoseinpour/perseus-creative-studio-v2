// No 'use client' directive on purpose: a leaf of the client TaskBoard entry.
import AdminAvatar from '@/components/Admin/AdminAvatar';
import type { TaskGroupBy } from '@/lib/taskFilters';
import { cn } from '@/lib/utils';
import ClientMark from './ClientMark';
import TaskCard from './TaskCard';
import type { RowGroup, TaskRowData } from './types';

type Props = {
  rows: TaskRowData[];
  /** null when ?group is unset — one flat list. */
  groups: RowGroup[] | null;
  group: TaskGroupBy;
  /** TaskBoard's own tally formatter, passed rather than re-implemented so a
   *  card section and its table twin can never disagree about the numbers. */
  tally: (rows: TaskRowData[]) => string;
  checkedIds: ReadonlySet<string>;
  flashId: string | null;
  onToggle: (id: string) => void;
  onOpen: (row: TaskRowData) => void;
  onAddRevision: (row: TaskRowData) => void;
  onDuplicate: (row: TaskRowData) => void;
  onSaveAsTemplate: (row: TaskRowData) => void;
  onDelete: (row: TaskRowData) => void;
  onDone: (row: TaskRowData) => void;
  className?: string;
};

/**
 * The phone board: one card per task, no horizontal scroll anywhere.
 *
 * Which of this and the table renders is decided in CSS alone — `md:hidden`
 * here against `hidden md:block` on the table. Both trees are server-rendered,
 * so the first paint is right at every width with no JavaScript; a
 * `useMediaQuery` switch would SSR the desktop table onto a phone and then
 * snap. The page's other phone adaptations (the folded filter chips, the
 * collapsed add band) took the same route and added no URL state either — a
 * layout is not something a link should carry.
 */
export default function TaskCardList({
  rows,
  groups,
  group,
  tally,
  checkedIds,
  flashId,
  onToggle,
  onOpen,
  onAddRevision,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onDone,
  className,
}: Props) {
  // Once ANYTHING is selected a plain tap toggles rather than opening, and
  // every card's swipe stands down — the bulk bar owns the actions from
  // there. Derived once here rather than per card so all fifty agree.
  const selecting = checkedIds.size > 0;

  const card = (row: TaskRowData) => (
    <TaskCard
      key={row.id}
      row={row}
      checked={checkedIds.has(row.id)}
      selecting={selecting}
      highlight={row.id === flashId}
      onToggle={onToggle}
      onOpen={onOpen}
      onAddRevision={onAddRevision}
      onDuplicate={onDuplicate}
      onSaveAsTemplate={onSaveAsTemplate}
      onDelete={onDelete}
      onDone={onDone}
    />
  );

  if (!groups) {
    return (
      <ul className={cn('flex flex-col gap-2 p-3', className)}>
        {rows.map(card)}
      </ul>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4 p-3', className)}>
      {groups.map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 flex items-center gap-2.5 px-1">
            {group === 'client' ? (
              <ClientMark
                name={section.label}
                logo={section.logo || null}
                mark={section.key === 'internal'}
                size={20}
              />
            ) : group === 'member' ? (
              <AdminAvatar
                name={section.label}
                size={20}
                {...(section.avatar ?? {})}
              />
            ) : (
              // Deadline sections have no entity to picture — a dot keeps the
              // heading's baseline with the avatar/logo variants and carries
              // the urgency tint, exactly as the table's header row does.
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block size-2 shrink-0 rounded-full',
                  section.key === 'overdue'
                    ? 'bg-destructive'
                    : section.key === 'today'
                      ? 'bg-amber-500'
                      : 'bg-foreground/25',
                )}
              />
            )}
            <span className="min-w-0 truncate text-xs font-semibold text-foreground">
              {section.label}
            </span>
            <span className="ml-auto shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
              {tally(section.entries.map((e) => e.row))}
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {section.entries.map((entry) => card(entry.row))}
          </ul>
        </section>
      ))}
    </div>
  );
}
