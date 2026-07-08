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
  uuid,
} from 'drizzle-orm/pg-core';

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
  // REFERRAL_OPTIONS in src/lib/contactSchema.ts); nullable, both kinds.
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

// Better Auth tables (user/session/account/verification/passkey). Re-exported
// here so drizzle-kit (configured against this file) picks them up for
// migrations, and so the pooled auth client's schema includes them. Kept in a
// separate module because the Better Auth field-name constraints differ from
// this file's own conventions — see ./auth-schema.ts.
export * from './auth-schema';
