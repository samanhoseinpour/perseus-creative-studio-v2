'use server';

/**
 * Write actions for the portfolio clients. Reads live in
 * `@/db/portfolioQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the portfolio area (`requireArea`). Ids are
 * shape-validated before touching Postgres so a malformed one can't 500 on
 * the uuid cast.
 *
 * Cache contract: public pages read clients through the tagged
 * projectsStore accessors, so every successful write calls `updateTag` (the
 * server-action-only, read-your-writes revalidator — single-arg
 * `revalidateTag` is deprecated in Next 16.2) plus `revalidatePath` on the
 * sitemap XML routes (force-static route handlers sit outside tag
 * propagation) and the house `revalidatePath('/admin', 'layout')`.
 */
import { and, count, eq, sql } from 'drizzle-orm';
import { del, put } from '@vercel/blob';
import { revalidatePath, updateTag } from 'next/cache';

import { db } from '@/db';
import { clients, projects } from '@/db/schema';
import { requireArea } from '@/lib/adminAccess';
import {
  clientSchema,
  flattenPortfolioIssues,
  type ClientInput,
} from '@/lib/portfolioSchema';
import {
  PROJECT_IMAGE_BAD_TYPE,
  projectImageProblem,
} from '@/lib/portfolioFields';
import { SCREENSHOT_MIME, sniffScreenshotKind } from '@/lib/ticketFields';
import { CLIENTS_TAG, PROJECTS_TAG, clientTag } from '@/lib/projectsStore';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique-violation (duplicate slug) — surfaced as a field error. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === '23505';

export type ClientMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type ClientActionResult = { ok: true } | { ok: false; error: string };

/** Every read that could render this client gets fresh data on next visit.
 *  Projects embed the client's name/logo via the snapshot join, so the
 *  projects tag rides along (the snapshot carries both anyway). */
function invalidateClient(slug: string, previousSlug?: string) {
  updateTag(CLIENTS_TAG);
  updateTag(PROJECTS_TAG);
  updateTag(clientTag(slug));
  if (previousSlug && previousSlug !== slug) {
    updateTag(clientTag(previousSlug));
  }
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin', 'layout');
}

/** The next free rail slot — appends a wall-joiner after the current last
 *  member (seeded in steps of 10, so +10 keeps insertion room). */
async function nextMarqueeSort(): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | string | null>`max(${clients.marqueeSort})` })
    .from(clients);
  return Number(row?.max ?? 0) + 10;
}

/** The stored marquee columns for a parsed form: membership resolves the rail
 *  slot (explicit order → keep current → append), off-the-wall nulls it, and
 *  'none' maps to a null coin face. */
async function resolveMarqueeColumns(
  data: ClientInput,
  existingSort?: number | null,
) {
  return {
    marqueeSort: data.marquee
      ? (data.marqueeSort ?? existingSort ?? (await nextMarqueeSort()))
      : null,
    marqueeFeatured: data.marquee && data.marqueeFeatured,
    logoDisc: data.logoDisc === 'none' ? null : data.logoDisc,
  };
}

export async function createClient(
  input: unknown,
): Promise<ClientMutationResult> {
  await requireArea('portfolio', '/admin');

  try {
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenPortfolioIssues(parsed.error) };
    }
    const data = parsed.data;

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(clients)
        .values({
          name: data.name,
          slug: data.slug,
          industry: data.industry ?? null,
          location: data.location ?? null,
          websiteUrl: data.websiteUrl ?? null,
          instagram: data.instagram ?? null,
          bio: data.bio ?? null,
          ...(await resolveMarqueeColumns(data)),
        })
        .returning({ id: clients.id });
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { slug: 'That slug is already in use.' },
        };
      }
      throw dbError;
    }

    invalidateClient(data.slug);
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    console.error('[clients] createClient failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateClient(
  id: string,
  input: unknown,
): Promise<ClientMutationResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenPortfolioIssues(parsed.error) };
    }
    const data = parsed.data;

    const [existing] = await db
      .select({ slug: clients.slug, marqueeSort: clients.marqueeSort })
      .from(clients)
      .where(eq(clients.id, id));
    if (!existing) return { ok: false, error: 'server' };

    try {
      await db
        .update(clients)
        .set({
          name: data.name,
          slug: data.slug,
          industry: data.industry ?? null,
          location: data.location ?? null,
          websiteUrl: data.websiteUrl ?? null,
          instagram: data.instagram ?? null,
          bio: data.bio ?? null,
          ...(await resolveMarqueeColumns(data, existing.marqueeSort)),
          updatedAt: new Date(),
        })
        .where(eq(clients.id, id));
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { slug: 'That slug is already in use.' },
        };
      }
      throw dbError;
    }

    invalidateClient(data.slug, existing.slug);
    return { ok: true, id };
  } catch (error) {
    console.error('[clients] updateClient failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Upload/replace the client's mark. The browser already reduced it
 * (reduceImage: contained fit ≤512 — marks are never cropped); the sniff
 * (not the filename) decides the stored extension and content-type. Stored
 * `access: 'public'`: it renders to anonymous visitors on cards and the
 * profile page, and the CDN serves it without a function invocation —
 * `addRandomSuffix` keeps the URL non-guessable.
 */
export async function uploadClientLogo(
  formData: FormData,
): Promise<ClientActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    const id = String(formData.get('clientId') ?? '');
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid client.' };

    const file = formData.get('logo');
    if (!(file instanceof File)) {
      return { ok: false, error: 'Attach an image file.' };
    }
    const problem = projectImageProblem(file);
    if (problem) return { ok: false, error: problem };
    const kind = await sniffScreenshotKind(file);
    if (!kind) return { ok: false, error: PROJECT_IMAGE_BAD_TYPE };

    const [existing] = await db
      .select({ slug: clients.slug, oldPath: clients.logoBlobPath })
      .from(clients)
      .where(eq(clients.id, id));
    if (!existing) return { ok: false, error: 'Client not found.' };

    const blob = await put(`clients/${id}/logo.${kind}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: SCREENSHOT_MIME[kind],
      cacheControlMaxAge: 31536000,
    });

    try {
      await db
        .update(clients)
        .set({
          logoBlobUrl: blob.url,
          logoBlobPath: blob.pathname,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, id));
    } catch (dbError) {
      // Don't strand the fresh blob when the row write never landed.
      await del(blob.pathname).catch(() => {});
      throw dbError;
    }

    // Row is the source of truth — release the replaced mark best-effort.
    if (existing.oldPath) await del(existing.oldPath).catch(() => {});

    invalidateClient(existing.slug);
    return { ok: true };
  } catch (error) {
    console.error('[clients] uploadClientLogo failed', error);
    return { ok: false, error: 'Upload failed — try again.' };
  }
}

/** Remove the uploaded mark (falls back to the seeded static path, if any). */
export async function removeClientLogo(
  id: string,
): Promise<ClientActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid client.' };
    const [existing] = await db
      .select({ slug: clients.slug, oldPath: clients.logoBlobPath })
      .from(clients)
      .where(eq(clients.id, id));
    if (!existing) return { ok: false, error: 'Client not found.' };

    await db
      .update(clients)
      .set({ logoBlobUrl: null, logoBlobPath: null, updatedAt: new Date() })
      .where(eq(clients.id, id));
    if (existing.oldPath) await del(existing.oldPath).catch(() => {});

    invalidateClient(existing.slug);
    return { ok: true };
  } catch (error) {
    console.error('[clients] removeClientLogo failed', error);
    return { ok: false, error: 'Remove failed — try again.' };
  }
}

/**
 * Delete a client. Refused while projects still reference it (the FK is
 * `onDelete: 'restrict'` — untangling a roster entry with live work is a
 * deliberate act: reassign or delete the projects first).
 */
export async function deleteClient(id: string): Promise<ClientActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid client.' };

    const [{ inUse }] = await db
      .select({ inUse: count() })
      .from(projects)
      .where(and(eq(projects.clientId, id)));
    if (inUse > 0) {
      return {
        ok: false,
        error: `This client still has ${inUse} project${inUse === 1 ? '' : 's'} — reassign or delete those first.`,
      };
    }

    const [existing] = await db
      .select({ slug: clients.slug, logoPath: clients.logoBlobPath })
      .from(clients)
      .where(eq(clients.id, id));
    if (!existing) return { ok: false, error: 'Client not found.' };

    await db.delete(clients).where(eq(clients.id, id));
    if (existing.logoPath) await del(existing.logoPath).catch(() => {});

    invalidateClient(existing.slug);
    return { ok: true };
  } catch (error) {
    console.error('[clients] deleteClient failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}
