// Server-side label formatting for the careers roster, on the
// Admin/tasks/format.ts rule: a YYYY-MM-DD value is a calendar KEY, not an
// instant, so it is rendered UTC-pinned and never re-derived in a zone. The
// page formats once and hands the string down; the roster never touches Date.

const DAY_KEY_LABEL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', // keys are calendar values; UTC keeps them un-shifted
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** '2026-08-09' → 'Aug 9, 2026'. Null, empty, or malformed → ''. */
export function dayKeyLabel(key: string | null | undefined): string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  return DAY_KEY_LABEL.format(new Date(`${key}T00:00:00.000Z`));
}

/** Days from `todayKey` until `validThrough` is passed, bucketed for the row
 *  tint: ≤ 14 days out is "soon", a negative distance is "expired". */
export const EXPIRY_SOON_DAYS = 14;
