/**
 * Drizzle schema for the app's tables: unified contact-form submissions,
 * internal tickets, blog-article feedback, the portfolio registry
 * (clients / projects / project media), and task tracking (task categories /
 * tasks feeding the per-client monthly reports) managed from /admin.
 *
 * NOTE: no `import 'server-only'` here — drizzle-kit loads this file outside a
 * react-server context and the guard would throw. The runtime client in
 * ./index.ts carries the guard instead; app code must import `db` from there,
 * never query through this module directly.
 */
import { sql } from 'drizzle-orm';
import {
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

    // Job application fields. `role` stores the opening's stable slug (see
    // src/constants/careers.ts), mirroring how `services` stores slugs.
    role: text('role'),
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
    // Also covers getStatusCounts / getOverviewStats (GROUP BY kind, status).
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
// Portfolio: clients & projects, managed from /admin (the 'portfolio' area).
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

export const taskStatus = pgEnum('task_status', [
  'todo',
  'in_progress',
  'done',
]);

export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);

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
    // terms (vancouverMonthWindow in src/lib/taskFilters.ts).
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set explicitly by every mutating action (tickets convention).
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
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

// Better Auth tables (user/session/account/verification/passkey). Re-exported
// here so drizzle-kit (configured against this file) picks them up for
// migrations, and so the pooled auth client's schema includes them. Kept in a
// separate module because the Better Auth field-name constraints differ from
// this file's own conventions — see ./auth-schema.ts.
export * from './auth-schema';
