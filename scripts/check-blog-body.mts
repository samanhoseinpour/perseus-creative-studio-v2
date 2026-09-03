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
import {
  CUSTOM_NODE_NAMES,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
  blogSchema,
  validateBlogBody,
  type BlogDoc,
} from '@/lib/blogBody';
import { safeHref } from '@/lib/safeHref';
import { STATIC_IMAGE_PATH_RE, BLUR_DATA_URL_RE } from '@/lib/portfolioFields';
import { PUBLIC_BLOB_HOST, BLOG_MEDIA_PATHNAME_RE, publicBlobUrl } from '@/lib/publicBlobFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};
/* `has`/`lacks` are the substring assertions the mapper and renderer sections
   use. They live here beside `eq` so every section of this file shares one
   assertion vocabulary as it grows, rather than each growing its own. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const has = (label: string, hay: string, needle: string) =>
  eq(`${label} contains ${JSON.stringify(needle)}`, hay.includes(needle), true);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
okDoc('heading levels 2-4', doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] }));
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
  { type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'code' }] }, { type: 'hardBreak' }, { type: 'text', text: 'b' }] },
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

if (!process.argv.includes('--db')) {
  console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure checks; add --db with --env-file=.env.local for the Postgres round trip)`);
  process.exit(fails === 0 ? 0 : 1);
}

// The --db section lands with the store (Task 10); until then the flag has
// no assertions behind it and must still report the pure results honestly.
console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (no --db checks yet)`);
process.exit(fails === 0 ? 0 : 1);
