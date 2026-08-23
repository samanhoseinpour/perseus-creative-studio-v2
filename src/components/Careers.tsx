import { cn } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import {
  LuArrowUpRight as ArrowUpRight,
  LuBanknote as Banknote,
  LuBriefcase as Briefcase,
  LuClock as Clock,
  LuGlobe as Globe,
  LuMapPin as MapPin,
  LuZap as Zap,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import NavButton from '@/components/NavButton';

import CareersRoles, {
  type CareersRoleGroup,
} from '@/components/CareersRoles';
import {
  careersFilterValue,
  composeHiringIntro,
  formatPay,
  JOB_EMPLOYMENT_TYPE_LABELS,
} from '@/lib/careerFields';
import { jobCategoryIcon } from '@/lib/jobCategoryIcons';
import {
  getCareersSnapshot,
  type PublicCategory,
  type PublicOpening,
} from '@/lib/careersStore';

// Server component: the listings data and the card markup render on the server
// so none of this copy ships as JavaScript (it used to ride the shared client
// chunk into every route). Only the filter is interactive — it lives in the
// CareersRoles client island, which receives each group below as pre-rendered
// ReactNodes (all listings + an open-only variant) and simply chooses which
// ones to mount.
//
// The openings live in Postgres (job_categories / job_openings, managed from
// /admin/careers) and arrive through the cached snapshot in
// src/lib/careersStore.ts — the same read the contact form's "Join the team"
// tab, the JobPosting JSON-LD, and the FAQ answers share, so none of them can
// disagree about which roles are open.

const isOpen = (opening: PublicOpening) => opening.status === 'open';

const renderOpening = (opening: PublicOpening, Icon: IconType) => {
  const isActive = isOpen(opening);
  const availabilityLabel = isActive ? 'Available' : 'Position filled';

  return (
    // The card is a div with an overlay NavButton (crawl-silent
    // router push — the ?tab=careers&role= prefill canonicalises to
    // /contact and must not enter the crawl graph; see NavButton).
    // Flow content (h3/p/div) can't live inside a <button>, so the
    // labelled overlay spans the card instead — same pattern as
    // CaseSlateCard. `disabled` on filled roles also removes them
    // from the tab order, which pointer-events-none never did.
    <div
      key={`job-${opening.slug}`}
      className={cn(
        'group relative block rounded-xl border bg-background p-5 shadow-sm transition-all cursor-pointer',
        isActive
          ? 'border-foreground/10 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-foreground/3 hover:shadow-md'
          : 'pointer-events-none border-foreground/5 opacity-60 grayscale',
      )}
    >
      <NavButton
        href={`/contact?tab=careers&role=${opening.slug}`}
        aria-label={`Apply for ${opening.title} at Perseus Creative Studio`}
        disabled={!isActive}
        className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-none"
      />
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-lg leading-normal font-semibold">
          {opening.title}
        </h3>
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-6" />
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
            isActive
              ? 'bg-foreground text-background'
              : 'bg-foreground/5 text-foreground/60',
          )}
        >
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/70">
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {opening.location}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {JOB_EMPLOYMENT_TYPE_LABELS[opening.employmentType]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
          <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          {opening.level}
        </span>
        {/* Pay sits with the other facts rather than in its own band, but
            carries a little more weight than its neighbours — it is the chip
            people scan for. Open listings only: a range beside "Position
            filled" advertises a job nobody can apply for. */}
        {isActive && opening.pay && (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.07] px-2.5 py-1 font-medium text-foreground/90">
            <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
            {formatPay(opening.pay)}
          </span>
        )}
        {/* Hiring-cadence chip only — "Immediate start" next to a
            "Position filled" badge contradicts itself, so a closed
            listing drops it and keeps the descriptive three. */}
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {opening.cadence}
          </span>
        )}
      </div>

      {opening.summary && (
        <p className="mt-4 text-sm leading-relaxed text-black/70">
          {opening.summary}
        </p>
      )}

      <p className="mt-3 text-sm text-black/55">
        <span className="font-medium text-black/70">Best for:</span>{' '}
        {opening.fit}
      </p>

      {opening.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {opening.tags.map((tag) => (
            <span
              key={`${opening.slug}-${tag}`}
              className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-foreground/70"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        className={cn(
          'mt-5 inline-flex items-center gap-2 text-sm font-medium',
          isActive ? 'text-foreground' : 'text-foreground/50',
        )}
      >
        {isActive ? 'Apply Now' : 'Position Filled'}
        {isActive && (
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
    </div>
  );
};

/**
 * One category block. Rendered twice per category — once with every listing
 * and once with the open ones only — so the client island can switch to an
 * "Open roles only" view without the cards ever shipping as JavaScript.
 */
const renderGroup = (
  category: PublicCategory,
  openings: PublicOpening[],
  Icon: IconType,
) => {
  const openCount = openings.filter(isOpen).length;

  return (
    <div className="flex w-full flex-col justify-start gap-5 tracking-tighter">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl leading-none font-semibold tracking-tighter">
          {category.name}
        </h2>
        {/* Solid chip counts what you can actually apply to; the muted one
            only appears when some listings in view are already filled. */}
        <div className="flex shrink-0 items-center gap-2">
          {openCount > 0 && (
            <span className="rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background">
              {openCount} open
            </span>
          )}
          {openCount < openings.length && (
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-sm text-foreground/70">
              {openings.length} role{openings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {openings.map((opening) => renderOpening(opening, Icon))}
      </div>
    </div>
  );
};

interface CareersProps {
  className?: string;
}

const Careers = async ({ className }: CareersProps) => {
  const snapshot = await getCareersSnapshot();

  // One fully server-rendered node per category (plus an open-only variant);
  // the client island mounts the selected ones. The snapshot already ranks
  // hiring categories first and open listings first inside each, so page
  // order is the store's order.
  const roleGroups: CareersRoleGroup[] = snapshot.categories.map(
    (category) => {
      const Icon = jobCategoryIcon(category.icon);
      const open = category.openings.filter(isOpen);

      return {
        value: careersFilterValue(category.slug),
        label: category.name,
        openCount: category.openCount,
        node: renderGroup(category, category.openings, Icon),
        openNode:
          category.openCount > 0 ? renderGroup(category, open, Icon) : null,
      };
    },
  );

  // The hero sentence is composed from the same open set the cards render,
  // so it can never name a role the page no longer lists.
  const openRoles = snapshot.categories.flatMap((c) =>
    c.openings.filter(isOpen),
  );
  // "Remote" in the accent line follows the listings too — post an on-site
  // role and the page stops claiming it (the help guide promises this).
  const allRemote = openRoles.every((o) => o.remote);
  const description = composeHiringIntro(
    openRoles.map((o) => o.title),
    allRemote,
  );

  return (
    <section className={cn('pt-28 sm:pt-32 pb-16 bg-background-contrast', className)}>
      <Container>
        <div className="flex w-full flex-col gap-14">
          <div>
            <Breadcrumb
              crumbs={[
                { label: 'Perseus', href: '/' },
                { label: 'Contact', href: '/contact' },
                { label: 'Careers' },
              ]}
            />
            <Heading
              titleTag="h1"
              seperatorTitle="Careers"
              eyebrowRight="Open Roles"
              title="Join our creative team"
              titleAccent={
                allRemote
                  ? 'Remote roles for builders, strategists, and creators.'
                  : 'Roles for builders, strategists, and creators.'
              }
              description={description}
              containerStyle="px-0 md:px-0 w-full max-w-none"
              titleStyle="max-w-4xl text-4xl md:text-5xl"
              descStyle="max-w-3xl"
            />
          </div>
          <div className="flex max-w-4xl flex-col gap-6">
            <div className="flex flex-wrap gap-3 text-sm text-foreground/75">
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Globe className="h-4 w-4" aria-hidden="true" />
                Remote-first team
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Flexible engagement types
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                <Zap className="h-4 w-4" aria-hidden="true" />
                High-impact client work
              </span>
            </div>
          </div>
          <CareersRoles groups={roleGroups} />
        </div>
      </Container>
    </section>
  );
};

export { Careers };
