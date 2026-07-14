'use server';

/**
 * ⌘K palette search. Reads live in `@/db/adminQueries`; this thin `'use server'`
 * wrapper is what the client palette calls (only an action stub reaches the
 * client). It re-resolves the caller's access profile itself — the protected
 * layout's guard does NOT wrap server actions — and scopes results to the
 * submission kinds their inbox areas grant (no areas → no hits).
 */
import { getAccessProfile, visibleKinds } from '@/lib/adminAccess';
import { searchSubmissions, type SubmissionHit } from '@/db/adminQueries';

export async function searchSubmissionsAction(
  query: string,
): Promise<SubmissionHit[]> {
  const profile = await getAccessProfile();
  return searchSubmissions(query, 8, visibleKinds(profile));
}
