'use server';

/**
 * Write actions for the portfolio projects + their media. Reads live in
 * `@/db/portfolioQueries`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the portfolio area (`requireArea`). Ids are
 * shape-validated before touching Postgres.
 *
 * Media storage: the PUBLIC Blob store, via `@/lib/publicBlob` (never
 * `@vercel/blob` directly — see that module for why the public and private
 * halves of this app cannot share one store). Project imagery renders to
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
import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';

import { db } from '@/db';
import {
  projectMedia,
  projects,
  type ProjectMediaRow,
  type ProjectMediaVariants,
} from '@/db/schema';
import { requireArea } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { diff } from '@/lib/activityFields';
import { delPublic, listPublic, putPublic } from '@/lib/publicBlob';
import {
  embedSchema,
  flattenPortfolioIssues,
  projectMediaUploadSchema,
  projectSchema,
} from '@/lib/portfolioSchema';
import {
  MAX_PROJECT_IMAGE_PIXELS,
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_RUNGS,
  PROJECT_IMAGE_TOO_LARGE,
  projectImageProblem,
} from '@/lib/portfolioFields';
import {
  SCREENSHOT_MIME,
  sniffImageDimensions,
  sniffScreenshotKind,
} from '@/lib/ticketFields';
import { CLIENTS_TAG, PROJECTS_TAG, projectTag } from '@/lib/projectsStore';
import { pingIndexNow } from '@/lib/indexnow';
import { logError } from '@/lib/log';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the Postgres error code through the cause chain. drizzle-orm wraps
 * every neon-http driver error in DrizzleQueryError with the NeonDbError (and
 * its `.code`) on `.cause` — reading `.code` off the thrown error directly is
 * always undefined (same fix as _actions/tasks.ts and _actions/clients.ts).
 */
function pgCode(error: unknown): string | undefined {
  for (
    let current = error;
    typeof current === 'object' && current !== null;
    current = (current as { cause?: unknown }).cause
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Postgres unique-violation (duplicate slug within a category). */
const isUniqueViolation = (error: unknown): boolean =>
  pgCode(error) === '23505';

/** FK violation — a client id that stopped existing mid-edit. */
const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';

export type ProjectMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type ProjectActionResult = { ok: true } | { ok: false; error: string };

export type UploadMediaResult =
  | { ok: true; media: ProjectMediaRow }
  | { ok: false; error: string };

type ProjectRef = { category: string; slug: string; visibility: string };

function invalidateProject(current: ProjectRef, previous?: ProjectRef) {
  updateTag(PROJECTS_TAG);
  updateTag(CLIENTS_TAG);
  updateTag(projectTag(current.category, current.slug));
  const moved =
    previous !== undefined &&
    (previous.category !== current.category || previous.slug !== current.slug);
  if (previous && moved) updateTag(projectTag(previous.category, previous.slug));
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/projects.xml');
  revalidatePath('/admin', 'layout');

  // Tell IndexNow-consuming engines (Bing → Copilot/ChatGPT grounding) that
  // these URLs changed. Post-response via after(), production-only and
  // error-swallowing inside the helper, so it can never slow or break the
  // admin mutation. ONLY public URLs are ever announced: 'unlisted' means
  // reachable by link only — the URL itself is the credential — so pinging it
  // would hand that link to every IndexNow consumer (Bing/Yandex/Seznam/…);
  // drafts would merely 404 but their slugs are client names, same rule. A
  // formerly-public URL still gets pinged when it moves or leaves public (or
  // its row is deleted — pass the deleted row as `current`), so engines
  // refetch, hit the 404/noindex, and drop it.
  const urls: string[] = [];
  if (current.visibility === 'public') {
    urls.push(`/projects/${current.category}/${current.slug}`);
  }
  if (
    previous !== undefined &&
    previous.visibility === 'public' &&
    (moved || current.visibility !== 'public')
  ) {
    urls.push(`/projects/${previous.category}/${previous.slug}`);
    if (previous.category !== current.category) {
      urls.push(`/projects/${previous.category}`);
    }
  }
  // The category/hub listings only changed if some public detail URL did —
  // pinging them on draft/unlisted edits would be the false-freshness signal
  // the IndexNow ritual forbids.
  if (urls.length > 0) {
    urls.push(`/projects/${current.category}`, '/projects');
    after(() => pingIndexNow(urls));
  }
}

/**
 * Media writes land in project_media, so they never move the projects row's
 * own updatedAt — bump it explicitly. That date is the public freshness
 * signal (sitemap <lastmod>, og:modifiedTime, JSON-LD dateModified), and a
 * cover/gallery/embed edit is exactly what changes the public page — it can
 * even be the write that flips hasDetail and puts the URL in the sitemap.
 *
 * RETURNING carries the category/slug invalidateProject needs, so callers
 * that don't already hold them skip a follow-up select — on neon-http that
 * select was a whole extra HTTPS round trip on every media mutation.
 */
async function touchProject(projectId: string): Promise<ProjectRef | null> {
  const [row] = await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning({
      category: projects.category,
      slug: projects.slug,
      visibility: projects.visibility,
    });
  return row ?? null;
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
  const profile = await requireArea('projects', '/admin');

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

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: inserted[0].id,
      entityName: data.title,
      action: 'create',
      summary: `Created the project "${data.title}"`,
      payload: {
        meta: {
          category: data.category,
          slug: data.slug,
          visibility: data.visibility,
        },
      },
    });

    invalidateProject({
      category: data.category,
      slug: data.slug,
      visibility: data.visibility,
    });
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    logError('[projects] createProject failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ProjectMutationResult> {
  const profile = await requireArea('projects', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenPortfolioIssues(parsed.error) };
    }
    const data = parsed.data;

    const [existing] = await db
      .select({
        category: projects.category,
        slug: projects.slug,
        visibility: projects.visibility,
      })
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return { ok: false, error: 'server' };

    // A cross-category move re-appends at the end of the target category's
    // registry order (createProject's rule). Carrying the old index over
    // would collide with an existing row there — and with no tie-breaker on
    // (category, sortIndex), the public card order turns nondeterministic.
    let movedSortIndex: number | undefined;
    if (data.category !== existing.category) {
      const [{ maxSort }] = await db
        .select({ maxSort: max(projects.sortIndex) })
        .from(projects)
        .where(eq(projects.category, data.category));
      movedSortIndex = (maxSort ?? -1) + 1;
    }

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
          ...(movedSortIndex !== undefined ? { sortIndex: movedSortIndex } : {}),
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

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: id,
      entityName: data.title,
      action: 'update',
      summary: `Edited the project "${data.title}"`,
      // The fields that move a public URL or its indexability — the ones
      // worth reconstructing later. Body copy is intentionally not diffed:
      // it would make every row enormous for little forensic value.
      payload: {
        changes: diff(
          {
            slug: existing.slug,
            category: existing.category,
            visibility: existing.visibility,
          },
          {
            slug: data.slug,
            category: data.category,
            visibility: data.visibility,
          },
        ),
      },
    });

    invalidateProject(
      { category: data.category, slug: data.slug, visibility: data.visibility },
      existing,
    );
    return { ok: true, id };
  } catch (error) {
    logError('[projects] updateProject failed', error);
    return { ok: false, error: 'server' };
  }
}

/** The list rows' quick visibility switch. */
export async function setProjectVisibility(
  id: string,
  visibility: 'public' | 'unlisted' | 'draft',
): Promise<ProjectActionResult> {
  const profile = await requireArea('projects', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid project.' };
    if (!['public', 'unlisted', 'draft'].includes(visibility)) {
      return { ok: false, error: 'Invalid visibility.' };
    }

    // Previous state first: leaving 'public' must still ping the old URL so
    // engines refetch and drop it, and invalidateProject can only tell that
    // transition apart from an unlisted/draft edit (which must ping nothing)
    // by seeing both sides. One extra PK read on an admin toggle.
    const [previous] = await db
      .select({
        category: projects.category,
        slug: projects.slug,
        visibility: projects.visibility,
      })
      .from(projects)
      .where(eq(projects.id, id));
    if (!previous) return { ok: false, error: 'Project not found.' };

    const updated = await db
      .update(projects)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning({ category: projects.category, slug: projects.slug });
    if (updated.length === 0) return { ok: false, error: 'Project not found.' };

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: id,
      entityName: updated[0].slug,
      action: 'status',
      summary: `Set the project "${updated[0].slug}" to ${visibility}`,
      payload: {
        changes: diff(
          { visibility: previous.visibility },
          { visibility },
        ),
      },
    });

    invalidateProject({ ...updated[0], visibility }, previous);
    return { ok: true };
  } catch (error) {
    logError('[projects] setProjectVisibility failed', error);
    return { ok: false, error: 'Update failed — try again.' };
  }
}

/**
 * Delete a project and everything it owns: media rows cascade with the row;
 * their blobs (plus any strays from past failed uploads) are released
 * best-effort afterward via the collected pathnames + a prefix sweep.
 */
export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const profile = await requireArea('projects', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid project.' };

    const [existing] = await db
      .select({
        category: projects.category,
        slug: projects.slug,
        visibility: projects.visibility,
      })
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return { ok: false, error: 'Project not found.' };

    const media = await db
      .select({ variants: projectMedia.variants })
      .from(projectMedia)
      .where(eq(projectMedia.projectId, id));
    const pathnames = media.flatMap((m) => variantPathnames(m.variants));

    await db.delete(projects).where(eq(projects.id, id));

    // Row (and cascaded media rows) are gone — release blobs best-effort,
    // POST-RESPONSE via after(): these 2-3 serial Blob API calls exist only
    // for storage hygiene and every failure is swallowed, so they must not
    // hold up the delete toast + redirect.
    after(async () => {
      if (pathnames.length > 0) await delPublic(pathnames).catch(() => {});
      try {
        const strays = await listPublic({ prefix: `projects/${id}/` });
        if (strays.blobs.length > 0) {
          await delPublic(strays.blobs.map((b) => b.pathname));
        }
      } catch {
        // Sweep is opportunistic.
      }
    });

    // The deleted row rides as `current`: a public project's URL still gets
    // pinged (engines refetch, hit the 404, drop it); a draft/unlisted delete
    // announces nothing.
    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: id,
      entityName: existing.slug,
      action: 'delete',
      summary: `Deleted the project "${existing.slug}"`,
      payload: {
        meta: {
          category: existing.category,
          visibility: existing.visibility,
          mediaRemoved: pathnames.length,
        },
      },
    });

    invalidateProject(existing);
    return { ok: true };
  } catch (error) {
    logError('[projects] deleteProject failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

/**
 * Per-rung rejections are THROWN (the upload batch is a Promise.allSettled, so
 * a return value can't short-circuit it) and caught by uploadProjectMedia's
 * outer catch. These messages are already field-level copy, so they pass
 * through verbatim instead of collapsing into "Upload failed — try again."
 * Add a message here whenever the batch learns to throw a new one.
 */
const PASSTHROUGH_UPLOAD_ERRORS = new Set<string>([
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_TOO_LARGE,
]);

/**
 * Store one uploaded image (cover or gallery): the browser already fanned the
 * pick into the full master + width rungs + LQIP (reduceProjectImage); this
 * validates each file by magic bytes and decoded pixel count, enforces the SUM
 * cap (one action body carries every rung), uploads each rung as a public blob,
 * and lands ONE project_media row. A cover upload replaces the existing cover
 * row in place and releases the old blobs after the row write.
 *
 * FormData: projectId, slot ('cover'|'gallery'), alt, blur, fullWidth,
 * fullHeight, files `full` (required), `w960`/`w640`/`w384` (sparse).
 */
export async function uploadProjectMedia(
  formData: FormData,
): Promise<UploadMediaResult> {
  const profile = await requireArea('projects', '/admin');

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
      .select({
        category: projects.category,
        slug: projects.slug,
        visibility: projects.visibility,
      })
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

    // Upload every rung CONCURRENTLY; the sniff (not the filename) decides
    // each stored extension and content-type. The rungs are independent
    // files — `stored` is label-keyed and the `uploaded` cleanup list is
    // order-insensitive — so the old serial loop paid ~3 avoidable Blob API
    // round trips per image. allSettled (not all) so every put has finished
    // before a failure propagates: the catch's del then sees the complete
    // pathname list and can't strand an in-flight blob.
    const stored: Partial<Record<'full' | `w${number}`, { url: string; pathname: string }>> =
      {};
    const rungResults = await Promise.allSettled(
      files.map(async ({ label, file }) => {
        const kind = await sniffScreenshotKind(file);
        // Thrown (not returned) so the batch fails fast; the outer catch
        // maps these exact messages back to their specific error copy.
        if (!kind) throw new Error(PROJECT_IMAGE_BAD_TYPE);
        // Decompression-bomb gate, per rung: a direct action POST controls
        // every file in the body, not just the master, and these bytes render
        // raw to anonymous visitors (see MAX_PROJECT_IMAGE_PIXELS). The sum
        // cap above bounds the cost of reading all ≤4 headers.
        const dims = await sniffImageDimensions(file, kind);
        if (!dims) throw new Error(PROJECT_IMAGE_BAD_TYPE);
        if (dims.width * dims.height > MAX_PROJECT_IMAGE_PIXELS) {
          throw new Error(PROJECT_IMAGE_TOO_LARGE);
        }
        const blob = await putPublic(
          `projects/${data.projectId}/${label}.${kind}`,
          file,
          {
            addRandomSuffix: true,
            contentType: SCREENSHOT_MIME[kind],
            cacheControlMaxAge: 31536000,
          },
        );
        uploaded.push(blob.pathname);
        stored[label] = { url: blob.url, pathname: blob.pathname };
      }),
    );
    const failedRung = rungResults.find((r) => r.status === 'rejected');
    if (failedRung) throw failedRung.reason;

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
        await delPublic(variantPathnames(existingCover.variants)).catch(() => {});
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
      // next-sort as an inline subselect — one round trip, not a maxSort
      // read stacked ahead of the INSERT (neon-http pays per query).
      const [insertedRow] = await db
        .insert(projectMedia)
        .values({
          projectId: data.projectId,
          kind: 'image',
          sortOrder: sql`(select coalesce(max(sort_order) + 1, 0) from project_media where project_id = ${data.projectId}::uuid and kind = 'image')`,
          variants,
          blurDataUrl: data.blur,
          alt: data.alt ?? null,
        })
        .returning();
      row = insertedRow;
    }

    // The row is committed and references the fresh blobs — from here on the
    // catch's cleanup must NOT delete them (neon-http has no transactions, so
    // a failure below doesn't roll the row back). Clearing the ledger makes
    // that structural, and a touch failure is only a stale updatedAt — not
    // worth failing a completed upload over (a retry would double-insert
    // gallery rows).
    uploaded.length = 0;
    await touchProject(data.projectId).catch((touchError) => {
      logError('[projects] uploadProjectMedia touch failed', touchError);
    });
    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: data.projectId,
      entityName: project.slug,
      action: 'update',
      summary: `Uploaded a ${data.slot} image to "${project.slug}"`,
      payload: { meta: { slot: data.slot, mediaId: row.id } },
    });

    invalidateProject(project);
    return { ok: true, media: row };
  } catch (error) {
    // The row never landed — don't strand the fresh blobs.
    if (uploaded.length > 0) await delPublic(uploaded).catch(() => {});
    // Field-level rejections thrown from the per-rung batch above carry their
    // own copy; anything else is a genuine failure and gets the generic line.
    if (error instanceof Error && PASSTHROUGH_UPLOAD_ERRORS.has(error.message)) {
      return { ok: false, error: error.message };
    }
    logError('[projects] uploadProjectMedia failed', error);
    return { ok: false, error: 'Upload failed — try again.' };
  }
}

/** Delete one media row (gallery image, cover, or embed) + its blobs. */
export async function removeProjectMedia(
  id: string,
): Promise<ProjectActionResult> {
  const profile = await requireArea('projects', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid media.' };

    const [row] = await db
      .select({
        variants: projectMedia.variants,
        projectId: projectMedia.projectId,
        project: {
          category: projects.category,
          slug: projects.slug,
          visibility: projects.visibility,
        },
      })
      .from(projectMedia)
      .innerJoin(projects, eq(projectMedia.projectId, projects.id))
      .where(eq(projectMedia.id, id));
    if (!row) return { ok: false, error: 'Media not found.' };

    await db.delete(projectMedia).where(eq(projectMedia.id, id));

    const pathnames = variantPathnames(row.variants);
    if (pathnames.length > 0) await delPublic(pathnames).catch(() => {});

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: row.projectId,
      entityName: row.project.slug,
      action: 'update',
      summary: `Removed an image from "${row.project.slug}"`,
      payload: { meta: { mediaId: id } },
    });

    await touchProject(row.projectId);
    invalidateProject(row.project);
    return { ok: true };
  } catch (error) {
    logError('[projects] removeProjectMedia failed', error);
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
  const profile = await requireArea('projects', '/admin');

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

    const project = await touchProject(projectId);
    if (project) invalidateProject(project);

    // One row for the whole reorder, carrying a count rather than 200 ids: a
    // drag-and-drop gesture is a single editorial act, and per-row lines would
    // bury every other kind of change in the feed.
    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: projectId,
      entityName: project?.slug ?? projectId,
      action: 'update',
      summary: `Reordered ${orderedIds.length} media items`,
      payload: { count: orderedIds.length },
    });

    return { ok: true };
  } catch (error) {
    logError('[projects] saveMediaOrder failed', error);
    return { ok: false, error: 'Reorder failed — try again.' };
  }
}

/** Inline alt-text edit on a gallery row. */
export async function updateProjectMediaAlt(
  id: string,
  alt: string,
): Promise<ProjectActionResult> {
  const profile = await requireArea('projects', '/admin');

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

    const project = await touchProject(updated[0].projectId);
    if (project) invalidateProject(project);

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: updated[0].projectId,
      entityName: project?.slug ?? updated[0].projectId,
      action: 'update',
      summary: `Edited alt text on "${project?.slug ?? 'a project'}"`,
      payload: { meta: { mediaId: id } },
    });

    return { ok: true };
  } catch (error) {
    logError('[projects] updateProjectMediaAlt failed', error);
    return { ok: false, error: 'Save failed — try again.' };
  }
}

/** Add a YouTube/Instagram embed row (the pasted link normalizes to the
 *  stored ref via embedSchema). */
export async function addProjectEmbed(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const profile = await requireArea('projects', '/admin');

  try {
    if (!UUID_RE.test(projectId)) return { ok: false, error: 'Invalid project.' };
    const parsed = embedSchema.safeParse(input);
    if (!parsed.success) {
      const issues = flattenPortfolioIssues(parsed.error);
      return { ok: false, error: Object.values(issues)[0] ?? 'Invalid link.' };
    }

    const [project] = await db
      .select({
        category: projects.category,
        slug: projects.slug,
        visibility: projects.visibility,
      })
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) return { ok: false, error: 'Project not found.' };

    // next-sort as an inline subselect — one round trip, not a maxSort read
    // stacked ahead of the INSERT (neon-http pays per query).
    await db.insert(projectMedia).values({
      projectId,
      kind: parsed.data.kind,
      sortOrder: sql`(select coalesce(max(sort_order) + 1, 0) from project_media where project_id = ${projectId}::uuid and kind in ('youtube', 'instagram'))`,
      embedRef: parsed.data.ref,
    });

    logActivity(profile, {
      area: 'projects',
      entity: 'project',
      entityId: projectId,
      entityName: project.slug,
      action: 'update',
      summary: `Added a ${parsed.data.kind} embed to "${project.slug}"`,
      payload: { meta: { kind: parsed.data.kind, ref: parsed.data.ref } },
    });

    await touchProject(projectId);
    invalidateProject(project);
    return { ok: true };
  } catch (error) {
    logError('[projects] addProjectEmbed failed', error);
    return { ok: false, error: 'Add failed — try again.' };
  }
}
