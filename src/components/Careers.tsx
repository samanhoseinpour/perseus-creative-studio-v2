import { cn } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import {
  LuArrowUpRight as ArrowUpRight,
  LuBanknote as Banknote,
  LuChartColumn as BarChart2,
  LuBriefcase as Briefcase,
  LuClock as Clock,
  LuCode as Code,
  LuPenLine as Edit3,
  LuGlobe as Globe,
  LuInstagram as Instagram,
  LuPanelsTopLeft as Layout,
  LuMapPin as MapPin,
  LuSearch as Search,
  LuVideo as Video,
  LuZap as Zap,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import NavButton from '@/components/NavButton';

import CareersRoles, {
  type CareersRoleGroup,
} from '@/components/CareersRoles';
import {
  formatPay,
  JOBS,
  JOB_DETAILS,
  type JobOpening,
} from '@/constants/careers';

// Server component: the listings data and the card markup render on the server
// so none of this copy ships as JavaScript (it used to ride the shared client
// chunk into every route). Only the filter is interactive — it lives in the
// CareersRoles client island, which receives each group below as pre-rendered
// ReactNodes (all listings + an open-only variant) and simply chooses which
// ones to mount.
//
// The openings data lives in src/constants/careers.ts so the contact form's
// "Join the team" tab can share it (role select options + deep-link slugs).

const CATEGORY_ICONS: Record<string, IconType> = {
  'Social Media': Instagram,
  'Performance Marketing': BarChart2,
  Design: Layout,
  'Strategy & Operations': Briefcase,
  SEO: Search,
  'Video Production': Video,
  'Content & Copy': Edit3,
  'Creative Ops': Briefcase,
  'Web / Dev': Code,
};

// The join key between a rendered group and its entry in the filter select.
// The select's labels come from the group itself, so this map is the only
// place a category value is spelled out.
const CATEGORY_VALUE_MAP: Record<string, string> = {
  'Social Media': 'social_media',
  'Performance Marketing': 'performance_marketing',
  Design: 'design',
  'Strategy & Operations': 'strategy_and_operations',
  SEO: 'seo',
  'Video Production': 'video_production',
  'Web / Dev': 'web_and_dev',
};

const isOpen = (opening: JobOpening) => opening.availability === 'active';

const renderOpening = (opening: JobOpening, category: string) => {
  const details = JOB_DETAILS[opening.title];
  const Icon = CATEGORY_ICONS[category] ?? Briefcase;
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
          {opening.type}
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
            {opening.status}
          </span>
        )}
      </div>

      {details?.summary && (
        <p className="mt-4 text-sm leading-relaxed text-black/70">
          {details.summary}
        </p>
      )}

      <p className="mt-3 text-sm text-black/55">
        <span className="font-medium text-black/70">Best for:</span>{' '}
        {opening.fit}
      </p>

      {!!details?.tags?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {details.tags.map((tag) => (
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
const renderGroup = (category: string, openings: JobOpening[]) => {
  const openCount = openings.filter(isOpen).length;

  return (
    <div className="flex w-full flex-col justify-start gap-5 tracking-tighter">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl leading-none font-semibold tracking-tighter">
          {category}
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
        {openings.map((opening) => renderOpening(opening, category))}
      </div>
    </div>
  );
};

interface CareersProps {
  className?: string;
}

const Careers = ({ className }: CareersProps) => {
  // One fully server-rendered node per category (plus an open-only variant);
  // the client island mounts the selected ones.
  const groups: CareersRoleGroup[] = JOBS.map((job) => {
    // Open listings first, filled ones after — visitors should land on what
    // they can apply to. Stable within each bucket, so source order still
    // drives the ranking inside a category.
    const open = job.openings.filter(isOpen);
    const ranked = [...open, ...job.openings.filter((o) => !isOpen(o))];

    return {
      value: CATEGORY_VALUE_MAP[job.category],
      label: job.category,
      openCount: open.length,
      node: renderGroup(job.category, ranked),
      openNode: open.length > 0 ? renderGroup(job.category, open) : null,
    };
  });

  // Categories that are hiring lead the page (and the filter's category list);
  // fully-staffed ones keep their relative order below. Without this, every
  // open role sits under five filled categories.
  const roleGroups = [
    ...groups.filter((group) => group.openCount > 0),
    ...groups.filter((group) => group.openCount === 0),
  ];

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
              titleAccent="Remote roles for builders, strategists, and creators."
              description="We’re hiring four remote roles right now: SEO Specialist, WordPress Developer, Video Editor, and Videographer. Every other listing below is filled — we leave them up so you can see how the team is built. If one of those is your strength, send a general application through our contact page and we’ll come back to it when the seat opens."
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
