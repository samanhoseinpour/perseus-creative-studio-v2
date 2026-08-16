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

// Hard cap on the pattern that reaches ILIKE (mirrors Q_MAX_LENGTH in
// taskFilters.ts). Server actions accept multi-MB bodies (the resume-upload
// allowance), so an unbounded string here would hand Postgres an
// attacker-sized scan pattern.
const QUERY_MAX_LENGTH = 200;

export async function searchSubmissionsAction(
  query: string,
): Promise<SubmissionHit[]> {
  // Authorization FIRST — no DB search work until the gate has resolved.
  // This used to overlap the profile read with a both-kinds search (one
  // neon-http round trip saved), but server actions are public POST endpoints
  // and src/proxy.ts only checks that a session cookie EXISTS: the ILIKE scan
  // ran to completion for callers the gate was about to reject. Gating first
  // also means the query is kind-scoped from the start, which retires the old
  // 2x over-fetch + single-kind starvation fallback outright.
  const profile = await getAccessProfile();
  const kinds = visibleKinds(profile);
  const q =
    typeof query === 'string' ? query.trim().slice(0, QUERY_MAX_LENGTH) : '';
  if (kinds.length === 0 || q.length < 2) return [];
  return searchSubmissions(q, 8, kinds);
}
