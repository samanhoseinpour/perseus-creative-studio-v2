'use server';

/**
 * Write actions for the portfolio projects + their media. Reads live in
 * `@/db/portfolioQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the portfolio area (`requireArea`). Ids are
 * shape-validated before touching Postgres.
 *
 * Media storage: `access: 'public'` Blob — project imagery renders to
 * anonymous visitors, so the CDN serves it directly (no function invocation
 * per view, unlike the private résumé/ticket streams, which guard PII).
 * `addRandomSuffix` keeps URLs non-guessable; `cacheControlMaxAge` matches
 * the immutable /images/* policy (a replaced image is a NEW blob + row, never
 * an overwrite). Blob-vs-row failure ordering follows the house idiom:
 * upload first, row write second, `del()` the fresh blobs when the row never
 * landed; on delete, row first, `del()` best-effort after (a stranded blob is
 * pennies; a dangling DB pointer is a broken page).
 *
 * Cache contract: see _actions/clients.ts — `updateTag` + sitemap
 * `revalidatePath` + `revalidatePath('/admin', 'layout')` on every success.
 */
import { and, eq, inArray, max, sql } from 'drizzle-orm';
import { del, list, put } from '@vercel/blob';
import { revalidatePath, updateTag } from 'next/cache';

import { db } from '@/db';
import {
  projectMedia,
  projects,
  type ProjectMediaRow,
  type ProjectMediaVariants,
} from '@/db/schema';
import { requireArea } from '@/lib/adminAccess';
import {
  embedSchema,
  flattenPortfolioIssues,
  projectMediaUploadSchema,
  projectSchema,
} from '@/lib/portfolioSchema';
import {
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_RUNGS,
  projectImageProblem,
} from '@/lib/portfolioFields';
import { SCREENSHOT_MIME, sniffScreenshotKind } from '@/lib/ticketFields';
import { CLIENTS_TAG, PROJECTS_TAG, projectTag } from '@/lib/projectsStore';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === '23505';

/** FK violation — a client id that stopped existing mid-edit. */
const isFkViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === '23503';

export type ProjectMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type ProjectActionResult = { ok: true } | { ok: false; error: string };

export type UploadMediaResult =
  | { ok: true; media: ProjectMediaRow }
  | { ok: false; error: string };

function invalidateProject(category: string, slug: string, previous?: {
  category: string;
  slug: string;
}) {
  updateTag(PROJECTS_TAG);
  updateTag(CLIENTS_TAG);
  updateTag(projectTag(category, slug));
  if (previous && (previous.category !== category || previous.slug !== slug)) {
    updateTag(projectTag(previous.category, previous.slug));
  }
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/projects.xml');
  revalidatePath('/admin', 'layout');
}

/**
 * Media writes land in project_media, so they never move the projects row's
 * own updatedAt — bump it explicitly. That date is the public freshness
 * signal (sitemap <lastmod>, og:modifiedTime, JSON-LD dateModified), and a
 * cover/gallery/embed edit is exactly what changes the public page — it can
 * even be the write that flips hasDetail and puts the URL in the sitemap.
 */
async function touchProject(projectId: string) {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

/** Every blob pathname a media row holds (all rungs + the master). */
function variantPathnames(variants: ProjectMediaVariants | null): string[] {
  if (!variants) return [];
  return [
    variants.full.pathname,
    variants.w960?.pathname,
    variants.w640?.pathname,
    variants.w384?.pathname,
  ].filter((p): p is string => Boolean(p));
}

export async function createProject(
  input: unknown,
): Promise<ProjectMutationResult> {
  await requireArea('portfolio', '/admin');

  try {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenPortfolioIssues(parsed.error) };
    }
    const data = parsed.data;

    // New rows land at the end of their category's registry order.
    const [{ maxSort }] = await db
      .select({ maxSort: max(projects.sortIndex) })
      .from(projects)
      .where(eq(projects.category, data.category));

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(projects)
        .values({
          category: data.category,
          slug: data.slug,
          clientId: data.clientId ?? null,
          clientName: data.clientName ?? null,
          title: data.title,
          industry: data.industry,
          location: data.location ?? null,
          year: data.year,
          summary: data.summary,
          description: data.description ?? null,
          services: data.services,
          externalUrl: data.externalUrl ?? null,
          stats: data.stats.length > 0 ? data.stats : null,
          testimonialQuote: data.testimonialQuote ?? null,
          testimonialName: data.testimonialName ?? null,
          testimonialRole: data.testimonialRole ?? null,
          featured: data.featured,
          visibility: data.visibility,
          sortIndex: (maxSort ?? -1) + 1,
        })
        .returning({ id: projects.id });
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { slug: 'That slug is already used in this category.' },
        };
      }
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists — pick another.' },
        };
      }
      throw dbError;
    }

    invalidateProject(data.category, data.slug);
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    console.error('[projects] createProject failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ProjectMutationResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenPortfolioIssues(parsed.error) };
    }
    const data = parsed.data;

    const [existing] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return { ok: false, error: 'server' };

    try {
      await db
        .update(projects)
        .set({
          category: data.category,
          slug: data.slug,
          clientId: data.clientId ?? null,
          clientName: data.clientName ?? null,
          title: data.title,
          industry: data.industry,
          location: data.location ?? null,
          year: data.year,
          summary: data.summary,
          description: data.description ?? null,
          services: data.services,
          externalUrl: data.externalUrl ?? null,
          stats: data.stats.length > 0 ? data.stats : null,
          testimonialQuote: data.testimonialQuote ?? null,
          testimonialName: data.testimonialName ?? null,
          testimonialRole: data.testimonialRole ?? null,
          featured: data.featured,
          visibility: data.visibility,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id));
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { slug: 'That slug is already used in this category.' },
        };
      }
      if (isFkViolation(dbError)) {
        return {
          ok: false,
          error: 'validation',
          issues: { clientId: 'That client no longer exists — pick another.' },
        };
      }
      throw dbError;
    }

    invalidateProject(data.category, data.slug, existing);
    return { ok: true, id };
  } catch (error) {
    console.error('[projects] updateProject failed', error);
    return { ok: false, error: 'server' };
  }
}

/** The list rows' quick visibility switch. */
export async function setProjectVisibility(
  id: string,
  visibility: 'public' | 'unlisted' | 'draft',
): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid project.' };
    if (!['public', 'unlisted', 'draft'].includes(visibility)) {
      return { ok: false, error: 'Invalid visibility.' };
    }

    const updated = await db
      .update(projects)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning({ category: projects.category, slug: projects.slug });
    if (updated.length === 0) return { ok: false, error: 'Project not found.' };

    invalidateProject(updated[0].category, updated[0].slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] setProjectVisibility failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * Delete a project and everything it owns: media rows cascade with the row;
 * their blobs (plus any strays from past failed uploads) are released
 * best-effort afterward via the collected pathnames + a prefix sweep.
 */
export async function deleteProject(id: string): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid project.' };

    const [existing] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return { ok: false, error: 'Project not found.' };

    const media = await db
      .select({ variants: projectMedia.variants })
      .from(projectMedia)
      .where(eq(projectMedia.projectId, id));
    const pathnames = media.flatMap((m) => variantPathnames(m.variants));

    await db.delete(projects).where(eq(projects.id, id));

    // Row (and cascaded media rows) are gone — release blobs best-effort.
    if (pathnames.length > 0) await del(pathnames).catch(() => {});
    try {
      const strays = await list({ prefix: `projects/${id}/` });
      if (strays.blobs.length > 0) {
        await del(strays.blobs.map((b) => b.pathname));
      }
    } catch {
      // Sweep is opportunistic.
    }

    invalidateProject(existing.category, existing.slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] deleteProject failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/**
 * Store one uploaded image (cover or gallery): the browser already fanned the
 * pick into the full master + width rungs + LQIP (reduceProjectImage); this
 * validates each file by magic bytes, enforces the SUM cap (one action body
 * carries every rung), uploads each rung as a public blob, and lands ONE
 * project_media row. A cover upload replaces the existing cover row in place
 * and releases the old blobs after the row write.
 *
 * FormData: projectId, slot ('cover'|'gallery'), alt, blur, fullWidth,
 * fullHeight, files `full` (required), `w960`/`w640`/`w384` (sparse).
 */
export async function uploadProjectMedia(
  formData: FormData,
): Promise<UploadMediaResult> {
  await requireArea('portfolio', '/admin');

  const uploaded: string[] = [];
  try {
    const parsed = projectMediaUploadSchema.safeParse({
      projectId: formData.get('projectId'),
      slot: formData.get('slot'),
      alt: formData.get('alt') ?? '',
      blur: formData.get('blur'),
      fullWidth: formData.get('fullWidth'),
      fullHeight: formData.get('fullHeight'),
    });
    if (!parsed.success) {
      const issues = flattenPortfolioIssues(parsed.error);
      return { ok: false, error: Object.values(issues)[0] ?? 'Invalid upload.' };
    }
    const data = parsed.data;

    const [project] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, data.projectId));
    if (!project) return { ok: false, error: 'Project not found.' };

    // Collect the rung files: full is required, the rest are sparse.
    const files: { label: 'full' | `w${number}`; file: File }[] = [];
    const full = formData.get('full');
    if (!(full instanceof File) || full.size === 0) {
      return { ok: false, error: 'Attach an image file.' };
    }
    files.push({ label: 'full', file: full });
    for (const width of PROJECT_IMAGE_RUNGS) {
      const rung = formData.get(`w${width}`);
      if (rung instanceof File && rung.size > 0) {
        files.push({ label: `w${width}`, file: rung });
      }
    }

    // Per-file shape + sum cap (the 4.5 MB body ceiling minus headroom).
    let totalBytes = 0;
    for (const { file } of files) {
      const problem = projectImageProblem(file);
      if (problem) return { ok: false, error: problem };
      totalBytes += file.size;
    }
    if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
      return {
        ok: false,
        error: 'Image is still over 4 MB after optimizing — try a smaller image.',
      };
    }

    // Upload every rung; the sniff (not the filename) decides each stored
    // extension and content-type.
    const stored: Partial<Record<'full' | `w${number}`, { url: string; pathname: string }>> =
      {};
    for (const { label, file } of files) {
      const kind = await sniffScreenshotKind(file);
      if (!kind) return { ok: false, error: PROJECT_IMAGE_BAD_TYPE };
      const blob = await put(
        `projects/${data.projectId}/${label}.${kind}`,
        file,
        {
          access: 'public',
          addRandomSuffix: true,
          contentType: SCREENSHOT_MIME[kind],
          cacheControlMaxAge: 31536000,
        },
      );
      uploaded.push(blob.pathname);
      stored[label] = { url: blob.url, pathname: blob.pathname };
    }

    const variants: ProjectMediaVariants = {
      full: {
        url: stored.full!.url,
        pathname: stored.full!.pathname,
        width: data.fullWidth,
        height: data.fullHeight,
      },
      ...(stored.w960 ? { w960: stored.w960 } : {}),
      ...(stored.w640 ? { w640: stored.w640 } : {}),
      ...(stored.w384 ? { w384: stored.w384 } : {}),
    };

    let row: ProjectMediaRow;
    if (data.slot === 'cover') {
      const [existingCover] = await db
        .select()
        .from(projectMedia)
        .where(
          and(
            eq(projectMedia.projectId, data.projectId),
            eq(projectMedia.kind, 'cover'),
          ),
        );

      if (existingCover) {
        const [updated] = await db
          .update(projectMedia)
          .set({
            variants,
            blurDataUrl: data.blur,
            alt: data.alt ?? null,
          })
          .where(eq(projectMedia.id, existingCover.id))
          .returning();
        row = updated;
        // Row now points at the new blobs — release the replaced ones.
        await del(variantPathnames(existingCover.variants)).catch(() => {});
      } else {
        const [insertedRow] = await db
          .insert(projectMedia)
          .values({
            projectId: data.projectId,
            kind: 'cover',
            sortOrder: 0,
            variants,
            blurDataUrl: data.blur,
            alt: data.alt ?? null,
          })
          .returning();
        row = insertedRow;
      }
    } else {
      const [{ maxSort }] = await db
        .select({ maxSort: max(projectMedia.sortOrder) })
        .from(projectMedia)
        .where(
          and(
            eq(projectMedia.projectId, data.projectId),
            eq(projectMedia.kind, 'image'),
          ),
        );
      const [insertedRow] = await db
        .insert(projectMedia)
        .values({
          projectId: data.projectId,
          kind: 'image',
          sortOrder: (maxSort ?? -1) + 1,
          variants,
          blurDataUrl: data.blur,
          alt: data.alt ?? null,
        })
        .returning();
      row = insertedRow;
    }

    await touchProject(data.projectId);
    invalidateProject(project.category, project.slug);
    return { ok: true, media: row };
  } catch (error) {
    // The row never landed — don't strand the fresh blobs.
    if (uploaded.length > 0) await del(uploaded).catch(() => {});
    console.error('[projects] uploadProjectMedia failed', error);
    return { ok: false, error: 'Upload failed — try again.' };
  }
}

/** Delete one media row (gallery image, cover, or embed) + its blobs. */
export async function removeProjectMedia(
  id: string,
): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid media.' };

    const [row] = await db
      .select({
        variants: projectMedia.variants,
        projectId: projectMedia.projectId,
        project: {
          category: projects.category,
          slug: projects.slug,
        },
      })
      .from(projectMedia)
      .innerJoin(projects, eq(projectMedia.projectId, projects.id))
      .where(eq(projectMedia.id, id));
    if (!row) return { ok: false, error: 'Media not found.' };

    await db.delete(projectMedia).where(eq(projectMedia.id, id));

    const pathnames = variantPathnames(row.variants);
    if (pathnames.length > 0) await del(pathnames).catch(() => {});

    await touchProject(row.projectId);
    invalidateProject(row.project.category, row.project.slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] removeProjectMedia failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/**
 * Persist a full reorder of one project's gallery (or embed) rows. The id
 * set must exactly cover the project's rows of that group — stale UI state
 * (a row deleted in another tab) rejects rather than half-applying. One
 * UPDATE … FROM (VALUES …) statement: neon-http has no interactive
 * transactions, so atomicity comes from single-statement writes.
 */
export async function saveMediaOrder(
  projectId: string,
  orderedIds: string[],
): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(projectId)) return { ok: false, error: 'Invalid project.' };
    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length === 0 ||
      orderedIds.length > 200 ||
      !orderedIds.every((v) => typeof v === 'string' && UUID_RE.test(v))
    ) {
      return { ok: false, error: 'Invalid order.' };
    }

    const rows = await db
      .select({ id: projectMedia.id, kind: projectMedia.kind })
      .from(projectMedia)
      .where(
        and(
          eq(projectMedia.projectId, projectId),
          inArray(projectMedia.id, orderedIds),
        ),
      );
    if (rows.length !== orderedIds.length) {
      return { ok: false, error: 'The list changed — reload and try again.' };
    }

    const values = sql.join(
      orderedIds.map((mediaId, i) => sql`(${mediaId}::uuid, ${i}::int)`),
      sql`, `,
    );
    await db.execute(sql`
      update project_media as pm
      set sort_order = v.sort_order
      from (values ${values}) as v(id, sort_order)
      where pm.id = v.id and pm.project_id = ${projectId}::uuid
    `);

    await touchProject(projectId);
    const [project] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, projectId));
    if (project) invalidateProject(project.category, project.slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] saveMediaOrder failed', error);
    return { ok: false, error: 'Reorder failed — try again.' };
  }
}

/** Inline alt-text edit on a gallery row. */
export async function updateProjectMediaAlt(
  id: string,
  alt: string,
): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid media.' };
    if (typeof alt !== 'string' || alt.length > 300) {
      return { ok: false, error: 'Keep the alt text under 300 characters.' };
    }

    const updated = await db
      .update(projectMedia)
      .set({ alt: alt.trim() || null })
      .where(eq(projectMedia.id, id))
      .returning({ projectId: projectMedia.projectId });
    if (updated.length === 0) return { ok: false, error: 'Media not found.' };

    await touchProject(updated[0].projectId);
    const [project] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, updated[0].projectId));
    if (project) invalidateProject(project.category, project.slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] updateProjectMediaAlt failed', error);
    return { ok: false, error: 'Save failed — try again.' };
  }
}

/** Add a YouTube/Instagram embed row (the pasted link normalizes to the
 *  stored ref via embedSchema). */
export async function addProjectEmbed(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  await requireArea('portfolio', '/admin');

  try {
    if (!UUID_RE.test(projectId)) return { ok: false, error: 'Invalid project.' };
    const parsed = embedSchema.safeParse(input);
    if (!parsed.success) {
      const issues = flattenPortfolioIssues(parsed.error);
      return { ok: false, error: Object.values(issues)[0] ?? 'Invalid link.' };
    }

    const [project] = await db
      .select({ category: projects.category, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) return { ok: false, error: 'Project not found.' };

    const [{ maxSort }] = await db
      .select({ maxSort: max(projectMedia.sortOrder) })
      .from(projectMedia)
      .where(
        and(
          eq(projectMedia.projectId, projectId),
          inArray(projectMedia.kind, ['youtube', 'instagram']),
        ),
      );

    await db.insert(projectMedia).values({
      projectId,
      kind: parsed.data.kind,
      sortOrder: (maxSort ?? -1) + 1,
      embedRef: parsed.data.ref,
    });

    await touchProject(projectId);
    invalidateProject(project.category, project.slug);
    return { ok: true };
  } catch (error) {
    console.error('[projects] addProjectEmbed failed', error);
    return { ok: false, error: 'Add failed — try again.' };
  }
}
