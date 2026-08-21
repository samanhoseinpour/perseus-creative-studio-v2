import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getReportShareByToken } from '@/db/taskQueries';
import { ReportPrintSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';
import PrintButton from '@/components/Admin/reports/PrintButton';
import {
  AwaitingApproval,
  CategoryBars,
  MemberBars,
  ReportTaskTable,
  RetainerBar,
  TrendBars,
  WeekBars,
} from '@/components/Admin/reports/ReportSections';
import { buildClientMonthReportById } from '@/components/Admin/reports/reportData';
import ClientMark from '@/components/Admin/tasks/ClientMark';
import { PRINT_SHEET_CSS } from '@/lib/printSheet';
import { resolveZone, zonedFormat } from '@/lib/calendar';

/**
 * The public read-only report a client receives — /share/reports/<token>.
 * Lives OUTSIDE both route groups: document shell only (no marketing chrome,
 * no analytics, no Lenis, no admin gate — the unguessable token is the whole
 * credential). It DOES follow the reader's theme on screen — a client opening
 * this on a phone in dark mode is the common case, and a sheet that ignores it
 * reads as a broken page rather than a document; print-tone discipline moved to
 * the `print:` half, where PRINT_SHEET_CSS pins the ground and the literal
 * neutrals pin the ink. A LIVE recompute, not a snapshot — consistent with the
 * no-month-lock v1 decision.
 *
 * public/sw.js bypasses /share/ entirely (pcs-v8) — a tokenized client
 * report must never land in shared Cache Storage.
 *
 * Two-stage render, and the split is the status code: the page itself awaits
 * only the single token lookup, so a bogus or revoked link gets a REAL 404
 * status — a route-level loading.tsx committed a 200 shell before notFound()
 * could resolve, leaving dead links soft-404s that scanners and previewers
 * read as live. The multi-query report build then streams behind the inline
 * <Suspense>, so a valid link keeps the instant skeleton the loading file
 * used to provide. Don't reintroduce loading.tsx here.
 */

// Revocation must bite on the very next request — never a cached render.
export const dynamic = 'force-dynamic';

// One token resolution per request, shared by the status gate, the metadata,
// and the report body.
const resolveShare = cache((token: string) => getReportShareByToken(token));

// The full report build, shared by generateMetadata and the page body.
const resolveReport = cache(async (token: string) => {
  const share = await resolveShare(token);
  if (!share) return null;
  // The MINTING ADMIN's zone, not the reader's — this page is opened by a
  // client anywhere in the world, and a report whose month boundaries followed
  // whoever opened it would hand the client different numbers than the admin
  // saw before sending the link. Frozen at mint time; links older than the
  // column fall back to studio time.
  const tz = resolveZone(share.timezone);
  const report = await buildClientMonthReportById(tz, share.clientId, share.month);
  return report && { report, tz };
});

const PREPARED_OPTS: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolveReport(token);
  const report = resolved?.report ?? null;
  return {
    // REQUIRED: the root layout sets no robots directive at all (marketing
    // and admin each own theirs), so omitting this would leave the tokenized
    // page indexable-by-default. robots.txt stays untouched on purpose — a
    // crawler must be able to fetch the page to see the noindex.
    robots: { index: false, follow: false },
    title: report
      ? `${report.client.name} — ${report.monthLabelText} report · Perseus Creative Studio`
      : 'Report · Perseus Creative Studio',
    description: 'Monthly delivery report from Perseus Creative Studio.',
  };
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Malformed, unknown, and revoked tokens 404 identically — and because
  // nothing has streamed yet, the status is a literal 404.
  if (!(await resolveShare(token))) notFound();
  return (
    <Suspense fallback={<ReportPrintSkeleton />}>
      <SharedReportBody token={token} />
    </Suspense>
  );
}

async function SharedReportBody({ token }: { token: string }) {
  const resolved = await resolveReport(token);
  const report = resolved?.report ?? null;
  // Race-only path (report_shares.client_id cascades with the client row):
  // reachable only if the client was deleted between the two lookups.
  if (!resolved || !report) notFound();
  const { tz } = resolved;

  return (
    <div className="min-h-svh bg-background text-foreground print:bg-transparent print:text-neutral-900">
      {/* Keeps the bar charts (browsers strip background colours at print) and
          pins the sheet's ground to a literal white — a client printing this
          from a dark-mode browser must not get a near-black A4. Shared with the
          admin print page and the payslip; see src/lib/printSheet.ts. */}
      <style>{PRINT_SHEET_CSS}</style>
      <PrintButton />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 print:max-w-none print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b border-border pb-6 print:border-neutral-200">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Perseus Creative Studio
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground print:text-neutral-500">
              Monthly delivery report
            </p>
          </div>
          <div className="text-right">
            <span className="flex items-center justify-end gap-2.5">
              {(report.client.logoBlobUrl ?? report.client.logoStaticPath) && (
                <ClientMark
                  name={report.client.name}
                  logo={
                    report.client.logoBlobUrl ?? report.client.logoStaticPath
                  }
                  size={36}
                />
              )}
              <h1 className="text-2xl font-semibold tracking-tight">
                {report.client.name}
              </h1>
            </span>
            <p className="mt-0.5 text-sm text-muted-foreground print:text-neutral-500">
              {report.monthLabelText}
            </p>
          </div>
        </header>

        {report.note && (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
              Month highlights
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground print:text-neutral-800">
              {report.note}
            </p>
          </section>
        )}

        <section className="mt-8 grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4">
          <ShareTile
            label="Tasks completed"
            value={String(report.tiles.tasksCompleted)}
          />
          <ShareTile
            label="Hours delivered"
            value={report.tiles.totalHoursLabel}
            // Interpretation, not comparison — the deltas stay admin-only,
            // but this line is what tells the client what the number bought.
            hint={report.tiles.hoursWorkdays}
          />
          <ShareTile
            label="Turnaround"
            value={report.tiles.turnaroundLabel}
            hint={report.tiles.turnaroundHint}
          />
          <ShareTile
            label="Members involved"
            value={String(report.tiles.membersInvolved)}
          />
        </section>

        {/* The page is force-dynamic and recomputed per view, so this stays
            accurate for the life of the link — and it's the only section a
            client can act on. Current month only. */}
        {report.open && report.open.awaitingApproval > 0 && (
          <AwaitingApproval
            tone="print"
            count={report.open.awaitingApproval}
            titles={report.open.awaitingTitles}
          />
        )}

        {report.retainer && (
          <RetainerBar
            tone="print"
            usedLabel={report.retainer.usedLabel}
            targetLabel={report.retainer.targetLabel}
            pct={report.retainer.pct}
            overLabel={report.retainer.overLabel}
          />
        )}

        {report.tiles.tasksCompleted > 0 ? (
          <>
            <CategoryBars
              tone="print"
              groups={report.categoryGroups}
              totalLabel={report.categoryTotalLabel}
            />
            <WeekBars tone="print" weeks={report.weeks} />
            <MemberBars tone="print" members={report.memberRows} />
            <ReportTaskTable
              tone="print"
              tasks={report.tasks}
              deliverables={report.deliverables}
            />
          </>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground print:text-neutral-500">
            No delivered work recorded in {report.monthLabelText}.
          </p>
        )}

        {report.trend.some((point) => point.pct > 0) && (
          <TrendBars tone="print" rows={report.trend} />
        )}

        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground print:border-neutral-200 print:text-neutral-500">
          Prepared {zonedFormat(tz, PREPARED_OPTS).format(new Date())} · Perseus Creative Studio ·
          teamperseustudio@gmail.com
        </footer>
      </div>
    </div>
  );
}

function ShareTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  /** Interpretation only ('≈ 3.3 work days (8h each)') — never a delta. */
  hint?: string | false;
}) {
  return (
    <div className="rounded-xl border border-border p-4 print:border-neutral-200">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[0.7rem] tabular-nums text-muted-foreground print:text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}
