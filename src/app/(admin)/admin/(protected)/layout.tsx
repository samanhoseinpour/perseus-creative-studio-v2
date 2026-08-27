import { cookies } from 'next/headers';
import { after } from 'next/server';

import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { canAccessArea, getAccessProfile, navAccess } from '@/lib/adminAccess';
import { shouldTouchPresence } from '@/lib/presence';
import { getAdminSession } from '@/lib/adminSession';
import { vapidPublicKey } from '@/lib/push';
import type { NavAccess } from '@/lib/adminNav';
import { CURRENT_VERSION, unseenFor } from '@/lib/adminReleases';
import { compareVersions, parseVersion } from '@/lib/releaseFields';
import {
  getNewSubmissionCounts,
  getUserPasskeyCount,
  catchUpReleaseWatermark,
  touchUserLastSeen,
} from '@/db/adminQueries';
import { countOwnOpenTickets, getTicketStatusCounts } from '@/db/ticketQueries';
import { countOpenTasks } from '@/db/taskQueries';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import PasskeyPrompt from '@/components/Admin/PasskeyPrompt';
import NotificationsPrompt from '@/components/Admin/NotificationsPrompt';
import ReleaseNotice from '@/components/Admin/ReleaseNotice';
import ReleaseHistoryDialog from '@/components/Admin/ReleaseHistoryDialog';
import { UnreadReleasesProvider } from '@/components/Admin/UnreadReleases';
import TimezoneSync from '@/components/Admin/TimezoneSync';
import PresenceHeartbeat from '@/components/Admin/PresenceHeartbeat';
import PullToRefresh from '@/components/Admin/PullToRefresh';
import AppBadge from '@/components/Admin/AppBadge';
import CommandPalette from '@/components/Admin/CommandPalette';
import SmartLenis from '@/components/SmartLenis';
import ThemedShader from '@/components/ui/ThemedShader';

// The real authentication boundary. Middleware (src/proxy.ts) does a fast
// cookie-only bounce; getAccessProfile() validates the session AND reads the
// caller's fresh role/areas row on every protected render, redirecting to
// /admin/login when either is missing. Login and reset-password live OUTSIDE
// this group, so they stay reachable when logged out (no redirect loop). This
// layout also hosts the persistent dashboard chrome (sidebar + mobile drawer)
// around every protected page — but its guard covers ONLY renders: every page,
// server action, and route handler re-gates itself through adminAccess.ts.
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Badge tallies start CONCURRENTLY with the access-profile read — on the
  // neon-http driver every query is its own HTTPS round trip, and serializing
  // the count wave behind the profile select used to add a full round trip to
  // every protected render. The profile only decides which tallies REACH the
  // client: disallowed counts are queried anyway and masked to 0 below, which
  // leaks nothing (the leak concern is what the browser sees, not what the
  // server computes). The passkey count needs the user id, so it chains off
  // the cookie-cached session (no DB) rather than the profile's PK select.
  const submissionCountsPromise = getNewSubmissionCounts();
  const ticketCountsPromise = getTicketStatusCounts();
  // The viewer's open tasks, not the team's — the badge is a personal
  // "you have work" signal. Needs the user id, so it chains off the
  // cookie-cached session (no DB) like the passkey count.
  const openTasksPromise = getAdminSession().then((s) =>
    s ? countOpenTasks(s.user.id) : 0,
  );
  // The tickets badge is role-split (see AdminNavCountKey in lib/adminNav.ts):
  // superadmins badge the all-open count, members the OPEN tickets they raised
  // — same number as the overview tile. (Their /admin/tickets list itself shows
  // every status; the badge is an "needs attention" signal, not a list total.)
  // Both counts are fetched because the profile that picks between them isn't
  // resolved yet; the unused one is discarded, same trade as the masking below.
  // cache()'d, so sharing it with the overview tile costs no second query.
  const ownOpenTicketsPromise = getAdminSession().then((s) =>
    s ? countOwnOpenTickets(s.user.id) : 0,
  );
  const passkeyCountPromise = getAdminSession().then((s) =>
    s ? getUserPasskeyCount(s.user.id) : 0,
  );
  // If the gate below redirects, these are left floating — mark them handled
  // so a failed count can't surface as an unhandled rejection.
  for (const p of [
    submissionCountsPromise,
    ticketCountsPromise,
    openTasksPromise,
    ownOpenTicketsPromise,
    passkeyCountPromise,
  ]) {
    p.catch(() => {});
  }

  const profile = await getAccessProfile();
  const { user } = profile.session;

  // Presence floor. PresenceHeartbeat is the real writer, but a navigation is
  // itself proof someone is here, and this covers the two cases the heartbeat
  // cannot: the first render after sign-in (stamped before any JS runs) and a
  // session where hydration never happens. Free — the throttle reads the value
  // the access profile already fetched — and behind after(), so a presence
  // write can never sit in front of the dashboard rendering.
  if (shouldTouchPresence(profile.lastSeenAt)) {
    after(() =>
      touchUserLastSeen(user.id).catch(() => {
        // A missed stamp is a stale dot on one screen. The next navigation or
        // heartbeat corrects it; nothing here is worth failing a render over.
      }),
    );
  }
  // Fresh image (not the cookie-cached session's) — see getAccessProfile.
  const avatar = resolveAdminAvatar({ ...user, image: profile.image });
  // One access profile feeds the whole chrome: which nav items the sidebar +
  // ⌘K palette show, and which badge tallies survive the server-side mask —
  // a count for an area the viewer can't open must not leak through a badge.
  // The tickets badge is all-open for superadmins, own-open for members.
  // Rides getAccessProfile's existing PK lookup (a LEFT JOIN, no extra round
  // trip). Payroll deliberately contributes NO badge: the tallies above are
  // computed for every viewer and masked afterwards, which for payroll would
  // mean counting other people's pay rows on a member's render.
  const access: NavAccess = navAccess(profile);

  // What's new, for this viewer. A pure fold over a module constant — no I/O —
  // and the watermark came free with the profile's PK read, so the whole
  // feature costs zero extra queries.
  const unseen = unseenFor(access, profile.releaseSeenVersion);

  // Catch the stored watermark up whenever there is NOTHING LEFT to show this
  // viewer. Beside the presence floor and for the same reasons: free (the
  // value is already fetched), and behind after() so it never sits in front of
  // the render. Gated on `unseen.count === 0`, so it can never skip an unread
  // note — if they have something to read, this does not fire.
  //
  // One rule, three holes closed:
  //  - a never-stamped NULL (a brand-new account). Without a write,
  //    resolveWatermark(null) → CURRENT_VERSION would be re-derived on every
  //    render, so someone who never dismisses anything would resolve to the
  //    then-current version for ever and never see a single release.
  //  - a JUNK value, which resolveWatermark degrades the same way and which
  //    would otherwise sit there permanently muting the feature for that
  //    person, with nothing on screen to explain it.
  //  - a release this viewer's AREAS hid entirely. That one is the subtle one:
  //    it stays above their stored watermark for ever, so granting them the
  //    area months later would RETRO-ANNOUNCE it — precisely what the
  //    no-retro-announce rule promises cannot happen.
  //
  // MONOTONIC, like the dismiss action: it may only move a watermark FORWARD.
  // The naive `stored !== CURRENT_VERSION` test also fired for a watermark
  // ABOVE the current release — which happens after a rollback, or to anyone
  // whose row a newer deploy already stamped — and quietly dragged them back,
  // re-announcing releases they had already dismissed. `parseVersion` returning
  // null is what keeps null and junk eligible: they are not "ahead", they are
  // not versions at all.
  const storedVersion = profile.releaseSeenVersion;
  const behind =
    parseVersion(storedVersion) === null ||
    compareVersions(CURRENT_VERSION, storedVersion!) > 0;
  if (unseen.count === 0 && storedVersion !== CURRENT_VERSION && behind) {
    after(() =>
      catchUpReleaseWatermark(user.id, storedVersion, CURRENT_VERSION).catch(() => {
        // A missed catch-up just means the next render tries again.
      }),
    );
  }
  const canInquiries = canAccessArea(profile, 'inquiries');
  const canApplications = canAccessArea(profile, 'applications');
  const canTickets = canAccessArea(profile, 'tickets');
  const canTasks = canAccessArea(profile, 'tasks');
  const [counts, passkeyCount, ticketCounts, openTasks, ownOpenTickets] =
    await Promise.all([
      submissionCountsPromise,
      passkeyCountPromise,
      ticketCountsPromise,
      openTasksPromise,
      ownOpenTicketsPromise,
    ]);

  // The rail's collapse preference, mirrored to a cookie by AdminSidebar so
  // this (already-dynamic) layout renders the correct width on first paint —
  // no wrong-width flash on reload. Absent cookie = expanded.
  const cookieStore = await cookies();
  const sidebarCollapsed =
    cookieStore.get('perseus.admin-sidebar')?.value === 'collapsed';

  return (
    <div className="relative isolate min-h-svh lg:flex">
      {/* Full-bleed, theme-aware shader — the same ambient glass environment as
          the login shell (bright Shader5 in light, dark-neon Shader4 in dark),
          fixed so it stays put while the dashboard scrolls. The isolate + the
          negative-z here trap the shader ABOVE the (admin) group layout's opaque
          `bg-background`; without the isolated stacking context that ancestor
          background would paint over the shader and hide it (see AdminAuthShell
          for the full rationale). Every panel's frost melts it into a soft wash. */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 print:hidden"
        aria-hidden="true"
      >
        <ThemedShader />
      </div>

      {/* `contents` leaves layout untouched on screen; print drops the whole
          chrome (rail + mobile top bar) so /admin pages — the monthly report's
          print view in particular — come out as clean documents. */}
      <div className="contents print:hidden">
        <AdminSidebar
          name={user.name}
          email={user.email}
          avatar={avatar}
          counts={{
            project: canInquiries ? counts.project : 0,
            career: canApplications ? counts.career : 0,
            // Area first: a superadmin whose 'tickets' grant is unticked must
            // not ship the global open count to a chrome with no Tickets row.
            ticket: canTickets
              ? profile.superadmin
                ? ticketCounts.open
                : ownOpenTickets
              : 0,
            task: canTasks ? openTasks : 0,
          }}
          access={access}
          defaultCollapsed={sidebarCollapsed}
          unseenUpdates={unseen.count}
        />
      </div>
      {/* The provider feeds the footer stamp's unread dot. `children` is
          server-rendered and passed through as a prop, so wrapping it here
          does NOT pull the page tree client-side — and the count is the one
          the layout already computed, so it costs no query. */}
      <main className="min-w-0 flex-1">
        <UnreadReleasesProvider count={unseen.count}>
          <SmartLenis>{children}</SmartLenis>
        </UnreadReleasesProvider>
      </main>

      {/* Post-login nudge to enrol a passkey; self-suppresses once one exists.
          `userId` namespaces its 30-day snooze so one admin's dismissal can't
          hide the prompt from the next admin to sign in on this browser. */}
      <PasskeyPrompt hasPasskey={passkeyCount > 0} userId={user.id} />

      {/* The one-time "here's what changed" note. Only a release that asked to
          interrupt gets here — a `quiet` one leaves the dot on the identity
          block and nothing else — and the entries have ALREADY been filtered to
          this viewer's areas, so nothing they may not read reaches the payload.
          Renders null when there is nothing to say. */}
      <ReleaseNotice releases={unseen.announce ? unseen.releases : []} />

      {/* The one-tap "turn notifications on" nudge, for the device in hand.
          Self-suppresses in every state it could not act on — already on,
          blocked in the browser, an iPhone not yet installed, or no push at all
          (which includes `npm run dev`) — so it costs nothing to mount here,
          and it needs NO query: whether this device is subscribed is answered
          by pushManager.getSubscription() in the browser. It stands aside for a
          day when a release note is about to interrupt the same login. */}
      <NotificationsPrompt
        vapidPublicKey={vapidPublicKey()}
        userId={user.id}
        noticePending={unseen.announce}
      />

      {/* The whole changelog, opened on demand from the footer stamp or the
          profile card. It fetches its content on FIRST OPEN, so a growing
          history never rides this layout's payload on every admin render. */}
      <ReleaseHistoryDialog />

      {/* Detection only, renders nothing: keeps the stored zone matching this
          browser so every server-rendered date resolves on the reader's own
          calendar day. Silent unless the zone actually changed. */}
      <TimezoneSync stored={profile.timezone} />
      <PresenceHeartbeat />
      {/* Renders nothing unless a finger is pulling, and only on an iOS home
          screen app — the one place with no reload affordance at all. */}
      <PullToRefresh />
      {/* Counts the app-icon badge back down. The service worker counts it up
          on each push; only the page knows someone is actually looking. */}
      <AppBadge />
      <CommandPalette access={access} />
    </div>
  );
}
