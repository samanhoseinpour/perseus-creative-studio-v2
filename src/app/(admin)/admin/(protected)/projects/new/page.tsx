import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { listClientOptions } from '@/db/portfolioQueries';
import ProjectForm from '@/components/Admin/portfolio/ProjectForm';
import AdminPage from '@/components/Admin/AdminPage';

export const metadata: Metadata = {
  title: 'New project',
  description: 'Add a project to the portfolio.',
};

/**
 * Step one of two: the core fields. Saving redirects into the editor
 * (/admin/projects/<id>), where cover, gallery, and embeds unlock — media
 * rows need a project id to belong to.
 */
export default async function NewProjectPage() {
  await requireArea('portfolio', '/admin');
  const clients = await listClientOptions();

  return (
    <AdminPage width="narrow">
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Portfolio
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New project
        </h1>
        <p className="text-sm text-muted-foreground">
          Starts as a draft — publish it from the editor when the media is in.
        </p>
      </header>

      <ProjectForm mode="create" clients={clients} />
    </AdminPage>
  );
}
