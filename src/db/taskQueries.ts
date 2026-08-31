import 'server-only';
import { cache } from 'react';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  searchAllTokens,
  taskSearchReach,
  tasksWhere,
} from '@/db/taskPredicates';
import {
  clients,
  reportNotes,
  reportShares,
  taskAssignees,
  taskCategories,
  taskEvents,
  taskTagCategories,
  taskTagLinks,
  taskTags,
  taskTagTypes,
  taskTemplateAssignees,
  taskTemplates,
  taskViews,
  tasks,
} from '@/db/schema';
import type { TaskCategory, TaskEvent } from '@/db/schema';
import { user } from '@/db/auth-schema';
import { sanitizeAreas } from '@/lib/adminAreas';
import type { SearchHit } from '@/lib/adminSearch';
import type { ProjectCategoryField } from '@/lib/portfolioFields';
import type { TaskAssigneeRef } from '@/lib/taskAssigneeFields';
import {
  REVISION_DEPTH_MAX,
  SHIPPED_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  type TaskLink,
  type TaskPrioritySlug,
  type TaskRepeatSlug,
  type TaskStatusSlug,
} from '@/lib/taskFields';

/**
 * `t2.status in ('done','delivered','posted')` for the two correlated
 * subqueries below, built from SHIPPED_STATUSES rather than typed out — those
 * two are the only places the shipped set is expressed in raw SQL, and a
 * hand-written copy is exactly how the constant would stop being the one door.
 */
const SHIPPED_SQL = sql`(${sql.join(
  SHIPPED_STATUSES.map((v) => sql`${v}`),
  sql`, `,
)})`;
import {
  resolveTagTone,
  type TaskTagChipData,
  type TaskTagTone,
  type TaskTagOption,
  type TaskTagType,
} from '@/lib/taskTagFields';
import {
  TASK_VIEW_STATUSES,
  applyTaskDateWindow,
  isShippedView,
  isUntaggedFilter,
  resolveTaskDateField,
  resolveTaskDateWindow,
  type TaskFilters,
  type TaskListParams,
  type TaskSort,
  type TaskView,
} from '@/lib/taskFilters';
import { dayKeyIn, dayStartIn, shiftDayKey, STUDIO_TZ } from '@/lib/calendar';

/**
 * Read helpers for the admin task surface (/admin/tasks + /admin/reports),
 * mirroring adminQueries.ts: one server-only module so the query surface
 * never reaches a client bundle. Writes live in `_actions/tasks.ts`.
 *
 * NOTE: these helpers don't authorize — pages and route handlers gate with
 * requireArea('tasks' | 'reports') before calling in. All-tasks visibility is
 * the design (trusted 7-person team), so nothing here scopes by viewer.
 */

// Guard id-by-string reads so a malformed id returns "not found" instead of
// throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Slug shape for client/category lookups (portfolioFields' PORTFOLIO_SLUG_RE
 *  is stricter about edges; URL params were already shape-checked upstream). */
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

export const TASKS_PER_PAGE = 25;

/**
 * Params → resolved query filters: the one slug→id hop (unique-index lookups).
 * Archived categories still resolve — history stays filterable; only the
 * create/edit paths reject them. Returns null when a provided slug matches no
 * row, so callers can render an honest empty page instead of silently
 * dropping the filter. The date facet resolves here too: `dfield` picks the
 * column (defaulting to completedAt on the Done view, the composite
 * due-or-start elsewhere) and `drange`/`from`/`to` pick the window.
 */
export async function resolveTaskFilters(
  tz: string,
  params: TaskListParams,
  view: TaskView,
): Promise<TaskFilters | null> {
  const filters: TaskFilters = {
    q: params.q || undefined,
    assigneeId: params.assignee || undefined,
    priority: params.priority || undefined,
  };

  const clientSlug =
    params.client && params.client !== 'internal' ? params.client : null;
  if (clientSlug && !SLUG_RE.test(clientSlug)) return null;
  if (params.category && !SLUG_RE.test(params.category)) return null;

  // The untagged sentinel needs no lookup — it is a shape of the join table,
  // not a tag anyone can name.
  const untagged = isUntaggedFilter(params.tags);
  const tagSlugs = untagged ? [] : params.tags.filter((s) => SLUG_RE.test(s));
  if (tagSlugs.length !== (untagged ? 0 : params.tags.length)) return null;

  // The slug→id hops are independent index reads — resolved together so a
  // client+category+tag filter costs one round trip of wall time instead of
  // three stacked ones (neon-http: every query is its own HTTPS round trip,
  // and this resolver gates the page's whole query fan-out).
  const [clientRows, categoryRows, tagRows] = await Promise.all([
    clientSlug
      ? db
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.slug, clientSlug))
          .limit(1)
      : null,
    params.category
      ? db
          .select({ id: taskCategories.id })
          .from(taskCategories)
          .where(eq(taskCategories.slug, params.category))
          .limit(1)
      : null,
    tagSlugs.length > 0
      ? db
          .select({ id: taskTags.id })
          .from(taskTags)
          .where(inArray(taskTags.slug, tagSlugs))
      : null,
  ]);

  if (params.client === 'internal') {
    filters.clientId = 'internal';
  } else if (clientSlug) {
    const row = clientRows?.[0];
    if (!row) return null;
    filters.clientId = row.id;
  }

  if (params.category) {
    const row = categoryRows?.[0];
    if (!row) return null;
    filters.categoryId = row.id;
  }

  // Archived tags still resolve (history stays filterable, like archived
  // categories). A slug matching NOTHING returns null so the page renders an
  // honest empty state rather than silently dropping the facet — and with
  // 'all' a partial match would otherwise widen the result set, which is the
  // opposite of what the URL asked for.
  if (untagged) {
    filters.untagged = true;
  } else if (tagSlugs.length > 0) {
    if (!tagRows || tagRows.length !== tagSlugs.length) return null;
    filters.tagIds = tagRows.map((r) => r.id);
    filters.tagMode = params.tagMode;
  }

  // The date facet: one control over four columns. Windows anchor on the
  // VIEWER's today at read time — the same clock that stamps dueState on rows,
  // so the filter and the tints can never disagree about what "overdue" means.
  const dateField = resolveTaskDateField(params.dfield, view);
  const dateWindow = resolveTaskDateWindow(tz, dateField, params);
  if (dateWindow) applyTaskDateWindow(filters, dateField, dateWindow);

  return filters;
}

// The one WHERE clause for task reads lives in taskPredicates.ts (imported
// above) — a guard-free leaf so scripts/verify-task-filters-db.mts can run the
// REAL builder against seeded fixtures instead of a re-typed copy that drifts.

/**
 * Task search for the ⌘K palette. Composes `taskSearchReach` — the SAME six
 * fields the board's `?q=` uses — rather than the title/notes pair it used to
 * carry on its own. That divergence was a real trap: a palette search for a
 * member name found nothing, while "View all in Tasks" handed the identical
 * string to `tasksWhere` and found plenty, so the palette read as broken while
 * the deep dive read as working. One definition of "task search", one place.
 *
 * Still zero JOINS at the top level: everything off-table rides a correlated
 * EXISTS, so the `limit` here caps rows rather than row-per-match. Hits
 * deep-link via ?task= — the tasks page resolves the id through its own gated
 * read, so the URL grants nothing. ILIKE seq-scans by design at this volume
 * (see _actions/search.ts for the future levers).
 */
export async function searchTasks(
  query: string,
  limit: number,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const match = searchAllTokens(q, taskSearchReach);
  if (!match) return [];
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      // The member name left the tasks row for task_assignees, so the sublabel
      // reads it through a correlated subquery rather than a join: the palette
      // caps at `limit` rows and a join would multiply them per assignee.
      // string_agg, not the fan-in, because one extra round trip per keystroke
      // is exactly what the palette cannot afford.
      assigneeNames: sql<string | null>`(
        select string_agg(a.member_name, ', ' order by a.created_at)
        from task_assignees a where a.task_id = ${tasks.id})`,
    })
    .from(tasks)
    .where(match)
    .orderBy(desc(tasks.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    entity: 'task' as const,
    id: r.id,
    label: r.title,
    sublabel: `${r.assigneeNames ?? 'Unassigned'} · ${TASK_STATUS_LABELS[r.status]}`,
    href: `/admin/tasks?task=${r.id}`,
  }));
}

/**
 * Comment search for the ⌘K palette — kind='comment' `body` ONLY. The events
 * `payload` jsonb carries field diffs (old titles, notes from/to values) and
 * must never be searched or returned: a diff would resurrect text its task no
 * longer shows. Keep the limit tight — the only index on task_events is
 * per-task, so this seq-scans the fastest-growing table.
 */
export async function searchTaskComments(
  query: string,
  limit: number,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await db
    .select({
      id: taskEvents.id,
      taskId: taskEvents.taskId,
      taskTitle: taskEvents.taskTitle,
      actorName: taskEvents.actorName,
      body: taskEvents.body,
    })
    .from(taskEvents)
    .where(
      and(
        eq(taskEvents.kind, 'comment'),
        isNotNull(taskEvents.taskId),
        // One OR per token, ANDed, over the single searchable column — so a
        // remembered phrase still finds the comment when the words are not
        // quite in the order they were typed.
        searchAllTokens(q, (like) => [ilike(taskEvents.body, like)]),
      ),
    )
    .orderBy(desc(taskEvents.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    entity: 'comment' as const,
    id: r.id,
    label: r.taskTitle ?? 'Task comment',
    sublabel: `${r.actorName}: ${(r.body ?? '').slice(0, 60)}`,
    href: `/admin/tasks?task=${r.taskId}`,
  }));
}

/**
 * Tags for a page of tasks, in ONE query — never one per row.
 *
 * A page is 25 rows, and neon-http makes every query its own HTTPS round
 * trip, so the choice is a single `where task_id = any(...)` folded in JS
 * versus a correlated json_agg riding the main select. The extra round trip
 * is measured in milliseconds and the fold is three lines; the aggregate
 * would complicate the one select shape that four other readers share.
 *
 * Returns a Map so callers can attach with `map.get(id) ?? []` — a task with
 * no tags simply has no key, which is the common case at the start.
 */
async function tagsForTasks(
  ids: string[],
): Promise<Map<string, TaskTagChipData[]>> {
  const out = new Map<string, TaskTagChipData[]>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({
      taskId: taskTagLinks.taskId,
      id: taskTags.id,
      slug: taskTags.slug,
      name: taskTags.name,
      tone: taskTagTypes.tone,
    })
    .from(taskTagLinks)
    .innerJoin(taskTags, eq(taskTagLinks.tagId, taskTags.id))
    // The chip's colour, denormalised here so TaskTagChip needs no registry.
    // Deliberately unfiltered by `archived` on either side: a task keeps the
    // labels it carries even after the tag or its whole type is retired.
    .innerJoin(taskTagTypes, eq(taskTags.typeId, taskTagTypes.id))
    .where(inArray(taskTagLinks.taskId, ids))
    // Vocabulary order, so a row's chips read in the same sequence the picker
    // offered them: type section first, then the tag's own order within it.
    .orderBy(
      asc(taskTagTypes.sortIndex),
      asc(taskTags.sortIndex),
      asc(taskTags.name),
    );
  for (const row of rows) {
    const list = out.get(row.taskId);
    const chip: TaskTagChipData = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tone: resolveTagTone(row.tone),
    };
    if (list) list.push(chip);
    else out.set(row.taskId, [chip]);
  }
  return out;
}

/** Attach the tag fan-in to a set of rows that already carry everything else. */
async function withTags<T extends { id: string }>(
  rows: T[],
): Promise<(T & { tags: TaskTagChipData[] })[]> {
  const byTask = await tagsForTasks(rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, tags: byTask.get(row.id) ?? [] }));
}

/**
 * Assignees for a page of tasks, in ONE query — the tagsForTasks contract, for
 * the same reason and with the same shape.
 *
 * The list could not carry these inline: `listTasks` rides `count(*) over ()`
 * and the tab badges ride a join-free COUNT, so a join against task_assignees
 * would multiply rows and quietly corrupt both totals. A fan-in leaves the
 * top-level select exactly as it was.
 *
 * Ordered created_at then name: the order people were added in, which is what
 * the Member cell reads left-to-right AND the order splitMinutesAcross
 * apportions a remainder in — so the same task always splits the same way.
 * The name is the tiebreak because a bulk insert stamps one timestamp.
 */
async function assigneesForTasks(
  ids: string[],
): Promise<Map<string, TaskAssigneeRef[]>> {
  const out = new Map<string, TaskAssigneeRef[]>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({
      taskId: taskAssignees.taskId,
      id: taskAssignees.userId,
      name: taskAssignees.memberName,
    })
    .from(taskAssignees)
    .where(inArray(taskAssignees.taskId, ids))
    .orderBy(asc(taskAssignees.createdAt), asc(taskAssignees.memberName));
  for (const row of rows) {
    const who: TaskAssigneeRef = { id: row.id, name: row.name };
    const list = out.get(row.taskId);
    if (list) list.push(who);
    else out.set(row.taskId, [who]);
  }
  return out;
}

/**
 * The same fan-in selected by a WINDOW rather than an id list.
 *
 * The leaderboard reads up to LEADERBOARD_SLICE_CAP done tasks; passing that
 * many uuids back as an `in (...)` list is a six-figure-byte query on a
 * transport where every statement is an HTTPS body. Re-stating the predicate
 * the slices were chosen by costs one join against an indexed range instead.
 */
async function assigneesForDoneWindow(
  since: Date,
  until: Date | null,
): Promise<Map<string, TaskAssigneeRef[]>> {
  const out = new Map<string, TaskAssigneeRef[]>();
  const rows = await db
    .select({
      taskId: taskAssignees.taskId,
      id: taskAssignees.userId,
      name: taskAssignees.memberName,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
    .where(
      and(
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, since),
        ...(until ? [lt(tasks.completedAt, until)] : []),
      ),
    )
    .orderBy(asc(taskAssignees.createdAt), asc(taskAssignees.memberName));
  for (const row of rows) {
    const who: TaskAssigneeRef = { id: row.id, name: row.name };
    const list = out.get(row.taskId);
    if (list) list.push(who);
    else out.set(row.taskId, [who]);
  }
  return out;
}

/**
 * Attach the assignee fan-in.
 *
 * Unlike withTags this runs for EVERY reader including listClientMonthTasks:
 * who worked an account is on the client report by design, so assignees live
 * on the base TaskListRow rather than behind the internal-only split.
 */
async function withAssignees<T extends { id: string }>(
  rows: T[],
): Promise<(T & { assignees: TaskAssigneeRef[] })[]> {
  const byTask = await assigneesForTasks(rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, assignees: byTask.get(row.id) ?? [] }));
}

/** What a page needs to render the revision relationship, beyond the plain
 *  `parentId` column every row already carries. */
export type RevisionMeta = {
  /** The revised task's title — '' when this row is not a revision. Present
   *  even if the parent is outside the page or on another status tab. */
  parentTitle: string;
  /** How many revisions hang off THIS row — the WHOLE chain below it, not
   *  just the next round, since a third round hangs off the second. 0 for
   *  most. */
  revisionCount: number;
  /** Just the next round down. Deleting this row detaches only these (the FK
   *  is `set null`, so a grandchild keeps pointing at its own parent), which
   *  is the number the delete confirm has to quote. */
  directRevisionCount: number;
  /** Their combined minutes — the figure that makes "6h 45m across 2
   *  revisions" sayable without a second fetch. */
  revisionMinutes: number;
};

const NO_REVISIONS: RevisionMeta = {
  parentTitle: '',
  revisionCount: 0,
  directRevisionCount: 0,
  revisionMinutes: 0,
};

/**
 * The revision fan-in for a page of tasks — TWO queries for the whole page,
 * never one per row (tagsForTasks' rule, and its reason: neon-http bills a
 * round trip per query, so the fold belongs in JS).
 *
 * Both halves are needed because the relationship is read from both ends: a
 * revision row shows the title of what it revises, and a deliverable shows how
 * many rounds it took. Neither can ride `taskListSelection` — the parent title
 * would need a self-join (harmless, but it would change the one select shape
 * five readers share) and the tally is an aggregate that would multiply rows
 * under `count(*) over ()`.
 *
 * Skips the queries entirely when the page carries no revision links at all,
 * which is the common case and stays free.
 */
/**
 * The titles of the tasks these ids name — the "Revision of ..." half of the
 * revision relationship, on its own.
 *
 * Exported because the client month report needs ONLY this half: a round whose
 * original shipped in an earlier month has to name what it revises, and the
 * recursive tally beside it in `revisionMetaFor` would be a second query
 * answering a question that page never asks.
 *
 * `clientId` scopes the lookup to one account (the 'internal' sentinel means
 * the null-client studio work, as everywhere else). That is a containment
 * rule, not an optimisation: the report renders these titles onto a sheet a
 * client reads, so a round mislinked across accounts must come back unnamed
 * rather than print another client's task title. Omit it for the board, which
 * reads across every account by design.
 */
export async function parentTitlesFor(
  parentIds: readonly string[],
  clientId?: string,
): Promise<Map<string, string>> {
  const ids = [...new Set(parentIds)];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(
      and(
        inArray(tasks.id, ids),
        clientId === 'internal'
          ? isNull(tasks.clientId)
          : clientId
            ? eq(tasks.clientId, clientId)
            : undefined,
      ),
    );
  return new Map(rows.map((row) => [row.id, row.title]));
}

async function revisionMetaFor(
  rows: readonly { id: string; parentId: string | null }[],
): Promise<Map<string, RevisionMeta>> {
  const out = new Map<string, RevisionMeta>();
  if (rows.length === 0) return out;

  const ids = rows.map((r) => r.id);
  const parentIds = [...new Set(rows.flatMap((r) => (r.parentId ? [r.parentId] : [])))];

  const idList = sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  const [tallies, parents] = await Promise.all([
    // A RECURSIVE walk, not a single hop. Revisions nest — a third round hangs
    // off the second, not off the original — so counting only direct children
    // would tell a deliverable it took "1 revision" while two rounds hang
    // below it, and would leave the later rounds' hours out of the figure
    // beside it. `depth` is bounded by REVISION_DEPTH_MAX, which the write
    // path enforces; the bound is repeated here so a row that predates it, or
    // a cycle that somehow reached the table, cannot spin this query.
    //
    // Costs nothing extra at the page level: still ONE query for every row on
    // screen, folded in JS (tagsForTasks' rule).
    db.execute<{
      root: string;
      n: number;
      direct_n: number;
      minutes: number;
    }>(sql`
      with recursive chain as (
        select t.id, t.id as root, 1 as depth,
               coalesce(t.actual_minutes, t.estimated_minutes) as minutes
          from tasks t
         where t.parent_task_id in (${idList})
        union all
        select t.id, c.root, c.depth + 1,
               coalesce(t.actual_minutes, t.estimated_minutes)
          from tasks t
          join chain c on t.parent_task_id = c.id
         where c.depth < ${REVISION_DEPTH_MAX}
      )
      select root,
             count(*)::int as n,
             -- Only the DIRECT rounds detach when this row is deleted: the FK
             -- is ON DELETE SET NULL, so a grandchild keeps pointing at its
             -- own parent. The delete confirm needs this number, not the
             -- chain total, or it overstates what a delete actually changes.
             count(*) filter (where depth = 1)::int as direct_n,
             coalesce(sum(minutes), 0)::int as minutes
        from chain group by root
    `),
    // Unscoped: the board and the dialog read across every account.
    parentTitlesFor(parentIds),
  ]);

  const titleById = parents;
  // The recursive walk starts one level BELOW each id, so `root` is already
  // the row that was asked about rather than the top of the whole chain.
  const tallyById = new Map(
    (tallies.rows ?? []).map((t) => [t.root, t] as const),
  );

  for (const row of rows) {
    const tally = tallyById.get(row.id);
    // A parent deleted between the page read and this one leaves the title
    // blank rather than throwing — the row still renders as a revision.
    const parentTitle = row.parentId ? (titleById.get(row.parentId) ?? '') : '';
    if (!tally && !parentTitle) continue;
    out.set(row.id, {
      parentTitle,
      revisionCount: tally?.n ?? 0,
      directRevisionCount: tally?.direct_n ?? 0,
      revisionMinutes: tally?.minutes ?? 0,
    });
  }
  return out;
}

/**
 * When each of these tasks entered `needs_approval` — the "waiting on the
 * client" clock.
 *
 * Read from `task_events`, NOT from a column, and that is deliberate:
 * migrations 0018/0019 added and then dropped `tasks.status_changed_at`, and
 * CLAUDE.md says not to reintroduce it. The status events already record the
 * exact moment with an actor attached, and they ride
 * `task_events_task_created_idx`, so the answer was already in the database.
 *
 * `distinct on` takes the NEWEST such event per task, which is what makes a
 * reopen-and-resubmit restart the clock instead of reporting the first time
 * the work was ever sent.
 *
 * Missing for rows that predate the feature or were moved in bulk before
 * events carried the payload — the caller falls back to `updated_at` and
 * hedges the wording, because a confident wrong number is worse than an
 * approximate right one.
 */
async function waitingSinceFor(ids: string[]): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  if (ids.length === 0) return out;
  const rows = await db.execute<{ task_id: string; created_at: Date }>(sql`
    select distinct on (${taskEvents.taskId})
           ${taskEvents.taskId} as task_id,
           ${taskEvents.createdAt} as created_at
      from ${taskEvents}
     where ${taskEvents.taskId} in ${ids}
       and ${taskEvents.kind} = 'status'
       and ${taskEvents.payload}->>'to' = 'needs_approval'
     order by ${taskEvents.taskId}, ${taskEvents.createdAt} desc
  `);
  for (const row of rows.rows ?? []) {
    if (row.task_id && row.created_at) {
      out.set(row.task_id, new Date(row.created_at));
    }
  }
  return out;
}

/**
 * Attach "how long has this been waiting for sign-off" to the rows that are
 * actually waiting. No query at all when the page holds none, which is most
 * pages of most tabs.
 */
export async function withWaiting<
  T extends { id: string; status: TaskStatusSlug; updatedAt: Date },
>(rows: T[]): Promise<(T & { waitingSince: Date | null; waitingExact: boolean })[]> {
  const waitingIds = rows
    .filter((row) => row.status === 'needs_approval')
    .map((row) => row.id);
  const since = await waitingSinceFor(waitingIds);
  return rows.map((row) => {
    if (row.status !== 'needs_approval') {
      return { ...row, waitingSince: null, waitingExact: false };
    }
    const exact = since.get(row.id);
    return {
      ...row,
      // updated_at is a fallback, not an equal: any later edit resets it, so
      // it can only ever UNDER-report the wait. Flagged so the label can say
      // "about" rather than asserting a day count it cannot stand behind.
      waitingSince: exact ?? row.updatedAt,
      waitingExact: exact !== undefined,
    };
  });
}

/** Attach the revision fan-in. Paired with {@link withTags} at every call
 *  site that renders the board, the dialog or the digest. */
async function withRevisions<T extends { id: string; parentId: string | null }>(
  rows: T[],
): Promise<(T & RevisionMeta)[]> {
  const byTask = await revisionMetaFor(rows);
  return rows.map((row) => ({ ...row, ...(byTask.get(row.id) ?? NO_REVISIONS) }));
}

/** The joined row every task view renders. `notes` rides along so the edit
 *  dialog can seed without a second fetch (a page is only ever 25 rows). */
export type TaskListRow = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatusSlug;
  priority: TaskPrioritySlug | null;
  clientId: string | null;
  clientName: string | null;
  clientSlug: string | null;
  /** Blob upload wins over the seeded static path (portfolio rule); both null
   *  for quick-created clients — render the initials fallback. */
  clientLogoBlobUrl: string | null;
  clientLogoStaticPath: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  siteCategory: ProjectCategoryField;
  /**
   * Everyone working this task, attached by the withAssignees fan-in below.
   *
   * On the BASE row rather than behind an internal-only split like tags: who
   * worked an account appears on the client report by design, so
   * listClientMonthTasks needs it. Ordered as they were added.
   */
  assignees: TaskAssigneeRef[];
  estimatedMinutes: number;
  actualMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  /**
   * Every file this task delivered, in the order the member listed them.
   *
   * On the BASE row like `assignees`, and for the same reason: links are
   * client-facing by design, so listClientMonthTasks — the reader behind the
   * month report, its print sheet and the /share link — has to carry them.
   * They ride the row's own jsonb column, so unlike tags and assignees there
   * is no fan-in and no extra round trip on any reader.
   */
  deliverableLinks: TaskLink[];
  /** The task this row revises, or null when it IS a deliverable. A plain
   *  column, no join — `parentId === null` is the definition of a delivered
   *  thing everywhere downstream. The parent's TITLE and a root's revision
   *  tally arrive separately, through the revisionMetaFor fan-in. */
  parentId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The same row with its tags attached by the fan-in below.
 *
 * A SEPARATE type, not a `tags` field on TaskListRow, and that split is the
 * privacy mechanism rather than a convention to remember: tags are internal
 * craft labels, so `listClientMonthTasks` — the reader behind the client
 * month report, its print sheet and the /share link — returns the BASE row
 * and therefore *cannot* leak them, in the same way InternalKpiPanel cannot
 * render onto the print page because it takes no `tone` prop. Widening
 * TaskListRow to carry tags would quietly undo that.
 */
export type TaskListRowWithTags = TaskListRow & { tags: TaskTagChipData[] };

/**
 * The board / dialog / digest row: tags AND the revision relationship. Kept a
 * step above TaskListRowWithTags for the same reason that type sits above
 * TaskListRow — `listClientMonthTasks` returns the base row, so neither the
 * internal tags nor the parent's title can reach a client surface, and the
 * report computes its own deliverable/revision split from the plain
 * `parentId` column instead.
 */
export type TaskBoardRow = TaskListRowWithTags &
  RevisionMeta & {
    /** When this task entered `needs_approval`; null on every other status. */
    waitingSince: Date | null;
    /** False when the instant came from `updated_at` rather than a real status
     *  event — the label hedges to "about N days" in that case. */
    waitingExact: boolean;
  };

const taskListSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  status: tasks.status,
  priority: tasks.priority,
  clientId: tasks.clientId,
  clientName: clients.name,
  clientSlug: clients.slug,
  clientLogoBlobUrl: clients.logoBlobUrl,
  clientLogoStaticPath: clients.logoStaticPath,
  categoryId: tasks.categoryId,
  categoryName: taskCategories.name,
  categorySlug: taskCategories.slug,
  siteCategory: taskCategories.siteCategory,
  // No assignee columns: they live in task_assignees and arrive through the
  // withAssignees fan-in, because a join here would multiply rows under
  // `count(*) over ()` and the join-free tab-badge COUNT.
  estimatedMinutes: tasks.estimatedMinutes,
  actualMinutes: tasks.actualMinutes,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
  deliverableLinks: tasks.deliverableLinks,
  parentId: tasks.parentTaskId,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

function taskOrder(view: TaskView, sort: TaskSort) {
  // 'due' surfaces deadline pressure: soonest due first, undated last,
  // newest-created as the tiebreak. 'priority' ranks high→low with no-priority
  // last, deadline pressure as the tiebreak. Otherwise the SHIPPED views (Done,
  // Delivered, Posted) order by when work finished, working views by when it
  // was logged.
  //
  // Every branch ends on the id: without a unique last key, rows sharing a
  // timestamp (a bulk edit, a seeded month) have no defined order, and
  // OFFSET paging can then show one row on two pages — or on none.
  if (sort === 'due') {
    return [
      sql`${tasks.dueDate} asc nulls last`,
      desc(tasks.createdAt),
      desc(tasks.id),
    ];
  }
  if (sort === 'priority') {
    return [
      sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 when 'low' then 2 else 3 end`,
      sql`${tasks.dueDate} asc nulls last`,
      desc(tasks.createdAt),
      desc(tasks.id),
    ];
  }
  const dir = sort === 'oldest' ? asc : desc;
  return isShippedView(view)
    ? [dir(tasks.completedAt), desc(tasks.id)]
    : [dir(tasks.createdAt), desc(tasks.id)];
}

export type TasksPage = {
  rows: TaskBoardRow[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of tasks for a status tab, filtered and sorted. `page` is clamped
 * to the available range (listSubmissions precedent): an out-of-bounds
 * `?page=` returns the last page rather than an empty view.
 */
export async function listTasks({
  view,
  page,
  perPage = TASKS_PER_PAGE,
  filters,
  sort = 'newest',
}: {
  view: TaskView;
  page: number;
  perPage?: number;
  filters?: TaskFilters;
  sort?: TaskSort;
}): Promise<TasksPage> {
  const where = tasksWhere(TASK_VIEW_STATUSES[view], filters);

  // One round trip in the common case (listSubmissions pattern): the filtered
  // total rides every row as a window count instead of a COUNT query awaited
  // first — this chain sets /admin/tasks TTFB on every render. Only a stale
  // out-of-range ?page= pays the rare clamp re-fetch below.
  const fetchPage = (p: number) =>
    db
      .select({
        ...taskListSelection,
        total: sql<number>`count(*) over ()::int`,
      })
      .from(tasks)
      .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(where)
      .orderBy(...taskOrder(view, sort))
      .limit(perPage)
      .offset((p - 1) * perPage);

  // Upper cap BEFORE the first fetch — an absurd ?page= would otherwise
  // overflow the int8 OFFSET and 500 the render (listSubmissions rule).
  const requested = Math.min(Math.max(1, Math.trunc(page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    // Past the end (or the filtered set emptied): clamp to the real last
    // page. The count stays join-free — tasksWhere is tasks-columns-only.
    const [{ n }] = await db.select({ n: count() }).from(tasks).where(where);
    total = n;
    safePage = Math.min(requested, Math.max(1, Math.ceil(n / perPage)));
    if (safePage !== requested) pageRows = await fetchPage(safePage);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // Extra round trips for the whole page's assignees, tags and revision links,
  // after the rows are known (all need their ids) — never inside the map,
  // which would be 25 queries each.
  const rows = await withWaiting(
    await withRevisions(
      await withTags(
        await withAssignees(
          pageRows.map(({ total, ...row }) => {
            void total; // the window count is not a row field
            return row;
          }),
        ),
      ),
    ),
  );
  return { rows, total, page: safePage, totalPages };
}

/**
 * Per-status counts for the tab badges — one GROUP BY folded in JS
 * (getTicketStatusCounts pattern). A completedAt window is stripped so every
 * tab counts the same filtered universe: narrowing delivery to a month is a
 * within-tab view, not a different dataset — and only done rows have the
 * column, so it would zero every other badge. Due/start/created windows are
 * kept: those apply to every tab, so the badges should reflect them.
 */
export async function countTasksByStatus(
  filters: TaskFilters = {},
): Promise<Record<TaskStatusSlug, number>> {
  const monthless: TaskFilters = {
    ...filters,
    completedSince: undefined,
    completedUntil: undefined,
  };
  const rows = await db
    .select({ status: tasks.status, n: count() })
    .from(tasks)
    .where(tasksWhere(TASK_VIEW_STATUSES.all, monthless))
    .groupBy(tasks.status);

  // Seeded FROM the vocabulary, not written out: a hand-listed object is how a
  // status added later silently gets no badge (the tab renders, reading zero).
  const counts = Object.fromEntries(
    TASK_STATUS_SLUGS.map((slug) => [slug, 0]),
  ) as Record<TaskStatusSlug, number>;
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/** A single joined task by id, or null if the id is malformed / missing. */
export async function getTaskById(id: string): Promise<TaskBoardRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(eq(tasks.id, id))
    .limit(1);
  if (!row) return null;
  return (
    await withWaiting(
      await withRevisions(await withTags(await withAssignees([row]))),
    )
  )[0];
}

/** Everything matching the working view — the CSV export (no pagination). */
export async function listTasksForExport({
  view,
  filters,
  sort = 'newest',
}: {
  view: TaskView;
  filters?: TaskFilters;
  sort?: TaskSort;
}): Promise<TaskBoardRow[]> {
  // withWaiting, not a hand-built stub: the export can include the
  // needs_approval tab, and a `waiting_days` column reading empty there would
  // be a silent hole rather than a decision.
  const rows = await db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(tasksWhere(TASK_VIEW_STATUSES[view], filters))
    .orderBy(...taskOrder(view, sort));
  return withWaiting(
    await withRevisions(await withTags(await withAssignees(rows))),
  );
}

/**
 * The digest source: done tasks since a local-midnight cutoff, newest first,
 * sharing the list's facet filters (month stripped — the digest's window IS
 * `since`, plus the optional `until` the weekly digest email uses for its exact
 * Mon–Sun week). Day + member grouping happens in the caller via dayKeyIn in
 * the appropriate zone (fold-in-JS pattern, no SQL AT TIME ZONE).
 */
export async function listRecentDone({
  since,
  until,
  filters = {},
  limit = 200,
}: {
  since: Date;
  until?: Date;
  filters?: TaskFilters;
  limit?: number;
}): Promise<TaskBoardRow[]> {
  // The digest is an INTERNAL surface (delivered work read by the team and the
  // Monday email), so it is one of the readers that gets the tags and the
  // revision links attached — unlike listClientMonthTasks below.
  // withWaiting rides along for the shared row type only — this reader is
  // done-only by construction, so it finds no waiting rows and issues no
  // query at all.
  const rows = await db
    .select(taskListSelection)
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(
      tasksWhere(SHIPPED_STATUSES, {
        ...filters,
        completedSince: since,
        completedUntil: until,
      }),
    )
    .orderBy(desc(tasks.completedAt))
    .limit(limit);
  return withWaiting(
    await withRevisions(await withTags(await withAssignees(rows))),
  );
}

export type DueReminderRow = {
  assigneeId: string;
  email: string;
  name: string;
  title: string;
  clientName: string | null;
  dueDate: string;
  /** The assignee's own zone, or null when never detected. */
  timezone: string | null;
};

/**
 * Open tasks due on or before `throughKey`, joined to LIVE accounts (deleted
 * assignees have no inbox) — the daily reminder cron's read.
 *
 * One row PER ASSIGNEE per task, which is exactly the shape the cron wants: a
 * shared task is a real obligation for each person on it, so both are reminded
 * and each is bucketed in their own zone. This is the one reader a join is
 * right for — it has no window count and no tab badge to corrupt.
 *
 * The bound is deliberately WIDER than any one member's today: each assignee's
 * own zone decides whether a row is overdue, due today, or not yet their
 * problem, and the cron splits them per member in JS (the fold-in-JS rule — no
 * SQL AT TIME ZONE). Every member's zone rides along for exactly that.
 */
export async function listOpenDueByAssignee(
  throughKey: string,
): Promise<DueReminderRow[]> {
  const rows = await db
    .select({
      assigneeId: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      // Read so the fold below can drop anyone who cannot open the board.
      role: user.role,
      areas: user.areas,
      title: tasks.title,
      clientName: clients.name,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    // Inner, so an offboarded member's snapshot row (user_id SET NULL) falls
    // out on its own — the deleted-assignee-has-no-inbox rule, unchanged.
    .innerJoin(user, eq(taskAssignees.userId, user.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(
      and(
        // Deliberately narrower than the "open" view: needs_approval is
        // excluded — a task waiting on client sign-off isn't actionable by
        // the member, so its due date must not nag them.
        inArray(tasks.status, ['todo', 'in_progress']),
        isNotNull(tasks.dueDate),
        lte(tasks.dueDate, throughKey),
      ),
    )
    .orderBy(asc(tasks.dueDate));
  // Only nag people who can actually OPEN /admin/tasks. The assignee picker
  // offers every account (listAssigneeOptions has no area filter) and a grant
  // can be revoked while work is still assigned, so without this a member is
  // reminded every morning about a page requireArea('tasks') bounces them from
  // — and it never stops, because the task stays open and stays theirs.
  // Filtered in JS, not SQL: the roster is seven people, the same reasoning as
  // taskAreaRecipients. The grant is the only test; whether they are behind is
  // decided per member later, in their own timezone.
  return rows.flatMap((r) =>
    r.dueDate &&
    (r.role === 'owner' || sanitizeAreas(r.areas).includes('tasks'))
      ? [{ assigneeId: r.assigneeId, email: r.email, name: r.name, timezone: r.timezone, title: r.title, clientName: r.clientName, dueDate: r.dueDate }]
      : [],
  );
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportClient = {
  id: string;
  slug: string;
  name: string;
  retainerMinutes: number | null;
  logoBlobUrl: string | null;
  logoStaticPath: string | null;
};

/** Client header for /admin/reports/[slug] — null on a malformed or unknown
 *  slug (the page notFound()s). */
export async function getReportClientBySlug(
  slug: string,
): Promise<ReportClient | null> {
  if (!SLUG_RE.test(slug)) return null;
  const [row] = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      retainerMinutes: clients.retainerMinutes,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
    })
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Client header by id — the share page's entry point (a token row holds
 *  client_id, not a slug). */
export async function getReportClientById(
  id: string,
): Promise<ReportClient | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      retainerMinutes: clients.retainerMinutes,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
    })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return row ?? null;
}

/** Share-token shape: base64url of 24 random bytes (mintReportShare). */
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export type ReportShareRow = {
  id: string;
  clientId: string;
  month: string;
  token: string;
  /** The minting admin's zone; null on links older than the column. */
  timezone: string | null;
  createdAt: Date;
};

const reportShareSelection = {
  id: reportShares.id,
  clientId: reportShares.clientId,
  month: reportShares.month,
  token: reportShares.token,
  // The zone the minting admin was reading in. The public share page has no
  // session to resolve one from, and month boundaries that moved with the
  // READER's clock would show the client different numbers than the admin who
  // sent the link. NULL on links minted before the column existed.
  timezone: reportShares.timezone,
  createdAt: reportShares.createdAt,
};

/** The active (unrevoked) share for one client-month, or null. */
/**
 * Which clients have a LIVE share link for one month, keyed by client id.
 *
 * The token is deliberately NOT selected: this feeds the roster, where the
 * only question is "have I sent this yet?" — and a public URL printed beside
 * eighty-eight client names is a link waiting to be shoulder-surfed or
 * screenshotted. Minting and copying stay in ReportShareDialog, one client at
 * a time. Rides the partial unique index (client, month) WHERE revoked_at IS
 * NULL, so at most one row per client comes back.
 */
export async function listActiveSharesForMonth(
  month: string,
): Promise<Map<string, { createdAt: Date; createdByName: string }>> {
  const rows = await db
    .select({
      clientId: reportShares.clientId,
      createdAt: reportShares.createdAt,
      createdByName: reportShares.createdByName,
    })
    .from(reportShares)
    .where(
      and(eq(reportShares.month, month), isNull(reportShares.revokedAt)),
    );
  return new Map(
    rows.map((row) => [
      row.clientId,
      { createdAt: row.createdAt, createdByName: row.createdByName },
    ]),
  );
}

export async function getActiveReportShare(
  clientId: string,
  month: string,
): Promise<ReportShareRow | null> {
  if (!UUID_RE.test(clientId)) return null;
  const [row] = await db
    .select(reportShareSelection)
    .from(reportShares)
    .where(
      and(
        eq(reportShares.clientId, clientId),
        eq(reportShares.month, month),
        isNull(reportShares.revokedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Resolve a public share token → its active share row. Malformed, unknown,
 *  and revoked all collapse to null — the share page 404s identically for
 *  each, so tokens can't be probed apart. */
export async function getReportShareByToken(
  token: string,
): Promise<ReportShareRow | null> {
  if (!SHARE_TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select(reportShareSelection)
    .from(reportShares)
    .where(and(eq(reportShares.token, token), isNull(reportShares.revokedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * One client's done tasks inside a month window, oldest first — one SELECT
 * riding tasks_client_completed_idx; the page folds totals with
 * foldMonthTotals (a month is at most a few hundred rows).
 */
export async function listClientMonthTasks(
  clientId: string,
  window: { since: Date; until: Date },
): Promise<TaskListRow[]> {
  // withAssignees, but deliberately NOT withTags: who worked the account is on
  // the client report by design, the craft labels are not.
  return withAssignees(
    await db
      .select(taskListSelection)
      .from(tasks)
      .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(
        tasksWhere(SHIPPED_STATUSES, {
          clientId,
          completedSince: window.since,
          completedUntil: window.until,
        }),
      )
      .orderBy(asc(tasks.completedAt)),
  );
}

/** Where one account's still-open work stands RIGHT NOW — not a month slice.
 *  `awaitingTitles` is capped: the callout names a few and counts the rest. */
export type ClientOpenSnapshot = {
  todo: number;
  inProgress: number;
  awaitingApproval: number;
  overdue: number;
  awaitingTitles: string[];
};

const OPEN_SNAPSHOT_TITLE_CAP = 5;

/**
 * Live open-work state for one client (or `'internal'`) — the source of both
 * the client-facing "waiting on your approval" callout and the admin-only
 * carry-over line. Deliberately NOT windowed: it answers "what is still owed",
 * which is a present-tense question, so the report surfaces render it only
 * while viewing the current month.
 *
 * One SELECT over the open statuses; the fold is JS, matching every other
 * report aggregate (a client's open list is a handful of rows).
 */
export async function listClientOpenSnapshot(
  clientId: string,
  tz: string,
): Promise<ClientOpenSnapshot> {
  const empty: ClientOpenSnapshot = {
    todo: 0,
    inProgress: 0,
    awaitingApproval: 0,
    overdue: 0,
    awaitingTitles: [],
  };
  if (clientId !== 'internal' && !UUID_RE.test(clientId)) return empty;

  const rows = await db
    .select({
      status: tasks.status,
      title: tasks.title,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(tasksWhere(['todo', 'in_progress', 'needs_approval'], { clientId }))
    .orderBy(asc(tasks.dueDate));

  // The reader's today, so the overdue tally here and the overdue tint on the
  // task list can never disagree.
  const today = dayKeyIn(tz, new Date());
  return rows.reduce((acc, row) => {
    if (row.status === 'todo') acc.todo += 1;
    else if (row.status === 'in_progress') acc.inProgress += 1;
    else {
      acc.awaitingApproval += 1;
      if (acc.awaitingTitles.length < OPEN_SNAPSHOT_TITLE_CAP) {
        acc.awaitingTitles.push(row.title);
      }
    }
    // Lexical compare on YYYY-MM-DD, the same rule dueState uses; a null due
    // date is never overdue.
    if (row.dueDate && row.dueDate < today) acc.overdue += 1;
    return acc;
  }, empty);
}

/** The month's highlights note for one client — '' when none saved. */
export async function getReportNote(
  clientId: string,
  month: string,
): Promise<string> {
  if (!UUID_RE.test(clientId)) return '';
  const [row] = await db
    .select({ body: reportNotes.body })
    .from(reportNotes)
    .where(
      and(eq(reportNotes.clientId, clientId), eq(reportNotes.month, month)),
    )
    .limit(1);
  return row?.body ?? '';
}

/**
 * Every completion instant for one client — the month switcher derives its
 * "months with activity" list by folding these through monthToken (fold in
 * JS, not SQL date_trunc, to keep the day boundary in one place).
 * `'internal'` selects null-client studio work (tasksWhere's sentinel).
 */
export async function listClientActivityDates(clientId: string): Promise<Date[]> {
  const internal = clientId === 'internal';
  if (!internal && !UUID_RE.test(clientId)) return [];
  const rows = await db
    .select({ completedAt: tasks.completedAt })
    .from(tasks)
    .where(
      and(
        internal ? isNull(tasks.clientId) : eq(tasks.clientId, clientId),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
      ),
    )
    .orderBy(desc(tasks.completedAt));
  return rows.flatMap((r) => (r.completedAt ? [r.completedAt] : []));
}

/** The narrow projection the trend folds read — completion instant plus the
 *  two minute columns, nothing else (a 12-month span can be a few thousand
 *  rows studio-wide; keep the wire weight down). */
export type DoneSlice = {
  completedAt: Date | null;
  actualMinutes: number | null;
  estimatedMinutes: number;
  /** Null = a deliverable. The trend bars are minutes (which take every row);
   *  the overview's "N tasks" readout counts deliverables. */
  parentId: string | null;
};

/**
 * Done-task slices since a cutoff, for the 12-month delivery trends. Month
 * bucketing happens in JS via dayKeyIn (the calendar-door rule — no
 * SQL AT TIME ZONE). `clientId`: a uuid narrows to that client (rides
 * tasks_client_completed_idx), `'internal'` to null-client studio work,
 * omitted = studio-wide.
 */
export async function listDoneSlices({
  clientId,
  since,
}: {
  clientId?: string;
  since: Date;
}): Promise<DoneSlice[]> {
  if (clientId && clientId !== 'internal' && !UUID_RE.test(clientId)) return [];
  const clauses = [inArray(tasks.status, [...SHIPPED_STATUSES]), gte(tasks.completedAt, since)];
  if (clientId === 'internal') clauses.push(isNull(tasks.clientId));
  else if (clientId) clauses.push(eq(tasks.clientId, clientId));
  return db
    .select({
      completedAt: tasks.completedAt,
      actualMinutes: tasks.actualMinutes,
      estimatedMinutes: tasks.estimatedMinutes,
      parentId: tasks.parentTaskId,
    })
    .from(tasks)
    .where(and(...clauses));
}

/** The leaderboard's projection: listDoneSlices' twin, plus the member
 *  identity and the due date the on-time rate needs. */
export type MemberDoneSlice = {
  completedAt: Date | null;
  /** Everyone who worked it. ONE SLICE PER TASK — the assignees ride on the
   *  slice rather than the reader flattening a join, so the studio tiles can
   *  still count deliverables by counting slices. */
  assignees: TaskAssigneeRef[];
  actualMinutes: number | null;
  estimatedMinutes: number;
  dueDate: string | null;
  categoryId: string;
  categoryName: string;
  /** Null = a deliverable, set = a revision of one. The leaderboard ranks on
   *  deliverables and counts revisions beside them; minutes take both. */
  parentId: string | null;
};

/**
 * Done-task slices for the studio leaderboard — one read per surface covering
 * the viewed month, the month before it (personal deltas + the reigning
 * champion) and the past-champion strip, all bucketed in JS by
 * dayKeyIn (the calendar-door rule — no SQL AT TIME ZONE). Rides
 * tasks_completed_idx; no assignee predicate, so no new index.
 *
 * `limit` is a runaway guard, not a page size: rows come back newest-first, so
 * if it ever bites it is the OLDEST months that fall off — the leaderboard
 * drops those past-champion entries rather than printing a partial month as a
 * real one (see dropTruncatedMonths in leaderboardData.ts).
 */
export async function listMemberDoneSlices({
  since,
  until,
  limit = 4000,
}: {
  since: Date;
  until?: Date;
  limit?: number;
}): Promise<MemberDoneSlice[]> {
  const clauses = [inArray(tasks.status, [...SHIPPED_STATUSES]), gte(tasks.completedAt, since)];
  if (until) clauses.push(lt(tasks.completedAt, until));
  const rows = await db
    .select({
      id: tasks.id,
      completedAt: tasks.completedAt,
      actualMinutes: tasks.actualMinutes,
      estimatedMinutes: tasks.estimatedMinutes,
      dueDate: tasks.dueDate,
      categoryId: tasks.categoryId,
      categoryName: taskCategories.name,
      parentId: tasks.parentTaskId,
    })
    .from(tasks)
    // categoryId is NOT NULL with a restrict FK, so the inner join can never
    // drop a completion — it only carries the display name across for the
    // per-category champions (listClientMonthTasks joins the same way).
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .where(and(...clauses))
    .orderBy(desc(tasks.completedAt))
    .limit(limit);

  // Fanned in by the WINDOW, not by an id list: `limit` is 4000 and that many
  // uuids in an `in (...)` is a six-figure-byte statement on a transport where
  // every query is an HTTPS body. The window is already indexed.
  //
  // Note the fan-in is deliberately NOT bounded by `limit`: when the runaway
  // guard bites, the extra map entries are for tasks that never became slices
  // and are simply never looked up.
  const byTask = await assigneesForDoneWindow(since, until ?? null);
  return rows.map(({ id, ...slice }) => ({
    ...slice,
    assignees: byTask.get(id) ?? [],
  }));
}

/**
 * Present-tense needs_approval tally per member — the leaderboard's "awaiting
 * sign-off" note. Deliberately unwindowed: a task waiting on a client is
 * current state, not a fact about the month it was worked in. Grouped on the
 * same two columns the member key is built from, so a deleted account's
 * snapshot rows still land on their line.
 *
 * countDistinct on the task id, not count(*): a task shared by two people is
 * one thing each of them is waiting on, and this reader is per member, so the
 * join can only ever contribute one row per member per task anyway — the
 * distinct states the intent rather than relying on that.
 */
export async function countAwaitingApprovalByMember(): Promise<
  { assigneeId: string | null; assigneeName: string; tasks: number }[]
> {
  return db
    .select({
      assigneeId: taskAssignees.userId,
      assigneeName: taskAssignees.memberName,
      tasks: countDistinct(tasks.id),
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    .where(eq(tasks.status, 'needs_approval'))
    .groupBy(taskAssignees.userId, taskAssignees.memberName);
}

/** The null-client (internal) rollup for one window — the roster's Perseus
 *  row and the studio summary strip. Same coalesce/countDistinct shape as
 *  listReportClients, aggregated in one row. */
export async function internalMonthRollup(window: {
  since: Date;
  until: Date;
}): Promise<{
  doneMinutes: number;
  doneTasks: number;
  doneRevisions: number;
  members: number;
}> {
  const [row] = await db
    .select({
      doneMinutes:
        sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
          Number,
        ),
      // Deliverables and revisions counted apart, minutes together: a revision
      // is real work (its hours belong in every total) but it is not a second
      // thing delivered. The FILTER form keeps both in the one aggregate walk.
      doneTasks:
        sql<number>`count(*) filter (where ${tasks.parentTaskId} is null)::int`.mapWith(
          Number,
        ),
      doneRevisions:
        sql<number>`count(*) filter (where ${tasks.parentTaskId} is not null)::int`.mapWith(
          Number,
        ),
      // Distinct PEOPLE, which no longer lives on the task row. A join to
      // task_assignees would multiply rows and corrupt every count(*) filter
      // beside this one, so the tally is a correlated subquery that restates
      // the predicate instead. The 'name:' prefix matches the JS member key
      // exactly, so an offboarded member counts as one person on both sides.
      members: sql<number>`(
        select count(distinct coalesce(a.user_id, 'name:' || a.member_name))
        from task_assignees a
        join tasks t2 on t2.id = a.task_id
        where t2.client_id is null
          and t2.status in ${SHIPPED_SQL}
          and t2.completed_at >= ${window.since}
          and t2.completed_at < ${window.until})::int`.mapWith(Number),
    })
    .from(tasks)
    .where(
      and(
        isNull(tasks.clientId),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    );
  return row ?? { doneMinutes: 0, doneTasks: 0, doneRevisions: 0, members: 0 };
}

export type ReportRosterRow = ReportClient & {
  doneMinutes: number;
  doneTasks: number;
  doneRevisions: number;
  members: number;
};

/**
 * The /admin/reports index roster: every client + the window's done
 * minutes/tasks/member tallies + retainer. The window and status conditions
 * live in the JOIN's ON-clause (one left join, no row multiplication —
 * listAdminUsers' documented rule); a client with no activity keeps zeros.
 */
export async function listReportClients(window: {
  since: Date;
  until: Date;
}): Promise<ReportRosterRow[]> {
  const rows = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      retainerMinutes: clients.retainerMinutes,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
      doneMinutes: sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
        Number,
      ),
      // Deliverables only — a revision round is not a second thing delivered.
      // Its minutes still land in doneMinutes above (see internalMonthRollup).
      doneTasks:
        sql<number>`count(*) filter (where ${tasks.id} is not null and ${tasks.parentTaskId} is null)::int`.mapWith(
          Number,
        ),
      doneRevisions:
        sql<number>`count(*) filter (where ${tasks.parentTaskId} is not null)::int`.mapWith(
          Number,
        ),
      // Distinct PEOPLE, which no longer lives on the task row. A join to
      // task_assignees would multiply rows and corrupt every count(*) filter
      // beside this one, so the tally is a correlated subquery that restates
      // the predicate instead. The 'name:' prefix matches the JS member key
      // exactly, so an offboarded member counts as one person on both sides. Correlated on clients.id,
      // which is the GROUP BY key, so it stays one scalar per roster row.
      members: sql<number>`(
        select count(distinct coalesce(a.user_id, 'name:' || a.member_name))
        from task_assignees a
        join tasks t2 on t2.id = a.task_id
        where t2.client_id = ${clients.id}
          and t2.status in ${SHIPPED_SQL}
          and t2.completed_at >= ${window.since}
          and t2.completed_at < ${window.until})::int`.mapWith(Number),
    })
    .from(clients)
    .leftJoin(
      tasks,
      and(
        eq(tasks.clientId, clients.id),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    )
    .groupBy(clients.id)
    .orderBy(asc(clients.name));
  return rows;
}

// ── Activity ────────────────────────────────────────────────────────────────

/** One task's activity feed, newest first — the edit dialog reads the last
 *  `limit` events via the gate-first getTaskActivity action. */
export async function listTaskEvents(
  taskId: string,
  limit = 100,
): Promise<TaskEvent[]> {
  if (!UUID_RE.test(taskId)) return [];
  return db
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(desc(taskEvents.createdAt))
    .limit(limit);
}

/** id→name for the client ids an activity feed references. Deleted rows drop
 *  out — the formatter falls back to a generic label. */
export async function clientNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(inArray(clients.id, valid));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** id→name for the category ids an activity feed references. */
export async function categoryNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select({ id: taskCategories.id, name: taskCategories.name })
    .from(taskCategories)
    .where(inArray(taskCategories.id, valid));
  return new Map(rows.map((r) => [r.id, r.name]));
}

// ── Chrome / pickers ────────────────────────────────────────────────────────

/** The viewer's open count (everything not done, assigned to them) — the
 *  sidebar badge and the overview tile. Includes needs_approval: the member
 *  still owns closing the task out once the client signs off. Personal, not
 *  team-global: the badge is a "you have work" signal, and someone else's
 *  task badging everyone's sidebar trained the team to ignore it. Team-wide
 *  numbers live inside /admin/tasks (tabs and tallies stay global). Rides
 *  tasks_assignee_created_idx. React cache() keys by argument, so layout +
 *  dashboard home still share one flight per request. */
export const countOpenTasks = cache(
  async (assigneeId: string): Promise<number> => {
    const [row] = await db
      .select({ n: count() })
      .from(tasks)
      .where(
        and(
          inArray(tasks.status, ['todo', 'in_progress', 'needs_approval']),
          // "On this task", not "owns it" — the badge counts everything the
          // viewer is crewed onto. EXISTS over task_assignees_user_idx.
          sql`exists (select 1 from task_assignees a
                where a.task_id = ${tasks.id} and a.user_id = ${assigneeId})`,
        ),
      );
    return row?.n ?? 0;
  },
);

/** The category vocabulary, picker-ordered. Create/edit pickers exclude
 *  archived entries; the filter dropdown and the manager include them. */
export async function listTaskCategories({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<TaskCategory[]> {
  return db
    .select()
    .from(taskCategories)
    .where(includeArchived ? undefined : eq(taskCategories.archived, false))
    .orderBy(asc(taskCategories.sortIndex), asc(taskCategories.name));
}

export type TaskCategoryWithCount = TaskCategory & { taskCount: number };

/** The manager's view: every category with its task tally (drives the
 *  archive-vs-delete affordance). */
export async function listTaskCategoriesWithCounts(): Promise<
  TaskCategoryWithCount[]
> {
  const rows = await db
    .select({ category: taskCategories, taskCount: count(tasks.id) })
    .from(taskCategories)
    .leftJoin(tasks, eq(tasks.categoryId, taskCategories.id))
    .groupBy(taskCategories.id)
    .orderBy(asc(taskCategories.sortIndex), asc(taskCategories.name));
  return rows.map((r) => ({ ...r.category, taskCount: r.taskCount }));
}

/**
 * The tag vocabulary with each tag's category scope, picker-ordered.
 *
 * Two queries, not a join with a fold: the tags table is ~30 rows and the
 * scope table a couple of hundred, so reading both whole and stitching in JS
 * is one predictable pair of round trips with no row multiplication — the
 * same call the category vocabulary makes at ~10 rows.
 *
 * `categoryIds` empty means GLOBAL (offered under every category), which is
 * how the workflow tags reach everywhere without a row per category.
 */
export async function listTaskTags({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<TaskTagOption[]> {
  const [tagRows, scopeRows] = await Promise.all([
    db
      .select({
        id: taskTags.id,
        slug: taskTags.slug,
        name: taskTags.name,
        typeId: taskTags.typeId,
        tone: taskTagTypes.tone,
        archived: taskTags.archived,
        typeArchived: taskTagTypes.archived,
      })
      .from(taskTags)
      .innerJoin(taskTagTypes, eq(taskTags.typeId, taskTagTypes.id))
      .where(
        includeArchived
          ? undefined
          : and(
              eq(taskTags.archived, false),
              // Archiving a TYPE takes its tags off every picker in one act —
              // the whole point of retiring an axis. tagsForTasks stays
              // unfiltered, so tasks already carrying them are untouched.
              eq(taskTagTypes.archived, false),
            ),
      )
      .orderBy(
        asc(taskTagTypes.sortIndex),
        asc(taskTags.sortIndex),
        asc(taskTags.name),
      ),
    db
      .select({
        tagId: taskTagCategories.tagId,
        categoryId: taskTagCategories.categoryId,
      })
      .from(taskTagCategories),
  ]);

  const scope = new Map<string, string[]>();
  for (const row of scopeRows) {
    const list = scope.get(row.tagId);
    if (list) list.push(row.categoryId);
    else scope.set(row.tagId, [row.categoryId]);
  }

  return tagRows.map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    typeId: tag.typeId,
    tone: resolveTagTone(tag.tone),
    archived: tag.archived,
    typeArchived: tag.typeArchived,
    categoryIds: scope.get(tag.id) ?? [],
  }));
}

/**
 * The tag TYPES, section-ordered — what sections every picker and the manage
 * dialog's headings. A handful of rows, read whole (taskCategories rule).
 */
export async function listTaskTagTypes({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<TaskTagType[]> {
  const rows = await db
    .select()
    .from(taskTagTypes)
    .where(includeArchived ? undefined : eq(taskTagTypes.archived, false))
    .orderBy(asc(taskTagTypes.sortIndex), asc(taskTagTypes.name));
  return rows.map((type) => ({
    id: type.id,
    slug: type.slug,
    name: type.name,
    hint: type.hint,
    tone: resolveTagTone(type.tone),
    archived: type.archived,
    sortIndex: type.sortIndex,
  }));
}

export type TaskTagTypeWithCount = TaskTagType & { tagCount: number };

/** The manager's view: every type, archived included, with the tally that
 *  drives the archive-vs-delete affordance (listTaskTagsWithCounts' twin — a
 *  type with tags on it can only be archived). */
export async function listTaskTagTypesWithCounts(): Promise<
  TaskTagTypeWithCount[]
> {
  const [types, counts] = await Promise.all([
    listTaskTagTypes({ includeArchived: true }),
    db
      .select({ typeId: taskTags.typeId, n: count() })
      .from(taskTags)
      .groupBy(taskTags.typeId),
  ]);
  const byType = new Map(counts.map((c) => [c.typeId, c.n]));
  return types.map((type) => ({ ...type, tagCount: byType.get(type.id) ?? 0 }));
}

export type TaskTagWithCount = TaskTagOption & { taskCount: number };

/** The manager's view: every tag, archived included, with the tally that
 *  drives the archive-vs-delete affordance (listTaskCategoriesWithCounts'
 *  twin — a tag with tasks on it can only be archived). */
export async function listTaskTagsWithCounts(): Promise<TaskTagWithCount[]> {
  const [tags, counts] = await Promise.all([
    listTaskTags({ includeArchived: true }),
    db
      .select({ tagId: taskTagLinks.tagId, n: count() })
      .from(taskTagLinks)
      .groupBy(taskTagLinks.tagId),
  ]);
  const byTag = new Map(counts.map((c) => [c.tagId, c.n]));
  return tags.map((tag) => ({ ...tag, taskCount: byTag.get(tag.id) ?? 0 }));
}

/** The tags currently on one task — the dialog's seed and setTaskTags' diff
 *  base. Ids only: the caller already holds the vocabulary. */
export async function listTagIdsForTask(taskId: string): Promise<string[]> {
  if (!UUID_RE.test(taskId)) return [];
  const rows = await db
    .select({ tagId: taskTagLinks.tagId })
    .from(taskTagLinks)
    .where(eq(taskTagLinks.taskId, taskId));
  return rows.map((r) => r.tagId);
}

/** Names for an id set — the task-activity feed's from→to rendering, which
 *  stores ids like every other change key (categoryNamesByIds' twin). */
export async function tagNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select({ id: taskTags.id, name: taskTags.name })
    .from(taskTags)
    .where(inArray(taskTags.id, valid));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * How often each tag appears across a filtered set — the internal "what did
 * we actually ship" readout (digest strip, internal month report). Ordered
 * by frequency, so the caller can take the top N and be done.
 *
 * Deliberately has no client-facing caller: the tag mix is an internal craft
 * breakdown, and the client month report reads listClientMonthTasks, which
 * cannot carry tags at all.
 */
export async function tagMixFor(
  statuses: readonly TaskStatusSlug[],
  filters: TaskFilters = {},
): Promise<{ id: string; name: string; tone: TaskTagTone; n: number }[]> {
  const rows = await db
    .select({
      id: taskTags.id,
      name: taskTags.name,
      tone: taskTagTypes.tone,
      n: count(taskTagLinks.taskId),
    })
    .from(taskTagLinks)
    .innerJoin(taskTags, eq(taskTagLinks.tagId, taskTags.id))
    .innerJoin(taskTagTypes, eq(taskTags.typeId, taskTagTypes.id))
    .innerJoin(tasks, eq(taskTagLinks.taskId, tasks.id))
    .where(tasksWhere(statuses, filters))
    .groupBy(taskTags.id, taskTags.name, taskTagTypes.tone, taskTags.sortIndex)
    .orderBy(desc(count(taskTagLinks.taskId)), asc(taskTags.sortIndex));
  return rows.map((row) => ({ ...row, tone: resolveTagTone(row.tone) }));
}

/** Slim roster for the assignee picker, A→Z (listClientOptions' twin —
 *  listAdminUsers is heavier than a picker needs). `email` + `image` ride
 *  along for resolveAdminAvatar so member names can carry faces. */
export async function listAssigneeOptions(): Promise<
  { id: string; name: string; email: string; image: string | null }[]
> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .orderBy(asc(user.name));
}

export type TaskRosterRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  owner: boolean;
  /** The EXPLICIT tasks grant. Raw data, not eligibility: only the OWNER holds
   *  every area implicitly (with an empty stored `areas`), so this reads false
   *  for them — who counts as a teammate is the leaderboard's policy to
   *  decide. Superadmins store real grants and read true/false honestly. */
  hasTasksArea: boolean;
};

/**
 * The leaderboard's roster read: every account with enough to resolve an
 * avatar, plus the flags that decide who appears with a zero. Areas are
 * filtered in JS over the whole (tiny) roster via sanitizeAreas — the
 * taskAreaEmails/listAdminUsers pattern, no jsonb predicate.
 *
 * Ranked rows never come from here — they come from the task rows themselves,
 * so anyone who completes work appears on the board whatever their role.
 */
export async function listTaskRoster(): Promise<TaskRosterRow[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      areas: user.areas,
    })
    .from(user)
    .orderBy(asc(user.name));

  return rows.map(({ role, areas, ...rest }) => ({
    ...rest,
    owner: role === 'owner',
    hasTasksArea: sanitizeAreas(areas).includes('tasks'),
  }));
}

/** The client roster for the task surface's two projections — form pickers
 *  (id-valued) and the filter bar (slug-valued) — in one read. `logo` is the
 *  resolved display source (blob upload wins over the seeded static path);
 *  null for quick-created clients — initials fallback. */
export async function listClientRows(): Promise<
  { id: string; slug: string; name: string; logo: string | null }[]
> {
  const rows = await db
    .select({
      id: clients.id,
      slug: clients.slug,
      name: clients.name,
      logoBlobUrl: clients.logoBlobUrl,
      logoStaticPath: clients.logoStaticPath,
    })
    .from(clients)
    .orderBy(asc(clients.name));
  return rows.map(({ logoBlobUrl, logoStaticPath, ...row }) => ({
    ...row,
    logo: logoBlobUrl ?? logoStaticPath,
  }));
}

export type ClientMonthUsage = {
  clientId: string;
  retainerMinutes: number;
  doneMinutes: number;
};

/**
 * Current-window done minutes for every client WITH a retainer — the burn
 * hint beside client pickers ("14 h of 20 h this month"). Same
 * ON-clause-join + coalesce shape as listReportClients; clients without a
 * retainer are excluded (no target, nothing to hint).
 */
export async function listClientMonthUsage(window: {
  since: Date;
  until: Date;
}): Promise<ClientMonthUsage[]> {
  const rows = await db
    .select({
      clientId: clients.id,
      retainerMinutes: clients.retainerMinutes,
      doneMinutes: sql<number>`coalesce(sum(coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})), 0)`.mapWith(
        Number,
      ),
    })
    .from(clients)
    .leftJoin(
      tasks,
      and(
        eq(tasks.clientId, clients.id),
        inArray(tasks.status, [...SHIPPED_STATUSES]),
        gte(tasks.completedAt, window.since),
        lt(tasks.completedAt, window.until),
      ),
    )
    .where(isNotNull(clients.retainerMinutes))
    .groupBy(clients.id);
  return rows.flatMap((r) =>
    r.retainerMinutes == null
      ? []
      : [{ ...r, retainerMinutes: r.retainerMinutes }],
  );
}

// ── Templates ───────────────────────────────────────────────────────────────

/** A template joined to the labels its list row renders. */
export type TaskTemplateRow = {
  id: string;
  name: string;
  title: string;
  notes: string | null;
  clientId: string | null;
  clientName: string | null;
  clientLogoBlobUrl: string | null;
  clientLogoStaticPath: string | null;
  categoryId: string;
  categoryName: string;
  /** Everyone the template mints to, names joined live from `user` — a
   *  template keeps no name snapshot, so an offboarded member simply leaves
   *  the list and it mints with whoever is left. */
  assignees: TaskAssigneeRef[];
  priority: TaskPrioritySlug | null;
  estimatedMinutes: number;
  repeat: TaskRepeatSlug;
  repeatDay: number | null;
  dueOffsetDays: number | null;
  active: boolean;
};

const templateSelection = {
  id: taskTemplates.id,
  name: taskTemplates.name,
  title: taskTemplates.title,
  notes: taskTemplates.notes,
  clientId: taskTemplates.clientId,
  clientName: clients.name,
  clientLogoBlobUrl: clients.logoBlobUrl,
  clientLogoStaticPath: clients.logoStaticPath,
  categoryId: taskTemplates.categoryId,
  categoryName: taskCategories.name,
  // No assignee columns: they live in task_template_assignees and arrive
  // through the fan-in below, the tasks-side rule.
  priority: taskTemplates.priority,
  estimatedMinutes: taskTemplates.estimatedMinutes,
  repeat: taskTemplates.repeat,
  repeatDay: taskTemplates.repeatDay,
  dueOffsetDays: taskTemplates.dueOffsetDays,
  active: taskTemplates.active,
};

/**
 * Assignees for a set of templates, in one query — assigneesForTasks' twin.
 *
 * Names come from `user` rather than a snapshot column, because a template
 * carries no history to preserve: the row cascades away with the account and
 * the template just mints with whoever is left.
 */
async function assigneesForTemplates(
  ids: string[],
): Promise<Map<string, TaskAssigneeRef[]>> {
  const out = new Map<string, TaskAssigneeRef[]>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({
      templateId: taskTemplateAssignees.templateId,
      id: taskTemplateAssignees.userId,
      name: user.name,
    })
    .from(taskTemplateAssignees)
    .innerJoin(user, eq(taskTemplateAssignees.userId, user.id))
    .where(inArray(taskTemplateAssignees.templateId, ids))
    .orderBy(asc(user.name));
  for (const row of rows) {
    const who: TaskAssigneeRef = { id: row.id, name: row.name };
    const list = out.get(row.templateId);
    if (list) list.push(who);
    else out.set(row.templateId, [who]);
  }
  return out;
}

/** Attach the template assignee fan-in. */
async function withTemplateAssignees<T extends { id: string }>(
  rows: T[],
): Promise<(T & { assignees: TaskAssigneeRef[] })[]> {
  const byTemplate = await assigneesForTemplates(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    assignees: byTemplate.get(row.id) ?? [],
  }));
}

/** Every template, repeating ones first then alphabetical — the manager list
 *  and the composer's "From template" picker read the same rows. */
export async function listTaskTemplates(): Promise<TaskTemplateRow[]> {
  return withTemplateAssignees(
    await db
      .select(templateSelection)
      .from(taskTemplates)
      .innerJoin(
        taskCategories,
        eq(taskTemplates.categoryId, taskCategories.id),
      )
      .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
      .orderBy(
        // Scheduled templates run themselves and are the ones worth auditing;
        // hand-spawned ones are a menu, so they read best alphabetically.
        sql`case when ${taskTemplates.repeat} = 'none' then 1 else 0 end`,
        asc(taskTemplates.name),
      ),
  );
}

export async function getTaskTemplate(
  id: string,
): Promise<TaskTemplateRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select(templateSelection)
    .from(taskTemplates)
    .innerJoin(taskCategories, eq(taskTemplates.categoryId, taskCategories.id))
    .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
    .where(eq(taskTemplates.id, id))
    .limit(1);
  if (!row) return null;
  return (await withTemplateAssignees([row]))[0];
}

/**
 * Active templates whose schedule falls on `dayKey` — the recurring cron's
 * one read. Matching happens in JS against the caller's already-computed
 * studio weekday and day-of-month rather than in SQL, for the same reason
 * every other calendar decision here does: one timezone door, and no
 * `AT TIME ZONE` scattered through the query layer.
 */
export async function listTemplatesDueOn(
  weekday: number,
  dayOfMonth: number,
): Promise<TaskTemplateRow[]> {
  const rows = await withTemplateAssignees(
    await db
      .select(templateSelection)
      .from(taskTemplates)
      .innerJoin(
        taskCategories,
        eq(taskTemplates.categoryId, taskCategories.id),
      )
      .leftJoin(clients, eq(taskTemplates.clientId, clients.id))
      .where(
        and(
          eq(taskTemplates.active, true),
          ne(taskTemplates.repeat, 'none'),
          // An archived category can't be minted into — the create form
          // wouldn't offer it, so a cron shouldn't sneak past that rule.
          eq(taskCategories.archived, false),
        ),
      ),
  );
  return rows.filter((row) =>
    row.repeat === 'weekly'
      ? row.repeatDay === weekday
      : row.repeatDay === dayOfMonth,
  );
}

/** How many templates reference a category — the archive/delete guard, same
 *  shape as the tasks in-use count. */
export async function countTemplatesInCategory(
  categoryId: string,
): Promise<number> {
  if (!UUID_RE.test(categoryId)) return 0;
  const [row] = await db
    .select({ total: count() })
    .from(taskTemplates)
    .where(eq(taskTemplates.categoryId, categoryId));
  return row?.total ?? 0;
}

// ── Saved views ─────────────────────────────────────────────────────────────

export type TaskViewItem = {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  /** True when the viewer owns it — only an owner may rename or delete. */
  mine: boolean;
  ownerName: string;
};

/** This member's saved views plus every shared one, own views first then
 *  oldest-first within each group (a stable, non-surprising order). */
export async function listTaskViews(userId: string): Promise<TaskViewItem[]> {
  const rows = await db
    .select({
      id: taskViews.id,
      userId: taskViews.userId,
      ownerName: taskViews.ownerName,
      name: taskViews.name,
      query: taskViews.query,
      shared: taskViews.shared,
    })
    .from(taskViews)
    .where(or(eq(taskViews.userId, userId), eq(taskViews.shared, true)))
    .orderBy(asc(taskViews.createdAt));

  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      query: row.query,
      shared: row.shared,
      mine: row.userId === userId,
      ownerName: row.ownerName,
    }))
    .sort((a, b) => Number(b.mine) - Number(a.mine));
}

// ── Form autocomplete ───────────────────────────────────────────────────────
// Two small maps the task page hands to the composer so picking a client can
// fill in what history already knows. Both are precomputed server-side with
// the rest of the options — a per-keystroke round trip for a *default* would
// cost more than the default is worth.

/** The category most recently used on each client, keyed by client id.
 *  `'internal'` keys the null-client (Perseus) row. */
export type ClientTaskDefaults = Record<string, { categoryId: string }>;

/**
 * The last category each client's work was filed under. DISTINCT ON is the
 * Postgres-native "latest row per group" — one index-ordered pass, no window
 * function and no N+1. Archived categories are excluded: suggesting a
 * category the create form can't offer would silently do nothing.
 */
export async function listClientTaskDefaults(): Promise<ClientTaskDefaults> {
  const rows = await db
    .selectDistinctOn([tasks.clientId], {
      clientId: tasks.clientId,
      categoryId: tasks.categoryId,
    })
    .from(tasks)
    .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
    .where(eq(taskCategories.archived, false))
    .orderBy(tasks.clientId, desc(tasks.createdAt));

  return Object.fromEntries(
    rows.map((row) => [
      row.clientId ?? 'internal',
      { categoryId: row.categoryId },
    ]),
  );
}

/** Median minutes for a kind of work, plus how many tasks that median rests
 *  on. Keys are `${clientId|'internal'}:${categoryId}`, with a bare
 *  `${categoryId}` fallback for work this client hasn't done before. */
export type EstimateHints = Record<string, { minutes: number; sample: number }>;

/** Below this, a "typical" number is one person's guess, not a pattern. */
const ESTIMATE_MIN_SAMPLE = 3;
/** Half a year — old enough to have a pattern, recent enough to reflect how
 *  the studio works now. */
const ESTIMATE_WINDOW_DAYS = 180;

/**
 * Typical durations by client+category and by category alone, from completed
 * work in the last half-year. Median via percentile_cont, not average: one
 * ten-hour shoot in a set of thirty-minute edits would drag a mean into a
 * suggestion nobody would accept.
 *
 * Two grouped SELECTs over the same window, merged in JS. Both are bounded by
 * (clients × categories), so this stays a small map even at many times the
 * current volume.
 */
export async function listEstimateHints(): Promise<EstimateHints> {
  // STUDIO_TZ, not the viewer's: this is a rolling statistics window feeding a
  // duration suggestion, not a date anyone reads. Pinning it keeps the median
  // identical for every member instead of quietly shifting with who asked.
  const since = dayStartIn(
    STUDIO_TZ,
    shiftDayKey(dayKeyIn(STUDIO_TZ, new Date()), -ESTIMATE_WINDOW_DAYS),
  );
  // The value a task actually took — the same `actual ?? estimate` resolution
  // every report aggregate uses, so a suggestion agrees with the numbers the
  // member sees elsewhere.
  const minutes = sql<number>`percentile_cont(0.5) within group (order by coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes}))`;
  const done = and(inArray(tasks.status, [...SHIPPED_STATUSES]), gte(tasks.completedAt, since));

  const [pairs, categoriesOnly] = await Promise.all([
    db
      .select({
        clientId: tasks.clientId,
        categoryId: tasks.categoryId,
        minutes: minutes.mapWith(Number),
        sample: count(tasks.id),
      })
      .from(tasks)
      .where(done)
      .groupBy(tasks.clientId, tasks.categoryId)
      .having(gte(count(tasks.id), ESTIMATE_MIN_SAMPLE)),
    db
      .select({
        categoryId: tasks.categoryId,
        minutes: minutes.mapWith(Number),
        sample: count(tasks.id),
      })
      .from(tasks)
      .where(done)
      .groupBy(tasks.categoryId)
      .having(gte(count(tasks.id), ESTIMATE_MIN_SAMPLE)),
  ]);

  const hints: EstimateHints = {};
  for (const row of categoriesOnly) {
    hints[row.categoryId] = {
      minutes: Math.round(row.minutes),
      sample: row.sample,
    };
  }
  // Client-specific keys are namespaced by the ':' and so can't collide with
  // the bare category ids above; the more specific key wins at lookup time.
  for (const row of pairs) {
    hints[`${row.clientId ?? 'internal'}:${row.categoryId}`] = {
      minutes: Math.round(row.minutes),
      sample: row.sample,
    };
  }
  return hints;
}
