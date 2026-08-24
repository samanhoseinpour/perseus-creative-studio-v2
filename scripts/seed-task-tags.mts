/**
 * Seed the task-tag vocabulary — the ~31 tags derived from what the studio's
 * own 128 tasks already encode in their TITLES ("TH", "Reels", "VT"/"HZ",
 * "Drone FPV", "(Eslahie)", "Keyword Research", "Blog", "audit") — plus each
 * tag's category scope, so /admin/tasks owns them from here on.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed-task-tags.mts
 *   or: npm run db:seed-task-tags
 *
 * Requires migration 0027 (task_tags / task_tag_categories / task_tag_links).
 *
 * Idempotent, on the seed-careers.mts contract:
 *  - Tags match by SLUG. Missing → inserted with its scope. Present → SKIPPED
 *    entirely and counted; after the first run /admin owns the row, so
 *    re-running never clobbers a rename, a regroup, a rescope or a reorder.
 *  - A scope row naming a category slug this DB doesn't have is skipped and
 *    reported, never invented — task categories are admin-owned too.
 *  - Nothing is ever deleted. Tags the seed doesn't know are listed as strays.
 *
 * `categories: []` means GLOBAL — offered under every category. That is how
 * the four workflow tags reach everywhere without seven scope rows each.
 *
 * Sort order is seeded in steps of 10 (the taskCategories convention) in the
 * order listed here, which is the order the picker renders within a group.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import { taskCategories, taskTagCategories, taskTags } from '@/db/schema';
import type { TaskTagGroup } from '@/lib/taskTagFields';

type SeedTag = {
  slug: string;
  name: string;
  group: TaskTagGroup;
  /** Task-category SLUGS this tag is offered under. [] = every category. */
  categories: string[];
};

// The live category slugs, for reference:
//   video-editing · videography · photography · photo-editting · seo
//   posting · story
const VIDEO = ['video-editing', 'videography'];
const PHOTO = ['photography', 'photo-editting'];
const SOCIAL = ['posting', 'story'];

const TAGS: SeedTag[] = [
  // ── Format — the shape of the output ────────────────────────────────────
  { slug: 'vertical', name: 'Vertical', group: 'format', categories: [...VIDEO, ...SOCIAL] },
  { slug: 'horizontal', name: 'Horizontal', group: 'format', categories: VIDEO },
  { slug: 'short-video', name: 'Short Video', group: 'format', categories: [...VIDEO, ...SOCIAL] },
  { slug: 'carousel', name: 'Carousel', group: 'format', categories: [...PHOTO, 'posting'] },
  { slug: 'photo-set', name: 'Photo Set', group: 'format', categories: PHOTO },

  // ── Content — what the thing is ─────────────────────────────────────────
  { slug: 'talking-head', name: 'Talking Head', group: 'content', categories: VIDEO },
  { slug: 'testimonial', name: 'Testimonial', group: 'content', categories: VIDEO },
  { slug: 'interview', name: 'Interview', group: 'content', categories: VIDEO },
  { slug: 'reels', name: 'Reels', group: 'content', categories: [...VIDEO, 'posting'] },
  { slug: 'b-roll', name: 'B-Roll', group: 'content', categories: VIDEO },
  { slug: 'drone-fpv', name: 'Drone / FPV', group: 'content', categories: [...VIDEO, ...PHOTO] },
  { slug: 'before-after', name: 'Before & After', group: 'content', categories: ['video-editing', 'photo-editting'] },
  { slug: 'event-coverage', name: 'Event Coverage', group: 'content', categories: ['videography', 'photography'] },
  { slug: 'on-screen-text', name: 'On-Screen Text', group: 'content', categories: ['video-editing'] },
  { slug: 'music-sound', name: 'Music / Sound', group: 'content', categories: ['video-editing'] },
  { slug: 'retouching', name: 'Retouching', group: 'content', categories: ['photo-editting'] },

  { slug: 'keyword-research', name: 'Keyword Research', group: 'content', categories: ['seo'] },
  { slug: 'keyword-mapping', name: 'Keyword Mapping', group: 'content', categories: ['seo'] },
  { slug: 'blog-post', name: 'Blog Post', group: 'content', categories: ['seo'] },
  { slug: 'content-brief', name: 'Content Brief', group: 'content', categories: ['seo'] },
  { slug: 'technical-audit', name: 'Technical Audit', group: 'content', categories: ['seo'] },
  { slug: 'competitor-analysis', name: 'Competitor Analysis', group: 'content', categories: ['seo'] },
  { slug: 'local-seo', name: 'Local SEO / GBP', group: 'content', categories: ['seo'] },
  { slug: 'backlinks', name: 'Backlinks', group: 'content', categories: ['seo'] },
  { slug: 'on-page', name: 'On-Page', group: 'content', categories: ['seo'] },
  { slug: 'content-calendar', name: 'Content Calendar', group: 'content', categories: ['seo', ...SOCIAL] },

  { slug: 'caption-copy', name: 'Caption / Copy', group: 'content', categories: [...SOCIAL, 'seo'] },
  { slug: 'scheduling', name: 'Scheduling', group: 'content', categories: SOCIAL },

  // ── Workflow — the state of the work. GLOBAL (no scope rows). ───────────
  // "Revision" is not a guess: "(Eslahie)" — Farsi for the correction round —
  // appears on roughly ten of the seventy-five Video Editing tasks.
  { slug: 'revision', name: 'Revision', group: 'workflow', categories: [] },
  { slug: 'reshoot', name: 'Reshoot', group: 'workflow', categories: [] },
  { slug: 'needs-assets', name: 'Needs Assets', group: 'workflow', categories: [] },
  { slug: 'client-feedback', name: 'Client Feedback', group: 'workflow', categories: [] },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing — run with --env-file=.env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

const categoryRows = await db
  .select({ id: taskCategories.id, slug: taskCategories.slug })
  .from(taskCategories);
const categoryIdBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

const existing = await db
  .select({ id: taskTags.id, slug: taskTags.slug })
  .from(taskTags);
const existingSlugs = new Set(existing.map((t) => t.slug));

const unknownCategorySlugs = new Set<string>();
let inserted = 0;
let skipped = 0;
let sort = 0;

for (const tag of TAGS) {
  sort += 10;
  if (existingSlugs.has(tag.slug)) {
    skipped += 1;
    continue;
  }

  const [row] = await db
    .insert(taskTags)
    .values({
      slug: tag.slug,
      name: tag.name,
      group: tag.group,
      sortIndex: sort,
    })
    .returning({ id: taskTags.id });

  const scope = tag.categories
    .map((slug) => {
      const id = categoryIdBySlug.get(slug);
      if (!id) unknownCategorySlugs.add(slug);
      return id;
    })
    .filter((id): id is string => Boolean(id));

  if (scope.length > 0) {
    await db
      .insert(taskTagCategories)
      .values(scope.map((categoryId) => ({ tagId: row.id, categoryId })))
      .onConflictDoNothing();
  }

  inserted += 1;
  console.log(
    `  + ${tag.name} [${tag.group}] → ${
      tag.categories.length === 0 ? 'every category' : tag.categories.join(', ')
    }`,
  );
}

// ── Strays — informational, never deleted ──────────────────────────────────
const seedSlugs = new Set(TAGS.map((t) => t.slug));
const strays = existing.filter((t) => !seedSlugs.has(t.slug));
if (strays.length) {
  console.log('\nTags in the DB but not in this seed (admin-added, or check for typos):');
  for (const s of strays) console.log(`  - ${s.slug}`);
}
if (unknownCategorySlugs.size) {
  console.log('\nScope entries skipped — no task category with that slug:');
  for (const s of unknownCategorySlugs) console.log(`  - ${s}`);
}

console.log(
  `\ndone: inserted ${inserted}, skipped ${skipped} (seed ${TAGS.length}, DB had ${existing.length})`,
);

await pool.end();
process.exit(0);
