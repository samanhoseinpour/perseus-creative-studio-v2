/**
 * The client-safe assignee vocabulary for /admin/tasks — the member shape a
 * task carries, the limits, and the label helpers the board and pickers share.
 *
 * Zero dependencies, like taskTagFields.ts and taskFilters.ts, so the board,
 * the quick-add band, the dialog, the bulk bar and the filter bar can all
 * import it without dragging zod or the schema into a client chunk. The zod
 * half lives in taskSchema.ts (the portfolioSchema split).
 *
 * THE COUNTING CONTRACT this vocabulary serves, stated once here because every
 * fold in the app has to obey exactly it:
 *
 *   - MINUTES are the task's own and split evenly across its assignees
 *     (splitMinutesAcross in taskFields.ts). A 3h shoot is 3h studio-wide
 *     however many people went, so no client report moves when a second name
 *     is added and the per-member bars still sum to the tile above them.
 *   - COUNTS credit each member fully — both people delivered the shoot — but
 *     the studio still counts the task ONCE, with the shared tally stated on
 *     screen beside the number rather than hidden.
 *
 * It is the exact mirror of the revision rule: there counts split and minutes
 * never do; here counts don't split and minutes do.
 */

/**
 * One member on a task.
 *
 * `id` is null for an offboarded account whose row survives on its name
 * snapshot — the tasks.assignee_id deletion policy, unchanged. That is why
 * every per-member fold keys on `id ?? \`name:${name}\`` rather than on the id.
 */
export type TaskAssigneeRef = {
  id: string | null;
  name: string;
};

/**
 * Per task. Eight matches TASK_TAG_MAX_PER_TASK and is comfortably past the
 * whole studio, so it bounds a hand-posted payload without ever bounding real
 * work — the point is that an array arriving from the client is finite, not
 * that anyone will reach it.
 */
export const TASK_ASSIGNEE_MAX = 8;

/**
 * Faces drawn in a board row's overlapped stack.
 *
 * A RECOGNITION aid, not a count — the count is carried by the text beside it
 * (assigneeSummary below), so five members show three faces and read "Ali +4"
 * with no contradiction between the two. Bounded because the Member column is
 * width-capped, for TASK_TAG_ROW_VISIBLE's reason: the picker and the task
 * dialog remain the full list.
 */
export const TASK_ASSIGNEE_ROW_VISIBLE = 3;

/**
 * The Member cell's hard width, as a literal class (the Tailwind scanner rule).
 *
 * Structural, not styling: the tasks table is auto-layout, where a cell's
 * min-content contribution is clamped by its own max-width. Without this a
 * task with four names widens the Member column and no other column can give
 * the space back — the same failure the Tags column shipped with.
 */
export const TASK_ASSIGNEE_STRIP_MAX = 'max-w-[11rem]';

/** Dedupe preserving first-seen order — the order names were added in, which
 *  is the order the fan-in returns and the order minutes apportion in. */
export function dedupeAssigneeIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Every name, in row order — the CSV cell and the "+N" tooltip both want the
 *  whole list rather than a summary. */
export function assigneeNames(list: readonly TaskAssigneeRef[]): string {
  return list.map((a) => a.name).join(', ');
}

/**
 * What the Member cell says in one line: a lone name, or the first name and
 * how many others. Never "2 members" — the first name is the useful half, and
 * a bare count makes a reader open the row to learn anything at all.
 */
export function assigneeSummary(list: readonly TaskAssigneeRef[]): string {
  if (list.length === 0) return 'Unassigned';
  if (list.length === 1) return list[0].name;
  return `${list[0].name} +${list.length - 1}`;
}

/** True when a task is worked by more than one person — the flag every
 *  "N shared" readout counts, so the phrase has one definition. */
export function isSharedTask(list: readonly TaskAssigneeRef[]): boolean {
  return list.length > 1;
}
