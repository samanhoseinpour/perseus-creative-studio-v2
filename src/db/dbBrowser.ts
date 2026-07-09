import 'server-only';
import { asc, count, desc, getTableColumns, type SQL } from 'drizzle-orm';
import { getTableConfig, type PgColumn, type PgTable } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import { contactSubmissions } from '@/db/schema';
import { account, passkey, session, user, verification } from '@/db/auth-schema';

/**
 * Registry + read queries for the /admin/database browser: a read-only,
 * schema-introspected view over every table. Tables and columns are derived
 * from the Drizzle table objects at module load (`getTableColumns` /
 * `getTableConfig`), so a table added to the schema only needs one
 * `makeEntry(...)` line here to appear in the browser.
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
  verification: ['value'],
  passkey: ['public_key', 'credential_id', 'counter', 'aaguid'],
};

// Name-pattern fallback so future tables are redacted-by-default: any column
// smelling like credential material is hidden unless someone consciously
// allowlists it. `*_expires_at` is exempt — token EXPIRY timestamps are
// harmless and genuinely useful when debugging auth.
const REDACT_PATTERN = /password|token|secret|credential/i;
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

/** Every browsable table, in picker order. First entry is the default view. */
export const DB_BROWSER_TABLES: DbBrowserTable[] = [
  makeEntry('Contact submissions', contactSubmissions),
  makeEntry('Users', user),
  makeEntry('Sessions', session),
  makeEntry('Accounts', account),
  makeEntry('Verifications', verification),
  makeEntry('Passkeys', passkey),
];

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
