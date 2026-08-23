/**
 * Drizzle schema for the app's tables: unified contact-form submissions,
 * internal tickets, blog-article feedback, the portfolio registry
 * (clients / projects / project media), task tracking (task categories /
 * tasks feeding the per-client monthly reports), and payroll (members /
 * standing terms / monthly runs and payments) managed from /admin.
 *
 * NOTE: no `import 'server-only'` here — drizzle-kit loads this file outside a
 * react-server context and the guard would throw. The runtime client in
 * ./index.ts carries the guard instead; app code must import `db` from there,
 * never query through this module directly.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth-schema';

export const contactKind = pgEnum('contact_kind', ['project', 'career']);

// `status` exists for the future /admin inbox (mark read / archive). Inserts
// land as 'new' — except submissions that trip a bot trap (honeypot /
// too-fast fill), which are stored as 'spam' instead of silently dropped, so
// a false positive (e.g. browser autofill quirks) is recoverable from /admin.
export const contactStatus = pgEnum('contact_status', [
  'new',
  'read',
  'archived',
  'spam',
]);

export const contactSubmissions = pgTable(
  'contact_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Client-generated idempotency key (one per fill session). The unique
    // constraint is what makes the offline outbox's at-least-once replay safe:
    // a duplicate replay hits onConflictDoNothing instead of a second row.
    clientId: text('client_id').notNull().unique(),
    kind: contactKind('kind').notNull(),
    status: contactStatus('status').notNull().default('new'),

    // Shared fields (both tabs)
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    country: text('country'),
    // "How did you hear about us?" — optional attribution slug (see
    // REFERRAL_OPTIONS in src/lib/referralOptions.ts); nullable, both kinds.
    referralSource: text('referral_source'),

    // Project inquiry fields
    company: text('company'),
    instagram: text('instagram'),
    website: text('website'),
    services: jsonb('services').$type<string[]>(),
    message: text('message'),

    // Job application fields. `role` stores the opening's stable slug (the
    // `job_openings.slug` below, or the GENERAL_APPLICATION sentinel in
    // src/lib/careerFields.ts), mirroring how `services` stores slugs. There
    // is deliberately NO foreign key: an application must outlive the posting
    // it answered — roles get deleted from /admin/careers, and a queued
    // offline replay may carry a slug that was delisted in between.
    role: text('role'),
    // The role's title as it read when the application arrived (the
    // deletion-policy snapshot beside every nullable reference in this
    // schema). Null for pre-0026 rows until the seed backfills it, and for
    // a slug the catalog didn't know — the inbox falls back to the slug.
    roleTitle: text('role_title'),
    portfolioUrl: text('portfolio_url'),
    linkedinUrl: text('linkedin_url'),
    // Vercel Blob pathname (private access — no public URL). The notification
    // email carries the PDF as an attachment; /admin will stream it via
    // get(pathname, { access: 'private' }).
    resumePath: text('resume_path'),

    // False when the Resend notification failed after the row was stored — the
    // lead is captured either way; /admin will surface unsent rows later.
    emailSent: boolean('email_sent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Every read in src/db/adminQueries.ts is keyed on `kind` first (the inbox is
  // split into two views), so every index here leads with it. Without these the
  // whole table is sequentially scanned on every /admin page load — Postgres
  // does not index a column just because it's filtered on.
  (t) => [
    // The inbox list itself: submissionsWhere() is always `kind = ? AND status
    // IN (...)`, and listSubmissions both counts and sorts on created_at. One
    // index serves the filter, the count and the ORDER BY as a range scan.
    // Also covers getStatusCounts (GROUP BY kind, status).
    index('contact_submissions_kind_status_created_idx').on(
      t.kind,
      t.status,
      t.createdAt.desc(),
    ),
    // getRecentSubmissions is `kind IN (...) AND status <> 'spam'` ORDER BY
    // created_at DESC LIMIT 6 — the `<>` can't use the status column above as a
    // prefix, so give it an ordered (kind, created_at) path to walk and stop.
    index('contact_submissions_kind_created_idx').on(t.kind, t.createdAt.desc()),
    // The two filter dropdowns: an equality filter plus a SELECT DISTINCT over
    // the same column in getInboxFilterOptions.
    index('contact_submissions_kind_role_idx').on(t.kind, t.role),
    index('contact_submissions_kind_source_idx').on(t.kind, t.referralSource),
    // The service facet filters with jsonb containment (`services @> '[...]'`),
    // which is precisely what GIN indexes.
    index('contact_submissions_services_idx').using('gin', t.services),
  ],
);

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;

// Internal bug/issue tickets raised from the admin panel (GitHub-issues style).
// Any admin holding the tickets area grant can create one; only superadmins
// (user.role, gated via src/lib/adminAccess.ts) see all tickets and change
// status.
export const ticketStatus = pgEnum('ticket_status', [
  'open',
  'pending',
  'closed',
]);

export const ticketSeverity = pgEnum('ticket_severity', ['low', 'medium', 'high']);

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // FK for "own tickets" queries, plus name/email snapshots so the report
    // keeps its attribution if the account is ever deleted by the future
    // user-management phase (set null, not cascade — the bug still exists).
    reporterId: text('reporter_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reporterName: text('reporter_name').notNull(),
    reporterEmail: text('reporter_email').notNull(),

    title: text('title').notNull(),
    description: text('description').notNull(),
    severity: ticketSeverity('severity').notNull(),
    // Admin-panel area slug (see TICKET_AREA_SLUGS in src/lib/ticketFields.ts) —
    // plain text like referral_source, so adding an area needs no migration.
    area: text('area').notNull(),
    status: ticketStatus('status').notNull().default('open'),

    // Vercel Blob pathname (private access — no public URL); streamed to
    // authorized viewers via /admin/tickets/[id]/screenshot.
    screenshotPath: text('screenshot_path'),

    // False when the Resend notification failed after the row was stored.
    emailSent: boolean('email_sent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set explicitly by setTicketStatus — tracks the last triage touch.
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The two list views in src/db/ticketQueries.ts, each an equality filter
    // plus ORDER BY created_at DESC: listTickets (superadmin, by status) and
    // listOwnTickets (member, by reporter). The status index also serves
    // getTicketStatusCounts' GROUP BY, which runs on every protected admin page.
    index('tickets_status_created_idx').on(t.status, t.createdAt.desc()),
    index('tickets_reporter_created_idx').on(t.reporterId, t.createdAt.desc()),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

// Reader feedback on blog posts ("Was this article helpful?"). Write-only for
// readers — /admin/feedback aggregates per slug. Privacy: no PII, no IP, no
// user agent; client_id is a random per-browser token (localStorage). The
// unique (client_id, slug) pair makes the vote an idempotent upsert, so a
// retry is a no-op and switching up↔down updates in place instead of stuffing
// rows. `slug` has no FK — posts are code-defined in src/constants/blogs.ts;
// the server action validates against that registry.
export const feedbackVote = pgEnum('feedback_vote', ['up', 'down']);

export const articleFeedback = pgTable(
  'article_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id').notNull(),
    slug: text('slug').notNull(),
    vote: feedbackVote('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Bumped when a vote is switched — created_at keeps the first-vote time.
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('article_feedback_client_slug').on(t.clientId, t.slug),
    // getFeedbackStats groups by (slug, vote). The unique above leads with
    // client_id, so it can't serve a slug-leading grouping.
    index('article_feedback_slug_vote_idx').on(t.slug, t.vote),
  ],
);

export type ArticleFeedback = typeof articleFeedback.$inferSelect;
export type NewArticleFeedback = typeof articleFeedback.$inferInsert;

// ───────────────────────────────────────────────────────────────────────────
// Portfolio: clients & projects, managed from /admin (the 'clients' and
// 'projects' areas).
// Replaces the code-defined summaries that lived in src/constants/projects.ts;
// the category-page chrome (hero copy / FAQs / CTA / SEO) stays code-defined
// there — only the per-project and per-client content is data.
// ───────────────────────────────────────────────────────────────────────────

// Matches the five code-defined category slugs (PROJECT_CATEGORIES keys, which
// themselves mirror the services registry). A pgEnum, not free text: the slug
// is a URL segment and a route key, so a typo'd category would 404 its project.
// Adding a category requires code (chrome, route params) anyway, so the
// migration this enum forces is not extra friction.
export const projectCategory = pgEnum('project_category', [
  'production',
  'websites',
  'digital-marketing',
  'social',
  'branding',
]);

// Projects only (clients dropped their visibility column when the public
// /clients profile pages were retired). 'public' = listed + indexed
// everywhere; 'unlisted' = reachable by link, noindex, excluded from sitemap
// and every listing; 'draft' = not rendered at all (404 on direct hit).
export const contentVisibility = pgEnum('content_visibility', [
  'public',
  'unlisted',
  'draft',
]);

// Coin face behind a transparent *wordmark* logo in the Partners marquee:
// 'light' rescues dark ink in dark mode, 'dark' rescues white ink in light
// mode. Null (the norm) = faceless coin — opaque logos don't need a face and
// adding one bleeds a faint ring at the clipped edge.
export const clientLogoDisc = pgEnum('client_logo_disc', ['light', 'dark']);

export const projectMediaKind = pgEnum('project_media_kind', [
  'cover',
  'image',
  'youtube',
  'instagram',
]);

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Stable client identifier — globally unique.
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  industry: text('industry'),
  location: text('location'),
  websiteUrl: text('website_url'),
  instagram: text('instagram'),
  // Plain paragraphs (blank-line separated) — no MDX/markup.
  bio: text('bio'),
  // Logo slot: exactly one of the two sources. Seeded rows keep their static
  // /images/shared/client-logos/*.avif path; admin uploads store the public
  // Blob CDN URL plus its pathname (needed for del() when replaced/removed).
  logoStaticPath: text('logo_static_path'),
  logoBlobUrl: text('logo_blob_url'),
  logoBlobPath: text('logo_blob_path'),
  // Partners marquee membership doubles as its ordering: null = not on the
  // logo wall, ascending values order the rail (seeded in steps of 10 so an
  // admin can slot a client between two others without renumbering).
  marqueeSort: integer('marquee_sort'),
  // Also on the home page's curated "Selected Clients" rail (the About wall
  // shows every marquee member).
  marqueeFeatured: boolean('marquee_featured').notNull().default(false),
  logoDisc: clientLogoDisc('logo_disc'),
  // Monthly retainer target in minutes (null = no retainer). Internal-only —
  // read by /admin/reports for the delivered-vs-agreed progress bar; no public
  // reader ever selects it.
  retainerMinutes: integer('retainer_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
// No secondary indexes: a dozens-of-rows roster read whole (public snapshot,
// marquee) or by unique slug — nothing here scans.

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

// ── Careers (job openings managed from /admin/careers) ──────────────────────
// The public /contact/careers listings, the contact form's "Join the team"
// role select, and the JobPosting JSON-LD all read these two tables through
// the cached accessors in src/lib/careersStore.ts. Vocabulary (labels, icon
// keys, schema.org maps) lives in the client-safe leaf src/lib/careerFields.ts.

/**
 * Publication state of one listing. 'open' = accepting applications (the
 * "Available" card, the contact form option, a JobPosting node). 'filled' =
 * still shown, marked "Position filled" — listings are kept visible so
 * visitors can see how the team is built. 'draft' = only visible in /admin.
 * A pgEnum because the value gates what the public site renders.
 */
export const jobStatus = pgEnum('job_status', ['draft', 'open', 'filled']);

/** Engagement shape — mapped to schema.org employmentType in careerFields. */
export const jobEmploymentType = pgEnum('job_employment_type', [
  'full_time',
  'part_time',
  'subcontract',
]);

/** The unit the advertised pay range is quoted in (schema.org unitText). */
export const jobPayUnit = pgEnum('job_pay_unit', ['HOUR', 'DAY', 'YEAR']);

export const jobCategories = pgTable('job_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  // IMMUTABLE after creation: the careers page's filter value and the seed's
  // match key. Renames change `name` only.
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  // Key into JOB_CATEGORY_ICONS (src/lib/jobCategoryIcons.ts) — a fixed
  // vocabulary, not an upload. An unknown key falls back to the briefcase.
  icon: text('icon').notNull(),
  // Ascending page order; seeded in steps of 10 so an admin can slot a new
  // discipline between two others without renumbering.
  sortIndex: integer('sort_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type JobCategory = typeof jobCategories.$inferSelect;
export type NewJobCategory = typeof jobCategories.$inferInsert;

export const jobOpenings = pgTable(
  'job_openings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // IMMUTABLE after creation: it is the `/contact?tab=careers&role=<slug>`
    // deep-link payload and the value stored on contact_submissions.role, so
    // renaming a title must never change it (bookmarked links and old
    // applications keep resolving).
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    // RESTRICT, never cascade: deleting a category with listings under it is
    // refused in the action (with the count) and here as the race backstop.
    categoryId: uuid('category_id')
      .notNull()
      .references(() => jobCategories.id, { onDelete: 'restrict' }),
    // Free text; "Remote" (the default) is what makes the JobPosting
    // TELECOMMUTE — anything else emits a jobLocation Place in BC, Canada.
    location: text('location').notNull().default('Remote'),
    employmentType: jobEmploymentType('employment_type').notNull(),
    // Free text chips ("Mid-level", "Senior" / "Flexible hours",
    // "Immediate start") — descriptive, never filtered on.
    level: text('level').notNull(),
    cadence: text('cadence').notNull(),
    // "Best for:" line and the one-line card summary (also the JobPosting
    // description), plus up to a handful of tag chips.
    fit: text('fit').notNull(),
    summary: text('summary').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    status: jobStatus('status').notNull().default('draft'),
    // Calendar KEYS (YYYY-MM-DD), not instants: the day the role opened for
    // applications (required by Google's JobPosting once 'open') and the day
    // the posting stops being valid (the careers page drops the JSON-LD node
    // once it passes — a stale-open posting is a Google policy violation).
    datePosted: date('date_posted', { mode: 'string' }),
    validThrough: date('valid_through', { mode: 'string' }),
    // Advertised pay range in WHOLE CAD DOLLARS. This is public display copy
    // and a JSON-LD baseSalary, never ledger money: it is never summed,
    // converted, or prorated, so payroll's minor-units rule and its
    // payrollAmounts.ts door do not apply. careerFields.formatPay is its one
    // formatter. Required (all three) once status = 'open' — BC's Pay
    // Transparency Act — enforced by careersSchema, not by the column.
    payMin: integer('pay_min'),
    payMax: integer('pay_max'),
    payUnit: jobPayUnit('pay_unit'),
    // Order within its category (open listings still sort first on the page).
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The public snapshot (`status <> 'draft'`, grouped by category, ordered)
    // and the admin roster both walk this.
    index('job_openings_status_category_sort_idx').on(
      t.status,
      t.categoryId,
      t.sortIndex,
    ),
  ],
);

export type JobOpening = typeof jobOpenings.$inferSelect;
export type NewJobOpening = typeof jobOpenings.$inferInsert;

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: projectCategory('category').notNull(),
    slug: text('slug').notNull(),
    // Nullable: anonymous engagements ("Private Residence") have no client
    // entity. `clientName` doubles as the card's display override where the
    // slate text differs from the canonical client name ('Vela' vs 'Vela
    // Homes') — render `clientName ?? clients.name` so the seed keeps every
    // existing card byte-identical. `restrict` (not cascade/set null): a
    // client with published work must be untangled deliberately in /admin.
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'restrict',
    }),
    clientName: text('client_name'),
    title: text('title').notNull(),
    industry: text('industry').notNull(),
    location: text('location'),
    // Display string ("2024" / "2023–2024"). latestYear() extracts the newest
    // 4-digit year for ordering, so admin validation enforces that shape.
    year: text('year').notNull(),
    summary: text('summary').notNull(),
    // Case-study copy for the detail page: plain paragraphs, no MDX. A project
    // with neither description nor media has no detail page yet (cards keep
    // linking to the category showcase until content lands).
    description: text('description'),
    // Service tag chips ("Videography", "Aerial") — controlled vocabulary; the
    // service filter rails, icon lookups, and getServiceProjects matching all
    // key on exact strings.
    services: jsonb('services').$type<string[]>().notNull().default([]),
    // Live-site link for web work; rendered as a CTA on the detail page.
    externalUrl: text('external_url'),
    testimonialQuote: text('testimonial_quote'),
    testimonialName: text('testimonial_name'),
    testimonialRole: text('testimonial_role'),
    // Outcome highlights for the detail page's "By the numbers" opener —
    // value is a free display string ("+48%", "3.1M", "6 weeks"), footnote an
    // optional Apple-style qualifier. Null (not []) means "no highlights
    // section"; the admin form caps the list at PROJECT_STATS_MAX.
    stats: jsonb('stats').$type<ProjectStat[]>(),
    // Cover slot, static half: seeded /images/projects/*.avif paths that ride
    // the pre-generated variant ladder. An uploaded replacement lives as the
    // kind='cover' project_media row, which wins over this when present.
    coverStaticPath: text('cover_static_path'),
    coverStaticAlt: text('cover_static_alt'),
    featured: boolean('featured').notNull().default(false),
    visibility: contentVisibility('visibility').notNull().default('draft'),
    // Registry-order tiebreaker within a year: listing order is
    // (latestYear desc, sortIndex asc), reproducing the old constants-file
    // ordering exactly. New rows get max+1 within their category.
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // (category, slug) is the /projects/[category]/[project] route key. Not
    // slug alone: three cross-category slug collisions exist in the seeded
    // data (match-tour-11, kasraz-rugs, phantom-pest-control).
    unique('projects_category_slug').on(t.category, t.slug),
    // The public snapshot read: visibility = 'public' ordered within category.
    index('projects_visibility_category_sort_idx').on(
      t.visibility,
      t.category,
      t.sortIndex,
    ),
    // Client profile pages list a client's work.
    index('projects_client_idx').on(t.clientId),
    // The category index's service facet filters with jsonb containment.
    index('projects_services_idx').using('gin', t.services),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

/** One outcome highlight on a case study (projects.stats jsonb). */
export type ProjectStat = {
  label: string;
  value: string;
  footnote?: string;
};

/**
 * Responsive rendition set for one uploaded image, generated in the browser at
 * upload time (see reduceProjectImage in src/lib/reduceScreenshot.ts) —
 * mirroring the static pipeline's -384/-640/-960 ladder so uploads get the
 * same srcset treatment with zero runtime transcode. `full` is the ≤1600px
 * master; rungs at or above the source width are omitted (never enlarged).
 * URLs are public Blob CDN URLs; pathnames are kept for del().
 */
export type ProjectMediaVariants = {
  full: { url: string; pathname: string; width: number; height: number };
  w960?: { url: string; pathname: string };
  w640?: { url: string; pathname: string };
  w384?: { url: string; pathname: string };
};

export const projectMedia = pgTable(
  'project_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    kind: projectMediaKind('kind').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    // Image rows (kind 'cover' | 'image'):
    variants: jsonb('variants').$type<ProjectMediaVariants>(),
    // Base64 LQIP data URL, also browser-generated at upload. Rendered into an
    // inline style — the upload action validates it against a strict
    // data:image/... regex; never store it unvalidated.
    blurDataUrl: text('blur_data_url'),
    alt: text('alt'),
    // Embed rows (kind 'youtube' | 'instagram'): the bare 11-char YouTube id,
    // or the canonical https://www.instagram.com/(p|reel|tv)/<id>/ URL.
    embedRef: text('embed_ref'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Detail-page reads: everything for a project, gallery-ordered.
    index('project_media_project_sort_idx').on(t.projectId, t.sortOrder),
    // At most one cover per project — enforced here (partial unique) instead
    // of a projects.cover_media_id FK, which would be circular.
    uniqueIndex('project_media_cover_uidx')
      .on(t.projectId)
      .where(sql`kind = 'cover'`),
  ],
);

export type ProjectMediaRow = typeof projectMedia.$inferSelect;
export type NewProjectMedia = typeof projectMedia.$inferInsert;

// ───────────────────────────────────────────────────────────────────────────
// Task tracking: the team's work log (the 'tasks' area) feeding the per-client
// monthly reports (the 'reports' area). Replaces the Telegram daily-digest
// thread. Every hours column in this section is INTEGER MINUTES — the UI
// converts to/from decimal hours through parseHoursToMinutes in
// src/lib/taskFields.ts, the single conversion door.
// ───────────────────────────────────────────────────────────────────────────

// `needs_approval` sits between in_progress and done: work is finished and
// waiting on client sign-off — actualMinutes is confirmed here, completedAt
// stays null until the member marks it done after approval.
export const taskStatus = pgEnum('task_status', [
  'todo',
  'in_progress',
  'needs_approval',
  'done',
]);

export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);

export const taskEventKind = pgEnum('task_event_kind', [
  'created',
  'updated',
  'status',
  'comment',
  'deleted',
]);

// How often a template mints a task. 'none' = a saved shape the member spawns
// by hand — the majority case, and the reason this isn't a boolean.
export const taskRepeat = pgEnum('task_repeat', ['none', 'weekly', 'monthly']);

// The internal work vocabulary ("Video editing", "SEO", …), superadmin-managed
// from /admin/tasks. Fine-grained on purpose: members pick these, while client
// reports roll them up through `siteCategory` into the same five service
// categories the public site uses.
export const taskCategories = pgTable('task_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  // Report rollup target — reuses the route-key enum so a category can never
  // point at a service area the site doesn't have.
  siteCategory: projectCategory('site_category').notNull(),
  // Archivable, never deletable once referenced (tasks FK is restrict):
  // archived categories vanish from the create/edit pickers but keep labeling
  // and filtering historical tasks, so old reports stay intact.
  archived: boolean('archived').notNull().default(false),
  // Picker order, seeded in steps of 10 (marqueeSort convention) so a new
  // category can slot between two others without renumbering.
  sortIndex: integer('sort_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
// No secondary indexes: a ~10-row vocabulary read whole (clients precedent).

export type TaskCategory = typeof taskCategories.$inferSelect;
export type NewTaskCategory = typeof taskCategories.$inferInsert;

/**
 * A saved task shape — the routine work the studio retypes every week
 * ("Photos <client> drone", "Weekly reel edit"). Two uses from one row:
 * spawn one by hand from the composer, or let `repeat` mint it on a schedule.
 *
 * Deliberately NOT a task: it carries no status, no hours logged, no dates —
 * only the shape. Everything time-bound is stamped at mint.
 *
 * Cascade on client delete (report_notes precedent, unlike tasks' restrict):
 * a template is a convenience, not billable history, and blocking a client
 * delete on one would be a surprise. Category stays RESTRICT, matching tasks —
 * the category vocabulary is archived, never deleted out from under a row.
 */
export const taskTemplates = pgTable(
  'task_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** What the template is called in the picker — distinct from the task
     *  title it produces, since one client's "weekly edit" template may mint
     *  a title carrying the month. */
    name: text('name').notNull(),
    title: text('title').notNull(),
    notes: text('notes'),

    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'cascade',
    }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => taskCategories.id, { onDelete: 'restrict' }),
    // Set null on account deletion: the template survives an offboarding and
    // simply mints unassigned until someone picks a new owner. (Tasks keep a
    // name snapshot for history; a template has no history to preserve.)
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    priority: taskPriority('priority'),
    estimatedMinutes: integer('estimated_minutes').notNull(),

    repeat: taskRepeat('repeat').notNull().default('none'),
    /** Weekly: ISO weekday 1–7 (Mon–Sun). Monthly: day of month 1–28 — capped
     *  at 28 so every month has the day and no schedule silently skips
     *  February. Null when `repeat` is 'none'. */
    repeatDay: integer('repeat_day'),
    /** Days from mint to the task's due date; null leaves the due date unset
     *  (the same "a due date is a decision" stance the create form takes). */
    dueOffsetDays: integer('due_offset_days'),
    /** Paused rather than deleted — a seasonal template keeps its shape. */
    active: boolean('active').notNull().default(true),

    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByName: text('created_by_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The cron's daily sweep: active + repeating rows only, a tiny fraction of
    // the table once hand-spawned templates accumulate.
    index('task_templates_active_repeat_idx').on(t.active, t.repeat),
    // FK restrict checks + the in-use count behind category deletion.
    index('task_templates_category_idx').on(t.categoryId),
  ],
);

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;

/**
 * A named filter combination on /admin/tasks — "Vela, this month", "My
 * overdue". Stores the canonical query string rather than parsed columns:
 * `taskListQs` in src/lib/taskFilters.ts is already the complete, versioned
 * expression of list state, so a view is just that string plus a name. New
 * filters become saveable for free, and a retired param degrades to being
 * ignored by the parser rather than to a schema migration.
 *
 * Rows are per-user (cascade on account delete — a departed member's private
 * views are noise), with `shared` promoting one to the whole team.
 */
export const taskViews = pgTable(
  'task_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Snapshot so a shared view still reads as someone's after offboarding
     *  (the assignee-name precedent) — the row itself is gone by then, but a
     *  shared one may be re-owned rather than dropped. */
    ownerName: text('owner_name').notNull(),
    name: text('name').notNull(),
    /** The canonical query string, no leading '?'. */
    query: text('query').notNull(),
    /** Visible to the whole team, not just its owner. */
    shared: boolean('shared').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The list read: this user's views plus every shared one, oldest first.
    index('task_views_user_idx').on(t.userId, t.createdAt),
    // One name per person — saving again under an existing name updates it
    // (the report_notes upsert idiom) instead of growing duplicates.
    uniqueIndex('task_views_user_name_uidx').on(t.userId, t.name),
  ],
);

// Named TaskViewRow, not TaskView: `TaskView` already means a status tab in
// src/lib/taskFilters.ts, and both are imported side by side.
export type TaskViewRow = typeof taskViews.$inferSelect;
export type NewTaskViewRow = typeof taskViews.$inferInsert;

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    notes: text('notes'),

    // Nullable: internal Perseus work has no client (projects.clientId
    // precedent). `restrict`: a client with task history must be untangled
    // deliberately — deleteClient refuses with a count, the FK is the race
    // backstop.
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'restrict',
    }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => taskCategories.id, { onDelete: 'restrict' }),

    status: taskStatus('status').notNull().default('todo'),

    // Nullable on purpose: "no priority" is the default state, not a fourth
    // level — most routine tasks never need one (Notion convention).
    priority: taskPriority('priority'),

    // Single assignee. FK-to-user rule (tickets precedent): text id, set null
    // on account deletion, name snapshot keeps history rendering — offboarding
    // deletes the account, and last month's report must not lose its rows.
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    assigneeName: text('assignee_name').notNull(),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByName: text('created_by_name').notNull(),

    estimatedMinutes: integer('estimated_minutes').notNull(),
    // Confirmed when the task is marked done (the UI prefills the estimate;
    // the server never copies it silently). Survives a reopen as the next
    // completion's prefill — inert meanwhile, since every report query filters
    // status = 'done'.
    actualMinutes: integer('actual_minutes'),

    // A team-local calendar day, not an instant — `date` avoids the
    // Vancouver-midnight conversion (and its DST edge) that a timestamptz
    // would force on every read and write. Same rationale for startDate:
    // when work is planned to begin. Deliberately independent of time spent —
    // effort is not calendar span, so nothing derives an "end date" from it;
    // completedAt is the real end.
    startDate: date('start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    deliverableUrl: text('deliverable_url'),

    // Stamped on →done (freshly on every re-completion), nulled on reopen.
    // THE report column: monthly windows run gte/lt on it in America/Vancouver
    // terms (monthWindowIn in src/lib/calendar.ts, resolved in the reader's zone).
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Which template minted this row, if any. Set null on template delete:
    // the task is real work and outlives the shape it came from.
    templateId: uuid('template_id').references(() => taskTemplates.id, {
      onDelete: 'set null',
    }),
    // The occurrence this row IS — the Vancouver day key the recurring cron
    // was minting for. Together with templateId it forms the idempotency key
    // (partial unique index below): neon-http has no transactions, so a cron
    // retry or an overlapping invocation must be stopped by the database, not
    // by a read-then-write check that can interleave.
    templateRunKey: text('template_run_key'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set explicitly by every mutating action (tickets convention).
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One task per template per occurrence. Partial so the millions of rows
    // with no template stay out of the index and don't collide on (null,null).
    uniqueIndex('tasks_template_run_idx')
      .on(t.templateId, t.templateRunKey)
      .where(sql`${t.templateId} is not null`),
    // The status-tab list + countTasksByStatus' GROUP BY: equality/IN on
    // status, ORDER BY created_at DESC (tickets_status_created precedent).
    index('tasks_status_created_idx').on(t.status, t.createdAt.desc()),
    // Cross-client month windows: the digest and the filter-wide export scan
    // completed_at ranges with no client bound.
    index('tasks_completed_idx').on(t.completedAt.desc()),
    // The per-client monthly report and the reports-roster rollup: client
    // equality + completed_at range in one walk.
    index('tasks_client_completed_idx').on(t.clientId, t.completedAt),
    // Assignee-filtered list views (tickets_reporter_created precedent).
    index('tasks_assignee_created_idx').on(t.assigneeId, t.createdAt.desc()),
    // Category filter + the delete-guard in-use count + FK restrict checks.
    index('tasks_category_idx').on(t.categoryId),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

/**
 * One written "highlights" note per client per month — the human story on top
 * of the report's numbers, shown on the report dashboard and the print PDF.
 * `month` is the report's YYYY-MM token (resolved in the reader's calendar, the same
 * vocabulary every report window speaks); (client, month) is the identity, so
 * saving upserts and an emptied note deletes the row. Cascade on client
 * delete: unlike tasks (restrict — billable history), a note is worthless
 * without its client.
 */
export const reportNotes = pgTable(
  'report_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    body: text('body').notNull(),
    // Set explicitly by the save action (tickets convention).
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('report_notes_client_month').on(t.clientId, t.month)],
);

export type ReportNote = typeof reportNotes.$inferSelect;

/**
 * Tokenized public read-only links to one client-month report — the
 * deliverable an agency actually sends ("here's your August report"). The
 * token is the whole credential (~144-bit, unguessable); the partial unique
 * index allows ONE active link per (client, month) — minting again returns
 * the existing link via the unique-violation get-or-create, and revoking
 * (revoked_at set, row kept for audit) frees the slot. Cascade on client
 * delete: a share is worthless without its client (report_notes rule).
 */
export const reportShares = pgTable(
  'report_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    token: text('token').notNull().unique(),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByName: text('created_by_name').notNull(),
    // The minting admin's zone, frozen at mint time. The shared page has no
    // session to read a zone from, and a report whose month boundaries moved
    // with the READER's clock would show the client different numbers than the
    // admin who sent it. NULL (links minted before this column) → STUDIO_TZ.
    timezone: text('timezone'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('report_shares_active_client_month')
      .on(t.clientId, t.month)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export type ReportShare = typeof reportShares.$inferSelect;

/**
 * The task activity log + per-task comments, one row per event. Written
 * best-effort from the ok-branches of every task mutation (inside after(),
 * never blocking or failing the action — neon-http has no transactions, so
 * a missing event is accepted over a failed edit). SET NULL on task delete,
 * not cascade: a hard delete is the one irreversible act, so its history
 * must survive it — task_title keeps orphaned rows meaningful, and 'deleted'
 * events are born orphaned (the row is already gone when they're written).
 */
export const taskEvents = pgTable(
  'task_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    // Snapshot at write time (assigneeName convention) — the identity line
    // for orphaned events, and a rename-proof label everywhere else.
    taskTitle: text('task_title').notNull(),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorName: text('actor_name').notNull(),
    kind: taskEventKind('kind').notNull(),
    // Comment text (kind='comment' only), capped at TASK_COMMENT_MAX.
    body: text('body'),
    // kind='updated': { changes: { <field>: { from?, to } }, bulk? };
    // kind='status': { to, actualMinutes?, bulk? };
    // kind='created': { duplicatedFromId? }. Client/category changes store
    // ids — the activity reader resolves live names in batch at render time.
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The edit dialog's per-task feed: equality on task_id, newest first.
    index('task_events_task_created_idx').on(t.taskId, t.createdAt.desc()),
  ],
);

export type TaskEvent = typeof taskEvents.$inferSelect;
export type NewTaskEvent = typeof taskEvents.$inferInsert;


/* ---------------------------------------------------------------------------
 * Payroll
 *
 * Monthly compensation for team members, paid through a Vancouver currency
 * exchange. Three shapes coexist and are NOT special-cased anywhere: a member's
 * pay is *anchored* in one currency (what the agreement fixes) and *paid* in
 * another (what actually lands in their account), so every case collapses to
 * `paid = anchor x rate`, with rate = 1 when the two currencies match:
 *
 *   CAD-anchored, paid in toman  — anchor CAD 1400 x 132,000 = 184,800,000 IRT
 *   toman-anchored, paid in toman — anchor IRT 35,000,000, rate irrelevant to
 *                                   the member (it moves the COMPANY's cost)
 *   CAD-anchored, paid in CAD     — a Canadian hire; rate = 1
 *
 * That also makes month-over-month growth decompose exactly:
 *   (1 + d_anchor)(1 + d_rate) - 1 = d_paid
 * which is what the member-facing "your toman rose 66.5%: 55.6% from your pay,
 * 7.1% from the rate" stat is built on. See src/lib/payrollAmounts.ts.
 *
 * MONEY IS INTEGER MINOR UNITS, never numeric/float — the taskFields.ts rule,
 * with one conversion door (src/lib/payrollAmounts.ts). CAD is `integer` cents;
 * toman is `bigint` because a single member-year of toman overflows int4, and
 * `mode: 'number'` (not 'bigint') so the values stay JSON-serializable when a
 * server component threads them into a client prop.
 *
 * PRIVACY: this is the most sensitive data in the app. Every page, action, and
 * route handler re-gates through requirePayrollAdmin()/requireOwnPayroll() in
 * src/lib/adminAccess.ts, and member-facing reads use their own narrow
 * projections — `admin_note`, `notes`, and `wire_ref` must never appear in one.
 * ------------------------------------------------------------------------- */

/** Settlement currencies. 'IRT' = Iranian toman (rial / 10) — the unit every
 *  invoice and every conversation uses; rial appears nowhere in the UI. Not an
 *  ISO 4217 code (ISO only has IRR), but it is the de-facto one. */
export const payrollCurrency = pgEnum('payroll_currency', ['CAD', 'IRT']);

export const payrollMemberStatus = pgEnum('payroll_member_status', [
  'active',
  'ended',
]);

/**
 * draft    — being prepared; invisible to the member.
 * sent     — money dispatched (the run was submitted).
 * received — the member confirmed it landed. Happy-path terminal.
 * flagged  — the member reported a problem; `member_note` carries why.
 * void     — recorded in error.
 * Transitions are centralised in src/lib/payrollStatus.ts; edit doors never
 * touch status (the tasks convention).
 */
export const payrollPaymentStatus = pgEnum('payroll_payment_status', [
  'draft',
  'sent',
  'received',
  'flagged',
  'void',
]);

export const payrollEventKind = pgEnum('payroll_event_kind', [
  'created',
  'updated',
  'status',
  'note',
  'deleted',
]);

/**
 * One payee. `user_id` is nullable and ON DELETE SET NULL with a
 * `display_name` snapshot — the tasks.assigneeId/assigneeName precedent:
 * offboarding hard-deletes the `user` row (see _actions/users.ts) and pay
 * history must survive that. It also lets a payee be recorded before (or
 * without) ever having a dashboard login.
 *
 * UNIQUE on user_id is load-bearing: getAccessProfile() leftJoins this table
 * on every protected render and relies on the join staying 1:1.
 */
export const payrollMembers = pgTable(
  'payroll_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    displayName: text('display_name').notNull(),
    status: payrollMemberStatus('status').notNull().default('active'),
    // Calendar days, deliberately `date` not timestamptz — proration counts
    // whole days and must not shift under DST (same reason as tasks.dueDate).
    joinedOn: date('joined_on', { mode: 'string' }),
    endedOn: date('ended_on', { mode: 'string' }),
    /** THE self-view switch: does this person see /admin/pay at all? Payroll
     *  admins can track someone without exposing the history to them yet. */
    selfViewEnabled: boolean('self_view_enabled').notNull().default(true),
    /** Currency the money is actually delivered in. */
    payCurrency: payrollCurrency('pay_currency').notNull().default('IRT'),
    /** Admin-only. Never selected in a member-facing projection. */
    notes: text('notes'),
    sortIndex: integer('sort_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('payroll_members_user_id_unique').on(t.userId),
    index('payroll_members_status_sort_idx').on(t.status, t.sortIndex),
  ],
);

export type PayrollMember = typeof payrollMembers.$inferSelect;
export type NewPayrollMember = typeof payrollMembers.$inferInsert;

/**
 * Effective-dated standing salary. There is no `effective_to`: the next row
 * supersedes, so gaps and overlaps are structurally impossible. A raise is a
 * new row, which is what gives the member's "35,000,000 toman from Jul 19,
 * 2026" history for free.
 *
 * `anchor_amount` is minor units of `anchor_currency` — cents for CAD, whole
 * toman for IRT.
 */
export const payrollTerms = pgTable(
  'payroll_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => payrollMembers.id, { onDelete: 'cascade' }),
    effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
    anchorCurrency: payrollCurrency('anchor_currency').notNull(),
    anchorAmount: bigint('anchor_amount', { mode: 'number' }).notNull(),
    note: text('note'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByName: text('created_by_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('payroll_terms_member_from_unique').on(t.memberId, t.effectiveFrom),
    // "the term in force for month M": equality on member, newest first.
    index('payroll_terms_member_from_idx').on(
      t.memberId,
      t.effectiveFrom.desc(),
    ),
  ],
);

export type PayrollTerm = typeof payrollTerms.$inferSelect;
export type NewPayrollTerm = typeof payrollTerms.$inferInsert;

/**
 * One payout batch per month — the real-world unit, since a month's members are
 * paid in a single wire batch against one exchange invoice.
 *
 * `rate_micro` is toman-per-CAD x 1,000,000 (131,999.260804 -> 131999260804):
 * exact and integer. This is the month's CANONICAL rate — it pre-fills each
 * line and is what the rate trend and the growth split are computed from. A
 * line that settled at a different quote overrides it in
 * payroll_payments.rate_micro; the exchange really does price each wire
 * separately (June 2026 spanned 123,300.00 to 123,376.06 across four lines).
 *
 * No status column — run state is derived from its payments, so there is
 * nothing to desync. `sent_at` records when the batch was actually dispatched.
 *
 * `invoice_ref` is the exchange's invoice number (e.g. 'DCINV234648'), admin
 * only. The invoice PDF itself is deliberately NEVER stored: one page lists
 * every member's pay, so it can have no member-facing surface at all.
 */
export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** YYYY-MM Vancouver month token (the report_notes convention). */
    month: text('month').notNull(),
    rateMicro: bigint('rate_micro', { mode: 'number' }),
    invoiceRef: text('invoice_ref'),
    note: text('note'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentById: text('sent_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    sentByName: text('sent_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('payroll_runs_month_unique').on(t.month)],
);

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;

/**
 * One member's pay for one month. Both sides of the conversion are stored as
 * facts rather than derived on read:
 *
 *   anchor_currency/anchor_amount — what the agreement fixes for THIS month
 *                                   (already prorated; the day columns explain
 *                                   why it differs from the standing term)
 *   paid_currency/paid_amount     — what actually landed. Pre-filled from
 *                                   anchor x rate, but overridable so the
 *                                   stored figure matches the exchange exactly.
 *   cost_cad_cents                — the company's salary cost in CAD; the one
 *                                   summable column across all three shapes.
 *   fee_cad_cents                 — the wire fee. Company cost, NOT part of
 *                                   anybody's salary and never shown to a
 *                                   member.
 *
 * `month` is denormalized off the run so the member self-view is a single
 * indexed read, and so a payment keeps its period if runs are ever reshuffled.
 */
export const payrollPayments = pgTable(
  'payroll_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => payrollRuns.id, { onDelete: 'cascade' }),
    // restrict, not cascade/set null: deleting a member with pay history is a
    // mistake, and the FK is the backstop. End-date them instead.
    memberId: uuid('member_id')
      .notNull()
      .references(() => payrollMembers.id, { onDelete: 'restrict' }),
    month: text('month').notNull(),

    anchorCurrency: payrollCurrency('anchor_currency').notNull(),
    anchorAmount: bigint('anchor_amount', { mode: 'number' }).notNull(),
    paidCurrency: payrollCurrency('paid_currency').notNull(),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
    /**
     * The rate this specific wire settled at, toman-per-CAD x 1e6. NULL means
     * "inherit the run's monthly rate", which is the normal case. It exists
     * because the exchange quotes each wire separately — the June 2026 invoice's
     * four lines ran 123,300.00 to 123,376.06, a 0.062% spread — so a single
     * monthly rate cannot reproduce an invoice line for line. The run's rate
     * stays the canonical monthly figure for trends and for pre-filling.
     */
    rateMicro: bigint('rate_micro', { mode: 'number' }),
    costCadCents: integer('cost_cad_cents').notNull().default(0),
    feeCadCents: integer('fee_cad_cents').notNull().default(0),

    // Partial month: `prorated_days` of `month_days` were paid. Null/null means
    // a full month. Kept as counts (not just the reduced amount) so the payslip
    // can show its working — "13 of 31 days (joined Jul 19)".
    proratedDays: integer('prorated_days'),
    monthDays: integer('month_days'),
    prorationNote: text('proration_note'),

    status: payrollPaymentStatus('status').notNull().default('draft'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    /** Stamped by the nudge cron so an unconfirmed payment is chased once,
     *  not every single day. */
    nudgedAt: timestamp('nudged_at', { withTimezone: true }),

    /** Exchange wire reference (e.g. 'DCEWI80398'). Admin-only. */
    wireRef: text('wire_ref'),
    /** Why the member flagged it. Member-written, admin-readable. */
    memberNote: text('member_note'),
    /** Admin-only. Never selected in a member-facing projection. */
    adminNote: text('admin_note'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('payroll_payments_run_member_unique').on(t.runId, t.memberId),
    // The member self-view: equality on member, newest month first.
    index('payroll_payments_member_month_idx').on(t.memberId, t.month.desc()),
    // The admin month screen + monthly rollups.
    index('payroll_payments_month_idx').on(t.month),
  ],
);

export type PayrollPayment = typeof payrollPayments.$inferSelect;
export type NewPayrollPayment = typeof payrollPayments.$inferInsert;

/**
 * Audit trail — a direct mirror of task_events, including the snapshot columns
 * that survive a deleted actor or member. Written best-effort behind after()
 * (see logPayrollEvents in _actions/payroll.ts): neon-http has no transactions,
 * and a pay edit must never fail because its breadcrumb did.
 *
 * payload shapes: kind='status' { from, to, onBehalf? };
 * kind='updated' { changes: { <field>: { from?, to } } };
 * kind='created' { seeded? }. Amounts in payloads are admin-only by
 * construction — nothing member-facing reads this table.
 */
export const payrollEvents = pgTable(
  'payroll_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').references(() => payrollPayments.id, {
      onDelete: 'set null',
    }),
    memberId: uuid('member_id').references(() => payrollMembers.id, {
      onDelete: 'set null',
    }),
    memberName: text('member_name').notNull(),
    month: text('month').notNull(),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorName: text('actor_name').notNull(),
    kind: payrollEventKind('kind').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('payroll_events_payment_created_idx').on(
      t.paymentId,
      t.createdAt.desc(),
    ),
    index('payroll_events_member_created_idx').on(
      t.memberId,
      t.createdAt.desc(),
    ),
  ],
);

export type PayrollEvent = typeof payrollEvents.$inferSelect;
export type NewPayrollEvent = typeof payrollEvents.$inferInsert;

/* -------------------------------------------------------------------------- */
/* Activity log                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The verbs an audit row can carry. A closed vocabulary (pgEnum) because these
 * drive a filter pill on /admin/logs and a typo must not silently create a
 * fourteenth "action" nobody can filter by.
 *
 * 'grant' and 'auth' exist as their own verbs rather than folding into
 * 'update': OWASP's "always log" list names user-administration actions and
 * authentication outcomes specifically, and both need to stay findable when
 * the table is a year deep.
 *
 * There is deliberately no 'error' value. Diagnostics are a different product
 * from an audit trail — different durability, different retention, different
 * audience — and they go to the instrumentation hook, never to Postgres.
 */
export const activityAction = pgEnum('activity_action', [
  'create',
  'update',
  'delete',
  'status',
  'grant', // privilege change — area grants, credential changes, offboarding
  'auth', // sign-in, sign-out/session revoked, password reset requested
  'send', // payroll run sent, digest mailed, share link minted
  'export', // CSV of PII leaving the app — OWASP "access to sensitive data"
  'access', // résumé / payslip fetched. NOT avatars — those load every render
]);

/**
 * A single value an audit payload may hold. Scalars only, by design: the
 * realistic accident is not someone deliberately logging a salary, it is
 * `payload: { changes: { ...row } }` spreading a whole DB row into the log.
 * Forbidding nested objects and arrays makes that spread a type error at the
 * call site instead of a privacy incident a year later.
 */
export type ActivityValue = string | number | boolean | null;

/**
 * What an audit row may carry beyond its columns. Deliberately NOT
 * `Record<string, unknown>` (which task_events and payroll_events use) —
 * those two are read by one screen each with a known audience, whereas this
 * table is the general dumping ground every future feature writes to, so its
 * payload is the thing most likely to accumulate something it shouldn't.
 *
 * The type narrows the SHAPE. The runtime key denylist in
 * src/lib/activityLog.ts narrows the CONTENT. Both are needed: a type cannot
 * tell `{ to: 35000000 }` (a salary) from `{ to: 25 }` (a page size).
 */
export type ActivityPayload = {
  /** Field-level diff — the same shape task_events documents above. */
  changes?: Record<string, { from?: ActivityValue; to: ActivityValue }>;
  /** Rows affected, for bulk actions. */
  count?: number;
  /** Ids and counts only. Never values — see the denylist. */
  meta?: Record<string, ActivityValue>;
};

/**
 * The site-wide audit trail: who did what, when, across every /admin surface.
 * A third event table alongside task_events and payroll_events rather than a
 * replacement for them — those two carry domain columns (task_title, month,
 * member_name) that are exactly what makes their own feeds readable, and
 * generalising them would cost more than it saved.
 *
 * Those two domains additionally write a COARSE row here, so the global feed
 * is complete without this table ever holding a pay figure. That split is
 * load-bearing: payroll_events payloads carry amounts, while /admin/logs is
 * gated on the owner-granted 'logs' area — a WIDER audience than the payroll
 * admins. Keeping the amounts out by construction is exactly what makes that
 * widening safe.
 *
 * Written best-effort behind after() (see src/lib/activityLog.ts) for the same
 * reason as the other two: neon-http has no transactions, and a mutation must
 * never fail because its breadcrumb did.
 *
 * payload shape: { changes: { <field>: { from?, to } } } — the same diff shape
 * task_events documents above, so one renderer serves all three feeds.
 */
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Nullable actor: cron runs and anonymous public writes have no user row.
    // Set-null + a name snapshot is the house rule — an audit trail that
    // forgets who did something when they are offboarded is not an audit trail.
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorName: text('actor_name').notNull(),

    // Plain text, NOT the AdminArea enum: 'cron' and 'auth' are not areas, and
    // a future area must never need a migration (the tickets.area precedent).
    area: text('area').notNull(),
    entity: text('entity').notNull(),
    // text, not uuid: app rows are uuids but Better Auth ids are 32-char
    // alphanumerics, and both land in this column.
    entityId: text('entity_id'),
    entityName: text('entity_name').notNull(),

    action: activityAction('action').notNull(),
    // Rendered server-side at write time so the feed never has to re-resolve a
    // deleted entity to describe what happened to it.
    summary: text('summary').notNull(),
    payload: jsonb('payload').$type<ActivityPayload>(),

    // Vercel's per-request id (x-vercel-id). The jump-off point from an audit
    // row to that request's runtime logs and its error-tracker event.
    requestId: text('request_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The default feed: everything, newest first.
    index('activity_log_created_idx').on(t.createdAt.desc()),
    // "What did this person do?" — the actor filter pill.
    index('activity_log_actor_created_idx').on(t.actorId, t.createdAt.desc()),
    // "What happened in payroll / users / tickets?" — the area filter pill.
    index('activity_log_area_created_idx').on(t.area, t.createdAt.desc()),
    // "What happened to THIS row?" — the per-entity history strip.
    index('activity_log_entity_idx').on(
      t.entity,
      t.entityId,
      t.createdAt.desc(),
    ),
  ],
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;

// Better Auth tables (user/session/account/verification/passkey). Re-exported
// here so drizzle-kit (configured against this file) picks them up for
// migrations, and so the pooled auth client's schema includes them. Kept in a
// separate module because the Better Auth field-name constraints differ from
// this file's own conventions — see ./auth-schema.ts.
export * from './auth-schema';
