import 'server-only';
import { unstable_cache } from 'next/cache';

import {
  fetchLatestPublicCareersChange,
  fetchPublicCareers,
  fetchRoleTitles,
} from '@/db/careersQueries';
import {
  GENERAL_APPLICATION,
  isRemoteLocation,
  payFrom,
  type JobEmploymentTypeField,
  type JobPay,
  type JobStatusField,
} from '@/lib/careerFields';

/**
 * The public read layer for careers content — the async, DB-backed
 * replacement for the `JOBS` / `JOB_DETAILS` constants that lived in
 * src/constants/careers.ts. Consumed by the careers page (listings, hero
 * copy, metadata, JobPosting JSON-LD), the contact page (role select), the
 * contact action (title snapshot), the FAQ page (the two hiring answers),
 * and the pages sitemap (<lastmod>).
 *
 * Caching: every read is `unstable_cache`-wrapped under CAREERS_TAG with a
 * 24-hour TTL backstop. The /admin/careers server actions call `updateTag`
 * on every write, so an edit is visible on the next public render without a
 * redeploy — statically prerendered pages regenerate stale-while-revalidate.
 * One coarse snapshot (every non-draft listing + its category, one query)
 * backs every consumer except the role-title map, which must also see
 * drafts.
 *
 * Cached values round-trip through JSON: everything returned from a cached
 * loader is plain data — calendar keys stay strings, timestamps are ISO
 * strings, the title map is a Record (never a Map).
 */

export const CAREERS_TAG = 'careers';

// Tags are the real invalidation path; the TTL only backstops out-of-band
// edits (Drizzle Studio). It also pins the careers page's ISR window.
const TTL_SECONDS = 86400;

export type PublicOpening = {
  slug: string;
  title: string;
  location: string;
  remote: boolean;
  employmentType: JobEmploymentTypeField;
  level: string;
  cadence: string;
  fit: string;
  summary: string;
  tags: string[];
  /** Never 'draft' here — drafts are not in the snapshot. */
  status: Exclude<JobStatusField, 'draft'>;
  datePosted: string | null;
  validThrough: string | null;
  pay: JobPay | null;
};

export type PublicCategory = {
  slug: string;
  name: string;
  icon: string;
  /** Open listings first, then filled — source order inside each bucket. */
  openings: PublicOpening[];
  openCount: number;
};

export type CareersSnapshot = {
  /** Hiring categories first, then fully-staffed ones; empty ones absent. */
  categories: PublicCategory[];
  /** ISO timestamp of the newest public change, or null when nothing is listed. */
  latestChangeAt: string | null;
};

const loadSnapshot = unstable_cache(
  async (): Promise<CareersSnapshot> => {
    const [rows, latest] = await Promise.all([
      fetchPublicCareers(),
      fetchLatestPublicCareersChange(),
    ]);
    const byCategory = new Map<string, PublicCategory>();
    for (const row of rows) {
      const o = row.opening;
      const category =
        byCategory.get(row.categorySlug) ??
        (() => {
          const fresh: PublicCategory = {
            slug: row.categorySlug,
            name: row.categoryName,
            icon: row.categoryIcon,
            openings: [],
            openCount: 0,
          };
          byCategory.set(row.categorySlug, fresh);
          return fresh;
        })();
      if (o.status === 'draft') continue; // the query excludes these; belt and braces
      category.openings.push({
        slug: o.slug,
        title: o.title,
        location: o.location,
        remote: isRemoteLocation(o.location),
        employmentType: o.employmentType,
        level: o.level,
        cadence: o.cadence,
        fit: o.fit,
        summary: o.summary,
        tags: Array.isArray(o.tags) ? o.tags : [],
        status: o.status,
        datePosted: o.datePosted,
        validThrough: o.validThrough,
        pay: payFrom(o.payMin, o.payMax, o.payUnit),
      });
    }
    const categories = [...byCategory.values()].map((c) => {
      // Open listings first, filled after — visitors should land on what
      // they can apply to. Stable within each bucket, so the admin's order
      // still drives the ranking inside a category.
      const open = c.openings.filter((o) => o.status === 'open');
      const filled = c.openings.filter((o) => o.status !== 'open');
      return { ...c, openings: [...open, ...filled], openCount: open.length };
    });
    // Categories that are hiring lead the page (and the filter's category
    // list); fully-staffed ones keep their relative order below.
    return {
      categories: [
        ...categories.filter((c) => c.openCount > 0),
        ...categories.filter((c) => c.openCount === 0),
      ],
      latestChangeAt: latest ? latest.toISOString() : null,
    };
  },
  ['careers-snapshot-v1'],
  { tags: [CAREERS_TAG], revalidate: TTL_SECONDS },
);

export async function getCareersSnapshot(): Promise<CareersSnapshot> {
  return loadSnapshot();
}

/** The open listings in page order — the contact form's role options and
 *  the titles every copy composer is fed. */
export async function getOpenRoles(): Promise<
  { slug: string; title: string; remote: boolean }[]
> {
  const snapshot = await loadSnapshot();
  return snapshot.categories.flatMap((c) =>
    c.openings
      .filter((o) => o.status === 'open')
      .map((o) => ({ slug: o.slug, title: o.title, remote: o.remote })),
  );
}

/** Whether every listed (non-draft) role is remote — the FAQ's claim. */
export async function allListedRemote(): Promise<boolean> {
  const snapshot = await loadSnapshot();
  return snapshot.categories.every((c) => c.openings.every((o) => o.remote));
}

const loadRoleTitles = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await fetchRoleTitles();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.slug] = r.title;
    map[GENERAL_APPLICATION.slug] = GENERAL_APPLICATION.title;
    return map;
  },
  ['careers-role-titles-v1'],
  { tags: [CAREERS_TAG], revalidate: TTL_SECONDS },
);

/**
 * slug → title over EVERY listing (drafts and filled included) plus the
 * general-application sentinel. The contact action uses it to stamp the
 * title snapshot on an application; a slug it doesn't know is stored raw
 * rather than rejected (see submitContact).
 */
export async function getRoleTitleMap(): Promise<Record<string, string>> {
  return loadRoleTitles();
}

/** Newest public change, for the pages sitemap — null when nothing is listed. */
export async function latestCareersDate(): Promise<Date | null> {
  const snapshot = await loadSnapshot();
  return snapshot.latestChangeAt ? new Date(snapshot.latestChangeAt) : null;
}
