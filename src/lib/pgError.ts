/**
 * Postgres error codes, read the one way that actually works here.
 *
 * drizzle-orm wraps neon-http driver errors in a `DrizzleQueryError` with the
 * `NeonDbError` (and its `.code`) on `.cause`, so reading `.code` off the
 * thrown error directly is ALWAYS undefined. Every action file that wants to
 * turn a constraint violation into a sentence has to walk the cause chain, and
 * an action that reads `.code` directly silently never matches: the refusal it
 * was supposed to produce becomes a generic server error.
 *
 * A plain module rather than a private copy per file, because the two codes
 * below ARE the contract. `_actions/blogTaxonomy.ts` was about to be the third
 * verbatim copy in the blog domain alone, and a copy that drifts is a delete
 * door that starts reporting "try again" where it used to say why. The
 * remaining private copies in `_actions/careers.ts` and `_actions/tasks.ts`
 * predate this and should move here too; that is a separate change to those
 * domains, not a drive-by.
 *
 * Pure and dependency-free, so scripts/check-blogs.mts pins the walk and both
 * codes against real shapes instead of grepping a source file for them.
 */

/** The first `code` string found walking `error` and its `.cause` chain. */
export function pgCode(error: unknown): string | undefined {
  for (
    let current = error;
    typeof current === 'object' && current !== null;
    current = (current as { cause?: unknown }).cause
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** 23505: a UNIQUE index refused the row. A taken slug, in practice. */
export const isUniqueViolation = (error: unknown): boolean => pgCode(error) === '23505';

/** 23503: a FOREIGN KEY refused the row. Either a reference to something that
 *  is not there, or an ON DELETE RESTRICT refusing to let a referenced row go
 *  — which is the race backstop behind every "count first, then delete" door. */
export const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';
