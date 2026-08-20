import {
  index,
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

import type { AdminArea } from '@/lib/adminAreas';

// Better Auth core + passkey tables.
//
// Property keys MUST match Better Auth's model field names (camelCase) — its
// Drizzle adapter resolves columns by the table object's property key, not by
// SQL name — while the SQL column names stay snake_case to match the rest of
// the schema (see contact_submissions). IDs are `text`: Better Auth generates
// them itself, so there's no DB-side default. This mirrors the spec emitted by
// `getAuthTables()` in better-auth@1.6.23 for our exact config (emailAndPassword
// + passkey) — with four app-managed exceptions on `user` (`role`, `areas`,
// `timezone` and `last_seen_at`, see below). Regenerate/cross-check that spec
// before bumping better-auth.

// A note on the indexes below: Postgres does NOT index a foreign-key
// referencing column just because it's a foreign key, and Better Auth's Drizzle
// adapter doesn't declare any indexes of its own. Every `user_id` here is
// looked up on a hot path (see src/db/adminQueries.ts), so without these the
// auth tables are sequentially scanned on every admin page render. `session` in
// particular gains a row per login and never prunes expired ones, so an
// unindexed `session.user_id` makes /admin/users degrade with total logins ever
// made rather than with user count. Indexes don't change the column spec, so
// this file still matches `getAuthTables()`.

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // App-managed authorization columns — deliberately UNKNOWN to Better Auth
    // (not registered as additionalFields, so its updateUser endpoint can never
    // reach them): the adapter ignores extra columns and its INSERTs omit them,
    // which makes the DB-level NOT NULL DEFAULTs load-bearing. Read and written
    // exclusively via Drizzle (src/lib/adminAccess.ts, the /admin/users actions).
    // `role` is 'owner' | 'superadmin' | 'member'; role changes happen only via
    // SQL/migration backfill, never through the app. `areas` holds the granted
    // area slugs (src/lib/adminAreas.ts) for members AND superadmins alike —
    // only the owner holds every area implicitly, and only the owner may flip
    // the SENSITIVE_AREAS ('payroll', 'logs') or edit a superadmin's grants.
    role: text('role').notNull().default('member'),
    areas: jsonb('areas').$type<AdminArea[]>().notNull().default([]),
    // The viewer's own clock (IANA, e.g. 'Asia/Tehran'). Every date the
    // dashboard shows this person is bucketed in it: the team spans Vancouver
    // and Tehran (11.5h in summer), so a single hardcoded zone is wrong for
    // most of them.
    //
    // DERIVED, never chosen: TimezoneSync writes whatever the browser reports
    // (which is the OS's zone, so it follows a move) on the next /admin render
    // after it changes. There is deliberately no manual override — see the
    // "Two clocks, one door" convention in CLAUDE.md. NULL = never detected,
    // which src/lib/calendar.ts resolves to STUDIO_TZ, so an empty column is
    // safe rather than broken.
    timezone: text('timezone'),
    // Presence: when this person was last actually IN the admin. Written by
    // the heartbeat (src/app/(admin)/admin/(protected)/presence/route.ts, plus
    // a throttled floor write on every protected render) and read by
    // /admin/users to say "Online" or "Last seen 2h ago".
    //
    // This column exists because `session.updated_at` cannot answer the
    // question. Better Auth rewrites that row only when it REFRESHES a session
    // — `updateAge` defaults to 24h — and the 5-minute cookie cache means most
    // requests never read it at all, so it measures token age, not presence.
    // It is also DELETED on sign-out, which made anyone signed out everywhere
    // read as "never signed in". This column survives sign-out on purpose:
    // "last seen" is a fact about a person, not about a live session.
    //
    // NULL = never seen (backfilled once in migration 0025 from session +
    // activity_log history, so an existing account didn't start from blank).
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  // superadminEmails() filters on role for every ticket notification.
  (t) => [index('user_role_idx').on(t.role)],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  // getUserActiveSessions (/admin/profile) and the listAdminUsers join.
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Better Auth resolves the credential account by user on every sign-in and
  // every password change.
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Better Auth resolves a password-reset token by identifier.
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const passkey = pgTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    aaguid: text('aaguid'),
  },
  // getUserPasskeyCount runs on EVERY protected admin page render (the sidebar
  // passkey nudge); credential_id is how a passkey assertion is resolved.
  (t) => [
    index('passkey_user_id_idx').on(t.userId),
    index('passkey_credential_id_idx').on(t.credentialID),
  ],
);
