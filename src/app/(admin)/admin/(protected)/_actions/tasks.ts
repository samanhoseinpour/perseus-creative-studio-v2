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
 * completion.
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
import { revalidatePath, updateTag } from 'next/cache';

import { db } from '@/db';
import { user } from '@/db/auth-schema';
import {
  clients,
  reportNotes,
  taskCategories,
  tasks,
  type NewTask,
} from '@/db/schema';
import { requireArea, requireSuperadmin } from '@/lib/adminAccess';
import { slugify } from '@/components/Projects/utils';
import { CLIENTS_TAG } from '@/lib/projectsStore';
import {
  isTaskStatus,
  TASK_TITLE_MAX,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  bulkPatchTaskSchema,
  createTaskSchema,
  flattenTaskIssues,
  patchTaskSchema,
  quickClientSchema,
  reportNoteSchema,
  retainerSchema,
  taskCategorySchema,
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

/** Fresh name snapshot for an assignee id — a missing row becomes a field
 *  error instead of an FK 500 (the picker can go stale mid-form). */
async function lookupAssignee(
  id: string,
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return row ?? null;
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
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const data = parsed.data;

    const [existing] = await db
      .select({
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        categoryId: tasks.categoryId,
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
          // Meaningful only on a done row (correcting logged hours); ignored
          // otherwise — status itself never moves here (setTaskStatus owns it,
          // and with it the completedAt stamp).
          ...(existing.status === 'done' && data.actualMinutes
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
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = patchTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenTaskIssues(parsed.error) };
    }
    const patch = parsed.data;

    const [existing] = await db
      .select({
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        categoryId: tasks.categoryId,
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
    // Meaningful only on a done row (updateTask rule) — the time popover
    // disables the field otherwise, this is the server-side backstop.
    if (patch.actualMinutes !== undefined && existing.status === 'done') {
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

    invalidateTasks();
    return { ok: true, id: inserted.id };
  } catch (error) {
    console.error('[tasks] duplicateTask failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The one status door. Input is `{ status: 'todo' | 'in_progress' }` or
 * `{ status: 'done', actualMinutes }` — the discriminated union makes the
 * hours confirm unskippable on →done.
 */
export async function setTaskStatus(
  id: string,
  input: unknown,
): Promise<TaskMutationResult> {
  await requireArea('tasks', '/admin');

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
              status: 'done',
              actualMinutes: change.actualMinutes,
              completedAt: new Date(),
              updatedAt: new Date(),
            }
          : {
              status: change.status,
              completedAt: null,
              updatedAt: new Date(),
            },
      )
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    if (updated.length === 0) return { ok: false, error: 'server' };

    invalidateTasks();
    return { ok: true, id };
  } catch (error) {
    console.error('[tasks] setTaskStatus failed', error);
    return { ok: false, error: 'server' };
  }
}

const BULK_MAX = 100;

/**
 * Bulk status move — one UPDATE. →done can't prompt per task, so
 * actualMinutes defaults to the estimate where not already logged (the toast
 * says so); individual rows stay correctable via the edit dialog.
 */
export async function setTasksStatusBulk(
  ids: string[],
  status: TaskStatusSlug,
): Promise<TaskActionResult> {
  await requireArea('tasks', '/admin');

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
        status === 'done'
          ? {
              status: 'done',
              actualMinutes: sql`coalesce(${tasks.actualMinutes}, ${tasks.estimatedMinutes})`,
              completedAt: new Date(),
              updatedAt: new Date(),
            }
          : { status, completedAt: null, updatedAt: new Date() },
      )
      .where(and(inArray(tasks.id, valid), ne(tasks.status, status)))
      .returning({ id: tasks.id });

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
  await requireArea('tasks', '/admin');

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
    if (patch.assigneeId !== undefined) {
      const assignee = await lookupAssignee(patch.assigneeId);
      if (!assignee) {
        return { ok: false, error: 'Pick an assignee from the list.' };
      }
      set.assigneeId = assignee.id;
      set.assigneeName = assignee.name;
    }

    const guards = [];
    if (patch.startDate != null && patch.dueDate === undefined) {
      guards.push(or(isNull(tasks.dueDate), gte(tasks.dueDate, patch.startDate)));
    }
    if (patch.dueDate != null && patch.startDate === undefined) {
      guards.push(or(isNull(tasks.startDate), lte(tasks.startDate, patch.dueDate)));
    }

    let updated: { id: string }[];
    try {
      updated = await db
        .update(tasks)
        .set(set)
        .where(and(inArray(tasks.id, valid), ...guards))
        .returning({ id: tasks.id });
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'That client no longer exists.' };
      }
      throw dbError;
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
  await requireArea('tasks', '/admin');

  try {
    const valid = [...new Set(ids)].filter((id) => UUID_RE.test(id));
    if (valid.length === 0 || valid.length > BULK_MAX) {
      return { ok: false, error: 'Nothing to delete.' };
    }
    const deleted = await db
      .delete(tasks)
      .where(inArray(tasks.id, valid))
      .returning({ id: tasks.id });
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
  await requireArea('tasks', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid task.' };
    await db.delete(tasks).where(eq(tasks.id, id));
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
