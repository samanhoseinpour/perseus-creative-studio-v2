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

export async function globalSearchAction(
  query: string,
  scopes?: string[],
): Promise<SearchHit[]> {
  // Authorization FIRST — no DB search work until the gate has resolved.
  const profile = await getAccessProfile();
  const q =
    typeof query === 'string' ? query.trim().slice(0, SEARCH_QUERY_MAX) : '';
  if (q.length < 2) return [];

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
  if (active.size === 0) return [];

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

  try {
    const jobs: Promise<SearchHit[]>[] = [];
    if (active.has('task')) jobs.push(searchTasks(q, lim(5)));
    if (active.has('comment')) jobs.push(searchTaskComments(q, lim(3)));
    if (active.has('client')) jobs.push(searchClients(q, lim(4)));
    if (active.has('project')) jobs.push(searchProjects(q, lim(4)));
    if (submissionKinds.length > 0) {
      jobs.push(
        searchSubmissions(q, lim(5), submissionKinds).then((rows) =>
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
          q,
          lim(4),
          profile.superadmin ? null : profile.session.user.id,
        ),
      );
    }
    if (active.has('user')) jobs.push(searchAdminUsers(q, lim(4)));
    if (active.has('activity')) jobs.push(searchActivity(q, lim(4)));

    // One atomic response: the palette writes ONE state update per fire, so
    // groups can't stream in and yank the keyboard cursor around.
    const results = await Promise.all(jobs);
    return results.flat();
  } catch (error) {
    // A debounced type-ahead has no error UI — degrade to empty; the next
    // keystroke retries.
    logError('[search] globalSearch failed', error);
    return [];
  }
}
