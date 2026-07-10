import 'server-only';
import { asc, count, desc, getTableColumns, is, Table, type SQL } from 'drizzle-orm';
import { getTableConfig, type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import * as schema from '@/db/schema';

/**
 * Registry + read queries for the /admin/database browser: a read-only,
 * schema-introspected view over every table. The registry AUTO-DISCOVERS
 * every `pgTable` exported from src/db/schema.ts (which re-exports the auth
 * tables too), so a new table appears here with zero edits — only its label
 * and picker position come from the optional TABLE_PRESENTATION map below.
 *
 * Deliberately typed against the NON-generic base `PgTable` everywhere — no
 * `<T extends PgTable>` helpers. That keeps `db.select(selection).from(table)`
 * resolving once against `Record<string, PgColumn>` (rows come back as
 * `Record<string, unknown>`) instead of sending TS into deep generic
 * instantiation over a table union.
 */

/**
 * Columns whose values must never reach the page. Redaction is enforced at the
 * QUERY layer — these columns are excluded from the SELECT list entirely, so
 * secrets never leave Postgres and can't leak into the RSC payload — and the
 * renderer shows a `••• redacted` placeholder under the still-visible header.
 * Keyed by SQL table name; values are SQL column names.
 */
const REDACTED_COLUMNS: Record<string, readonly string[]> = {
  account: ['password', 'access_token', 'refresh_token', 'id_token'],
  session: ['token'],
  // BOTH columns. Better Auth stores the password-reset flow inverted from
  // what the names suggest: `identifier` holds the live bearer secret
  // (`reset-password:<token>` — the reset endpoint authorizes on exactly that
  // string) while `value` holds only the non-secret user id. Leaving
  // `identifier` visible would let anyone reading this page hijack an
  // in-flight reset (1h window). Neither name trips REDACT_PATTERN.
  verification: ['identifier', 'value'],
  passkey: ['public_key', 'credential_id', 'counter', 'aaguid'],
};

// Name-pattern fallback so future tables are redacted-by-default: any column
// smelling like credential material is hidden unless someone consciously
// allowlists it. `*_expires_at` is exempt — token EXPIRY timestamps are
// harmless and genuinely useful when debugging auth. NOTE the fallback is a
// safety net, not a guarantee: a secret column named neither of these (as
// `verification.identifier` proved) must be added to REDACTED_COLUMNS by hand.
const REDACT_PATTERN = /password|token|secret|credential|key/i;
const REDACT_EXEMPT = /_expires_at$/;

function isRedacted(tableName: string, columnName: string): boolean {
  if (REDACTED_COLUMNS[tableName]?.includes(columnName)) return true;
  return REDACT_PATTERN.test(columnName) && !REDACT_EXEMPT.test(columnName);
}

export type DbColumnMeta = {
  /** Drizzle property key — `db.select()` rows are keyed by THIS. */
  tsKey: string;
  /** SQL column name — what the table header shows. */
  name: string;
  /** e.g. 'text', 'uuid', 'timestamp with time zone', 'contact_status'. */
  sqlType: string;
  primary: boolean;
  notNull: boolean;
  isEnum: boolean;
  isUuid: boolean;
  redacted: boolean;
};

export type DbBrowserTable = {
  /** SQL table name; doubles as the `?table=` value. */
  slug: string;
  label: string;
  table: PgTable;
  /** Every column in declaration order, redacted ones included (headers show them). */
  columns: DbColumnMeta[];
  /** Visible (non-redacted) columns only, keyed by tsKey — the SELECT list. */
  selection: Record<string, PgColumn>;
  orderBy: SQL[];
};

function makeEntry(label: string, table: PgTable): DbBrowserTable {
  const slug = getTableConfig(table).name;
  const tableColumns = getTableColumns(table) as Record<string, PgColumn>;

  const columns: DbColumnMeta[] = Object.entries(tableColumns).map(
    ([tsKey, col]) => ({
      tsKey,
      name: col.name,
      sqlType: col.getSQLType(),
      primary: col.primary,
      notNull: col.notNull,
      isEnum: Array.isArray(col.enumValues) && col.enumValues.length > 0,
      isUuid: col.columnType === 'PgUUID',
      redacted: isRedacted(slug, col.name),
    }),
  );

  const selection: Record<string, PgColumn> = {};
  for (const [tsKey, col] of Object.entries(tableColumns)) {
    if (!isRedacted(slug, col.name)) selection[tsKey] = col;
  }

  // Newest first when the table records creation time, with the PK as a
  // deterministic tiebreaker so pagination can't shuffle rows between pages.
  // (passkey.created_at is nullable → NULLs sort first under DESC; harmless.)
  const cols = Object.values(tableColumns);
  const createdAt = cols.find((c) => c.name === 'created_at');
  const pk = cols.find((c) => c.primary);
  const orderBy: SQL[] = createdAt
    ? pk
      ? [desc(createdAt), asc(pk)]
      : [desc(createdAt)]
    : [asc(pk ?? cols[0])];

  return { slug, label, table, columns, selection, orderBy };
}

/**
 * Presentation overrides for known tables — label + picker position, keyed by
 * SQL table name. Tables NOT listed here still appear: auto-discovered from
 * the schema exports with a humanized label, appended after the known ones
 * alphabetically. The lowest-order entry is the load-bearing DEFAULT view
 * (`resolveBrowserTable` fallback + `DbPager`'s canonical hrefs).
 */
const TABLE_PRESENTATION: Record<string, { label: string; order: number }> = {
  contact_submissions: { label: 'Contact submissions', order: 0 },
  tickets: { label: 'Tickets', order: 1 },
  user: { label: 'Users', order: 2 },
  session: { label: 'Sessions', order: 3 },
  account: { label: 'Accounts', order: 4 },
  verification: { label: 'Verifications', order: 5 },
  passkey: { label: 'Passkeys', order: 6 },
};

/** 'blog_posts' → 'Blog posts' — the fallback label for unlisted tables. */
function humanizeSlug(slug: string): string {
  const words = slug.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Every browsable table, in picker order. First entry is the default view. */
export const DB_BROWSER_TABLES: DbBrowserTable[] = (
  // Widened to unknown[] so the type predicate can narrow to the BASE PgTable
  // (see the module header — concrete PgTableWithColumns generics must not
  // leak into the registry). The schema barrel also exports pgEnums (and
  // drops type-only exports at runtime); `is(v, Table)` keeps exactly the
  // table objects.
  Object.values(schema) as unknown[]
)
  .filter((value): value is PgTable => is(value, Table))
  .map((table) => {
    const slug = getTableConfig(table).name;
    return makeEntry(TABLE_PRESENTATION[slug]?.label ?? humanizeSlug(slug), table);
  })
  .sort((a, b) => {
    const oa = TABLE_PRESENTATION[a.slug]?.order ?? Number.MAX_SAFE_INTEGER;
    const ob = TABLE_PRESENTATION[b.slug]?.order ?? Number.MAX_SAFE_INTEGER;
    return oa !== ob ? oa - ob : a.label.localeCompare(b.label);
  });

/**
 * Strict registry lookup — the raw `?table=` value never touches SQL. Unknown
 * or absent slugs fall back to the first table (same convention as
 * `resolveInboxView`).
 */
export function resolveBrowserTable(slug: string): DbBrowserTable {
  return DB_BROWSER_TABLES.find((t) => t.slug === slug) ?? DB_BROWSER_TABLES[0];
}

export const DB_ROWS_PER_PAGE = 25;

export type DbTablePage = {
  /** Keyed by tsKey; redacted columns are absent (never selected). */
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of raw rows, mirroring `listSubmissions`: count → clamp the page to
 * the available range (out-of-bounds `?page=` lands on the last page) → select
 * only the visible columns.
 */
export async function getBrowserTablePage(
  entry: DbBrowserTable,
  page: number,
  perPage = DB_ROWS_PER_PAGE,
): Promise<DbTablePage> {
  const [{ total }] = await db.select({ total: count() }).from(entry.table);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await db
    .select(entry.selection)
    .from(entry.table)
    .orderBy(...entry.orderBy)
    .limit(perPage)
    .offset((safePage - 1) * perPage);

  return { rows, total, page: safePage, totalPages };
}

/** Row count per table (keyed by slug) — the picker's tab badges. */
export async function getBrowserTableCounts(): Promise<Record<string, number>> {
  const counts = await Promise.all(
    DB_BROWSER_TABLES.map(async (entry) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(entry.table);
      return [entry.slug, total] as const;
    }),
  );
  return Object.fromEntries(counts);
}
