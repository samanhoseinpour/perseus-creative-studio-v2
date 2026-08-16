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
  // Profile and search run CONCURRENTLY — serialized, the profile's PK read
  // added a full neon-http round trip to every settled palette query. The
  // search spans both kinds and is over-fetched at 2x the palette's 8; the
  // authorization filter + slice still apply before anything reaches the
  // client (hits carry their kind). A member with no inbox areas pays one
  // search query that gets fully filtered — the trade for every authorized
  // search responding a round trip sooner.
  const [profile, hits] = await Promise.all([
    getAccessProfile(),
    searchSubmissions(query, 16, ['project', 'career']),
  ]);
  const kinds = visibleKinds(profile);
  const scoped = hits.filter((hit) => kinds.includes(hit.kind));
  // The 2x over-fetch is only a heuristic: nothing bounds the invisible
  // kind's share of the 16-row window, so a single-area member searching a
  // common substring can get a saturated window with none (or too few) of
  // THEIR kind — silently hiding rows that exist. Only in that exact case
  // (full window, single visible kind, short list) pay a second, kind-scoped
  // query for the true newest matches.
  if (kinds.length === 1 && scoped.length < 8 && hits.length === 16) {
    return searchSubmissions(query, 8, kinds);
  }
  return scoped.slice(0, 8);
}
