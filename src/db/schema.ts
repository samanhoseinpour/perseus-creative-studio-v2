/**
 * Drizzle schema for the site's only database table: unified contact-form
 * submissions (client project inquiries + job applications).
 *
 * NOTE: no `import 'server-only'` here — drizzle-kit loads this file outside a
 * react-server context and the guard would throw. The runtime client in
 * ./index.ts carries the guard instead; app code must import `db` from there,
 * never query through this module directly.
 */
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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

export const contactSubmissions = pgTable('contact_submissions', {
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
});

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

export const tickets = pgTable('tickets', {
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
});

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
  (t) => [unique('article_feedback_client_slug').on(t.clientId, t.slug)],
);

export type ArticleFeedback = typeof articleFeedback.$inferSelect;
export type NewArticleFeedback = typeof articleFeedback.$inferInsert;

// Better Auth tables (user/session/account/verification/passkey). Re-exported
// here so drizzle-kit (configured against this file) picks them up for
// migrations, and so the pooled auth client's schema includes them. Kept in a
// separate module because the Better Auth field-name constraints differ from
// this file's own conventions — see ./auth-schema.ts.
export * from './auth-schema';
