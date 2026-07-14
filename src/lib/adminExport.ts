import 'server-only';

import {
  listSubmissionsForExport,
  type SubmissionKind,
} from '@/db/adminQueries';
import type { ContactSubmission } from '@/db/schema';
import { toCsv } from '@/lib/csv';

/**
 * CSV-export mechanics shared by the inquiries and applications export
 * routes. The routes stay thin (auth + delegation, sitemap-style); everything
 * that must not drift between the two views — range validation, header
 * hygiene, the status scope — lives here once.
 *
 * Exports deliberately ignore the open inbox tab: they're dataset downloads
 * for analysis, not view snapshots. Spam stays out (honeypot-flagged noise
 * would skew any numbers); the `status` column lets analysts split
 * new/read/archived themselves.
 */
const EXPORT_STATUSES: ContactSubmission['status'][] = [
  'new',
  'read',
  'archived',
];

// Preset tokens the ExportMenu sends; the label feeds the filename.
const RANGE_LABELS = {
  today: 'today',
  '7d': 'last-7-days',
  '30d': 'last-30-days',
  '90d': 'last-90-days',
  all: 'all-time',
} as const;

type ExportRange = keyof typeof RANGE_LABELS;

function isExportRange(value: string): value is ExportRange {
  return Object.hasOwn(RANGE_LABELS, value);
}

type Column = {
  header: string;
  cell: (row: ContactSubmission, origin: string) => string | null;
};

const BASE_COLUMNS: Column[] = [
  { header: 'id', cell: (row) => row.id },
  { header: 'created_at', cell: (row) => row.createdAt.toISOString() },
  { header: 'status', cell: (row) => row.status },
  { header: 'name', cell: (row) => row.name },
  { header: 'email', cell: (row) => row.email },
  { header: 'phone', cell: (row) => row.phone },
  { header: 'country', cell: (row) => row.country },
];

const COLUMNS: Record<SubmissionKind, Column[]> = {
  project: [
    ...BASE_COLUMNS,
    { header: 'company', cell: (row) => row.company },
    { header: 'instagram', cell: (row) => row.instagram },
    { header: 'website', cell: (row) => row.website },
    { header: 'referral_source', cell: (row) => row.referralSource },
    {
      header: 'services',
      // $type<string[]>() is a compile-time assertion only — read defensively.
      cell: (row) =>
        Array.isArray(row.services) ? row.services.join('; ') : '',
    },
    { header: 'message', cell: (row) => row.message },
  ],
  career: [
    ...BASE_COLUMNS,
    { header: 'referral_source', cell: (row) => row.referralSource },
    { header: 'role', cell: (row) => row.role },
    { header: 'portfolio_url', cell: (row) => row.portfolioUrl },
    { header: 'linkedin_url', cell: (row) => row.linkedinUrl },
    { header: 'message', cell: (row) => row.message },
    {
      // Absolute on purpose (clickable from a spreadsheet; the stream is
      // area-gated). Built from the REQUEST origin, not SITE_URL — that
      // constant falls back to prod and would point preview/local exports
      // at production rows.
      header: 'resume_url',
      cell: (row, origin) =>
        row.resumePath ? `${origin}/admin/applications/${row.id}/resume` : '',
    },
  ],
};

const FILENAME_SLUGS: Record<SubmissionKind, string> = {
  project: 'inquiries',
  career: 'applications',
};

/**
 * Validates `?range=` / `?since=` / `?d=` and streams the matching rows as a
 * CSV attachment. The caller has already authenticated + area-gated. `since`
 * comes from the client (its local midnight — "today" means the ADMIN's
 * today, not UTC's) and must be a parseable date BEFORE the query: drizzle's
 * timestamptz mapper throws on an Invalid Date, which would 500.
 */
export async function exportSubmissionsCsv(
  request: Request,
  kind: SubmissionKind,
): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const range = params.get('range') ?? '';
  if (!isExportRange(range)) {
    return new Response('Bad request', { status: 400 });
  }

  let since: Date | undefined;
  if (range !== 'all') {
    const raw = params.get('since');
    since = raw ? new Date(raw) : undefined;
    if (!since || Number.isNaN(since.getTime())) {
      return new Response('Bad request', { status: 400 });
    }
  }

  // Filename date: the client's local date when provided (an evening export
  // in Vancouver shouldn't be stamped with UTC's tomorrow), strictly
  // validated before it goes anywhere near the Content-Disposition header.
  const localDate = params.get('d');
  const date =
    localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
      ? localDate
      : new Date().toISOString().slice(0, 10);

  const rows = await listSubmissionsForExport({
    kind,
    statuses: EXPORT_STATUSES,
    since,
  });

  const columns = COLUMNS[kind];
  const csv = toCsv(
    columns.map((column) => column.header),
    rows.map((row) => columns.map((column) => column.cell(row, url.origin))),
  );

  const filename = `perseus-${FILENAME_SLUGS[kind]}-${RANGE_LABELS[range]}-${date}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
