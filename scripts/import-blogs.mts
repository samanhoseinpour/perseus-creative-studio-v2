/**
 * One-off importer: the MDX corpus (src/content/blogs/** + the blogPosts /
 * BLOG_AUTHORS registry) → the blog_* tables. DRY-RUN BY DEFAULT.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/import-blogs.mts
 *       …plus --apply           to write
 *       …plus --only <slug>     one post
 *       …plus --report <file>   also write the markdown report to a file
 *
 * What it guarantees, per post, before any write: the mapper produced no
 * hard error; the doc validates against the closed vocabulary; headings,
 * TOC, videos, figures, how-tos, FAQs and body text equal what the legacy
 * regex extractors produce from the same MDX; the STUDIO_TZ day keys round
 * trip; the display label equals the hand-typed `date`; every image path
 * matches STATIC_IMAGE_PATH_RE; the post-level fields pass blogPostSchema.
 *
 * word_count is the LEGACY countWords(mdx) over the whole file (FAQ section
 * included) so every visible and JSON-LD figure is byte-identical after the
 * switch; wordCount(doc) is printed beside it as INFO, never asserted.
 *
 * Idempotent: upsert by slug; one `import` revision per run only when the
 * snapshot changed (canonical-JSON hash); a post with ANY non-import
 * revision (touched by the step-2 editor) is skipped, so a re-run can never
 * clobber an editor change. Related-post and entity links are written in a
 * second pass so a related slug imported later still resolves.
 *
 * After a production --apply, invalidate the store: the Data Cache persists
 * across deployments, so a redeploy alone never refreshes it:
 *     vercel cache invalidate --tag blogs
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import type { Parent, PhrasingContent, Root, RootContent } from 'mdast';

import { BLOG_AUTHORS, blogPosts as registry, type BlogPost as RegistryPost } from '@/constants/blogs';
import { BLOG_CATEGORY_META } from '@/constants/blogCategoryMeta';
import * as schema from '@/db/schema';
import {
  blogAuthors,
  blogCategories,
  blogEntities,
  blogPostEntities,
  blogPostRelated,
  blogPostRevisions,
  blogPosts,
  type BlogRevisionSnapshot,
} from '@/db/schema';
import { publicOrder, publicPostsWhere } from '@/db/blogPredicates';
import {
  bodyText,
  figures,
  headings,
  howTos,
  tocEntries,
  validateBlogBody,
  videos,
  wordCount as docWordCount,
  type BlogDoc,
} from '@/lib/blogBody';
import { RESERVED_BLOG_SLUGS, blogAuthorFieldsSchema, blogCategoryFieldsSchema, blogPostFieldsSchema } from '@/lib/blogPostSchema';
import { mdxToTiptap, parseMdx } from '@/lib/mdxToTiptap';
import { STUDIO_TZ, dayKeyIn, dayNoonIn, zonedFormat } from '@/lib/calendar';
import { STATIC_IMAGE_PATH_RE } from '@/lib/portfolioFields';
import {
  countWords,
  extractFaqs,
  extractHeadings,
  extractHowTos,
  extractImages,
  extractVideos,
  stripFaqSection,
} from '@/utils/extractHeadings';

const APPLY = process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
const reportIdx = process.argv.indexOf('--report');
const REPORT = reportIdx >= 0 ? process.argv[reportIdx + 1] : null;

const CATEGORY_ORDER = ['production', 'websites', 'digital-marketing', 'social', 'branding'] as const;
const DATE_LABEL = zonedFormat(STUDIO_TZ, { month: 'short', day: 'numeric', year: 'numeric' }, 'en-US');

// ── Report ──────────────────────────────────────────────────────────────────

const lines: string[] = [];
const totals = { FAIL: 0, WARN: 0, NOTE: 0, INFO: 0, PASS: 0 };
type Kind = keyof typeof totals;
function line(kind: Kind, text: string) {
  totals[kind]++;
  const out = `${kind.padEnd(4)}  ${text}`;
  lines.push(out);
  if (kind !== 'PASS') console.log(out);
}
const check = (label: string, ok: boolean, detail = '') => line(ok ? 'PASS' : 'FAIL', `${label}${ok || !detail ? '' : `  ${detail}`}`);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const collapseAll = (s: string) => s.replace(/\s+/g, ' ').trim();

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const r = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(r).sort().map((k) => [k, sortKeys(r[k])]));
  }
  return value;
}
/** jsonb reorders keys, so hashes must be over a canonical form. */
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');

// ── Parsing ─────────────────────────────────────────────────────────────────

/**
 * parseMdx THROWS a VFileMessage on malformed MDX (an unclosed tag, a stray
 * close tag, a bad expression) rather than collecting it. Every call goes
 * through here so the throw becomes THAT file's FAIL and the run moves on to
 * the next file: one bad file must never abort the whole report. The
 * position is read off `place` (a Point, or a Position with a `start`) and
 * falls back to the deprecated top-level `line`/`column`, whichever exists.
 */
type Thrown = { message?: unknown; reason?: unknown; line?: unknown; column?: unknown; place?: unknown };
function parseOrFail(source: string, fail: (text: string) => void): Root | null {
  try {
    return parseMdx(source);
  } catch (error) {
    const e = (error ?? {}) as Thrown;
    const place = e.place as { line?: number; column?: number; start?: { line?: number; column?: number } } | null | undefined;
    const point = place?.start ?? place;
    const at = `${point?.line ?? e.line ?? '?'}:${point?.column ?? e.column ?? '?'}`;
    const message = typeof e.reason === 'string' ? e.reason : typeof e.message === 'string' ? e.message : String(error);
    fail(`mdx parse: ${message} at ${at}`);
    return null;
  }
}

// ── Inventory ───────────────────────────────────────────────────────────────

type Inv = { types: Map<string, number>; jsx: Map<string, Set<string>>; lowercase: string[]; expressions: string[]; headingBreaks: string[] };

/** A hard break inside a heading: an mdast `break` (trailing backslash or
 *  two spaces) or an inline `<br />`. The mapper folds either to a space
 *  where the legacy text extractor yielded nothing, so the slug MAY differ
 *  from the anchor the live page carries today. Expected on this corpus:
 *  none; it is a WARN so a future post that grows one is named, never lost. */
function headingHasBreak(nodes: PhrasingContent[]): boolean {
  return nodes.some(
    (c) =>
      c.type === 'break' ||
      (c.type === 'mdxJsxTextElement' && c.name === 'br') ||
      ('children' in c && headingHasBreak((c as Parent).children as PhrasingContent[])),
  );
}

function inventory(tree: Root, file: string, inv: Inv) {
  const visit = (n: RootContent | Root) => {
    inv.types.set(n.type, (inv.types.get(n.type) ?? 0) + 1);
    if (n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') {
      const name = n.name ?? '(fragment)';
      const set = inv.jsx.get(name) ?? new Set<string>();
      for (const a of n.attributes) {
        if (a.type === 'mdxJsxAttribute') set.add(`${a.name}:${a.value === null || a.value === undefined ? 'bare' : typeof a.value === 'string' ? 'string' : 'expr'}`);
      }
      inv.jsx.set(name, set);
      if (/^[a-z]/.test(name)) inv.lowercase.push(`${file}:${n.position?.start.line ?? '?'} <${name}>`);
    }
    if (n.type === 'mdxFlowExpression' || n.type === 'mdxTextExpression') inv.expressions.push(`${file}:${n.position?.start.line ?? '?'} {${n.value}}`);
    if (n.type === 'heading' && headingHasBreak(n.children)) {
      const where = `${file}:${n.position?.start.line ?? '?'}`;
      inv.headingBreaks.push(where);
      line('WARN', `${where}: heading contains <br />: slug may differ from the legacy anchor`);
    }
    if ('children' in n) for (const c of (n as Parent).children) visit(c as RootContent);
  };
  visit(tree);
}

// ── The legacy prose reference for the body-text check ──────────────────────

/** Mirrors bodyText()'s rules over the MDAST (inline code excluded, JSX
 *  attribute prose lifted), so a lost or duplicated block shows as a diff. */
function mdastProse(tree: Root): string {
  const out: string[] = [];
  const inlineText = (nodes: PhrasingContent[]): string =>
    nodes
      .map((n): string => {
        switch (n.type) {
          case 'text':
            return n.value;
          case 'inlineCode':
            return '';
          case 'break':
            return ' ';
          case 'emphasis':
          case 'strong':
          case 'delete':
          case 'link':
          case 'linkReference':
            return inlineText(n.children);
          case 'mdxJsxTextElement':
            return n.name === 'br' ? ' ' : inlineText(n.children as PhrasingContent[]);
          default:
            return '';
        }
      })
      .join('');
  const attr = (n: { attributes: unknown[] }, name: string): string | undefined => {
    const a = (n.attributes as { type: string; name?: string; value?: unknown }[]).find((x) => x.type === 'mdxJsxAttribute' && x.name === name);
    return typeof a?.value === 'string' ? a.value : undefined;
  };
  const push = (s: string | undefined) => {
    if (s && collapseAll(s)) out.push(collapseAll(s));
  };
  const visit = (nodes: RootContent[]) => {
    for (const n of nodes) {
      switch (n.type) {
        case 'code':
          break;
        case 'paragraph':
        case 'heading':
          push(inlineText(n.children));
          break;
        case 'tableCell':
          push(inlineText(n.children));
          break;
        case 'mdxJsxFlowElement': {
          const name = n.name ?? '';
          if (name === 'Image') {
            push(attr(n, 'caption'));
            push(attr(n, 'credit'));
          } else if (name === 'HowTo' || name === 'ProsCons' || name === 'Step') {
            push(attr(n, 'title'));
            visit(n.children as RootContent[]);
          } else if (name === 'a' || name === 'aside' || name === 'Pros' || name === 'Cons') {
            visit(n.children as RootContent[]);
          }
          break;
        }
        default:
          if ('children' in n) visit((n as Parent).children as RootContent[]);
      }
    }
  };
  visit(tree.children);
  return out.join('\n');
}

// ── Per post ────────────────────────────────────────────────────────────────

type Prepared = {
  post: RegistryPost;
  doc: BlogDoc;
  snapshot: BlogRevisionSnapshot;
  fields: ReturnType<typeof blogPostFieldsSchema.parse>;
  publishedAt: Date;
  contentModifiedAt: Date | null;
  legacyWordCount: number;
  raw: string;
};

function prepare(post: RegistryPost, inv: Inv): Prepared | null {
  const file = join('src', 'content', 'blogs', post.category.slug, `${post.slug}.mdx`);
  const raw = readFileSync(file, 'utf8');
  let failed = false;
  const fail = (text: string) => {
    failed = true;
    line('FAIL', `${post.slug}: ${text}`);
  };
  if (raw.startsWith('---')) fail('frontmatter present');
  const whole = parseOrFail(raw, fail);
  if (!whole) return null;
  inventory(whole, file, inv);

  const mdxFaqs = extractFaqs(raw);
  const faqs = post.faqs?.length ? post.faqs : mdxFaqs;
  const bodyMdx = mdxFaqs.length ? stripFaqSection(raw) : raw;
  if (post.faqs?.length && mdxFaqs.length) {
    for (const f of post.faqs) {
      const m = mdxFaqs.find((x) => x.question === f.question);
      if (m && m.answer !== f.answer) line('WARN', `${post.slug}: curated FAQ answer differs from the MDX for ${JSON.stringify(f.question)}\n      curated: ${f.answer}\n      mdx:     ${m.answer}`);
    }
  }

  const tree = parseOrFail(bodyMdx, fail);
  if (!tree) return null;
  const mapped = mdxToTiptap(tree);
  for (const pr of mapped.problems) fail(`line ${pr.line ?? '?'}: ${pr.message}`);
  for (const n of mapped.notes) line(n.kind, `${post.slug}: line ${n.line ?? '?'}: ${n.message}`);
  const validated = validateBlogBody(mapped.doc);
  if (!validated.ok) for (const pr of validated.problems) fail(`validator: ${pr}`);
  if (failed || !validated.ok) return null;
  const doc = validated.doc;

  const reserved = [
    ...(post.keyTakeaways?.length ? ['key-takeaways'] : []),
    ...(post.externalSources?.length ? ['sources'] : []),
    ...(faqs.length > 0 ? ['faqs'] : []),
  ];
  const hs = headings(doc, reserved);
  const legacyHs = extractHeadings(bodyMdx, reserved);
  check(`${post.slug}: headings`, same(hs, legacyHs), `${JSON.stringify(hs.map((h) => h.id))} vs ${JSON.stringify(legacyHs.map((h) => h.id))}`);
  const toc = tocEntries(hs, { hasSources: Boolean(post.externalSources?.length), hasFaqs: faqs.length > 0 });
  const legacyToc = [...legacyHs];
  if (post.externalSources?.length) legacyToc.push({ level: 2, text: 'Sources', id: 'sources' });
  if (faqs.length > 0) legacyToc.push({ level: 2, text: 'FAQs', id: 'faqs' });
  check(`${post.slug}: toc`, same(toc, legacyToc));
  check(`${post.slug}: videos`, same(videos(doc), extractVideos(raw)), `${JSON.stringify(videos(doc))} vs ${JSON.stringify(extractVideos(raw))}`);
  check(`${post.slug}: figures`, same(figures(doc), extractImages(raw)), `${JSON.stringify(figures(doc))} vs ${JSON.stringify(extractImages(raw))}`);
  const norm = (h: ReturnType<typeof howTos>) => h.map((x) => ({ name: x.name, totalTime: x.totalTime, steps: x.steps.map((s) => ({ id: s.id, name: s.name, text: collapseAll(s.text) })) }));
  check(`${post.slug}: howTos`, same(norm(howTos(doc)), norm(extractHowTos(bodyMdx))));
  check(`${post.slug}: body text`, collapseAll(bodyText(doc)) === collapseAll(mdastProse(tree)), `\n      doc: ${collapseAll(bodyText(doc)).slice(0, 300)}\n      mdx: ${collapseAll(mdastProse(tree)).slice(0, 300)}`);

  const publishedAt = dayNoonIn(STUDIO_TZ, post.datetime);
  const contentModifiedAt = post.updatedAt ? dayNoonIn(STUDIO_TZ, post.updatedAt) : null;
  check(`${post.slug}: published day round-trips`, dayKeyIn(STUDIO_TZ, publishedAt) === post.datetime);
  check(`${post.slug}: modified day round-trips`, dayKeyIn(STUDIO_TZ, contentModifiedAt ?? publishedAt) === (post.updatedAt ?? post.datetime));
  check(`${post.slug}: date label`, DATE_LABEL.format(publishedAt) === post.date, `${DATE_LABEL.format(publishedAt)} vs ${post.date}`);
  const showsUpdated = contentModifiedAt !== null && dayKeyIn(STUDIO_TZ, contentModifiedAt) !== dayKeyIn(STUDIO_TZ, publishedAt);
  check(`${post.slug}: Updated line gate`, showsUpdated === (post.updatedAt !== undefined && post.updatedAt !== post.datetime));
  check(`${post.slug}: hero path`, STATIC_IMAGE_PATH_RE.test(post.imageUrl), post.imageUrl);
  for (const f of figures(doc)) check(`${post.slug}: figure path ${f.src}`, STATIC_IMAGE_PATH_RE.test(f.src));

  const legacyWordCount = countWords(raw);
  line('INFO', `${post.slug}: word_count stored ${legacyWordCount} (legacy countWords over the full MDX); wordCount(doc)+faqs would be ${docWordCount({ doc, faqs })}`);

  const author = BLOG_AUTHORS[post.authorSlug];
  const parsed = blogPostFieldsSchema.safeParse({
    slug: post.slug,
    title: post.title,
    description: post.description,
    categorySlug: post.category.slug,
    authorSlug: author.slug,
    serviceSlug: post.serviceSlug ?? null,
    heroStaticPath: post.imageUrl,
    heroAlt: post.imageAlt,
    heroCaption: null,
    keyTakeaways: post.keyTakeaways ?? [],
    faqs,
    sources: post.externalSources ?? [],
    entities: (post.entities ?? []).map((e) => ({ name: e.name, sameAs: e.sameAs, primary: Boolean(e.primary) })),
    relatedSlugs: post.relatedPosts ?? [],
    seoTitle: post.seo.title,
    seoDescription: post.seo.description,
    canonicalOverride: null,
    ogTitle: post.seo.ogTitle,
    ogDescription: post.seo.ogDescription,
    twitterCard: post.seo.twitterCard,
    robotsIndex: post.seo.robots.index,
    robotsFollow: post.seo.robots.follow,
    focusKeywords: post.seo.keywords,
    llmsInclude: true,
  });
  if (!parsed.success) {
    for (const i of parsed.error.issues) fail(`fields: ${i.path.join('.')}: ${i.message}`);
    return null;
  }
  check(`${post.slug}: canonical is self`, post.seo.canonicalPath === `https://www.perseustudio.com/blogs/${post.slug}`, post.seo.canonicalPath);
  const fields = parsed.data;
  const snapshot: BlogRevisionSnapshot = {
    slug: fields.slug,
    title: fields.title,
    description: fields.description,
    categorySlug: fields.categorySlug,
    authorSlug: fields.authorSlug,
    serviceSlug: fields.serviceSlug,
    hero: { staticPath: fields.heroStaticPath, media: null, alt: fields.heroAlt, caption: null },
    body: doc,
    bodyText: bodyText(doc),
    wordCount: legacyWordCount,
    keyTakeaways: fields.keyTakeaways,
    faqs: fields.faqs,
    sources: fields.sources,
    entities: fields.entities,
    relatedSlugs: fields.relatedSlugs,
    seo: {
      title: fields.seoTitle,
      description: fields.seoDescription,
      canonicalOverride: null,
      ogTitle: fields.ogTitle,
      ogDescription: fields.ogDescription,
      ogImage: null,
      twitterCard: fields.twitterCard,
      robotsIndex: fields.robotsIndex,
      robotsFollow: fields.robotsFollow,
      robotsExtra: null,
      focusKeywords: fields.focusKeywords,
      emitLegacyMetaKeywords: false,
    },
    customSchema: null,
    llmsInclude: true,
    publishedAt: publishedAt.toISOString(),
    contentModifiedAt: contentModifiedAt ? contentModifiedAt.toISOString() : null,
  };
  return { post, doc, snapshot, fields, publishedAt, contentModifiedAt, legacyWordCount, raw };
}

// ── Main ────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  const posts = ONLY ? registry.filter((p) => p.slug === ONLY) : registry;
  if (ONLY && posts.length === 0) throw new Error(`no registry post with slug ${ONLY}`);
  lines.push(`# Blog import report (${APPLY ? 'APPLY' : 'DRY RUN'}) ${new Date().toISOString()}`, '');

  // Categories: the five shared slugs, titles from the registry's own
  // category records, SEO copy from BLOG_CATEGORY_META (branding: null).
  const categoryTitles = new Map<string, string>();
  for (const p of registry) categoryTitles.set(p.category.slug, p.category.title);
  const categories = CATEGORY_ORDER.map((slug, i) =>
    blogCategoryFieldsSchema.parse({
      slug,
      title: categoryTitles.get(slug) ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      seoTitle: BLOG_CATEGORY_META[slug]?.title ?? null,
      seoDescription: BLOG_CATEGORY_META[slug]?.description ?? null,
      sortIndex: i,
    }),
  );
  for (const slug of new Set(registry.map((p) => p.category.slug))) {
    check(`category ${slug} has SEO copy`, Boolean(BLOG_CATEGORY_META[slug]));
  }

  const authors = Object.values(BLOG_AUTHORS).map((a, i) =>
    blogAuthorFieldsSchema.parse({
      slug: a.slug,
      name: a.name,
      kind: a.slug === 'perseus-creative-studio' ? 'organization' : 'person',
      role: a.role,
      bio: a.bio,
      imageStaticPath: a.imageUrl,
      ogImageStaticPath: a.ogImage ?? null,
      sameAs: a.sameAs,
      knowsAbout: a.knowsAbout ?? [],
      tags: a.tags ?? [],
      location: a.location ?? null,
      sortIndex: i,
    }),
  );
  check('authors: organization first', authors[0].slug === 'perseus-creative-studio');
  for (const a of authors) check(`author ${a.slug}: image path`, a.imageStaticPath === null || STATIC_IMAGE_PATH_RE.test(a.imageStaticPath));

  const inv: Inv = { types: new Map(), jsx: new Map(), lowercase: [], expressions: [], headingBreaks: [] };
  const prepared: Prepared[] = [];
  for (const post of posts) {
    const p = prepare(post, inv);
    if (p) prepared.push(p);
  }

  lines.push('', '## Inventory', '');
  for (const [t, n] of [...inv.types.entries()].sort()) lines.push(`- ${t}: ${n}`);
  for (const [name, kinds] of [...inv.jsx.entries()].sort()) lines.push(`- <${name}> attrs: ${[...kinds].sort().join(', ') || '(none)'}`);
  lines.push(`- lowercase JSX: ${inv.lowercase.length}`, ...inv.lowercase.map((l) => `  - ${l}`));
  lines.push(`- expressions: ${inv.expressions.length}`, ...inv.expressions.map((l) => `  - ${l}`));
  lines.push(`- headings containing <br />: ${inv.headingBreaks.length}`, ...inv.headingBreaks.map((l) => `  - ${l}`));
  for (const e of inv.expressions) line('FAIL', `expression in the corpus: ${e}`);

  if (APPLY && totals.FAIL === 0) {
    // Authors and categories.
    for (const c of categories) {
      await db
        .insert(blogCategories)
        .values(c)
        .onConflictDoUpdate({ target: blogCategories.slug, set: { title: c.title, seoTitle: c.seoTitle, seoDescription: c.seoDescription, sortIndex: c.sortIndex, updatedAt: sql`now()` } });
    }
    for (const a of authors) {
      await db
        .insert(blogAuthors)
        .values(a)
        .onConflictDoUpdate({ target: blogAuthors.slug, set: { ...a, updatedAt: sql`now()` } });
    }
    const categoryIds = new Map((await db.select({ slug: blogCategories.slug, id: blogCategories.id }).from(blogCategories)).map((r) => [r.slug, r.id]));
    const authorIds = new Map((await db.select({ slug: blogAuthors.slug, id: blogAuthors.id }).from(blogAuthors)).map((r) => [r.slug, r.id]));

    // Pass 1: posts + revisions.
    for (const item of prepared) {
      const { post, fields, snapshot, doc, publishedAt, contentModifiedAt, legacyWordCount } = item;
      const categoryId = categoryIds.get(fields.categorySlug)!;
      const authorId = authorIds.get(fields.authorSlug)!;
      await db.transaction(async (tx) => {
        const [existing] = await tx.select({ id: blogPosts.id, version: blogPosts.version }).from(blogPosts).where(eq(blogPosts.slug, fields.slug));
        let postId: string;
        let number = 1;
        let version = 1;
        if (existing) {
          const edited = await tx.select({ id: blogPostRevisions.id }).from(blogPostRevisions).where(and(eq(blogPostRevisions.postId, existing.id), ne(blogPostRevisions.reason, 'import'))).limit(1);
          if (edited.length > 0) {
            line('NOTE', `${post.slug}: skipped, it has a non-import revision (edited in the editor)`);
            return;
          }
          const [latest] = await tx.select({ number: blogPostRevisions.number, snapshot: blogPostRevisions.snapshot }).from(blogPostRevisions).where(eq(blogPostRevisions.postId, existing.id)).orderBy(desc(blogPostRevisions.number)).limit(1);
          if (latest && hashOf(latest.snapshot) === hashOf(snapshot)) {
            line('INFO', `${post.slug}: unchanged`);
            return;
          }
          postId = existing.id;
          number = (latest?.number ?? 0) + 1;
          version = existing.version + 1;
        }
        const working = {
          slug: fields.slug,
          legacyId: post.id,
          title: fields.title,
          description: fields.description,
          categoryId,
          authorId,
          serviceSlug: fields.serviceSlug,
          heroStaticPath: fields.heroStaticPath,
          heroMedia: null,
          heroAlt: fields.heroAlt,
          heroCaption: null,
          body: doc,
          bodyText: snapshot.bodyText,
          wordCount: legacyWordCount,
          keyTakeaways: fields.keyTakeaways,
          faqs: fields.faqs,
          sources: fields.sources,
          seoTitle: fields.seoTitle,
          seoDescription: fields.seoDescription,
          canonicalOverride: null,
          ogTitle: fields.ogTitle,
          ogDescription: fields.ogDescription,
          twitterCard: fields.twitterCard,
          robotsIndex: fields.robotsIndex,
          robotsFollow: fields.robotsFollow,
          focusKeywords: fields.focusKeywords,
          llmsInclude: true,
          status: 'published' as const,
          publishedAt,
          contentModifiedAt,
          version,
          updatedAt: sql`now()`,
        };
        if (existing) {
          await tx.update(blogPosts).set(working).where(eq(blogPosts.id, existing.id));
          postId = existing.id;
        } else {
          const [inserted] = await tx.insert(blogPosts).values(working).returning({ id: blogPosts.id });
          postId = inserted.id;
        }
        const [rev] = await tx
          .insert(blogPostRevisions)
          .values({
            postId,
            number,
            reason: 'import',
            slug: fields.slug,
            title: fields.title,
            categoryId,
            authorId,
            publishedAt,
            contentModifiedAt,
            robotsIndex: fields.robotsIndex,
            llmsInclude: true,
            wordCount: legacyWordCount,
            snapshot,
            actorId: null,
            actorName: 'import-blogs',
          })
          .returning({ id: blogPostRevisions.id });
        await tx.update(blogPosts).set({ publishedRevisionId: rev.id }).where(eq(blogPosts.id, postId));
        line('INFO', `${post.slug}: ${existing ? 'updated' : 'inserted'} (revision ${number})`);
      });
    }

    // Pass 2: related links and entities, now that every post row exists.
    const postIds = new Map((await db.select({ slug: blogPosts.slug, id: blogPosts.id }).from(blogPosts)).map((r) => [r.slug, r.id]));
    for (const { post, fields } of prepared) {
      const postId = postIds.get(fields.slug)!;
      await db.delete(blogPostRelated).where(eq(blogPostRelated.postId, postId));
      let position = 0;
      for (const slug of fields.relatedSlugs) {
        const relatedId = postIds.get(slug);
        if (!relatedId) {
          line('WARN', `${post.slug}: related slug ${slug} is not a post; link skipped (the snapshot still carries it)`);
          continue;
        }
        await db.insert(blogPostRelated).values({ postId, relatedPostId: relatedId, position: position++ }).onConflictDoNothing();
      }
      await db.delete(blogPostEntities).where(eq(blogPostEntities.postId, postId));
      let ePos = 0;
      for (const e of fields.entities) {
        const [ent] = await db
          .insert(blogEntities)
          .values({ name: e.name, sameAs: e.sameAs })
          .onConflictDoUpdate({ target: blogEntities.name, set: { sameAs: e.sameAs } })
          .returning({ id: blogEntities.id });
        await db.insert(blogPostEntities).values({ postId, entityId: ent.id, isPrimary: e.primary, position: ePos++ }).onConflictDoNothing();
      }
    }

    // Read-back: the stored figures against the source (a DB round-trip
    // check; it cannot fail on a derivation, only on a write bug).
    for (const { post, raw } of prepared) {
      const [row] = await db
        .select({ working: blogPosts.wordCount, revision: blogPostRevisions.wordCount })
        .from(blogPosts)
        .innerJoin(blogPostRevisions, eq(blogPostRevisions.id, blogPosts.publishedRevisionId))
        .where(eq(blogPosts.slug, post.slug));
      check(`${post.slug}: word_count read back (round trip)`, row?.working === countWords(raw) && row?.revision === countWords(raw));
    }

    // Whole-run: the public order equals the legacy order.
    const ordered = (await db.select({ slug: blogPosts.slug }).from(blogPosts).where(publicPostsWhere()).orderBy(...publicOrder())).map((r) => r.slug);
    const legacy = [...registry]
      .sort((a, b) => {
        const bt = Date.parse(b.datetime);
        const at = Date.parse(a.datetime);
        if (bt !== at) return bt - at;
        return b.id - a.id;
      })
      .map((p) => p.slug);
    check('whole run: publicOrder equals the legacy sorted order', same(ordered.filter((s) => legacy.includes(s)), legacy));
  } else if (APPLY) {
    line('NOTE', 'apply skipped: the report has failures');
  }

  // Whole-run, both modes: every /blogs/<slug> redirect destination is a post,
  // or one of the reserved static routes that shadow [blog] (/blogs/authors is
  // the target of the /authors redirect and can never be a post).
  const config = readFileSync('next.config.ts', 'utf8');
  for (const m of config.matchAll(/destination:\s*'\/blogs\/([a-z0-9-]+)'/g)) {
    const reserved = (RESERVED_BLOG_SLUGS as readonly string[]).includes(m[1]);
    check(`redirect destination /blogs/${m[1]} is a post${reserved ? ' or a reserved route' : ''}`, reserved || registry.some((p) => p.slug === m[1]));
  }

  lines.push('', `## Totals: ${prepared.length}/${posts.length} posts prepared, ${totals.FAIL} FAIL, ${totals.WARN} WARN, ${totals.NOTE} NOTE`);
  if (APPLY) lines.push('', 'Now invalidate the store (the Data Cache persists across deployments):', '', '    vercel cache invalidate --tag blogs');
  const report = lines.join('\n');
  if (REPORT) writeFileSync(REPORT, report);
  console.log(`\n${totals.FAIL === 0 ? 'ALL PASS' : `${totals.FAIL} FAILURE(S)`}: ${prepared.length}/${posts.length} posts, ${totals.WARN} WARN, ${totals.NOTE} NOTE${REPORT ? `, report at ${REPORT}` : ''}`);
  process.exitCode = totals.FAIL === 0 ? 0 : 1;
}

try {
  await main();
} finally {
  await pool.end();
}
