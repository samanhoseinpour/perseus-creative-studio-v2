import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { listAdminClients } from '@/db/portfolioQueries';
import { formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import ClientsGrid from '@/components/Admin/portfolio/ClientsGrid';
import { AddClientButton } from '@/components/Admin/portfolio/ClientDialog';
import type { AdminClientItem } from '@/components/Admin/portfolio/ClientDialog';

export const metadata: Metadata = {
  title: 'Clients',
  description: 'The client roster behind project attribution and the logo marquee.',
};

/**
 * The portfolio client roster: every client on file, each tile opening the
 * edit dialog. Clients attribute project case files and feed the Partners
 * logo marquee (home + about) — there is no public per-client page.
 */
export default async function ClientsPage() {
  await requireArea('portfolio', '/admin');
  const clients = await listAdminClients();

  // Slim, serializable client props; dates formatted server-side (fixed
  // locale) so the client tiles never do Date math — no hydration mismatch.
  const items: AdminClientItem[] = clients.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    industry: c.industry ?? '',
    location: c.location ?? '',
    websiteUrl: c.websiteUrl ?? '',
    instagram: c.instagram ?? '',
    bio: c.bio ?? '',
    marquee: c.marqueeSort !== null,
    marqueeFeatured: c.marqueeFeatured,
    logoDisc: c.logoDisc ?? 'none',
    marqueeSort: c.marqueeSort,
    logoUrl: c.logoBlobUrl ?? c.logoStaticPath,
    hasUploadedLogo: c.logoBlobPath !== null,
    projectCount: c.projectCount,
    updatedLabel: formatRelative(c.updatedAt),
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clients
          </h1>
          <p className="text-sm text-muted-foreground">
            The roster behind case-file attribution and the logo marquee.
          </p>
        </div>
        <AddClientButton />
      </header>

      <GlassPanel className="mt-6">
        <ClientsGrid items={items} />
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Client details print on their project case files; logos on the wall
        feed the home and About marquees the moment they&rsquo;re saved. Keep
        marks clean — they render small.
      </p>
    </AdminPage>
  );
}
