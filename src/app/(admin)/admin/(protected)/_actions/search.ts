'use server';

/**
 * ⌘K palette search. Reads live in `@/db/adminQueries`; this thin `'use server'`
 * wrapper is what the client palette calls (only an action stub reaches the
 * client). It re-checks the admin session itself — the protected layout's guard
 * does NOT wrap server actions.
 */
import { requireAdmin } from '@/lib/adminSession';
import { searchSubmissions, type SubmissionHit } from '@/db/adminQueries';

export async function searchSubmissionsAction(
  query: string,
): Promise<SubmissionHit[]> {
  await requireAdmin();
  return searchSubmissions(query);
}
