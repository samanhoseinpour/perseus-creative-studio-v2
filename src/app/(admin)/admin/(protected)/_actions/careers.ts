'use server';

/**
 * Write actions for the careers domain (job categories + openings). Reads
 * live in `@/db/careersQueries`; the public read layer is
 * `@/lib/careersStore`.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the careers area (`requireArea`). Ids are
 * shape-validated before touching Postgres so a malformed one can't 500 on
 * the uuid cast.
 *
 * Cache contract (see _actions/clients.ts): every successful write calls
 * `updateTag(CAREERS_TAG)` plus `revalidatePath` on the sitemap routes and
 * the house `revalidatePath('/admin', 'layout')`.
 *
 * IndexNow contract: `/contact/careers` is an indexed page carrying
 * JobPosting JSON-LD, so a change to what a visitor can see there is
 * announced post-response — but ONLY then. The before/after comparison is a
 * fingerprint over the public fields (src/lib/careerFields.ts), so a reorder,
 * an icon swap, or any edit to a draft pings nothing (false freshness is a
 * Bing spam signal, the reason the manual `npm run indexnow` exists at all).
 *
 * `status` is part of the opening form AND has its own quick-flip action —
 * the projects `visibility` precedent, not the tasks/payroll "separate
 * doors" rule: a listing is one record the admin publishes, and the
 * open-requires-pay rule needs the whole record to judge. Both doors run it.
 *
 * Audit rows carry slugs and statuses only. Pay ranges are public copy and
 * would pass the redaction denylist, but they stay out of the log anyway —
 * the log is for who did what, the row itself is the figure's home.
 */
import { eq } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';

import { db } from '@/db';
import {
  countApplicationsForRole,
  countOpeningsInCategory,
  countPublicOpeningsInCategory,
  getCategoryById,
  getOpeningById,
  nextCategorySort,
  nextOpeningSort,
} from '@/db/careersQueries';
import { jobCategories, jobOpenings, type JobOpening } from '@/db/schema';
import { requireArea } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { diff } from '@/lib/activityFields';
import {
  isRemoteLocation,
  JOB_STATUSES,
  openingFingerprint,
  type JobStatusField,
} from '@/lib/careerFields';
import {
  flattenCareersIssues,
  jobCategorySchema,
  jobOpeningSchema,
  openingCanOpen,
  type JobOpeningInput,
} from '@/lib/careersSchema';
import { CAREERS_TAG } from '@/lib/careersStore';
import { pingIndexNow } from '@/lib/indexnow';
import { reportError } from '@/lib/monitoringRecord';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Postgres error code, resolved through the cause chain: drizzle-orm wraps
 * neon-http driver errors in DrizzleQueryError with the NeonDbError (and its
 * `.code`) on `.cause`, so reading `.code` off the thrown error directly is
 * always undefined (same fix as _actions/tasks.ts).
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

const isUniqueViolation = (error: unknown): boolean => pgCode(error) === '23505';
const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';

export type CareersMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

export type CareersActionResult = { ok: true } | { ok: false; error: string };

// ── Invalidation + IndexNow ─────────────────────────────────────────────────

/** What the public site could see of a row: its state + a public fingerprint. */
type PublicRef = {
  status: JobStatusField;
  fingerprint: string;
  title: string;
  /** "Every role we list is remote" — the FAQ answer this can flip. */
  remote: boolean;
};

const CAREERS_PATH = '/contact/careers';
const FAQ_PATH = '/frequently-asked-questions';

function refFrom(row: JobOpening, categoryName: string): PublicRef {
  return {
    status: row.status,
    title: row.title,
    remote: isRemoteLocation(row.location),
    fingerprint: openingFingerprint({ ...row, categoryName }),
  };
}

/**
 * Every public read refreshes on the next visit, and IndexNow hears about
 * it when — and only when — something a visitor can see changed:
 *  - /contact/careers when a non-draft row's public fingerprint or status
 *    changed, or a non-draft row was created/deleted;
 *  - /frequently-asked-questions additionally when the OPEN set changed
 *    (the "Are you hiring?" answer names the open roles), i.e. a row
 *    crossed 'open' in either direction or an open row was retitled.
 * Pass `previous` as undefined on create, `current` as undefined on delete.
 */
function invalidateCareers(current?: PublicRef, previous?: PublicRef) {
  updateTag(CAREERS_TAG);
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/pages.xml');
  revalidatePath('/admin', 'layout');

  const wasPublic = previous !== undefined && previous.status !== 'draft';
  const isPublic = current !== undefined && current.status !== 'draft';
  const pageChanged =
    wasPublic !== isPublic ||
    (isPublic && wasPublic && current.fingerprint !== previous.fingerprint);
  if (!pageChanged) return;

  const urls = [CAREERS_PATH];
  const wasOpen = previous?.status === 'open';
  const isOpen = current?.status === 'open';
  // "Are you hiring?" names the open roles; "Are the roles remote?" claims
  // every listed role is remote. A row that is absent (created/deleted) or
  // not public counts as remote — it can't falsify the claim.
  const wasRemote = wasPublic ? previous.remote : true;
  const nowRemote = isPublic ? current.remote : true;
  if (
    wasOpen !== isOpen ||
    (isOpen && wasOpen && current.title !== previous.title) ||
    wasRemote !== nowRemote
  ) {
    urls.push(FAQ_PATH);
  }
  after(() => pingIndexNow(urls));
}

/** Bulk variant for category edits: the rename changed every listing's card. */
function invalidateCareersForCategory(changedPublicCopy: boolean) {
  updateTag(CAREERS_TAG);
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/pages.xml');
  revalidatePath('/admin', 'layout');
  if (changedPublicCopy) after(() => pingIndexNow([CAREERS_PATH]));
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function createJobCategory(
  input: unknown,
): Promise<CareersMutationResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    const parsed = jobCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenCareersIssues(parsed.error) };
    }
    const data = parsed.data;

    let inserted: { id: string }[];
    try {
      inserted = await db
        .insert(jobCategories)
        .values({
          name: data.name,
          slug: data.slug,
          icon: data.icon,
          sortIndex: data.sortIndex ?? (await nextCategorySort()),
        })
        .returning({ id: jobCategories.id });
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { slug: 'That slug is already in use.' } };
      }
      throw dbError;
    }

    logActivity(profile, {
      area: 'careers',
      entity: 'job-category',
      entityId: inserted[0].id,
      entityName: data.name,
      action: 'create',
      summary: `Added the careers category ${data.name}`,
      payload: { meta: { slug: data.slug } },
    });

    // A new category has no listings yet, so nothing public changed.
    invalidateCareersForCategory(false);
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    reportError('[careers] createJobCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateJobCategory(
  id: string,
  input: unknown,
): Promise<CareersMutationResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = jobCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenCareersIssues(parsed.error) };
    }
    const data = parsed.data;

    const existing = await getCategoryById(id);
    if (!existing) return { ok: false, error: 'server' };
    if (data.slug !== existing.slug) {
      // The slug is the filter value and the seed key — renames change the
      // name only. Refused rather than silently ignored so the form says so.
      return { ok: false, error: 'validation', issues: { slug: 'A category slug can’t change after creation.' } };
    }

    const renamed = data.name !== existing.name;
    await db
      .update(jobCategories)
      .set({
        name: data.name,
        icon: data.icon,
        sortIndex: data.sortIndex ?? existing.sortIndex,
        // updated_at is the public freshness signal (the sitemap's lastmod
        // takes the newest one): only the name is visible copy, so an icon
        // or order change leaves it alone.
        ...(renamed ? { updatedAt: new Date() } : {}),
      })
      .where(eq(jobCategories.id, id));

    logActivity(profile, {
      area: 'careers',
      entity: 'job-category',
      entityId: id,
      entityName: data.name,
      action: 'update',
      summary: `Edited the careers category ${data.name}`,
      payload: { changes: diff({ name: existing.name }, { name: data.name }) },
    });

    // Only the name is visible copy (it heads every card under it); the
    // icon and order are presentation. Drafts are not on the page, so a
    // category whose listings are all drafts pings nothing.
    const listed = renamed && (await countPublicOpeningsInCategory(id)) > 0;
    invalidateCareersForCategory(listed);
    return { ok: true, id };
  } catch (error) {
    reportError('[careers] updateJobCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function deleteJobCategory(id: string): Promise<CareersActionResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid category.' };

    const inUse = await countOpeningsInCategory(id);
    if (inUse > 0) {
      return {
        ok: false,
        error: `This category still has ${inUse} role${inUse === 1 ? '' : 's'} — move or delete those first.`,
      };
    }
    const existing = await getCategoryById(id);
    if (!existing) return { ok: false, error: 'Category not found.' };

    try {
      await db.delete(jobCategories).where(eq(jobCategories.id, id));
    } catch (dbError) {
      // The FK is the race backstop: a listing landed between the count and
      // the delete.
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'This category still has roles — move or delete those first.' };
      }
      throw dbError;
    }

    logActivity(profile, {
      area: 'careers',
      entity: 'job-category',
      entityId: id,
      entityName: existing.name,
      action: 'delete',
      summary: `Deleted the careers category ${existing.name}`,
      payload: { meta: { slug: existing.slug } },
    });

    invalidateCareersForCategory(false);
    return { ok: true };
  } catch (error) {
    reportError('[careers] deleteJobCategory failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}

// ── Openings ────────────────────────────────────────────────────────────────

/** The parsed form as stored columns (the nullable triple + tags). */
function openingColumns(data: JobOpeningInput) {
  return {
    title: data.title,
    categoryId: data.categoryId,
    location: data.location,
    employmentType: data.employmentType,
    level: data.level,
    cadence: data.cadence,
    fit: data.fit,
    summary: data.summary,
    tags: data.tags,
    status: data.status,
    datePosted: data.datePosted ?? null,
    validThrough: data.validThrough ?? null,
    payMin: data.payMin ?? null,
    payMax: data.payMax ?? null,
    payUnit: data.payUnit ?? null,
  };
}

export async function createJobOpening(
  input: unknown,
): Promise<CareersMutationResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    const parsed = jobOpeningSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenCareersIssues(parsed.error) };
    }
    const data = parsed.data;

    const category = await getCategoryById(data.categoryId);
    if (!category) {
      return { ok: false, error: 'validation', issues: { categoryId: 'Pick a category from the list.' } };
    }

    let inserted: JobOpening[];
    try {
      inserted = await db
        .insert(jobOpenings)
        .values({
          slug: data.slug,
          ...openingColumns(data),
          sortIndex: data.sortIndex ?? (await nextOpeningSort(data.categoryId)),
        })
        .returning();
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { slug: 'That slug is already in use.' } };
      }
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { categoryId: 'That category was just deleted — pick another.' } };
      }
      throw dbError;
    }
    const row = inserted[0];

    logActivity(profile, {
      area: 'careers',
      entity: 'job-opening',
      entityId: row.id,
      entityName: row.title,
      action: 'create',
      summary: `Added the role ${row.title}`,
      payload: { meta: { slug: row.slug, status: row.status } },
    });

    invalidateCareers(refFrom(row, category.name));
    return { ok: true, id: row.id };
  } catch (error) {
    reportError('[careers] createJobOpening failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateJobOpening(
  id: string,
  input: unknown,
): Promise<CareersMutationResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const parsed = jobOpeningSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenCareersIssues(parsed.error) };
    }
    const data = parsed.data;

    const existing = await getOpeningById(id);
    if (!existing) return { ok: false, error: 'server' };
    if (data.slug !== existing.slug) {
      // The slug is stored on every application for this role and is the
      // deep-link payload — it never changes. Refused, not silently kept.
      return { ok: false, error: 'validation', issues: { slug: 'A role’s slug can’t change after creation — it is stored on its applications.' } };
    }

    const [previousCategory, category] = await Promise.all([
      existing.categoryId === data.categoryId ? null : getCategoryById(existing.categoryId),
      getCategoryById(data.categoryId),
    ]);
    if (!category) {
      return { ok: false, error: 'validation', issues: { categoryId: 'Pick a category from the list.' } };
    }

    // updated_at is the public freshness signal (the sitemap's lastmod takes
    // the newest non-draft one), so it moves only when something a visitor
    // can see changed — a reorder, a category move that keeps the name, or
    // a no-op save leaves it alone.
    const previousRef = refFrom(existing, (previousCategory ?? category).name);
    const publicChanged =
      openingFingerprint({ ...openingColumns(data), categoryName: category.name }) !==
      previousRef.fingerprint;

    let updated: JobOpening[];
    try {
      updated = await db
        .update(jobOpenings)
        .set({
          ...openingColumns(data),
          // A category move appends at the end of the new group unless an
          // explicit order was given; otherwise the slot is kept.
          sortIndex:
            data.sortIndex ??
            (existing.categoryId === data.categoryId
              ? existing.sortIndex
              : await nextOpeningSort(data.categoryId)),
          ...(publicChanged ? { updatedAt: new Date() } : {}),
        })
        .where(eq(jobOpenings.id, id))
        .returning();
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { categoryId: 'That category was just deleted — pick another.' } };
      }
      throw dbError;
    }
    const row = updated[0];

    logActivity(profile, {
      area: 'careers',
      entity: 'job-opening',
      entityId: id,
      entityName: row.title,
      action: existing.status === row.status ? 'update' : 'status',
      summary:
        existing.status === row.status
          ? `Edited the role ${row.title}`
          : `Set the role ${row.title} to ${row.status}`,
      payload: {
        changes: diff(
          { title: existing.title, status: existing.status },
          { title: row.title, status: row.status },
        ),
        meta: { slug: row.slug },
      },
    });

    invalidateCareers(refFrom(row, category.name), previousRef);
    return { ok: true, id };
  } catch (error) {
    reportError('[careers] updateJobOpening failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * The roster's quick flip. Re-runs the open-requires-pay/posted rule against
 * the STORED row: the dialog's schema can't be bypassed from here.
 */
export async function setJobOpeningStatus(
  id: string,
  status: string,
): Promise<CareersActionResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid role.' };
    if (!(JOB_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: 'Unknown status.' };
    }
    const next = status as JobStatusField;

    const existing = await getOpeningById(id);
    if (!existing) return { ok: false, error: 'Role not found.' };
    if (existing.status === next) return { ok: true };
    if (next === 'open') {
      const problem = openingCanOpen(existing);
      if (problem) return { ok: false, error: problem };
    }
    const category = await getCategoryById(existing.categoryId);
    if (!category) return { ok: false, error: 'Role not found.' };

    const [row] = await db
      .update(jobOpenings)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(jobOpenings.id, id))
      .returning();

    logActivity(profile, {
      area: 'careers',
      entity: 'job-opening',
      entityId: id,
      entityName: row.title,
      action: 'status',
      summary: `Set the role ${row.title} to ${next}`,
      payload: {
        changes: diff({ status: existing.status }, { status: next }),
        meta: { slug: row.slug },
      },
    });

    invalidateCareers(refFrom(row, category.name), refFrom(existing, category.name));
    return { ok: true };
  } catch (error) {
    reportError('[careers] setJobOpeningStatus failed', error);
    return { ok: false, error: 'Status change failed — try again.' };
  }
}

/**
 * Hard delete. Applications that named this role keep their `role_title`
 * snapshot (and the slug), so the inbox never loses the name — the count is
 * surfaced in the confirm dialog, not enforced here: the user decided
 * deletion is allowed.
 */
export async function deleteJobOpening(id: string): Promise<CareersActionResult> {
  const profile = await requireArea('careers', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid role.' };

    const existing = await getOpeningById(id);
    if (!existing) return { ok: false, error: 'Role not found.' };
    const [category, applications] = await Promise.all([
      getCategoryById(existing.categoryId),
      countApplicationsForRole(existing.slug),
    ]);

    await db.delete(jobOpenings).where(eq(jobOpenings.id, id));

    logActivity(profile, {
      area: 'careers',
      entity: 'job-opening',
      entityId: id,
      entityName: existing.title,
      action: 'delete',
      summary: `Deleted the role ${existing.title}`,
      payload: { meta: { slug: existing.slug, status: existing.status, applications } },
    });

    invalidateCareers(undefined, refFrom(existing, category?.name ?? ''));
    return { ok: true };
  } catch (error) {
    reportError('[careers] deleteJobOpening failed', error);
    return { ok: false, error: 'Delete failed — try again.' };
  }
}
