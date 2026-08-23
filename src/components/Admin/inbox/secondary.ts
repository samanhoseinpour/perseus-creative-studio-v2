import 'server-only';

import type { ContactSubmission } from '@/db/schema';
import { roleLabel } from '@/lib/careerFields';
import { serviceTitle } from '@/constants/services';

/**
 * The one-line preview under an inbox row / activity item: the role for
 * applications, the picked services (or company) for inquiries. Resolved
 * server-side — services from the slug registry (so the heavy `services.ts`
 * never reaches a client chunk, see CLAUDE.md chunk hygiene), the role from
 * the title snapshot stored on the row (roleLabel: snapshot → sentinel → raw
 * slug, never a DB read inside a list render).
 */
export function secondaryLine(row: ContactSubmission): string | null {
  if (row.kind === 'career') {
    return row.role ? roleLabel(row.role, row.roleTitle) : null;
  }
  const services = row.services ?? [];
  if (services.length === 0) return row.company ?? null;
  const titles = services.map(serviceTitle);
  const head = titles.slice(0, 2).join(', ');
  return titles.length > 2 ? `${head} +${titles.length - 2}` : head;
}
