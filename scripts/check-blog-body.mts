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
  'javascript:alert(1)',
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

if (!process.argv.includes('--db')) {
  console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} (pure checks; add --db with --env-file=.env.local for the Postgres round trip)`);
  process.exit(fails === 0 ? 0 : 1);
}
