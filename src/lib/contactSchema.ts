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

/** Client cap for the resume upload; Vercel's hard body ceiling is 4.5 MB. */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

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

/**
 * The resume File is validated outside zod so the schema stays a plain
 * serializable-data schema shared by client and server. Returns a
 * human-readable problem, or null when the file is acceptable.
 */
export function resumeProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Attach your resume as a PDF.';
  }
  if (file.type !== 'application/pdf') {
    return 'Resume must be a PDF file.';
  }
  if (file.size > MAX_RESUME_BYTES) {
    return 'Resume must be 4 MB or smaller.';
  }
  return null;
}

/**
 * Content sniff shared by client (file-pick time) and server (defense in
 * depth): `File.type` comes from the filename extension, so a renamed .docx
 * reports application/pdf — but won't start with the %PDF- magic bytes.
 * Client-side this matters for the offline path: a mis-typed file that
 * enters the queue would be rejected at replay and dropped with no way to
 * tell the visitor.
 */
export async function resumeSniffProblem(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    head.length === 5 &&
    head[0] === 0x25 && // %
    head[1] === 0x50 && // P
    head[2] === 0x44 && // D
    head[3] === 0x46 && // F
    head[4] === 0x2d; // -
  return isPdf ? null : 'Resume must be a PDF file.';
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
