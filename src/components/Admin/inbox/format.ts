// Server-side date formatting for the inbox. Callers format on the server and
// pass plain strings down, so client components never do Date math — this
// avoids a hydration mismatch between the UTC server render and the viewer's
// local timezone (same reasoning as the profile page's fmtDate).
const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Compact date for list rows, e.g. "Jul 8, 2026". */
export function formatDate(d: Date): string {
  return DATE.format(d);
}

/** Date + time for the detail header, e.g. "Jul 8, 2026, 3:42 PM". */
export function formatDateTime(d: Date): string {
  return DATE_TIME.format(d);
}

/**
 * Compact relative time for the activity feed + session "last active" — "just
 * now", "5m", "2h", "3d", falling back to formatDate beyond a week. Computed
 * server-side at render and passed down as a static string (no self-update, no
 * hydration drift — same reasoning as formatDate above).
 */
export function formatRelative(d: Date, now: Date = new Date()): string {
  const sec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day <= 7) return `${day}d`;
  return formatDate(d);
}
