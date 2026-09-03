/**
 * Blog body self-check: the closed Tiptap vocabulary, the href guard, the
 * image-path and Blob-host rules, the derivations, the mapper, the renderer,
 * and (with --db) the public predicate and comparator against real Postgres.
 *
 * Run:  node --import tsx scripts/check-blog-body.mts
 *       node --env-file=.env.local --import tsx scripts/check-blog-body.mts --db
 *
 * Every rule here fails silently in a browser: an open redirect renders as a
 * working link, a foreign Blob host renders as an image, an unmapped node
 * renders as nothing. Mutation-test every assertion you add.
 */
import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq as eqCol, like } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { blogAuthors, blogCategories, blogPostRevisions, blogPosts } from '@/db/schema';
import { publicOrder, publicPostsWhere, publishedSlugExists, selectPublishedPosts } from '@/db/blogPredicates';
import {
  CUSTOM_NODE_NAMES,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
  blogSchema,
  bodyText,
  countTokens,
  figures,
  headings,
  howTos,
  tocEntries,
  validateBlogBody,
  videos,
  wordCount,
  type BlogDoc,
} from '@/lib/blogBody';
import {
  BLOG_SLUG_MAX,
  blogAuthorFieldsSchema,
  blogCategoryFieldsSchema,
  blogPostFieldsSchema,
  blogSlugSchema,
  canonicalOverrideSchema,
} from '@/lib/blogPostSchema';
import { STUDIO_TZ, dayNoonIn } from '@/lib/calendar';
import { mdxToTiptap, parseMdx } from '@/lib/mdxToTiptap';
import { safeHref } from '@/lib/safeHref';
import { STATIC_IMAGE_PATH_RE, BLUR_DATA_URL_RE, PORTFOLIO_SLUG_MAX } from '@/lib/portfolioFields';
import { PUBLIC_BLOB_HOST, BLOG_MEDIA_PATHNAME_RE, publicBlobUrl } from '@/lib/publicBlobFields';
import { countWords, deriveStepIds, extractHeadings, stripFaqSection } from '@/utils/extractHeadings';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};
/* `has`/`lacks` are the substring assertions the mapper and renderer sections
   use. They live here beside `eq` so every section of this file shares one
   assertion vocabulary as it grows, rather than each growing its own. */
const has = (label: string, hay: string, needle: string) =>
  eq(`${label} contains ${JSON.stringify(needle)}`, hay.includes(needle), true);
const lacks = (label: string, hay: string, needle: string) =>
  eq(`${label} lacks ${JSON.stringify(needle)}`, hay.includes(needle), false);

/* ── 1. safeHref ─────────────────────────────────────────────────────── */
for (const bad of [
  '//evil.com',
  '/\\evil.com',
  'javascript:alert(1)',
  'jAvAsCrIpT:alert(1)',
  'java\tscript:alert(1)',
  // A C0 control is NOT whitespace, so it slips past the `\s+` strip that
  // catches the tab above. The next two are where CONTROL_RE actually
  // bites: a path and an absolute URL both survive `new URL` with the
  // control intact, and safeHref returns the RAW string, not url.href.
  'java\u0001script:alert(1)',
  '/\u0001evil',
  'https://a.b/\u0001x',
  'blob:https://x/y',
  'data:text/html,x',
  'ftp://x',
  'vbscript:x',
  'https://x/'.padEnd(2100, 'a'),
  '',
]) eq(`safeHref refuses ${JSON.stringify(bad.slice(0, 30))}`, safeHref(bad), null);
for (const good of [
  'https://www.perseustudio.com/blogs/x',
  'https://example.com/a?b=c#d',
  '/blogs/x',
  '/blogs?category=production',
  '#faqs',
  'mailto:hi@example.com',
  'tel:+16045550100',
  'sms:+16045550100',
]) eq(`safeHref allows ${good}`, safeHref(good), good);

/* ── 2. Image paths and the Blob host ────────────────────────────────── */
for (const good of [
  '/images/blogs/production/x.avif',
  '/images/perseus-logo-black.avif',
  '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
  '/images/a/b/c.webp',
]) eq(`static path allows ${good}`, STATIC_IMAGE_PATH_RE.test(good), true);
for (const bad of [
  '/images/../x.avif',
  '/images/x?y.avif',
  '/images/x#y.avif',
  '/images/x y.avif',
  '/images/X.avif',
  '/images/x',
  'images/x.avif',
  'https://x/images/x.avif',
]) eq(`static path refuses ${bad}`, STATIC_IMAGE_PATH_RE.test(bad), false);
eq('blur regex allows a webp', BLUR_DATA_URL_RE.test('data:image/webp;base64,AAAA'), true);
eq('blur regex refuses markup', BLUR_DATA_URL_RE.test('data:text/html,<script>'), false);
eq('host is pinned to one store', /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/.test(PUBLIC_BLOB_HOST), true);
eq('media pathname allows blogs/', BLOG_MEDIA_PATHNAME_RE.test('blogs/abc/def-123.avif'), true);
eq('media pathname refuses projects/', BLOG_MEDIA_PATHNAME_RE.test('projects/abc.avif'), false);
eq('media pathname refuses traversal', BLOG_MEDIA_PATHNAME_RE.test('blogs/../x.avif'), false);
eq('publicBlobUrl derives from the pinned host', publicBlobUrl('blogs/x.avif'), `https://${PUBLIC_BLOB_HOST}/blogs/x.avif`);

/* ── 3. The vocabulary and the validator ─────────────────────────────── */
const p = (text: string, marks?: unknown[]) => ({
  type: 'paragraph',
  content: [{ type: 'text', text, ...(marks ? { marks } : {}) }],
});
const doc = (...content: unknown[]) => ({ type: 'doc', content });
const okDoc = (label: string, raw: unknown) => {
  const r = validateBlogBody(raw);
  eq(`valid: ${label}`, r.ok, true);
  if (!r.ok) console.log('   problems:', r.problems);
  return r.ok ? r.doc : null;
};
const badDoc = (label: string, raw: unknown) => {
  const r = validateBlogBody(raw);
  eq(`refused: ${label}`, r.ok, false);
};

eq('custom nodes are all in the schema', CUSTOM_NODE_NAMES.every((n) => Boolean(blogSchema.nodes[n])), true);
eq('link is ranked first among marks', Object.keys(blogSchema.marks)[0], 'link');
eq('schema has no target/rel on link', Object.keys(blogSchema.marks.link.spec.attrs ?? {}), ['href']);

okDoc('a paragraph', doc(p('hello')));
for (const level of [2, 3, 4]) okDoc(`heading level ${level}`, doc({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'H' }] }));
badDoc('h1', doc({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H' }] }));
badDoc('h5', doc({ type: 'heading', attrs: { level: 5 }, content: [{ type: 'text', text: 'H' }] }));
badDoc('unknown node', doc({ type: 'mystery' }));
badDoc('unknown attr', doc({ type: 'heading', attrs: { level: 2, foo: 1 }, content: [{ type: 'text', text: 'H' }] }));
badDoc('target on a link', doc(p('x', [{ type: 'link', attrs: { href: 'https://a.b', target: '_blank' } }])));
badDoc('rel on a link', doc(p('x', [{ type: 'link', attrs: { href: 'https://a.b', rel: 'nofollow' } }])));
badDoc('javascript href', doc(p('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])));
badDoc('protocol-relative href', doc(p('x', [{ type: 'link', attrs: { href: '//evil.com' } }])));
badDoc('empty text node', doc({ type: 'paragraph', content: [{ type: 'text', text: '' }] }));
badDoc('control character in text', doc(p('a\u0001b')));
badDoc('bold on a code span', doc(p('x', [{ type: 'bold' }, { type: 'code' }])));
badDoc('bad youtube id', doc({ type: 'youtube', attrs: { id: 'nope', external: false } }));
badDoc('bare PT totalTime', doc({ type: 'howTo', attrs: { totalTime: 'PT' }, content: [{ type: 'step', attrs: { title: 'A' }, content: [p('x')] }] }));
badDoc('static src outside /images', doc({ type: 'figure', attrs: { image: { type: 'static', src: '/foo/x.avif' }, alt: 'a', size: 'default', priority: false } }));
badDoc('static src with traversal', doc({ type: 'figure', attrs: { image: { type: 'static', src: '/images/../x.avif' }, alt: 'a', size: 'default', priority: false } }));
const rung = (pathname: string, host = PUBLIC_BLOB_HOST) => ({ url: `https://${host}/${pathname}`, pathname });
const media = (host?: string, pathname = 'blogs/x.avif') => ({
  type: 'media',
  variants: { full: { ...rung(pathname, host), width: 800, height: 600 } },
  blurDataUrl: 'data:image/webp;base64,AAAA',
});
okDoc('media figure on our store', doc({ type: 'figure', attrs: { image: media(), alt: 'a', size: 'default', priority: false } }));
badDoc('media figure on another store', doc({ type: 'figure', attrs: { image: media('other.public.blob.vercel-storage.com'), alt: 'a', size: 'default', priority: false } }));
badDoc('media pathname under projects/', doc({ type: 'figure', attrs: { image: media(undefined, 'projects/x.avif'), alt: 'a', size: 'default', priority: false } }));
badDoc('media url disagreeing with pathname', doc({ type: 'figure', attrs: { image: { ...media(), variants: { full: { url: `https://${PUBLIC_BLOB_HOST}/blogs/other.avif`, pathname: 'blogs/x.avif', width: 8, height: 6 } } }, alt: 'a', size: 'default', priority: false } }));
badDoc('bad blur data url', doc({ type: 'figure', attrs: { image: { ...media(), blurDataUrl: 'data:text/html,x' }, alt: 'a', size: 'default', priority: false } }));
badDoc('orphan step', doc({ type: 'step', attrs: { title: 'A' }, content: [p('x')] }));
badDoc('step inside a list item', doc({ type: 'bulletList', content: [{ type: 'listItem', content: [p('x'), { type: 'step', attrs: { title: 'A' }, content: [p('y')] }] }] }));
badDoc('heading inside a step', doc({ type: 'howTo', content: [{ type: 'step', attrs: { title: 'A' }, content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] }] }] }));
badDoc('pros pros', doc({ type: 'prosCons', content: [{ type: 'pros', content: [p('a')] }, { type: 'pros', content: [p('b')] }] }));
badDoc('empty prosCons', doc({ type: 'prosCons', content: [] }));
badDoc('too deep', (() => { let n: Record<string, unknown> = p('x'); for (let i = 0; i < 40; i++) n = { type: 'blockquote', content: [n] }; return doc(n); })());
badDoc('too many nodes', doc(...Array.from({ length: 20_001 }, () => p('x'))));
const canon = okDoc('link with only href', doc(p('x', [{ type: 'link', attrs: { href: 'https://a.b/' } }])));
eq('canonical link carries exactly href', canon?.content?.[0]?.content?.[0]?.marks, [{ type: 'link', attrs: { href: 'https://a.b/' } }]);
const canon2 = okDoc('canonical form fills defaults', doc({ type: 'youtube', attrs: { id: 'dQw4w9WgXcQ' } }));
eq('youtube external defaults to false', canon2?.content?.[0]?.attrs?.external, false);
eq('a canonical doc re-validates unchanged', JSON.stringify(canon2 && validateBlogBody(canon2).ok ? (validateBlogBody(canon2) as { ok: true; doc: BlogDoc }).doc : null), JSON.stringify(canon2));

/* ── 3b. Pinned deviations from the brief (see task-5-report.md) ─────── */
const roundTrips = (label: string, canon: BlogDoc | null) => {
  const again = canon ? validateBlogBody(canon) : null;
  eq(label, again?.ok ? JSON.stringify(again.doc) : null, canon ? JSON.stringify(canon) : 'no canonical doc');
};
// (a) The installed cell nodes declare `align` beside colspan/rowspan/
//     colwidth. nodeFromJSON materialises it as null on EVERY cell, so the
//     zod layer mirrors it (closed to what Tiptap itself normalises to) or no
//     canonical table could ever re-validate. The raw cells here carry no
//     attrs on purpose: that is the path where the mirror is load-bearing.
const cell = (kind: 'tableHeader' | 'tableCell', attrs?: Record<string, unknown>) => ({
  type: kind,
  ...(attrs ? { attrs } : {}),
  content: [p('c')],
});
const table = (...rows: unknown[][]) => ({
  type: 'table',
  content: rows.map((cells) => ({ type: 'tableRow', content: cells })),
});
const canonTable = okDoc('a table', doc(table([cell('tableHeader'), cell('tableHeader')], [cell('tableCell'), cell('tableCell')])));
eq('canonical cell carries every declared attr', canonTable?.content?.[0]?.content?.[0]?.content?.[0]?.attrs, { colspan: 1, rowspan: 1, colwidth: null, align: null });
roundTrips('a canonical table re-validates unchanged', canonTable);
badDoc('align outside left/center/right', doc(table([cell('tableCell', { align: 'justify' })])));
// (b) Every node and every mark in the schema, through the canonical form
//     and back: the general form of the brief's youtube round trip, so a
//     declared attribute the zod layer does not know fails HERE rather than
//     on the first post somebody saves. The coverage lines make the sweep
//     total: a node added to EXTENSIONS without a line in this fixture is a
//     failure, not a gap.
const every = doc(
  { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'H' }] },
  p('x', [{ type: 'bold' }, { type: 'italic' }, { type: 'strike' }, { type: 'underline' }, { type: 'link', attrs: { href: '/blogs/x' } }]),
  { type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'code' }] }, { type: 'hardBreak', marks: [{ type: 'bold' }] }, { type: 'text', text: 'b' }] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [p('i')] }] },
  { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p('i')] }] },
  { type: 'blockquote', content: [p('q')] },
  // Code keeps its newline and its tab: the text rule refuses every other control.
  { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'let a = 1;\n\tb();' }] },
  { type: 'horizontalRule' },
  table([cell('tableHeader', { colspan: 2 })], [cell('tableCell', { colwidth: [120], align: 'right' }), cell('tableCell')]),
  { type: 'youtube', attrs: { id: 'dQw4w9WgXcQ', title: 'T', description: 'D', uploadDate: '2026-02-28', external: true } },
  { type: 'instagram', attrs: { id: 'DPHVbIcCSFz', type: 'reel', caption: true } },
  { type: 'figure', attrs: { image: { type: 'static', src: '/images/blogs/x.avif' }, alt: 'a', caption: 'c', credit: 'k', size: 'wide', width: 1200, height: 630, priority: true } },
  { type: 'howTo', attrs: { title: 'How', totalTime: 'PT1H30M' }, content: [{ type: 'step', attrs: { title: 'A' }, content: [p('x'), { type: 'figure', attrs: { image: media(), alt: 'b' } }] }] },
  { type: 'prosCons', attrs: { title: 'Verdict' }, content: [{ type: 'pros', content: [p('+')] }, { type: 'cons', content: [p('-')] }] },
);
const canonEvery = okDoc('every node and mark', every);
const seen = { nodes: new Set<string>(), marks: new Set<string>() };
const walk = (n: unknown) => {
  if (!n || typeof n !== 'object') return;
  const r = n as { type?: string; content?: unknown[]; marks?: { type: string }[] };
  if (r.type) seen.nodes.add(r.type);
  for (const m of r.marks ?? []) seen.marks.add(m.type);
  for (const c of r.content ?? []) walk(c);
};
walk(canonEvery);
eq('the fixture reaches every node in the schema', [...seen.nodes].sort(), Object.keys(blogSchema.nodes).sort());
eq('the fixture reaches every mark in the schema', [...seen.marks].sort(), Object.keys(blogSchema.marks).sort());
roundTrips('every node and mark re-validates unchanged', canonEvery);
// (c) `attrs` may be omitted only where the schema's own defaults are valid.
//     The brief's helper made attrs optional everywhere, so `{ type:
//     'youtube' }` canonicalised to a null id and `{ type: 'figure' }` to a
//     figure with no image; both passed the write gate and neither could
//     re-validate. The two `valid:` lines pin the other edge: a node whose
//     attrs all default is still fine without them.
badDoc('youtube without attrs', doc({ type: 'youtube' }));
badDoc('heading without attrs', doc({ type: 'heading', content: [{ type: 'text', text: 'H' }] }));
badDoc('figure without attrs', doc({ type: 'figure' }));
badDoc('step without attrs', doc({ type: 'howTo', content: [{ type: 'step', content: [p('x')] }] }));
okDoc('howTo without attrs', doc({ type: 'howTo', content: [{ type: 'step', attrs: { title: 'A' }, content: [p('x')] }] }));
okDoc('orderedList without attrs', doc({ type: 'orderedList', content: [{ type: 'listItem', content: [p('i')] }] }));
// (d) Caps and refinements the brief's section leaves unexercised.
badDoc('table wider than TABLE_MAX_COLS', doc(table(Array.from({ length: TABLE_MAX_COLS + 1 }, () => cell('tableCell')))));
badDoc('table taller than TABLE_MAX_ROWS', doc(table(...Array.from({ length: TABLE_MAX_ROWS + 1 }, () => [cell('tableCell')]))));
badDoc('uploadDate that is not a calendar day', doc({ type: 'youtube', attrs: { id: 'dQw4w9WgXcQ', uploadDate: '2026-02-30' } }));
// (e) Review fix round 1. `Node.toJSON()` OMITS `content` for an empty node,
//     so `{ type: 'prosCons' }` is the only shape an empty prosCons ever has;
//     the brief's `content: []` case is one the editor never emits. And
//     `hardBreak` is the schema's only inline non-text node, so ProseMirror
//     itself marks it when a bold selection spans a soft break; the closed
//     shape mirrors that for hardBreak and for nothing else.
badDoc('prosCons without a content key', doc({ type: 'prosCons' }));
const canonBreak = okDoc('a hard break carrying a mark', doc({ type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak', marks: [{ type: 'bold' }] }, { type: 'text', text: 'b' }] }));
roundTrips('a marked hard break re-validates unchanged', canonBreak);
badDoc('marks on a horizontalRule', doc({ type: 'horizontalRule', marks: [{ type: 'bold' }] }));

/* ── 4. Derivations ──────────────────────────────────────────────────── */
const h = (level: 2 | 3 | 4, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const fixture = okDoc('derivation fixture', doc(
  h(2, 'Intro'),
  p('One two three.'),
  { type: 'youtube', attrs: { id: 'dQw4w9WgXcQ', external: false } },
  h(3, 'Intro'),
  { type: 'youtube', attrs: { id: 'dQw4w9WgXcQ', external: false } },
  h(2, 'Sources'),
  { type: 'codeBlock', attrs: { language: 'txt' }, content: [{ type: 'text', text: 'ignored words here' }] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [p('four five')] }] },
  { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableHeader', content: [p('six')] }, { type: 'tableHeader', content: [p('seven')] }] }] },
  { type: 'figure', attrs: { image: { type: 'static', src: '/images/blogs/production/x.avif' }, alt: 'alt text', caption: 'A caption', size: 'default', priority: false } },
  { type: 'howTo', attrs: { totalTime: 'PT4H' }, content: [
    { type: 'step', attrs: { title: 'Clear counters' }, content: [p('Clear  counters,\nand   remove'), p('personal items.')] },
    { type: 'step', attrs: { title: 'Clear counters' }, content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [p('tidy')] }] }] },
  ] },
  p('code `x` here', [{ type: 'code' }]),
))!;
const hs = headings(fixture, ['sources', 'faqs']);
eq('headings ids match extractHeadings on the same text', hs.map((x) => x.id), extractHeadings('## Intro\n\n### Intro\n\n## Sources', ['sources', 'faqs']).map((x) => x.id));
eq('headings levels/text', hs.map((x) => `${x.level}:${x.text}`), ['2:Intro', '3:Intro', '2:Sources']);
eq('duplicate + reserved suffixing', hs.map((x) => x.id), ['intro', 'intro-2', 'sources-2']);
const toc = tocEntries(hs, { hasSources: true, hasFaqs: true });
eq('tocEntries appends Sources then FAQs', toc.slice(-2).map((x) => x.id), ['sources', 'faqs']);
eq('tocEntries keeps body entries first, unchanged', toc.slice(0, hs.length), hs);
eq('tocEntries adds exactly the two pseudo-entries', toc.length, hs.length + 2);
eq('tocEntries pseudo-entries keep the level, text, id key order Task 13 compares against', Object.keys(toc[toc.length - 1]), ['level', 'text', 'id']);
eq('one body H2 plus FAQs still yields two entries', tocEntries([hs[0]], { hasSources: false, hasFaqs: true }).length, 2);
const txt = bodyText(fixture);
has('bodyText keeps prose', txt, 'One two three.');
has('bodyText keeps list items', txt, 'four five');
has('bodyText keeps cells', txt, 'seven');
has('bodyText keeps captions', txt, 'A caption');
has('bodyText keeps step titles', txt, 'Clear counters');
lacks('bodyText drops code blocks', txt, 'ignored words');
lacks('bodyText drops inline code', txt, 'code');
eq('bodyText collapses whitespace inside a block', txt.includes('Clear counters, and remove'), true);
eq('countTokens is whitespace tokens', countTokens('a  b\nc'), 3);
eq('wordCount adds the FAQ prose', wordCount({ doc: fixture, faqs: [{ question: 'Why?', answer: 'Because so.' }] }), countTokens(txt) + 3);
const vs = videos(fixture);
eq('videos dedupe first-wins with the nearest heading', vs.map((v) => `${v.id}:${v.title}`), ['dQw4w9WgXcQ:Intro']);
// An ordinary embed carries NO flag, never `false`: that is the shape the
// legacy extractVideos returns, and the importer's parity gate compares the
// two through JSON.stringify, which drops an undefined key and keeps a false
// one. The second line reads the other arm on a one-node doc, so both
// branches of the derivation's ternary are pinned.
eq('videos external flag is absent, not false, on an ordinary embed', vs[0].external, undefined);
eq('videos external flag survives on a flagged embed', videos(okDoc('external embed', doc({ type: 'youtube', attrs: { id: 'Gly3VY4zUG8', external: true } }))!)[0].external, true);
const fs = figures(fixture);
eq('figures keeps captioned figures', fs.map((f) => f.src), ['/images/blogs/production/x.avif']);
eq('figures carries alt/caption', [fs[0].alt, fs[0].caption], ['alt text', 'A caption']);
const ht = howTos(fixture);
eq('howTos name falls back to the nearest heading', ht[0].name, 'Sources');
eq('howTos totalTime', ht[0].totalTime, 'PT4H');
eq('howTos step ids dedupe like deriveStepIds', ht[0].steps.map((s) => s.id), deriveStepIds(['Clear counters', 'Clear counters']));
eq('howTos step text: per-block collapse, \\n join', ht[0].steps[0].text, 'Clear counters, and remove\npersonal items.');
eq('howTos step text includes list items', ht[0].steps[1].text, 'tidy');
eq('legacy countWords counts markers (the reason word_count is stored, not derived)', countWords('- a\n- b') > 2, true);
// Ruling (task 6 review): a heading's text and id INCLUDE inline code, as the
// rendered <h2> (childrenToText recurses through <code>) and the legacy
// extractHeadings (which unwraps the backticks) both do; only bodyText drops
// it. The exclusion is per CONSUMER, not per doc, so both are read off one
// fixture, and the two nearest-heading fallbacks are pinned beside the id.
const codeHeading = okDoc('heading with inline code', doc(
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Using ' }, { type: 'text', text: 'npm', marks: [{ type: 'code' }] }] },
  { type: 'youtube', attrs: { id: 'Gly3VY4zUG8', external: false } },
  { type: 'howTo', content: [{ type: 'step', attrs: { title: 'Install' }, content: [p('run it')] }] },
))!;
eq('headings keep inline code in the text and the id', headings(codeHeading), [{ id: 'using-npm', text: 'Using npm', level: 2 }]);
eq('headings agree with extractHeadings on inline code', headings(codeHeading)[0], extractHeadings('## Using `npm`')[0]);
eq('videos title fallback keeps inline code', videos(codeHeading)[0].title, 'Using npm');
eq('howTos name fallback keeps inline code', howTos(codeHeading)[0].name, 'Using npm');
has('bodyText keeps the rest of a heading with inline code', bodyText(codeHeading), 'Using');
lacks('bodyText still drops inline code in a heading', bodyText(codeHeading), 'npm');
// Review round 2: the four rules below had no assertion that went red when
// they broke, because the first fixture's headings share one text, carry no
// title/description/uploadDate attrs, and every figure in it is captioned.
// Each is read off its own small doc, the `external embed` pattern.
const vidDoc = okDoc('videos: first-wins and attr precedence', doc(
  h(2, 'First'),
  { type: 'youtube', attrs: { id: 'firstVideo1', external: false } },
  h(2, 'Second'),
  { type: 'youtube', attrs: { id: 'firstVideo1', title: 'Explicit', external: false } },
  { type: 'youtube', attrs: { id: 'titledVideo', title: 'Titled', description: 'Desc', uploadDate: '2026-02-28', external: false } },
))!;
const vd = videos(vidDoc);
const vidA = vd.find((v) => v.id === 'firstVideo1');
const vidB = vd.find((v) => v.id === 'titledVideo');
eq('videos: the FIRST occurrence wins, title included', vidA?.title, 'First');
eq('videos: a title attr beats the nearest heading', vidB?.title, 'Titled');
eq('videos: description and uploadDate pass through', [vidB?.description, vidB?.uploadDate], ['Desc', '2026-02-28']);
const figDoc = okDoc('figures: uncaptioned static beside a credited media figure', doc(
  { type: 'figure', attrs: { image: { type: 'static', src: '/images/blogs/plain.avif' }, alt: 'plain', size: 'default', priority: false } },
  { type: 'figure', attrs: { image: media(undefined, 'blogs/shot.avif'), alt: 'shot', credit: 'Perseus', size: 'default', priority: false } },
))!;
const fg = figures(figDoc);
eq('figures: only a captioned or credited figure qualifies, and a media figure announces its Blob master url', fg.map((f) => f.src), [publicBlobUrl('blogs/shot.avif')]);
eq('figures: credit passes through', fg.find((f) => f.credit)?.credit, 'Perseus');
const titledHowTo = okDoc('howTo with a title attr', doc(
  h(2, 'Heading'),
  { type: 'howTo', attrs: { title: 'Explicit' }, content: [{ type: 'step', attrs: { title: 'Only' }, content: [p('x')] }] },
))!;
eq('howTos: a title attr beats the nearest heading', howTos(titledHowTo)[0]?.name, 'Explicit');
// Ruling (task 6 review, minor 2): a step's text keeps inline code, as the
// rendered step body and the legacy stripBlockMarkdown did; bodyText still
// drops it. Same doc, two consumers.
const codeStep = okDoc('step with inline code', doc(
  { type: 'howTo', content: [{ type: 'step', attrs: { title: 'Install' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'run ' }, { type: 'text', text: 'npm i', marks: [{ type: 'code' }] }] }] }] },
))!;
eq('howTos step text keeps inline code', howTos(codeStep)[0]?.steps[0]?.text, 'run npm i');
lacks('bodyText still drops inline code in a step', bodyText(codeStep), 'npm i');

/* ── 5. Post-level fields ────────────────────────────────────────────── */
eq('slug: kebab ok', blogSlugSchema.safeParse('vancouver-real-estate').success, true);
eq('slug: authors is reserved', blogSlugSchema.safeParse('authors').success, false);
eq('slug: uppercase refused', blogSlugSchema.safeParse('Vancouver').success, false);
eq('slug: over 120 refused', blogSlugSchema.safeParse('a'.repeat(121)).success, false);
// blogStore's isSlugShaped gate reads PORTFOLIO_SLUG_MAX from the zod-free
// leaf while the schema caps at BLOG_SLUG_MAX. If they ever diverge, a slug
// the editor accepts is one the store refuses to look up, or the reverse.
eq('store slug gate matches the schema cap', PORTFOLIO_SLUG_MAX, BLOG_SLUG_MAX);
eq('canonical: https ok', canonicalOverrideSchema.safeParse('https://example.com/x').success, true);
eq('canonical: http refused', canonicalOverrideSchema.safeParse('http://example.com/x').success, false);
eq('canonical: userinfo refused', canonicalOverrideSchema.safeParse('https://a:b@example.com/x').success, false);
eq('canonical: fragment refused', canonicalOverrideSchema.safeParse('https://example.com/x#y').success, false);
// `new URL` percent-encodes a C0 control in a path rather than refusing it,
// and this schema stores the RAW string — so the guard is the schema's own,
// not the parser's. Mutating it out turns this line red and nothing else.
eq('canonical: control character refused', canonicalOverrideSchema.safeParse('https://example.com/a\u0001b').success, false);
const fields = {
  slug: 'x', title: 'T', description: 'D', categorySlug: 'production', authorSlug: 'saman-hoseinpour', serviceSlug: null,
  heroStaticPath: '/images/blogs/production/x.avif', heroAlt: 'alt', heroCaption: null,
  keyTakeaways: ['a'], faqs: [{ question: 'q', answer: 'a' }], sources: [{ title: 's', href: 'https://a.b/c' }],
  entities: [{ name: 'n', sameAs: ['https://www.wikidata.org/wiki/Q1'], primary: true }], relatedSlugs: ['y'],
  seoTitle: 'st', seoDescription: 'sd', canonicalOverride: null, ogTitle: 'ot', ogDescription: 'od',
  twitterCard: 'summary_large_image', robotsIndex: true, robotsFollow: true, focusKeywords: ['k'], llmsInclude: true,
};
eq('post fields: valid record', blogPostFieldsSchema.safeParse(fields).success, true);
eq('post fields: relative source href refused', blogPostFieldsSchema.safeParse({ ...fields, sources: [{ title: 's', href: '/blogs/x' }] }).success, false);
eq('post fields: bad source rel refused', blogPostFieldsSchema.safeParse({ ...fields, sources: [{ title: 's', href: 'https://a.b', rel: 'me' }] }).success, false);
eq('post fields: control char in title refused', blogPostFieldsSchema.safeParse({ ...fields, title: 'a\u0001b' }).success, false);
eq('post fields: six takeaways refused', blogPostFieldsSchema.safeParse({ ...fields, keyTakeaways: ['1', '2', '3', '4', '5', '6'] }).success, false);
eq('post fields: hero outside /images refused', blogPostFieldsSchema.safeParse({ ...fields, heroStaticPath: '/x.avif' }).success, false);
eq('post fields: unknown key refused', blogPostFieldsSchema.safeParse({ ...fields, excerpt: 'x' }).success, false);
// The author and category records are parsed by the same importer as the
// post, so they are pinned here rather than left to Task 13: `kind` and the
// slug shape are both closed vocabularies nothing else in the suite reads.
const authorFields = {
  slug: 'saman-hoseinpour', name: 'Saman Hoseinpour', kind: 'person', role: 'Founder', bio: 'b',
  imageStaticPath: null, ogImageStaticPath: null, sameAs: ['https://www.linkedin.com/in/x'],
  knowsAbout: ['seo'], tags: ['t'], location: null, sortIndex: 0,
};
eq('author fields: valid person record', blogAuthorFieldsSchema.safeParse(authorFields).success, true);
eq('author fields: unknown kind refused', blogAuthorFieldsSchema.safeParse({ ...authorFields, kind: 'robot' }).success, false);
const categoryFields = { slug: 'branding', title: 'Branding', seoTitle: null, seoDescription: null, sortIndex: 4 };
eq('category fields: valid record', blogCategoryFieldsSchema.safeParse(categoryFields).success, true);
eq('category fields: uppercase slug refused', blogCategoryFieldsSchema.safeParse({ ...categoryFields, slug: 'Branding' }).success, false);

/* ── 6. The mapper over the corpus fixture ───────────────────────────── */
const fixtureMdx = readFileSync('scripts/blog-fixtures/corpus.mdx', 'utf8');
const mapped = mdxToTiptap(parseMdx(stripFaqSection(fixtureMdx)));
eq('mapper: no problems on the corpus fixture', mapped.problems, []);
eq('mapper: aside unwrapped with a WARN', mapped.notes.some((n) => n.kind === 'WARN' && /aside/.test(n.message)), true);
eq('mapper: prose Image title dropped with a NOTE', mapped.notes.some((n) => n.kind === 'NOTE' && /title/.test(n.message)), true);
const validated = validateBlogBody(mapped.doc);
eq('mapper output validates', validated.ok, true);
if (!validated.ok) console.log(validated.problems);
const mdoc = validated.ok ? validated.doc : ({ type: 'doc', content: [] } as BlogDoc);
const types = (mdoc.content ?? []).map((n) => n.type);
eq('root-level <br /> became paragraph[hardBreak]', JSON.stringify(mdoc.content?.[2]), JSON.stringify({ type: 'paragraph', content: [{ type: 'hardBreak' }] }));
eq('inline <br /> became a hardBreak inside the paragraph', mdoc.content?.[4]?.content?.[0]?.type, 'hardBreak');
eq('bold+link text carries [link, bold] in rank order', JSON.stringify(mdoc.content?.[1]?.content?.find((c) => c.text === 'bold link')?.marks?.map((m) => m.type)), JSON.stringify(['link', 'bold']));
eq('loose list collapsed to tight', types.filter((t) => t === 'bulletList').length, 2);
eq('table first row became tableHeader', mdoc.content?.find((n) => n.type === 'table')?.content?.[0]?.content?.[0]?.type, 'tableHeader');
eq('external flag survives', (mdoc.content?.filter((n) => n.type === 'youtube') ?? []).map((n) => n.attrs?.external), [false, true]);
eq('instagram defaults', mdoc.content?.find((n) => n.type === 'instagram')?.attrs, { id: 'DPHVbIcCSFz', type: 'p', caption: false });
const figs = mdoc.content?.filter((n) => n.type === 'figure') ?? [];
eq('Image width/height from props', [figs[0]?.attrs?.width, figs[0]?.attrs?.height], [150, 150]);
eq('Image WxH title sets dimensions', [figs[2]?.attrs?.width, figs[2]?.attrs?.height], [1200, 630]);
eq('Image prose title never stored', 'title' in (figs[1]?.attrs ?? {}), false);
const howTo = mdoc.content?.find((n) => n.type === 'howTo');
eq('howTo has two steps', howTo?.content?.length, 2);
eq('step body keeps a figure', howTo?.content?.[1]?.content?.some((b) => b.type === 'figure'), true);
eq('prosCons has pros then cons', mdoc.content?.find((n) => n.type === 'prosCons')?.content?.map((c) => c.type), ['pros', 'cons']);
const aPara = mdoc.content?.find((n) => n.type === 'paragraph' && n.content?.[0]?.marks?.some((m) => m.type === 'link' && m.attrs?.href === 'https://www.instagram.com/perseustudio/'));
eq('flow <a> became a paragraph with a link mark', Boolean(aPara), true);
eq('the H2 after the FAQ section survives', headings(mdoc).some((x) => x.text === 'Ready to create better media?'), true);
eq('Quick Answer stays in the body', headings(mdoc).some((x) => x.text === 'Quick Answer'), true);
eq('the FAQ H2 is gone from the body', headings(mdoc).some((x) => /Frequently/.test(x.text)), false);
const refused = mdxToTiptap(parseMdx('Text with {index=0} an expression.\n\n<Weird />\n\n##### h5'));
eq('mapper refuses expressions, unknown JSX and h5', refused.problems.length, 3);
const codeInBold = mdxToTiptap(parseMdx('**bold `code` here**'));
eq('code span inside bold drops the outer mark with a WARN', codeInBold.notes.some((n) => n.kind === 'WARN' && /code span/.test(n.message)), true);
// Review fix round 1. (a) A GFM task list is outside the vocabulary and its
// checkbox would otherwise vanish with nothing said: the guard is per ITEM
// and the list still maps, so one run reports every problem. (b) The check
// and the importer both compose mdxToTiptap(parseMdx(stripFaqSection(src))),
// so a problem after the FAQ block can only name its FILE line if the strip
// keeps the line count. (c) The flow <a> puts the link mark on EVERY inline
// that may carry marks, hardBreak included, not on text alone.
const taskList = mdxToTiptap(parseMdx('- plain\n- [ ] todo'));
eq('task-list checkbox refused once, at the item line', taskList.problems, [{ line: 2, message: 'task-list checkboxes are not supported' }]);
eq('task-list: the rest of the list still maps', taskList.doc.content?.[0]?.content?.length, 2);
// <Weird /> is file line 15: the FAQ block is lines 3-11 and the strip
// removes 3-12 (through the line before the next H2).
const faqSrc = [
  'A paragraph.',
  '',
  '## FAQ',
  '',
  '### Is this an FAQ?',
  '',
  'Yes, it is.',
  '',
  '### And another?',
  '',
  'Also yes.',
  '',
  '## Next',
  '',
  '<Weird />',
].join('\n');
eq('stripFaqSection keeps the line count', stripFaqSection(faqSrc).split('\n').length, faqSrc.split('\n').length);
const afterFaq = mdxToTiptap(parseMdx(stripFaqSection(faqSrc)));
eq('a problem after the FAQ block reports its file line', afterFaq.problems.map((p) => p.line), [15]);
eq('the FAQ block is still stripped', afterFaq.doc.content?.map((n) => n.type), ['paragraph', 'heading']);
const aBreak = mdxToTiptap(parseMdx('<a href="https://example.com">\n  one<br />two\n</a>'));
eq('flow <a>: the link mark covers text, hardBreak, text', (aBreak.doc.content?.[0]?.content ?? []).map((c) => `${c.type}:${(c.marks ?? []).map((m) => m.type).join('+')}`), ['text:link', 'hardBreak:link', 'text:link']);
eq('flow <a> with a break validates', validateBlogBody(aBreak.doc).ok, true);

if (!process.argv.includes('--db')) {
  console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure checks; add --db with --env-file=.env.local for the Postgres round trip)`);
  process.exit(fails === 0 ? 0 : 1);
}

/* ── 7. The Postgres round trip (--db) ───────────────────────────────── */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const PREFIX = 'zz-check-';
const sweep = async () => {
  await db.delete(blogPosts).where(like(blogPosts.slug, `${PREFIX}%`));
  await db.delete(blogAuthors).where(eqCol(blogAuthors.slug, `${PREFIX}author`));
  await db.delete(blogCategories).where(eqCol(blogCategories.slug, `${PREFIX}cat`));
};
/* The SQLSTATE and constraint of a refused write, walked down `.cause` the way
   the action files' pgCode does: drizzle wraps the driver error, so `.code` on
   the thrown error itself is always undefined. */
const pgRefusal = (error: unknown): { code?: string; constraint?: string } => {
  for (let current = error; typeof current === 'object' && current !== null; current = (current as { cause?: unknown }).cause) {
    const { code, constraint } = current as { code?: unknown; constraint?: unknown };
    if (typeof code === 'string') return { code, ...(typeof constraint === 'string' ? { constraint } : {}) };
  }
  return {};
};
try {
  await sweep();
  const [author] = await db.insert(blogAuthors).values({ slug: `${PREFIX}author`, name: 'ZZ-CHECK', role: 'r', bio: 'b', sortIndex: 999 }).returning();
  const [cat] = await db.insert(blogCategories).values({ slug: `${PREFIX}cat`, title: 'ZZ-CHECK', sortIndex: 999 }).returning();
  const day = dayNoonIn(STUDIO_TZ, '2026-05-18');
  const body = { type: 'doc', content: [p('ZZ-CHECK body')] } as BlogDoc;
  const snapshotFor = (title: string, slug: string) => ({
    slug, title, description: 'd', categorySlug: cat.slug, authorSlug: author.slug, serviceSlug: null,
    hero: { staticPath: '/images/blogs/production/x.avif', media: null, alt: 'a', caption: null },
    body, bodyText: 'ZZ-CHECK body', wordCount: 2, keyTakeaways: [], faqs: [], sources: [], entities: [], relatedSlugs: [],
    seo: { title: 't', description: 'd', canonicalOverride: null, ogTitle: 't', ogDescription: 'd', ogImage: null, twitterCard: 'summary_large_image', robotsIndex: true, robotsFollow: true, robotsExtra: null, focusKeywords: [], emitLegacyMetaKeywords: false },
    customSchema: null, llmsInclude: true, publishedAt: day.toISOString(), contentModifiedAt: null,
  });
  /* One working row plus its published revision 1. `extra` pins a created_at
     or an id for the comparator fixtures below. */
  const seed = async (slug: string, status: typeof blogPosts.$inferInsert.status, legacyId: number | null, title = `ZZ-CHECK ${slug} rev`, extra: { id?: string; createdAt?: Date } = {}) => {
    const [post] = await db.insert(blogPosts).values({
      ...extra,
      slug, legacyId, title: `${title} WORKING`, description: 'd', categoryId: cat.id, authorId: author.id,
      heroStaticPath: '/images/blogs/production/x.avif', heroAlt: 'a', body, bodyText: 'ZZ-CHECK body', wordCount: 2,
      seoTitle: 't', seoDescription: 'd', ogTitle: 't', ogDescription: 'd', status, publishedAt: day,
      trashedAt: status === 'trash' ? new Date() : null,
    }).returning();
    const [rev] = await db.insert(blogPostRevisions).values({
      postId: post.id, number: 1, reason: 'import', slug, title, categoryId: cat.id, authorId: author.id,
      publishedAt: day, contentModifiedAt: null, wordCount: 2, snapshot: snapshotFor(title, slug),
    }).returning();
    await db.update(blogPosts).set({ publishedRevisionId: rev.id }).where(eqCol(blogPosts.id, post.id));
    return post.id;
  };
  const aId = await seed(`${PREFIX}a`, 'published', 1000);
  const bId = await seed(`${PREFIX}b`, 'published', null);
  await seed(`${PREFIX}c`, 'draft', 1001);
  await seed(`${PREFIX}d`, 'scheduled', 1002);
  await seed(`${PREFIX}e`, 'archived', 1003);
  await seed(`${PREFIX}f`, 'trash', 1004);
  // Comparator fixtures: NULL legacy_id and the same published_at as a and b,
  // created before b (whose created_at is now) so they follow it. n1 and n2
  // differ only in created_at, and n1 carries the LARGER id, so only the
  // created_at arm can put n2 first. t1 and t2 share created_at and carry ids
  // whose order OPPOSES their insertion order, so only the id arm can put t2
  // first.
  const fixedId = (tail: string) => `ffffffff-0000-4000-8000-0000000000${tail}`;
  await seed(`${PREFIX}n1`, 'published', null, undefined, { id: fixedId('02'), createdAt: new Date('2026-05-01T12:00:00Z') });
  await seed(`${PREFIX}n2`, 'published', null, undefined, { id: fixedId('01'), createdAt: new Date('2026-05-02T12:00:00Z') });
  await seed(`${PREFIX}t1`, 'published', null, undefined, { id: fixedId('11'), createdAt: new Date('2026-04-01T12:00:00Z') });
  await seed(`${PREFIX}t2`, 'published', null, undefined, { id: fixedId('12'), createdAt: new Date('2026-04-01T12:00:00Z') });
  // A second, UNPUBLISHED revision of a (published_revision_id still names
  // revision 1): the join must read the pointer, not every revision.
  await db.insert(blogPostRevisions).values({
    postId: aId, number: 2, reason: 'save', slug: `${PREFIX}a`, title: `ZZ-CHECK ${PREFIX}a rev rev2`, categoryId: cat.id, authorId: author.id,
    publishedAt: day, contentModifiedAt: null, wordCount: 2, snapshot: snapshotFor(`ZZ-CHECK ${PREFIX}a rev rev2`, `${PREFIX}a`),
  });
  // b's published revision carries a typed slug copy that DISAGREES with its
  // working row: the URL identity is the working row's slug, everywhere.
  await db.update(blogPostRevisions).set({ slug: `${PREFIX}b-typed-copy` }).where(eqCol(blogPostRevisions.postId, bId));

  const PUBLIC_ORDER = [`${PREFIX}a`, `${PREFIX}b`, `${PREFIX}n2`, `${PREFIX}n1`, `${PREFIX}t2`, `${PREFIX}t1`];
  const rows = (await selectPublishedPosts(db)).filter((r) => r.slug.startsWith(PREFIX));
  eq('db: predicate returns only published, once each, in publicOrder', rows.map((r) => r.slug), PUBLIC_ORDER);
  eq('db: the join reads published_revision_id, not every revision', rows.filter((r) => r.slug === `${PREFIX}a`).map((r) => r.revision.number), [1]);
  eq('db: NULL legacy_id sorts after a same-day legacy post', rows[0].legacyId, 1000);
  eq('db: title comes from the published REVISION, not the working row', rows[0].revision.title, `ZZ-CHECK ${PREFIX}a rev`);
  eq('db: snapshot round-trips as an object (its title is readable)', rows[0].revision.snapshot.title, `ZZ-CHECK ${PREFIX}a rev`);
  eq('db: the row slug is the WORKING slug, not the revision copy', [rows[1].slug, rows[1].revision.slug], [`${PREFIX}b`, `${PREFIX}b-typed-copy`]);
  eq('db: publishedSlugExists true for published', await publishedSlugExists(db, `${PREFIX}a`), true);
  eq('db: publishedSlugExists false for draft', await publishedSlugExists(db, `${PREFIX}c`), false);
  eq('db: publishedSlugExists false for unknown', await publishedSlugExists(db, `${PREFIX}nope`), false);
  const ordered = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(publicPostsWhere()).orderBy(...publicOrder());
  const mine = ordered.map((r) => r.slug).filter((s) => s.startsWith(PREFIX));
  eq('db: publicOrder: legacy_id desc nulls last, then created_at desc, then id desc', mine, PUBLIC_ORDER);
  eq('db: equal legacy_id falls through to created_at DESC', mine.filter((s) => s === `${PREFIX}n1` || s === `${PREFIX}n2`), [`${PREFIX}n2`, `${PREFIX}n1`]);
  eq('db: equal created_at falls through to id DESC', mine.filter((s) => s === `${PREFIX}t1` || s === `${PREFIX}t2`), [`${PREFIX}t2`, `${PREFIX}t1`]);
  let trashRefusal: ReturnType<typeof pgRefusal> = {};
  try {
    await db.insert(blogPosts).values({
      slug: `${PREFIX}g`, title: 't', description: 'd', categoryId: cat.id, authorId: author.id, heroAlt: 'a',
      body, bodyText: 'x', wordCount: 1, seoTitle: 't', seoDescription: 'd', ogTitle: 't', ogDescription: 'd',
      status: 'trash', trashedAt: null,
    });
  } catch (error) {
    trashRefusal = pgRefusal(error);
  }
  eq('db: status=trash without trashed_at is refused by the CHECK', trashRefusal, { code: '23514', constraint: 'blog_posts_trash_stamp' });
} finally {
  await sweep();
  await pool.end();
}
console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure + db)`);
process.exit(fails === 0 ? 0 : 1);
