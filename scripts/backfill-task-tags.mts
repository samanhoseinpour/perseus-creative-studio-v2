/**
 * One-off backfill: read the tags the studio already wrote into its TASK
 * TITLES and store them as real tags.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/backfill-task-tags.mts
 *       node --env-file=.env.local --import tsx scripts/backfill-task-tags.mts --apply
 *
 * DRY RUN BY DEFAULT — it prints every proposed title → tags line and writes
 * nothing until `--apply`. Review the output first: these are regexes over
 * free-typed titles, so a wrong match is a wrong label on real history.
 *
 * Why this exists: /admin/tasks shipped without tags, so for 128 tasks the
 * dimension lived in the title instead ("… TH", "… Reels", "Vela 21st Street
 * Vt", "Belcanto OP 1 (Eslahie)", "Conducted keyword research for Phantom").
 * Without a backfill the tag filter would return nothing for every task the
 * studio has ever logged, and the feature would read as broken on arrival.
 *
 * Safe to re-run: every insert rides the (task_id, tag_id) primary key with
 * onConflictDoNothing, so a second pass adds nothing. It only ever ADDS —
 * tags applied by hand are never removed, and a task that already carries the
 * tag a rule proposes is left alone.
 *
 * Scoping is deliberately ignored here. A rule fires on the TITLE, and the
 * tag it proposes is checked against the task's category by the CATEGORY
 * GUARD on each rule instead — which is stricter than the picker's scope and
 * keeps "Blog Post" off a video edit that happens to mention a blog.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';

import { taskCategories, taskTagLinks, taskTags, tasks } from '@/db/schema';

type Rule = {
  /** Tag slug to apply (must exist — seed-task-tags.mts runs first). */
  tag: string;
  /** Matched against the raw title. */
  test: RegExp;
  /** Task-category slugs the rule may fire under; [] = any. */
  categories: string[];
  /** Why, for the dry-run output. */
  note: string;
};

const VIDEO = ['video-editing', 'videography'];
const PHOTO = ['photography', 'photo-editting'];

const RULES: Rule[] = [
  // ── Video: the abbreviations the editors actually type ──────────────────
  // \bTH\b would also catch "The"; the titles use it as a trailing token or
  // in "… TH …", so the word boundary plus case-sensitivity is the guard.
  { tag: 'talking-head', test: /\bTH\b|talking[ -]?head/i, categories: VIDEO, note: '"TH" / "talking head"' },
  { tag: 'testimonial', test: /testimonial/i, categories: VIDEO, note: '"testimonial"' },
  { tag: 'interview', test: /interview/i, categories: VIDEO, note: '"interview"' },
  { tag: 'reels', test: /\breels?\b/i, categories: [...VIDEO, 'posting'], note: '"reel(s)"' },
  { tag: 'vertical', test: /\bvt\b|\bvertical\b/i, categories: VIDEO, note: '"VT" / "vertical"' },
  { tag: 'horizontal', test: /\bhz\b|\bhorizontal\b/i, categories: VIDEO, note: '"HZ" / "horizontal"' },
  { tag: 'drone-fpv', test: /\bdrone\b|\bfpv\b/i, categories: [...VIDEO, ...PHOTO], note: '"drone" / "FPV"' },
  { tag: 'before-after', test: /\bb\s*&\s*a\b|before\s*(&|and)\s*after/i, categories: ['video-editing', 'photo-editting'], note: '"B&A"' },
  { tag: 'on-screen-text', test: /with text/i, categories: ['video-editing'], note: '"with text"' },
  { tag: 'music-sound', test: /\bmusic\b|sound of/i, categories: ['video-editing'], note: '"music" / "sound of"' },
  { tag: 'carousel', test: /carousel|slider/i, categories: [...VIDEO, ...PHOTO, 'posting'], note: '"carousel" / "slider"' },
  { tag: 'event-coverage', test: /media day|recap|pro id|\bcamps?\b|\bvs\b/i, categories: [...VIDEO, ...PHOTO], note: 'match / event wording' },

  // ── Photo ───────────────────────────────────────────────────────────────
  { tag: 'photo-set', test: /^photos\b|\bphotos\b/i, categories: PHOTO, note: '"photos"' },

  // ── SEO: the phrases the SEO log is written in ──────────────────────────
  { tag: 'keyword-research', test: /keyword research/i, categories: ['seo'], note: '"keyword research"' },
  { tag: 'keyword-mapping', test: /keyword mapping|mapped keywords?/i, categories: ['seo'], note: '"keyword mapping"' },
  { tag: 'blog-post', test: /\bblog\b|\barticles?\b|published .*(post|content)/i, categories: ['seo'], note: '"blog" / "article"' },
  { tag: 'content-brief', test: /content brief/i, categories: ['seo'], note: '"content brief"' },
  { tag: 'technical-audit', test: /\baudit(ed|s)?\b/i, categories: ['seo'], note: '"audit"' },
  { tag: 'competitor-analysis', test: /competitor/i, categories: ['seo'], note: '"competitor"' },
  { tag: 'local-seo', test: /local falcon|\bgbp\b|google business|local[- ]intent/i, categories: ['seo'], note: 'local-SEO tooling' },
  { tag: 'content-calendar', test: /content calendar/i, categories: ['seo', 'posting', 'story'], note: '"content calendar"' },

  // ── Workflow: global, so no category guard ─────────────────────────────
  // "Eslahie" (اصلاحیه) is the correction round. It is on roughly ten of the
  // seventy-five video edits, always parenthesised.
  { tag: 'revision', test: /eslahie|\bv\d\b|revision/i, categories: [], note: '"(Eslahie)" / "v2" / "revision"' },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing — run with --env-file=.env.local');
  process.exit(1);
}
const apply = process.argv.includes('--apply');

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

const tagRows = await db
  .select({ id: taskTags.id, slug: taskTags.slug, name: taskTags.name })
  .from(taskTags);
const tagBySlug = new Map(tagRows.map((t) => [t.slug, t]));

const missing = RULES.map((r) => r.tag).filter((slug) => !tagBySlug.has(slug));
if (missing.length > 0) {
  console.error(
    `These tags don't exist — run \`npm run db:seed-task-tags\` first:\n  ${[...new Set(missing)].join('\n  ')}`,
  );
  await pool.end();
  process.exit(1);
}

const taskRows = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    categorySlug: taskCategories.slug,
  })
  .from(tasks)
  .innerJoin(taskCategories, eq(tasks.categoryId, taskCategories.id));

const existing = await db
  .select({ taskId: taskTagLinks.taskId, tagId: taskTagLinks.tagId })
  .from(taskTagLinks);
const already = new Set(existing.map((l) => `${l.taskId}:${l.tagId}`));

const pending: { taskId: string; tagId: string }[] = [];
const perTag = new Map<string, number>();
let touched = 0;
let untouched = 0;

for (const task of taskRows) {
  const hits = RULES.filter(
    (rule) =>
      (rule.categories.length === 0 ||
        rule.categories.includes(task.categorySlug)) &&
      rule.test.test(task.title),
  );
  const fresh = hits.filter(
    (rule) => !already.has(`${task.id}:${tagBySlug.get(rule.tag)!.id}`),
  );
  if (fresh.length === 0) {
    if (hits.length === 0) untouched += 1;
    continue;
  }
  touched += 1;
  console.log(
    `  ${task.title}\n      [${task.categorySlug}] → ${fresh
      .map((r) => tagBySlug.get(r.tag)!.name)
      .join(', ')}`,
  );
  for (const rule of fresh) {
    const tag = tagBySlug.get(rule.tag)!;
    pending.push({ taskId: task.id, tagId: tag.id });
    perTag.set(tag.name, (perTag.get(tag.name) ?? 0) + 1);
  }
}

console.log('\n— per tag —');
for (const [name, n] of [...perTag.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${name}`);
}
console.log(
  `\n${taskRows.length} tasks scanned · ${touched} would gain tags · ${untouched} matched no rule · ${pending.length} links`,
);

if (!apply) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
  await pool.end();
  process.exit(0);
}

if (pending.length > 0) {
  // Chunked: a single VALUES list of a few hundred rows is fine, but this
  // stays honest if the table ever grows past a one-shot statement.
  const CHUNK = 200;
  for (let i = 0; i < pending.length; i += CHUNK) {
    await db
      .insert(taskTagLinks)
      .values(pending.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }
}
console.log(`\napplied: ${pending.length} tag links written.`);

await pool.end();
process.exit(0);
