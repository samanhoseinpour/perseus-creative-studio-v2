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
  '2026.8.19': {
    version: '2026.8.19',
    date: '2026-08-27',
    headline: 'Recent logs that actually arrive, and request success counted by Vercel.',
    // QUIET: both live behind the owner-granted Monitoring area, and the
    // change corrects a panel and a sentence rather than moving a habit.
    announce: 'quiet',
    entries: [
      {
        area: 'monitoring',
        id: '2026.8.19/recent-logs',
        kind: 'fixed',
        title: 'The Vercel log panel now answers',
        what: 'The panel listened to a Vercel stream that never replied, so every click ended in “did not answer”. It now asks Vercel for the last five minutes of the request log of the build serving the page, and shows what came back — each request with its status code, and our own log lines beneath it.',
        steps: [
          'The button is “Show the last 5 minutes”, and the section is “Recent on Vercel”: a window, not history, and never a rate. If the window held more than fits, the panel says so.',
          'Lines that are not ours are still counted and withheld, never shown, and a link that carries a credential — a client’s report link, a password-reset link — is shown as its pattern.',
        ],
        href: '/admin/monitoring',
        help: 'monitoring',
      },
      {
        area: 'monitoring',
        id: '2026.8.19/request-success',
        kind: 'added',
        title: 'Request success, from Vercel’s own count',
        what: 'Service levels now leads with “Requests”: the share of the public site’s production responses that were not a server error over the last 30 days, from Vercel’s count of every response, folded in every 15 minutes — with the failure budget used, and “Not enough data” until a thousand responses stand behind it.',
        steps: [
          'Only a 5xx counts against it. A 404 or a 401 is a response the server gave as asked, not an outage.',
          'The earlier note that this figure could not exist was wrong: Vercel’s documented query API has a real time window. Latency and volume still live on Vercel.',
        ],
        href: '/admin/monitoring',
        help: 'monitoring',
      },
    ],
  },
  '2026.8.18': {
    version: '2026.8.18',
    date: '2026-08-27',
    headline: 'A quieter task board, controls that fit on one line, and a phone card you can actually see.',
    // QUIET: the tick boxes are found by moving the mouse, select-all is where
    // a table's select-all belongs, and the card fix is a thing looking right
    // rather than a habit that changed. Nothing here needs interrupting for.
    announce: 'quiet',
    entries: [
      {
        area: 'tasks',
        id: '2026.8.18/row-tick-boxes',
        kind: 'improved',
        title: 'Select all moved to the top of its own column',
        what: 'The “Select all” row that sat above the list on a computer is gone; its tick box is now at the top of the column of tick boxes, in the table’s own heading. That is one less band of controls between you and the work.',
        steps: [
          'The box beside each task is unchanged, except that it no longer crowds the task’s name and now sits level with the middle of its row.',
          'Picking with the keyboard is unchanged — x still selects the row you are on.',
        ],
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        area: 'tasks',
        id: '2026.8.18/bulk-bar-one-line',
        kind: 'improved',
        title: 'The bar for several tasks at once fits on one line',
        what: 'Picking several tasks used to open a bar of thirteen controls that ran onto a second row on most screens, burying the four you reach for most. The controls are smaller now, and the seven that change a field — member, priority, client, tags, dates — sit behind “More”, which is where they already sat on a phone.',
        steps: [
          'Mark to do, In progress, Needs approval, Mark done, Delete and Clear are always on the line. Nothing scrolls out of reach.',
          'On a very wide screen the whole set still shows without opening “More”.',
        ],
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        area: 'tasks',
        id: '2026.8.18/filter-rail',
        kind: 'improved',
        title: 'The filter buttons take up less room',
        what: 'The row of filter buttons on the task board and both inboxes is smaller, so it stays on one line at widths where it used to fold onto a second one and push the list down the page. Nothing moved and nothing is hidden — the same buttons, in the same order.',
        href: '/admin/tasks',
        help: 'tasks',
      },
      {
        area: 'tasks',
        id: '2026.8.18/phone-card-edges',
        kind: 'fixed',
        title: 'Task cards are visible against the page on a phone',
        what: 'In the dark theme a card’s edge was drawn in a colour that could not be told apart from the page behind it, so the list read as one run of text with no boundary between one task and the next. Each card now sits on its own, and its tick box lines up with the task’s name and the ⋯ menu opposite it.',
        href: '/admin/tasks',
        help: 'tasks',
      },
    ],
  },
  '2026.8.16': {
    version: '2026.8.16',
    date: '2026-08-27',
    headline: 'Service levels, a live line to Vercel, and the history of any one thing.',
    // QUIET: two of the three live behind the owner-granted Monitoring area,
    // and the history links are a door people find by hovering, not a habit
    // that changed.
    announce: 'quiet',
    entries: [
      {
        area: 'monitoring',
        id: '2026.8.16/service-levels',
        kind: 'added',
        title: 'Service levels over the last 30 days',
        what: 'Monitoring now scores each dependency on how often its checks passed and each scheduled job on how many of its scheduled runs actually happened, against a target — with the failure budget used, and “Not enough data” rather than a figure until there is a real sample behind it.',
        steps: [
          'A request-success figure is deliberately absent: Vercel’s runtime log endpoint has no time window, so the dashboard has no honest count of requests to measure against. Those numbers stay on Vercel.',
        ],
        href: '/admin/monitoring',
        help: 'monitoring',
      },
      {
        area: 'monitoring',
        id: '2026.8.16/live-tail',
        kind: 'added',
        title: 'Listen to the live runtime logs for ten seconds',
        what: '“Tail live logs” opens Vercel’s log stream for the current build, keeps what arrives for ten seconds, and shows it — requests with their status codes, and our own log lines with their error class and route. Text that is not one of our lines is counted and withheld, never shown.',
        steps: [
          'It needs a Vercel access token in the environment (VERCEL_API_TOKEN). Until one is set the panel says so and the “Runtime logs” link opens Vercel instead.',
          'It is a sample of live traffic while you listen — not history, and never a rate.',
        ],
        href: '/admin/monitoring',
        help: 'monitoring',
      },
      {
        area: 'logs',
        id: '2026.8.16/entity-history',
        kind: 'added',
        title: 'See everything ever recorded about one thing',
        what: 'A ticket, an inquiry, an application and a project now carry a “History” link into Activity filtered to that one item, and every Activity entry offers “history” for the thing it is about — so “what happened to this?” is one click rather than a search.',
        href: '/admin/logs',
        help: 'logs',
      },
    ],
  },
  '2026.8.15': {
    version: '2026.8.15',
    date: '2026-08-27',
    headline: 'Pull down to refresh the dashboard on your phone.',
    // QUIET, even though it is a gesture nobody discovers on their own. It
    // works only in the app added to an iPhone Home Screen, and a release note
    // cannot speak to just those people — a notice would interrupt everyone on
    // a laptop about something they cannot do. The dot brings whoever is
    // curious here instead.
    announce: 'quiet',
    entries: [
      {
        id: '2026.8.15/pull-to-refresh',
        kind: 'added',
        title: 'Pull down to refresh the app on your phone',
        what: 'In the dashboard added to your iPhone Home Screen there is no address bar, so there was no way to reload it — you pulled down, the page bounced, and nothing happened. Pulling down from the top now refreshes it.',
        steps: [
          'An arrow appears as you pull and turns over once you have pulled far enough. Let go to refresh, or slide back up to change your mind.',
          'It only reacts at the very top of a page, and never while a window is open over it — and on the task board a sideways swipe on a card still means exactly what it did before.',
        ],
        href: '/admin',
        help: 'overview',
      },
    ],
  },
  '2026.8.14': {
    version: '2026.8.14',
    date: '2026-08-27',
    headline: 'The dashboard now watches its own health.',
    // QUIET. Monitoring is owner-granted, so on the day it ships one person
    // holds it and that person built the request; the Activity change is a
    // small affordance, not a habit anyone has to relearn.
    announce: 'quiet',
    entries: [
      {
        area: 'monitoring',
        id: '2026.8.14/monitoring',
        kind: 'added',
        title: 'See whether the dashboard is healthy',
        what: 'A new Monitoring section under Team shows server errors over time, whether the database, file stores, email and notifications are reachable, whether every scheduled job ran on time, and any incident that is open — with one email and one notification to the people who hold it when something opens, and one more when it clears.',
        steps: [
          '"Check now" runs every check immediately instead of waiting for the next scheduled pass.',
          'Each error group and incident carries the ids to search Vercel’s runtime logs by; nothing here stores a stack trace or a message.',
        ],
        href: '/admin/monitoring',
        help: 'monitoring',
      },
      {
        area: 'logs',
        id: '2026.8.14/activity-request-id',
        kind: 'improved',
        title: 'Copy the request behind an Activity entry',
        what: 'Entries made on Vercel now show the id of the request they happened in, as a chip you can copy — paste it into the runtime-log search to see everything that request did.',
        href: '/admin/logs',
        help: 'logs',
      },
    ],
  },
  '2026.8.13': {
    version: '2026.8.13',
    date: '2026-08-27',
    headline: 'Your account tells you when it is signed in to, and signing out now quietens the device.',
    // A NOTICE, and the first entry is why: everyone is about to start
    // receiving a notification they have never seen before. An unexplained
    // "New sign-in to your account" is exactly the shape of a phishing push,
    // and somebody would be right to distrust it. Saying it first is what
    // makes it trustworthy later.
    announce: 'notice',
    entries: [
      {
        id: '2026.8.13/signin-alert',
        kind: 'added',
        title: 'You are told when your account is signed in to',
        what: 'Every time someone signs in to your account, your devices get a notification saying so. If it was you, ignore it. If it was not, it tells you to change your password — and that now ends every other session immediately.',
        steps: [
          'It says a sign-in happened and nothing else — no device, no place, no address. Those would render on a lock screen anyone could be holding, so the detail stays in Activity, behind your session.',
          'You will usually get one on the device you just signed in on too. A notification cannot be matched to the session that caused it, and guessing wrong would silence the alert on the device you are NOT holding — the only one that matters.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
      {
        id: '2026.8.13/signout-stops-notifications',
        kind: 'fixed',
        title: 'Signing out now stops that device notifying you',
        what: 'A device you signed out of carried on receiving notifications, and there was no way to stop it from that device — the switch lives on your profile, behind the sign-in you just left. Signing out now turns them off on that device as part of the same action.',
        steps: [
          'Only signing out on purpose does this. A device that simply went quiet for a day keeps its reminders, because reminders are most useful exactly when the dashboard is closed.',
          'Sign back in on that device and one tap turns them on again.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
  '2026.8.12': {
    version: '2026.8.12',
    date: '2026-08-27',
    headline: 'Passkeys and passwords are separate, and the dashboard now says so.',
    // QUIET. Nothing here asks anyone to do anything: one entry is a sentence
    // that was always true and merely unstated, and the other is a door that
    // closes behind you. 2026.8.11 already carries the "go and check your
    // devices" interruption; a second notice in the same deploy would spend
    // that attention on something nobody has to act on.
    announce: 'quiet',
    entries: [
      {
        id: '2026.8.12/passkeys-are-separate',
        kind: 'improved',
        title: 'Passkeys are separate — and the password box says so',
        what: 'A passkey is its own way in: it never depended on your password, so changing the password does not remove it or stop it working. That was always true and never written down anywhere you would read it. The password box now tells you how many passkeys the account has, and says so again when you finish changing it.',
        steps: [
          'If you are changing your password because you think someone else had access, review the passkey list afterwards and remove anything you do not recognise.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
      {
        id: '2026.8.12/no-passkey-after-signout',
        kind: 'fixed',
        title: 'A signed-out device can no longer add a passkey',
        what: 'When a password change signs your other devices out, one of them could still add a passkey for a few minutes afterwards — and a passkey outlasts every future password change. That window is closed: adding a passkey now re-checks that the session is genuinely still alive, and refuses if it is not.',
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
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
