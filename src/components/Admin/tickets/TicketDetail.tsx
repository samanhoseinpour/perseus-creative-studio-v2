import 'server-only';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuDownload,
  LuImage,
  LuTriangleAlert,
} from 'react-icons/lu';

import type { Ticket } from '@/db/schema';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import { formatDateTime } from '@/components/Admin/inbox/format';
import { ticketAreaLabel, TICKET_SEVERITY_LABELS } from '@/lib/ticketFields';
import { cn } from '@/lib/utils';
import TicketStatusBadge from './TicketStatusBadge';
import TicketSeverityBadge from './TicketSeverityBadge';
import TicketActions from './TicketActions';

/**
 * The full read-only ticket view + (for triagers) the status action bar —
 * SubmissionDetail's layout, re-pointed at a ticket. Date formatting and
 * label resolution happen here (server) so the client action bar takes only
 * plain values.
 */
export default function TicketDetail({
  ticket,
  listHref,
  canTriage,
}: {
  ticket: Ticket;
  listHref: string;
  canTriage: boolean;
}) {
  const t = ticket;
  // `area` is stored as plain text; ticketAreaLabel falls back to the raw
  // slug if the nav-derived catalog ever drops one.
  const areaLabel = ticketAreaLabel(t.area);
  const updated = t.updatedAt.getTime() !== t.createdAt.getTime();

  return (
    <AdminPage width="narrow">
      <Link
        href={listHref}
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to tickets
      </Link>

      <header className="mb-6 flex flex-col gap-4 border-b border-white/45 pb-6 lg:flex-row lg:items-start lg:justify-between dark:border-white/10">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-foreground">
              {t.title}
            </h1>
            <TicketStatusBadge status={t.status} />
            <TicketSeverityBadge severity={t.severity} />
          </div>
          <p className="text-sm text-muted-foreground">
            Reported by {t.reporterName} · {formatDateTime(t.createdAt)}
          </p>
        </div>
        {canTriage && <TicketActions id={t.id} status={t.status} />}
      </header>

      {!t.emailSent && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 backdrop-blur-sm dark:text-amber-400">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            The notification email for this ticket didn’t send — the ticket was
            still saved.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Report">
          <Field label="Area" value={areaLabel} />
          <Field label="Severity" value={TICKET_SEVERITY_LABELS[t.severity]} />
          <Field
            label="Reporter"
            value={`${t.reporterName} — ${t.reporterEmail}`}
            href={`mailto:${t.reporterEmail}`}
          />
          <Field label="Reported" value={formatDateTime(t.createdAt)} />
          {updated && (
            <Field label="Last update" value={formatDateTime(t.updatedAt)} />
          )}
        </Section>

        <Section title="What happened">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {t.description}
          </p>
        </Section>

        {t.screenshotPath && <ScreenshotSection id={t.id} title={t.title} />}
      </div>
    </AdminPage>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </GlassPanel>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-sm text-foreground">
        {href ? (
          <a href={href} className={cn('break-words', adminLink)}>
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </span>
    </div>
  );
}

function ScreenshotSection({ id, title }: { id: string; title: string }) {
  const src = `/admin/tickets/${id}/screenshot`;
  return (
    <Section title="Screenshot">
      {/* Streamed from a private blob via the authorized route handler —
          next/image can't optimize it (the custom loader maps only the
          pre-generated /images variants), so a plain img is correct here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Screenshot attached to “${title}”`}
        className="max-h-[480px] w-fit max-w-full rounded-lg border border-white/50 dark:border-white/12"
      />
      <span className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 font-medium text-foreground',
            adminLink,
          )}
        >
          <LuImage className="h-4 w-4" aria-hidden="true" />
          View full size
        </a>
        <a
          href={`${src}?dl`}
          className={cn(
            'inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          <LuDownload className="h-3.5 w-3.5" aria-hidden="true" />
          Download
        </a>
      </span>
    </Section>
  );
}
