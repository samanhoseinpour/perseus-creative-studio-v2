import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LuArrowLeft, LuExternalLink } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import { getAdminProject, listClientOptions } from '@/db/portfolioQueries';
import { GlassPanel } from '@/components/Admin/Glass';
import ProjectForm, {
  type ProjectFormValues,
} from '@/components/Admin/portfolio/ProjectForm';
import CoverField, {
  type CurrentCover,
} from '@/components/Admin/portfolio/CoverField';
import GalleryManager, {
  type GalleryItem,
} from '@/components/Admin/portfolio/GalleryManager';
import EmbedsEditor, {
  type EmbedItem,
} from '@/components/Admin/portfolio/EmbedsEditor';
import { VisibilityPill } from '@/components/Admin/portfolio/VisibilityPill';
import AdminPage from '@/components/Admin/AdminPage';

export const metadata: Metadata = {
  title: 'Edit project',
  description: 'The full editor for one portfolio project.',
};

/**
 * The full project editor: core fields (ProjectForm), then the media
 * sections — cover, gallery stills, video embeds. Media changes apply
 * immediately (each is its own action call); the form's Save covers only the
 * core fields.
 */
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('portfolio', '/admin');
  const { id } = await params;

  const [detail, clients] = await Promise.all([
    getAdminProject(id),
    listClientOptions(),
  ]);
  if (!detail) notFound();
  const { project, media } = detail;

  const initialValues: ProjectFormValues = {
    title: project.title,
    slug: project.slug,
    category: project.category,
    clientId: project.clientId ?? '',
    clientName: project.clientName ?? '',
    industry: project.industry,
    location: project.location ?? '',
    year: project.year,
    summary: project.summary,
    description: project.description ?? '',
    services: project.services,
    externalUrl: project.externalUrl ?? '',
    stats: (project.stats ?? []).map((s) => ({
      label: s.label,
      value: s.value,
      footnote: s.footnote ?? '',
    })),
    testimonialQuote: project.testimonialQuote ?? '',
    testimonialName: project.testimonialName ?? '',
    testimonialRole: project.testimonialRole ?? '',
    featured: project.featured,
    visibility: project.visibility,
  };

  const coverRow = media.find((m) => m.kind === 'cover' && m.variants);
  const currentCover: CurrentCover = coverRow?.variants
    ? {
        kind: 'media',
        url: coverRow.variants.w640?.url ?? coverRow.variants.full.url,
        alt: coverRow.alt ?? '',
      }
    : project.coverStaticPath
      ? {
          kind: 'static',
          url: project.coverStaticPath,
          alt: project.coverStaticAlt ?? '',
        }
      : null;

  const gallery: GalleryItem[] = media
    .filter((m) => m.kind === 'image' && m.variants)
    .map((m) => ({
      id: m.id,
      thumbUrl: m.variants!.w384?.url ?? m.variants!.full.url,
      alt: m.alt ?? '',
    }));

  const embeds: EmbedItem[] = media
    .filter(
      (m): m is typeof m & { embedRef: string } =>
        (m.kind === 'youtube' || m.kind === 'instagram') && m.embedRef !== null,
    )
    .map((m) => ({
      id: m.id,
      kind: m.kind as 'youtube' | 'instagram',
      ref: m.embedRef,
    }));

  return (
    <AdminPage width="narrow">
      <header className="mb-6 flex flex-col gap-2">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LuArrowLeft className="size-3.5" aria-hidden="true" />
          All projects
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {project.title}
          </h1>
          <VisibilityPill visibility={project.visibility} />
        </div>
        <p className="text-sm text-muted-foreground">
          Card, detail page, and media for this case file.{' '}
          {project.visibility !== 'draft' &&
          (project.description !== null || media.length > 0) ? (
            <a
              href={`/projects/${project.category}/${project.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              View it live
              <LuExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={`/projects/${project.category}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              View its category
              <LuExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <ProjectForm
          mode="edit"
          projectId={project.id}
          initialValues={initialValues}
          clients={clients}
        />

        <GlassPanel as="section" className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Cover
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            The poster frame on cards, the detail page, and link previews.
          </p>
          <CoverField projectId={project.id} current={currentCover} />
        </GlassPanel>

        <GlassPanel as="section" className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Gallery
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Stills on the detail page, in this order.
          </p>
          <GalleryManager projectId={project.id} items={gallery} />
        </GlassPanel>

        <GlassPanel as="section" className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Videos
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            YouTube and Instagram embeds — no video files to host.
          </p>
          <EmbedsEditor projectId={project.id} items={embeds} />
        </GlassPanel>
      </div>
    </AdminPage>
  );
}
