// Server-side date formatting shared across the admin. Callers format on the
// server and pass plain strings down, so client components never do Date math
// — that is what keeps a server render and the browser from disagreeing.
//
// Every function takes the READER's zone. These formatters used to declare no
// `timeZone` at all, which does NOT mean "the viewer's" — an Intl formatter
// with no zone resolves to the RUNTIME's, which on Vercel is UTC. So every
// timestamp in the inbox, the ticket detail, the user list and the session
// list was rendering in UTC for everyone, Vancouver included.
import { zonedFormat } from '@/lib/calendar';

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTS,
  hour: 'numeric',
  minute: '2-digit',
};

/** Compact date for list rows, e.g. "Jul 8, 2026". */
export function formatDate(tz: string, d: Date): string {
  return zonedFormat(tz, DATE_OPTS).format(d);
}

/** Date + time for the detail header, e.g. "Jul 8, 2026, 3:42 PM". */
export function formatDateTime(tz: string, d: Date): string {
  return zonedFormat(tz, DATE_TIME_OPTS).format(d);
}

/**
 * Compact relative time for the activity feed + session "last active" — "just
 * now", "5m", "2h", "3d", falling back to formatDate beyond a week. Computed
 * server-side at render and passed down as a static string (no self-update, no
 * hydration drift — same reasoning as formatDate above).
 *
 * The elapsed-time branches are zone-free by construction (a difference of two
 * instants), so `tz` only reaches the absolute-date fallback.
 */
export function formatRelative(tz: string, d: Date, now: Date = new Date()): string {
  const sec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day <= 7) return `${day}d`;
  return formatDate(tz, d);
}
