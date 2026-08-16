/**
 * Shared constants + pure helpers for the /admin task surface (the 'tasks' and
 * 'reports' areas). Deliberately zod-free and client-safe, mirroring
 * ticketFields.ts / portfolioFields.ts: forms and report components import
 * this for labels, caps, and the hours↔minutes conversion, while
 * authoritative validation lives in src/lib/taskSchema.ts, imported only by
 * the server actions.
 *
 * Every time value in the DB is INTEGER MINUTES; `parseHoursToMinutes` /
 * `formatMinutes` / `timeInputValue` below are the single conversion door in
 * both directions — no other module may do the ×60 math.
 */
import {
  PROJECT_CATEGORY_SLUGS,
  type ProjectCategoryField,
} from '@/lib/portfolioFields';

// ── Status vocabulary ───────────────────────────────────────────────────────
// Mirrors the task_status pgEnum in src/db/schema.ts — keep in sync.

export const TASK_STATUS_SLUGS = ['todo', 'in_progress', 'done'] as const;

export type TaskStatusSlug = (typeof TASK_STATUS_SLUGS)[number];

export const TASK_STATUS_LABELS: Record<TaskStatusSlug, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export function isTaskStatus(value: unknown): value is TaskStatusSlug {
  return (
    typeof value === 'string' &&
    (TASK_STATUS_SLUGS as readonly string[]).includes(value)
  );
}

// ── Priority vocabulary ─────────────────────────────────────────────────────
// Mirrors the task_priority pgEnum in src/db/schema.ts — keep in sync. The
// column is nullable: "no priority" is the default state, not a fourth level,
// so slugs list only the real ones (display order, high first).

export const TASK_PRIORITY_SLUGS = ['high', 'medium', 'low'] as const;

export type TaskPrioritySlug = (typeof TASK_PRIORITY_SLUGS)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPrioritySlug, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function isTaskPriority(value: unknown): value is TaskPrioritySlug {
  return (
    typeof value === 'string' &&
    (TASK_PRIORITY_SLUGS as readonly string[]).includes(value)
  );
}

// ── Null-client label ───────────────────────────────────────────────────────

/** Display label for null-client studio work — "Perseus", not "Internal"
 *  (reads as the studio to the team). Display-only: the filter URL keeps the
 *  literal `?client=internal` token (see taskFilters.ts). */
export const INTERNAL_CLIENT_LABEL = 'Perseus';

// ── Field length caps (shared client + zod) ─────────────────────────────────
export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 5000;
export const TASK_CATEGORY_NAME_MAX = 60;
export const TASK_URL_MAX = 300;
/** 1,000 hours — a sanity ceiling, not a business rule. */
export const TASK_MAX_MINUTES = 60_000;
export const RETAINER_MAX_MINUTES = 60_000;
/** The per-month report highlights note (client-facing on the print PDF). */
export const REPORT_NOTE_MAX = 2000;
/** A task comment (internal-only, the activity feed). */
export const TASK_COMMENT_MAX = 2000;

// ── Time ↔ minutes ──────────────────────────────────────────────────────────

/** Bare decimal = hours (the original vocabulary): "1.5", ".5", "2". */
const HOURS_RE = /^(\d{1,4}(\.\d{0,2})?|\.\d{1,2})$/;
/** Hours with unit, optional trailing minutes: "1.5h", "1h 30m", "1h30". */
const HOURS_MINUTES_RE =
  /^(\d{1,4}(?:[.,]\d{1,2})?)\s*h(?:rs?|ours?)?(?:\s*(\d{1,3})\s*m?(?:ins?|inutes?)?)?$/i;
/** Minutes only: "45m", "45 min", "90 minutes". */
const MINUTES_RE = /^(\d{1,5})\s*m(?:ins?|inutes?)?$/i;

/**
 * Flexible time text → integer minutes (rounded), or null when malformed,
 * non-positive, or over the cap. Accepts what non-dev staff actually type:
 * bare decimals mean hours ("1.5" | "1,5" | ".5"), explicit units work in
 * both directions ("45m", "1.5h", "1h 30m", "1h30"). Comma decimals accepted —
 * half the team types them out of habit.
 */
export function parseHoursToMinutes(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  let minutes: number | null = null;
  const bare = value.replace(',', '.');
  if (HOURS_RE.test(bare)) {
    minutes = Math.round(parseFloat(bare) * 60);
  } else {
    const hm = value.match(HOURS_MINUTES_RE);
    if (hm) {
      minutes =
        Math.round(parseFloat(hm[1].replace(',', '.')) * 60) +
        (hm[2] ? parseInt(hm[2], 10) : 0);
    } else {
      const m = value.match(MINUTES_RE);
      if (m) minutes = parseInt(m[1], 10);
    }
  }

  if (minutes == null) return null;
  return minutes >= 1 && minutes <= TASK_MAX_MINUTES ? minutes : null;
}

/** 90 → "1.5", 60 → "1", 100 → "1.67" — ≤2 dp, trailing zeros trimmed. */
export function minutesToHoursString(minutes: number): string {
  const rounded = Math.round((minutes / 60) * 100) / 100;
  return String(rounded);
}

/**
 * Smart display form for table cells and report totals: sub-hour values read
 * as minutes (45 → "45 m") instead of decimal fractions ("0.75 h"), everything
 * else as hours (90 → "1.5 h") — non-dev staff shouldn't do ×60 math to read
 * a cell. (CSV exports keep decimal-hours columns for spreadsheet math.)
 */
export function formatMinutes(minutes: number): string {
  return minutes < 60 ? `${minutes} m` : `${minutesToHoursString(minutes)} h`;
}

/** Prefill for time inputs — unit-explicit so it round-trips through
 *  parseHoursToMinutes: 90 → "1.5h", 45 → "45m"; null/undefined → ''. */
export function timeInputValue(minutes: number | null | undefined): string {
  if (minutes == null) return '';
  return minutes < 60 ? `${minutes}m` : `${minutesToHoursString(minutes)}h`;
}

/** CSV form: fixed 2-dp decimal hours (spreadsheet math wants a plain
 *  number, not the smart unit switch). 90 → "1.50". The fourth door — the
 *  exports import this instead of doing their own ÷60. */
export function minutesToDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

// ── Monthly report fold ─────────────────────────────────────────────────────

/** One done task's slice of a month, as the report queries hand it over.
 *  `minutes` arrives resolved (actual ?? estimate) by the query layer. */
export type MonthTaskSlice = {
  minutes: number;
  categorySlug: string;
  categoryName: string;
  siteCategory: ProjectCategoryField;
  assigneeId: string | null;
  assigneeName: string;
};

export type MonthTotals = {
  totalMinutes: number;
  taskCount: number;
  /** Zero-filled over all five site categories, so report bars can render a
   *  stable set without existence checks. */
  bySiteCategory: Record<ProjectCategoryField, number>;
  byCategory: {
    slug: string;
    name: string;
    siteCategory: ProjectCategoryField;
    minutes: number;
    tasks: number;
  }[];
  byMember: {
    /** First seen id for the line (null = deleted account, snapshot only). */
    assigneeId: string | null;
    assigneeName: string;
    minutes: number;
    tasks: number;
  }[];
};

/**
 * Fold a month's done tasks into report totals — plain JS over one SELECT
 * (getFeedbackStats pattern), a month being at most a few hundred rows.
 * Members key by `assigneeId ?? 'name:'+assigneeName` so a deleted account's
 * snapshot rows still aggregate into one line. Category and member lists come
 * back minutes-descending.
 */
export function foldMonthTotals(rows: MonthTaskSlice[]): MonthTotals {
  const bySiteCategory = Object.fromEntries(
    PROJECT_CATEGORY_SLUGS.map((slug) => [slug, 0]),
  ) as Record<ProjectCategoryField, number>;
  const categories = new Map<string, MonthTotals['byCategory'][number]>();
  const members = new Map<string, MonthTotals['byMember'][number]>();
  let totalMinutes = 0;

  for (const row of rows) {
    totalMinutes += row.minutes;
    bySiteCategory[row.siteCategory] += row.minutes;

    const category = categories.get(row.categorySlug) ?? {
      slug: row.categorySlug,
      name: row.categoryName,
      siteCategory: row.siteCategory,
      minutes: 0,
      tasks: 0,
    };
    category.minutes += row.minutes;
    category.tasks += 1;
    categories.set(row.categorySlug, category);

    const memberKey = row.assigneeId ?? `name:${row.assigneeName}`;
    const member = members.get(memberKey) ?? {
      assigneeId: row.assigneeId,
      assigneeName: row.assigneeName,
      minutes: 0,
      tasks: 0,
    };
    member.minutes += row.minutes;
    member.tasks += 1;
    members.set(memberKey, member);
  }

  const byMinutesDesc = <T extends { minutes: number }>(a: T, b: T) =>
    b.minutes - a.minutes;
  return {
    totalMinutes,
    taskCount: rows.length,
    bySiteCategory,
    byCategory: [...categories.values()].sort(byMinutesDesc),
    byMember: [...members.values()].sort(byMinutesDesc),
  };
}
