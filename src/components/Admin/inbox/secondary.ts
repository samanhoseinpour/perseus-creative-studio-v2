import 'server-only';

import type { ContactSubmission } from '@/db/schema';
import { roleTitle } from '@/constants/careers';
import { serviceTitle } from '@/constants/services';

/**
 * The one-line preview under an inbox row / activity item: the role for
 * applications, the picked services (or company) for inquiries. Resolved
 * server-side from the slug registries so the heavy `services.ts` / `careers.ts`
 * never reach a client chunk (see CLAUDE.md chunk hygiene).
 */
export function secondaryLine(row: ContactSubmission): string | null {
  if (row.kind === 'career') return row.role ? roleTitle(row.role) : null;
  const services = row.services ?? [];
  if (services.length === 0) return row.company ?? null;
  const titles = services.map(serviceTitle);
  const head = titles.slice(0, 2).join(', ');
  return titles.length > 2 ? `${head} +${titles.length - 2}` : head;
}
