import 'server-only';
import {
  del,
  list,
  put,
  type ListCommandOptions,
  type PutCommandOptions,
} from '@vercel/blob';

/**
 * The one door to the PUBLIC Blob store — `src/lib/mail.ts`'s "single door"
 * discipline, applied to blob storage.
 *
 * WHY TWO STORES: a Vercel Blob store's access mode is fixed when the store is
 * created (the API/CLI can create, empty, and delete a store — never convert
 * one), so a single store cannot serve both halves of this app. The original
 * store, `perseus-blob-storage`, was created private for résumés and also holds
 * avatars and ticket screenshots — PII that must only ever reach a viewer
 * through an authenticated route handler doing `get(pathname, { access:
 * 'private' })`. Client logos and project media are the opposite: anonymous
 * visitors render them on the marquee, project cards, and shared reports, so
 * they want CDN URLs and no function invocation per view. Those two namespaces
 * therefore live in `perseus-public-assets`, reached with its own token:
 *
 *     clients/**  projects/**              → perseus-public-assets  (public)
 *     resumes/**  avatars/**  tickets/**   → perseus-blob-storage   (private)
 *
 * Private callers keep importing `@vercel/blob` directly and keep riding the
 * default `BLOB_READ_WRITE_TOKEN`. Public callers must come through here: a
 * bare `put(..., { access: 'public' })` against the default token targets the
 * private store and fails with "Cannot use public access on a private store"
 * — which is exactly the bug these wrappers exist to make unrepeatable.
 */

/** Namespaces this store is allowed to hold (see the table above). */
const PUBLIC_PREFIXES = ['clients/', 'projects/'] as const;

type PutBody = Parameters<typeof put>[1];

/** `access` and the credential fields are this module's job, not the caller's. */
type Credentials = 'token' | 'oidcToken' | 'storeId';
type PutPublicOptions = Omit<PutCommandOptions, 'access' | Credentials>;
type ListPublicOptions = Omit<ListCommandOptions, Credentials>;

/**
 * Read the token per call, not at module scope: this module is imported by the
 * portfolio server actions, so a module-scope throw would take down every
 * render that touches them instead of just the one upload that needs it.
 *
 * Deliberately NO fallback to `BLOB_READ_WRITE_TOKEN` — falling back would
 * write public assets into the private store (or fail with the same opaque
 * error as before) and, worse, could make a private prefix world-readable.
 * Missing configuration should be loud and local.
 */
function publicToken(): string {
  const token = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'PUBLIC_BLOB_READ_WRITE_TOKEN is not set — public asset uploads (client logos, project media) are disabled. Connect the perseus-public-assets Blob store to this project.',
    );
  }
  return token;
}

/**
 * Belt-and-braces on writes only. The token already scopes every call to the
 * public store, so a stray *read* or *delete* can't touch private bytes — but a
 * write is the one operation where a wrong pathname would publish something
 * that was meant to stay private.
 */
function assertPublicPrefix(pathname: string): void {
  if (!PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    throw new Error(
      `Refusing to write "${pathname}" to the public Blob store: only ${PUBLIC_PREFIXES.join(
        ' and ',
      )} are publicly readable namespaces.`,
    );
  }
}

/** Upload a publicly readable blob. `access: 'public'` is implied. */
export function putPublic(
  pathname: string,
  body: PutBody,
  options: PutPublicOptions = {},
) {
  assertPublicPrefix(pathname);
  return put(pathname, body, {
    ...options,
    access: 'public',
    token: publicToken(),
  });
}

/** Release one or more public blobs, by pathname or URL. */
export function delPublic(urlOrPathname: string | string[]) {
  return del(urlOrPathname, { token: publicToken() });
}

/** Enumerate public blobs — the stray-sweep half of project deletion. */
export function listPublic(options: ListPublicOptions = {}) {
  return list({ ...options, token: publicToken() });
}
