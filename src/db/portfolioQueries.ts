import 'server-only';
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  clients,
  contentVisibility,
  projectCategory,
  projectMedia,
  projects,
  type Client,
  type Project,
  type ProjectMediaRow,
  type ProjectStat,
} from '@/db/schema';

/**
 * Raw Drizzle reads for the portfolio tables (clients / projects /
 * project_media) — uncached on purpose. Public pages never call these
 * directly: they go through the tagged `unstable_cache` accessors in
 * src/lib/projectsStore.ts, which shape rows into the card/detail types and
 * make edits from /admin propagate via updateTag. The /admin portfolio pages
 * DO read here directly, so the COO always sees fresh rows including drafts.
 * Writes live in the co-located `_actions/{projects,clients}.ts` modules.
 */

export type ProjectCategorySlug = Project['category'];

/** The five category slugs, from the pgEnum — the DB and route vocabulary. */
export const PROJECT_CATEGORY_VALUES = projectCategory.enumValues;

/** Guard a route/url segment before it reaches a pgEnum cast: an unknown
 *  category must read as "not found", not a Postgres 22P02 throw. */
export function isProjectCategory(value: string): value is ProjectCategorySlug {
  return (PROJECT_CATEGORY_VALUES as readonly string[]).includes(value);
}

// A project has a detail page once real detail content exists — case-study
// copy or any media/embed row. Until then, cards keep linking to the category
// showcase and the detail route 404s (the curated-rollout contract).
const detailReadySql = sql<boolean>`(${projects.description} is not null
  or exists (select 1 from project_media pm where pm.project_id = ${projects.id}))`;

const projectSummaryColumns = {
  id: projects.id,
  category: projects.category,
  slug: projects.slug,
  title: projects.title,
  clientName: projects.clientName,
  industry: projects.industry,
  location: projects.location,
  year: projects.year,
  summary: projects.summary,
  services: projects.services,
  coverStaticPath: projects.coverStaticPath,
  coverStaticAlt: projects.coverStaticAlt,
  featured: projects.featured,
  sortIndex: projects.sortIndex,
  updatedAt: projects.updatedAt,
  hasDetail: detailReadySql,
} as const;

const clientJoinColumns = {
  clientCanonicalName: clients.name,
  clientLogoStaticPath: clients.logoStaticPath,
  clientLogoBlobUrl: clients.logoBlobUrl,
} as const;

export type PublicProjectRow = {
  id: string;
  category: ProjectCategorySlug;
  slug: string;
  title: string;
  clientName: string | null;
  industry: string;
  location: string | null;
  year: string;
  summary: string;
  services: string[];
  coverStaticPath: string | null;
  coverStaticAlt: string | null;
  featured: boolean;
  sortIndex: number;
  updatedAt: Date;
  hasDetail: boolean;
  clientCanonicalName: string | null;
  clientLogoStaticPath: string | null;
  clientLogoBlobUrl: string | null;
};

/**
 * The one query behind every public listing: all public projects with their
 * client join, in (category, sortIndex) order — i.e. the old registry order,
 * which the store's year-desc stable sort then reproduces exactly.
 */
export async function fetchPublicSnapshot(): Promise<PublicProjectRow[]> {
  return db
    .select({ ...projectSummaryColumns, ...clientJoinColumns })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.visibility, 'public'))
    .orderBy(asc(projects.category), asc(projects.sortIndex));
}

export type ProjectDetailRow = PublicProjectRow & {
  description: string | null;
  externalUrl: string | null;
  testimonialQuote: string | null;
  testimonialName: string | null;
  testimonialRole: string | null;
  stats: ProjectStat[] | null;
  visibility: Project['visibility'];
  media: ProjectMediaRow[];
};

/**
 * One project for its detail page: public or unlisted (the page emits noindex
 * for unlisted), never draft. Returns null when missing, draft, or the
 * category segment isn't one of the five — the route notFound()s.
 */
export async function fetchProjectDetail(
  category: string,
  slug: string,
): Promise<ProjectDetailRow | null> {
  if (!isProjectCategory(category)) return null;

  const [row] = await db
    .select({
      ...projectSummaryColumns,
      ...clientJoinColumns,
      description: projects.description,
      externalUrl: projects.externalUrl,
      testimonialQuote: projects.testimonialQuote,
      testimonialName: projects.testimonialName,
      testimonialRole: projects.testimonialRole,
      stats: projects.stats,
      visibility: projects.visibility,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(projects.category, category),
        eq(projects.slug, slug),
        inArray(projects.visibility, ['public', 'unlisted']),
      ),
    );
  if (!row) return null;

  const media = await db
    .select()
    .from(projectMedia)
    .where(eq(projectMedia.projectId, row.id))
    .orderBy(asc(projectMedia.sortOrder), asc(projectMedia.createdAt));

  return { ...row, media };
}

/**
 * Route params for every live detail page: public AND detail-ready (unlisted
 * pages render on demand via dynamicParams; drafts and content-less projects
 * 404). Feeds generateStaticParams and the projects sitemap section.
 */
export async function fetchPublicDetailParams(): Promise<
  { category: ProjectCategorySlug; slug: string; updatedAt: Date }[]
> {
  return db
    .select({
      category: projects.category,
      slug: projects.slug,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(eq(projects.visibility, 'public'), detailReadySql))
    .orderBy(asc(projects.category), asc(projects.sortIndex));
}

export type MarqueeClientRow = {
  name: string;
  logoStaticPath: string | null;
  logoBlobUrl: string | null;
  instagram: string | null;
  websiteUrl: string | null;
  logoDisc: Client['logoDisc'];
  marqueeFeatured: boolean;
};

/**
 * The Partners logo-wall members: every client with `marquee_sort` set, in
 * rail order. Membership doubles as ordering — null sort = not on the wall.
 */
export async function fetchMarqueeClients(): Promise<MarqueeClientRow[]> {
  return db
    .select({
      name: clients.name,
      logoStaticPath: clients.logoStaticPath,
      logoBlobUrl: clients.logoBlobUrl,
      instagram: clients.instagram,
      websiteUrl: clients.websiteUrl,
      logoDisc: clients.logoDisc,
      marqueeFeatured: clients.marqueeFeatured,
    })
    .from(clients)
    .where(isNotNull(clients.marqueeSort))
    .orderBy(asc(clients.marqueeSort), asc(clients.name));
}

// ─── /admin reads — always fresh, drafts included ───────────────────────────

export type ProjectVisibilitySlug = Project['visibility'];

export const PROJECT_VISIBILITY_VALUES = contentVisibility.enumValues;

export function isProjectVisibility(
  value: string,
): value is ProjectVisibilitySlug {
  return (PROJECT_VISIBILITY_VALUES as readonly string[]).includes(value);
}

// UUIDs are the PK; guard id-by-string reads so a malformed /admin/…/[id] URL
// returns "not found" instead of throwing a 500 at the Postgres type cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminProjectListRow = {
  id: string;
  category: ProjectCategorySlug;
  slug: string;
  title: string;
  /** Card display line: override ?? canonical client name. */
  clientDisplay: string | null;
  /** Canonical client slug — the ?client= deep-link filter key. */
  clientSlug: string | null;
  visibility: ProjectVisibilitySlug;
  featured: boolean;
  hasDetail: boolean;
  updatedAt: Date;
  coverStaticPath: string | null;
  /** The kind='cover' media row's variants, when a cover has been uploaded. */
  coverVariants: ProjectMediaRow['variants'];
};

const coverJoin = and(
  eq(projectMedia.projectId, projects.id),
  eq(projectMedia.kind, 'cover'),
);

/** The /admin/projects index: every row at once, newest-edit first —
 *  search/filtering is client-side in ProjectsList (~70 rows, the same
 *  trade the clients grid makes). */
export async function listAdminProjects(): Promise<AdminProjectListRow[]> {
  return db
    .select({
      id: projects.id,
      category: projects.category,
      slug: projects.slug,
      title: projects.title,
      clientDisplay: sql<
        string | null
      >`coalesce(${projects.clientName}, ${clients.name})`,
      clientSlug: clients.slug,
      visibility: projects.visibility,
      featured: projects.featured,
      hasDetail: sql<boolean>`(${projects.description} is not null
        or exists (select 1 from project_media pm where pm.project_id = ${projects.id}))`,
      updatedAt: projects.updatedAt,
      coverStaticPath: projects.coverStaticPath,
      coverVariants: projectMedia.variants,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(projectMedia, coverJoin)
    .orderBy(desc(projects.updatedAt));
}

export type AdminProjectDetail = {
  project: Project;
  client: Client | null;
  media: ProjectMediaRow[];
};

/** Everything the /admin/projects/[id] editor needs, in one read. */
export async function getAdminProject(
  id: string,
): Promise<AdminProjectDetail | null> {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({ project: projects, client: clients })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, id));
  if (!row) return null;

  const media = await db
    .select()
    .from(projectMedia)
    .where(eq(projectMedia.projectId, id))
    .orderBy(asc(projectMedia.sortOrder), asc(projectMedia.createdAt));

  return { project: row.project, client: row.client, media };
}

export type AdminClientRow = Client & {
  /** All projects pointing at this client (any visibility). */
  projectCount: number;
};

/** The /admin/clients roster, A→Z, with per-client project tallies. */
export async function listAdminClients(): Promise<AdminClientRow[]> {
  const rows = await db
    .select({
      client: clients,
      projectCount: count(projects.id),
    })
    .from(clients)
    .leftJoin(projects, eq(projects.clientId, clients.id))
    .groupBy(clients.id)
    .orderBy(asc(clients.name));

  return rows.map((r) => ({ ...r.client, projectCount: r.projectCount }));
}

/** Slim id/name options for the project form's client picker. */
export async function listClientOptions(): Promise<
  { id: string; name: string }[]
> {
  return db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(asc(clients.name));
}
