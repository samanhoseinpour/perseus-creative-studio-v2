import 'server-only';

import { sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { suggestQuery, type QuerySuggestion } from '@/lib/searchTerms';

/**
 * The words each search surface actually holds — the second tier of search,
 * and the ONLY thing that can answer "did you mean".
 *
 * Read the tier boundary carefully, because it is what keeps this cheap: the
 * exact search runs first and this NEVER runs beside it. A vocabulary is
 * fetched only once a query has already come back with nothing, which on a
 * working search is never. The common path pays zero extra round trips.
 *
 * Why a vocabulary pass rather than a similarity threshold in SQL (pg_trgm is
 * available on this database and deliberately not installed): what we owe the
 * reader is a corrected TERM they can see and click, not a set of rows that
 * happened to score above a number. The correction is then re-run through the
 * SAME exact predicate, so the results shown are the results for a real query
 * — explainable, and identical to what typing it by hand would give. A
 * threshold would return a fuzzy neighbourhood nobody could reproduce.
 *
 * Every reader returns one string PER ROW, with that row's searchable fields
 * concatenated — not a flat list of names. `suggestQuery` scores a candidate
 * correction by how many rows match the whole corrected query, so it needs to
 * know which words share a row; a flat list confidently corrected "ubc dilan
 * th" to a client called "Divan" instead of the task about Dylan. See the long
 * comment on `suggestQuery`.
 */

/**
 * A ceiling, not a page size. These tables are in the hundreds of rows today,
 * so this never bites; it is here so that a corpus which grows an order of
 * magnitude degrades into a partial vocabulary rather than into a slow search
 * on the one path a member is already unhappy about.
 */
const VOCAB_LIMIT = 5000;

/**
 * One line per task, carrying the same six fields `taskSearchReach` queries —
 * so a suggestion can never point at a word the search itself would then fail
 * to match. Correlated subqueries rather than joins, for `tasksWhere`'s reason:
 * a join would multiply the rows and weight a heavily tagged task more heavily
 * than the others when candidates are scored.
 */
export async function taskSearchVocabulary(): Promise<string[]> {
  const rows = await db.execute<{ w: string }>(sql`
    select concat_ws(' ',
      t.title,
      t.notes,
      coalesce((select c.name from clients c where c.id = t.client_id), 'Perseus'),
      (select tc.name from task_categories tc where tc.id = t.category_id),
      (select string_agg(a.member_name, ' ') from task_assignees a
         where a.task_id = t.id),
      (select string_agg(tg.name, ' ') from task_tag_links l
         join task_tags tg on tg.id = l.tag_id where l.task_id = t.id)
    ) as w
    from tasks t
    limit ${VOCAB_LIMIT}
  `);
  return (rows.rows ?? []).map((r) => r.w).filter(Boolean);
}

/** Inquiry / application names, companies and role titles. Never the email —
 *  a corrected address is a guess at somebody's identity, and the local part
 *  of an address is not a word anyone meant to type. */
export async function submissionSearchVocabulary(): Promise<string[]> {
  const rows = await db.execute<{ w: string }>(sql`
    select concat_ws(' ', name, company, role_title) as w
    from contact_submissions
    limit ${VOCAB_LIMIT}
  `);
  return (rows.rows ?? []).map((r) => r.w).filter(Boolean);
}

/** Activity summaries and entity names — the two columns `activityWhere`
 *  searches. */
export async function activitySearchVocabulary(): Promise<string[]> {
  const rows = await db.execute<{ w: string }>(sql`
    select concat_ws(' ', summary, entity_name) as w
    from activity_log
    order by created_at desc
    limit ${VOCAB_LIMIT}
  `);
  return (rows.rows ?? []).map((r) => r.w).filter(Boolean);
}

/**
 * The ⌘K palette searches nine entities at once, so its vocabulary has to span
 * them — but only the ones THIS viewer may see. A correction assembled from
 * rows somebody cannot open would point them at a page that bounces, and would
 * leak the existence of a client or a teammate through a spelling hint.
 *
 * One round trip whatever the mix: the parts are UNION ALL'd rather than read
 * separately. `union all`, not `union`, because duplicates are signal here —
 * `suggestQuery` scores a candidate by how many rows match, so collapsing two
 * identical rows would quietly down-weight a repeated name.
 */
export type PaletteVocabPart =
  | 'task'
  | 'submission'
  | 'client'
  | 'project'
  | 'user';

const PALETTE_VOCAB_SQL: Record<PaletteVocabPart, SQL> = {
  task: sql`select concat_ws(' ',
      t.title,
      coalesce((select c.name from clients c where c.id = t.client_id), 'Perseus'),
      (select tc.name from task_categories tc where tc.id = t.category_id),
      (select string_agg(a.member_name, ' ') from task_assignees a
         where a.task_id = t.id),
      (select string_agg(tg.name, ' ') from task_tag_links l
         join task_tags tg on tg.id = l.tag_id where l.task_id = t.id)
    ) as w from tasks t`,
  submission: sql`select concat_ws(' ', name, company, role_title) as w
    from contact_submissions`,
  client: sql`select concat_ws(' ', name, industry) as w from clients`,
  project: sql`select concat_ws(' ', title, client_name) as w from projects`,
  // Name only, never the email: a corrected address is a guess at somebody's
  // identity, and the local part of an address is not a word anyone typed.
  user: sql`select name as w from "user"`,
};

export async function paletteSearchVocabulary(
  parts: readonly PaletteVocabPart[],
): Promise<string[]> {
  if (parts.length === 0) return [];
  const unioned = sql.join(
    parts.map((part) => PALETTE_VOCAB_SQL[part]),
    sql` union all `,
  );
  const rows = await db.execute<{ w: string }>(sql`
    select w from (${unioned}) v where w is not null and w <> ''
    limit ${VOCAB_LIMIT}
  `);
  return (rows.rows ?? []).map((r) => r.w).filter(Boolean);
}

/**
 * "Did you mean", for a surface that has just found nothing.
 *
 * Returns null whenever there is nothing worth saying — no query, results
 * already found, or no word close enough to guess at. A caller can therefore
 * treat a null as "render the ordinary empty state", and there is no way to
 * end up telling somebody their spelling was wrong when it was not.
 */
export async function correctIfEmpty(
  q: string,
  found: number,
  vocabulary: () => Promise<string[]>,
): Promise<QuerySuggestion | null> {
  if (!q.trim() || found > 0) return null;
  const suggestion = suggestQuery(q, await vocabulary());
  return suggestion.changed ? suggestion : null;
}
