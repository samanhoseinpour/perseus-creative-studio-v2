import 'server-only';

import { canSeeNavItem, type NavAccess } from '@/lib/adminNav';
import {
  CURRENT_VERSION,
  RELEASE_VERSIONS,
  compareVersions,
  resolveWatermark,
  type Release,
  type ReleaseVersion,
} from '@/lib/releaseFields';

/**
 * What changed in the dashboard, and who it changed for — the CONTENT half of
 * "what's new". The vocabulary, the types and the version tuple live in the
 * client-safe leaf src/lib/releaseFields.ts.
 *
 * Content in CODE, not a table, and no /admin editor. The deploy IS the
 * trigger: a note that needed a separate DB write could ship out of step with
 * the feature it describes, and a member could read about a control that isn't
 * there yet. Same model as adminHelp.ts, which this file is shaped after.
 *
 * `Record<ReleaseVersion, Release>` keyed on RELEASE_VERSIONS is what stops the
 * two files drifting: a version in the tuple with no entry here is a type
 * error, and an entry here with no tuple slot is an excess-property error. So
 * `npm run build` enforces the seam and scripts/check-releases.mts only has to
 * enforce what types can't express — ordering, the CalVer grammar, and that
 * every href is reachable by the audience that is offered it.
 *
 * TWO RULES WHEN ADDING A RELEASE:
 *
 *  1. **Append-only.** Never edit, reorder or delete a published release.
 *     Everyone whose watermark has passed it will never see the correction —
 *     ship the correction as its own later release instead.
 *  2. **Only what a member would notice.** A new control, a moved control, a
 *     changed default, a habit that no longer works, a fix they had learned to
 *     work around. Refactors and invisible work get nothing: a changelog that
 *     lists everything is one nobody reads.
 *
 * `server-only` because the whole registry would otherwise be a candidate for
 * a client chunk. The check script reads it with
 * `node --conditions=react-server`, which resolves `server-only` to an empty
 * module — see the script's header.
 */
export const RELEASES: Record<ReleaseVersion, Release> = {
  '2026.8.11': {
    version: '2026.8.11',
    date: '2026-08-27',
    headline: 'The dashboard installed on an iPhone now signs out when it should.',
    // A NOTICE, and the one time that word is warranted for a fix. Everything
    // else here is "you will like this"; this one is "something you were told
    // had happened may not have". Anyone who changed their password to get a
    // device OUT of their account was shown a screen saying every other device
    // was signed out, and on one platform that could quietly not be true — so
    // the note has to reach them rather than wait to be found.
    announce: 'notice',
    entries: [
      {
        id: '2026.8.11/installed-app-sign-out',
        kind: 'fixed',
        title: 'The iPhone app signs out when your password changes',
        what: 'Changing your password signs out every other device. The dashboard added to an iPhone Home Screen could miss that and go on showing itself as signed in — after the app had been left in the background it stopped checking with the server, so it never found out. It now checks again the moment you reopen it, and cannot get stuck that way.',
        steps: [
          'If you have ever changed your password to get someone else out of your account, open the app on every device once and confirm it asks you to sign in.',
          'Nothing was exposed that the old password did not already reach, and the sign-out was always correct on the server — it was the app on screen that had not noticed.',
        ],
        href: '/admin/profile',
        help: 'profile',
        // No gate: everyone signs in, so everyone is the audience.
      },
    ],
  },
  '2026.8.10': {
    version: '2026.8.10',
    date: '2026-08-27',
    headline: 'Search stopped being fussy, and revisions started nesting properly.',
    // A NOTICE, not the usual quiet dot: logging a revision now closes the
    // round it replaces, which changes what happens when somebody presses a
    // button they already know. A habit that quietly does one more thing than
    // it used to is exactly what the one-time note is for.
    announce: 'notice',
    entries: [
      {
        id: '2026.8.10/forgiving-search',
        kind: 'improved',
        title: 'Search finds what you meant',
        what: 'Every search box in the dashboard now looks for your words anywhere in a row instead of demanding the exact phrase. “arshia real th” finds “Arshia Real Estate TH” — before, it found nothing at all, because “Estate” sat in the middle. Word order stops mattering, and you can mix things that live in different columns: a client’s name and a word from the title, in one go.',
        steps: [
          'If nothing matches and a spelling looks close, you get the results for the corrected words with “Showing results for …” above them, and a link back to exactly what you typed.',
          'This is every search at once — the task board, both inboxes, the activity log, clients, projects, careers, commitments, and ⌘K.',
        ],
        // No href, and no gate. The change is in every search box in the
        // dashboard, so any single destination would be arbitrary — and worse,
        // a link to one of them is a link somebody without that area gets
        // bounced from with nothing on screen to explain why.
      },
      {
        area: 'tasks',
        id: '2026.8.10/revision-rounds',
        kind: 'improved',
        title: 'Adding a revision closes the round it replaces',
        what: 'When you log a revision, the task it revises is marked done for you — the box is ticked before you start, and it says which month that files it under. Untick it if the original really is still open.',
        steps: [
          'A task that is already done never shows the box: re-finishing it would move it into this month’s report.',
          'The new round is tagged “Revision” for you, so the board filter finds it without anyone remembering.',
        ],
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        area: 'tasks',
        id: '2026.8.10/revision-nesting',
        kind: 'fixed',
        title: 'A third round points at the second, not the first',
        what: 'A revision of a revision used to read “Revision of” the original — so correcting round two looked like correcting round one. It now names the round it actually revises, and the original counts the whole chain: “2 revisions”, not “1”.',
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        id: '2026.8.10/updates-read',
        kind: 'fixed',
        title: 'Reading an update marks it read',
        what: 'Opening one of these notes and closing it clears its “Unread” mark and the dot beside your name. You had to find “Mark as read” before, which is why the dot kept coming back after you had already read everything.',
        href: '/admin/profile',
        help: 'profile',
      },
      {
        id: '2026.8.10/notification-test',
        kind: 'added',
        title: 'Send yourself a test notification',
        what: '“Send a test” under Notifications on your profile sends a real one to this device, so you can tell the difference between the dashboard not sending and your computer not showing it.',
        steps: [
          'If the test never appears but your app icon’s badge changes, the sending worked — look at the notification settings for the dashboard app on that device.',
          'On a Mac the installed dashboard has its own entry in System Settings under Notifications, separate from your browser’s.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
  '2026.8.9': {
    version: '2026.8.9',
    date: '2026-08-27',
    // Quiet, not a notice: nothing anyone does stops working, and this is what
    // most people already assumed a reset did. A one-time modal announcing
    // that a hole is closed reads as self-congratulation; the dot is the
    // right weight for "you may notice your phone asking again".
    announce: 'quiet',
    // No gate: everybody has a password.
    entries: [
      {
        id: '2026.8.9/reset-signs-out-everywhere',
        kind: 'fixed',
        title: 'Resetting a forgotten password signs out every device',
        what: 'Using “Forgot password?” on the sign-in page now ends every session on your account, so a device you no longer trust cannot carry on with the one it already had.',
        steps: [
          'You will sign in again on your other devices — that is the change, not a fault.',
          'A device that was already open takes a few minutes to lose its hold. If you are resetting because you suspect someone else had access, wait those few minutes and then check your passkey list on this page: a passkey added in the meantime would outlast the reset.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
  '2026.8.8': {
    version: '2026.8.8',
    date: '2026-08-26',
    headline: 'The dashboard home caught up with the sections added around it.',
    // Quiet: everything here is a readout or a link that is now simply there.
    // Nothing is a habit anyone has to be told about to keep working.
    announce: 'quiet',
    entries: [
      {
        areasAll: ['payroll', 'costs'],
        id: '2026.8.8/money-card',
        kind: 'added',
        title: 'The money this month, on the dashboard',
        what: 'A “Money” card on your dashboard adds this month’s salaries, wire fees and bills into one figure, with a bar showing the split — the same total the Spend page shows, so the two can never disagree.',
        steps: [
          'Click the card to open Spend, where the same month is broken down by person and by bill.',
          'If a payroll line is still a draft, the card says so underneath — drafts are not counted as money out yet.',
        ],
        href: '/admin/spend',
        help: 'overview',
      },
      {
        id: '2026.8.8/overview-doors',
        kind: 'improved',
        title: 'Every section you can open has a link from home',
        what: 'The shortcut card on your dashboard now lists every section you have access to that does not already have a card of its own — Careers and Bills were missing from it entirely, and anyone whose access was only those sections landed on a nearly empty page.',
        href: '/admin',
        help: 'overview',
      },
      {
        area: 'reports',
        id: '2026.8.8/studio-revisions',
        kind: 'improved',
        title: 'The studio card counts revisions separately',
        what: 'The “Tasks done” figure counts what was delivered, so three rounds on one video count as one video — the rounds are now named beside it instead of being silently missing from a number the hours beside it do include.',
        href: '/admin',
        help: 'overview',
      },
      {
        area: 'tasks',
        id: '2026.8.8/shared-on-your-day',
        kind: 'improved',
        title: 'Your day says who else is on a task',
        what: 'A task you share with someone now reads “with <name>” under its title on your dashboard, instead of looking exactly like work only you are doing.',
        href: '/admin',
        help: 'overview',
      },
    ],
  },
  '2026.8.7': {
    version: '2026.8.7',
    date: '2026-08-26',
    headline: 'The task board works properly on a phone now.',
    // Notice: the board changes shape on a phone, and two of the things it
    // can now do are gestures nobody would ever discover on their own.
    announce: 'notice',
    entries: [
      {
        area: 'tasks',
        id: '2026.8.7/task-cards',
        kind: 'improved',
        title: 'Tasks are cards on a phone',
        what: 'On a phone each task is its own card instead of a wide table you had to scroll sideways through, so a task’s client, dates and hours stay next to its name.',
        steps: [
          'Tap a card to open the task and change anything on it.',
          'Swipe a card left to delete it, or right to mark it done — both ask first, and “done” opens the same window as on a computer so you still enter the hours and the day.',
          'A task that is already done does not swipe right: reopening it moves it out of a month you may already have reported, so it stays in the ⋯ menu.',
          'Tap a card’s checkbox, or press and hold the card, to pick several at once — then the bar above the list acts on all of them.',
        ],
        href: '/admin/tasks',
        help: 'tasks',
      },
    ],
  },
  '2026.8.6': {
    version: '2026.8.6',
    date: '2026-08-26',
    headline: 'Version numbers now read as dates, and What’s new opens one release at a time.',
    // Quiet: nothing here is a new habit to learn — it is the things you
    // already use, working the way you expected them to.
    announce: 'quiet',
    entries: [
      {
        area: 'tasks',
        id: '2026.8.6/member-cell',
        kind: 'fixed',
        title: 'Photos on the Member column sit straight again',
        what: 'Since a task could be shared, every photo on the board carried a grey oval behind it that sat low and off-centre; the faces now sit inside their own ring, side by side.',
      },
      {
        id: '2026.8.6/whats-new-rows',
        kind: 'improved',
        title: 'Open one update instead of the whole list',
        what: 'Your profile now lists the five most recent updates, and opening one shows just that release — the older ones are no longer only reachable by scrolling past everything newer.',
        steps: [
          'Click any row under “What’s new” to read that release on its own.',
          '“All updates” inside it goes back to the full history, and so does “Read all updates”.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
      {
        id: '2026.8.6/install-guide',
        kind: 'improved',
        title: 'Installing the dashboard now tells you how',
        what: 'Where the browser offers no Install button, the card on your profile names the exact control for that device instead of going blank — the iPhone share sheet, the Android menu, Safari’s Add to Dock, or what is in the way on a Mac.',
        href: '/admin/profile',
        help: 'profile',
      },
      {
        id: '2026.8.6/version-dates',
        kind: 'improved',
        title: 'The version at the foot of the page is a date',
        what: 'Releases are numbered year.month.number-that-month, so the version says how fresh the dashboard is instead of counting features. Past releases were renumbered to match.',
      },
    ],
  },
  '2026.8.5': {
    version: '2026.8.5',
    date: '2026-08-26',
    // Quiet: a readout for whoever runs the team, not something anyone has to
    // be told about to keep working.
    announce: 'quiet',
    entries: [
      {
        superadmin: true,
        id: '2026.8.5/users-notifications',
        kind: 'added',
        title: 'See who can actually be notified',
        what: 'Each account on Users now shows how many devices have notifications switched on and when one was last reached, with a line at the top counting how many of the team are set up.',
        steps: [
          'A bell with a number means that many browsers are subscribed; a struck-through bell means none are.',
          '“notified” is the last time a notification actually landed — a device can be subscribed and still have quietly stopped working.',
          'You cannot switch it on for someone: browsers only allow it from a gesture by the person themselves, on their own Profile.',
        ],
        href: '/admin/users',
        help: 'users',
      },
    ],
  },
  '2026.8.4': {
    version: '2026.8.4',
    date: '2026-08-25',
    announce: 'notice',
    headline: 'A task can be shared by more than one person now.',
    entries: [
      {
        area: 'tasks',
        id: '2026.8.4/multi-assignee',
        kind: 'added',
        title: 'Put more than one member on a task',
        what: 'A shoot two people go on is one task with both of them on it, instead of one name and a second person nobody could see.',
        steps: [
          'Click the Member cell on any task and tick everyone who worked it — the menu stays open so you can pick several.',
          'The quick-add band and the task window take a whole crew the same way.',
          'Select several tasks and use “Add member” or “Remove member” to change them together; adding never removes who is already on them.',
          'Everyone on a task gets the assignment email, the daily due reminder, and sees it under “Mine”.',
        ],
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        area: 'leaderboard',
        id: '2026.8.4/shared-credit',
        kind: 'improved',
        title: 'Shared work counts for everyone who did it',
        what: 'Both people on a task are credited the delivery, while the hours are split evenly between them — so the studio total still says what the studio actually did.',
        steps: [
          'Your task count includes everything you were on, shared or not.',
          'The hours column shows your share: three hours between two of you is an hour and a half each.',
          '“Tasks completed” at the top counts each job once and says how many were shared, which is why the rows below can add up to more.',
        ],
        href: '/admin/leaderboard',
        help: 'leaderboard',
      },
      {
        area: 'reports',
        id: '2026.8.4/report-crew',
        kind: 'improved',
        title: 'Client reports name everyone who worked the account',
        what: 'The delivered-work table lists every member on a job, and the hours a client sees are unchanged — a shared task is still one delivery of the hours it took.',
        href: '/admin/reports',
        help: 'reports',
      },
    ],
  },
  '2026.8.3': {
    version: '2026.8.3',
    date: '2026-08-25',
    announce: 'notice',
    headline: 'Due work and new assignments can reach your phone now.',
    entries: [
      {
        // No gate fields: every member has a profile to switch this on from.
        id: '2026.8.3/notifications',
        kind: 'added',
        title: 'Turn on notifications for your devices',
        what: 'The dashboard can send a notification when work is due, something is assigned to you, or a message arrives — switched on per device, so your phone and your computer are set up separately.',
        steps: [
          'The dashboard offers this in a short note when you sign in — or turn it on any time under “Notifications” on your profile.',
          'On iPhone or iPad, add the dashboard to your Home Screen first and open it from that icon — a Safari tab cannot receive them.',
          'Do it again on every device you want nudged; each one is separate.',
          'They say how many things need you, never client names, task titles or figures — the detail stays in the email.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
  '2026.8.2': {
    version: '2026.8.2',
    date: '2026-08-25',
    announce: 'quiet',
    entries: [
      {
        area: 'tasks',
        id: '2026.8.2/task-tabs-scroll',
        kind: 'fixed',
        title: 'The task tabs stay put on a phone',
        what: 'Swiping the row of status tabs sideways could drag it up and off the top of the board, leaving the row blank until you reloaded. It now only moves sideways.',
        href: '/admin/tasks',
        help: 'tasks',
      },
    ],
  },
  '2026.8.1': {
    version: '2026.8.1',
    date: '2026-08-25',
    announce: 'notice',
    headline: 'The dashboard can now tell you when something changes.',
    entries: [
      {
        // No gate fields: this one is for everybody.
        id: '2026.8.1/whats-new',
        kind: 'added',
        title: 'Updates now come to you',
        what: 'When something in the dashboard changes, you get a short note explaining what it is and how to use it — covering only the parts of the dashboard you can open.',
        steps: [
          'Bigger changes open a one-time note like this one. Smaller ones just put a dot beside your name at the bottom of the sidebar.',
          'Every update is kept under “What’s new” on your profile, so you can go back and read one again later.',
          'The version number at the bottom of any page opens the same list.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
};

/** Every release, newest first — the tuple's order, not an object's. */
export const RELEASE_LIST: Release[] = RELEASE_VERSIONS.map((v) => RELEASES[v]);

/**
 * Drop the entries this viewer may not see, and drop the release entirely if
 * nothing survives — which is what stops a payroll-only release lighting a dot,
 * or opening an empty dialog, for someone without the grant.
 *
 * Entries outside the viewer's areas are ABSENT, never counted. "3 changes you
 * can't see" leaks activity about a surface they don't hold — the same reading
 * that makes requireOwnPayroll() bounce rather than render an empty page — and
 * a count with no remedy can only produce a grant request nobody invited.
 * (Not a no-silent-truncation violation: that rule is about arithmetic which
 * must reconcile, and a release feed has no total to reconcile against.)
 */
function narrow(release: Release, access: NavAccess): Release | null {
  const entries = release.entries.filter((entry) =>
    canSeeNavItem(entry, access),
  );
  return entries.length ? { ...release, entries } : null;
}

/**
 * The whole history this viewer may read — deliberately NOT watermark-filtered.
 *
 * The watermark gates the ANNOUNCEMENT; the areas gate the CONTENT; they are
 * independent. So a member granted an area today is not retro-announced its
 * history (re-announcing months of a section is the same wall-of-history a new
 * account must not get, and the section's ⓘ guide is the right artifact for
 * "I'm new here") — but they can read all of it on their profile the moment
 * the grant lands.
 */
export function visibleReleases(
  access: NavAccess,
  releases: Release[] = RELEASE_LIST,
): Release[] {
  return releases
    .map((release) => narrow(release, access))
    .filter((release): release is Release => release !== null);
}

/**
 * What this viewer has not seen yet: the releases above their watermark, each
 * narrowed to the entries they may read, plus whether any of them asked to
 * interrupt.
 *
 * `count` is entries rather than releases, because that is what the dot's
 * accessible name says and what the profile card's button offers to clear.
 *
 * `releases` defaults to the real registry and is injectable ONLY so
 * scripts/check-releases.mts can run this against fixtures covering audiences
 * and watermarks the live registry does not yet contain. Never pass it in app
 * code — a second source of releases is a second answer to "what's new".
 */
export function unseenFor(
  access: NavAccess,
  stored: string | null | undefined,
  releases: Release[] = RELEASE_LIST,
): { releases: Release[]; count: number; announce: boolean } {
  const watermark = resolveWatermark(stored);
  const unseen = releases
    .filter((release) => compareVersions(release.version, watermark) > 0)
    .map((release) => narrow(release, access))
    .filter((release): release is Release => release !== null);

  return {
    releases: unseen,
    count: unseen.reduce((total, release) => total + release.entries.length, 0),
    announce: unseen.some((release) => release.announce === 'notice'),
  };
}

export { CURRENT_VERSION };
