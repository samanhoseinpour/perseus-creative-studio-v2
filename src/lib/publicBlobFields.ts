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
