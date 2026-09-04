/**
 * Zod-free leaf for the PUBLIC Blob store's identity and namespaces. The
 * store's host is pinned to OUR store id on purpose: `*.public.blob.
 * vercel-storage.com` matches every Vercel tenant, and next/image never
 * consults remotePatterns when a custom loader is in play, so this string
 * is the only thing standing between an editor-typed URL and an anonymous
 * visitor's <img src>. Read off an existing public-store row once (a
 * clients.logo_blob_url, or a project_media variant URL); it is fixed for
 * the life of the store.
 */
export const PUBLIC_BLOB_HOST = 'qtqntzw0ww2dsih2.public.blob.vercel-storage.com';

/** Namespaces the public store may hold (see publicBlob.ts). */
export const PUBLIC_PREFIXES = ['clients/', 'projects/', 'blogs/'] as const;

/** A blog media pathname: under blogs/, word segments, a raster extension,
 *  no `..`, no `?`/`#`, no spaces. */
export const BLOG_MEDIA_PATHNAME_RE =
  /^blogs\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:avif|webp|png|jpe?g)$/;

/** The only way a media URL is ever built: derived from the pathname, never
 *  trusted from input. */
export const publicBlobUrl = (pathname: string): string =>
  `https://${PUBLIC_BLOB_HOST}/${pathname}`;

/**
 * The image slots a blog upload may fill. CLOSED on purpose: the label is half
 * of a Blob pathname, so an open string would let a caller name any file in
 * the namespace.
 */
export const BLOG_MEDIA_LABELS = ['hero', 'og', 'figure', 'photo'] as const;
export type BlogMediaLabel = (typeof BLOG_MEDIA_LABELS)[number];

/** Narrows a FormData string onto the closed set. */
export const isBlogMediaLabel = (value: string): value is BlogMediaLabel =>
  (BLOG_MEDIA_LABELS as readonly string[]).includes(value);

/** Which blog row an upload belongs to. A post's images live under its own
 *  id; an author's photo lives under blogs/authors/. */
export type BlogMediaOwner = { kind: 'post' | 'author'; id: string };

/** Which slots each owner offers. A `photo` under a post id, or a `hero`
 *  under an author id, is a file nothing would ever read. */
const OWNER_LABELS: Record<BlogMediaOwner['kind'], readonly string[]> = {
  post: ['hero', 'og', 'figure'],
  author: ['photo'],
};

const BLOG_OWNER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The base pathname for one blog image slot: everything before
 * `-<rung>.<ext>`. Null for anything this module cannot vouch for.
 *
 * A SECURITY PREDICATE, not a formatter, and the reason is that neither guard
 * under it is a traversal guard. `assertPublicPrefix` in publicBlob.ts is a
 * `startsWith` test, and `BLOG_MEDIA_PATHNAME_RE` above permits nested
 * segments — so an owner id of `authors/<some-uuid>` passed as a POST id would
 * write into the authors namespace and still satisfy both. The bare-UUID test
 * is what makes that unexpressible, and the closed label set is what stops the
 * other half of the filename coming from input. Both parameters are typed
 * `string` deliberately: a compile-time-only refusal is not a refusal at all
 * for a value that arrives in a FormData.
 *
 * The id is shape-checked here and its ROW must be read by the caller before
 * the first put, because a shape says nothing about a post that was purged a
 * second ago.
 */
export function blogMediaBase(owner: BlogMediaOwner, label: string): string | null {
  if (!BLOG_OWNER_ID_RE.test(owner.id)) return null;
  if (!OWNER_LABELS[owner.kind]?.includes(label)) return null;
  return owner.kind === 'author'
    ? `blogs/authors/${owner.id}/${label}`
    : `blogs/${owner.id}/${label}`;
}
