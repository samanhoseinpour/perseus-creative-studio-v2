import 'server-only';

import {
  adminListMonthPayments,
  adminGetRun,
  type AdminPaymentRow,
} from '@/db/payrollQueries';
import { toCsv } from '@/lib/csv';
import {
  effectiveRateMicro,
  formatAmountValue,
  RATE_SCALE,
  type PayrollCurrency,
} from '@/lib/payrollAmounts';

/**
 * CSV export mechanics for payroll, mirroring adminExport.ts — the route stays
 * thin (auth + delegation) and everything that must not drift lives here.
 *
 * `?month=YYYY-MM` exports one month; `?year=YYYY` exports all twelve. Amounts go
 * out as BARE decimal strings in their own currency column rather than formatted
 * labels: a spreadsheet has to be able to sum the column, and "184,800,000 toman"
 * is text. Two amount columns exist for the same reason — mixing CAD cents and
 * toman in one column would produce a meaningless total.
 *
 * The response is `private, no-store`: this file is every member's salary in one
 * place, and it must not sit in a shared cache.
 */
const MONTH_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^20\d{2}$/;

const COLUMNS = [
  'month',
  'member',
  'status',
  'anchor_currency',
  'anchor_amount',
  'paid_currency',
  'paid_amount',
  'rate_toman_per_cad',
  'effective_rate_toman_per_cad',
  'company_cost_cad',
  'wire_fee_cad',
  'days_paid',
  'days_in_month',
  'proration_note',
  'sent_at_utc',
  'received_at_utc',
  'wire_ref',
  'invoice_ref',
  'member_note',
  'admin_note',
] as const;

function row(
  payment: AdminPaymentRow,
  runRateMicro: number | null,
  invoiceRef: string | null,
): (string | null)[] {
  const rate = payment.rateMicro ?? runRateMicro;
  const effective = effectiveRateMicro(
    payment.anchorAmount,
    payment.anchorCurrency,
    payment.paidAmount,
    payment.paidCurrency,
  );
  const bare = (minor: number, currency: PayrollCurrency) =>
    // No grouping separators — Excel would read "184,800,000" as text.
    formatAmountValue(minor, currency).replace(/,/g, '');
  // Full stored precision, NOT formatRate(): that formatter caps at 4 decimals
  // for display, while rate_micro carries six — and every rate on the two real
  // invoices uses all six (123300.001233, 131999.260804). Truncating here means
  // anchor x exported_rate stops reproducing the invoice line this CSV exists to
  // reconcile against.
  const rateValue = (micro: number) => String(micro / RATE_SCALE);

  return [
    payment.month,
    payment.memberName,
    payment.status,
    payment.anchorCurrency,
    bare(payment.anchorAmount, payment.anchorCurrency),
    payment.paidCurrency,
    payment.paidAmount > 0 ? bare(payment.paidAmount, payment.paidCurrency) : '',
    rate ? rateValue(rate) : '',
    effective ? rateValue(effective) : '',
    bare(payment.costCadCents, 'CAD'),
    bare(payment.feeCadCents, 'CAD'),
    payment.proratedDays ? String(payment.proratedDays) : '',
    payment.monthDays ? String(payment.monthDays) : '',
    payment.prorationNote,
    payment.sentAt ? payment.sentAt.toISOString() : '',
    payment.receivedAt ? payment.receivedAt.toISOString() : '',
    payment.wireRef,
    invoiceRef,
    payment.memberNote,
    payment.adminNote,
  ];
}

export async function exportPayrollCsv(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? '';
  const year = url.searchParams.get('year') ?? '';

  let months: string[];
  let slug: string;
  if (MONTH_RE.test(month)) {
    months = [month];
    slug = month;
  } else if (YEAR_RE.test(year)) {
    months = Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
    );
    slug = year;
  } else {
    // Strict, like adminExport's range check: a typo'd param must not silently
    // export something else.
    return new Response('Pass ?month=YYYY-MM or ?year=YYYY', { status: 400 });
  }

  const rows: (string | null)[][] = [];
  for (const m of months) {
    const [payments, run] = await Promise.all([
      adminListMonthPayments(m),
      adminGetRun(m),
    ]);
    for (const payment of payments) {
      rows.push(row(payment, run?.rateMicro ?? null, run?.invoiceRef ?? null));
    }
  }

  const csv = toCsv([...COLUMNS], rows);
  const filename = `perseus-payroll-${slug}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Every member's salary in one file — never a shared cache.
      'Cache-Control': 'private, no-store',
    },
  });
}
