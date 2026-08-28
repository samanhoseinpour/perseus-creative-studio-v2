import type { Metadata } from 'next';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { listAdminCategories, listAdminOpenings } from '@/db/careersQueries';
import { dayKeyIn, daysBetweenDayKeys } from '@/lib/calendar';
import { formatPay, payFrom } from '@/lib/careerFields';
import { formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import CareersRoster from '@/components/Admin/careers/CareersRoster';
import { AddOpeningButton } from '@/components/Admin/careers/OpeningDialog';
import { CategoriesButton } from '@/components/Admin/careers/CategoriesDialog';
import { dayKeyLabel, EXPIRY_SOON_DAYS } from '@/components/Admin/careers/format';
import type {
  AdminCategoryItem,
  AdminOpeningItem,
} from '@/components/Admin/careers/types';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'The job openings behind the public careers page.',
};

/** First value of a possibly-repeated query param. */
const firstParam = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

/**
 * Where a listing's expiry sits against the viewer's today. Pure day-key
 * arithmetic (calendar.ts) — `validThrough` is a calendar KEY, so the only
 * instant involved is "now", resolved once in the viewer's zone.
 */
function expiresStateFor(
  validThrough: string | null,
  todayKey: string,
): AdminOpeningItem['expiresState'] {
  if (!validThrough) return 'none';
  const days = daysBetweenDayKeys(todayKey, validThrough);
  if (days < 0) return 'expired';
  if (days <= EXPIRY_SOON_DAYS) return 'soon';
  return 'ok';
}

/**
 * The job openings roster: every listing (drafts included), grouped by
 * category, each row opening the edit dialog. The public careers page, the
 * contact form's role select, and the JobPosting JSON-LD all read what is
 * saved here. searchParams seed the roster: ?role=<id> auto-opens that
 * listing's dialog and ?q= prefills the search (the clients page's deep-link
 * recipe — there is no per-role detail route; the dialog IS the editor).
 */
export default async function CareersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArea('careers', '/admin');
  const tz = await viewerZone();
  const params = await searchParams;
  const [openings, categories] = await Promise.all([
    listAdminOpenings(),
    listAdminCategories(),
  ]);
  const todayKey = dayKeyIn(tz, new Date());

  // Slim, serializable row props. Every date leaves here as a string — the
  // calendar keys pass through untouched for the form's date inputs, their
  // labels are formatted once (UTC-pinned, they are keys not instants), and
  // the expiry bucket is decided against the viewer's today right here — so
  // the roster never constructs a Date in the browser.
  const items: AdminOpeningItem[] = openings.map((o) => {
    const pay = payFrom(o.payMin, o.payMax, o.payUnit);
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      categoryId: o.categoryId,
      categoryName: o.categoryName,
      location: o.location,
      employmentType: o.employmentType,
      level: o.level,
      cadence: o.cadence,
      fit: o.fit,
      summary: o.summary,
      tags: o.tags,
      status: o.status,
      datePosted: o.datePosted ?? '',
      validThrough: o.validThrough ?? '',
      payMin: o.payMin === null ? '' : String(o.payMin),
      payMax: o.payMax === null ? '' : String(o.payMax),
      payUnit: o.payUnit ?? '',
      payLabel: pay ? formatPay(pay) : '',
      postedLabel: dayKeyLabel(o.datePosted),
      expiresLabel: dayKeyLabel(o.validThrough),
      expiresState: expiresStateFor(o.validThrough, todayKey),
      applicationCount: o.applicationCount,
      inboxApplicationCount: o.inboxApplicationCount,
      sortIndex: o.sortIndex,
      updatedLabel: formatRelative(tz, o.updatedAt),
    };
  });

  const categoryItems: AdminCategoryItem[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    sortIndex: c.sortIndex,
    openingCount: c.openingCount,
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Website
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Careers
            </h1>
            <HelpButton topic={ADMIN_HELP.careers} />
          </div>
          <p className="text-sm text-muted-foreground">
            Open, filled, and draft roles on the public careers page, grouped
            by category.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoriesButton categories={categoryItems} />
          <AddOpeningButton categories={categoryItems} />
        </div>
      </header>

      <GlassPanel className="mt-6">
        {(() => {
          // Only an id that exists in the (already area-gated) roster opens
          // the dialog — a foreign or malformed uuid is a silent no-op. The
          // roster consumes ?role= via an effect and strips it (so re-picking
          // the same role reopens); the key covers only the ?q= seed, which
          // is initial-state — a new handoff term re-seeds, an identical one
          // is a deliberate no-op.
          const openId = firstParam(params.role);
          const openOpeningId = items.some((i) => i.id === openId)
            ? openId
            : null;
          const initialQuery = firstParam(params.q).slice(0, 200);
          return (
            <CareersRoster
              key={initialQuery}
              items={items}
              categories={categoryItems}
              openOpeningId={openOpeningId}
              initialQuery={initialQuery}
            />
          );
        })()}
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Open roles need a pay range and a posted date. The page copy, the
        search description, and the FAQ write themselves from whatever is
        open.
      </p>
    </AdminPage>
  );
}
