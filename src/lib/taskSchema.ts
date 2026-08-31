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
  TASK_LINK_LABEL_MAX,
  TASK_LINK_MAX,
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
  TASK_TAG_MAX_PER_TASK,
  TASK_TAG_NAME_MAX,
  TASK_TAG_TONE_KEYS,
  TASK_TAG_TYPE_HINT_MAX,
  TASK_TAG_TYPE_NAME_MAX,
} from '@/lib/taskTagFields';
import { TASK_ASSIGNEE_MAX } from '@/lib/taskAssigneeFields';

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
 * The deliverable links a task carries — every file the work produced, each
 * optionally named.
 *
 * Normalisation order matters and each step exists for one reason:
 *
 *  - A row whose url trims to empty is DROPPED, not rejected. The dialog adds
 *    blank rows for the member to fill; one they added and thought better of
 *    is not a mistake to shout about, and refusing it would block a save over
 *    an empty box.
 *  - A label that trims to empty is dropped from the object rather than stored
 *    as '', so nothing downstream has to tell '' apart from unset (the stored
 *    shape is `{ url }`, and linkLabelFor falls back to the host).
 *  - Duplicates by url collapse. Two chips pointing at one file is noise on a
 *    client's report, and the member sees the list they typed.
 *  - The cap is applied LAST, so it counts real links rather than blank rows.
 *
 * Errors keep their row index in the path (`deliverableLinks.2.url`), which is
 * what lets the dialog put the message under the row that caused it —
 * flattenTaskIssues already joins the path, so nothing else changes.
 *
 * The schema accepts its own OUTPUT (the portfolioSchema convention the old
 * single-url field carried): forms parse once and the actions re-parse
 * `parsed.data`, so a second pass over an already-normalised list has to be a
 * no-op rather than an error.
 */
const URL_ERROR = 'Enter a full link (e.g. https://…).';
const HTTP_URL = z.url({ error: URL_ERROR, protocol: /^https?$/i });

export const deliverableLinksSchema = z
  .array(
    z.object({
      url: z
        .string()
        .trim()
        .max(TASK_URL_MAX, `Keep the link under ${TASK_URL_MAX} characters.`),
      label: z
        .string()
        .trim()
        .max(
          TASK_LINK_LABEL_MAX,
          `Keep the name under ${TASK_LINK_LABEL_MAX} characters.`,
        )
        .optional(),
    }),
  )
  // Validated in place, on the ORIGINAL array, and that is the whole reason
  // this is a superRefine rather than a filter-then-pipe. Dropping the blank
  // rows first renumbers what is left, so a `z.url()` failure came back at the
  // POST-filter index while the dialog keys its per-row message by the draft
  // index it rendered — one empty row above a mistyped one and the error
  // appeared under the empty box, pointing at the wrong field. An empty url is
  // still not an error here (it is dropped below); a non-empty one has to be a
  // real http(s) link, and it reports at the row the member actually typed in.
  .superRefine((rows, ctx) => {
    rows.forEach((row, index) => {
      if (row.url === '') return;
      const parsed = HTTP_URL.safeParse(row.url);
      if (!parsed.success) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'url'],
          message: URL_ERROR,
        });
      }
    });
  })
  .transform((rows) => rows.filter((row) => row.url !== ''))
  .transform((rows) => {
    const seen = new Set<string>();
    const out: { url: string; label?: string }[] = [];
    for (const row of rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
      out.push(row.label ? { url: row.url, label: row.label } : { url: row.url });
    }
    return out;
  })
  .refine((rows) => rows.length <= TASK_LINK_MAX, {
    error: `Keep it to ${TASK_LINK_MAX} links per task.`,
  });

/** Absent = no links (the templates dialog and any caller with no link UI). */
const optionalLinks = deliverableLinksSchema
  .optional()
  .transform((rows) => rows ?? []);

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
 * The members on a task. taskTagIdsSchema's shape and its reasons: deduped
 * BEFORE the cap so a double-click can't burn a slot or trip the limit with a
 * phantom, and the cap bounds a hand-posted payload rather than real work.
 *
 * At least one, always — the board has no unassigned state, every per-member
 * fold would grow an empty bucket, and "who is doing this" is the question the
 * row exists to answer. The empty array is refused here rather than in the
 * action so both doors inherit it.
 */
export const taskAssigneeIdsSchema = z
  .array(assigneeIdSchema)
  .transform((ids) => [...new Set(ids)])
  .refine((ids) => ids.length > 0, { error: 'Pick at least one member.' })
  .refine((ids) => ids.length <= TASK_ASSIGNEE_MAX, {
    error: `Keep it to ${TASK_ASSIGNEE_MAX} members per task.`,
  });

/**
 * The bulk door. Add/remove, never replace — bulkTaskTagsSchema's rule, and
 * here it also protects the at-least-one invariant: a replace across a mixed
 * selection could empty a row, while a remove can be refused per row.
 *
 * No min(1) on either side: these are deltas, and an empty one simply means
 * "nothing to add" — the refine below is what rejects a no-op call.
 */
export const bulkTaskAssigneesSchema = z
  .object({
    add: z
      .array(assigneeIdSchema)
      .max(TASK_ASSIGNEE_MAX)
      .optional()
      .transform((ids) => [...new Set(ids ?? [])]),
    remove: z
      .array(assigneeIdSchema)
      .max(TASK_ASSIGNEE_MAX)
      .optional()
      .transform((ids) => [...new Set(ids ?? [])]),
  })
  .refine((v) => v.add.length + v.remove.length > 0, {
    error: 'Pick at least one member.',
  });

/** The one-task replace door (setTaskAssignees). */
export const setTaskAssigneesSchema = z.object({
  assigneeIds: taskAssigneeIdsSchema,
});

export type SetTaskAssigneesInput = z.infer<typeof setTaskAssigneesSchema>;
export type BulkTaskAssigneesInput = z.infer<typeof bulkTaskAssigneesSchema>;

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
  assigneeIds: taskAssigneeIdsSchema,
  priority: optionalPriority,
  estimatedMinutes: minutesSchema('Enter the estimated time.'),
  startDate: optionalDateString,
  dueDate: optionalDateString,
  deliverableLinks: optionalLinks,
  /** Optional, and absent on an update means "don't touch the tags" — the
   *  dialog always sends the key, so an omitted one is a caller that has no
   *  tag UI (the templates dialog) rather than a user clearing them. */
  tagIds: optionalTagIds,
  /**
   * The task this one revises — set by "Add revision" and by the add band's
   * duplicate suggestion, absent for ordinary work.
   *
   * The schema only proves it is a uuid. Whether it EXISTS, and whether it is
   * itself a revision (in which case the action re-points at the root, since
   * the relationship is exactly one level deep), are resolved server-side
   * where a read is possible.
   */
  parentTaskId: optionalUuid('That task no longer exists.'),
});

export const createTaskSchema = baseTaskSchema.refine(
  datesInOrder,
  DATE_ORDER_ERROR,
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = baseTaskSchema
  .extend({
    // Optional on edits (required at create): absent = keep the current crew.
    // This is what lets a task whose only member's account was deleted (the
    // link row's user_id NULL, name snapshot kept) be edited without silently
    // reassigning it — the dialog omits the field until someone is picked.
    assigneeIds: taskAssigneeIdsSchema.optional(),
    // Correcting logged hours; the action applies this only while the row's
    // status is 'done' or 'needs_approval' (hours are confirmed at
    // needs_approval, so they must stay correctable while awaiting sign-off).
    actualMinutes: minutesSchema('Enter the hours spent.').optional(),
    // patchTaskSchema's convention, not the base's: null CLEARS the link
    // ("Not a revision"), undefined leaves it alone. A plain optional would
    // make every caller without revision UI silently unlink the row.
    parentTaskId: z
      .union([z.uuid({ error: 'That task no longer exists.' }), z.null()])
      .optional(),
  })
  .refine(datesInOrder, DATE_ORDER_ERROR);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * The inline-edit door (patchTask): every key optional, present keys applied
 * as a field-level patch. Where "clear" is a meaningful edit (client → back
 * to Internal, priority/dates → unset) the key is nullable — null clears,
 * undefined leaves the column untouched. Status, completedAt and the
 * completion DAY are deliberately absent: setTaskStatus stays the one status
 * door. Cross-field date order is checked by the action against the MERGED row
 * (a patch may carry only one of the two dates).
 */
export const patchTaskSchema = z
  .object({
    title: titleSchema.optional(),
    clientId: z
      .uuid({ error: 'Pick a client from the list.' })
      .nullable()
      .optional(),
    categoryId: z.uuid({ error: 'Pick a category.' }).optional(),
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
 * same null-clears semantics, status/completedAt/completion day structurally
 * absent. Both dates together validate statically here; a single-sided write is
 * order-guarded per row in the action's WHERE clause instead (a merged-row
 * read per task would race — neon-http has no transactions).
 */
export const bulkPatchTaskSchema = z
  .object({
    clientId: z
      .uuid({ error: 'Pick a client from the list.' })
      .nullable()
      .optional(),
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
 *  through needs_approval, and a direct done still lands on real hours.
 *
 *  `completedOn` backdates the completion to a calendar day the member picked
 *  — work logged after the fact, which is most of what this board records.
 *  Shape and calendar validity only: "not in the future" needs the ACTOR's
 *  zone to know what today IS, and a schema may not name one (calendar.ts is
 *  the timezone door), so the action enforces that after viewerZone(). Absent
 *  means now. Deliberately `dateStringSchema` and not `optionalDateString`:
 *  the latter's '' → undefined pipe would turn a blanked field into a silent
 *  "now", and there is no nullable variant because a done row always has a
 *  completion date — clearing one is "leave done", which is a different
 *  transition on this same door. */
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
    completedOn: dateStringSchema.optional(),
  }),
  // delivered and posted take the same shape as done, and for the same
  // reasons: a task can be logged straight to either after the fact (so it
  // needs a day and hours it never had), and advancing one that already
  // shipped sends neither. What differs is what the action does with an
  // ABSENT completedOn — see completionStampMode in taskFields.ts, where
  // →done stamps and these two preserve.
  z.object({
    status: z.literal('delivered'),
    actualMinutes: minutesSchema('Confirm the hours spent.').optional(),
    completedOn: dateStringSchema.optional(),
  }),
  z.object({
    status: z.literal('posted'),
    actualMinutes: minutesSchema('Confirm the hours spent.').optional(),
    completedOn: dateStringSchema.optional(),
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
    assigneeIds: z
      .array(assigneeIdSchema)
      .max(TASK_ASSIGNEE_MAX)
      .optional()
      .transform((ids) => [...new Set(ids ?? [])]),
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
  typeId: z.uuid({ error: 'Pick a type.' }),
  categoryIds: z
    .array(z.uuid({ error: 'Pick categories from the list.' }))
    .transform((ids) => [...new Set(ids)])
    .refine((ids) => ids.length <= 50, { error: 'Too many categories.' })
    .optional()
    .transform((ids) => ids ?? []),
});

export type TaskTagInput = z.infer<typeof taskTagSchema>;

/**
 * Tag TYPE create/update — the axis vocabulary ("Format", "Content"), open to
 * the same 'tasks' holders who own the tags themselves.
 *
 * No slug field, for the taskTagSchema reason squared: a type's slug is what
 * the seed script matches on, so a rename must never orphan it. `tone` is a
 * key into the fixed palette, never a colour value — the Tailwind scanner
 * cannot see a computed class name.
 */
export const taskTagTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a type name.')
    .max(
      TASK_TAG_TYPE_NAME_MAX,
      `Keep the name under ${TASK_TAG_TYPE_NAME_MAX} characters.`,
    ),
  // An emptied hint is a valid save — it stores null, not an empty string.
  hint: z
    .string()
    .trim()
    .max(
      TASK_TAG_TYPE_HINT_MAX,
      `Keep the description under ${TASK_TAG_TYPE_HINT_MAX} characters.`,
    )
    .optional()
    .transform((value) => (value ? value : null)),
  tone: z.enum(TASK_TAG_TONE_KEYS, { error: 'Pick a colour.' }),
});

export type TaskTagTypeInput = z.infer<typeof taskTagTypeSchema>;

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
