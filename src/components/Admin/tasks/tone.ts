// The task surface's semantic tints, in one place because two renderers now
// draw the same row — the table on a desktop, the card on a phone — and a
// deadline that reads rose in one and plain in the other is a bug nobody
// would think to look for.
//
// The palette rules these encode are not free choices:
//   rose  — a missed deadline, and ONLY that.
//   amber — attention without alarm: due today, over estimate, waiting a while.
// Anything that borrows rose for "needs looking at" costs rose its meaning.

import type { TaskRowData } from './types';

/** Over-estimate reads as attention, not alarm — amber, where rose stays
 *  reserved for overdue, an actual missed commitment. */
export const VARIANCE_OVER_TONE = 'text-amber-700 dark:text-amber-400';

export const DUE_TONE: Record<Exclude<TaskRowData['dueState'], ''>, string> = {
  overdue: 'font-medium text-rose-600 dark:text-rose-400',
  today: 'font-medium text-amber-600 dark:text-amber-400',
};

/** Only ever on a needs_approval row, past the nudge threshold. AMBER, never
 *  rose: a client who hasn't replied yet has missed nothing. */
export const WAITING_LONG_TONE = 'text-amber-600 dark:text-amber-400';
