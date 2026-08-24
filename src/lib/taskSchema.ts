/**
 * Validation for the /admin task surface (tasks + categories + inline client
 * creation + retainer targets). Shared by the client forms (instant field
 * errors) and the `_actions/tasks.ts` server actions (the authoritative
 * parse) — the portfolioSchema.ts split. Never import from public-page code:
 * zod stays out of the marketing chunks.
 */
import { z } from 'zod';

import { CLIENT_NAME_MAX, PROJECT_CATEGORY_SLUGS } from '@/lib/portfolioFields';
import {
  REPORT_NOTE_MAX,
  RETAINER_MAX_MINUTES,
  TASK_CATEGORY_NAME_MAX,
  TASK_COMMENT_MAX,
  TASK_MAX_MINUTES,
  TASK_NOTES_MAX,
  TASK_PRIORITY_SLUGS,
  TASK_REPEAT_SLUGS,
  TASK_TITLE_MAX,
  TASK_URL_MAX,
  TASK_VIEW_NAME_MAX,
  TASK_VIEW_QUERY_MAX,
} from '@/lib/taskFields';
import {
  TASK_TAG_GROUPS,
  TASK_TAG_MAX_PER_TASK,
  TASK_TAG_NAME_MAX,
} from '@/lib/taskTagFields';

/** Zod error → { fieldPath: firstMessage } — flattenPortfolioIssues' twin. */
export function flattenTaskIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/** Empty string → undefined, else trimmed text under a cap. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep ${label} under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/**
 * Optional link, protocol-confined to http(s). `.optional()` before the
 * transform is load-bearing (portfolioSchema convention): forms parse once
 * and actions re-parse `parsed.data`, so the schema must accept its own
 * output (`'' → undefined`).
 */
const optionalHttpUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(
    z
      .url({ error: 'Enter a full link (e.g. https://…).', protocol: /^https?$/i })
      .max(TASK_URL_MAX, `Keep the link under ${TASK_URL_MAX} characters.`)
      .optional(),
  );

/** Empty string → undefined, else a uuid (the portfolio clientId pattern). */
const optionalUuid = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.uuid({ error: message }).optional());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD, shape- AND calendar-valid. The round-trip compare is
 * load-bearing (inboxFilters.parseDateParam rule): V8 rolls "2026-02-31" over
 * to March 3, so NaN-checking alone would store a phantom date. Shared by
 * startDate and dueDate (both team-local calendar days).
 */
const dateStringSchema = z
  .string()
  .regex(DATE_RE, 'Use a date like 2026-08-20.')
  .refine(
    (v) => new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v,
    'That date does not exist.',
  );

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(dateStringSchema.optional());

/** Empty string → undefined (no priority), else one of the three levels. */
const optionalPriority = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.enum(TASK_PRIORITY_SLUGS, { error: 'Pick a priority.' }).optional());

/** Both dates set and out of order — anchored on dueDate for field errors.
 *  Skips when either is absent; patchTask re-checks against the merged row. */
const datesInOrder = (v: { startDate?: string; dueDate?: string }) =>
  !v.startDate || !v.dueDate || v.startDate <= v.dueDate;

const DATE_ORDER_ERROR = {
  path: ['dueDate'],
  error: 'The due date is before the start date.',
};

/** Integer minutes — the forms convert through parseHoursToMinutes first. */
const minutesSchema = (missing: string) =>
  z
    .number({ error: missing })
    .int(missing)
    .min(1, missing)
    .max(TASK_MAX_MINUTES, 'That is over the 1,000-hour ceiling.');

const titleSchema = z
  .string()
  .trim()
  .min(2, 'Give the task a title.')
  .max(TASK_TITLE_MAX, `Keep the title under ${TASK_TITLE_MAX} characters.`);

// Better Auth ids are opaque text, not uuids — shape-check only.
const assigneeIdSchema = z
  .string()
  .trim()
  .min(1, 'Pick an assignee.')
  .max(128, 'Pick an assignee.');

/**
 * Tag ids on a task. Deduped BEFORE the cap, so a double-click in the picker
 * can't burn one of the eight slots or trip the limit with a phantom. Absent
 * means "leave the tags alone" on an update and "none" on a create — the
 * dialog and quick-add always send the key, the inline cell never does.
 *
 * Nothing here checks a tag against the task's category: scope gates the
 * PICKER, not the stored value (see tagInScope in taskTagFields.ts).
 */
export const taskTagIdsSchema = z
  .array(z.uuid({ error: 'Pick tags from the list.' }))
  .transform((ids) => [...new Set(ids)])
  .refine((ids) => ids.length <= TASK_TAG_MAX_PER_TASK, {
    error: `Keep it to ${TASK_TAG_MAX_PER_TASK} tags per task.`,
  });

const optionalTagIds = taskTagIdsSchema.optional();

/** The one-task replace door (setTaskTags). An EMPTY array is meaningful —
 *  it clears every tag — so there is no min() here. */
export const setTaskTagsSchema = z.object({ tagIds: taskTagIdsSchema });

export type SetTaskTagsInput = z.infer<typeof setTaskTagsSchema>;

/**
 * The bulk door. Add/remove, never replace: one "set tags" across a mixed
 * selection would silently wipe whatever each row already carried, which is
 * exactly the edit nobody means to make.
 */
export const bulkTaskTagsSchema = z
  .object({
    add: taskTagIdsSchema.optional().transform((ids) => ids ?? []),
    remove: taskTagIdsSchema.optional().transform((ids) => ids ?? []),
  })
  .refine((v) => v.add.length + v.remove.length > 0, {
    error: 'Pick at least one tag.',
  });

export type BulkTaskTagsInput = z.infer<typeof bulkTaskTagsSchema>;

/** The refine-free base — updateTaskSchema extends it before the date-order
 *  check is applied to both (extend-after-refine is off the table). */
const baseTaskSchema = z.object({
  title: titleSchema,
  /** Surfaced as "Description" in the UI since v1.1 — same column. */
  notes: optionalText(TASK_NOTES_MAX, 'the description'),
  /** Absent = internal Perseus work (no client). */
  clientId: optionalUuid('Pick a client from the list.'),
  categoryId: z.uuid({ error: 'Pick a category.' }),
  assigneeId: assigneeIdSchema,
  priority: optionalPriority,
  estimatedMinutes: minutesSchema('Enter the estimated time.'),
  startDate: optionalDateString,
  dueDate: optionalDateString,
  deliverableUrl: optionalHttpUrl,
  /** Optional, and absent on an update means "don't touch the tags" — the
   *  dialog always sends the key, so an omitted one is a caller that has no
   *  tag UI (the templates dialog) rather than a user clearing them. */
  tagIds: optionalTagIds,
});

export const createTaskSchema = baseTaskSchema.refine(
  datesInOrder,
  DATE_ORDER_ERROR,
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = baseTaskSchema
  .extend({
    // Optional on edits (required at create): absent = keep the current
    // assignment. This is what lets a task whose assignee's account was
    // deleted (assigneeId NULL, name snapshot kept) be edited without
    // silently reassigning it — the dialog omits the field until the user
    // explicitly picks someone.
    assigneeId: assigneeIdSchema.optional(),
    // Correcting logged hours; the action applies this only while the row's
    // status is 'done' or 'needs_approval' (hours are confirmed at
    // needs_approval, so they must stay correctable while awaiting sign-off).
    actualMinutes: minutesSchema('Enter the hours spent.').optional(),
  })
  .refine(datesInOrder, DATE_ORDER_ERROR);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * The inline-edit door (patchTask): every key optional, present keys applied
 * as a field-level patch. Where "clear" is a meaningful edit (client → back
 * to Internal, priority/dates → unset) the key is nullable — null clears,
 * undefined leaves the column untouched. Status/completedAt are deliberately
 * absent: setTaskStatus stays the one status door. Cross-field date order is
 * checked by the action against the MERGED row (a patch may carry only one of
 * the two dates).
 */
export const patchTaskSchema = z
  .object({
    title: titleSchema.optional(),
    clientId: z
      .uuid({ error: 'Pick a client from the list.' })
      .nullable()
      .optional(),
    categoryId: z.uuid({ error: 'Pick a category.' }).optional(),
    assigneeId: assigneeIdSchema.optional(),
    priority: z
      .enum(TASK_PRIORITY_SLUGS, { error: 'Pick a priority.' })
      .nullable()
      .optional(),
    startDate: dateStringSchema.nullable().optional(),
    dueDate: dateStringSchema.nullable().optional(),
    estimatedMinutes: minutesSchema('Enter the estimated time.').optional(),
    actualMinutes: minutesSchema('Enter the time spent.').optional(),
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), {
    error: 'Nothing to update.',
  });

export type TaskPatchInput = z.infer<typeof patchTaskSchema>;

/**
 * The bulk-edit door (bulkPatchTasks): ONE field set applied to many rows.
 * A narrower patchTaskSchema — no title/minutes (those are per-row values),
 * same null-clears semantics, status/completedAt structurally absent. Both
 * dates together validate statically here; a single-sided date write is
 * order-guarded per row in the action's WHERE clause instead (a merged-row
 * read per task would race — neon-http has no transactions).
 */
export const bulkPatchTaskSchema = z
  .object({
    clientId: z
      .uuid({ error: 'Pick a client from the list.' })
      .nullable()
      .optional(),
    assigneeId: assigneeIdSchema.optional(),
    priority: z
      .enum(TASK_PRIORITY_SLUGS, { error: 'Pick a priority.' })
      .nullable()
      .optional(),
    startDate: dateStringSchema.nullable().optional(),
    dueDate: dateStringSchema.nullable().optional(),
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), {
    error: 'Nothing to update.',
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate,
    DATE_ORDER_ERROR,
  );

export type BulkPatchTaskInput = z.infer<typeof bulkPatchTaskSchema>;

/** Status transitions: hours are confirmed when work finishes — →needs_approval
 *  requires actualMinutes (the UI prefills the estimate or the prior actual).
 *  →done takes them optionally: the server coalesces provided ?? existing
 *  actual ?? estimate, so approving is one click for a task that already went
 *  through needs_approval, and a direct done still lands on real hours. */
export const taskStatusChangeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('todo') }),
  z.object({ status: z.literal('in_progress') }),
  z.object({
    status: z.literal('needs_approval'),
    actualMinutes: minutesSchema('Confirm the hours spent.'),
  }),
  z.object({
    status: z.literal('done'),
    actualMinutes: minutesSchema('Confirm the hours spent.').optional(),
  }),
]);

export type TaskStatusChangeInput = z.infer<typeof taskStatusChangeSchema>;

/** Inline client creation from the task form — name only; the server
 *  generates the slug and every other column stays at its default (which
 *  keeps the client off the public logo wall). */
export const quickClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the client's name.")
    .max(CLIENT_NAME_MAX, `Keep the name under ${CLIENT_NAME_MAX} characters.`),
});

/**
 * A saved task shape. Reuses the task field vocabulary, minus everything
 * time-bound (status, hours logged, dates) — those are stamped at mint, not
 * stored on the shape.
 *
 * `repeatDay` is validated AGAINST `repeat`: weekly wants an ISO weekday,
 * monthly a day of month capped at 28 so no schedule silently skips February,
 * and 'none' wants nothing at all. Cross-field, so it's a refine — and the
 * action re-parses, since a client that omits the field can't be trusted to
 * have cleared it.
 */
export const taskTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Give the template a name.')
      .max(TASK_TITLE_MAX, `Keep the name under ${TASK_TITLE_MAX} characters.`),
    title: titleSchema,
    notes: optionalText(TASK_NOTES_MAX, 'the description'),
    clientId: optionalUuid('Pick a client from the list.'),
    categoryId: z.uuid({ error: 'Pick a category.' }),
    // Optional, unlike a task's: a template can outlive the person who owned
    // it, and minting unassigned beats minting to a departed account.
    assigneeId: assigneeIdSchema.optional(),
    priority: optionalPriority,
    estimatedMinutes: minutesSchema('Enter the estimated time.'),
    repeat: z.enum(TASK_REPEAT_SLUGS),
    repeatDay: z
      .number()
      .int()
      .min(1)
      .max(28, 'Pick a day from 1 to 28.')
      .optional(),
    dueOffsetDays: z
      .number()
      .int('Enter whole days.')
      .min(0, 'A due date can’t land before the task is created.')
      .max(365, 'Keep the due date within a year.')
      .optional(),
    active: z.boolean(),
  })
  .refine(
    (v) => v.repeat === 'none' || v.repeatDay !== undefined,
    { error: 'Pick which day it repeats on.', path: ['repeatDay'] },
  )
  .refine(
    (v) => v.repeat !== 'weekly' || (v.repeatDay ?? 0) <= 7,
    { error: 'Pick a weekday.', path: ['repeatDay'] },
  );

export type TaskTemplateInput = z.infer<typeof taskTemplateSchema>;

/**
 * A named filter combination. `query` is the canonical query string the list
 * page already produces — validated only for shape and length here, because
 * parseTaskListParams is the real authority and silently drops anything it
 * doesn't recognise. The character class is what URLSearchParams emits.
 */
export const taskViewSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Give the view a name.')
    .max(TASK_VIEW_NAME_MAX, `Keep the name under ${TASK_VIEW_NAME_MAX} characters.`),
  query: z
    .string()
    .max(TASK_VIEW_QUERY_MAX, 'That view has too many filters to save.')
    .regex(/^[A-Za-z0-9_\-.~%&=+]*$/, 'That view can’t be saved.'),
  shared: z.boolean(),
});

export type TaskViewInput = z.infer<typeof taskViewSchema>;

/** Category create/update. No slug field on purpose: the server slugifies the
 *  name at creation and the slug is immutable after — filter URLs and report
 *  history carry it, so a rename must never orphan them. */
export const taskCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a category name.')
    .max(
      TASK_CATEGORY_NAME_MAX,
      `Keep the name under ${TASK_CATEGORY_NAME_MAX} characters.`,
    ),
  siteCategory: z.enum(PROJECT_CATEGORY_SLUGS),
});

export type TaskCategoryInput = z.infer<typeof taskCategorySchema>;

/** Tag create/update — the vocabulary door, open to any 'tasks' holder. Like
 *  categories, there is no slug field: the server slugifies the name at
 *  creation and the slug is IMMUTABLE after, because filter URLs and saved
 *  views carry it. `categoryIds` EMPTY means global (offered everywhere). */
export const taskTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a tag name.')
    .max(
      TASK_TAG_NAME_MAX,
      `Keep the name under ${TASK_TAG_NAME_MAX} characters.`,
    ),
  group: z.enum(TASK_TAG_GROUPS, { error: 'Pick a group.' }),
  categoryIds: z
    .array(z.uuid({ error: 'Pick categories from the list.' }))
    .transform((ids) => [...new Set(ids)])
    .refine((ids) => ids.length <= 50, { error: 'Too many categories.' })
    .optional()
    .transform((ids) => ids ?? []),
});

export type TaskTagInput = z.infer<typeof taskTagSchema>;

/**
 * The category-major half of tag scoping: "these are the tags Video Editing
 * offers". Separate from taskTagSchema because it writes ONE category's rows
 * across many tags, where that one writes ONE tag's rows across many
 * categories — the same table read from its two ends.
 *
 * `tagIds` is the complete offered set for this category, so an omitted tag
 * means "stop offering it here". Empty is legal and means the category offers
 * no scoped tags at all (the globals still reach it).
 */
export const categoryTagOffersSchema = z.object({
  categoryId: z.uuid({ error: 'Unknown category.' }),
  tagIds: z
    .array(z.uuid({ error: 'Pick tags from the list.' }))
    .transform((ids) => [...new Set(ids)])
    .refine((ids) => ids.length <= 200, { error: 'Too many tags.' }),
});

export type CategoryTagOffersInput = z.infer<typeof categoryTagOffersSchema>;

/** The per-month report highlights note. An emptied body is a valid save —
 *  the action deletes the row (no tombstone empty notes). */
export const reportNoteSchema = z.object({
  clientId: z.uuid({ error: 'Unknown client.' }),
  month: z
    .string()
    .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'Unknown report month.'),
  body: z
    .string()
    .trim()
    .max(REPORT_NOTE_MAX, `Keep the highlights under ${REPORT_NOTE_MAX} characters.`),
});

export type ReportNoteInput = z.infer<typeof reportNoteSchema>;

/** A task comment — the activity feed's only free-text write. */
export const taskCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a comment.')
    .max(TASK_COMMENT_MAX, `Keep it under ${TASK_COMMENT_MAX} characters.`),
});

export type TaskCommentInput = z.infer<typeof taskCommentSchema>;

/** null clears the retainer. */
export const retainerSchema = z.object({
  retainerMinutes: z
    .number({ error: 'Enter the monthly hours.' })
    .int('Enter whole minutes.')
    .min(1, 'Enter the monthly hours.')
    .max(RETAINER_MAX_MINUTES, 'That is over the 1,000-hour ceiling.')
    .nullable(),
});
