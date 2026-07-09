import { formatDateTime } from '@/components/Admin/inbox/format';
// Type-only import — erased at compile time, so this module never touches the
// server-only dbBrowser runtime and stays importable from anywhere.
import type { DbColumnMeta } from '@/db/dbBrowser';

/**
 * Raw row → display cells for the /admin/database browser. Everything is
 * formatted here on the server into plain strings (dates included — see
 * inbox/format.ts for the hydration reasoning), so the table renderer receives
 * serializable data and stays a dumb server component.
 */

export type DbCellKind =
  | 'text'
  | 'id'
  | 'number'
  | 'boolean'
  | 'date'
  | 'json'
  | 'enum'
  | 'null'
  | 'redacted';

export type DbCell = {
  kind: DbCellKind;
  text: string;
  /** Longer (still capped) value for the cell's hover tooltip. */
  title?: string;
};

const TEXT_MAX = 64;
const JSON_MAX = 80;
const ID_MAX = 12;
// Cap tooltips too — user.image can hold a data URI and message can be huge;
// megabyte title attributes would bloat the HTML for no reading value.
const TITLE_MAX = 400;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function toCells(
  columns: DbColumnMeta[],
  row: Record<string, unknown>,
): DbCell[] {
  return columns.map((col) => toCell(col, row[col.tsKey]));
}

function toCell(col: DbColumnMeta, value: unknown): DbCell {
  // Redacted columns are excluded from the SELECT, so `value` is undefined
  // here regardless — this branch exists to label them, not to hide data.
  if (col.redacted) return { kind: 'redacted', text: '••• redacted' };
  if (value === null || value === undefined) return { kind: 'null', text: '—' };
  if (value instanceof Date) return { kind: 'date', text: formatDateTime(value) };
  if (typeof value === 'boolean')
    return { kind: 'boolean', text: value ? 'true' : 'false' };
  if (typeof value === 'number') return { kind: 'number', text: String(value) };
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return {
      kind: 'json',
      text: truncate(json, JSON_MAX),
      title: json.length > JSON_MAX ? truncate(json, TITLE_MAX) : undefined,
    };
  }

  const s = String(value);
  if (col.isEnum) return { kind: 'enum', text: s };
  if (col.isUuid || col.primary || /_id$/.test(col.name)) {
    return {
      kind: 'id',
      text: truncate(s, ID_MAX),
      title: s.length > ID_MAX ? truncate(s, TITLE_MAX) : undefined,
    };
  }
  return {
    kind: 'text',
    text: truncate(s, TEXT_MAX),
    title: s.length > TEXT_MAX ? truncate(s, TITLE_MAX) : undefined,
  };
}
