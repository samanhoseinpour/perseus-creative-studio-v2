/**
 * Seed the careers catalog: the 7 job categories and 18 openings that lived
 * as code in the retired src/constants/careers.ts, imported into the
 * `job_categories` / `job_openings` tables so /admin/careers owns them from
 * here on. Then backfill `contact_submissions.role_title` for every existing
 * application from the seeded slug → title map.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed-careers.mts
 *   or: npm run db:seed-careers
 *
 * Requires migration 0026 (job tables + role_title) to be applied first.
 *
 * The data is EMBEDDED here on purpose — the constants file it came from is
 * deleted once this ships, so the seed can never import it. Titles are the
 * old ones byte-for-byte except "Wordpress Developer", seeded with the brand
 * spelling "WordPress Developer" (the slug is unchanged, so bookmarked deep
 * links and stored applications keep resolving).
 *
 * Idempotent by design:
 *  - Categories match by slug. Missing → inserted. Present → fill-only:
 *    `name` and `icon` are never overwritten (an admin rename wins), and
 *    `sort_index` is set only while it is still the 0 default.
 *  - Openings match by slug. Missing → inserted. Present → SKIPPED entirely
 *    and counted — after the first run /admin owns the row, so re-running
 *    never clobbers a status flip, a pay edit, or a reorder.
 *  - The role_title backfill touches only `kind = 'career'` rows whose
 *    `role` is set and whose `role_title` is still null; a slug this seed
 *    doesn't know is left null and listed for review.
 *  - Rows in either table that this seed doesn't know about are never
 *    deleted — they are listed at the end as strays (admin-added listings are
 *    expected over time; a typo'd seed slug would also land there).
 *
 * Category order is the old JOBS order (sort_index 10…70); openings keep
 * their source order within each category (10, 20, …). Open listings still
 * sort first on the public page regardless.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { contactSubmissions, jobCategories, jobOpenings } from '@/db/schema';
import {
  GENERAL_APPLICATION,
  isJobCategoryIconKey,
  JOB_SLUG_RE,
  RESERVED_JOB_SLUGS,
  type JobCategoryIconKey,
  type JobEmploymentTypeField,
  type JobPayUnitField,
  type JobStatusField,
} from '@/lib/careerFields';

type SeedCategory = {
  slug: string;
  name: string;
  icon: JobCategoryIconKey;
};

type SeedOpening = {
  slug: string;
  title: string;
  /** A SeedCategory slug. */
  category: string;
  location: string;
  employmentType: JobEmploymentTypeField;
  level: string;
  /** The old `status` chip ("Flexible hours", "Immediate start", …). */
  cadence: string;
  fit: string;
  summary: string;
  tags: string[];
  status: JobStatusField;
  datePosted?: string;
  validThrough?: string;
  pay?: { min: number; max: number; unit: JobPayUnitField };
};

// Old JOBS order; icons from the retired Careers.tsx CATEGORY_ICONS map.
// prettier-ignore
const CATEGORIES: SeedCategory[] = [
  { slug: 'social-media', name: 'Social Media', icon: 'instagram' },
  { slug: 'performance-marketing', name: 'Performance Marketing', icon: 'chart' },
  { slug: 'design', name: 'Design', icon: 'layout' },
  { slug: 'strategy-and-operations', name: 'Strategy & Operations', icon: 'briefcase' },
  { slug: 'seo', name: 'SEO', icon: 'search' },
  { slug: 'video-production', name: 'Video Production', icon: 'video' },
  { slug: 'web-and-dev', name: 'Web / Dev', icon: 'code' },
];

// Source order within each category. `summary` + `tags` are the old
// JOB_DETAILS entries (keyed there by the old title); `cadence` is the old
// `status` string; 'open'/'filled' map from the old 'active'/'expired'.
// prettier-ignore
const OPENINGS: SeedOpening[] = [
  // ── Social Media ──────────────────────────────────────────────────────────
  { slug: 'social-media-manager', title: 'Social Media Manager', category: 'social-media', location: 'Remote', employmentType: 'full_time', level: 'Mid-level', cadence: 'Immediate start', fit: 'Content operators with strong planning and reporting instincts.', summary: 'Own the content calendar and publishing across key channels; report weekly performance.', tags: ['Content', 'Scheduling', 'Reporting'], status: 'filled' },
  { slug: 'social-content-creator', title: 'Social Content Creator', category: 'social-media', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Fast-moving creators who understand trends and short-form pacing.', summary: 'Create fast, high-volume short-form concepts; shoot/edit lo-fi content and iterate.', tags: ['Short-form', 'Creator', 'Trends'], status: 'filled' },
  { slug: 'social-media-strategist', title: 'Social Media Strategist', category: 'social-media', location: 'Remote', employmentType: 'subcontract', level: 'Senior', cadence: 'Contract-based', fit: 'Strategic thinkers who can connect creative direction to growth KPIs.', summary: 'Define channel strategy, creative angles, and measurement framework for growth.', tags: ['Strategy', 'Creative', 'KPIs'], status: 'filled' },
  // ── Performance Marketing ─────────────────────────────────────────────────
  { slug: 'performance-marketer', title: 'Performance Marketer', category: 'performance-marketing', location: 'Remote', employmentType: 'full_time', level: 'Mid-level', cadence: 'Immediate start', fit: 'Channel owners who are comfortable testing, iterating, and scaling.', summary: 'Run paid acquisition, test creatives, and optimize CAC/ROAS across channels.', tags: ['Paid Media', 'Testing', 'Optimization'], status: 'filled' },
  { slug: 'paid-social-specialist', title: 'Paid Social Specialist (Meta/TikTok)', category: 'performance-marketing', location: 'Remote', employmentType: 'subcontract', level: 'Senior', cadence: 'Contract-based', fit: 'Media buyers with a strong creative-testing mindset.', summary: 'Own Meta/TikTok campaigns: audiences, budgets, creative testing, and scaling.', tags: ['Meta', 'TikTok', 'ROAS'], status: 'filled' },
  { slug: 'google-ads-ppc-specialist', title: 'Google Ads / PPC Specialist', category: 'performance-marketing', location: 'Remote', employmentType: 'subcontract', level: 'Senior', cadence: 'Contract-based', fit: 'Search specialists who can own performance and intent-driven traffic.', summary: 'Manage Search/PMax/YouTube, keyword strategy, and landing page alignment.', tags: ['Google Ads', 'Search', 'PMax'], status: 'filled' },
  { slug: 'cro-specialist', title: 'CRO Specialist (Landing Pages + Testing)', category: 'performance-marketing', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Optimization-focused marketers who enjoy experiments and funnel analysis.', summary: 'Improve landing pages and funnels with testing, analysis, and conversion best practices.', tags: ['CRO', 'A/B Testing', 'Funnels'], status: 'filled' },
  // ── Design ────────────────────────────────────────────────────────────────
  { slug: 'web-designer', title: 'Web Designer', category: 'design', location: 'Remote', employmentType: 'full_time', level: 'Mid-level', cadence: 'Immediate start', fit: 'Designers who care about modern web aesthetics and conversion.', summary: 'Design responsive marketing sites and landing pages; hand off clean specs for build.', tags: ['Web', 'Landing Pages', 'Figma'], status: 'filled' },
  { slug: 'motion-designer', title: 'Motion Designer', category: 'design', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Animators who can turn static ideas into polished motion assets.', summary: 'Create motion systems and animated assets for ads, social, and brand storytelling.', tags: ['After Effects', 'Animation', 'Ads'], status: 'filled' },
  { slug: 'graphic-designer', title: 'Graphic Designer (Campaigns + Assets)', category: 'design', location: 'Remote', employmentType: 'subcontract', level: 'Mid-level', cadence: 'Contract-based', fit: 'Visual designers who thrive on campaign systems and multi-format assets.', summary: 'Design campaign assets and social kits across formats with consistent brand quality.', tags: ['Campaigns', 'Assets', 'Design'], status: 'filled' },
  // ── Strategy & Operations ─────────────────────────────────────────────────
  { slug: 'brand-strategist', title: 'Brand Strategist', category: 'strategy-and-operations', location: 'Remote', employmentType: 'subcontract', level: 'Senior', cadence: 'Contract-based', fit: 'Strategists who can define positioning, messaging, and creative direction.', summary: 'Shape brand positioning, messaging systems, audience insights, and campaign direction.', tags: ['Strategy', 'Positioning', 'Messaging'], status: 'filled' },
  { slug: 'creative-project-manager', title: 'Creative Project Manager', category: 'strategy-and-operations', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Organized operators who can keep creative projects moving without slowing teams down.', summary: 'Coordinate timelines, briefs, feedback cycles, and delivery across creative and marketing projects.', tags: ['Project Management', 'Briefs', 'Delivery'], status: 'filled' },
  { slug: 'account-manager', title: 'Account Manager', category: 'strategy-and-operations', location: 'Remote', employmentType: 'full_time', level: 'Mid-level', cadence: 'Immediate start', fit: 'Client-facing operators who can manage expectations, timelines, and deliverables clearly.', summary: 'Manage client communication, expectations, project updates, and ongoing account health.', tags: ['Client Success', 'Communication', 'Accounts'], status: 'filled' },
  // ── SEO ───────────────────────────────────────────────────────────────────
  { slug: 'seo-specialist', title: 'SEO Specialist', category: 'seo', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Operators who can combine technical thinking with practical growth work.', summary: 'Own on-page improvements, audits, and performance lift across core pages.', tags: ['On-page', 'Audits', 'GSC'], status: 'open', datePosted: '2026-08-11', validThrough: '2026-11-15', pay: { min: 30, max: 45, unit: 'HOUR' } },
  // ── Video Production ──────────────────────────────────────────────────────
  { slug: 'videographer', title: 'Videographer', category: 'video-production', location: 'Remote', employmentType: 'subcontract', level: 'Senior', cadence: 'Project-based', fit: 'Shoot-first creatives who know how to capture clean, brand-ready footage.', summary: 'Shoot brand and social content with strong composition, lighting, and pacing.', tags: ['Shooting', 'Lighting', 'Story'], status: 'open', datePosted: '2026-08-09', validThrough: '2026-11-15', pay: { min: 650, max: 900, unit: 'DAY' } },
  { slug: 'video-editor', title: 'Video Editor', category: 'video-production', location: 'Remote', employmentType: 'part_time', level: 'Mid-level', cadence: 'Flexible hours', fit: 'Editors who can work quickly without sacrificing pacing or polish.', summary: 'Edit performance-driven short/long-form; produce variants and iterate quickly.', tags: ['Editing', 'Short-form', 'Variants'], status: 'open', datePosted: '2026-08-09', validThrough: '2026-11-15', pay: { min: 28, max: 45, unit: 'HOUR' } },
  // ── Web / Dev ─────────────────────────────────────────────────────────────
  { slug: 'wordpress-developer', title: 'WordPress Developer', category: 'web-and-dev', location: 'Remote', employmentType: 'subcontract', level: 'Mid-level', cadence: 'Contract-based', fit: 'Developers who can ship stable, performant marketing sites.', summary: 'Build and maintain WordPress sites: themes, templates, performance, and integrations.', tags: ['WordPress', 'Themes', 'Performance'], status: 'open', datePosted: '2026-08-09', validThrough: '2026-11-15', pay: { min: 35, max: 60, unit: 'HOUR' } },
  { slug: 'frontend-developer-nextjs', title: 'Frontend Developer (Next.js)', category: 'web-and-dev', location: 'Remote', employmentType: 'full_time', level: 'Mid-level', cadence: 'Immediate start', fit: 'Frontend engineers who care about performance, motion, and clean implementation.', summary: 'Implement high-performance sites with clean components, animations, and integrations.', tags: ['Next.js', 'React', 'Performance'], status: 'filled' },
];

// Guard against author typos before touching the DB.
{
  const categorySlugs = new Set<string>();
  for (const c of CATEGORIES) {
    if (!JOB_SLUG_RE.test(c.slug)) throw new Error(`bad category slug: ${c.slug}`);
    if (categorySlugs.has(c.slug)) throw new Error(`duplicate category slug: ${c.slug}`);
    if (!isJobCategoryIconKey(c.icon)) throw new Error(`unknown icon on ${c.slug}: ${c.icon}`);
    categorySlugs.add(c.slug);
  }
  const openingSlugs = new Set<string>();
  for (const o of OPENINGS) {
    if (!JOB_SLUG_RE.test(o.slug)) throw new Error(`bad opening slug: ${o.slug}`);
    if (openingSlugs.has(o.slug)) throw new Error(`duplicate opening slug: ${o.slug}`);
    if ((RESERVED_JOB_SLUGS as readonly string[]).includes(o.slug)) {
      throw new Error(`reserved opening slug: ${o.slug}`);
    }
    if (!categorySlugs.has(o.category)) {
      throw new Error(`opening ${o.slug} names unknown category ${o.category}`);
    }
    // The careersSchema rule, restated: nothing opens without pay + a date.
    if (o.status === 'open' && (!o.pay || !o.datePosted)) {
      throw new Error(`open opening ${o.slug} is missing pay or datePosted`);
    }
    if (o.pay && o.pay.min > o.pay.max) throw new Error(`reversed pay on ${o.slug}`);
    openingSlugs.add(o.slug);
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, {
  schema: { contactSubmissions, jobCategories, jobOpenings },
});

const existingCategories = await db.select().from(jobCategories);
const existingOpenings = await db.select().from(jobOpenings);
const categoryBySlug = new Map(existingCategories.map((r) => [r.slug, r]));
const openingBySlug = new Map(existingOpenings.map((r) => [r.slug, r]));

let categoriesInserted = 0;
let categoriesFilled = 0;
let categoriesSkipped = 0;
let openingsInserted = 0;
let openingsSkipped = 0;
const processedCategorySlugs = new Set<string>();
const processedOpeningSlugs = new Set<string>();

await db.transaction(async (tx) => {
  // ── Categories ────────────────────────────────────────────────────────────
  const categoryIdBySlug = new Map<string, string>();
  for (const [i, seed] of CATEGORIES.entries()) {
    const sort = (i + 1) * 10;
    const row = categoryBySlug.get(seed.slug);
    processedCategorySlugs.add(seed.slug);

    if (!row) {
      const [created] = await tx
        .insert(jobCategories)
        .values({
          slug: seed.slug,
          name: seed.name,
          icon: seed.icon,
          sortIndex: sort,
        })
        .returning({ id: jobCategories.id });
      categoryIdBySlug.set(seed.slug, created.id);
      categoriesInserted++;
      console.log(`+ category inserted: ${seed.slug}`);
      continue;
    }

    categoryIdBySlug.set(seed.slug, row.id);
    // Fill-only: name and icon belong to /admin once the row exists; the
    // sort slot is filled only while it still sits at the 0 default.
    if (row.sortIndex === 0) {
      await tx
        .update(jobCategories)
        .set({ sortIndex: sort, updatedAt: new Date() })
        .where(eq(jobCategories.id, row.id));
      categoriesFilled++;
      console.log(`~ category sort filled: ${seed.slug} → ${sort}`);
    } else {
      categoriesSkipped++;
      console.log(`• category skip (exists): ${seed.slug}`);
    }
  }

  // ── Openings ──────────────────────────────────────────────────────────────
  const perCategoryIndex = new Map<string, number>();
  for (const seed of OPENINGS) {
    const next = (perCategoryIndex.get(seed.category) ?? 0) + 1;
    perCategoryIndex.set(seed.category, next);
    const sort = next * 10;
    processedOpeningSlugs.add(seed.slug);

    if (openingBySlug.has(seed.slug)) {
      // /admin owns the row after the first run — never touched again.
      openingsSkipped++;
      console.log(`• opening skip (exists): ${seed.slug}`);
      continue;
    }

    const categoryId = categoryIdBySlug.get(seed.category);
    if (!categoryId) throw new Error(`no category id for ${seed.category}`);

    await tx.insert(jobOpenings).values({
      slug: seed.slug,
      title: seed.title,
      categoryId,
      location: seed.location,
      employmentType: seed.employmentType,
      level: seed.level,
      cadence: seed.cadence,
      fit: seed.fit,
      summary: seed.summary,
      tags: seed.tags,
      status: seed.status,
      datePosted: seed.datePosted ?? null,
      validThrough: seed.validThrough ?? null,
      payMin: seed.pay?.min ?? null,
      payMax: seed.pay?.max ?? null,
      payUnit: seed.pay?.unit ?? null,
      sortIndex: sort,
    });
    openingsInserted++;
    console.log(`+ opening inserted: ${seed.slug} (${seed.status})`);
  }
});

// ── role_title backfill ───────────────────────────────────────────────────
// Applications that arrived before 0026 carry only the slug. The snapshot is
// what the applicant saw, so it is taken from the seed (the catalog at the
// time), plus the general-application sentinel that is never a row.
const titleBySlug = new Map<string, string>(
  OPENINGS.map((o) => [o.slug, o.title] as const),
);
titleBySlug.set(GENERAL_APPLICATION.slug, GENERAL_APPLICATION.title);

const pending = await db
  .select({ id: contactSubmissions.id, role: contactSubmissions.role })
  .from(contactSubmissions)
  .where(
    and(
      eq(contactSubmissions.kind, 'career'),
      isNotNull(contactSubmissions.role),
      isNull(contactSubmissions.roleTitle),
    ),
  );

let backfilled = 0;
const unknownRoles = new Map<string, number>();
await db.transaction(async (tx) => {
  for (const row of pending) {
    const title = row.role ? titleBySlug.get(row.role) : undefined;
    if (!title) {
      unknownRoles.set(row.role ?? '', (unknownRoles.get(row.role ?? '') ?? 0) + 1);
      continue;
    }
    await tx
      .update(contactSubmissions)
      .set({ roleTitle: title })
      .where(eq(contactSubmissions.id, row.id));
    backfilled++;
  }
});

// ── Strays — informational, never deleted ─────────────────────────────────
const categoriesNow = await db.select({ slug: jobCategories.slug }).from(jobCategories);
const openingsNow = await db.select({ slug: jobOpenings.slug }).from(jobOpenings);
const strayCategories = categoriesNow.filter((r) => !processedCategorySlugs.has(r.slug));
const strayOpenings = openingsNow.filter((r) => !processedOpeningSlugs.has(r.slug));
if (strayCategories.length) {
  console.log(`\nCategories in the DB but not in this seed (admin-added, or check for typos):`);
  for (const s of strayCategories) console.log(`  - ${s.slug}`);
}
if (strayOpenings.length) {
  console.log(`\nOpenings in the DB but not in this seed (admin-added, or check for typos):`);
  for (const s of strayOpenings) console.log(`  - ${s.slug}`);
}
if (unknownRoles.size) {
  console.log(`\nApplications left with a null role_title (slug unknown to this seed):`);
  for (const [slug, n] of unknownRoles) console.log(`  - ${slug || '(empty)'} × ${n}`);
}

console.log(
  `\ndone: categories inserted ${categoriesInserted}, sort-filled ${categoriesFilled}, skipped ${categoriesSkipped} ` +
    `(seed ${CATEGORIES.length}, DB had ${existingCategories.length}); ` +
    `openings inserted ${openingsInserted}, skipped ${openingsSkipped} ` +
    `(seed ${OPENINGS.length}, DB had ${existingOpenings.length}); ` +
    `role_title backfilled ${backfilled} of ${pending.length} pending`,
);

await pool.end();
process.exit(0);
