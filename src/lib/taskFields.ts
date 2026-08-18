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

export const TASK_STATUS_SLUGS = [
  'todo',
  'in_progress',
  'needs_approval',
  'done',
] as const;

export type TaskStatusSlug = (typeof TASK_STATUS_SLUGS)[number];

export const TASK_STATUS_LABELS: Record<TaskStatusSlug, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  needs_approval: 'Needs approval',
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

// ── Repeat vocabulary ───────────────────────────────────────────────────────
// Mirrors the task_repeat pgEnum in src/db/schema.ts — keep in sync.

export const TASK_REPEAT_SLUGS = ['none', 'weekly', 'monthly'] as const;

export type TaskRepeatSlug = (typeof TASK_REPEAT_SLUGS)[number];

export const TASK_REPEAT_LABELS: Record<TaskRepeatSlug, string> = {
  none: 'Only when I ask',
  weekly: 'Every week',
  monthly: 'Every month',
};

/** ISO weekday 1–7, Monday first — the order the team reads a week in. */
export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** 'Every week on Tuesday' / 'Every month on the 15th' / '' when it doesn't
 *  repeat — one sentence for the template list and the picker hint. */
export function repeatLabel(
  repeat: TaskRepeatSlug,
  day: number | null,
): string {
  if (repeat === 'none' || day == null) return '';
  if (repeat === 'weekly') {
    return `Every week on ${WEEKDAY_LABELS[day - 1] ?? 'Monday'}`;
  }
  return `Every month on the ${ordinal(day)}`;
}

/** 1 → '1st', 22 → '22nd'. Only ever sees 1–28 (the repeatDay cap). */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
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
/** A saved view's name, and a ceiling on the query string it stores — the
 *  canonical qs never approaches this, so hitting it means something's wrong. */
export const TASK_VIEW_NAME_MAX = 40;
export const TASK_VIEW_QUERY_MAX = 500;

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

/**
 * The two halves of a duration, as the split hours/minutes control edits it.
 * `composeMinutes` and `splitMinutes` are the inverse pair, and — like
 * parseHoursToMinutes above — they keep the ×60 math inside this module: the
 * control itself never multiplies.
 *
 * Compose tolerates an over-60 minutes segment on purpose (90 → 90, which
 * splitMinutes then reads back as 1h 30m). That round-trip IS the overflow
 * normalisation the field performs on blur, so a member who thinks in "90
 * minutes" can still type it into the minutes box.
 *
 * Returns null when both halves are empty, and clamps to the 1-minute floor /
 * TASK_MAX_MINUTES ceiling so it can never hand the schema a value zod will
 * reject for range.
 */
export function composeMinutes(
  hours: string,
  minutes: string,
): number | null {
  if (!hours.trim() && !minutes.trim()) return null;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const total =
    (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (total < 1) return null;
  return Math.min(total, TASK_MAX_MINUTES);
}

/** 105 → { hours: '1', minutes: '45' }; 45 → { hours: '', minutes: '45' };
 *  120 → { hours: '2', minutes: '' }; null → both ''. Empty rather than '0'
 *  because a lone '0' in the hours box reads as a value the member set. */
export function splitMinutes(total: number | null | undefined): {
  hours: string;
  minutes: string;
} {
  if (total == null || total < 1) return { hours: '', minutes: '' };
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return {
    hours: hours ? String(hours) : '',
    minutes: minutes ? String(minutes) : '',
  };
}

/**
 * Arrow-key stepping for the split control, rolling over between the segments
 * so the member never has to carry the 60 themselves: ArrowUp on the minutes of
 * 1h 55m gives 2h, ArrowDown on 1h 0m gives 55m.
 *
 * A sub-hour delta snaps the minutes part onto its own grid first, so stepping
 * 1h 47m by 5 lands on 1h 50m rather than 1h 52m. An hour-sized delta adds
 * plainly — snapping there would silently drop the minutes (1h 45m + 1h should
 * be 2h 45m, not 2h).
 *
 * Returns null at zero, matching composeMinutes: stepping down past the floor
 * empties the field rather than parking a 0 in it.
 */
export function stepMinutes(
  total: number | null,
  delta: number,
): number | null {
  const current = total ?? 0;
  let next: number;
  if (Math.abs(delta) >= 60) {
    next = current + delta;
  } else {
    const grid = Math.abs(delta);
    const whole = Math.floor(current / 60) * 60;
    const part = current % 60;
    next =
      whole +
      (delta > 0
        ? Math.floor(part / grid) * grid + grid
        : Math.ceil(part / grid) * grid - grid);
  }
  next = Math.max(0, Math.min(next, TASK_MAX_MINUTES));
  return next < 1 ? null : next;
}

// ── Shared time-entry copy ──────────────────────────────────────────────────
// One string per rule, imported by every surface that takes a duration. These
// used to drift six ways ("like 1.5 or 45m" / "like 1.5h or 45m" / "like 2 or
// 1.5") because each form phrased the same parser failure itself — and every
// variant taught the decimal syntax the split control removed the need for.

/** Both segments empty where a duration is required. */
export const TIME_REQUIRED_ERROR = 'Add the time — hours, minutes, or both.';

/** A confirmed actual time being blanked out. Clearing it would silently fall
 *  the row back to its estimate (the coalesce in the →done queries). */
export const TIME_CLEARED_ERROR =
  'Actual time can’t be cleared — enter the corrected time.';

/**
 * Display form for table cells and report totals — composed hours + minutes,
 * never a decimal fraction. A month of delivered work reading "2.83 h" made
 * nobody reach for a calculator, it just stopped being read; "2h 50m" is the
 * form the whole surface already speaks (HoursQuickPicks' chips, the
 * "1.5 = 1h 30m" hints, timeInputValue's prefills).
 *
 *    20 → "20m"      170 → "2h 50m"     480 → "8h"
 *   150 → "2h 30m"  1575 → "26h 15m"  14400 → "240h"
 *
 * (CSV exports keep decimal-hours columns for spreadsheet math —
 * minutesToDecimalHours, below.)
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Prefill for time inputs — identical to the display form, which round-trips
 *  through parseHoursToMinutes' HOURS_MINUTES_RE ("2h 50m" → 170 exactly,
 *  where the old "2.83h" only survived by rounding). null/undefined → ''. */
export function timeInputValue(minutes: number | null | undefined): string {
  if (minutes == null) return '';
  return formatMinutes(minutes);
}

// ── Effort vs elapsed time ──────────────────────────────────────────────────

/** One working day. Effort is not calendar time: 24 h of *work* is three
 *  working days, so the reports' "≈ days" line divides by 8 h. Dividing by 24
 *  would quietly understate a month's delivery on a client-facing PDF. */
export const WORKDAY_MINUTES = 480;

/**
 * Secondary read on a large effort total:
 *
 *   1575 → "≈ 3.3 work days (8h each)"      480 → "≈ 1 work day (8h)"
 *
 * The basis is part of the STRING, not a tooltip a caller has to remember to
 * attach: "≈ 3.3 work days" alone silently invites the 24-hour reading, and a
 * hover title is invisible on touch and on paper — the two places this line
 * matters most. Baking it in also means no surface can drift from another.
 *
 * "(8h each)" rather than "(8h)" on the plural: the bare form reads as though
 * 3.3 work days WERE 8 hours.
 *
 * Returns '' below one workday, where hours are already the natural unit and
 * an "≈ 0.4 work days" line would be noise.
 */
export function formatWorkDays(minutes: number): string {
  if (minutes < WORKDAY_MINUTES) return '';
  const days = Math.round((minutes / WORKDAY_MINUTES) * 10) / 10;
  return days === 1
    ? '≈ 1 work day (8h)'
    : `≈ ${days} work days (8h each)`;
}

/**
 * Elapsed CALENDAR span in whole days — the one place the 24h→day, ~30d→month
 * rollup is right, because this measures wall-clock time between two dates
 * rather than effort. Consumed by the report's turnaround KPI, whose inputs
 * are Vancouver day keys (so there is no instant, and no timezone, to get
 * wrong).
 *
 *   0 → "same day"   1 → "1 day"   5 → "5 days"
 *  21 → "3 weeks"   75 → "2.5 months"
 */
export function formatDayspan(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d === 0) return 'same day';
  if (d === 1) return '1 day';
  if (d < 14) return `${d} days`;
  if (d < 60) {
    const weeks = Math.round(d / 7);
    return `${weeks} weeks`;
  }
  const months = Math.round((d / 30) * 10) / 10;
  return `${months} month${months === 1 ? '' : 's'}`;
}

/**
 * A signed duration, for comparing two of them: 30 → "+30m", -90 → "−1h 30m",
 * 0 → "". Routes through formatMinutes like everything else that prints a
 * duration — the lesson behind "2h 50m" replacing "2.83 h" applies just as
 * much to a delta, and reportData's own minutesDelta is private and shaped for
 * month-over-month prose rather than a table cell.
 *
 * The sign is a real minus (U+2212), not a hyphen: at the small sizes these
 * render, a hyphen next to a digit reads as a dash in the number.
 */
export function signedMinutes(diff: number): string {
  if (diff === 0) return '';
  return diff > 0 ? `+${formatMinutes(diff)}` : `−${formatMinutes(-diff)}`;
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
