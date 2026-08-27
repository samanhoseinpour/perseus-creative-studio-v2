import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowUpRight, LuLayoutDashboard } from 'react-icons/lu';

import {
  canAccessArea,
  getAccessProfile,
  navAccess,
  viewerZone,
  visibleKinds,
} from '@/lib/adminAccess';
import { listActivity } from '@/db/activityQueries';
import { monitoringPulse } from '@/db/monitoringQueries';
import {
  getNewSubmissionCounts,
  getRecentSubmissions,
  listRecentSubmissionTimes,
} from '@/db/adminQueries';
import { costMonthRollups } from '@/db/costQueries';
import { adminMonthRollups, ownListPayments } from '@/db/payrollQueries';
import { listDoneSlices, listTasks } from '@/db/taskQueries';
import { countOwnOpenTickets, getTicketStatusCounts } from '@/db/ticketQueries';
import AdminGreeting from '@/components/Admin/AdminGreeting';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import HelpButton from '@/components/Admin/HelpButton';
import { LeaderboardPodium } from '@/components/Admin/leaderboard/LeaderboardSections';
import { buildDashboardLeaderboard } from '@/components/Admin/leaderboard/leaderboardData';
import {
  buildDayHero,
  foldInboxPulse,
  foldMoneyPulse,
  foldPayChip,
  foldStudioMonth,
  foldTickets,
  HERO_FETCH,
  foldSystemStatus,
  mapActivityPeek,
  mapRecentSubmissions,
  PULSE_DAYS,
} from '@/components/Admin/overview/overviewData';
import {
  ActivityPeek,
  SystemStatus,
  DayHero,
  InboxPulse,
  MoneyPulse,
  PayStatusChip,
  QuickActions,
  RecentSubmissions,
  StudioMonth,
  TicketsGauge,
  type QuickLink,
} from '@/components/Admin/overview/OverviewSections';
import {
  packModules,
  type OverviewModuleSpec,
} from '@/components/Admin/overview/overviewLayout';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { ADMIN_ROUTES, canSeeNavItem } from '@/lib/adminNav';
import {
  dayKeyIn,
  dayStartIn,
  monthTokenIn,
  monthWindowIn,
  shiftDayKey,
  shiftMonthToken,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Dashboard overview of the studio and your own work.',
};

type BandBKey =
  | 'podium'
  | 'pay'
  | 'quick'
  | 'pulse'
  | 'tickets'
  | 'money'
  | 'studio'
  | 'activity'
  | 'recent'
  | 'system';

/** Doors the bento never covers with a module of its own. `/admin` is this
 *  page, and Commitments is reached from Spend — the rail leaves it out for
 *  the same reason. */
const NEVER_A_QUICK_LINK = ['/admin', '/admin/spend/commitments'];

// Dashboard home as an access-gated bento: the "Your day" hero (the viewer's
// own deadline meter + worklist) beside a rail of podium / pay chip / quick
// actions, then a packed grid of per-area modules. Every module renders only
// for a viewer holding its grant, and every gated read below resolves to a
// fallback WITHOUT firing (the gate is both the access control and the cost
// control — neon-http pays one HTTPS round trip per query). A member with no
// areas gets the explanatory empty state instead.
export default async function AdminDashboard() {
  const profile = await getAccessProfile();
  const tz = await viewerZone();
  const { user } = profile.session;
  const kinds = visibleKinds(profile);
  const canInquiries = canAccessArea(profile, 'inquiries');
  const canApplications = canAccessArea(profile, 'applications');
  const canTickets = canAccessArea(profile, 'tickets');
  const canTasks = canAccessArea(profile, 'tasks');
  const canLeaderboard = canAccessArea(profile, 'leaderboard');
  const canReports = canAccessArea(profile, 'reports');
  const canLogs = canAccessArea(profile, 'logs');
  const canMonitoring = canAccessArea(profile, 'monitoring');
  const canPay = profile.payrollSelf && profile.payrollMemberId !== null;
  // BOTH money grants, never either. This is requireSpendOverview()'s rule
  // applied to a module: the card is the only readout here claiming to show
  // the whole of a month's outgoings, so a viewer holding one half would read
  // a partial total under a complete label — a correctness rule before a
  // privacy one, and nothing on screen would reveal it. Holding one grant
  // still gets that section's own door from the quick-actions card below.
  const canMoney =
    canAccessArea(profile, 'payroll') && canAccessArea(profile, 'costs');

  const now = new Date();
  const todayKey = dayKeyIn(tz, now);
  const monthToken = monthTokenIn(tz, now);
  const pulseSince = dayStartIn(tz, shiftDayKey(todayKey, -(PULSE_DAYS - 1)));
  const trendSince =
    monthWindowIn(tz, shiftMonthToken(monthToken, -11))?.since ?? now;

  // One flight. The first three reads are cache()d and already fired by the
  // protected layout, so they cost nothing here; the rest are this page's own
  // round trips, each gated on the viewer's access before the call.
  const [
    newCounts,
    ticketCounts,
    ownOpenTickets,
    heroPage,
    leaderboard,
    recentRows,
    pulseTimes,
    monthSlices,
    activityPage,
    pulseMonitoring,
    ownPayments,
    payRollups,
    costRollups,
  ] = await Promise.all([
    kinds.length > 0
      ? getNewSubmissionCounts()
      : Promise.resolve({ project: 0, career: 0 }),
    canTickets && profile.superadmin
      ? getTicketStatusCounts()
      : Promise.resolve(null),
    canTickets && !profile.superadmin
      ? countOwnOpenTickets(user.id)
      : Promise.resolve(0),
    canTasks
      ? listTasks({
          view: 'open',
          page: 1,
          perPage: HERO_FETCH,
          filters: { assigneeId: user.id },
          sort: 'due',
        })
      : Promise.resolve(null),
    canLeaderboard ? buildDashboardLeaderboard(tz, user.id) : null,
    kinds.length > 0 ? getRecentSubmissions(5, kinds) : Promise.resolve([]),
    kinds.length > 0
      ? listRecentSubmissionTimes(pulseSince, kinds)
      : Promise.resolve([]),
    canReports ? listDoneSlices({ since: trendSince }) : Promise.resolve(null),
    canLogs ? listActivity({ page: 1, perPage: 4 }) : Promise.resolve(null),
    // Two small reads (the check rows, the open incidents), gated exactly as
    // the page is: the headline is derived by the same fold the page uses.
    canMonitoring ? monitoringPulse() : Promise.resolve(null),
    canPay && profile.payrollMemberId
      ? ownListPayments(profile.payrollMemberId)
      : Promise.resolve(null),
    // Existing admin doors, both already read by buildSpendMonthView — no new
    // SQL and no third projection, which is what would route around payroll's
    // own-vs-admin split.
    canMoney ? adminMonthRollups([monthToken]) : Promise.resolve(null),
    canMoney ? costMonthRollups([monthToken]) : Promise.resolve(null),
  ]);

  const hasAnyArea = profile.areas.length > 0;

  const hero =
    canTasks && heroPage ? buildDayHero(tz, user.id, heroPage, now) : null;
  const pulse =
    kinds.length > 0
      ? foldInboxPulse(tz, newCounts, pulseTimes, canInquiries, canApplications, now)
      : null;
  const tickets = canTickets
    ? foldTickets(profile.superadmin, ticketCounts, ownOpenTickets)
    : null;
  const studio = monthSlices ? foldStudioMonth(tz, monthSlices, now) : null;
  const system = pulseMonitoring ? foldSystemStatus(pulseMonitoring, now) : null;
  const activity = activityPage
    ? mapActivityPeek(tz, activityPage.rows)
    : null;
  const recent = kinds.length > 0 ? mapRecentSubmissions(tz, recentRows) : null;
  const payChip = ownPayments ? foldPayChip(ownPayments) : null;
  const money =
    payRollups && costRollups
      ? foldMoneyPulse(
          tz,
          payRollups.get(monthToken),
          costRollups.get(monthToken),
          now,
        )
      : null;
  const hasPodium = Boolean(
    leaderboard && (leaderboard.champion || leaderboard.rows.length > 0),
  );

  // ── The doors the bento doesn't show ──────────────────────────────────────
  //
  // DERIVED from ADMIN_ROUTES — the one map of the route tree — and filtered by
  // canSeeNavItem, exactly as the ⌘K palette builds its "Go to" list. It used
  // to be a hand-written array of three, which is precisely how /admin/careers
  // shipped with no way in from this page at all: it joined the Website group
  // two days after the bento was built and nobody edited the literal. Derived,
  // the next admin route added gets a door here for free.
  //
  // `covered` is the set of hrefs the modules on THIS RENDER actually took —
  // not the areas the viewer holds. The difference matters: someone with the
  // leaderboard grant but an empty board gets no podium, and so should still be
  // handed the link rather than nothing at all.
  //
  // Payroll and Bills are deliberately never covered. The Money card links to
  // /admin/spend, so their own month screens stay listed here — which is also
  // what gives a single-money-grant holder (who gets no Money card) a door.
  const covered = new Set<string>([
    ...NEVER_A_QUICK_LINK,
    ...(hero ? ['/admin/tasks'] : []),
    ...(hasPodium ? ['/admin/leaderboard'] : []),
    ...(pulse ? ['/admin/inquiries', '/admin/applications'] : []),
    ...(tickets ? ['/admin/tickets'] : []),
    ...(money ? ['/admin/spend'] : []),
    ...(studio ? ['/admin/reports'] : []),
    ...(activity ? ['/admin/logs'] : []),
    ...(system ? ['/admin/monitoring'] : []),
    ...(payChip ? ['/admin/my-pay'] : []),
  ]);
  const access = navAccess(profile);
  const uncovered = ADMIN_ROUTES.filter(
    (route) => !covered.has(route.href) && canSeeNavItem(route, access),
  );
  // Profile goes last explicitly rather than by trusting ADMIN_ROUTES' order:
  // it is the one row here that is not a section, and it is the card's floor
  // for a member with no grants at all.
  const quickLinks: QuickLink[] = [
    ...uncovered.filter((route) => route.href !== '/admin/profile'),
    ...uncovered
      .filter((route) => route.href === '/admin/profile')
      .map((route) => ({ ...route, label: 'Your profile' })),
  ];

  // The rail always closes with quick actions; with slack (≤2 modules) the
  // card stretches and pins its shortcuts legend to the bottom.
  const railModules = 1 + (hasPodium ? 1 : 0) + (payChip ? 1 : 0);
  const railExpanded = railModules <= 2;

  const podiumNode = leaderboard && hasPodium && (
    <LeaderboardPodium
      champion={leaderboard.champion}
      rows={leaderboard.rows}
      monthLabelText={leaderboard.monthLabelText}
      viewerStanding={leaderboard.viewerStanding}
    />
  );

  // Band B: the packed bento. When the viewer has no tasks grant there is no
  // hero band, so the rail modules join this grid as standard-tier modules.
  const bandB: (OverviewModuleSpec<BandBKey> & { node: React.ReactNode })[] =
    [];
  if (!canTasks && hasAnyArea) {
    if (podiumNode) bandB.push({ key: 'podium', lg: 2, sm: 1, node: podiumNode });
    if (payChip)
      bandB.push({
        key: 'pay',
        lg: 2,
        sm: 1,
        node: <PayStatusChip data={payChip} />,
      });
    bandB.push({
      key: 'quick',
      lg: 2,
      sm: 1,
      node: <QuickActions links={quickLinks} expanded={false} />,
    });
  }
  if (pulse && (pulse.inquiries || pulse.applications))
    bandB.push({ key: 'pulse', lg: 3, sm: 2, node: <InboxPulse data={pulse} /> });
  if (tickets)
    bandB.push({
      key: 'tickets',
      lg: 2,
      sm: 1,
      node: <TicketsGauge data={tickets} />,
    });
  if (money)
    bandB.push({ key: 'money', lg: 3, sm: 2, node: <MoneyPulse data={money} /> });
  if (studio)
    bandB.push({ key: 'studio', lg: 3, sm: 2, node: <StudioMonth data={studio} /> });
  if (system)
    bandB.push({ key: 'system', lg: 2, sm: 1, node: <SystemStatus data={system} /> });
  if (activity)
    bandB.push({
      key: 'activity',
      lg: 3,
      sm: 2,
      node: <ActivityPeek rows={activity} />,
    });
  if (recent)
    bandB.push({
      key: 'recent',
      lg: 3,
      sm: 2,
      node: <RecentSubmissions rows={recent} />,
    });
  const packed = packModules(bandB);

  return (
    <AdminPage>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              <AdminGreeting name={user.name} />
            </h1>
            <HelpButton topic={ADMIN_HELP.overview} />
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}.
          </p>
        </div>
        {/* New tab on purpose: /admin is its own installable app with scope
            "/admin", so navigating this window to the public site would eject a
            member out of the app. Harmless in a browser tab. */}
        <Link
          href="/"
          target="_blank"
          rel="noopener"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          View the website
          <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      {!hasAnyArea && (
        <>
          <GlassPanel as="section">
            <EmptyState
              icon={LuLayoutDashboard}
              title="No areas assigned yet"
              description="A superadmin can grant you access from the Users page."
            />
          </GlassPanel>
          {payChip && (
            <section className="mt-4 max-w-md">
              <PayStatusChip data={payChip} />
            </section>
          )}
        </>
      )}

      {hero && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DayHero data={hero} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-col">
            {podiumNode && <div className="sm:col-span-2">{podiumNode}</div>}
            {payChip && (
              <div>
                <PayStatusChip data={payChip} />
              </div>
            )}
            <div className={cn('lg:flex-1', payChip ? '' : 'sm:col-span-2')}>
              <QuickActions links={quickLinks} expanded={railExpanded} />
            </div>
          </div>
        </section>
      )}

      {bandB.length > 0 && (
        <section
          className={cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6',
            hero && 'mt-4',
          )}
        >
          {bandB.map((module, i) => (
            <div key={module.key} className={cn(packed[i].className)}>
              {module.node}
            </div>
          ))}
        </section>
      )}
    </AdminPage>
  );
}
