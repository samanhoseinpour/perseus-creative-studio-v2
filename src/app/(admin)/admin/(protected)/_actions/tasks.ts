'use server';

/**
 * Write actions for the task surface (tasks + categories + inline client
 * creation + retainer targets). Reads live in `@/db/taskQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself (`requireArea('tasks')`, `requireArea('reports')` for
 * retainers). The tag and category vocabularies are 'tasks'-gated too — the
 * people doing the tagging are the ones who know what label is missing. Ids are
 * shape-validated before touching Postgres so a malformed one can't 500 on
 * the uuid cast. All 'tasks' holders may edit ANY task — whole-team
 * visibility is the design (trusted 7-person team), so there are no
 * ownership checks.
 *
 * Cache contract: tasks have no public reader, so mutations only need the
 * house `revalidatePath('/admin', 'layout')` (tickets precedent — keeps the
 * sidebar badge and every list fresh). The one exception is
 * `quickCreateClient`, which writes a clients row and therefore also calls
 * `updateTag(CLIENTS_TAG)` like `_actions/clients.ts`.
 *
 * completedAt semantics (the reporting contract): →done always freshly
 * stamps completedAt — re-completing a reopened task migrates it to the new
 * month (accepted; there is no month lock in v1). Leaving done nulls
 * completedAt but KEEPS actualMinutes: it's inert while not-done (reports
 * only read status='done' rows) and is the best prefill for the next
 * completion. needs_approval (work finished, waiting on client sign-off)
 * carries confirmed actualMinutes with completedAt still null — the task
 * enters a report only once it's marked done after approval.
 */
import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';

import { SITE_URL } from '@/constants';
import { db } from '@/db';
import { user } from '@/db/auth-schema';
import {
  clients,
  reportNotes,
  reportShares,
  taskCategories,
  taskEvents,
  taskTagCategories,
  taskTagLinks,
  taskTagTypes,
  taskTags,
  taskTemplates,
  taskViews,
  tasks,
  type NewTask,
  type NewTaskEvent,
  type TaskEvent,
} from '@/db/schema';
import {
  categoryNamesByIds,
  clientNamesByIds,
  countTemplatesInCategory,
  getActiveReportShare,
  getTaskTemplate,
  listAssigneeOptions,
  listTagIdsForTask,
  listTaskEvents,
  tagNamesByIds,
} from '@/db/taskQueries';
import { requireArea, viewerZone } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { slugify } from '@/components/Projects/utils';
import { dueDateLabel } from '@/components/Admin/tasks/format';
import type { RowAvatar } from '@/components/Admin/tasks/types';
import { CLIENTS_TAG } from '@/lib/projectsStore';
import { sendMail } from '@/lib/mail';
import {
  dayKeyIn,
  parseMonthToken,
  shiftDayKey,
  zonedFormat,
} from '@/lib/calendar';
import {
  formatMinutes,
  INTERNAL_CLIENT_LABEL,
  isTaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TITLE_MAX,
  type TaskPrioritySlug,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import { RESERVED_CLIENT_SLUGS } from '@/lib/portfolioFields';
import { logError } from '@/lib/log';
import {
  bulkPatchTaskSchema,
  categoryTagOffersSchema,
  createTaskSchema,
  flattenTaskIssues,
  patchTaskSchema,
  quickClientSchema,
  reportNoteSchema,
  retainerSchema,
  bulkTaskTagsSchema,
  setTaskTagsSchema,
  taskCategorySchema,
  taskCommentSchema,
  taskStatusChangeSchema,
  taskTagSchema,
  taskTagTypeSchema,
  taskTemplateSchema,
  taskViewSchema,
  updateTaskSchema,
  type TaskTemplateInput,
} from '@/lib/taskSchema';
import {
  planCategoryTagOffers,
  TASK_TAG_NAME_MAX,
  TASK_TAG_TYPE_NAME_MAX,
} from '@/lib/taskTagFields';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the Postgres error code through the cause chain. drizzle-orm wraps
 * every neon-http driver error in DrizzleQueryError with the NeonDbError (and
 * its `.code`) on `.cause` — reading `.code` off the thrown error directly is
 * always undefined, which silently killed the slug-collision retry and every
 * friendly FK message until this walk was added.
 */
function pgCode(error: unknown): string | undefined {
  for (
    let current = error;
    typeof current === 'object' && current !== null;
    current = (current as { cause?: unknown }).cause
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Postgres unique-violation (duplicate slug). */
const isUniqueViolation = (error: unknown): boolean =>
  pgCode(error) === '23505';

/** Postgres FK violation (row pointed at a deleted client/category). */
const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';

export type TaskMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type TaskActionResult =
  | { ok: true; updated?: number }
  | { ok: false; error: string };

/** Tasks are internal-only: no public reader, so no CACHE tags (the task
 *  TAGS added in 0027 are content, not invalidation keys) — layout-scope refresh
 *  keeps lists, tabs, and the sidebar badge honest. The re-rendered route
 *  rides back on the action's own POST response, so client success paths
 *  must NOT follow up with router.refresh() (that renders the identical
 *  tree a second time — ~10 extra Neon round trips per mutation). */
function invalidateTasks() {
  revalidatePath('/admin', 'layout');
}

/** Best-effort activity write, queued behind the response (after()) so it
 *  never adds mutation latency — and a failure only logs: an edit must never
 *  fail because its breadcrumb did (neon-http has no transactions to tie the
 *  two writes together anyway). */
function logTaskEvents(rows: NewTaskEvent[]) {
  if (rows.length === 0) return;
  after(async () => {
    try {
      await db.insert(taskEvents).values(rows);
    } catch (error) {
      logError('[tasks] activity write failed', error);
    }
  });
}

/** A change payload: field → { from, to }. Values are primitives (ids for
 *  client/category — the activity reader resolves names in batch at render
 *  time); long strings are clipped so notes edits don't bloat the log. */
type TaskChangeMap = Record<string, { from?: unknown; to?: unknown }>;

const clipValue = (value: unknown): unknown =>
  typeof value === 'string' && value.length > 120
    ? `${value.slice(0, 119)}…`
    : value;

function addChange(
  changes: TaskChangeMap,
  key: string,
  from: unknown,
  to: unknown,
) {
  const f = from ?? null;
  const t = to ?? null;
  if (f === t) return;
  changes[key] = { from: clipValue(f), to: clipValue(t) };
}

/** Fresh name snapshot for an assignee id — a missing row becomes a field
 *  error instead of an FK 500 (the picker can go stale mid-form). `email`
 *  rides along for the assignment ping. */
async function lookupAssignee(
  id: string,
): Promise<{ id: string; name: string; email: string } | null> {
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return row ?? null;
}

/** "Assigned to you" ping — event-style send: after() + log-only failure
 *  (the auth-reset precedent; event sends carry no email_sent column).
 *  Callers guard self-assignment — assigning your own work needs no email. */
function notifyAssignment({
  to,
  assigneeId,
  assigneeName,
  actorName,
  titles,
}: {
  to: string;
  assigneeId: string;
  assigneeName: string;
  actorName: string;
  titles: string[];
}) {
  if (titles.length === 0) return;
  after(async () => {
    try {
      const single = titles.length === 1;
      const shown = titles.slice(0, 15);
      const more = titles.length - shown.length;
      const text = [
        `Hi ${assigneeName.split(' ')[0]},`,
        '',
        single
          ? `${actorName} assigned you a task:`
          : `${actorName} assigned you ${titles.length} tasks:`,
        ...shown.map((title) => `  • ${title}`),
        ...(more > 0 ? [`  … and ${more} more`] : []),
        '',
        `Your tasks: ${SITE_URL}/admin/tasks?assignee=${assigneeId}`,
      ].join('\n');
      await sendMail({
        to,
        subject: single
          ? `${actorName} assigned you a task: ${titles[0].slice(0, 80)}`
          : `${actorName} assigned you ${titles.length} tasks`,
        text,
      });
    } catch (error) {
      logError('[tasks] assignment email failed', error);
    }
  });
}

/** null = missing, 'archived' = exists but retired from pickers. */
async function categoryProblem(
  id: string,
): Promise<'missing' | 'archived' | null> {
  const [row] = await db
    .select({ archived: taskCategories.archived })
    .from(taskCategories)
    .where(eq(taskCategories.id, id))
    .limit(1);
  if (!row) return 'missing';
  return row.archived ? 'archived' : null;
}

/**
 * Apply a tag id set to a task, returning what actually moved.
 *
 * Idempotent THROUGH THE DATABASE: inserts ride the (task_id, tag_id) primary
 * key with onConflictDoNothing rather than a read-then-write check, because
 * neon-http has no transactions and two members tagging the same row at once
 * would otherwise race into a duplicate-key 500.
 *
 * Ids are checked for EXISTENCE and non-archived state, never for category
 * scope: scope gates the picker, not the stored value (see tagInScope in
 * taskTagFields.ts). Enforcing it here would silently drop a member's labels
 * the moment someone re-filed the task under another category.
 *
 * Returns null when an id doesn't resolve — the caller turns that into a
 * field error rather than writing a partial set.
 */
async function applyTaskTags(
  taskId: string,
  nextIds: string[],
  currentIds: string[],
): Promise<{ added: string[]; removed: string[] } | null> {
  const current = new Set(currentIds);
  const next = new Set(nextIds);
  const added = nextIds.filter((id) => !current.has(id));
  const removed = currentIds.filter((id) => !next.has(id));
  if (added.length === 0 && removed.length === 0) {
    return { added: [], removed: [] };
  }

  if (added.length > 0) {
    // Archived tags may STAY on a task (history keeps its labels) but may not
    // be newly added — the taskCategories rule, applied to the vocabulary
    // that replaced it in the picker.
    const live = await db
      .select({ id: taskTags.id })
      .from(taskTags)
      .where(and(inArray(taskTags.id, added), eq(taskTags.archived, false)));
    if (live.length !== added.length) return null;

    await db
      .insert(taskTagLinks)
      .values(added.map((tagId) => ({ taskId, tagId })))
      .onConflictDoNothing();
  }

  if (removed.length > 0) {
    await db
      .delete(taskTagLinks)
      .where(
        and(
          eq(taskTagLinks.taskId, taskId),
          inArray(taskTagLinks.tagId, removed),
        ),
      );
  }

  return { added, removed };
}

/** The task-activity change entry for a tag edit. Names, not ids: unlike
 *  client/category (single values the feed resolves in batch) a tag change is
 *  a SET, and rendering it needs one lookup either way — so it happens here,
 *  once, behind after(). */
async function tagChangeEntry(
  beforeIds: string[],
  afterIds: string[],
): Promise<{ from: string; to: string } | null> {
  const names = await tagNamesByIds([...beforeIds, ...afterIds]);
  const render = (ids: string[]) =>
    ids
      .map((id) => names.get(id))
      .filter((name): name is string => Boolean(name))
      .join(', ');
  const from = render(beforeIds);
  const to = render(afterIds);
  return from === to ? null : { from, to };
}

export async function createTask(input: unknown): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    // Independent single-row validations, resolved together — one neon-http
    // round trip of wall time instead of two stacked ones.
    const [assignee, catProblem] = await Promise.all([
      lookupAssignee(data.assigneeId),
      categoryProblem(data.categoryId),
    ]);
    if (!assignee) {
      return {
        ok: false,
        error: 'validation',
        issues: { assigneeId: 'Pick an assignee from the list.' },
      };
    }
    if (catProblem) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            catProblem === 'archived'
              ? 'That category is archived — pick another.'
              : 'Pick a category from the list.',
        },
      };
    }

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(tasks)
        .values({
          title: data.title,
          notes: data.notes ?? null,
          clientId: data.clientId ?? null,
          categoryId: data.categoryId,
          // Always todo — completion flows through setTaskStatus so the
          // actual-hours confirm can never be skipped.
          status: 'todo',
          priority: data.priority ?? null,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          createdById: profile.session.user.id,
          createdByName: profile.session.user.name,
          estimatedMinutes: data.estimatedMinutes,
          startDate: data.startDate ?? null,
          dueDate: data.dueDate ?? null,
          deliverableUrl: data.deliverableUrl ?? null,
        })
        .returning({ id: tasks.id });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists.' },
        };
      }
      throw dbError;
    }

    // After the row exists (the link table's FK needs its id). A tag that
    // fails to resolve does NOT undo the task — the work is logged, the
    // labels are not, and the member re-picks them; losing a just-typed task
    // over a stale picker row would be the worse trade.
    if (data.tagIds && data.tagIds.length > 0) {
      await applyTaskTags(inserted[0].id, data.tagIds, []);
    }

    logTaskEvents([
      {
        taskId: inserted[0].id,
        taskTitle: data.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'created',
      },
    ]);
    if (assignee.id !== profile.session.user.id) {
      notifyAssignment({
        to: assignee.email,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        actorName: profile.session.user.name,
        titles: [data.title],
      });
    }
    invalidateTasks();
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    logError('[tasks] createTask failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateTask(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    // Wider than the validations need: the extra columns cost nothing on a
    // row already being read, and they give the activity log its from→to
    // diffs for free.
    const [existing] = await db
      .select({
        title: tasks.title,
        notes: tasks.notes,
        status: tasks.status,
        clientId: tasks.clientId,
        assigneeId: tasks.assigneeId,
        assigneeName: tasks.assigneeName,
        categoryId: tasks.categoryId,
        priority: tasks.priority,
        estimatedMinutes: tasks.estimatedMinutes,
        actualMinutes: tasks.actualMinutes,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        deliverableUrl: tasks.deliverableUrl,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'server' };

    // Absent = keep the current assignment (deleted-account rows keep their
    // NULL id + name snapshot); re-snapshot only on an actual change, so a
    // deleted assignee's snapshot survives edits that don't touch it. The
    // two change-validations are independent — resolved together (undefined
    // = the assignee check wasn't requested; null = it missed).
    const [assigneeLookup, catProblem, currentTagIds] = await Promise.all([
      data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId
        ? lookupAssignee(data.assigneeId)
        : undefined,
      // A task may KEEP its archived category; it may not MOVE to one.
      data.categoryId !== existing.categoryId
        ? categoryProblem(data.categoryId)
        : null,
      // Absent tagIds means "don't touch the tags" — the templates dialog has
      // no tag UI, and an omitted key must not read as "clear them".
      data.tagIds ? listTagIdsForTask(id) : null,
    ]);
    let assigneeName: string | undefined;
    if (assigneeLookup !== undefined) {
      if (!assigneeLookup) {
        return {
          ok: false,
          error: 'validation',
          issues: { assigneeId: 'Pick an assignee from the list.' },
        };
      }
      assigneeName = assigneeLookup.name;
    }
    if (catProblem) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            catProblem === 'archived'
              ? 'That category is archived — pick another.'
              : 'Pick a category from the list.',
        },
      };
    }

    try {
      await db
        .update(tasks)
        .set({
          title: data.title,
          notes: data.notes ?? null,
          clientId: data.clientId ?? null,
          categoryId: data.categoryId,
          priority: data.priority ?? null,
          ...(data.assigneeId !== undefined
            ? { assigneeId: data.assigneeId }
            : {}),
          ...(assigneeName ? { assigneeName } : {}),
          estimatedMinutes: data.estimatedMinutes,
          // Meaningful only on a done or needs_approval row (correcting
          // confirmed hours); ignored otherwise — status itself never moves
          // here (setTaskStatus owns it, and with it the completedAt stamp).
          ...((existing.status === 'done' ||
            existing.status === 'needs_approval') &&
          data.actualMinutes
            ? { actualMinutes: data.actualMinutes }
            : {}),
          startDate: data.startDate ?? null,
          dueDate: data.dueDate ?? null,
          deliverableUrl: data.deliverableUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id));
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists.' },
        };
      }
      throw dbError;
    }

    // Tags move in their own write, after the column update: they live in a
    // join table, so they were never part of the SET above.
    let tagChange: { from: string; to: string } | null = null;
    if (data.tagIds && currentTagIds) {
      const moved = await applyTaskTags(id, data.tagIds, currentTagIds);
      if (!moved) {
        return {
          ok: false,
          error: 'validation',
          issues: { tagIds: 'One of those tags is no longer available.' },
        };
      }
      tagChange = await tagChangeEntry(currentTagIds, data.tagIds);
    }

    const changes: TaskChangeMap = {};
    addChange(changes, 'title', existing.title, data.title);
    addChange(changes, 'notes', existing.notes, data.notes ?? null);
    addChange(changes, 'client', existing.clientId, data.clientId ?? null);
    addChange(changes, 'category', existing.categoryId, data.categoryId);
    addChange(changes, 'priority', existing.priority, data.priority ?? null);
    if (assigneeName) {
      addChange(changes, 'assignee', existing.assigneeName, assigneeName);
    }
    addChange(
      changes,
      'estimate',
      existing.estimatedMinutes,
      data.estimatedMinutes,
    );
    if (
      (existing.status === 'done' || existing.status === 'needs_approval') &&
      data.actualMinutes
    ) {
      addChange(changes, 'logged', existing.actualMinutes, data.actualMinutes);
    }
    addChange(changes, 'start', existing.startDate, data.startDate ?? null);
    addChange(changes, 'due', existing.dueDate, data.dueDate ?? null);
    addChange(
      changes,
      'link',
      existing.deliverableUrl,
      data.deliverableUrl ?? null,
    );
    if (tagChange) changes.tags = tagChange;
    if (Object.keys(changes).length > 0) {
      logTaskEvents([
        {
          taskId: id,
          taskTitle: data.title,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'updated',
          payload: { changes },
        },
      ]);
    }
    // A truthy lookup means the assignee ACTUALLY changed to a live account.
    if (assigneeLookup && assigneeLookup.id !== profile.session.user.id) {
      notifyAssignment({
        to: assigneeLookup.email,
        assigneeId: assigneeLookup.id,
        assigneeName: assigneeLookup.name,
        actorName: profile.session.user.name,
        titles: [data.title],
      });
    }

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] updateTask failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The inline-edit door: a field-level patch from the table cells (title,
 * client, category, member, priority, dates, time). Present keys are applied,
 * absent keys stay untouched, null clears where the schema allows it. Status
 * and completedAt are structurally out of reach — setTaskStatus stays the one
 * status door, so the completedAt contract can't be bypassed from a cell.
 */
export async function patchTask(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = patchTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const patch = parsed.data;

    // Wider than the validations need (updateTask rule): the extra columns
    // ride the read that already happens and feed the activity log's diffs.
    const [existing] = await db
      .select({
        title: tasks.title,
        status: tasks.status,
        clientId: tasks.clientId,
        assigneeId: tasks.assigneeId,
        assigneeName: tasks.assigneeName,
        categoryId: tasks.categoryId,
        priority: tasks.priority,
        estimatedMinutes: tasks.estimatedMinutes,
        actualMinutes: tasks.actualMinutes,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'server' };

    // Date order is checked against the MERGED row — a patch usually carries
    // only one of the two dates, so the schema-level check can't see the pair.
    const nextStart =
      patch.startDate === undefined ? existing.startDate : patch.startDate;
    const nextDue =
      patch.dueDate === undefined ? existing.dueDate : patch.dueDate;
    if (nextStart && nextDue && nextStart > nextDue) {
      return {
        ok: false,
        error: 'validation',
        issues: { dueDate: 'The due date is before the start date.' },
      };
    }

    // Re-snapshot only on an actual change (updateTask rule, including its
    // parallel-validation shape: undefined = not requested, null = missed).
    const [assigneeLookup, catProblem] = await Promise.all([
      patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId
        ? lookupAssignee(patch.assigneeId)
        : undefined,
      // A task may KEEP its archived category; it may not MOVE to one.
      patch.categoryId !== undefined && patch.categoryId !== existing.categoryId
        ? categoryProblem(patch.categoryId)
        : null,
    ]);
    let assigneeName: string | undefined;
    if (assigneeLookup !== undefined) {
      if (!assigneeLookup) {
        return {
          ok: false,
          error: 'validation',
          issues: { assigneeId: 'Pick an assignee from the list.' },
        };
      }
      assigneeName = assigneeLookup.name;
    }
    if (catProblem) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            catProblem === 'archived'
              ? 'That category is archived — pick another.'
              : 'Pick a category from the list.',
        },
      };
    }

    const set: Partial<NewTask> = { updatedAt: new Date() };
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.clientId !== undefined) set.clientId = patch.clientId;
    if (patch.categoryId !== undefined) set.categoryId = patch.categoryId;
    if (patch.assigneeId !== undefined) {
      set.assigneeId = patch.assigneeId;
      if (assigneeName) set.assigneeName = assigneeName;
    }
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.startDate !== undefined) set.startDate = patch.startDate;
    if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
    if (patch.estimatedMinutes !== undefined) {
      set.estimatedMinutes = patch.estimatedMinutes;
    }
    // Meaningful only on a done or needs_approval row (updateTask rule) — the
    // time popover disables the field otherwise, this is the server backstop.
    if (
      patch.actualMinutes !== undefined &&
      (existing.status === 'done' || existing.status === 'needs_approval')
    ) {
      set.actualMinutes = patch.actualMinutes;
    }

    // Backstop for the merged date check above: it read the row in a separate
    // round trip, so a concurrent single-sided edit can invert the pair
    // between that SELECT and this UPDATE (neon-http has no transactions).
    // Same shape as bulkPatchTasks — the guard rides the WHERE, so an
    // inverted pair can never commit.
    const dateGuards = [];
    if (patch.startDate != null && patch.dueDate === undefined) {
      dateGuards.push(
        or(isNull(tasks.dueDate), gte(tasks.dueDate, patch.startDate)),
      );
    }
    if (patch.dueDate != null && patch.startDate === undefined) {
      dateGuards.push(
        or(isNull(tasks.startDate), lte(tasks.startDate, patch.dueDate)),
      );
    }

    try {
      const updated = await db
        .update(tasks)
        .set(set)
        .where(and(eq(tasks.id, id), ...dateGuards))
        .returning({ id: tasks.id });
      if (updated.length === 0 && dateGuards.length > 0) {
        // The guard filtered the row — the other date moved underneath us.
        return {
          ok: false,
          error: 'validation',
          issues: { dueDate: 'The due date is before the start date.' },
        };
      }
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists.' },
        };
      }
      throw dbError;
    }

    const changes: TaskChangeMap = {};
    if (patch.title !== undefined) {
      addChange(changes, 'title', existing.title, patch.title);
    }
    if (patch.clientId !== undefined) {
      addChange(changes, 'client', existing.clientId, patch.clientId);
    }
    if (patch.categoryId !== undefined) {
      addChange(changes, 'category', existing.categoryId, patch.categoryId);
    }
    if (assigneeName) {
      addChange(changes, 'assignee', existing.assigneeName, assigneeName);
    }
    if (patch.priority !== undefined) {
      addChange(changes, 'priority', existing.priority, patch.priority);
    }
    if (patch.startDate !== undefined) {
      addChange(changes, 'start', existing.startDate, patch.startDate);
    }
    if (patch.dueDate !== undefined) {
      addChange(changes, 'due', existing.dueDate, patch.dueDate);
    }
    if (patch.estimatedMinutes !== undefined) {
      addChange(
        changes,
        'estimate',
        existing.estimatedMinutes,
        patch.estimatedMinutes,
      );
    }
    if (
      patch.actualMinutes !== undefined &&
      (existing.status === 'done' || existing.status === 'needs_approval')
    ) {
      addChange(changes, 'logged', existing.actualMinutes, patch.actualMinutes);
    }
    if (Object.keys(changes).length > 0) {
      logTaskEvents([
        {
          taskId: id,
          taskTitle: patch.title ?? existing.title,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'updated',
          payload: { changes },
        },
      ]);
    }
    // A truthy lookup means the assignee ACTUALLY changed to a live account.
    if (assigneeLookup && assigneeLookup.id !== profile.session.user.id) {
      notifyAssignment({
        to: assigneeLookup.email,
        assigneeId: assigneeLookup.id,
        assigneeName: assigneeLookup.name,
        actorName: profile.session.user.name,
        titles: [patch.title ?? existing.title],
      });
    }

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] patchTask failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Row-menu "Duplicate" — the cheap recurring-work answer. Copies the work
 * description (title + " (copy)", notes, client, category, assignee,
 * priority, estimate, deliverable link) and resets the lifecycle: status back
 * to todo, actual/completed/start/due cleared. The assignee name is
 * re-snapshotted from the live account when it still exists; a deleted
 * account's snapshot carries over (assigneeId stays null).
 */
export async function duplicateTask(id: string): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const [source] = await db
      .select({
        title: tasks.title,
        notes: tasks.notes,
        clientId: tasks.clientId,
        categoryId: tasks.categoryId,
        priority: tasks.priority,
        assigneeId: tasks.assigneeId,
        assigneeName: tasks.assigneeName,
        estimatedMinutes: tasks.estimatedMinutes,
        deliverableUrl: tasks.deliverableUrl,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!source) return { ok: false, error: 'server' };

    // Duplication is a CREATE path: it mints new work, so it must not mint it
    // into a retired category (createTask rule) — historical rows may keep an
    // archived category, but a fresh copy needs a live one. Both lookups key
    // only on the source row, so they resolve together.
    const [catProblem, liveAssignee] = await Promise.all([
      categoryProblem(source.categoryId),
      source.assigneeId ? lookupAssignee(source.assigneeId) : null,
    ]);
    if (catProblem === 'archived') {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            "This task's category is archived — open the task and pick a live category first.",
        },
      };
    }

    const assignee = liveAssignee ?? {
      id: source.assigneeId,
      name: source.assigneeName,
    };

    const suffix = ' (copy)';
    const title =
      source.title.slice(0, TASK_TITLE_MAX - suffix.length) + suffix;

    const [inserted] = await db
      .insert(tasks)
      .values({
        title,
        notes: source.notes,
        clientId: source.clientId,
        categoryId: source.categoryId,
        status: 'todo',
        priority: source.priority,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        createdById: profile.session.user.id,
        createdByName: profile.session.user.name,
        estimatedMinutes: source.estimatedMinutes,
        deliverableUrl: source.deliverableUrl,
      })
      .returning({ id: tasks.id });

    logTaskEvents([
      {
        taskId: inserted.id,
        taskTitle: title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'created',
        payload: { duplicatedFromId: id },
      },
    ]);
    // A duplicate is fresh work — ping a live assignee like createTask does
    // (a deleted account's snapshot has no inbox).
    if (liveAssignee && liveAssignee.id !== profile.session.user.id) {
      notifyAssignment({
        to: liveAssignee.email,
        assigneeId: liveAssignee.id,
        assigneeName: liveAssignee.name,
        actorName: profile.session.user.name,
        titles: [title],
      });
    }
    invalidateTasks();
    return { ok: true, id: inserted.id };
  } catch (error) {
    logError('[tasks] duplicateTask failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The one status door. Input is `{ status: 'todo' | 'in_progress' }`,
 * `{ status: 'needs_approval', actualMinutes }` (hours confirmed when work
 * finishes), or `{ status: 'done', actualMinutes? }` — absent hours on →done
 * coalesce to the needs_approval-confirmed value, else the estimate, so
 * approving is one click and a direct done still lands on real hours.
 */
export async function setTaskStatus(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = taskStatusChangeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const change = parsed.data;

    const now = new Date();
    const updated = await db
      .update(tasks)
      .set(
        change.status === 'done'
          ? {
              status: 'done' as const,
              actualMinutes:
                change.actualMinutes ??
                sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`,
              completedAt: now,
              updatedAt: now,
            }
          : change.status === 'needs_approval'
            ? {
                status: 'needs_approval' as const,
                actualMinutes: change.actualMinutes,
                completedAt: null,
                updatedAt: now,
              }
            : {
                status: change.status,
                completedAt: null,
                updatedAt: now,
              },
      )
      .where(eq(tasks.id, id))
      // actualMinutes rides back so the event payload records the coalesced
      // value on a hours-less →done (the headline keeps its "· 2 h" suffix).
      .returning({
        id: tasks.id,
        title: tasks.title,
        actualMinutes: tasks.actualMinutes,
      });
    if (updated.length === 0) return { ok: false, error: 'server' };

    logTaskEvents([
      {
        taskId: id,
        taskTitle: updated[0].title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'status',
        payload:
          change.status === 'done'
            ? { to: 'done', actualMinutes: updated[0].actualMinutes }
            : change.status === 'needs_approval'
              ? { to: 'needs_approval', actualMinutes: change.actualMinutes }
              : { to: change.status },
      },
    ]);
    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] setTaskStatus failed', error);
    return { ok: false, error: 'server' };
  }
}

const BULK_MAX = 100;

/**
 * Bulk status move — one UPDATE. →done and →needs_approval can't prompt per
 * task, so actualMinutes defaults to the estimate where not already logged
 * (the toast says so); individual rows stay correctable via the edit dialog.
 */
export async function setTasksStatusBulk(
  ids: string[],
  status: TaskStatusSlug,
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!isTaskStatus(status)) return { ok: false, error: 'Invalid status.' };
    const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
    if (valid.length === 0 || valid.length > BULK_MAX) {
      return { ok: false, error: 'Nothing to update.' };
    }

    // `status <> target` makes this a true transition: rows already in the
    // target state are skipped, so a bulk "mark done" over a mixed selection
    // can never restamp an already-done task's completedAt into a new month.
    const now = new Date();
    const updated = await db
      .update(tasks)
      .set(
        status === 'done' || status === 'needs_approval'
          ? {
              status,
              actualMinutes: sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`,
              completedAt: status === 'done' ? now : null,
              updatedAt: now,
            }
          : { status, completedAt: null, updatedAt: now },
      )
      .where(and(inArray(tasks.id, valid), ne(tasks.status, status)))
      .returning({ id: tasks.id, title: tasks.title });

    logTaskEvents(
      updated.map((row) => ({
        taskId: row.id,
        taskTitle: row.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'status' as const,
        payload: { to: status, bulk: true },
      })),
    );
    invalidateTasks();
    return { ok: true, updated: updated.length };
  } catch (error) {
    logError('[tasks] setTasksStatusBulk failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

export type BulkPatchResult =
  | { ok: true; updated: number; skipped: number }
  | { ok: false; error: string };

/**
 * Bulk field edit — one UPDATE … WHERE id IN, structurally unable to touch
 * status/completedAt (the patchTask rule; setTasksStatusBulk stays the bulk
 * status door). When only ONE date arrives, the start ≤ due rule is enforced
 * per row INSIDE the WHERE — rows whose other date would invert are skipped
 * and counted, because a read-then-check per task would race (neon-http has
 * no transactions). Both dates together validate statically in the schema.
 */
export async function bulkPatchTasks(
  ids: string[],
  input: unknown,
): Promise<BulkPatchResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
    if (valid.length === 0 || valid.length > BULK_MAX) {
      return { ok: false, error: 'Nothing to update.' };
    }
    const parsed = bulkPatchTaskSchema.safeParse(input);
    if (!parsed.success) {
      const issues = flattenTaskIssues(parsed.error);
      return {
        ok: false,
        error: Object.values(issues)[0] ?? 'Check the values and try again.',
      };
    }
    const patch = parsed.data;

    const set: Partial<NewTask> = { updatedAt: new Date() };
    if (patch.clientId !== undefined) set.clientId = patch.clientId;
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.startDate !== undefined) set.startDate = patch.startDate;
    if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
    let assigneeTarget: Awaited<ReturnType<typeof lookupAssignee>> = null;
    if (patch.assigneeId !== undefined) {
      assigneeTarget = await lookupAssignee(patch.assigneeId);
      if (!assigneeTarget) {
        return { ok: false, error: 'Pick an assignee from the list.' };
      }
      set.assigneeId = assigneeTarget.id;
      set.assigneeName = assigneeTarget.name;
    }

    const guards = [];
    if (patch.startDate != null && patch.dueDate === undefined) {
      guards.push(or(isNull(tasks.dueDate), gte(tasks.dueDate, patch.startDate)));
    }
    if (patch.dueDate != null && patch.startDate === undefined) {
      guards.push(or(isNull(tasks.startDate), lte(tasks.startDate, patch.dueDate)));
    }

    let updated: { id: string; title: string }[];
    try {
      updated = await db
        .update(tasks)
        .set(set)
        .where(and(inArray(tasks.id, valid), ...guards))
        .returning({ id: tasks.id, title: tasks.title });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'That client no longer exists.' };
      }
      throw dbError;
    }

    // Bulk has no pre-read (adding one per 100 rows isn't worth it), so the
    // events carry to-values only.
    const toChanges: TaskChangeMap = {};
    if (patch.clientId !== undefined) toChanges.client = { to: patch.clientId };
    if (patch.priority !== undefined) {
      toChanges.priority = { to: patch.priority };
    }
    if (patch.startDate !== undefined) toChanges.start = { to: patch.startDate };
    if (patch.dueDate !== undefined) toChanges.due = { to: patch.dueDate };
    if (set.assigneeName) toChanges.assignee = { to: set.assigneeName };
    if (Object.keys(toChanges).length > 0) {
      logTaskEvents(
        updated.map((row) => ({
          taskId: row.id,
          taskTitle: row.title,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'updated' as const,
          payload: { changes: toChanges, bulk: true },
        })),
      );
    }
    // One summary email per bulk assignment, never one per row.
    if (assigneeTarget && assigneeTarget.id !== profile.session.user.id) {
      notifyAssignment({
        to: assigneeTarget.email,
        assigneeId: assigneeTarget.id,
        assigneeName: assigneeTarget.name,
        actorName: profile.session.user.name,
        titles: updated.map((row) => row.title),
      });
    }

    invalidateTasks();
    return {
      ok: true,
      updated: updated.length,
      // The UI labels `skipped` "dates out of order", which is only the
      // guard's doing when the patch carried a single-sided date. On a
      // dates-free patch an unmatched id is a row deleted since selection —
      // not a date conflict, so don't report it as one.
      skipped: guards.length > 0 ? valid.length - updated.length : 0,
    };
  } catch (error) {
    logError('[tasks] bulkPatchTasks failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** Bulk hard delete behind the board's own ConfirmDialog — same trust model
 *  as deleteTask (reports simply lose the rows). */
export async function bulkDeleteTasks(
  ids: string[],
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
    if (valid.length === 0 || valid.length > BULK_MAX) {
      return { ok: false, error: 'Nothing to delete.' };
    }
    const deleted = await db
      .delete(tasks)
      .where(inArray(tasks.id, valid))
      .returning({ id: tasks.id, title: tasks.title });
    // Born orphaned (taskId null): the rows are already gone, and an FK to a
    // deleted id would refuse the insert. task_title carries the identity.
    logTaskEvents(
      deleted.map((row) => ({
        taskId: null,
        taskTitle: row.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'deleted' as const,
      })),
    );
    // A coarse companion row. Routine task edits stay in task_events (which
    // has its own per-task feed); only destructive and structural acts also
    // reach /admin/logs, or the team's daily work would bury every other
    // domain in the global feed.
    logActivity(profile, {
      area: 'tasks',
      entity: 'task',
      entityId: null,
      entityName: `${deleted.length} tasks`,
      action: 'delete',
      summary: `Deleted ${deleted.length} tasks`,
      payload: { count: deleted.length },
    });

    invalidateTasks();
    return { ok: true, updated: deleted.length };
  } catch (error) {
    logError('[tasks] bulkDeleteTasks failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/** Hard delete — trusted team, and reports simply lose the row. The edit
 *  dialog fronts this with a ConfirmDialog. */
export async function deleteTask(id: string): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid task.' };
    const deleted = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id, title: tasks.title });
    if (deleted.length > 0) {
      // Born orphaned — see bulkDeleteTasks.
      logTaskEvents([
        {
          taskId: null,
          taskTitle: deleted[0].title,
          actorId: profile.session.user.id,
          actorName: profile.session.user.name,
          kind: 'deleted',
        },
      ]);
      logActivity(profile, {
        area: 'tasks',
        entity: 'task',
        entityId: id,
        entityName: deleted[0].title,
        action: 'delete',
        summary: `Deleted the task "${deleted[0].title}"`,
      });
    }
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTask failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

export type QuickClientResult =
  | { ok: true; id: string; name: string; slug: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

/**
 * Inline client creation from the task form — gated on 'tasks', NOT
 * 'clients', so any member logging work can add the client it belongs to.
 * Only the name is taken; every other column keeps its default, which is what
 * keeps the client off the public site (marqueeSort stays NULL — the single
 * public gate; clients-area holders enrich the record later in /admin/clients).
 *
 * Slug collisions: insert-retry over suffixed candidates with the unique
 * constraint as arbiter — atomic under concurrency, unlike check-then-insert
 * (two simultaneous "Acme"s land as acme and acme-2).
 */
export async function quickCreateClient(
  input: unknown,
): Promise<QuickClientResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const parsed = quickClientSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const name = parsed.data.name;

    const base = slugify(name).slice(0, 60).replace(/-+$/, '');
    if (base.length < 2) {
      return {
        ok: false,
        error: 'validation',
        issues: { name: 'Use letters or numbers in the name.' },
      };
    }
    // 'internal'/'perseus' are the app's own identities (the null-client
    // sentinel + /admin/reports/internal) — a client row slugged that way
    // would be shadowed everywhere, so refuse instead of suffixing.
    if ((RESERVED_CLIENT_SLUGS as readonly string[]).includes(base)) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          name: `That name is reserved — studio work is logged under ${INTERNAL_CLIENT_LABEL} without a client.`,
        },
      };
    }

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      try {
        const [inserted] = await db
          .insert(clients)
          .values({ name, slug: candidate })
          .returning({ id: clients.id });

        // A client row created from OUTSIDE the clients area — worth a line
        // precisely because the person who made it may not hold 'clients'.
        logActivity(profile, {
          area: 'clients',
          entity: 'client',
          entityId: inserted.id,
          entityName: name,
          action: 'create',
          summary: `Added the client ${name} from the task form`,
          payload: { meta: { slug: candidate } },
        });

        updateTag(CLIENTS_TAG);
        invalidateTasks();
        return { ok: true, id: inserted.id, name, slug: candidate };
      } catch (dbError) {
        if (!isUniqueViolation(dbError)) throw dbError;
      }
    }
    return {
      ok: false,
      error: 'validation',
      issues: { name: 'A client with this name already exists — pick it from the list.' },
    };
  } catch (error) {
    logError('[tasks] quickCreateClient failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Monthly retainer target — a reporting concern, so the 'reports' grant
 *  (not 'tasks') owns it. null clears the target. */
export async function setClientRetainer(
  clientId: string,
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('reports', '/admin');

  try {
    if (!UUID_RE.test(clientId)) return { ok: false, error: 'server' };
    const parsed = retainerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }

    const updated = await db
      .update(clients)
      .set({
        retainerMinutes: parsed.data.retainerMinutes,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning({ id: clients.id, name: clients.name });
    if (updated.length === 0) return { ok: false, error: 'server' };

    // Billing-shaped: the retainer is what every monthly report measures
    // against, so a quiet change to it needs to be answerable later.
    logActivity(profile, {
      area: 'reports',
      entity: 'client',
      entityId: clientId,
      entityName: updated[0].name,
      action: 'update',
      summary: `Set ${updated[0].name}'s monthly retainer to ${parsed.data.retainerMinutes ?? 0} minutes`,
      payload: { meta: { retainerMinutes: parsed.data.retainerMinutes ?? 0 } },
    });

    // No public reader selects retainer_minutes — layout refresh is enough.
    invalidateTasks();
    return { ok: true, id: clientId };
  } catch (error) {
    logError('[tasks] setClientRetainer failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The per-month report highlights note — client-facing copy on the print PDF,
 * so the 'reports' grant owns it (setClientRetainer rule). Upserts on the
 * (client, month) unique pair; an emptied body deletes the row instead of
 * storing a tombstone.
 */
export async function saveReportNote(
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('reports', '/admin');

  try {
    const parsed = reportNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenTaskIssues(parsed.error),
      };
    }
    const { clientId, month, body } = parsed.data;

    if (!body) {
      await db
        .delete(reportNotes)
        .where(
          and(eq(reportNotes.clientId, clientId), eq(reportNotes.month, month)),
        );
      invalidateTasks();
      return { ok: true, id: clientId };
    }

    try {
      await db
        .insert(reportNotes)
        .values({ clientId, month, body, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [reportNotes.clientId, reportNotes.month],
          set: { body, updatedAt: new Date() },
        });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'server' };
      }
      throw dbError;
    }

    invalidateTasks();
    return { ok: true, id: clientId };
  } catch (error) {
    logError('[tasks] saveReportNote failed', error);
    return { ok: false, error: 'server' };
  }
}

export type ReportShareResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

const shareUrl = (token: string) => `${SITE_URL}/share/reports/${token}`;

/**
 * Mint (or return) the active share link for one client-month — the public
 * read-only report URL a client receives. Get-or-create rides the partial
 * unique index: a concurrent mint (or an already-active link) hits the
 * unique violation and re-reads the existing row, so there is never more
 * than one live link per client-month (neon-http has no transactions to
 * check-then-insert safely). 'reports'-gated: shares are client-deliverable
 * concerns (setClientRetainer rule).
 */
export async function mintReportShare(
  clientId: string,
  rawMonth: string,
): Promise<ReportShareResult> {
  const profile = await requireArea('reports', '/admin');

  try {
    if (!UUID_RE.test(clientId)) return { ok: false, error: 'Unknown client.' };
    const month = parseMonthToken(rawMonth);
    if (!month) return { ok: false, error: 'Unknown report month.' };

    const token = randomBytes(24).toString('base64url');
    try {
      const [inserted] = await db
        .insert(reportShares)
        .values({
          clientId,
          month,
          token,
          createdById: profile.session.user.id,
          createdByName: profile.session.user.name,
          // Frozen at mint time so the shared page renders the month in the
          // zone this admin was reading it in. The share page has no session
          // to resolve one from, and boundaries that followed the CLIENT'''s
          // clock would hand them different numbers than were sent.
          timezone: await viewerZone(),
        })
        .returning({ id: reportShares.id, token: reportShares.token });

      // Minting a share puts a client month on the public internet behind an
      // unguessable URL. That is the single most security-relevant thing this
      // file does, so it gets an activity_log row even though tasks otherwise
      // audit into task_events. The TOKEN IS NEVER LOGGED — it is the
      // capability itself, and the denylist refuses the key regardless.
      logActivity(profile, {
        area: 'reports',
        entity: 'reportShare',
        entityId: inserted.id,
        entityName: `${month} report`,
        action: 'send',
        summary: `Created a public share link for the ${month} report`,
        payload: { meta: { month, clientId } },
      });

      invalidateTasks();
      return { ok: true, id: inserted.id, url: shareUrl(inserted.token) };
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        const existing = await getActiveReportShare(clientId, month);
        if (existing) {
          return { ok: true, id: existing.id, url: shareUrl(existing.token) };
        }
      }
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'That client no longer exists.' };
      }
      throw dbError;
    }
  } catch (error) {
    logError('[tasks] mintReportShare failed', error);
    return { ok: false, error: 'Could not create the link — try again.' };
  }
}

/** Revoke a share link — the row is kept (who shared what, when) but the
 *  public URL 404s from the next request (the share page is force-dynamic). */
export async function revokeReportShare(
  shareId: string,
): Promise<TaskActionResult> {
  const profile = await requireArea('reports', '/admin');

  try {
    if (!UUID_RE.test(shareId)) return { ok: false, error: 'Invalid link.' };
    const updated = await db
      .update(reportShares)
      .set({ revokedAt: new Date() })
      .where(and(eq(reportShares.id, shareId), isNull(reportShares.revokedAt)))
      .returning({ id: reportShares.id, month: reportShares.month });
    if (updated.length === 0) {
      return { ok: false, error: 'This link was already revoked.' };
    }
    logActivity(profile, {
      area: 'reports',
      entity: 'reportShare',
      entityId: shareId,
      entityName: `${updated[0].month} report`,
      action: 'delete',
      summary: `Revoked the public share link for the ${updated[0].month} report`,
      payload: { meta: { month: updated[0].month } },
    });
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] revokeReportShare failed', error);
    return { ok: false, error: 'Could not revoke the link — try again.' };
  }
}

// ── Category vocabulary ────────────────────────────────

// ── Saved views ─────────────────────────────────────────────────────────────

/**
 * Save the current filter combination under a name. Re-saving an existing
 * name UPDATES it (the unique index on (user_id, name) makes that an upsert),
 * so "Save" on a tweaked view is a correction, not a duplicate.
 */
export async function saveTaskView(input: unknown): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const parsed = taskViewSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: Object.values(flattenTaskIssues(parsed.error))[0] };
    }
    const data = parsed.data;

    await db
      .insert(taskViews)
      .values({
        userId: profile.session.user.id,
        ownerName: profile.session.user.name,
        name: data.name,
        query: data.query,
        shared: data.shared,
      })
      .onConflictDoUpdate({
        target: [taskViews.userId, taskViews.name],
        set: { query: data.query, shared: data.shared },
      });

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] saveTaskView failed', error);
    return { ok: false, error: 'Could not save the view — try again.' };
  }
}

/** Own views only — the ownership check lives in the WHERE clause, so there is
 *  no read-then-delete window (the deleteTaskComment precedent). */
export async function deleteTaskView(id: string): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid view.' };
    const deleted = await db
      .delete(taskViews)
      .where(
        and(
          eq(taskViews.id, id),
          eq(taskViews.userId, profile.session.user.id),
        ),
      )
      .returning({ id: taskViews.id });
    if (deleted.length === 0) {
      return { ok: false, error: 'That view is not yours to delete.' };
    }
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskView failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

// ── Templates ───────────────────────────────────────────────────────────────
// Saved task shapes: spawn one by hand, or let `repeat` mint it on a schedule
// (the recurring cron). 'tasks'-gated like the rest of the surface — routine
// work is the team's business, not a superadmin's.

/** The template fields shared by create and update — everything except the
 *  identity columns. Resolves the schedule so 'none' can't keep a stale day. */
function templateValues(data: TaskTemplateInput) {
  return {
    name: data.name,
    title: data.title,
    notes: data.notes ?? null,
    clientId: data.clientId ?? null,
    categoryId: data.categoryId,
    assigneeId: data.assigneeId ?? null,
    priority: data.priority ?? null,
    estimatedMinutes: data.estimatedMinutes,
    repeat: data.repeat,
    // A non-repeating template has no day, whatever the form last sent.
    repeatDay: data.repeat === 'none' ? null : (data.repeatDay ?? null),
    dueOffsetDays: data.dueOffsetDays ?? null,
    active: data.active,
    updatedAt: new Date(),
  };
}

export async function createTaskTemplate(
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const parsed = taskTemplateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    const catProblem = await categoryProblem(data.categoryId);
    if (catProblem) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            catProblem === 'archived'
              ? 'That category is archived — pick another.'
              : 'Pick a category from the list.',
        },
      };
    }

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(taskTemplates)
        .values({
          ...templateValues(data),
          createdById: profile.session.user.id,
          createdByName: profile.session.user.name,
        })
        .returning({ id: taskTemplates.id });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists.' },
        };
      }
      throw dbError;
    }

    invalidateTasks();
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    logError('[tasks] createTaskTemplate failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateTaskTemplate(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = taskTemplateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    const catProblem = await categoryProblem(data.categoryId);
    if (catProblem) {
      return {
        ok: false,
        error: 'validation',
        issues: {
          categoryId:
            catProblem === 'archived'
              ? 'That category is archived — pick another.'
              : 'Pick a category from the list.',
        },
      };
    }

    let updated: { id: string }[];
    try {
      updated = await db
        .update(taskTemplates)
        .set(templateValues(data))
        .where(eq(taskTemplates.id, id))
        .returning({ id: taskTemplates.id });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists.' },
        };
      }
      throw dbError;
    }
    if (updated.length === 0) return { ok: false, error: 'server' };

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] updateTaskTemplate failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Pause or resume a schedule without losing the shape. */
export async function setTaskTemplateActive(
  id: string,
  active: boolean,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid template.' };
    await db
      .update(taskTemplates)
      .set({ active, updatedAt: new Date() })
      .where(eq(taskTemplates.id, id));
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] setTaskTemplateActive failed', error);
    return { ok: false, error: 'Could not update the template — try again.' };
  }
}

/** Deleting a template never touches the tasks it minted — `tasks.template_id`
 *  is SET NULL, so the work (and every report it feeds) survives. */
export async function deleteTaskTemplate(
  id: string,
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid template.' };
    const removed = await db
      .delete(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .returning({ title: taskTemplates.title });
    if (removed.length > 0) {
      // Structural: a deleted template silently stops a recurring task from
      // ever being minted again, which is otherwise invisible.
      logActivity(profile, {
        area: 'tasks',
        entity: 'taskTemplate',
        entityId: id,
        entityName: removed[0].title,
        action: 'delete',
        summary: `Deleted the recurring template "${removed[0].title}"`,
      });
    }
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskTemplate failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/**
 * Mint one task from a template, by hand. Dates are stamped now: start today,
 * due today + the template's offset (unset when it has none).
 *
 * Deliberately NOT carrying a `templateRunKey` — that key belongs to the
 * cron's occurrence, and reusing it would let a manual spawn silently block
 * that day's scheduled mint (or be blocked by it). A hand-spawned task is
 * always allowed, however many times you ask.
 */
export async function createTaskFromTemplate(
  id: string,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const template = await getTaskTemplate(id);
    if (!template) return { ok: false, error: 'server' };

    // The template may name someone whose account has since been deleted
    // (assigneeId SET NULL), so fall back to the person spawning it — a task
    // needs an owner, and the obvious one is whoever asked for it.
    const assignee = template.assigneeId
      ? await lookupAssignee(template.assigneeId)
      : null;
    // The template's start date is "today" for the person who clicked it, not
    // for the studio — an evening spawn in Tehran must not be filed yesterday.
    const todayKey = dayKeyIn(await viewerZone(), new Date());

    const [inserted] = await db
      .insert(tasks)
      .values({
        title: template.title,
        notes: template.notes,
        clientId: template.clientId,
        categoryId: template.categoryId,
        status: 'todo',
        priority: template.priority,
        assigneeId: assignee?.id ?? profile.session.user.id,
        assigneeName: assignee?.name ?? profile.session.user.name,
        createdById: profile.session.user.id,
        createdByName: profile.session.user.name,
        estimatedMinutes: template.estimatedMinutes,
        startDate: todayKey,
        dueDate:
          template.dueOffsetDays === null
            ? null
            : shiftDayKey(todayKey, template.dueOffsetDays),
        templateId: template.id,
      })
      .returning({ id: tasks.id });

    logTaskEvents([
      {
        taskId: inserted.id,
        taskTitle: template.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'created',
        payload: { fromTemplate: template.name },
      },
    ]);

    invalidateTasks();
    return { ok: true, id: inserted.id };
  } catch (error) {
    logError('[tasks] createTaskFromTemplate failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Tags ────────────────────────────────────────────────────────────────────
//
// One gate, on the category precedent: anyone holding 'tasks' may both put
// tags ON a task and change what the tags ARE. The vocabulary is guarded by
// its own domain rules rather than by a role — delete refuses while anything
// carries the tag, archive is the retirement path, and the slug is immutable,
// so nothing a member can do here orphans a filter URL or a saved view.
//
// Tags move through their OWN door, exactly as status does. patchTask and
// bulkPatchTasks are structurally unable to touch them — their schemas have
// no tagIds key — so an inline cell edit can never route around the diffing
// and the activity entry below.

/**
 * The one replace door for a single task's tags — the edit dialog and the
 * board's inline cell. An EMPTY array is a meaningful value: it clears them.
 */
export async function setTaskTags(
  id: string,
  input: unknown,
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid task.' };
    const parsed = setTaskTagsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          Object.values(flattenTaskIssues(parsed.error))[0] ??
          'Those tags are not valid.',
      };
    }

    // The title rides along for the activity row's snapshot (task_events keeps
    // it so history survives a hard delete); its absence is also how a deleted
    // task is detected before any write.
    const [existing] = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'That task no longer exists.' };

    const currentIds = await listTagIdsForTask(id);
    const moved = await applyTaskTags(id, parsed.data.tagIds, currentIds);
    if (!moved) {
      return { ok: false, error: 'One of those tags is no longer available.' };
    }

    if (moved.added.length > 0 || moved.removed.length > 0) {
      const tagChange = await tagChangeEntry(currentIds, parsed.data.tagIds);
      if (tagChange) {
        logTaskEvents([
          {
            taskId: id,
            taskTitle: existing.title,
            actorId: profile.session.user.id,
            actorName: profile.session.user.name,
            kind: 'updated',
            payload: { changes: { tags: tagChange } },
          },
        ]);
      }
    }

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] setTaskTags failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * The bulk door: ADD and/or REMOVE across a selection, never replace.
 *
 * A "set tags" across a mixed selection would wipe whatever each row already
 * carried — the one edit nobody means to make. Add is a single multi-row
 * insert riding the composite PK (so rows that already have the tag simply
 * don't conflict), remove a single scoped delete; neither reads first, so
 * neither can race.
 *
 * The per-task cap is not re-checked here on purpose: enforcing it would mean
 * a read per row, and the failure mode of a bulk add pushing one task to nine
 * tags is a slightly long chip strip, not a corrupt record.
 */
export async function setTasksTagsBulk(
  ids: string[],
  input: unknown,
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    const taskIds = [...new Set(ids)].filter((id) => UUID_RE.test(id));
    if (taskIds.length === 0) return { ok: false, error: 'Nothing selected.' };
    const parsed = bulkTaskTagsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          Object.values(flattenTaskIssues(parsed.error))[0] ??
          'Pick at least one tag.',
      };
    }
    const { add, remove } = parsed.data;

    // Titles for the activity rows, and the membership check in one read: an
    // id that isn't a real task simply isn't in the result and is skipped.
    const rows = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(inArray(tasks.id, taskIds));
    if (rows.length === 0) return { ok: false, error: 'Nothing selected.' };

    if (add.length > 0) {
      const live = await db
        .select({ id: taskTags.id })
        .from(taskTags)
        .where(and(inArray(taskTags.id, add), eq(taskTags.archived, false)));
      if (live.length !== add.length) {
        return { ok: false, error: 'One of those tags is no longer available.' };
      }
      await db
        .insert(taskTagLinks)
        .values(
          rows.flatMap((row) => add.map((tagId) => ({ taskId: row.id, tagId }))),
        )
        .onConflictDoNothing();
    }

    if (remove.length > 0) {
      await db
        .delete(taskTagLinks)
        .where(
          and(
            inArray(
              taskTagLinks.taskId,
              rows.map((r) => r.id),
            ),
            inArray(taskTagLinks.tagId, remove),
          ),
        );
    }

    const names = await tagNamesByIds([...add, ...remove]);
    const label = (id: string) => names.get(id) ?? 'a tag';
    // A COMPLETE phrase, under its own change key: the per-task `tags` entry
    // is a from→to of the whole set, which a bulk add/remove doesn't know
    // (it never read each row's existing tags — that is what makes it
    // race-free). `tagsBulk` renders as written instead of as an arrow.
    const summary = [
      add.length > 0 ? `added ${add.map(label).join(', ')}` : '',
      remove.length > 0 ? `removed ${remove.map(label).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    logTaskEvents(
      rows.map((row) => ({
        taskId: row.id,
        taskTitle: row.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'updated' as const,
        payload: { changes: { tagsBulk: { to: summary } }, bulk: true },
      })),
    );

    invalidateTasks();
    return { ok: true, updated: rows.length };
  } catch (error) {
    logError('[tasks] setTasksTagsBulk failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** The next picker slot for a tag, WITHIN its type: tags are seeded in tens
 *  so a new "Format" tag lands beside the other formats rather than after
 *  every workflow tag. */
async function nextTagSort(typeId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | string | null>`max(${taskTags.sortIndex})` })
    .from(taskTags)
    .where(eq(taskTags.typeId, typeId));
  return Number(row?.max ?? 0) + 10;
}

/** Replace a tag's WHOLE category scope. Delete-all-then-insert rather than a
 *  diff: the set is at most seven rows, so the simpler shape wins. Used by the
 *  tag-major pane, which owns every category at once; the category-major pane
 *  goes through setCategoryTagOffers, which must not touch other categories'
 *  rows and therefore cannot use this. */
async function writeTagScope(tagId: string, categoryIds: string[]) {
  await db
    .delete(taskTagCategories)
    .where(eq(taskTagCategories.tagId, tagId));
  if (categoryIds.length === 0) return;
  await db
    .insert(taskTagCategories)
    .values(categoryIds.map((categoryId) => ({ tagId, categoryId })))
    .onConflictDoNothing();
}

export async function createTaskTag(
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    const parsed = taskTagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    const base = slugify(data.name).slice(0, TASK_TAG_NAME_MAX).replace(/-+$/, '');
    if (base.length < 2) {
      return {
        ok: false,
        error: 'validation',
        issues: { name: 'Use letters or numbers in the name.' },
      };
    }
    const sortIndex = await nextTagSort(data.typeId);

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      try {
        const [inserted] = await db
          .insert(taskTags)
          .values({
            name: data.name,
            slug: candidate,
            typeId: data.typeId,
            sortIndex,
          })
          .returning({ id: taskTags.id });

        // The scope write gets its OWN catch, and that separation is the
        // point: isFkViolation is code-only (23503), so sharing a catch with
        // the insert above reported a dead CATEGORY as "that tag type no
        // longer exists". Worse, neon-http has no transactions — the tag row
        // is already committed by now, and a tag with zero scope rows reads
        // as GLOBAL, so the failure used to strand a tag offered under every
        // category that the pane it was created from cannot narrow (the
        // category pane renders globals read-only, and setCategoryTagOffers
        // refuses them). Deleting the row we just wrote is the compensating
        // half a transaction would have done for free, and it also stops a
        // retry minting `name-2`, `name-3`, … globals on every attempt.
        try {
          await writeTagScope(inserted.id, data.categoryIds);
        } catch (scopeError) {
          if (!isFkViolation(scopeError)) throw scopeError;
          await db
            .delete(taskTags)
            .where(eq(taskTags.id, inserted.id))
            .catch(() => {
              // Best-effort: the tag is unreferenced and removable from "All
              // tags", so a failed rollback must not mask the real error.
            });
          return {
            ok: false,
            error: 'validation',
            issues: { categoryIds: 'That category no longer exists.' },
          };
        }

        invalidateTasks();
        return { ok: true, id: inserted.id };
      } catch (dbError) {
        // Only the INSERT above can reach here with an FK violation now, and
        // its one FK is type_id.
        if (isFkViolation(dbError)) {
          return {
            ok: false,
            error: 'validation',
            issues: { typeId: 'That tag type no longer exists.' },
          };
        }
        if (!isUniqueViolation(dbError)) throw dbError;
      }
    }
    return {
      ok: false,
      error: 'validation',
      issues: { name: 'A tag with this name already exists.' },
    };
  } catch (error) {
    logError('[tasks] createTaskTag failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Rename, retype and/or rescope. The slug is immutable after creation —
 *  filter URLs and saved views carry it. Rescoping never touches the tasks
 *  already carrying the tag: scope gates the picker, not the stored value. */
export async function updateTaskTag(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = taskTagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }

    let updated: { id: string }[];
    try {
      updated = await db
        .update(taskTags)
        .set({
          name: parsed.data.name,
          typeId: parsed.data.typeId,
          updatedAt: new Date(),
        })
        .where(eq(taskTags.id, id))
        .returning({ id: taskTags.id });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { typeId: 'That tag type no longer exists.' },
        };
      }
      throw dbError;
    }
    if (updated.length === 0) return { ok: false, error: 'server' };

    try {
      await writeTagScope(id, parsed.data.categoryIds);
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { categoryIds: 'One of those categories no longer exists.' },
        };
      }
      throw dbError;
    }

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] updateTaskTag failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function setTaskTagArchived(
  id: string,
  archived: boolean,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid tag.' };
    const updated = await db
      .update(taskTags)
      .set({ archived: archived === true, updatedAt: new Date() })
      .where(eq(taskTags.id, id))
      .returning({ id: taskTags.id });
    if (updated.length === 0) return { ok: false, error: 'Tag not found.' };

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] setTaskTagArchived failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** Refused while any task carries it (deleteTaskCategory's shape) — archive is
 *  the supported retirement path; the restrict FK is the race backstop. */
export async function deleteTaskTag(id: string): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid tag.' };

    const [{ inUse }] = await db
      .select({ inUse: count() })
      .from(taskTagLinks)
      .where(eq(taskTagLinks.tagId, id));
    if (inUse > 0) {
      return {
        ok: false,
        error: `This tag is on ${inUse} task${inUse === 1 ? '' : 's'} — archive it instead.`,
      };
    }

    let removed: { name: string }[];
    try {
      // name rides the RETURNING so the audit row can name the deleted tag
      // without a read the delete didn't otherwise need. The scope rows
      // cascade; only the task links are restrict.
      removed = await db
        .delete(taskTags)
        .where(eq(taskTags.id, id))
        .returning({ name: taskTags.name });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'This tag is in use — archive it instead.' };
      }
      throw dbError;
    }

    if (removed.length > 0) {
      // Structural, like a category delete: the tag vocabulary is what the
      // board filters and the internal tag mix are read through. Routine
      // per-task tagging stays in task_events, where it belongs.
      logActivity(profile, {
        area: 'tasks',
        entity: 'taskTag',
        entityId: id,
        entityName: removed[0].name,
        action: 'delete',
        summary: `Deleted the task tag "${removed[0].name}"`,
      });
    }

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskTag failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

// ── Tag types ───────────────────────────────────────────────────────────────

/**
 * The axis vocabulary — "Format", "Content", "Workflow", and whatever the
 * studio adds. Rows since 2026-08-24, replacing the `task_tag_group` enum.
 *
 * Same door as the tags themselves (`requireArea('tasks')`): the people doing
 * the tagging are the ones who know what axis is missing, and the domain rules
 * below — counted refusal on delete, immutable slug, archive as the retirement
 * path — are what guard the vocabulary, not a role.
 */
export async function createTaskTagType(
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    const parsed = taskTagTypeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenTaskIssues(parsed.error),
      };
    }
    const data = parsed.data;

    const base = slugify(data.name)
      .slice(0, TASK_TAG_TYPE_NAME_MAX)
      .replace(/-+$/, '');
    if (base.length < 2) {
      return {
        ok: false,
        error: 'validation',
        issues: { name: 'Use letters or numbers in the name.' },
      };
    }

    const [row] = await db
      .select({ max: sql<number | string | null>`max(${taskTagTypes.sortIndex})` })
      .from(taskTagTypes);
    const sortIndex = Number(row?.max ?? 0) + 10;

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      try {
        const [inserted] = await db
          .insert(taskTagTypes)
          .values({
            name: data.name,
            slug: candidate,
            hint: data.hint,
            tone: data.tone,
            sortIndex,
          })
          .returning({ id: taskTagTypes.id });
        invalidateTasks();
        return { ok: true, id: inserted.id };
      } catch (dbError) {
        if (!isUniqueViolation(dbError)) throw dbError;
      }
    }
    return {
      ok: false,
      error: 'validation',
      issues: { name: 'A type with this name already exists.' },
    };
  } catch (error) {
    logError('[tasks] createTaskTagType failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Rename, re-describe and/or recolour. The slug is immutable after creation
 *  — the seed script matches types by slug, so a rename must never orphan it.
 *  Recolouring repaints every chip of every tag under the type at once, which
 *  is the point: colour belongs to the axis, never to one tag. */
export async function updateTaskTagType(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = taskTagTypeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenTaskIssues(parsed.error),
      };
    }

    const updated = await db
      .update(taskTagTypes)
      .set({
        name: parsed.data.name,
        hint: parsed.data.hint,
        tone: parsed.data.tone,
        updatedAt: new Date(),
      })
      .where(eq(taskTagTypes.id, id))
      .returning({ id: taskTagTypes.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] updateTaskTagType failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Archiving a type takes IT AND EVERY TAG UNDER IT off every picker in one
 * act — that is what retiring an axis means. Tasks already carrying those
 * tags keep their chips: tagsForTasks never filters on archived.
 *
 * Refused when it would archive the last live type, for the same reason
 * deleting it is: a new tag would then have no type to be created under.
 */
export async function setTaskTagTypeArchived(
  id: string,
  archived: boolean,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid tag type.' };

    if (archived === true) {
      const [{ live }] = await db
        .select({ live: count() })
        .from(taskTagTypes)
        .where(eq(taskTagTypes.archived, false));
      if (live <= 1) {
        return {
          ok: false,
          error: 'This is the last tag type — a tag has to have one.',
        };
      }
    }

    const updated = await db
      .update(taskTagTypes)
      .set({ archived: archived === true, updatedAt: new Date() })
      .where(eq(taskTagTypes.id, id))
      .returning({ id: taskTagTypes.id });
    if (updated.length === 0) return { ok: false, error: 'Tag type not found.' };

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] setTaskTagTypeArchived failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * Two refusals, both re-checked here because a stale client is exactly the
 * case that matters (deleteTaskTag's shape):
 *
 *  - any tag still carries the type. Archive is the retirement path, and the
 *    error says how many are in the way. The restrict FK on task_tags.type_id
 *    is the race backstop behind this count.
 *  - it is the last live type. Every tag needs one, so emptying the
 *    vocabulary would leave "Add a tag" with nothing to file it under.
 */
export async function deleteTaskTagType(id: string): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid tag type.' };

    const [[{ inUse }], [{ live }]] = await Promise.all([
      db
        .select({ inUse: count() })
        .from(taskTags)
        .where(eq(taskTags.typeId, id)),
      db
        .select({ live: count() })
        .from(taskTagTypes)
        .where(eq(taskTagTypes.archived, false)),
    ]);
    if (inUse > 0) {
      return {
        ok: false,
        error: `${inUse} tag${inUse === 1 ? '' : 's'} use this type — move or delete ${inUse === 1 ? 'it' : 'them'} first.`,
      };
    }
    if (live <= 1) {
      return {
        ok: false,
        error: 'This is the last tag type — a tag has to have one.',
      };
    }

    let removed: { name: string }[];
    try {
      removed = await db
        .delete(taskTagTypes)
        .where(eq(taskTagTypes.id, id))
        .returning({ name: taskTagTypes.name });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'This type is in use — archive it instead.',
        };
      }
      throw dbError;
    }

    if (removed.length > 0) {
      // Structural, like a tag or category delete: the type vocabulary is what
      // sections every picker and colours every chip.
      logActivity(profile, {
        area: 'tasks',
        entity: 'taskTagType',
        entityId: id,
        entityName: removed[0].name,
        action: 'delete',
        summary: `Deleted the task tag type "${removed[0].name}"`,
      });
    }

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskTagType failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/**
 * Set which tags a CATEGORY offers — the category-major half of scoping, and
 * the door the manage dialog's category pane uses.
 *
 * Deliberately NOT writeTagScope: that replaces one tag's whole scope, which
 * from this end would wipe every other category's rows. This is a delta over
 * a single `categoryId` column instead.
 *
 * Two rules the UI also enforces, restated here because a stale client is the
 * case that matters:
 *
 *  - A GLOBAL tag (zero scope rows) is refused. Empty scope means "offered
 *    everywhere", so quietly giving one a row would silently demote it to an
 *    enumerated tag that no future category ever picks up.
 *  - A tag whose ONLY scope row is this category cannot be dropped here. It
 *    would land on zero rows, which reads as global — so removing it from its
 *    last category would make it appear under every category instead of none.
 *    Archive is the retirement path, and the error says so.
 */
export async function setCategoryTagOffers(
  input: unknown,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

  try {
    const parsed = categoryTagOffersSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'Pick a category and tags from the list.' };
    }
    const { categoryId, tagIds } = parsed.data;

    // Two round trips, not three. The first answers "what does this category
    // offer today"; only then is the full set of tags in play known, so the
    // second can fetch every scope row for all of them at once — which is
    // what lets planCategoryTagOffers decide both refusals without a third.
    //
    // `archived` rides the first query because the pane CANNOT send an
    // archived tag back — it does not render them — so without knowing which
    // ids are archived the delta would read that silence as "stop offering it
    // here" and quietly delete a scope row the user never saw.
    //
    // The TYPE's archived flag counts the same way and for the same reason:
    // archiving a type retires every tag under it, so the pane stops
    // rendering those too. Miss this and saving any category would try to
    // drop their scope rows — or refuse the save outright, naming a tag that
    // is nowhere on screen.
    const hereRows = await db
      .select({
        tagId: taskTagCategories.tagId,
        archived: taskTags.archived,
        typeArchived: taskTagTypes.archived,
      })
      .from(taskTagCategories)
      .innerJoin(taskTags, eq(taskTags.id, taskTagCategories.tagId))
      .innerJoin(taskTagTypes, eq(taskTagTypes.id, taskTags.typeId))
      .where(eq(taskTagCategories.categoryId, categoryId));

    const frozen = hereRows
      .filter((r) => r.archived || r.typeArchived)
      .map((r) => r.tagId);
    const inPlay = [...new Set([...tagIds, ...hereRows.map((r) => r.tagId)])];
    const rows =
      inPlay.length > 0
        ? await db
            .select({
              tagId: taskTagCategories.tagId,
              categoryId: taskTagCategories.categoryId,
            })
            .from(taskTagCategories)
            .where(inArray(taskTagCategories.tagId, inPlay))
        : [];

    const plan = planCategoryTagOffers({ categoryId, rows, wanted: tagIds, frozen });

    if (plan.globals.length > 0) {
      const names = await tagNamesByIds(plan.globals);
      const label = plan.globals
        .map((id) => names.get(id) ?? 'That tag')
        .join(', ');
      return {
        ok: false,
        error: `${label} is offered everywhere — narrow it from "All tags" instead.`,
      };
    }
    if (plan.orphans.length > 0) {
      const names = await tagNamesByIds(plan.orphans);
      const label = plan.orphans
        .map((id) => names.get(id) ?? 'That tag')
        .join(', ');
      return {
        ok: false,
        error: `${label} is only offered here — archive it instead of removing it.`,
      };
    }

    if (plan.removing.length > 0) {
      await db
        .delete(taskTagCategories)
        .where(
          and(
            eq(taskTagCategories.categoryId, categoryId),
            inArray(taskTagCategories.tagId, plan.removing),
          ),
        );
    }
    if (plan.adding.length > 0) {
      try {
        await db
          .insert(taskTagCategories)
          .values(plan.adding.map((tagId) => ({ tagId, categoryId })))
          .onConflictDoNothing();
      } catch (dbError) {
        if (isFkViolation(dbError)) {
          return { ok: false, error: 'That category no longer exists.' };
        }
        throw dbError;
      }
    }

    invalidateTasks();
    return { ok: true, updated: plan.removing.length + plan.adding.length };
  } catch (error) {
    logError('[tasks] setCategoryTagOffers failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** The next picker slot — appends after the current last category (seeded in
 *  steps of 10, nextMarqueeSort convention). */
async function nextCategorySort(): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number | string | null>`max(${taskCategories.sortIndex})`,
    })
    .from(taskCategories);
  return Number(row?.max ?? 0) + 10;
}

export async function createTaskCategory(
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    const parsed = taskCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    const base = slugify(data.name).slice(0, 60).replace(/-+$/, '');
    if (base.length < 2) {
      return {
        ok: false,
        error: 'validation',
        issues: { name: 'Use letters or numbers in the name.' },
      };
    }
    const sortIndex = await nextCategorySort();

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      try {
        const [inserted] = await db
          .insert(taskCategories)
          .values({
            name: data.name,
            slug: candidate,
            siteCategory: data.siteCategory,
            sortIndex,
          })
          .returning({ id: taskCategories.id });
        invalidateTasks();
        return { ok: true, id: inserted.id };
      } catch (dbError) {
        if (!isUniqueViolation(dbError)) throw dbError;
      }
    }
    return {
      ok: false,
      error: 'validation',
      issues: { name: 'A category with this name already exists.' },
    };
  } catch (error) {
    logError('[tasks] createTaskCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Rename and/or remap. The slug is immutable after creation — filter URLs
 *  and report history carry it. */
export async function updateTaskCategory(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = taskCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }

    const updated = await db
      .update(taskCategories)
      .set({
        name: parsed.data.name,
        siteCategory: parsed.data.siteCategory,
        updatedAt: new Date(),
      })
      .where(eq(taskCategories.id, id))
      .returning({ id: taskCategories.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    logError('[tasks] updateTaskCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function setTaskCategoryArchived(
  id: string,
  archived: boolean,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid category.' };
    const updated = await db
      .update(taskCategories)
      .set({ archived: archived === true, updatedAt: new Date() })
      .where(eq(taskCategories.id, id))
      .returning({ id: taskCategories.id });
    if (updated.length === 0) return { ok: false, error: 'Category not found.' };

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] setTaskCategoryArchived failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** Refused while tasks reference it (deleteClient guard shape) — archive is
 *  the supported retirement path; the FK restrict is the race backstop. */
export async function deleteTaskCategory(id: string): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid category.' };

    // Templates hold the same restrict FK as tasks, so a category still
    // referenced by one would fail at the constraint with a raw error —
    // count both and say which is holding it.
    const [[{ inUse }], templateCount] = await Promise.all([
      db
        .select({ inUse: count() })
        .from(tasks)
        .where(eq(tasks.categoryId, id)),
      countTemplatesInCategory(id),
    ]);
    if (inUse > 0) {
      return {
        ok: false,
        error: `This category is used by ${inUse} task${inUse === 1 ? '' : 's'} — archive it instead.`,
      };
    }
    if (templateCount > 0) {
      return {
        ok: false,
        error: `This category is used by ${templateCount} template${templateCount === 1 ? '' : 's'} — archive it instead.`,
      };
    }

    let removed: { name: string }[];
    try {
      // name rides the RETURNING so the audit row can name the deleted
      // category without a read the delete didn't otherwise need.
      removed = await db
        .delete(taskCategories)
        .where(eq(taskCategories.id, id))
        .returning({ name: taskCategories.name });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'This category is in use — archive it instead.',
        };
      }
      throw dbError;
    }

    if (removed.length > 0) {
      // Structural: the category vocabulary is what every report groups by.
      logActivity(profile, {
        area: 'tasks',
        entity: 'taskCategory',
        entityId: id,
        entityName: removed[0].name,
        action: 'delete',
        summary: `Deleted the task category "${removed[0].name}"`,
      });
    }

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskCategory failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

// ── Activity feed + comments ────────────────────────────────────────────────
//
// Reads-via-action, on the searchSubmissionsAction precedent: the edit dialog
// opens client-side without a navigation, so its activity feed loads through
// a gate-first server action. Formatting happens HERE (server-formatted
// strings only reach the client — the house hydration rule).

export type TaskActivityItem = {
  id: string;
  kind: TaskEvent['kind'];
  actorName: string;
  avatar: RowAvatar | null;
  /** Pre-built sentence ('marked this done · 1h 30m'); '' for comments. */
  headline: string;
  /** Comment text; '' for non-comments. */
  body: string;
  /** Vancouver-formatted, e.g. 'Aug 16, 2:34 p.m.'. */
  timeLabel: string;
  /** Own comment, or any comment for a superadmin. */
  canDelete: boolean;
};

export type TaskActivityResult =
  | { ok: true; items: TaskActivityItem[] }
  | { ok: false; error: string };

const EVENT_TIME_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

function changeMapOf(payload: unknown): TaskChangeMap {
  if (!payload || typeof payload !== 'object') return {};
  const changes = (payload as { changes?: unknown }).changes;
  return changes && typeof changes === 'object'
    ? (changes as TaskChangeMap)
    : {};
}

function changePhrase(
  key: string,
  to: unknown,
  clientLabels: Map<string, string>,
  categoryLabels: Map<string, string>,
  todayKey: string,
): string {
  switch (key) {
    case 'title':
      return typeof to === 'string' ? `renamed to “${to}”` : 'renamed';
    case 'notes':
      return 'edited the description';
    case 'link':
      return to ? 'updated the deliverable link' : 'removed the deliverable link';
    case 'client': {
      if (to == null) return `moved to ${INTERNAL_CLIENT_LABEL}`;
      const name = typeof to === 'string' ? clientLabels.get(to) : undefined;
      return `client → ${name ?? 'another client'}`;
    }
    case 'category': {
      const name = typeof to === 'string' ? categoryLabels.get(to) : undefined;
      return `category → ${name ?? 'another category'}`;
    }
    case 'assignee':
      return typeof to === 'string' ? `assigned to ${to}` : 'reassigned';
    // Tags arrive as NAMES, not ids (a change is a set, so the write side
    // resolves them once rather than making the feed batch a second lookup).
    case 'tags':
      if (typeof to !== 'string') return 'tags changed';
      return to ? `tags → ${to}` : 'tags cleared';
    // Already a complete phrase ("added Reels · removed Revision"): a bulk
    // add/remove never reads each row's existing set, so it has no from→to
    // to render as an arrow.
    case 'tagsBulk':
      return typeof to === 'string' && to ? to : 'tags changed';
    case 'priority':
      return to == null
        ? 'priority cleared'
        : `priority → ${
            typeof to === 'string' && to in TASK_PRIORITY_LABELS
              ? TASK_PRIORITY_LABELS[to as TaskPrioritySlug].toLowerCase()
              : String(to)
          }`;
    case 'estimate':
      return typeof to === 'number'
        ? `estimate → ${formatMinutes(to)}`
        : 'estimate changed';
    case 'logged':
      return typeof to === 'number'
        ? `logged time → ${formatMinutes(to)}`
        : 'logged time changed';
    case 'start':
      return to == null
        ? 'start date cleared'
        : typeof to === 'string'
          ? `starts ${dueDateLabel(to, todayKey)}`
          : 'start date changed';
    case 'due':
      return to == null
        ? 'due date cleared'
        : typeof to === 'string'
          ? `due ${dueDateLabel(to, todayKey)}`
          : 'due date changed';
    default:
      return `${key} changed`;
  }
}

function headlineFor(
  event: TaskEvent,
  clientLabels: Map<string, string>,
  categoryLabels: Map<string, string>,
  todayKey: string,
): string {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const bulk = payload.bulk ? ' (bulk edit)' : '';
  switch (event.kind) {
    case 'created':
      return payload.duplicatedFromId
        ? 'created this task as a duplicate'
        : 'created this task';
    case 'status': {
      const to = payload.to;
      const minutes =
        typeof payload.actualMinutes === 'number'
          ? ` · ${formatMinutes(payload.actualMinutes)}`
          : '';
      if (to === 'done') return `marked this done${minutes}${bulk}`;
      if (to === 'needs_approval') {
        return `sent this for approval${minutes}${bulk}`;
      }
      return `moved this to ${
        isTaskStatus(to) ? TASK_STATUS_LABELS[to].toLowerCase() : String(to)
      }${bulk}`;
    }
    case 'updated': {
      const parts = Object.entries(changeMapOf(event.payload)).map(
        ([key, change]) =>
          changePhrase(key, change?.to, clientLabels, categoryLabels, todayKey),
      );
      return parts.length > 0
        ? `${parts.join(' · ')}${bulk}`
        : 'edited this task';
    }
    case 'comment':
      return '';
    default:
      return 'deleted this task';
  }
}

/** The edit dialog's activity feed — last 100 events, oldest first (the
 *  composer sits at the bottom), fully server-formatted. */
export async function getTaskActivity(
  taskId: string,
): Promise<TaskActivityResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(taskId)) return { ok: false, error: 'Invalid task.' };
    const events = await listTaskEvents(taskId);
    if (events.length === 0) return { ok: true, items: [] };

    // Batch-resolve every label the payloads reference: live team faces plus
    // the client/category ids captured in change payloads (headlines only
    // speak in to-values, so only those ids are collected).
    const clientIds: string[] = [];
    const categoryIds: string[] = [];
    for (const event of events) {
      const changes = changeMapOf(event.payload);
      const client = changes.client?.to;
      if (typeof client === 'string') clientIds.push(client);
      const category = changes.category?.to;
      if (typeof category === 'string') categoryIds.push(category);
    }
    const [team, clientLabels, categoryLabels] = await Promise.all([
      listAssigneeOptions(),
      clientNamesByIds(clientIds),
      categoryNamesByIds(categoryIds),
    ]);
    const faces = new Map(team.map((a) => [a.id, resolveAdminAvatar(a)]));
    const tz = await viewerZone();
    const todayKey = dayKeyIn(tz, new Date());

    const items = events.map((event) => ({
      id: event.id,
      kind: event.kind,
      actorName: event.actorName,
      avatar: (event.actorId ? faces.get(event.actorId) : null) ?? null,
      headline: headlineFor(event, clientLabels, categoryLabels, todayKey),
      body: event.kind === 'comment' ? (event.body ?? '') : '',
      timeLabel: zonedFormat(tz, EVENT_TIME_OPTS, 'en-CA').format(event.createdAt),
      canDelete:
        event.kind === 'comment' &&
        (profile.superadmin || event.actorId === profile.session.user.id),
    }));
    items.reverse();
    return { ok: true, items };
  } catch (error) {
    logError('[tasks] getTaskActivity failed', error);
    return { ok: false, error: 'Could not load activity.' };
  }
}

/** Post a comment. A direct insert (not after()) — the composer refetches
 *  right after, so the row must exist. No revalidate: comments render only
 *  through getTaskActivity, never in a server-rendered list. */
export async function addTaskComment(
  taskId: string,
  input: unknown,
): Promise<TaskMutationResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(taskId)) return { ok: false, error: 'server' };
    const parsed = taskCommentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        issues: flattenTaskIssues(parsed.error),
      };
    }

    // Title snapshot + existence check in one read — a since-deleted task is
    // a friendly field error, not an FK 500.
    const [row] = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!row) {
      return {
        ok: false,
        error: 'validation',
        issues: { body: 'This task no longer exists.' },
      };
    }

    const [inserted] = await db
      .insert(taskEvents)
      .values({
        taskId,
        taskTitle: row.title,
        actorId: profile.session.user.id,
        actorName: profile.session.user.name,
        kind: 'comment',
        body: parsed.data.body,
      })
      .returning({ id: taskEvents.id });

    return { ok: true, id: inserted.id };
  } catch (error) {
    logError('[tasks] addTaskComment failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Delete a comment — own comments, or any comment for a superadmin. The
 *  authorization rides the WHERE (race-safe, no read-then-check). */
export async function deleteTaskComment(
  eventId: string,
): Promise<TaskActionResult> {
  const profile = await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(eventId)) return { ok: false, error: 'Invalid comment.' };
    const deleted = await db
      .delete(taskEvents)
      .where(
        and(
          eq(taskEvents.id, eventId),
          eq(taskEvents.kind, 'comment'),
          ...(profile.superadmin
            ? []
            : [eq(taskEvents.actorId, profile.session.user.id)]),
        ),
      )
      .returning({ id: taskEvents.id });
    if (deleted.length === 0) {
      return { ok: false, error: 'Only your own comments can be deleted.' };
    }
    return { ok: true };
  } catch (error) {
    logError('[tasks] deleteTaskComment failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}
