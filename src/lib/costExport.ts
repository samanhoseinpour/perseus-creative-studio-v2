import 'server-only';

import {
  listMonthEntries,
  listYearEntries,
  type CostEntryRow,
} from '@/db/costQueries';
import { toCsv } from '@/lib/csv';
import { costCategoryLabel } from '@/lib/costFields';
import { formatAmountValue } from '@/lib/payrollAmounts';

/**
 * CSV export mechanics for company costs, mirroring payrollExport.ts — the
 * route stays thin (auth + delegation) and everything that must not drift
 * lives here.
 *
 * `?month=YYYY-MM` exports one month; `?year=YYYY` exports the whole year.
 * Amounts go out as BARE decimal strings rather than formatted labels: a
 * spreadsheet has to be able to sum the column, and "1,299.60" is text to
 * Excel. One amount column is enough here — unlike payroll there is only ever
 * one currency, so the total is always meaningful.
 *
 * The response is `private, no-store`: this file is the company's entire cost
 * base in one place, and it must not sit in a shared cache.
 */
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^20\d{2}$/;

const COLUMNS = [
  'month',
  'charged_on',
  'name',
  'vendor',
  'category',
  'amount_cad',
  'billed_as',
  'invoice_ref',
  'recorded_by',
  'note',
] as const;

/** No grouping separators — Excel would read "1,299.60" as text. */
const bare = (cents: number) =>
  formatAmountValue(cents, 'CAD').replace(/,/g, '');

function row(entry: CostEntryRow): (string | null)[] {
  return [
    entry.month,
    entry.chargedOn,
    entry.name,
    entry.vendor,
    costCategoryLabel(entry.category),
    bare(entry.amountCadCents),
    entry.billedNote,
    entry.invoiceRef,
    entry.createdByName,
    entry.note,
  ];
}

export async function exportCostsCsv(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? '';
  const year = url.searchParams.get('year') ?? '';

  let entries: CostEntryRow[];
  let slug: string;
  if (MONTH_RE.test(month)) {
    entries = await listMonthEntries(month);
    slug = month;
  } else if (YEAR_RE.test(year)) {
    entries = await listYearEntries(Number(year));
    slug = year;
  } else {
    // Strict, the house rule: an absent param defaults like the page, but a
    // typo'd one must never silently export something else.
    return new Response('Pass ?month=YYYY-MM or ?year=YYYY', { status: 400 });
  }

  const csv = toCsv([...COLUMNS], entries.map(row));
  const filename = `perseus-costs-${slug}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // The company's whole cost base in one file — never a shared cache.
      'Cache-Control': 'private, no-store',
    },
  });
}
