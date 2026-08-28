import type { Metadata } from 'next';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { listAdminClients } from '@/db/portfolioQueries';
import { formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import ClientsGrid from '@/components/Admin/portfolio/ClientsGrid';
import { AddClientButton } from '@/components/Admin/portfolio/ClientDialog';
import type { AdminClientItem } from '@/components/Admin/portfolio/ClientDialog';

export const metadata: Metadata = {
  title: 'Clients',
  description: 'The client roster behind project attribution and the logo marquee.',
};

/** First value of a possibly-repeated query param. */
const firstParam = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

/**
 * The portfolio client roster: every client on file, each tile opening the
 * edit dialog. Clients attribute project case files and feed the Partners
 * logo marquee (home + about) — there is no public per-client page.
 * searchParams seed the grid: ?client=<id> auto-opens that client's dialog
 * and ?q= prefills the search — the ⌘K palette's deep links (there is no
 * client detail route; the dialog IS the editor).
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('clients', '/admin');
  const tz = await viewerZone();
  const params = await searchParams;
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
    // A seeded mark the upload only masks — clearing the upload reveals it
    // again, so the dialog says "Revert to default" rather than "Remove".
    hasDefaultLogo: c.logoStaticPath !== null,
    projectCount: c.projectCount,
    updatedLabel: formatRelative(tz, c.updatedAt),
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Clients
            </h1>
            <HelpButton topic={ADMIN_HELP.clients} />
          </div>
          <p className="text-sm text-muted-foreground">
            The roster behind case-file attribution and the logo marquee.
          </p>
        </div>
        <AddClientButton />
      </header>

      <GlassPanel className="mt-6">
        {(() => {
          // Only an id that exists in the (already area-gated) roster opens the
          // dialog — a foreign or malformed uuid is a silent no-op. The grid
          // consumes ?client= via an effect and strips it (so re-picking the
          // same client reopens); the key covers only the ?q= seed, which is
          // initial-state — a new handoff term re-seeds, an identical one is a
          // deliberate no-op.
          const openId = firstParam(params.client);
          const openClientId = items.some((i) => i.id === openId)
            ? openId
            : null;
          const initialQuery = firstParam(params.q).slice(0, 200);
          return (
            <ClientsGrid
              key={initialQuery}
              items={items}
              openClientId={openClientId}
              initialQuery={initialQuery}
            />
          );
        })()}
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Client details print on their project case files; logos on the wall
        feed the home and About marquees the moment they&rsquo;re saved. Keep
        marks clean, because they render small.
      </p>
    </AdminPage>
  );
}
