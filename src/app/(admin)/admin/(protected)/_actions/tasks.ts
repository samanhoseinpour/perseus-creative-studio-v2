'use server';

/**
 * Write actions for the task surface (tasks + categories + inline client
 * creation + retainer targets). Reads live in `@/db/taskQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself (`requireArea('tasks')`, `requireArea('reports')` for
 * retainers, `requireSuperadmin` for the category vocabulary). Ids are
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
  tasks,
  type NewTask,
  type NewTaskEvent,
  type TaskEvent,
} from '@/db/schema';
import {
  categoryNamesByIds,
  clientNamesByIds,
  getActiveReportShare,
  listAssigneeOptions,
  listTaskEvents,
} from '@/db/taskQueries';
import { requireArea, requireSuperadmin } from '@/lib/adminAccess';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { slugify } from '@/components/Projects/utils';
import { dueDateLabel } from '@/components/Admin/tasks/format';
import type { RowAvatar } from '@/components/Admin/tasks/types';
import { CLIENTS_TAG } from '@/lib/projectsStore';
import { sendMail } from '@/lib/mail';
import { parseMonthToken, vancouverDayKey } from '@/lib/taskFilters';
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
import {
  bulkPatchTaskSchema,
  createTaskSchema,
  flattenTaskIssues,
  patchTaskSchema,
  quickClientSchema,
  reportNoteSchema,
  retainerSchema,
  taskCategorySchema,
  taskCommentSchema,
  taskStatusChangeSchema,
  updateTaskSchema,
} from '@/lib/taskSchema';

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

/** Tasks are internal-only: no public reader, no tags — layout-scope refresh
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
      console.error('[tasks] activity write failed', error);
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
      console.error('[tasks] assignment email failed', error);
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
    console.error('[tasks] createTask failed', error);
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
    const [assigneeLookup, catProblem] = await Promise.all([
      data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId
        ? lookupAssignee(data.assigneeId)
        : undefined,
      // A task may KEEP its archived category; it may not MOVE to one.
      data.categoryId !== existing.categoryId
        ? categoryProblem(data.categoryId)
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
    console.error('[tasks] updateTask failed', error);
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
    console.error('[tasks] patchTask failed', error);
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
    console.error('[tasks] duplicateTask failed', error);
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

    const updated = await db
      .update(tasks)
      .set(
        change.status === 'done'
          ? {
              status: 'done' as const,
              actualMinutes:
                change.actualMinutes ??
                sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`,
              completedAt: new Date(),
              updatedAt: new Date(),
            }
          : change.status === 'needs_approval'
            ? {
                status: 'needs_approval' as const,
                actualMinutes: change.actualMinutes,
                completedAt: null,
                updatedAt: new Date(),
              }
            : {
                status: change.status,
                completedAt: null,
                updatedAt: new Date(),
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
    console.error('[tasks] setTaskStatus failed', error);
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
    const updated = await db
      .update(tasks)
      .set(
        status === 'done' || status === 'needs_approval'
          ? {
              status,
              actualMinutes: sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`,
              completedAt: status === 'done' ? new Date() : null,
              updatedAt: new Date(),
            }
          : { status, completedAt: null, updatedAt: new Date() },
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
    console.error('[tasks] setTasksStatusBulk failed', error);
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
    console.error('[tasks] bulkPatchTasks failed', error);
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
    invalidateTasks();
    return { ok: true, updated: deleted.length };
  } catch (error) {
    console.error('[tasks] bulkDeleteTasks failed', error);
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
    }
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    console.error('[tasks] deleteTask failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

export type QuickClientResult =
  | { ok: true; id: string; name: string; slug: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

/**
 * Inline client creation from the task form — gated on 'tasks', NOT
 * 'portfolio', so any member logging work can add the client it belongs to.
 * Only the name is taken; every other column keeps its default, which is what
 * keeps the client off the public site (marqueeSort stays NULL — the single
 * public gate; portfolio holders enrich the record later in /admin/clients).
 *
 * Slug collisions: insert-retry over suffixed candidates with the unique
 * constraint as arbiter — atomic under concurrency, unlike check-then-insert
 * (two simultaneous "Acme"s land as acme and acme-2).
 */
export async function quickCreateClient(
  input: unknown,
): Promise<QuickClientResult> {
  await requireArea('tasks', '/admin');

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
    console.error('[tasks] quickCreateClient failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Monthly retainer target — a reporting concern, so the 'reports' grant
 *  (not 'tasks') owns it. null clears the target. */
export async function setClientRetainer(
  clientId: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('reports', '/admin');

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
      .returning({ id: clients.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    // No public reader selects retainer_minutes — layout refresh is enough.
    invalidateTasks();
    return { ok: true, id: clientId };
  } catch (error) {
    console.error('[tasks] setClientRetainer failed', error);
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
    console.error('[tasks] saveReportNote failed', error);
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
        })
        .returning({ id: reportShares.id, token: reportShares.token });
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
    console.error('[tasks] mintReportShare failed', error);
    return { ok: false, error: 'Could not create the link — try again.' };
  }
}

/** Revoke a share link — the row is kept (who shared what, when) but the
 *  public URL 404s from the next request (the share page is force-dynamic). */
export async function revokeReportShare(
  shareId: string,
): Promise<TaskActionResult> {
  await requireArea('reports', '/admin');

  try {
    if (!UUID_RE.test(shareId)) return { ok: false, error: 'Invalid link.' };
    const updated = await db
      .update(reportShares)
      .set({ revokedAt: new Date() })
      .where(and(eq(reportShares.id, shareId), isNull(reportShares.revokedAt)))
      .returning({ id: reportShares.id });
    if (updated.length === 0) {
      return { ok: false, error: 'This link was already revoked.' };
    }
    invalidateTasks();
    return { ok: true };
  } catch (error) {
    console.error('[tasks] revokeReportShare failed', error);
    return { ok: false, error: 'Could not revoke the link — try again.' };
  }
}

// ── Category vocabulary (superadmin-managed) ────────────────────────────────

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
  await requireSuperadmin('/admin');

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
    console.error('[tasks] createTaskCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Rename and/or remap. The slug is immutable after creation — filter URLs
 *  and report history carry it. */
export async function updateTaskCategory(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireSuperadmin('/admin');

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
    console.error('[tasks] updateTaskCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function setTaskCategoryArchived(
  id: string,
  archived: boolean,
): Promise<TaskActionResult> {
  await requireSuperadmin('/admin');

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
    console.error('[tasks] setTaskCategoryArchived failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/** Refused while tasks reference it (deleteClient guard shape) — archive is
 *  the supported retirement path; the FK restrict is the race backstop. */
export async function deleteTaskCategory(id: string): Promise<TaskActionResult> {
  await requireSuperadmin('/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid category.' };

    const [{ inUse }] = await db
      .select({ inUse: count() })
      .from(tasks)
      .where(eq(tasks.categoryId, id));
    if (inUse > 0) {
      return {
        ok: false,
        error: `This category is used by ${inUse} task${inUse === 1 ? '' : 's'} — archive it instead.`,
      };
    }

    try {
      await db.delete(taskCategories).where(eq(taskCategories.id, id));
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'This category is in use — archive it instead.',
        };
      }
      throw dbError;
    }

    invalidateTasks();
    return { ok: true };
  } catch (error) {
    console.error('[tasks] deleteTaskCategory failed', error);
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
  /** Pre-built sentence ('marked this done · 1.5 h'); '' for comments. */
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

const EVENT_TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Vancouver',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

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
    const todayKey = vancouverDayKey(new Date());

    const items = events.map((event) => ({
      id: event.id,
      kind: event.kind,
      actorName: event.actorName,
      avatar: (event.actorId ? faces.get(event.actorId) : null) ?? null,
      headline: headlineFor(event, clientLabels, categoryLabels, todayKey),
      body: event.kind === 'comment' ? (event.body ?? '') : '',
      timeLabel: EVENT_TIME.format(event.createdAt),
      canDelete:
        event.kind === 'comment' &&
        (profile.superadmin || event.actorId === profile.session.user.id),
    }));
    items.reverse();
    return { ok: true, items };
  } catch (error) {
    console.error('[tasks] getTaskActivity failed', error);
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
    console.error('[tasks] addTaskComment failed', error);
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
    console.error('[tasks] deleteTaskComment failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}
