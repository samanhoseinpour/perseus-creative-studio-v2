/**
 * The client-safe tag vocabulary for /admin/tasks — group slugs, labels, chip
 * tones, limits, and the scope predicate the picker runs.
 *
 * Zero dependencies, like taskFields.ts and taskFilters.ts, so the board, the
 * quick-add band, the dialog and the filter bar can all import it without
 * dragging zod or the schema into a client chunk. The zod half lives in
 * taskSchema.ts (the portfolioSchema split).
 */

// ── Groups ──────────────────────────────────────────────────────────────────

/**
 * How a tag is meant to be read. Three groups, fixed in code: they section the
 * picker into short scannable blocks AND assign the chip's colour, so nobody
 * makes a taste decision per tag and the board can't drift into confetti.
 * A per-tag colour picker was considered and rejected for exactly that reason.
 */
export const TASK_TAG_GROUPS = ['format', 'content', 'workflow'] as const;

export type TaskTagGroup = (typeof TASK_TAG_GROUPS)[number];

export function isTaskTagGroup(value: unknown): value is TaskTagGroup {
  return (
    typeof value === 'string' &&
    (TASK_TAG_GROUPS as readonly string[]).includes(value)
  );
}

export const TASK_TAG_GROUP_LABELS: Record<TaskTagGroup, string> = {
  format: 'Format',
  content: 'Content',
  workflow: 'Workflow',
};

/** One-line explanations, shown as the picker's section subtitles and in the
 *  manage dialog — the vocabulary only stays clean if its axes are stated. */
export const TASK_TAG_GROUP_HINTS: Record<TaskTagGroup, string> = {
  format: 'The shape of the output',
  content: 'What the thing is',
  workflow: 'The state of the work',
};

/**
 * Chip tones, one per group, in light/dark pairs. Deliberately avoids every
 * colour the task table already spends: `rose` means overdue and `amber` means
 * due-today / over-estimate, so a tag wearing either would read as a warning
 * on a row that has none.
 */
export const TASK_TAG_GROUP_TONES: Record<TaskTagGroup, string> = {
  format:
    'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  content:
    'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  workflow:
    'bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
};

// ── Limits ──────────────────────────────────────────────────────────────────

export const TASK_TAG_NAME_MAX = 40;

/** Per task. Eight is past anything the Notion board ever carried (four was
 *  the busiest row) and still short enough that the row stays one line. */
export const TASK_TAG_MAX_PER_TASK = 8;

/** Per filter URL. Bounds `?tag=` so a hand-typed param can't build an
 *  unbounded IN list — the taskFilters Q_MAX_LENGTH instinct. */
export const TASK_TAG_MAX_IN_FILTER = 10;

/** Chips rendered inline on a board row before the rest fold into "+N". Six
 *  keeps a pathological row from pushing the table hundreds of pixels wider,
 *  while the ordinary four or five always show in full. */
export const TASK_TAG_ROW_VISIBLE = 6;

/** The `?tag=` value meaning "tasks carrying no tag at all" — the same
 *  sentinel grammar as `?priority=none` and the date facet's "No date". */
export const UNTAGGED = 'none';

// ── The shared shape ────────────────────────────────────────────────────────

/** What every surface needs to render a tag: the chip plus the picker's
 *  grouping. `categoryIds` is empty for a GLOBAL tag (offered everywhere). */
export type TaskTagOption = {
  id: string;
  slug: string;
  name: string;
  group: TaskTagGroup;
  archived: boolean;
  categoryIds: string[];
};

/** The slim per-row projection — no scope, no archived flag, because a chip
 *  on a task row renders the same whatever the vocabulary now says. */
export type TaskTagChipData = {
  id: string;
  slug: string;
  name: string;
  group: TaskTagGroup;
};

// ── Scope ───────────────────────────────────────────────────────────────────

/**
 * Is this tag offered for that category? A tag with NO scope rows is global.
 *
 * Scope gates the PICKER, never the stored value: `setTaskTags` accepts an
 * out-of-scope tag rather than rejecting it, because a task's category can be
 * changed after tagging and enforcement would silently drop a member's labels
 * on that edit (the careers "degrade, don't reject" precedent). Tags already
 * on a task that fall outside its category surface in the picker's trailing
 * "Other" section — visible, not hidden.
 */
export function tagInScope(tag: TaskTagOption, categoryId: string): boolean {
  return tag.categoryIds.length === 0 || tag.categoryIds.includes(categoryId);
}

/**
 * Split the vocabulary for a picker: what this category offers (active tags
 * only), and the `selected` tags that fall outside it — including archived
 * ones, which must keep rendering on the tasks that already carry them.
 *
 * Three values of `categoryId`, all meaningful:
 *  - a category id → its scoped tags plus the globals (the normal case);
 *  - `''` (nothing chosen yet) → the globals only, which is the honest
 *    answer: the point of scoping is a short list, and "every tag in the
 *    studio" is the list it replaced;
 *  - `null` → NO scoping, the whole active vocabulary. Used by the bulk bar,
 *    where a mixed selection has no single category to follow.
 */
export function splitTagsForCategory(
  tags: TaskTagOption[],
  categoryId: string | null,
  selected: readonly string[],
): { inScope: TaskTagOption[]; other: TaskTagOption[] } {
  const picked = new Set(selected);
  const inScope: TaskTagOption[] = [];
  const other: TaskTagOption[] = [];
  for (const tag of tags) {
    const offered =
      !tag.archived && (categoryId === null || tagInScope(tag, categoryId));
    if (offered) inScope.push(tag);
    else if (picked.has(tag.id)) other.push(tag);
  }
  return { inScope, other };
}

/** Group an ordered tag list into its non-empty sections, in TASK_TAG_GROUPS
 *  order — the picker's and the manage dialog's one sectioning rule. */
export function groupTags<T extends { group: TaskTagGroup }>(
  tags: T[],
): { group: TaskTagGroup; tags: T[] }[] {
  return TASK_TAG_GROUPS.map((group) => ({
    group,
    tags: tags.filter((t) => t.group === group),
  })).filter((section) => section.tags.length > 0);
}

/** "Reels", "Reels +2" — the filter trigger and any collapsed chip strip. */
export function tagSummaryLabel(names: string[], fallback: string): string {
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}
