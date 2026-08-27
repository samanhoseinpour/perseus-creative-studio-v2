/**
 * How a typed search becomes something the database — or a client-side filter —
 * can actually answer.
 *
 * A PURE LEAF (the presence.ts / activityFields.ts shape): no `server-only`, no
 * `db`, no zod, no React. Both halves of every search surface import it, and
 * `scripts/check-search-terms.mts` runs it under plain Node with no environment
 * at all.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * Every search in /admin used to wrap the WHOLE typed string in `%…%` and test
 * it against each field on its own. That is stricter than it looks, and it
 * fails on ordinary input rather than on exotic input:
 *
 *     q = "arshia real th"   vs   "Arshia Real Estate TH"
 *
 * finds NOTHING, because the word "Estate" sits between "Real" and "TH" and a
 * contiguous substring cannot skip it. Word order, an extra word, and a term
 * that belongs to a DIFFERENT field from its neighbour all fail the same way —
 * and none of them is a typo. Splitting the query and requiring every token to
 * land SOMEWHERE is the whole fix; typo tolerance below is a separate, second
 * tier that only runs once the exact search has already come back empty.
 *
 * The two halves must agree, which is the other reason they live together:
 * `matchesAllTokens` is the browser twin of the AND-of-ORs the SQL builders
 * compose, so a roster filtered in the page and a table filtered in Postgres
 * answer the same question.
 */

/**
 * How many tokens one query may contribute.
 *
 * Not politeness: on the task board each token becomes its own OR over four
 * correlated EXISTS subqueries, so an unbounded split turns a pasted paragraph
 * into a hundred of them. Six is far past any real search ("arshia real th" is
 * three) and keeps the worst case flat.
 */
export const SEARCH_TOKEN_MAX = 6;

/** Below this length a token is never rewritten — see `suggestQuery`. */
const NO_CORRECTION_BELOW = 4;

/**
 * Split a typed query into the terms every row must satisfy.
 *
 * Lowercased because both consumers are case-insensitive anyway (Postgres via
 * ILIKE, the browser via a lowercased haystack), which also makes the dedupe
 * work across "TH" and "th".
 *
 * One-character tokens are dropped ONLY when something else survives: they
 * match almost everything, so "a" beside two real terms is noise — but a
 * deliberate one-character search is still a search, and returning `[]` for it
 * would widen the query to the whole table rather than narrowing it.
 */
export function searchTokens(raw: string): string[] {
  const parts = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const meaningful = parts.filter((p) => p.length > 1);
  const kept = meaningful.length > 0 ? meaningful : parts;
  return [...new Set(kept)].slice(0, SEARCH_TOKEN_MAX);
}

/**
 * The browser-side twin of the SQL predicate: every token must appear in at
 * least one of the fields this row DISPLAYS, though not necessarily the same
 * one. Nulls are accepted so a caller can pass an optional column straight in.
 */
export function matchesAllTokens(
  raw: string,
  haystacks: readonly (string | null | undefined)[],
): boolean {
  const tokens = searchTokens(raw);
  if (tokens.length === 0) return true;

  const hay = haystacks
    .filter((h): h is string => typeof h === 'string' && h.length > 0)
    .map((h) => h.toLowerCase());
  if (hay.length === 0) return false;

  return tokens.every((token) => hay.some((h) => h.includes(token)));
}

/**
 * Optimal string alignment distance — Levenshtein plus the ADJACENT
 * TRANSPOSITION that makes "teh"/"the" cost one instead of two, which is the
 * single most common way a human mistypes a word they know.
 *
 * Bails out as soon as the best possible remaining score exceeds `max`, so the
 * usual answer against a few thousand vocabulary words is a couple of cheap
 * comparisons rather than a full matrix.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr: number[] = [];

  for (let i = 1; i <= a.length; i += 1) {
    curr = new Array<number>(b.length + 1);
    curr[0] = i;
    let best = curr[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      curr[j] = v;
      if (v < best) best = v;
    }

    // Every remaining row can only add to the best score on this one.
    if (best > max) return max + 1;
    prev2 = prev;
    prev = curr;
  }

  return prev[b.length];
}

/**
 * How wrong a token is allowed to be before we refuse to guess.
 *
 * Scaled by length on purpose. At three characters almost every other short
 * word is one edit away ("th" → "the", "vt" → "v2"), so a correction there is
 * a coin flip dressed up as help; at eight characters one or two edits is
 * almost always the word the person meant.
 */
function budgetFor(token: string): number {
  if (token.length < NO_CORRECTION_BELOW) return 0;
  if (token.length <= 6) return 1;
  return 2;
}

export type QuerySuggestion = {
  /** The query to actually run — identical to the input when nothing moved. */
  corrected: string;
  /** Whether anything moved, i.e. whether it is worth telling the reader. */
  changed: boolean;
};

/**
 * "Did you mean" — scored against the records this surface actually holds.
 *
 * Deliberately a VOCABULARY pass rather than a similarity threshold in SQL,
 * because what we owe the reader is a corrected TERM they can see and click,
 * not a set of rows that scored well. The correction is then re-run through
 * the SAME exact predicate, so the results shown are the results for a real
 * query rather than a fuzzy neighbourhood nobody could reproduce.
 *
 * ── WHY `records` AND NOT A FLAT WORD LIST ────────────────────────────────
 * The first version of this scored candidates by edit distance alone, with the
 * longer shared prefix breaking ties. Against the real board that produced a
 * confidently WRONG answer:
 *
 *     "ubc dilan th"  →  "ubc divan th"      (a client)
 *                 not  →  "ubc dylan th"      (the task they wanted)
 *
 * because "divan" and "dylan" are both one edit from "dilan", and "divan"
 * happens to share the longer prefix. Distance cannot tell them apart, and no
 * tiebreak over single words ever could.
 *
 * What separates them is the REST OF THE QUERY: "dylan" appears in a record
 * that also contains "ubc" and "th"; "divan" does not appear in any such
 * record. So a candidate is scored by how many records match the WHOLE
 * corrected query, which has a property distance ranking never had — a
 * suggestion is only ever offered when running it actually returns something.
 * We never send anyone to a second empty page.
 *
 * Each entry in `records` is one row's searchable text concatenated; words are
 * split out of them here.
 *
 * ONE token is corrected, not several. Two typos in one query is rare, and the
 * combinations grow with every extra token corrected at once — where a wrong
 * guess is worse than none, the narrow version is the honest one.
 */
export function suggestQuery(
  raw: string,
  records: readonly string[],
): QuerySuggestion {
  const tokens = searchTokens(raw);
  const unchanged = { corrected: raw, changed: false };
  if (tokens.length === 0) return unchanged;

  const rows = records
    .filter((r): r is string => typeof r === 'string' && r.length > 0)
    .map((r) => r.toLowerCase());
  if (rows.length === 0) return unchanged;

  const words = [
    ...new Set(rows.flatMap((r) => r.split(/[^a-z0-9]+/)).filter((w) => w.length > 1)),
  ];
  if (words.length === 0) return unchanged;

  const countMatches = (terms: string[]) =>
    rows.reduce(
      (n, row) => (terms.every((t) => row.includes(t)) ? n + 1 : n),
      0,
    );

  let bestTerms: string[] | null = null;
  let bestScore = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestPrefix = -1;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const max = budgetFor(token);
    if (max === 0) continue;

    for (const word of words) {
      if (word === token) continue;
      const distance = editDistance(token, word, max);
      if (distance > max) continue;

      const trial = tokens.map((t, j) => (j === i ? word : t));
      const score = countMatches(trial);
      if (score === 0) continue;

      const prefix = commonPrefix(token, word);
      // More rows first: the correction that actually explains the query wins
      // over the one that merely looks close. Distance and prefix only break
      // ties between candidates that BOTH lead somewhere.
      if (
        score > bestScore ||
        (score === bestScore && distance < bestDistance) ||
        (score === bestScore && distance === bestDistance && prefix > bestPrefix)
      ) {
        bestTerms = trial;
        bestScore = score;
        bestDistance = distance;
        bestPrefix = prefix;
      }
    }
  }

  return bestTerms
    ? { corrected: bestTerms.join(' '), changed: true }
    : unchanged;
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}
