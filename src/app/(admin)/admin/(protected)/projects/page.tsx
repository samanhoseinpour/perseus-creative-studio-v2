import type { Metadata } from 'next';
import Link from 'next/link';
import { LuClapperboard } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import {
  isProjectCategory,
  isProjectVisibility,
  listAdminProjects,
} from '@/db/portfolioQueries';
import { formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import Button from '@/components/Button';
import ProjectsList, {
  type AdminProjectItem,
} from '@/components/Admin/portfolio/ProjectsList';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Every portfolio project — search, filter, edit, publish.',
};

/** First value of a possibly-repeated query param. */
const firstParam = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

/**
 * The portfolio project index. The server reads the whole roster once and
 * serializes slim rows; search + category/visibility/client filtering live
 * client-side in ProjectsList. searchParams only seed the initial filter
 * state (the clients page deep-links ?client=<slug>).
 */
export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('portfolio', '/admin');

  const params = await searchParams;
  const rawCategory = firstParam(params.category);
  const rawVisibility = firstParam(params.visibility);
  const initialCategory = isProjectCategory(rawCategory) ? rawCategory : null;
  const initialVisibility = isProjectVisibility(rawVisibility)
    ? rawVisibility
    : null;
  const initialClient = firstParam(params.client) || null;

  const rows = await listAdminProjects();
  const items: AdminProjectItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    clientDisplay: row.clientDisplay,
    clientSlug: row.clientSlug,
    visibility: row.visibility,
    featured: row.featured,
    hasDetail: row.hasDetail,
    liveHref:
      row.visibility !== 'draft' && row.hasDetail
        ? `/projects/${row.category}/${row.slug}`
        : null,
    thumbUrl:
      row.coverVariants?.w384?.url ??
      row.coverVariants?.full.url ??
      row.coverStaticPath,
    updatedLabel: formatRelative(row.updatedAt),
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            The case files behind /projects — cards, detail pages, and where
            each one appears.
          </p>
        </div>
        <Link href="/admin/projects/new" className="inline-flex">
          <Button size="small" icon={LuClapperboard} iconPosition="left">
            New project
          </Button>
        </Link>
      </header>

      <GlassPanel>
        <ProjectsList
          items={items}
          initialCategory={initialCategory}
          initialVisibility={initialVisibility}
          initialClient={initialClient}
        />
      </GlassPanel>
    </AdminPage>
  );
}
