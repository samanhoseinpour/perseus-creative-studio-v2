'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LuPaperclip as Paperclip,
  LuSend as Send,
  LuX as X,
} from 'react-icons/lu';
import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import { cn } from '@/lib/utils';
import { submitContact } from '@/app/contact/actions';
import { queueSubmission } from '@/lib/contactOutbox';
import {
  careerSchema,
  flattenIssues,
  normalizeUrl,
  projectSchema,
  resumeProblem,
  resumeSniffProblem,
} from '@/lib/contactSchema';
import ServicePicker, { type ServiceGroup } from './ServicePicker';

/**
 * The unified contact form: one Apple-style segmented control switches between
 * a client project inquiry and a job application. Both submit through the
 * `submitContact` server action (DB write + Resend notification); when the
 * visitor is offline the payload queues in the IndexedDB outbox instead and
 * replays through the same action on reconnect.
 *
 * This is deliberately the heavy module behind ContactHubLazy's dynamic()
 * split — it's the only client importer of zod, so that weight stays in the
 * contact page's async chunk instead of the shared eager chunk.
 */

export interface RoleOption {
  slug: string;
  title: string;
}

export interface ContactHubProps {
  initialTab: 'project' | 'career';
  /** Role slug from `/contact?role=…` — already validated by the page. */
  initialRole?: string;
  serviceGroups: ServiceGroup[];
  roles: RoleOption[];
}

type TabValue = 'project' | 'career';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'project', label: 'Start a project' },
  { value: 'career', label: 'Join the team' },
];

const COUNTRY_OPTIONS = [
  { value: 'CA', label: 'CA 🇨🇦' },
  { value: 'US', label: 'US 🇺🇸' },
  { value: 'EU', label: 'EU 🇪🇺' },
];

interface FieldsState {
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  instagram: string;
  website: string;
  services: string[];
  message: string;
  role: string;
  portfolioUrl: string;
  linkedinUrl: string;
  coverNote: string;
}

const inputClass =
  'block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30';

const selectChevron = (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-black/60"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const Field = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  composite,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  /** True when the "field" is a composite widget (chip picker, file trigger)
   *  rather than a labelable control — renders the heading as a plain span
   *  (`${htmlFor}-label`) for aria-labelledby instead of an orphaned label. */
  composite?: boolean;
  children: React.ReactNode;
}) => (
  <div className={className}>
    <div className="flex items-baseline justify-between gap-3">
      {composite ? (
        <span
          id={`${htmlFor}-label`}
          className="block text-sm/6 font-semibold"
        >
          {label}
          {required && ' *'}
        </span>
      ) : (
        <label htmlFor={htmlFor} className="block text-sm/6 font-semibold">
          {label}
          {required && ' *'}
        </label>
      )}
      {hint && (
        <span id={`${htmlFor}-hint`} className="text-xs text-black/40">
          {hint}
        </span>
      )}
    </div>
    <div className="mt-2.5">{children}</div>
    {error && (
      <p
        id={`${htmlFor}-error`}
        role="alert"
        className="mt-1.5 text-xs text-destructive"
      >
        {error}
      </p>
    )}
  </div>
);

const ContactHub = ({
  initialTab,
  initialRole,
  serviceGroups,
  roles,
}: ContactHubProps) => {
  const [tab, setTab] = useState<TabValue>(initialTab);
  const [fields, setFields] = useState<FieldsState>(() => ({
    name: '',
    email: '',
    phone: '',
    country: COUNTRY_OPTIONS[0].value,
    company: '',
    instagram: '',
    website: '',
    services: [],
    message: '',
    role: initialRole ?? '', // opening slug; already validated by the page
    portfolioUrl: '',
    linkedinUrl: '',
    coverNote: '',
  }));
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  // Fill-time start for the bot speed check — captured on mount, not in
  // render, so the component function stays pure.
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current ??= Date.now();
  }, []);

  // One idempotency key per fill session, reused across manual retries so a
  // lost-response retry can't double-write (the DB uniques on it). Cleared
  // only on confirmed success.
  const clientIdRef = useRef<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureClientId = () => {
    clientIdRef.current ??=
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return clientIdRef.current;
  };

  const set = (key: keyof FieldsState, value: string | string[]) => {
    // Any payload edit invalidates the retained idempotency key: an unchanged
    // retry after a lost response still dedups, but an *edited* resubmission
    // must become a new submission (not be swallowed as a duplicate of the
    // original that may already be stored).
    clientIdRef.current = null;
    setFields((f) => ({ ...f, [key]: value }));
  };

  const buildCandidate = (clientId: string, f: FieldsState) =>
    tab === 'project'
      ? {
          kind: 'project' as const,
          client_id: clientId,
          name: f.name,
          email: f.email,
          phone: f.phone,
          country: f.country,
          company: f.company,
          instagram: f.instagram,
          website: f.website,
          services: f.services,
          message: f.message,
        }
      : {
          kind: 'career' as const,
          client_id: clientId,
          name: f.name,
          email: f.email,
          phone: f.phone,
          country: f.country,
          role: f.role,
          portfolioUrl: f.portfolioUrl,
          linkedinUrl: f.linkedinUrl,
          coverNote: f.coverNote,
        };

  /** Re-check a single field on blur (with optional just-set values). */
  const validateField = (key: string, overrides?: Partial<FieldsState>) => {
    const schema = tab === 'project' ? projectSchema : careerSchema;
    const parsed = schema.safeParse(
      buildCandidate('blur-validation-only', { ...fields, ...overrides }),
    );
    const issues = parsed.success ? {} : flattenIssues(parsed.error);
    setErrors((prev) => {
      const next = { ...prev };
      if (issues[key]) next[key] = issues[key];
      else delete next[key];
      return next;
    });
  };

  const resetForm = () => {
    setFields({
      name: '',
      email: '',
      phone: '',
      country: COUNTRY_OPTIONS[0].value,
      company: '',
      instagram: '',
      website: '',
      services: [],
      message: '',
      role: '',
      portfolioUrl: '',
      linkedinUrl: '',
      coverNote: '',
    });
    setResume(null);
    setErrors({});
    clientIdRef.current = null;
    startedAt.current = Date.now();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildFormData = (clientId: string, elapsedMs: number) => {
    const fd = new FormData();
    fd.set('kind', tab);
    fd.set('client_id', clientId);
    fd.set('elapsed_ms', String(elapsedMs));
    fd.set('pcs_extra', honeypotRef.current?.value ?? '');
    fd.set('name', fields.name);
    fd.set('email', fields.email);
    fd.set('phone', fields.phone);
    fd.set('country', fields.country);
    if (tab === 'project') {
      fd.set('company', fields.company);
      fd.set('instagram', fields.instagram);
      fd.set('website', fields.website);
      for (const slug of fields.services) fd.append('services', slug);
      fd.set('message', fields.message);
    } else {
      fd.set('role', fields.role);
      fd.set('portfolioUrl', fields.portfolioUrl);
      fd.set('linkedinUrl', fields.linkedinUrl);
      fd.set('coverNote', fields.coverNote);
      if (resume) fd.set('resume', resume);
    }
    return fd;
  };

  const queueForLater = async (clientId: string, elapsedMs: number) => {
    const shared: Record<string, string | string[]> = {
      kind: tab,
      elapsed_ms: String(elapsedMs),
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      country: fields.country,
    };
    try {
      const record =
        tab === 'project'
          ? {
              id: clientId,
              fields: {
                ...shared,
                company: fields.company,
                instagram: fields.instagram,
                website: fields.website,
                services: fields.services,
                message: fields.message,
              },
            }
          : {
              id: clientId,
              fields: {
                ...shared,
                role: fields.role,
                portfolioUrl: fields.portfolioUrl,
                linkedinUrl: fields.linkedinUrl,
                coverNote: fields.coverNote,
              },
              // Snapshot the bytes now (inside the try, so a read failure
              // surfaces the error toast): a structured-cloned File can keep
              // a live on-disk reference that breaks replay if the visitor
              // moves the file before reconnecting.
              resume: resume
                ? {
                    name: resume.name,
                    type: resume.type,
                    lastModified: resume.lastModified,
                    bytes: await resume.arrayBuffer(),
                  }
                : undefined,
            };
      await queueSubmission(record);
    } catch {
      // IndexedDB can be unavailable (private-mode restrictions, storage
      // disabled, quota). Surface the failure — a silent drop loses the lead
      // while the visitor believes they submitted.
      toast.error('Couldn’t save your message', {
        description:
          'Offline storage isn’t available in this browser — please try again once you’re back online.',
      });
      return;
    }
    toast('Saved offline', {
      description:
        'We’ll send your inquiry automatically as soon as you’re back online.',
    });
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;

    const clientId = ensureClientId();
    const schema = tab === 'project' ? projectSchema : careerSchema;
    const parsed = schema.safeParse(buildCandidate(clientId, fields));
    const issues: Record<string, string> = parsed.success
      ? {}
      : flattenIssues(parsed.error);
    if (tab === 'career') {
      const problem = resumeProblem(resume);
      if (problem) issues.resume = problem;
    }
    if (Object.keys(issues).length > 0) {
      setErrors(issues);
      revealFirstError(issues);
      return;
    }
    setErrors({});

    const elapsedMs = startedAt.current ? Date.now() - startedAt.current : 0;

    // Offline up front: skip the network entirely and queue.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await queueForLater(clientId, elapsedMs);
      return;
    }

    setSending(true);
    try {
      const result = await submitContact(buildFormData(clientId, elapsedMs));
      if (result.ok) {
        toast.success(
          tab === 'project' ? 'Message sent' : 'Application sent',
          {
            description:
              tab === 'project'
                ? 'Thanks for reaching out — we’ve received your inquiry and will get back to you shortly.'
                : 'Thanks for applying — we’ve received your application and will be in touch.',
          },
        );
        resetForm();
      } else if (result.error === 'validation') {
        setErrors(result.issues);
        revealFirstError(result.issues);
      } else {
        toast.error('Message not sent', {
          description:
            'Something went wrong while sending your inquiry. Please try again in a moment.',
        });
      }
    } catch {
      // Server actions throw on network failure — if we just dropped offline,
      // queue it instead of telling the visitor it failed.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await queueForLater(clientId, elapsedMs);
      } else {
        toast.error('Message not sent', {
          description:
            'Something went wrong while sending your inquiry. Please try again in a moment.',
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleResumeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    clientIdRef.current = null; // a different resume = a different application
    const file = e.target.files?.[0] ?? null;
    // Type/size first, then the %PDF- sniff — the same pair the server runs.
    // Catching a mis-typed "PDF" here matters for the offline path: once
    // queued, a server-rejected record is dropped with no way to notify.
    const problem = file
      ? (resumeProblem(file) ?? (await resumeSniffProblem(file)))
      : null;
    setErrors((prev) => {
      const next = { ...prev };
      if (problem) next.resume = problem;
      else delete next.resume;
      return next;
    });
    if (problem || !file) {
      setResume(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setResume(file);
  };

  const clearResume = () => {
    clientIdRef.current = null;
    setResume(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Visitors paste bare domains — normalize to https:// on blur, then
  // re-validate with the normalized value (state hasn't committed yet).
  const handleUrlBlur = (
    key: 'portfolioUrl' | 'linkedinUrl',
    e: React.FocusEvent<HTMLInputElement>,
  ) => {
    const normalized = normalizeUrl(e.target.value);
    set(key, normalized);
    validateField(key, { [key]: normalized });
  };

  const invalidProps = (key: string) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });

  // After a failed submit, bring the first offending field into view (and
  // focus it when it's a plain control) — otherwise errors above the fold go
  // unnoticed on a long form.
  const FIELD_ORDER: Record<TabValue, string[]> = {
    project: ['name', 'email', 'phone', 'company', 'instagram', 'website', 'services', 'message'],
    career: ['name', 'email', 'phone', 'role', 'portfolioUrl', 'linkedinUrl', 'resume', 'coverNote'],
  };

  const revealFirstError = (issues: Record<string, string>) => {
    const first =
      FIELD_ORDER[tab].find((k) => issues[k]) ?? Object.keys(issues)[0];
    if (!first) return;
    // rAF so the error <p> exists after the setErrors re-render.
    requestAnimationFrame(() => {
      const el =
        document.getElementById(first) ??
        document.getElementById(`${first}-label`) ??
        document.getElementById(`${first}-error`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        el.focus({ preventScroll: true });
      }
    });
  };

  return (
    <section className="isolate py-24 sm:py-32">
      <Container className="flex max-w-5xl flex-col items-center justify-center">
        <Heading
          titleTag="h1"
          seperatorTitle="Contact"
          eyebrowRight="Start Here"
          title="Let’s work together"
          titleAccent="Start a project, or join the team."
          description="Tell us about your brand and goals — or the role you’re applying for. Our team reviews every submission and gets back to you shortly."
          containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl"
          descStyle="max-w-2xl text-center"
        />

        {/* Segmented control — a mode switch over one persistent form, so
            toggle-button semantics (like ThemeSwitcher/ServicePicker), not a
            tablist (which would demand roving tabindex + arrow-key wiring). */}
        <div
          role="group"
          aria-label="What are you contacting us about?"
          className="mt-10 inline-flex rounded-full border border-foreground/10 bg-background-contrast p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => {
                clientIdRef.current = null; // different kind = new submission
                setTab(t.value);
              }}
              className={cn(
                'cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300',
                tab === t.value
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-10 w-full">
          {/* Honeypot — visually hidden, not display:none (some bots skip
              those). The name and label deliberately avoid every word in the
              browsers' autofill vocabulary (organization/company/name/email/
              phone/…): Chrome ignores autocomplete="off" for address profiles
              and fills off-screen fields, and an autofilled honeypot would
              flag a real visitor's submission. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="pcs_extra">Leave this field empty</label>
            <input
              ref={honeypotRef}
              id="pcs_extra"
              name="pcs_extra"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {/* Shared fields — state persists across tab switches */}
            <Field label="Full Name" htmlFor="name" required error={errors.name}>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jon Doe"
                value={fields.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => validateField('name')}
                className={inputClass}
                {...invalidProps('name')}
              />
            </Field>

            <Field label="Email" htmlFor="email" required error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="info@perseustudio.com"
                value={fields.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => validateField('email')}
                className={inputClass}
                {...invalidProps('email')}
              />
            </Field>

            <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
              <div className="flex rounded-md bg-background-contrast">
                <div className="relative shrink-0">
                  <select
                    id="country"
                    autoComplete="country"
                    aria-label="Country"
                    value={fields.country}
                    onChange={(e) => set('country', e.target.value)}
                    className="w-full appearance-none rounded-md bg-transparent py-2 pr-8 pl-3.5 text-sm text-black"
                  >
                    {COUNTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {selectChevron}
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(+1) 7788878363"
                  value={fields.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  onBlur={() => validateField('phone')}
                  className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-sm text-black placeholder:text-black/30 focus:outline-none"
                  {...invalidProps('phone')}
                />
              </div>
            </Field>

            {tab === 'project' ? (
              <>
                <Field label="Company" htmlFor="company" error={errors.company}>
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Perseus Creative Studio"
                    value={fields.company}
                    onChange={(e) => set('company', e.target.value)}
                    onBlur={() => validateField('company')}
                    className={inputClass}
                    {...invalidProps('company')}
                  />
                </Field>

                <Field label="Instagram" htmlFor="instagram" error={errors.instagram}>
                  <input
                    id="instagram"
                    type="text"
                    placeholder="perseustudio"
                    value={fields.instagram}
                    onChange={(e) => set('instagram', e.target.value)}
                    onBlur={() => validateField('instagram')}
                    className={inputClass}
                    {...invalidProps('instagram')}
                  />
                </Field>

                <Field label="Website" htmlFor="website" error={errors.website}>
                  <input
                    id="website"
                    type="text"
                    placeholder="perseustudio.com"
                    value={fields.website}
                    onChange={(e) => set('website', e.target.value)}
                    onBlur={() => validateField('website')}
                    className={inputClass}
                    {...invalidProps('website')}
                  />
                </Field>

                <Field
                  label="Services you’re interested in"
                  htmlFor="services"
                  required
                  hint="Pick as many as you need"
                  error={errors.services}
                  className="sm:col-span-2"
                  composite
                >
                  <ServicePicker
                    groups={serviceGroups}
                    labelledBy="services-label"
                    describedBy={errors.services ? 'services-error' : undefined}
                    value={fields.services}
                    onChange={(next) => {
                      set('services', next);
                      if (next.length > 0) {
                        setErrors((prev) => {
                          const rest = { ...prev };
                          delete rest.services;
                          return rest;
                        });
                      }
                    }}
                  />
                </Field>

                <Field
                  label="Tell us more about your inquiry."
                  htmlFor="message"
                  error={errors.message}
                  className="sm:col-span-2"
                >
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Please tell us what you’re reaching out about and include any helpful details. We’ll respond as soon as possible."
                    value={fields.message}
                    onChange={(e) => set('message', e.target.value)}
                    onBlur={() => validateField('message')}
                    className={inputClass}
                    {...invalidProps('message')}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Role" htmlFor="role" required error={errors.role}>
                  <div className="relative">
                    <select
                      id="role"
                      value={fields.role}
                      onChange={(e) => {
                        set('role', e.target.value);
                        setErrors((prev) => {
                          const rest = { ...prev };
                          delete rest.role;
                          return rest;
                        });
                      }}
                      className={cn(inputClass, 'appearance-none pr-8')}
                      {...invalidProps('role')}
                    >
                      <option value="" disabled>
                        Choose a role…
                      </option>
                      {roles.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                    {selectChevron}
                  </div>
                </Field>

                <Field
                  label="Portfolio / Website"
                  htmlFor="portfolioUrl"
                  error={errors.portfolioUrl}
                >
                  <input
                    id="portfolioUrl"
                    type="url"
                    placeholder="yourportfolio.com"
                    value={fields.portfolioUrl}
                    onChange={(e) => set('portfolioUrl', e.target.value)}
                    onBlur={(e) => handleUrlBlur('portfolioUrl', e)}
                    className={inputClass}
                    {...invalidProps('portfolioUrl')}
                  />
                </Field>

                <Field label="LinkedIn" htmlFor="linkedinUrl" error={errors.linkedinUrl}>
                  <input
                    id="linkedinUrl"
                    type="url"
                    placeholder="linkedin.com/in/you"
                    value={fields.linkedinUrl}
                    onChange={(e) => set('linkedinUrl', e.target.value)}
                    onBlur={(e) => handleUrlBlur('linkedinUrl', e)}
                    className={inputClass}
                    {...invalidProps('linkedinUrl')}
                  />
                </Field>

                <Field
                  label="Resume"
                  htmlFor="resume"
                  required
                  hint="PDF, up to 4 MB"
                  error={errors.resume}
                  composite
                >
                  <div
                    role="group"
                    aria-labelledby="resume-label"
                    aria-describedby={cn(
                      'resume-hint',
                      errors.resume && 'resume-error',
                    )}
                  >
                  {resume ? (
                    <div className="flex w-full items-center justify-between gap-3 rounded-md bg-background-contrast px-3.5 py-2.5 text-sm text-black">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{resume.name}</span>
                        <span className="shrink-0 text-xs text-black/40 tabular-nums">
                          {(resume.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={clearResume}
                        aria-label="Remove resume"
                        className="cursor-pointer text-black/50 transition-colors hover:text-black"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-background-contrast px-3.5 py-2.5 text-sm text-black/40 transition-colors hover:text-black"
                    >
                      <span>Attach your resume</span>
                      <Paperclip className="size-4" aria-hidden="true" />
                    </button>
                  )}
                    <input
                      ref={fileInputRef}
                      id="resume-input"
                      aria-label="Resume PDF"
                      type="file"
                      accept="application/pdf"
                      onChange={handleResumeChange}
                      className="sr-only"
                      tabIndex={-1}
                    />
                  </div>
                </Field>

                <Field
                  label="Cover note"
                  htmlFor="coverNote"
                  error={errors.coverNote}
                  className="sm:col-span-2"
                >
                  <textarea
                    id="coverNote"
                    rows={4}
                    placeholder="Tell us a little about yourself, your experience, and why this role fits you."
                    value={fields.coverNote}
                    onChange={(e) => set('coverNote', e.target.value)}
                    onBlur={() => validateField('coverNote')}
                    className={inputClass}
                    {...invalidProps('coverNote')}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="mt-10">
            <Button
              type="submit"
              variant="primary"
              icon={Send}
              className="w-full disabled:pointer-events-none disabled:opacity-60"
              size="medium"
              disabled={sending}
            >
              {sending
                ? 'Sending…'
                : tab === 'project'
                  ? 'Submit inquiry'
                  : 'Submit application'}
            </Button>
            <p className="mt-4 text-center text-xs text-black/40">
              Your submission is stored securely and sent to our team.{' '}
              <Link
                href="/privacy-policy"
                className="underline transition-colors hover:text-black"
              >
                Privacy policy
              </Link>
            </p>
          </div>
        </form>
      </Container>
    </section>
  );
};

export default ContactHub;
