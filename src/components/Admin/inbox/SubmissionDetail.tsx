import 'server-only';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuFileText,
  LuDownload,
  LuTriangleAlert,
} from 'react-icons/lu';

import type { ContactSubmission } from '@/db/schema';
import { roleTitle } from '@/constants/careers';
import { serviceTitle } from '@/constants/services';
import { GlassPanel } from '@/components/Admin/Glass';
import { formatDateTime } from './format';
import StatusBadge from './StatusBadge';
import SubmissionActions from './SubmissionActions';
import MarkReadOnOpen from './MarkReadOnOpen';

// The full read-only submission view + the triage action bar. Both detail pages
// (inquiries / applications) render this; they differ only in the kind guard
// and the list they link back to. Slug→title resolution and date formatting
// happen here (server) so the client action bar takes only plain values.
export default function SubmissionDetail({
  submission,
  listHref,
  listLabel,
}: {
  submission: ContactSubmission;
  listHref: string;
  listLabel: string;
}) {
  const s = submission;
  const isCareer = s.kind === 'career';
  const replySubject = isCareer
    ? 'Re: your application — Perseus Creative Studio'
    : 'Re: your inquiry — Perseus Creative Studio';

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href={listHref}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to {listLabel}
      </Link>

      <header className="mb-6 flex flex-col gap-4 border-b border-white/45 pb-6 lg:flex-row lg:items-start lg:justify-between dark:border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {s.name}
            </h1>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isCareer ? 'Application' : 'Inquiry'} · {formatDateTime(s.createdAt)}
          </p>
        </div>
        <SubmissionActions
          id={s.id}
          status={s.status}
          email={s.email}
          replySubject={replySubject}
          listHref={listHref}
        />
      </header>

      {!s.emailSent && s.status !== 'spam' && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 backdrop-blur-sm dark:text-amber-400">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            The notification email for this submission didn’t send — the lead was
            still captured. Reply directly to follow up.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Contact">
          <Field label="Email" value={s.email} href={`mailto:${s.email}`} />
          <Field
            label="Phone"
            value={s.phone}
            href={s.phone ? `tel:${s.phone}` : undefined}
          />
          <Field label="Country" value={s.country} />
          <Field label="Heard via" value={s.referralSource} />
        </Section>

        {isCareer ? (
          <Section title="Application">
            <Field label="Role" value={s.role ? roleTitle(s.role) : null} />
            <Field
              label="Portfolio"
              value={s.portfolioUrl}
              href={s.portfolioUrl ?? undefined}
              external
            />
            <Field
              label="LinkedIn"
              value={s.linkedinUrl}
              href={s.linkedinUrl ?? undefined}
              external
            />
            <ResumeField id={s.id} hasResume={Boolean(s.resumePath)} />
          </Section>
        ) : (
          <Section title="Project">
            <Field label="Company" value={s.company} />
            <Field label="Instagram" value={s.instagram} />
            <Field
              label="Website"
              value={s.website}
              href={s.website ?? undefined}
              external
            />
            <ServicesField services={s.services} />
          </Section>
        )}

        {s.message && (
          <Section title={isCareer ? 'Cover note' : 'Message'}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {s.message}
            </p>
          </Section>
        )}
      </div>

      {s.status === 'new' && <MarkReadOnOpen id={s.id} />}
    </div>
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
  external,
}: {
  label: string;
  value?: string | null;
  href?: string;
  external?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-sm text-foreground">
        {href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="break-words underline-offset-4 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </span>
    </div>
  );
}

function ServicesField({ services }: { services: string[] | null }) {
  const list = services ?? [];
  if (list.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        Services
      </span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((slug) => (
          <span
            key={slug}
            className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-2.5 py-1 text-xs text-foreground"
          >
            {serviceTitle(slug)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResumeField({ id, hasResume }: { id: string; hasResume: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">Résumé</span>
      {hasResume ? (
        <span className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href={`/admin/applications/${id}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <LuFileText className="h-4 w-4" aria-hidden="true" />
            View résumé
          </a>
          <a
            href={`/admin/applications/${id}/resume?dl`}
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <LuDownload className="h-3.5 w-3.5" aria-hidden="true" />
            Download
          </a>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          No résumé attached.
        </span>
      )}
    </div>
  );
}
