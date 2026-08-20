/**
 * Shared vocabulary for the global /admin search (the ⌘K palette).
 * Deliberately a zero-dependency, client-safe leaf (the adminAreas.ts split):
 * the palette, the sidebar/mobile triggers, and the `_actions/search.ts`
 * fan-out all need these values, while the queries and gates stay in their
 * `server-only` modules. Nothing here may import the db, the registries, or
 * any server module — this file rides the shared admin client chunk.
 */

/**
 * The cross-island "open the palette" signal. CommandPalette and AdminSidebar
 * are sibling client islands under the server layout — there is no shared
 * client parent to lift state into, and the codebase already coordinates
 * window-level concerns this way (⌘K, ⌘B, the '/' focus hotkeys). Centralized
 * here so the event name isn't stringly-typed at call sites.
 */
export const ADMIN_SEARCH_OPEN_EVENT = 'perseus:admin-search-open';

/** Ask the mounted CommandPalette to open (no-op if none is listening). */
export function openAdminSearch(): void {
  window.dispatchEvent(new Event(ADMIN_SEARCH_OPEN_EVENT));
}

/**
 * Hard cap on the pattern that reaches ILIKE (mirrors Q_MAX_LENGTH in
 * taskFilters.ts). Server actions accept multi-MB bodies (the resume-upload
 * allowance), so an unbounded string would hand Postgres an attacker-sized
 * scan pattern. The action clamps server-side; this constant just keeps the
 * client honest about the same number.
 */
export const SEARCH_QUERY_MAX = 200;

/**
 * Every entity kind the global search can return. NOT payroll — never
 * payroll: its privacy design is the own-vs-admin projection split in
 * payrollQueries.ts, and a search index would be a third projection routing
 * around it. Feedback is skipped too (anonymous tallies, no searchable text).
 */
export const SEARCH_ENTITIES = [
  'task',
  'comment',
  'client',
  'project',
  'inquiry',
  'application',
  'ticket',
  'user',
  'activity',
] as const;

export type SearchEntity = (typeof SEARCH_ENTITIES)[number];

export function isSearchEntity(value: unknown): value is SearchEntity {
  return (
    typeof value === 'string' &&
    (SEARCH_ENTITIES as readonly string[]).includes(value)
  );
}

/**
 * The uniform hit every entity search returns. Hrefs are computed
 * SERVER-SIDE (the SubmissionHit precedent) so the client stays registry-free,
 * and the payload carries only what the row renders — never tokens, blob
 * pathnames, amounts, or notes bodies beyond the matched excerpt.
 */
export type SearchHit = {
  entity: SearchEntity;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

/**
 * Scope-prefix grammar: `task: brand video` restricts the search to tasks.
 * Aliases map what people type onto entity sets — 'task' fans out to comments
 * too because a comment hit opens its task. Parsed client-side (the palette
 * needs the scope to hide the route/action groups and build view-all links);
 * the server treats the scopes array as UNTRUSTED and intersects it with the
 * caller's permitted entities.
 */
const SCOPE_ALIASES: Record<string, SearchEntity[]> = {
  task: ['task', 'comment'],
  tasks: ['task', 'comment'],
  comment: ['comment'],
  comments: ['comment'],
  client: ['client'],
  clients: ['client'],
  project: ['project'],
  projects: ['project'],
  inquiry: ['inquiry'],
  inquiries: ['inquiry'],
  application: ['application'],
  applications: ['application'],
  job: ['application'],
  jobs: ['application'],
  ticket: ['ticket'],
  tickets: ['ticket'],
  user: ['user'],
  users: ['user'],
  log: ['activity'],
  logs: ['activity'],
  activity: ['activity'],
};

export type ScopedQuery = {
  /** null = no scope prefix — search everything the viewer may see. */
  scopes: SearchEntity[] | null;
  /** The query text with any scope prefix stripped. */
  term: string;
};

/** `"task: brand video"` → `{ scopes: ['task','comment'], term: 'brand video' }`.
 *  An unknown head (`"re: invoice"`) is literal text, not a scope. */
export function parseScopedQuery(raw: string): ScopedQuery {
  const match = /^([a-z]+):\s*(.*)$/i.exec(raw.trim());
  if (match) {
    const scopes = SCOPE_ALIASES[match[1].toLowerCase()];
    if (scopes) return { scopes, term: match[2].trim() };
  }
  return { scopes: null, term: raw.trim() };
}
