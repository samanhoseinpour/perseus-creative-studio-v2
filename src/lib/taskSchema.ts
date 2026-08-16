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
  TASK_TITLE_MAX,
  TASK_URL_MAX,
} from '@/lib/taskFields';

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
    // Correcting logged hours on an already-done task; the action applies this
    // only while the row's status is 'done' (it has no meaning off-done).
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

/** Status transitions: →done requires the confirmed hours — the UI prefills
 *  the estimate (or the prior actual), the server never copies silently. */
export const taskStatusChangeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('todo') }),
  z.object({ status: z.literal('in_progress') }),
  z.object({
    status: z.literal('done'),
    actualMinutes: minutesSchema('Confirm the hours spent.'),
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
