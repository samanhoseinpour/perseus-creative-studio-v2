/**
 * Deliverable-links self-check — the label fallback and the normaliser.
 *
 * Run:  node --import tsx scripts/check-task-links.mts    (no DB, no env)
 *
 * A task carries a LIST of deliverable links now, and the three things that
 * hold that up all fail quietly:
 *
 *  - `linkLabelFor` has to be TOTAL. `new URL()` throws on anything malformed
 *    and the column holds values written before whatever validation runs
 *    today, so a throw here takes out the whole board — and returning '' is
 *    barely better, since a chip with no text is an invisible chip. It falls
 *    back to the host, then to the raw url, and never to nothing.
 *  - `deliverableLinksSchema` DROPS a blank row instead of rejecting it. The
 *    dialog adds empty rows for the member to fill; refusing one they thought
 *    better of would block the save over an untouched box.
 *  - The schema has to accept its own OUTPUT. Forms parse once and the actions
 *    re-parse `parsed.data`, so a second pass over an already-normalised list
 *    must be a no-op rather than an error (the rule the single-url field
 *    carried before it).
 *
 *  - An issue's PATH has to name the row the DIALOG rendered, not the row's
 *    index after the blanks are dropped. Those two agree only when nothing is
 *    dropped above the bad row, which is exactly what the first version of
 *    this file tested — so the mismatch shipped and the error appeared under
 *    an empty box the member never touched.
 *
 * Run it after touching `linkLabelFor` or `deliverableLinksSchema`.
 */
import { linkLabelFor, TASK_LINK_MAX, TASK_URL_MAX } from '@/lib/taskFields';
import { deliverableLinksSchema } from '@/lib/taskSchema';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

/** Parse and return the normalised rows, or the first error message. */
function parse(rows: { url: string; label?: string }[]) {
  const result = deliverableLinksSchema.safeParse(rows);
  return result.success ? result.data : result.error.issues[0].message;
}

// ── linkLabelFor: total, and never empty ────────────────────────────────────

eq(
  'a typed name wins over the host',
  linkLabelFor({ url: 'https://drive.google.com/x', label: 'Final cut' }),
  'Final cut',
);
eq(
  'no name falls back to the host',
  linkLabelFor({ url: 'https://drive.google.com/folders/abc' }),
  'drive.google.com',
);
// `www.` names nobody — two links to the same site would read identically
// with it and differently without, so it comes off.
eq(
  'www. is stripped',
  linkLabelFor({ url: 'https://www.vimeo.com/12345' }),
  'vimeo.com',
);
eq(
  'a whitespace-only name is not a name',
  linkLabelFor({ url: 'https://vimeo.com/1', label: '   ' }),
  'vimeo.com',
);
// The load-bearing pair: neither may throw, and neither may return ''. A
// stored row predates today's schema, and an empty label is an invisible chip.
eq('junk does not throw, it degrades', linkLabelFor({ url: 'not a url' }), 'not a url');
eq('an empty url still renders something', linkLabelFor({ url: '' }), '');
eq(
  'a scheme with no host falls through to the raw text',
  linkLabelFor({ url: 'mailto:hi@example.com' }),
  'mailto:hi@example.com',
);

// ── The normaliser ──────────────────────────────────────────────────────────

eq('nothing in, nothing out', parse([]), []);
eq(
  'a plain link keeps no empty label key',
  parse([{ url: 'https://a.com/1' }]),
  [{ url: 'https://a.com/1' }],
);
// A blank name is DROPPED from the object rather than stored as '': nothing
// downstream should have to tell '' apart from unset, and linkLabelFor's
// fallback is what fills the gap.
eq(
  'a blank name is dropped, not stored',
  parse([{ url: 'https://a.com/1', label: '   ' }]),
  [{ url: 'https://a.com/1' }],
);
eq(
  'a real name is trimmed and kept',
  parse([{ url: ' https://a.com/1 ', label: '  Final cut ' }]),
  [{ url: 'https://a.com/1', label: 'Final cut' }],
);
// The refusal that is really a kindness: an untouched blank row the dialog
// added is not a validation failure, it is a row the member did not use.
eq('an empty row is dropped, not rejected', parse([{ url: '', label: '' }]), []);
eq(
  'an empty row does not take its neighbours with it',
  parse([{ url: '' }, { url: 'https://a.com/1' }, { url: '  ' }]),
  [{ url: 'https://a.com/1' }],
);
// ...but a row someone actually typed into is still checked.
eq(
  'a malformed url is refused',
  parse([{ url: 'a.com/1' }]),
  'Enter a full link (e.g. https://…).',
);
eq(
  'a non-http protocol is refused',
  parse([{ url: 'javascript:alert(1)' }]),
  'Enter a full link (e.g. https://…).',
);
eq(
  'duplicates collapse to the first',
  parse([
    { url: 'https://a.com/1', label: 'First' },
    { url: 'https://a.com/1', label: 'Second' },
  ]),
  [{ url: 'https://a.com/1', label: 'First' }],
);

// The cap counts REAL links: it is applied after the blanks are dropped, so a
// member who left spare rows open is not told they hit a limit they haven't.
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ url: `https://a.com/${i}` }));
eq('the cap admits exactly TASK_LINK_MAX', (parse(many(TASK_LINK_MAX)) as unknown[]).length, TASK_LINK_MAX);
eq(
  'one past the cap is refused',
  parse(many(TASK_LINK_MAX + 1)),
  `Keep it to ${TASK_LINK_MAX} links per task.`,
);
eq(
  'blank rows do not count toward the cap',
  (parse([...many(TASK_LINK_MAX), { url: '' }, { url: '  ' }]) as unknown[]).length,
  TASK_LINK_MAX,
);
eq(
  'an over-long url is refused',
  parse([{ url: `https://a.com/${'x'.repeat(TASK_URL_MAX)}` }]),
  `Keep the link under ${TASK_URL_MAX} characters.`,
);

// The round trip. Forms parse once and the actions re-parse `parsed.data`, so
// the schema must accept what it just produced — including the rows where the
// label key is absent entirely.
const once = parse([
  { url: ' https://a.com/1 ', label: ' Final cut ' },
  { url: 'https://b.com/2', label: '' },
  { url: '' },
]);
eq('re-parsing the output is a no-op', parse(once as { url: string }[]), once);

// ── The error PATH ──────────────────────────────────────────────────────────
//
// The dialog keys each row's message by the index it RENDERED, so an issue
// path has to name that same row. This was wrong once and the test that was
// supposed to cover it did not catch it: the only fixture had no blank row, so
// the pre-filter and post-filter indices happened to agree. Every case below
// puts something ahead of the bad row that the normaliser removes.
const pathOf = (rows: { url: string; label?: string }[]) => {
  const r = deliverableLinksSchema.safeParse(rows);
  return r.success ? null : r.error.issues[0].path.join('.');
};

eq(
  'the issue path names the offending row',
  pathOf([{ url: 'https://a.com/1' }, { url: 'nope' }]),
  '1.url',
);
// The regression: a blank row above a bad one must NOT renumber it. Filtering
// the blanks before validating reported this at 0.url, and the dialog then
// painted "Enter a full link" under the empty box the member never touched.
eq(
  'a blank row above a bad one does not shift the path',
  pathOf([{ url: '', label: '' }, { url: 'drive.google.com/file/abc' }]),
  '1.url',
);
eq(
  'two blank rows do not shift it either',
  pathOf([{ url: '' }, { url: '  ' }, { url: 'nope' }]),
  '2.url',
);
// A blank row must still not be an error in its own right — it is a row the
// member added and did not use, and refusing it would block the save.
eq(
  'a blank row above a GOOD one raises nothing',
  pathOf([{ url: '' }, { url: 'https://a.com/1' }]),
  null,
);
// The label cap reports on its own row too, so a long name and a bad url on
// different rows each land where they belong.
eq(
  'a label error names its own row',
  pathOf([{ url: '' }, { url: 'https://a.com/1', label: 'x'.repeat(200) }]),
  '1.label',
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
