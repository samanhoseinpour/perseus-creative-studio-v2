'use client';

import { useMemo } from 'react';

import {
  matchesAllTokens,
  suggestQuery,
  type QuerySuggestion,
} from '@/lib/searchTerms';

/**
 * Search-with-a-correction for the rosters that filter in the BROWSER.
 *
 * The SQL surfaces get this from `correctIfEmpty` in searchVocabulary.ts; the
 * four client-side rosters (clients, projects, careers, commitments) already
 * hold every row, so their vocabulary costs nothing to assemble and there is
 * no reason for them to behave differently from the tables that do.
 *
 * The tiering is the same: filter exactly first, and only reach for a
 * correction once that has returned NOTHING. `suggestQuery` scores candidates
 * by how many records match the whole corrected query, so the correction it
 * hands back is guaranteed to produce rows — which is why the second filter
 * pass below can never come back empty as well.
 *
 * Pass the items with every OTHER filter (status, category, visibility)
 * already applied: the correction is about spelling, and it must not quietly
 * widen a facet the reader chose deliberately.
 */
export function useCorrectedFilter<T>(
  query: string,
  items: readonly T[],
  fields: (item: T) => (string | null | undefined)[],
): { visible: T[]; correction: QuerySuggestion | null } {
  return useMemo(() => {
    const q = query.trim();
    if (!q) return { visible: [...items], correction: null };

    const exact = items.filter((i) => matchesAllTokens(q, fields(i)));
    if (exact.length > 0) return { visible: exact, correction: null };

    const correction = suggestQuery(
      q,
      items.map((i) => fields(i).filter(Boolean).join(' ')),
    );
    if (!correction.changed) return { visible: exact, correction: null };

    return {
      visible: items.filter((i) => matchesAllTokens(correction.corrected, fields(i))),
      correction,
    };
    // `fields` is a plain projection defined inline at every call site, so it
    // is a new function on every render; depending on it would defeat the memo
    // entirely. The rows and the query are what actually change the answer.
  }, [query, items]); // eslint-disable-line react-hooks/exhaustive-deps
}
