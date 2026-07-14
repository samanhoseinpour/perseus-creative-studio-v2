/**
 * Minimal CSV writer for the admin exports — RFC 4180 quoting, CRLF records,
 * and a UTF-8 BOM so Excel decodes accents without the import wizard.
 *
 * Cells are guarded against spreadsheet formula injection (a leading = + - @
 * tab or CR makes Excel/Sheets evaluate attacker-controlled contact-form text
 * as a formula): risky cells get a leading apostrophe — Excel's text marker —
 * added BEFORE quoting so it lands inside the quotes. International phone
 * numbers (`+1 604…`) are exempt: digits and separators can't form a callable
 * formula, and the apostrophe would surface as literal noise in pandas/Sheets.
 */

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PHONE_SHAPE = /^\+[\d\s().-]+$/;

function cell(value: string | null | undefined): string {
  if (value == null) return '';
  const guarded =
    FORMULA_PREFIX.test(value) && !PHONE_SHAPE.test(value)
      ? `'${value}`
      : value;
  return NEEDS_QUOTES.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/** Serialize one table; the header row gets the same escaping as data rows. */
export function toCsv(
  header: string[],
  rows: (string | null | undefined)[][],
): string {
  const records = [header, ...rows].map((row) => row.map(cell).join(','));
  return '\uFEFF' + records.join('\r\n') + '\r\n';
}
