import { TASK_SORTS, type TaskSort } from '@/lib/taskFilters';

/**
 * Which column of the task table offers which order, and what each order is
 * called. A zero-dependency client-safe leaf (the taskTagFields.ts pattern), so
 * the table header, the Filters bar's Sort chip and
 * scripts/check-task-filters.mts all read ONE definition — otherwise the chip
 * and the header could name the same order two different ways, which on screen
 * reads as two different orders.
 *
 * Two rules hold it together, both pinned by the check script.
 *
 * A column offers a sort only when a task has EXACTLY ONE value in it. Tags and
 * Member are many-per-task, so ordering by "the first one alphabetically" would
 * file a shoot two people went on under whichever name sorts first, which is an
 * answer to a question nobody asked. Those two columns offer their filter and
 * no sort, and `group=member` already reads the board person by person. Keeping
 * every sort one-per-row is also what keeps every ORDER BY on `tasks` plus the
 * two 1:1 joins listTasks already carries, with no correlated subquery.
 *
 * And a token belongs to EXACTLY ONE column. Two claimants would light two
 * headers' arrows for one order; none would make a token unreachable from the
 * table. `newest`/`oldest` are the deliberate exception: they order by when
 * work was logged, or by when it finished on a shipped tab, and neither of
 * those is a column on screen, so they stay the BOARD's order and light
 * nothing.
 */
export const TASK_COLUMNS = [
  'title',
  'client',
  'category',
  'tags',
  'member',
  'priority',
  'status',
  'time',
  'dates',
] as const;

export type TaskColumn = (typeof TASK_COLUMNS)[number];

/** Byte-identical to the header cell's own text (and to the phone card's
 *  labels), because the Sort chip names an order by quoting them back. */
export const TASK_COLUMN_LABELS: Record<TaskColumn, string> = {
  title: 'Task',
  client: 'Client',
  category: 'Category',
  tags: 'Tags',
  member: 'Member',
  priority: 'Priority',
  status: 'Status',
  time: 'Time',
  dates: 'Dates',
};

/**
 * The orders each column offers, in menu order.
 *
 * `due` and `priority` are the EXISTING tokens rather than new spellings of
 * them: minting a `dates-soon` beside `due` would give one order two strings
 * and therefore two saved views, the trap the tag canonicalisation rule exists
 * to prevent. It also means the Overview's "due today" and "overdue" links,
 * which already send `sort=due`, light the Dates header on arrival.
 */
export const TASK_COLUMN_SORTS: Record<TaskColumn, readonly TaskSort[]> = {
  title: ['title-az', 'title-za'],
  client: ['client-az', 'client-za'],
  category: ['category-az', 'category-za'],
  tags: [],
  member: [],
  priority: ['priority', 'priority-low'],
  status: ['status-early', 'status-late'],
  time: ['time-most', 'time-least'],
  dates: ['due', 'due-late'],
};

/** The row's own words inside its column's menu, where the column has already
 *  named itself. Deliberately short of the column's noun: "Time · Most", not
 *  "Time · Most time". */
export const TASK_SORT_SHORT_LABELS: Record<TaskSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'title-az': 'A → Z',
  'title-za': 'Z → A',
  'client-az': 'A → Z',
  'client-za': 'Z → A',
  'category-az': 'A → Z',
  'category-za': 'Z → A',
  priority: 'High first',
  'priority-low': 'Low first',
  'status-early': 'Earliest stage',
  'status-late': 'Furthest along',
  'time-most': 'Most',
  'time-least': 'Least',
  due: 'Soonest',
  'due-late': 'Latest',
};

/**
 * Which way the column reads, for the header's arrow and its `aria-sort`.
 *
 * "Ascending" is the column's own axis, not the SQL: `priority-low` climbs
 * low → high and `due` climbs soonest → latest, both of which put the value a
 * reader thinks of as "first" at the top. Unset and undated sort LAST in both
 * directions (the unknown-last rule compareCommitments and rankCellTasks
 * follow), so neither direction is a mirror of the other.
 */
export const TASK_SORT_DIRECTION: Record<TaskSort, 'ascending' | 'descending'> =
  {
    newest: 'descending',
    oldest: 'ascending',
    'title-az': 'ascending',
    'title-za': 'descending',
    'client-az': 'ascending',
    'client-za': 'descending',
    'category-az': 'ascending',
    'category-za': 'descending',
    priority: 'descending',
    'priority-low': 'ascending',
    'status-early': 'ascending',
    'status-late': 'descending',
    'time-most': 'descending',
    'time-least': 'ascending',
    due: 'ascending',
    'due-late': 'descending',
  };

/** The column a sort belongs to, or null for the two board-level orders. */
export function columnForSort(sort: TaskSort): TaskColumn | null {
  for (const column of TASK_COLUMNS) {
    if (TASK_COLUMN_SORTS[column].includes(sort)) return column;
  }
  return null;
}

/** How the Sort chip names an order: the column, then the row's own words. The
 *  board's two orders carry no prefix, having no column to name. */
export function taskSortLabel(sort: TaskSort): string {
  const column = columnForSort(sort);
  const short = TASK_SORT_SHORT_LABELS[sort];
  return column ? `${TASK_COLUMN_LABELS[column]} · ${short}` : short;
}

/** The Sort chip's menu, sectioned so sixteen rows read as a handful of
 *  columns. The board's orders lead: they are the default and they belong to
 *  no column. */
export const TASK_SORT_SECTIONS: readonly {
  column: TaskColumn | null;
  sorts: readonly TaskSort[];
}[] = [
  { column: null, sorts: ['newest', 'oldest'] },
  ...TASK_COLUMNS.filter((c) => TASK_COLUMN_SORTS[c].length > 0).map((c) => ({
    column: c,
    sorts: TASK_COLUMN_SORTS[c],
  })),
];

/** Every token some column offers — the check script's inverse of
 *  {@link columnForSort}, and the guard that no order is unreachable. */
export const COLUMN_SORTS: readonly TaskSort[] = TASK_SORTS.filter(
  (s) => columnForSort(s) !== null,
);
