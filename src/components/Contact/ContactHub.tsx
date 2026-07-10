'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import { toast } from 'sonner';
import { LuCheck as Check, LuSend as Send } from 'react-icons/lu';
import Button from '@/components/Button';
import { cn } from '@/lib/utils';
import { submitContact } from '@/app/(marketing)/contact/actions';
import { queueSubmission } from '@/lib/contactOutbox';
import { suggestEmail } from '@/lib/emailSuggest';
import {
  careerSchema,
  flattenIssues,
  MIN_FILL_MS,
  normalizePhone,
  normalizeUrl,
  phoneProblem,
  prettyPhone,
  projectSchema,
  resumeProblem,
  RESUME_ACCEPT,
  resumeSniffProblem,
} from '@/lib/contactSchema';
import ServicePicker, { type ServiceGroup } from './ServicePicker';
import ReferralChips from './ReferralChips';
import ResumeDropzone from './ResumeDropzone';
import {
  fieldControlClass,
  GroupRow,
  GroupSectionLabel,
  InsetGroup,
} from './FormGroups';

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
  { value: 'project', label: 'Inquiries' },
  { value: 'career', label: 'Join the team' },
];

const COUNTRY_OPTIONS = [
  { value: 'CA', label: 'CA 🇨🇦' },
  { value: 'US', label: 'US 🇺🇸' },
  { value: 'EU', label: 'EU 🇪🇺' },
];

// Matches the blur format prettyPhone produces (NANP) / expects (EU).
const PHONE_PLACEHOLDERS: Record<string, string> = {
  CA: '(778) 887-8363',
  US: '(212) 555-0134',
  EU: '+49 30 901820',
};

// sessionStorage draft — survives an accidental refresh/tab restore, dies
// with the tab (the right privacy scope for name/email/phone). Never holds
// the resume File; the honeypot isn't in state to begin with.
const DRAFT_KEY = 'perseus.contact-draft';

const DRAFT_STRING_KEYS = [
  'name',
  'email',
  'phone',
  'country',
  'referralSource',
  'company',
  'instagram',
  'website',
  'message',
  'role',
  'portfolioUrl',
  'linkedinUrl',
  'coverNote',
] as const;

// Country alone doesn't count — it defaults to CA on every visit.
const draftIsMeaningful = (f: Partial<FieldsState>) =>
  (f.services?.length ?? 0) > 0 ||
  DRAFT_STRING_KEYS.some((k) => k !== 'country' && (f[k]?.trim() ?? '') !== '');

interface FieldsState {
  name: string;
  email: string;
  phone: string;
  country: string;
  referralSource: string;
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

// Chevron for the borderless <select> rows (country, role). Absolutely
// positioned inside a `relative` wrapper.
const selectChevron = (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-black/50"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
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
    referralSource: '',
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
  // Non-blocking "did you mean gmail.com?" hint, computed on email blur.
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  // Which kind of submission just succeeded — the in-place success panel
  // renders instead of the form until "Send another message".
  const [submitted, setSubmitted] = useState<TabValue | null>(null);

  // Fill-time start for the bot speed check — captured on mount, not in
  // render, so the component function stays pure.
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current ??= Date.now();
  }, []);

  // Restore a same-tab draft on mount. Deliberately an effect, not a lazy
  // useState initializer: ContactHubLazy keeps SSR, so reading storage during
  // the first render would mismatch hydration. Once-guarded so a parent
  // re-render (new `roles` identity) can't re-apply the draft over live
  // edits. URL intent (?tab=careers / ?role=…) beats the draft; enum-ish
  // values are sanitized so a stale draft can't wedge the controlled selects.
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        v?: number;
        tab?: string;
        fields?: Record<string, unknown>;
      } | null;
      if (!draft || draft.v !== 1 || !draft.fields) return;
      const stored = draft.fields;
      const restored: Partial<FieldsState> = {};
      for (const key of DRAFT_STRING_KEYS) {
        const value = stored[key];
        if (typeof value === 'string') restored[key] = value;
      }
      if (Array.isArray(stored.services)) {
        restored.services = stored.services
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 30);
      }
      if (
        restored.country &&
        !COUNTRY_OPTIONS.some((o) => o.value === restored.country)
      ) {
        delete restored.country;
      }
      if (restored.role && !roles.some((r) => r.slug === restored.role)) {
        delete restored.role;
      }
      if (initialRole) restored.role = initialRole;
      setFields((f) => ({ ...f, ...restored }));
      // 'project' is the ambiguous default (bare /contact); an explicit
      // ?tab=careers or ?role= deep link always wins over the draft.
      if (
        (draft.tab === 'project' || draft.tab === 'career') &&
        initialTab === 'project' &&
        !initialRole
      ) {
        setTab(draft.tab);
      }
      // A restored draft skips the typing time the bot-speed floor expects —
      // backdate the timer so an immediate legitimate submit isn't flagged.
      if (draftIsMeaningful(restored)) {
        startedAt.current = Date.now() - MIN_FILL_MS;
      }
    } catch {
      // Private mode / disabled storage / corrupt JSON — best-effort only.
    }
  }, [initialRole, initialTab, roles]);

  // Persist the draft (debounced). An empty form deletes the key instead of
  // storing it — which is also what clears storage after resetForm.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (draftIsMeaningful(fields)) {
          sessionStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ v: 1, tab, fields }),
          );
        } else {
          sessionStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Quota / private mode — drafts are best-effort.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [tab, fields]);

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
          referral_source: f.referralSource,
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
          referral_source: f.referralSource,
          role: f.role,
          portfolioUrl: f.portfolioUrl,
          linkedinUrl: f.linkedinUrl,
          coverNote: f.coverNote,
        };

  /** Re-check a single field on blur (with optional just-set values). */
  const validateField = (key: string, overrides?: Partial<FieldsState>) => {
    const schema = tab === 'project' ? projectSchema : careerSchema;
    const candidate = { ...fields, ...overrides };
    const parsed = schema.safeParse(
      buildCandidate('blur-validation-only', candidate),
    );
    const issues = parsed.success ? {} : flattenIssues(parsed.error);
    // The country-aware phone check lives outside zod (client-only strictness
    // — a strict schema rule would delete outbox replays; see phoneProblem in
    // contactSchema.ts). Merged here the same way resumeProblem is at submit.
    if (key === 'phone' && !issues.phone) {
      const problem = phoneProblem(candidate.country, candidate.phone);
      if (problem) issues.phone = problem;
    }
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
      referralSource: '',
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
    setEmailSuggestion(null);
    clientIdRef.current = null;
    startedAt.current = Date.now();
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Immediate clear (the debounced persist effect would also delete it,
    // but a success → instant tab close must not strand a stale draft).
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Storage unavailable — nothing to clear.
    }
  };

  const buildFormData = (clientId: string, elapsedMs: number) => {
    const fd = new FormData();
    fd.set('kind', tab);
    fd.set('client_id', clientId);
    fd.set('elapsed_ms', String(elapsedMs));
    fd.set('pcs_extra', honeypotRef.current?.value ?? '');
    fd.set('name', fields.name);
    fd.set('email', fields.email);
    fd.set('phone', normalizePhone(fields.country, fields.phone));
    fd.set('country', fields.country);
    fd.set('referral_source', fields.referralSource);
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
      phone: normalizePhone(fields.country, fields.phone),
      country: fields.country,
      referral_source: fields.referralSource,
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
    // Same merge pattern as the resume: strict phone rules live outside zod.
    if (!issues.phone) {
      const problem = phoneProblem(fields.country, fields.phone);
      if (problem) issues.phone = problem;
    }
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
        // Lead-conversion signal for GA (via the GTM container). Consent-safe:
        // when GTM never booted (consent denied) this pushes into an inert
        // plain window.dataLayer array — no network, nothing leaves the page.
        sendGTMEvent({
          event: 'contact_submit',
          form: tab === 'project' ? 'inquiry' : 'application',
        });
        resetForm();
        setSubmitted(tab);
        // The panel replaces the long form the user just scrolled to the
        // bottom of — bring it into view and hand focus to its heading (that
        // focus is also what announces the outcome to screen readers).
        requestAnimationFrame(() => {
          const el = document.getElementById('contact-success-heading');
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el?.focus({ preventScroll: true });
        });
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

  // Shared by both the file <input> (browse) and the dropzone (drop). Any
  // resume change invalidates the retained idempotency key.
  const acceptResumeFile = async (file: File | null) => {
    clientIdRef.current = null; // a different resume = a different application
    // Type/size first, then the magic-byte sniff — the same pair the server
    // runs. Catching a mis-typed file here matters for the offline path: once
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

  const handleEmailBlur = () => {
    validateField('email');
    setEmailSuggestion(suggestEmail(fields.email));
  };

  const applyEmailSuggestion = () => {
    if (!emailSuggestion) return;
    set('email', emailSuggestion);
    validateField('email', { email: emailSuggestion });
    setEmailSuggestion(null);
  };

  // Blur: pretty-print a valid NANP number into the placeholder format and
  // re-validate with the just-formatted value (state hasn't committed yet) —
  // same normalize-on-blur pattern as handleUrlBlur below.
  const handlePhoneBlur = () => {
    const pretty = prettyPhone(fields.country, fields.phone);
    if (pretty !== fields.phone) set('phone', pretty);
    validateField('phone', { phone: pretty });
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
    project: [
      'name',
      'email',
      'phone',
      'company',
      'instagram',
      'website',
      'services',
      'message',
      'referral_source',
    ],
    career: [
      'name',
      'email',
      'phone',
      'role',
      'portfolioUrl',
      'linkedinUrl',
      'resume',
      'coverNote',
      'referral_source',
    ],
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

  const handleSendAnother = () => {
    setSubmitted(null);
    // The clicked button unmounts with the panel — focus would drop to
    // <body>; place it at the top of the fresh form instead.
    requestAnimationFrame(() => {
      document.getElementById('name')?.focus();
    });
  };

  // In-place confirmation replacing the form (and the tab switcher): stronger
  // reassurance than a vanishing toast, and it sets the reply expectation.
  // resetForm() already ran at success time, so state behind this is clean.
  if (submitted) {
    return (
      <div className="w-full rounded-2xl border border-black/[0.06] bg-background-contrast px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-black text-white">
          <Check className="size-6" aria-hidden="true" />
        </div>
        {/* tabIndex -1: post-submit focus target — programmatic focus on the
            heading is what announces the outcome to screen readers. */}
        <h2
          id="contact-success-heading"
          tabIndex={-1}
          className="mt-5 text-2xl font-semibold tracking-tight text-black focus:outline-none"
        >
          {submitted === 'project' ? 'Inquiry sent' : 'Application sent'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-black/60">
          {submitted === 'project'
            ? // Keep in sync with the reply-time promise in ContactDetails.
              'Thanks for reaching out — we’ve received your inquiry. We reply within 1 business day.'
            : 'Thanks for applying — our team reviews every application and will get back to you.'}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="medium"
            onClick={handleSendAnother}
          >
            Send another message
          </Button>
          <Link
            href="/projects"
            className="text-sm text-black/60 underline underline-offset-2 transition-colors hover:text-black"
          >
            Explore our work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Segmented control — a mode switch over one persistent form, so
            toggle-button semantics (like ThemeSwitcher/ServicePicker), not a
            tablist (which would demand roving tabindex + arrow-key wiring). */}
      <div
        role="group"
        aria-label="What are you contacting us about?"
        className="inline-flex rounded-full border border-foreground/10 bg-background-contrast p-1"
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

      <form
        onSubmit={handleSubmit}
        noValidate
        // Reading-measure cap only kicks in at lg, where the form sits in the
        // 1fr column beside the sticky rail. Below lg the layout is a single
        // column, so capping here would strand dead space on the right at
        // tablet widths — let the form fill instead.
        className="mt-8 w-full"
      >
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

        {/* About you — shared across both tabs; state persists on switch */}
        <GroupSectionLabel>About you</GroupSectionLabel>
        <InsetGroup>
          <GroupRow
            label="Full name"
            htmlFor="name"
            required
            error={errors.name}
          >
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jon Doe"
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => validateField('name')}
              className={fieldControlClass}
              {...invalidProps('name')}
            />
          </GroupRow>

          <GroupRow label="Email" htmlFor="email" required error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="info@perseustudio.com"
              value={fields.email}
              onChange={(e) => {
                set('email', e.target.value);
                setEmailSuggestion(null); // stale once the address changes
              }}
              onBlur={handleEmailBlur}
              className={fieldControlClass}
              {...invalidProps('email')}
            />
            {/* Always-mounted live region — one that mounts together with its
                content isn't reliably announced. Neutral hint, deliberately
                not the red role="alert" error slot: it never blocks submit. */}
            <div aria-live="polite">
              {emailSuggestion && (
                <button
                  type="button"
                  onClick={applyEmailSuggestion}
                  className="mt-1.5 cursor-pointer text-xs text-black/60 underline decoration-black/30 underline-offset-2 transition-colors hover:text-black"
                >
                  Did you mean{' '}
                  <span className="font-medium text-black">
                    {emailSuggestion}
                  </span>
                  ?
                </button>
              )}
            </div>
          </GroupRow>

          <GroupRow
            label="Phone number"
            htmlFor="phone"
            required
            error={errors.phone}
          >
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <select
                  id="country"
                  autoComplete="country"
                  aria-label="Country"
                  value={fields.country}
                  onChange={(e) => {
                    const next = e.target.value;
                    set('country', next);
                    // A country switch changes what "valid" means — re-check
                    // an already-filled number against the new selection.
                    if (fields.phone.trim()) {
                      validateField('phone', { country: next });
                    }
                  }}
                  className="appearance-none bg-transparent pr-6 text-sm text-black focus:outline-none"
                >
                  {COUNTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {selectChevron}
              </div>
              <span aria-hidden="true" className="text-black/15">
                |
              </span>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={
                  PHONE_PLACEHOLDERS[fields.country] ?? PHONE_PLACEHOLDERS.CA
                }
                value={fields.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={handlePhoneBlur}
                className="block min-w-0 grow bg-transparent text-sm text-black placeholder:text-black/30 focus:outline-none"
                {...invalidProps('phone')}
              />
            </div>
          </GroupRow>
        </InsetGroup>

        {tab === 'project' ? (
          <>
            <GroupSectionLabel>Your project</GroupSectionLabel>
            <InsetGroup>
              <GroupRow
                label="Company"
                htmlFor="company"
                hint="optional"
                error={errors.company}
              >
                <input
                  id="company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Perseus Creative Studio"
                  value={fields.company}
                  onChange={(e) => set('company', e.target.value)}
                  onBlur={() => validateField('company')}
                  className={fieldControlClass}
                  {...invalidProps('company')}
                />
              </GroupRow>

              <GroupRow
                label="Instagram"
                htmlFor="instagram"
                hint="optional"
                error={errors.instagram}
              >
                <input
                  id="instagram"
                  type="text"
                  placeholder="perseustudio"
                  value={fields.instagram}
                  onChange={(e) => set('instagram', e.target.value)}
                  onBlur={() => validateField('instagram')}
                  className={fieldControlClass}
                  {...invalidProps('instagram')}
                />
              </GroupRow>

              <GroupRow
                label="Website"
                htmlFor="website"
                hint="optional"
                error={errors.website}
              >
                <input
                  id="website"
                  type="text"
                  placeholder="perseustudio.com"
                  value={fields.website}
                  onChange={(e) => set('website', e.target.value)}
                  onBlur={() => validateField('website')}
                  className={fieldControlClass}
                  {...invalidProps('website')}
                />
              </GroupRow>
            </InsetGroup>

            <GroupSectionLabel
              id="services-label"
              required
              hint="Pick as many as you need"
            >
              What can we help you with?
            </GroupSectionLabel>
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
            {errors.services && (
              <p
                id="services-error"
                role="alert"
                className="mt-2 px-1 text-xs text-destructive"
              >
                {errors.services}
              </p>
            )}

            <GroupSectionLabel>Your message</GroupSectionLabel>
            <InsetGroup>
              <GroupRow
                label="Tell us more about your inquiry"
                htmlFor="message"
                hint="optional"
                error={errors.message}
              >
                <textarea
                  id="message"
                  rows={4}
                  // Root Lenis preventDefault()s wheel globally, so the
                  // overflowing textarea wouldn't scroll natively — this opts
                  // it out (same fix as MobileMenu's scroll container).
                  data-lenis-prevent
                  placeholder="Please tell us what you’re reaching out about and include any helpful details. We’ll respond as soon as possible."
                  value={fields.message}
                  onChange={(e) => set('message', e.target.value)}
                  onBlur={() => validateField('message')}
                  className={cn(fieldControlClass, 'resize-none')}
                  {...invalidProps('message')}
                />
              </GroupRow>
            </InsetGroup>
          </>
        ) : (
          <>
            <GroupSectionLabel>The role</GroupSectionLabel>
            <InsetGroup>
              <GroupRow
                label="Role"
                htmlFor="role"
                required
                error={errors.role}
              >
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
                    className={cn(
                      fieldControlClass,
                      'appearance-none pr-8',
                      !fields.role && 'text-black/30',
                    )}
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
              </GroupRow>

              <GroupRow
                label="Portfolio / Website"
                htmlFor="portfolioUrl"
                hint="optional"
                error={errors.portfolioUrl}
              >
                <input
                  id="portfolioUrl"
                  type="url"
                  placeholder="yourportfolio.com"
                  value={fields.portfolioUrl}
                  onChange={(e) => set('portfolioUrl', e.target.value)}
                  onBlur={(e) => handleUrlBlur('portfolioUrl', e)}
                  className={fieldControlClass}
                  {...invalidProps('portfolioUrl')}
                />
              </GroupRow>

              <GroupRow
                label="LinkedIn"
                htmlFor="linkedinUrl"
                hint="optional"
                error={errors.linkedinUrl}
              >
                <input
                  id="linkedinUrl"
                  type="url"
                  placeholder="linkedin.com/in/you"
                  value={fields.linkedinUrl}
                  onChange={(e) => set('linkedinUrl', e.target.value)}
                  onBlur={(e) => handleUrlBlur('linkedinUrl', e)}
                  className={fieldControlClass}
                  {...invalidProps('linkedinUrl')}
                />
              </GroupRow>
            </InsetGroup>

            <GroupSectionLabel
              id="resume-label"
              required
              hint="PDF or Word, up to 4 MB"
            >
              Resume
            </GroupSectionLabel>
            <ResumeDropzone
              file={resume}
              inputRef={fileInputRef}
              onPick={acceptResumeFile}
              onClear={clearResume}
              accept={RESUME_ACCEPT}
              hint="PDF or Word, up to 4 MB"
              labelledBy="resume-label"
              describedBy={errors.resume ? 'resume-error' : undefined}
              invalid={!!errors.resume}
            />
            {errors.resume && (
              <p
                id="resume-error"
                role="alert"
                className="mt-2 px-1 text-xs text-destructive"
              >
                {errors.resume}
              </p>
            )}

            <GroupSectionLabel>Cover note</GroupSectionLabel>
            <InsetGroup>
              <GroupRow
                label="Cover note"
                htmlFor="coverNote"
                hint="optional"
                error={errors.coverNote}
              >
                <textarea
                  id="coverNote"
                  rows={4}
                  // See the message textarea above — opt out of root Lenis so
                  // the overflowing field scrolls natively.
                  data-lenis-prevent
                  placeholder="Tell us a little about yourself, your experience, and why this role fits you."
                  value={fields.coverNote}
                  onChange={(e) => set('coverNote', e.target.value)}
                  onBlur={() => validateField('coverNote')}
                  className={cn(fieldControlClass, 'resize-none')}
                  {...invalidProps('coverNote')}
                />
              </GroupRow>
            </InsetGroup>
          </>
        )}

        {/* Shared across both tabs — optional attribution. */}
        <GroupSectionLabel id="referral_source-label" hint="optional">
          How did you hear about us?
        </GroupSectionLabel>
        <ReferralChips
          value={fields.referralSource}
          onChange={(v) => set('referralSource', v)}
          labelledBy="referral_source-label"
        />

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
          <p className="mt-4 text-center text-xs text-black/60">
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
    </div>
  );
};

export default ContactHub;
