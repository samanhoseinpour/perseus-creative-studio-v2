'use server';

/**
 * ⌘K palette global search. Reads live in the per-domain query modules
 * (`@/db/adminQueries`, `taskQueries`, `portfolioQueries`, `ticketQueries`,
 * `activityQueries`); this thin `'use server'` wrapper is what the client
 * palette calls (only an action stub reaches the client).
 *
 * SECURITY: server actions are public POST endpoints — the protected layout's
 * guard does NOT wrap them, and src/proxy.ts only checks that a session cookie
 * EXISTS. So the profile resolves FIRST, before any DB search work, and every
 * entity fans out only behind its own gate, mirroring the target page's:
 * areas for tasks/clients/projects/tickets/inbox/logs, the superadmin role for
 * users, and the reporter row-scope for a non-superadmin's tickets. The scopes
 * array arrives from the client and is UNTRUSTED — it can only narrow the
 * permitted set, never widen it. Payroll is NEVER searched: its privacy design
 * is the own-vs-admin projection split in payrollQueries.ts, and a search path
 * would be a third projection routing around it — this comment is the only
 * place the word appears in the search path, and must stay that way.
 *
 * Cache contract: pure read — revalidates nothing.
 *
 * Scale note: every entity search is an ILIKE seq scan with a tight LIMIT,
 * fine at studio volumes. If one ever measures slow, the levers are a pg_trgm
 * GIN index (new extension) or a partial index on task_events(kind='comment').
 */
import { getAccessProfile, canAccessArea, visibleKinds } from '@/lib/adminAccess';
import { searchAdminUsers, searchSubmissions } from '@/db/adminQueries';
import { searchActivity } from '@/db/activityQueries';
import { searchClients, searchProjects } from '@/db/portfolioQueries';
import { searchTaskComments, searchTasks } from '@/db/taskQueries';
import { searchTickets } from '@/db/ticketQueries';
import {
  SEARCH_QUERY_MAX,
  isSearchEntity,
  type SearchEntity,
  type SearchHit,
} from '@/lib/adminSearch';
import { logError } from '@/lib/log';
import {
  paletteSearchVocabulary,
  type PaletteVocabPart,
} from '@/db/searchVocabulary';
import { suggestQuery } from '@/lib/searchTerms';

export type GlobalSearchResult = {
  hits: SearchHit[];
  /** The query that actually ran, when it differs from what was typed. */
  correction: string | null;
};

export async function globalSearchAction(
  query: string,
  scopes?: string[],
): Promise<GlobalSearchResult> {
  // Authorization FIRST — no DB search work until the gate has resolved.
  const profile = await getAccessProfile();
  const q =
    typeof query === 'string' ? query.trim().slice(0, SEARCH_QUERY_MAX) : '';
  const NOTHING: GlobalSearchResult = { hits: [], correction: null };
  if (q.length < 2) return NOTHING;

  const permitted = new Set<SearchEntity>();
  if (canAccessArea(profile, 'tasks')) {
    permitted.add('task');
    permitted.add('comment');
  }
  if (canAccessArea(profile, 'clients')) permitted.add('client');
  if (canAccessArea(profile, 'projects')) permitted.add('project');
  const kinds = visibleKinds(profile);
  if (kinds.includes('project')) permitted.add('inquiry');
  if (kinds.includes('career')) permitted.add('application');
  if (canAccessArea(profile, 'tickets')) permitted.add('ticket');
  if (profile.superadmin) permitted.add('user');
  if (canAccessArea(profile, 'logs')) permitted.add('activity');

  // Untrusted narrowing: unknown strings drop out, and intersecting with the
  // permitted set means a hand-crafted scope can never reach a gated entity.
  const requested = Array.isArray(scopes)
    ? scopes.filter(isSearchEntity)
    : [];
  const scoped = requested.length > 0;
  const active = new Set(
    scoped ? requested.filter((e) => permitted.has(e)) : [...permitted],
  );
  if (active.size === 0) return NOTHING;

  // A scoped search shows one group, so it can afford deeper results; the
  // unscoped fan-out keeps per-entity limits tight (grouped top hits).
  const lim = (n: number) => (scoped ? 8 : n);

  // The submission kinds ride ONE query for both inboxes (the pre-palette
  // searchSubmissions shape), re-narrowed here by scope.
  const submissionKinds = kinds.filter(
    (k) =>
      (k === 'project' && active.has('inquiry')) ||
      (k === 'career' && active.has('application')),
  );

  // One fan-out, callable twice: once with what was typed, and — only if that
  // found nothing — once with a correction. Extracted rather than duplicated
  // so the two passes can never search different sets of entities.
  const fanOut = async (term: string): Promise<SearchHit[]> => {
    const jobs: Promise<SearchHit[]>[] = [];
    if (active.has('task')) jobs.push(searchTasks(term, lim(5)));
    if (active.has('comment')) jobs.push(searchTaskComments(term, lim(3)));
    if (active.has('client')) jobs.push(searchClients(term, lim(4)));
    if (active.has('project')) jobs.push(searchProjects(term, lim(4)));
    if (submissionKinds.length > 0) {
      jobs.push(
        searchSubmissions(term, lim(5), submissionKinds).then((rows) =>
          rows.map((r) => ({
            entity: (r.kind === 'project'
              ? 'inquiry'
              : 'application') as SearchEntity,
            id: r.id,
            label: r.name,
            sublabel: r.email,
            href: r.href,
          })),
        ),
      );
    }
    if (active.has('ticket')) {
      jobs.push(
        searchTickets(
          term,
          lim(4),
          profile.superadmin ? null : profile.session.user.id,
        ),
      );
    }
    if (active.has('user')) jobs.push(searchAdminUsers(term, lim(4)));
    if (active.has('activity')) jobs.push(searchActivity(term, lim(4)));

    // One atomic response: the palette writes ONE state update per fire, so
    // groups can't stream in and yank the keyboard cursor around.
    const results = await Promise.all(jobs);
    return results.flat();
  };

  try {
    const hits = await fanOut(q);
    if (hits.length > 0) return { hits, correction: null };

    // ── "Did you mean" — second tier, only ever on a miss ────────────────
    // The vocabulary spans ONLY the entities this viewer may see: a
    // correction built from rows they cannot open would send them to a page
    // that bounces, and would leak the existence of a client or a teammate
    // through a spelling hint. Tickets and activity contribute nothing to it
    // on purpose — a ticket is row-scoped per reporter, and an activity
    // summary is generated prose rather than a name anyone would type.
    const vocabParts: PaletteVocabPart[] = [];
    if (active.has('task')) vocabParts.push('task');
    if (submissionKinds.length > 0) vocabParts.push('submission');
    if (active.has('client')) vocabParts.push('client');
    if (active.has('project')) vocabParts.push('project');
    if (active.has('user')) vocabParts.push('user');

    const suggestion = suggestQuery(q, await paletteSearchVocabulary(vocabParts));
    if (!suggestion.changed) return NOTHING;

    // Re-run through the SAME fan-out, so what the palette lists is exactly
    // what typing the corrected query would have given.
    const corrected = await fanOut(suggestion.corrected);
    return corrected.length > 0
      ? { hits: corrected, correction: suggestion.corrected }
      : NOTHING;
  } catch (error) {
    // A debounced type-ahead has no error UI — degrade to empty; the next
    // keystroke retries.
    logError('[search] globalSearch failed', error);
    return NOTHING;
  }
}
