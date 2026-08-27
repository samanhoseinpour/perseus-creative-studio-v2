/**
 * Search-tokenizer self-check — the strictness bug, executable.
 *
 * Run:  node --import tsx scripts/check-search-terms.mts    (no DB, no env)
 *
 * Every search in /admin used to wrap the whole typed string in `%…%`, which
 * is why this file exists at all. The reported failure was not a typo and not
 * an exotic query:
 *
 *     "arshia real th"  could not find  "Arshia Real Estate TH"
 *
 * because "Estate" sits between "Real" and "TH" and a contiguous substring
 * cannot skip a word. That case is pinned below against the REAL title, so a
 * regression to single-substring matching fails here rather than being
 * rediscovered by someone who assumes the row was deleted.
 *
 * Three more things are pinned because each is silent when wrong:
 *
 *  - a token cap, because on the task board every token becomes its own OR
 *    over four correlated EXISTS subqueries;
 *  - the refusal to rewrite a SHORT token. At three characters half the
 *    vocabulary is one edit away, so a "correction" there is a coin flip that
 *    quietly answers a different question than the one that was asked;
 *  - the refusal to rewrite a token that is ALREADY in the vocabulary. It
 *    matched nothing only because a neighbour failed, and a suggestion that
 *    "corrects" a word the reader spelled right is one they learn to ignore.
 *
 * An empty query must yield NO tokens and therefore no clauses — never a
 * pattern that matches every row, which is the one failure mode here that
 * looks like success.
 */
import {
  SEARCH_TOKEN_MAX,
  editDistance,
  matchesAllTokens,
  searchTokens,
  suggestQuery,
} from '../src/lib/searchTerms.ts';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

// ── The reported case, against the real rows ───────────────────────────────
// Both titles are verbatim from the task board; the assignee is the member
// actually on them, which is the point — "arshia" is in the TITLE here, so
// this fails even with one single field. Adding a member name only widens it.
const REAL = 'Arshia Real Estate TH';
const REAL_V2 = 'Arshia Real Estate TH v2';

eq(
  'the old behaviour: one substring finds nothing',
  REAL.toLowerCase().includes('arshia real th'),
  false,
);
eq('tokens split the query', searchTokens('arshia real th'), ['arshia', 'real', 'th']);
eq('every token lands, so the row matches', matchesAllTokens('arshia real th', [REAL]), true);
eq('and so does the revision', matchesAllTokens('arshia real th', [REAL_V2]), true);

// Word ORDER must not matter — the other half of the same bug.
eq('reordered query still matches', matchesAllTokens('th real arshia', [REAL]), true);

// A token may land in a DIFFERENT field from its neighbour. This is the case
// that no amount of per-field substring matching can ever answer.
eq(
  'one token in the title, one in the member name',
  matchesAllTokens('estate sajad', [REAL, 'Sajad Hoseinpour']),
  true,
);
eq(
  'a token that is nowhere still fails the whole row',
  matchesAllTokens('estate dylan', [REAL, 'Sajad Hoseinpour']),
  false,
);

// ── Tokenizer edges ───────────────────────────────────────────────────────
eq('empty query yields no tokens', searchTokens(''), []);
eq('whitespace-only yields no tokens', searchTokens('   \t  '), []);
// The load-bearing consequence of the two above: no tokens means no clauses,
// so the query must WIDEN to everything rather than narrowing to nothing.
eq('no tokens matches every row', matchesAllTokens('   ', ['anything']), true);
eq('case is folded', searchTokens('TH Reels'), ['th', 'reels']);
eq('duplicates collapse across case', searchTokens('TH th tH'), ['th']);
eq('inner runs of whitespace collapse', searchTokens('real    th'), ['real', 'th']);
eq(
  'one-char tokens drop when a real term survives',
  searchTokens('a real th'),
  ['real', 'th'],
);
eq(
  'but a deliberate one-char search survives alone',
  searchTokens('a'),
  ['a'],
);
eq(
  'the token cap holds',
  searchTokens('a1 b2 c3 d4 e5 f6 g7 h8 i9').length,
  SEARCH_TOKEN_MAX,
);

// LIKE metacharacters stay literal. searchTokens must not strip them — the
// escape belongs to likePattern, and a token stripped here would silently
// widen the search instead of failing to find a literal "100%".
eq('percent survives tokenizing', searchTokens('100% done'), ['100%', 'done']);
eq('underscore survives tokenizing', searchTokens('a_b test'), ['a_b', 'test']);

// ── Distance ──────────────────────────────────────────────────────────────
eq('identical costs nothing', editDistance('matchtour', 'matchtour', 2), 0);
eq('one insertion', editDistance('matchtor', 'matchtour', 2), 1);
eq('adjacent transposition costs ONE, not two', editDistance('teh', 'the', 2), 1);
eq('over budget bails out', editDistance('abcdef', 'zyxwvu', 2) > 2, true);

// ── Suggestion ────────────────────────────────────────────────────────────
// RECORDS, not a flat word list — one string per row, its fields joined. The
// distinction is load-bearing and was learned against the real board; see the
// "ubc dilan th" case below.
const RECORDS = [
  'Arshia Real Estate TH  Sajad Hoseinpour  Video Editing',
  'Arshia Real Estate TH v2  Sajad Hoseinpour  Video Editing  Revision',
  'UBC Dylan TH Allstar and Pro ID  Sajad Hoseinpour  Video Editing',
  'Perseus x Match Tour  Perseus  Video Editing',
  'Divan Interiors  Aryan Ghasemi  Branding',
];

// "estat" would be the OBVIOUS typo fixture and is the WRONG one: it is a
// prefix of "estate", so the plain substring pass already finds the row and
// there is nothing to correct. A suggestion is only ever needed for a token
// substring matching genuinely misses, which is why the fixture is "esate".
eq(
  'a prefix-shaped near-miss needs no correction at all',
  matchesAllTokens('arshia real estat th', [RECORDS[0]]),
  true,
);
eq(
  'a real typo is corrected',
  suggestQuery('arshia real esate th', RECORDS).corrected,
  'arshia real estate th',
);
eq(
  'a correct query is left completely alone',
  suggestQuery('arshia real th', RECORDS),
  { corrected: 'arshia real th', changed: false },
);
// THE case that killed distance-only ranking. "dilan" is one edit from BOTH
// "dylan" and "divan"; "divan" even shares the longer prefix, so every
// single-word tiebreak picks the wrong one. Only the rest of the query
// separates them — "dylan" shares a row with "ubc" and "th", "divan" does not.
eq(
  'a tie is broken by the REST of the query, not by prefix',
  suggestQuery('ubc dilan th', RECORDS).corrected,
  'ubc dylan th',
);
eq(
  'the losing candidate really is one edit away too',
  editDistance('dilan', 'divan', 2),
  1,
);
eq(
  'and really does share the longer prefix (so prefix alone would lose)',
  editDistance('dilan', 'dylan', 2),
  1,
);
// A suggestion must always be RUNNABLE. Sending someone from one empty page to
// another is worse than saying nothing, so a candidate that matches no record
// is never offered — which is why scoring counts rows rather than characters.
eq(
  'every suggestion offered actually returns rows',
  ['arshia real esate th', 'ubc dilan th', 'perseus x mach tour']
    .map((q) => suggestQuery(q, RECORDS))
    .filter((s) => s.changed)
    .every((s) => RECORDS.some((r) => matchesAllTokens(s.corrected, [r]))),
  true,
);
// "vt" is two characters: half the vocabulary is one edit away, so a guess
// here answers a different question than the one that was asked.
eq('a short token is never rewritten', suggestQuery('vt', RECORDS).changed, false);
eq(
  'nothing close means no suggestion',
  suggestQuery('zzzzzzzz', RECORDS),
  { corrected: 'zzzzzzzz', changed: false },
);
eq(
  'an empty vocabulary suggests nothing',
  suggestQuery('esate', []),
  { corrected: 'esate', changed: false },
);
// Words that all exist but never TOGETHER are not a spelling problem, and
// inventing a correction for them would be a guess dressed as help.
eq(
  'real words that simply never co-occur get no suggestion',
  suggestQuery('divan allstar', RECORDS),
  { corrected: 'divan allstar', changed: false },
);
eq(
  'the corrected query finds what the original missed',
  [
    matchesAllTokens('arshia real esate th', [RECORDS[0]]),
    matchesAllTokens(suggestQuery('arshia real esate th', RECORDS).corrected, [RECORDS[0]]),
  ],
  [false, true],
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
