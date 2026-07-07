/**
 * Shared validation for the unified contact form (project inquiries + job
 * applications). Imported by BOTH the client form (instant field errors) and
 * the server action (authoritative re-validation), so it must stay a leaf:
 *
 *  - never import `@/constants/services` here — that 8k-line registry must not
 *    reach the client bundle. The schema only checks that services are
 *    slug-shaped; the server action owns the authoritative slug allow-list.
 *  - never import this module from `contactOutbox.ts` — the outbox rides
 *    OfflineBanner into every route's shared chunk, and zod belongs only in
 *    the contact page's async chunk (plus the server).
 */
import { z } from 'zod';

export const CONTACT_KINDS = ['project', 'career'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** Pseudo-service for "Something else / not sure" in the picker. */
export const OTHER_SERVICE_SLUG = 'other';

/**
 * "How did you hear about us?" options. Single source of truth shared by the
 * client chip row and the server allow-list — the schema only shape-checks the
 * slug (leaf-module rule); the server rejects anything not in this list.
 */
export const REFERRAL_OPTIONS = [
  { slug: 'google', label: 'Google' },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin', label: 'LinkedIn' },
  { slug: 'referral', label: 'Referral' },
  { slug: 'saw-our-work', label: 'Saw our work' },
  { slug: 'other', label: 'Other' },
] as const;

export type ReferralSlug = (typeof REFERRAL_OPTIONS)[number]['slug'];

/** Client cap for the resume upload; Vercel's hard body ceiling is 4.5 MB. */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

/**
 * Accepted resume formats. `File.type` is derived from the extension and is
 * often empty for drag-dropped files, so acceptance leans on the extension
 * with MIME as a cross-check; the authoritative gate is the magic-byte sniff
 * (sniffResumeKind) run on both client and server.
 */
export type ResumeKind = 'pdf' | 'doc' | 'docx';

export const RESUME_MIME: Record<ResumeKind, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** `accept` attribute value for the file input / dropzone. */
export const RESUME_ACCEPT = `.pdf,.doc,.docx,${Object.values(RESUME_MIME).join(',')}`;

/** Submissions filled faster than this are treated as bot traffic. */
export const MIN_FILL_MS = 3000;

// Optional text fields arrive as '' from empty inputs — normalize to undefined
// so "not provided" is one shape everywhere (form state, DB row, email).
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(max, `Please keep this under ${max.toLocaleString()} characters.`)
      .optional(),
  );

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.url('Enter a full link (e.g. https://…).').max(300).optional(),
);

// Charset-constrained, not z.uuid(): the allow-list covers both UUIDs and the
// legacy `${Date.now()}-${random36}` fallback ids from old queued records —
// and, since client_id feeds the Blob pathname, it forecloses any path
// characters ('/', '..') a hand-crafted request could smuggle in.
const clientId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

const sharedFields = {
  client_id: clientId,
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.email('Enter a valid email address.').max(200),
  phone: z.string().trim().min(7, 'Enter a valid phone number.').max(30),
  country: optionalText(8),
  // "How did you hear about us?" — optional; shape-checked here, allow-listed
  // server-side (REFERRAL_OPTIONS). Optional so legacy queued records that
  // never set it still validate on replay.
  referral_source: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(40)
      .optional(),
  ),
};

export const projectSchema = z.object({
  kind: z.literal('project'),
  ...sharedFields,
  company: optionalText(200),
  instagram: optionalText(200),
  website: optionalText(200),
  services: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .min(1, 'Pick at least one service — or “Something else”.')
    .max(30),
  message: optionalText(5000),
});

export const careerSchema = z.object({
  kind: z.literal('career'),
  ...sharedFields,
  // The opening's stable slug (deep-link/DB value; the server resolves the
  // display title from src/constants/careers.ts).
  role: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Choose a role.')
    .max(120),
  portfolioUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  coverNote: optionalText(5000),
});

export const contactSubmissionSchema = z.discriminatedUnion('kind', [
  projectSchema,
  careerSchema,
]);

export type ProjectSubmission = z.infer<typeof projectSchema>;
export type CareerSubmission = z.infer<typeof careerSchema>;
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

export type SubmitContactResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

const RESUME_BAD_TYPE = 'Resume must be a PDF or Word document.';
const RESUME_EXT = /\.(pdf|docx?)$/i;
const MIME_SET = new Set<string>(Object.values(RESUME_MIME));

/**
 * The resume File is validated outside zod so the schema stays a plain
 * serializable-data schema shared by client and server. Returns a
 * human-readable problem, or null when the file is acceptable.
 *
 * Accepts PDF and Word (.doc/.docx). `File.type` is trusted only when present
 * and known; drag-dropped files (and Files rebuilt from the offline outbox)
 * often carry an empty type, so we fall back to the extension. Either way the
 * authoritative check is the magic-byte sniff below.
 */
export function resumeProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Attach your resume (PDF or Word).';
  }
  const typeOk =
    file.type === ''
      ? RESUME_EXT.test(file.name)
      : MIME_SET.has(file.type) || RESUME_EXT.test(file.name);
  if (!typeOk) {
    return RESUME_BAD_TYPE;
  }
  if (file.size > MAX_RESUME_BYTES) {
    return 'Resume must be 4 MB or smaller.';
  }
  return null;
}

/**
 * Magic-byte sniff shared by client (file-pick time) and server (defense in
 * depth, and the authoritative extension/content-type source). `File.type`
 * comes from the filename, so a renamed .docx can report application/pdf — but
 * won't carry the %PDF- signature. Client-side this matters for the offline
 * path: a mis-typed file that enters the queue would be rejected at replay and
 * dropped with no way to tell the visitor.
 *
 * Returns the detected kind, or null when the content matches none. Note the
 * OLE signature also fronts legacy .xls/.ppt and the ZIP signature fronts any
 * zip container (incl. .docx) — same tolerance class as a bare %PDF- check;
 * the resume is stored privately and mailed as an inert attachment.
 */
export async function sniffResumeKind(file: File): Promise<ResumeKind | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const startsWith = (sig: number[]) =>
    head.length >= sig.length && sig.every((b, i) => head[i] === b);

  // %PDF-
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  // ZIP local file header (PK\x03\x04) — the .docx container
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) return 'docx';
  // OLE compound file (legacy .doc)
  if (startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc';
  return null;
}

/**
 * Thin wrapper preserving the original `resumeProblem ?? resumeSniffProblem`
 * call sites: returns null when the content matches an accepted kind, else the
 * human-readable problem.
 */
export async function resumeSniffProblem(file: File): Promise<string | null> {
  return (await sniffResumeKind(file)) ? null : RESUME_BAD_TYPE;
}

/** First message per field from a failed parse, for inline display. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/** Visitors paste bare domains — make them URL-shaped before validating. */
export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v || /^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * FormData → the object shape `contactSubmissionSchema` expects. Used by the
 * server action for both live submissions and outbox replays.
 */
export function submissionFromFormData(
  fd: FormData,
): Record<string, unknown> {
  const str = (key: string) => {
    const v = fd.get(key);
    return typeof v === 'string' ? v : undefined;
  };
  const shared = {
    kind: str('kind'),
    client_id: str('client_id'),
    name: str('name'),
    email: str('email'),
    phone: str('phone'),
    country: str('country'),
    referral_source: str('referral_source'),
  };
  if (shared.kind === 'career') {
    return {
      ...shared,
      role: str('role'),
      portfolioUrl: str('portfolioUrl'),
      linkedinUrl: str('linkedinUrl'),
      coverNote: str('coverNote'),
    };
  }
  return {
    ...shared,
    company: str('company'),
    instagram: str('instagram'),
    website: str('website'),
    services: fd
      .getAll('services')
      .filter((v): v is string => typeof v === 'string'),
    message: str('message'),
  };
}
