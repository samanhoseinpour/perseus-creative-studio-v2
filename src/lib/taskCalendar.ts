import { dayKeyIn } from '@/lib/calendar';
import {
  SHIPPED_STATUSES,
  TASK_PRIORITY_SLUGS,
  type TaskPrioritySlug,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import type { TaskDateField } from '@/lib/taskFilters';

/**
 * The folds behind the calendar view: which day a task lands on, how a day's
 * tasks are ordered inside its cell, and what a capped cell still owes the
 * reader.
 *
 * A zero-dependency leaf (the taskPredicates/digestEmail precedent — calendar
 * and taskFields are themselves leaves) so scripts/check-task-calendar.mts
 * reaches the REAL functions rather than a re-typed copy that drifts. It must
 * never grow a database read or an env lookup.
 *
 * Everything here is pure and takes the reader's zone as an argument. This
 * module names no timezone: src/lib/calendar.ts is still the one door.
 */

/**
 * How many chips a day cell shows before folding the rest into "+N more".
 *
 * Sized to the box, not to the data: seven columns across the `table` page
 * width leave a cell about 300px wide, which reads about five one-line chips
 * before the grid grows taller than a screen. The live board routinely puts 30
 * to 49 tasks on a single day, so the cell states the day's true count in its
 * header and is open about the chips being a sample. On an ordinary
 * hand-logged month of roughly seven a day, nothing folds at all.
 */
export const CALENDAR_CELL_CHIPS = 5;

/** The verb each field puts in the month band's readout, so the sentence
 *  describes what is actually drawn ("656 tasks completed in August", never
 *  "656 tasks this month" over a grid keyed on something else). */
export const CALENDAR_FIELD_VERB: Record<TaskDateField, string> = {
  date: 'dated',
  due: 'due',
  start: 'starting',
  completed: 'completed',
  created: 'created',
};

/** How the page's subtitle finishes the sentence "on ...", so the reader is
 *  told what the grid is a calendar of in plain words rather than by reading
 *  the field chip. */
export const CALENDAR_FIELD_PHRASE: Record<TaskDateField, string> = {
  date: 'the day it is dated',
  due: 'the day it is due',
  start: 'the day it starts',
  completed: 'the day it was completed',
  created: 'the day it was logged',
};

/** The least a row has to carry to be placed and ranked. Structural rather
 *  than the DB row type, so this leaf stays free of @/db. */
export type CalendarTaskLike = {
  id: string;
  title: string;
  status: TaskStatusSlug;
  priority: TaskPrioritySlug | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
  estimatedMinutes: number;
  actualMinutes: number | null;
};

/**
 * Which day a task sits on, for the field the grid is a calendar of.
 *
 * **This must mirror the clause `tasksWhere` applies to the same field**, and
 * `date` is the one that matters: it falls back start-ward exactly like the
 * SQL `coalesce(due_date, start_date)`. Drift here does not throw and does not
 * show in a filter test. It returns a row from the database that then lands in
 * no cell at all, so the grid quietly draws fewer tasks than the header above
 * it counts.
 *
 * Empty string when the row carries no such date. Inside a windowed read that
 * cannot happen (the window is what excludes the nulls), so a caller folding
 * over its own query never sees one.
 */
export function dayKeyForField(
  row: CalendarTaskLike,
  field: TaskDateField,
  tz: string,
): string {
  switch (field) {
    // coalesce(due_date, start_date) — the date the Dates column shows as the
    // row's own, and the reason quick-add's start-only tasks appear at all.
    case 'date':
      return row.dueDate ?? row.startDate ?? '';
    case 'due':
      return row.dueDate ?? '';
    case 'start':
      return row.startDate ?? '';
    // The two timestamptz columns are INSTANTS, so turning one into a day
    // needs the reader's zone. Folded in JS, never with a SQL AT TIME ZONE —
    // the rule every other windowed reader in this codebase follows.
    case 'completed':
      return row.completedAt ? dayKeyIn(tz, row.completedAt) : '';
    default:
      return dayKeyIn(tz, row.createdAt);
  }
}

/** What a task is worth in hours on the grid: the confirmed figure once there
 *  is one, the estimate until then. The same valuation every report uses. */
export function calendarMinutes(row: CalendarTaskLike): number {
  return row.actualMinutes ?? row.estimatedMinutes;
}

export type CalendarDayCell<T> = {
  /** Every task on this day, ranked. The cell shows a slice; this is the whole
   *  of it, and `rows.length` is what the day header states. */
  rows: T[];
  minutes: number;
};

/**
 * Rows to day cells, ranked inside each.
 *
 * Rows with no date for this field are dropped rather than pooled into an
 * off-grid bucket. There is deliberately no such bucket: the caller's window
 * already excludes them, so one could only ever render empty, and an empty
 * guarantee reads as a promise coming from somewhere it is not.
 */
export function foldDayCells<T extends CalendarTaskLike>(
  rows: readonly T[],
  field: TaskDateField,
  tz: string,
  todayKey: string,
): Map<string, CalendarDayCell<T>> {
  const cells = new Map<string, CalendarDayCell<T>>();
  for (const row of rows) {
    const key = dayKeyForField(row, field, tz);
    if (!key) continue;
    const cell = cells.get(key) ?? { rows: [], minutes: 0 };
    cell.rows.push(row);
    cell.minutes += calendarMinutes(row);
    cells.set(key, cell);
  }
  for (const cell of cells.values()) cell.rows = rankCellTasks(cell.rows, todayKey);
  return cells;
}

/** Rank buckets, most urgent first. Overdue and due-today are the two states
 *  the board already tints, so a cell that can only show five chips shows
 *  those five first. Below them, declared priority; below that, nothing to go
 *  on. */
function urgencyRank(row: CalendarTaskLike, todayKey: string): number {
  const open = !(SHIPPED_STATUSES as readonly string[]).includes(row.status);
  // Mirrors toRowData's dueState exactly, including that it is strictly
  // due-based: a start-only task is ongoing, never overdue.
  if (open && row.dueDate) {
    if (row.dueDate < todayKey) return 0;
    if (row.dueDate === todayKey) return 1;
  }
  const priority = row.priority
    ? TASK_PRIORITY_SLUGS.indexOf(row.priority)
    : -1;
  return priority >= 0 ? 2 + priority : 2 + TASK_PRIORITY_SLUGS.length;
}

/**
 * The order a day's chips appear in, and therefore which survive the cap.
 *
 * Deterministic to the last comparison (title, then id) so the same day draws
 * the same five chips on every read. A cell whose sample reshuffled between
 * renders would make "+44 more" read as a slot machine.
 */
export function rankCellTasks<T extends CalendarTaskLike>(
  rows: readonly T[],
  todayKey: string,
): T[] {
  return [...rows].sort((a, b) => {
    const rank = urgencyRank(a, todayKey) - urgencyRank(b, todayKey);
    if (rank !== 0) return rank;
    const title = a.title.localeCompare(b.title);
    return title !== 0 ? title : a.id.localeCompare(b.id);
  });
}

/**
 * Split a ranked day into what a cell shows and what it owes.
 *
 * `shown.length + hidden` is always the day's whole count, which is the point:
 * the header states the truth and this is what lets the "+N more" line add
 * back up to it. The house no-silent-truncation rule (foldLineCap on the money
 * screens, the digest email's "+ 22 more · 39h 30m").
 */
export function foldCellChips<T>(
  ranked: readonly T[],
  cap: number = CALENDAR_CELL_CHIPS,
): { shown: T[]; hidden: number } {
  // A single hidden row costs a whole line to say so, and that line is the
  // same height as the chip it replaced. Showing it is both shorter and more
  // useful.
  if (ranked.length <= cap + 1) return { shown: [...ranked], hidden: 0 };
  return { shown: ranked.slice(0, cap), hidden: ranked.length - cap };
}
