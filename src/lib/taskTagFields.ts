/**
 * The client-safe tag vocabulary for /admin/tasks — the chip tone palette,
 * limits, and the scope predicate the picker runs.
 *
 * Zero dependencies, like taskFields.ts and taskFilters.ts, so the board, the
 * quick-add band, the dialog and the filter bar can all import it without
 * dragging zod or the schema into a client chunk. The zod half lives in
 * taskSchema.ts (the portfolioSchema split).
 */

// ── Tones ───────────────────────────────────────────────────────────────────

/**
 * The chip palette. A tag's colour comes from its TYPE (task_tag_types.tone),
 * never from a per-tag choice: the vocabulary is what carries meaning, and a
 * free colour per tag would turn a dense board into confetti.
 *
 * A fixed key vocabulary rather than a stored colour value, for two reasons
 * that both bite: Tailwind's scanner cannot see a computed class name, so the
 * strings below must stay literal; and a hex picker has no dark-mode answer.
 * The jobCategoryIcons.ts precedent — unknown key falls back, never throws.
 *
 * Deliberately excludes every colour the task table already spends: `rose`
 * means overdue and `amber` means due-today / over-estimate, so a tag wearing
 * either would read as a warning on a row that has none.
 */
export const TASK_TAG_TONE_KEYS = [
  'sky',
  'emerald',
  'violet',
  'indigo',
  'teal',
  'fuchsia',
  'lime',
  'slate',
] as const;

export type TaskTagTone = (typeof TASK_TAG_TONE_KEYS)[number];

/** `chip` is the pill itself (soft tint, no border — the house tag look);
 *  `dot` is the solid swatch the type editor's colour row renders. */
export const TASK_TAG_TONES: Record<TaskTagTone, { chip: string; dot: string }> =
  {
    sky: {
      chip: 'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
      dot: 'bg-sky-500 dark:bg-sky-400',
    },
    emerald: {
      chip: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    },
    violet: {
      chip: 'bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
      dot: 'bg-violet-500 dark:bg-violet-400',
    },
    indigo: {
      chip: 'bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
      dot: 'bg-indigo-500 dark:bg-indigo-400',
    },
    teal: {
      chip: 'bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
      dot: 'bg-teal-500 dark:bg-teal-400',
    },
    fuchsia: {
      chip: 'bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300',
      dot: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    },
    lime: {
      chip: 'bg-lime-500/12 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300',
      dot: 'bg-lime-500 dark:bg-lime-400',
    },
    slate: {
      chip: 'bg-slate-500/12 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300',
      dot: 'bg-slate-500 dark:bg-slate-400',
    },
  };

/** The fallback tone. Reached when a row carries a key this build doesn't
 *  know — a rollback, or a tone retired from the palette above. */
export const TASK_TAG_TONE_FALLBACK: TaskTagTone = 'slate';

export function isTaskTagTone(value: unknown): value is TaskTagTone {
  return (
    typeof value === 'string' &&
    (TASK_TAG_TONE_KEYS as readonly string[]).includes(value)
  );
}

/** Never throws: an unknown tone renders slate rather than an empty chip. */
export function resolveTagTone(value: string | null | undefined): TaskTagTone {
  return isTaskTagTone(value) ? value : TASK_TAG_TONE_FALLBACK;
}

// ── Limits ──────────────────────────────────────────────────────────────────

export const TASK_TAG_NAME_MAX = 40;

/** A type's name is a SECTION HEADING, set in uppercase with wide tracking —
 *  it runs out of room long before a tag name does. */
export const TASK_TAG_TYPE_NAME_MAX = 24;

/** The one-line "The shape of the output" explainer under a heading. */
export const TASK_TAG_TYPE_HINT_MAX = 60;

/** Per task. Eight is past anything the Notion board ever carried (four was
 *  the busiest row) and still short enough that the row stays one line. */
export const TASK_TAG_MAX_PER_TASK = 8;

/** Per filter URL. Bounds `?tag=` so a hand-typed param can't build an
 *  unbounded IN list — the taskFilters Q_MAX_LENGTH instinct. */
export const TASK_TAG_MAX_IN_FILTER = 10;

/**
 * Chips rendered inline on a board row before the rest fold into "+N".
 *
 * TWO, not the six this shipped with. The Tags column is width-capped
 * (TASK_TAG_STRIP_MAX below) precisely so a heavily tagged task can never
 * widen the table, and six chips is more than that budget holds — the cap has
 * to be small enough that the strip fits without clipping, or "+N" itself
 * scrolls out of view. The picker and the task dialog remain the full list.
 */
export const TASK_TAG_ROW_VISIBLE = 2;

/**
 * The strip's hard width, as a literal class (the scanner rule again).
 *
 * This is what actually bounds the column, not the `<th>` width: the tasks
 * table is auto-layout, where a cell's min-content contribution is clamped by
 * its own max-width — so with this in place the Tags column can no longer be
 * widened by what is inside it, and the table stops growing sideways.
 */
export const TASK_TAG_STRIP_MAX = 'max-w-[13rem]';

/** Per chip inside that strip, so two 40-character names still fit. */
export const TASK_TAG_CHIP_MAX = 'max-w-[6rem]';

/** The `?tag=` value meaning "tasks carrying no tag at all" — the same
 *  sentinel grammar as `?priority=none` and the date facet's "No date". */
export const UNTAGGED = 'none';

// ── The shared shapes ───────────────────────────────────────────────────────

/**
 * A tag type — "Format", "Content", "Workflow", and whatever the studio adds.
 *
 * Rows, not an enum, since 2026-08-24: the team names its own axes. Two rules
 * survive from the enum days and are enforced server-side — the SLUG IS
 * IMMUTABLE after creation, and a type in use can only be archived, never
 * deleted (the `restrict` FK on task_tags.type_id is the race backstop).
 */
export type TaskTagType = {
  id: string;
  slug: string;
  name: string;
  hint: string | null;
  tone: TaskTagTone;
  archived: boolean;
  sortIndex: number;
};

/** What every surface needs to render a tag: the chip plus the picker's
 *  sectioning. `categoryIds` is empty for a GLOBAL tag (offered everywhere). */
export type TaskTagOption = {
  id: string;
  slug: string;
  name: string;
  typeId: string;
  tone: TaskTagTone;
  archived: boolean;
  /** Its TYPE's archived flag, carried per tag so the picker predicate below
   *  stays pure. Archiving a type retires every tag under it in one act, and
   *  the pickers are handed the whole vocabulary (archived included) so they
   *  can still render what a task already carries — which means the retirement
   *  has to be readable from the tag itself. */
  typeArchived: boolean;
  categoryIds: string[];
};

/**
 * The slim per-row projection — no scope, no archived flag, because a chip on
 * a task row renders the same whatever the vocabulary now says.
 *
 * Carries the resolved TONE rather than the type id: the chip must not need a
 * registry to draw itself, so the read layer denormalises the colour through
 * the join it already makes. That is also what keeps a task's chips correct
 * when its tag's type has since been archived.
 */
export type TaskTagChipData = {
  id: string;
  slug: string;
  name: string;
  tone: TaskTagTone;
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
      !tag.archived &&
      !tag.typeArchived &&
      (categoryId === null || tagInScope(tag, categoryId));
    if (offered) inScope.push(tag);
    else if (picked.has(tag.id)) other.push(tag);
  }
  return { inScope, other };
}

/**
 * Section an ordered tag list by type, in the types' own order — the picker's
 * and the manage dialog's one sectioning rule.
 *
 * `types` is the caller's ordered, non-archived list. A tag whose type is
 * missing from it (archived out from under the tag) contributes no section:
 * it is off the pickers by definition, and the surfaces that must still show
 * it — a task's own chips, the picker's "Other" bucket — never come through
 * here.
 */
export function sectionTags<T extends { typeId: string }>(
  tags: T[],
  types: readonly TaskTagType[],
): { type: TaskTagType; tags: T[] }[] {
  return types
    .map((type) => ({
      type,
      tags: tags.filter((t) => t.typeId === type.id),
    }))
    .filter((section) => section.tags.length > 0);
}

/** One row of the tag↔category scope table. */
export type TagScopeRow = { tagId: string; categoryId: string };

/**
 * Decide what changes when a CATEGORY's offered tag set is saved — the pure
 * half of setCategoryTagOffers, kept here beside tagInScope for the same
 * reason taskPredicates.ts exists: the two refusals below are invisible when
 * they misfire, so they have to be reachable by a check script without a
 * session or a database.
 *
 * `rows` must be every scope row for every tag in play — the union of the
 * tags this category currently offers and the tags it is being asked to
 * offer. That is what makes both questions below answerable without a third
 * query: a tag absent from `rows` entirely has no scope at all.
 *
 * `frozen` is the tag ids this operation must not touch in either direction.
 * ARCHIVED tags go here, and leaving them out is a real bug rather than a
 * nicety: an archived tag keeps its scope rows (that is what lets a restore
 * bring its categories back), but it is not rendered in the category pane, so
 * the client's "complete offered set" can never mention it. Without `frozen`
 * every save would read that silence as "stop offering it here" and either
 * delete a scope row nobody saw or — when this was the tag's last category —
 * refuse the save forever, naming a tag that is not on screen.
 *
 * Both refusals exist because an EMPTY scope means "offered everywhere", so
 * the schema simply cannot say "offered nowhere":
 *
 *  - `globals` — asked to offer a tag that currently has no scope rows.
 *    Granting it one would demote a tag that reaches everything into an
 *    enumerated one, which no category added later would pick up.
 *  - `orphans` — asked to drop a tag whose only row is this category. It
 *    would land on zero rows and reappear under EVERY category rather than
 *    none. Archive is the retirement path.
 */
export function planCategoryTagOffers({
  categoryId,
  rows,
  wanted,
  frozen = [],
}: {
  categoryId: string;
  rows: readonly TagScopeRow[];
  wanted: readonly string[];
  frozen?: readonly string[];
}): {
  globals: string[];
  orphans: string[];
  removing: string[];
  adding: string[];
} {
  const skip = new Set(frozen);
  const want = new Set([...wanted].filter((id) => !skip.has(id)));
  const here = new Set<string>();
  const anywhere = new Set<string>();
  const elsewhere = new Set<string>();
  for (const row of rows) {
    anywhere.add(row.tagId);
    if (skip.has(row.tagId)) continue;
    if (row.categoryId === categoryId) here.add(row.tagId);
    else elsewhere.add(row.tagId);
  }

  const globals = [...want].filter((id) => !anywhere.has(id));
  const removing = [...here].filter((id) => !want.has(id));
  const orphans = removing.filter((id) => !elsewhere.has(id));

  return {
    globals,
    orphans,
    // A refusal is all-or-nothing: the caller returns before writing, so the
    // lists below are only ever executed when both refusals came back empty.
    removing: removing.filter((id) => !orphans.includes(id)),
    adding: [...want].filter((id) => !here.has(id) && !globals.includes(id)),
  };
}

/** "Reels", "Reels +2" — the filter trigger and any collapsed chip strip. */
export function tagSummaryLabel(names: string[], fallback: string): string {
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

// ── Cross-island signal ─────────────────────────────────────────────────────

/**
 * The "open the tag manager" signal. TagPicker renders inside the quick-add
 * band, a board cell, the task dialog and the bulk bar — four islands with no
 * shared client parent — while the dialog itself is owned by
 * TasksHeaderActions. Same reasoning as ADMIN_SEARCH_OPEN_EVENT: a window
 * event beats prop-drilling one callback through four unrelated trees.
 */
export const TASK_TAGS_MANAGE_EVENT = 'perseus:tasks-manage-tags';

/** Ask the mounted TagManageDialog to open (no-op if none is listening). */
export function openTaskTagManager(): void {
  window.dispatchEvent(new Event(TASK_TAGS_MANAGE_EVENT));
}
