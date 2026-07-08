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
