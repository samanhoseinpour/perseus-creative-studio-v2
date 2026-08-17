// Server-side date formatting for the task surface, extending the inbox's
// format.ts reasoning: callers format on the server and pass plain strings
// down, so client components never do Date math (no hydration drift). All
// calendar KEYS here are Vancouver day/month tokens from taskFilters —
// formatting renders a token, never re-derives one.

const DAY_KEY_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', // tokens are calendar values; UTC keeps them un-shifted
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const DAY_KEY_DATE_WITH_YEAR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

const SHORT_DATE_WITH_YEAR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

const MONTH_NAME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
});

const SHORT_MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
});

/** '2026-08' → 'August 2026'. Malformed tokens fall back to themselves. */
export function monthLabel(token: string): string {
  if (!/^\d{4}-\d{2}$/.test(token)) return token;
  return MONTH_LABEL.format(new Date(`${token}-01T00:00:00.000Z`));
}

/** '2026-08' → 'August'. The bare month name, for lines that already establish
 *  the year ('Champion of July'). */
export function monthNameLabel(token: string): string {
  if (!/^\d{4}-\d{2}$/.test(token)) return token;
  return MONTH_NAME.format(new Date(`${token}-01T00:00:00.000Z`));
}

/** '2026-08' → 'Aug 2026'. The compact form for dense lists. */
export function shortMonthLabel(token: string): string {
  if (!/^\d{4}-\d{2}$/.test(token)) return token;
  return SHORT_MONTH_LABEL.format(new Date(`${token}-01T00:00:00.000Z`));
}

/**
 * Digest day header for a Vancouver day key: 'Today' / 'Yesterday' /
 * 'Mon, Aug 11' (year appended when it isn't the current one). `todayKey` and
 * `yesterdayKey` come from the caller's single "now" so every group in one
 * render agrees on what today is.
 */
export function digestDayLabel(
  dayKey: string,
  todayKey: string,
  yesterdayKey: string,
): string {
  if (dayKey === todayKey) return 'Today';
  if (dayKey === yesterdayKey) return 'Yesterday';
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const sameYear = dayKey.slice(0, 4) === todayKey.slice(0, 4);
  return (sameYear ? DAY_KEY_DATE : DAY_KEY_DATE_WITH_YEAR).format(date);
}

/** 'Aug 4' for a YYYY-MM-DD key — no year, ever. For labels whose year is
 *  already established by their container (the report's within-a-month week
 *  ranges), where `dueDateLabel`'s year rule would just add noise. */
export function shortDayLabel(dayKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return '';
  return SHORT_DATE.format(new Date(`${dayKey}T00:00:00.000Z`));
}

/** Due-date cell for a YYYY-MM-DD value: 'Aug 20', year appended when it
 *  isn't `todayKey`'s year. Empty string passes through. */
export function dueDateLabel(dueDate: string, todayKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return '';
  const date = new Date(`${dueDate}T00:00:00.000Z`);
  const sameYear = dueDate.slice(0, 4) === todayKey.slice(0, 4);
  return (sameYear ? SHORT_DATE : SHORT_DATE_WITH_YEAR).format(date);
}
