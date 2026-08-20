/**
 * Payroll label formatters. Fixed locale, fixed time zone, resolved on the
 * SERVER — the components/Admin/inbox/format.ts rule: a client that formats its
 * own Date renders a different string than the server did and hydration tears.
 * Payroll components therefore take pre-formatted strings, never Date objects.
 *
 * Month tokens and day keys are calendar values, so they format at UTC: pinning
 * UTC on a value that already IS a calendar day is exact, not timezone math.
 */

import { zonedFormat } from '@/lib/calendar';

const MONTH_LONG = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const MONTH_SHORT = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const MONTH_BARE = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  timeZone: 'UTC',
});
const DAY_LONG = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const STAMP_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

/** '2026-08' → 'August 2026'. */
export function monthLabel(month: string): string {
  return MONTH_LONG.format(monthDate(month));
}

/** '2026-08' → 'Aug 26' — the trend strip's tight axis label. */
export function monthShortLabel(month: string): string {
  return MONTH_SHORT.format(monthDate(month));
}

/** '2026-08' → 'Aug' — for a strip that already states the year. */
export function monthBareLabel(month: string): string {
  return MONTH_BARE.format(monthDate(month));
}

/** '2026-07-19' → 'Jul 19, 2026'. */
export function dayLabel(key: string): string {
  return DAY_LONG.format(new Date(`${key}T00:00:00Z`));
}

/** A real instant, in the READER's zone: 'Aug 18, 8:04 p.m.'. A member in
 *  Tehran must see the hour their own money moved, not Vancouver's. */
export function stampLabel(tz: string, at: Date): string {
  return zonedFormat(tz, STAMP_OPTS, 'en-CA').format(at);
}

/** Same, but tolerant of the null timestamps (sentAt, receivedAt). */
export function maybeStamp(tz: string, at: Date | null): string | null {
  return at ? stampLabel(tz, at) : null;
}

/** 'joined 2026-07-19' → 'joined Jul 19, 2026' for the payslip's working. */
export function humanizeProrationNote(note: string | null): string | null {
  if (!note) return null;
  return note.replace(/(\d{4}-\d{2}-\d{2})/g, (key) => dayLabel(key));
}
