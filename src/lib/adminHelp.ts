import 'server-only';

/**
 * The per-section "how this works" guides behind the ⓘ beside each /admin
 * page title (see `src/components/Admin/HelpButton.tsx`).
 *
 * One entry per nav-level section, written in the simplest English that
 * survives — short sentences, exact on-screen labels in quotes, no jargon.
 * Detail pages reuse or skip; only section hubs carry the button.
 *
 * `server-only` on purpose: the server header passes ONE topic to HelpButton
 * as a serializable prop, so the client bundle never carries this registry
 * (the slim-props rule). HelpButton's `import type` is erased and allowed.
 *
 * Privacy rules for this copy, pinned:
 * - 'my-pay' is member-voiced. The words "anchor", "wire fee", "company
 *   cost", and any mention of admin notes must never appear in it — the
 *   own-projection split applies to documentation too.
 * - 'payroll', 'users', 'logs' address admins and may be frank.
 * - No money figures, no prices, anywhere.
 */

export type AdminHelpTopic = {
  /** Dialog title and the button's aria-label, e.g. "How Tickets works". */
  title: string;
  /** One plain sentence: what this section is. */
  intro: string;
  /** Headed bullet groups, rendered in order. */
  sections: { heading: string; bullets: string[] }[];
  /** Optional final group, rendered under "Good to know". */
  tips?: string[];
};

export type AdminHelpKey =
  | 'overview'
  | 'tasks'
  | 'leaderboard'
  | 'tickets'
  | 'reports'
  | 'inquiries'
  | 'applications'
  | 'projects'
  | 'clients'
  | 'feedback'
  | 'my-pay'
  | 'payroll'
  | 'users'
  | 'logs'
  | 'profile';

export const ADMIN_HELP: Record<AdminHelpKey, AdminHelpTopic> = {
  overview: {
    title: 'How the Overview works',
    intro:
      'Your starting page. Every card is a shortcut into a section you can open — nothing here changes any data.',
    sections: [
      {
        heading: 'Your day',
        bullets: [
          'The three big numbers are your own open tasks: "Overdue", "Due today", and "All open". Click a number to open the matching task list — it always holds exactly that many tasks.',
          'The rows below them are your soonest deadlines — click one to open the task. "Open your board" shows your whole list, grouped by deadline.',
          'The "Leaderboard" card beside it shows this month\'s top three and your own standing. "Full board" opens the whole board.',
          'The "Your pay" card appears when your pay history is enabled. It shows only the latest month\'s status — never an amount — and opens "My pay".',
        ],
      },
      {
        heading: 'The studio cards',
        bullets: [
          '"Inbox" counts unread inquiries and applications; the small bars underneath are the last two weeks of submissions, one bar per day.',
          '"Tickets" is personal: superadmins see every ticket\'s status, everyone else sees only tickets they raised. Click the card to open Tickets.',
          '"Studio" totals what the whole team delivered this month, with the last twelve months behind it. Click the card to open Reports.',
          '"Activity log" previews the newest entries in the site-wide log — only people with Activity log access see it.',
          '"Recent" lists the newest submissions from the inboxes you can see. Click a row to open it.',
          '"Search anything…" (or ⌘K anywhere) opens the search palette; the links under it lead to sections without a card of their own, and to your profile.',
        ],
      },
    ],
    tips: [
      'You only see cards for areas you have access to — the page rearranges itself around them. Access is managed on the Users page.',
      'The greeting and every date follow your own device clock and timezone.',
      'The counts are live data, computed when the page loads — refresh to update them.',
    ],
  },

  tasks: {
    title: 'How Tasks works',
    intro:
      'The team\'s shared work log: who is doing what, for which client, with hours. It feeds the monthly client reports.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Add work fast with the band at the top: type what you did, pick the client, category, and time, then press Enter. Client and category stay filled so you can add several in a row.',
          'Every cell edits in place — click a title, client, time, or date to change it. Changes save instantly.',
          'To finish a task you enter the actual time it took. The dialog pre-fills your estimate — press Enter to accept it.',
          '"Digest" shows the last 7 days of completed work, day by day. "Export CSV" downloads exactly what the current view shows.',
          'Press ? for the full keyboard map — the fastest way to work the list.',
        ],
      },
      {
        heading: 'What the statuses mean',
        bullets: [
          '"To do" — not started yet.',
          '"In progress" — being worked on now.',
          '"Needs approval" — finished, waiting for client sign-off. Hours are confirmed at this step.',
          '"Done" — complete. It now counts in that month\'s client report and on the leaderboard.',
        ],
      },
    ],
    tips: [
      'Everyone with tasks access sees every task — "Mine" is just a filter.',
      'Assigning a task to someone else emails them, and a daily email lists your overdue and due-today tasks.',
      'The date filter\'s "Today" shows tasks dated today — the due date, or the start date when there\'s no deadline. Open it to filter one specific date instead, like due or completed.',
      'Dates follow your own timezone — "today" means today where you are.',
      '"Templates" can repeat a task every week or month — it appears that day, already assigned.',
      'Deleting a task also removes it from any monthly report it was counted in. That can\'t be undone.',
    ],
  },

  leaderboard: {
    title: 'How the Leaderboard works',
    intro:
      'A studio-wide scoreboard: everyone, ranked by tasks completed in the window you pick.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Pick the window at the top: "Month", "30 days", or "All time". In Month view you can browse past months too.',
          'Rank is the number of tasks marked "Done" in the window. Hours and "% on time" are context, not part of a score — hours only break an exact tie in task count.',
          'Badges are automatic: "Most Active" (most tasks), "Deep Work" (most hours), "Most Reliable" (best on-time rate), "Most Improved" (biggest gain on last month — the current #1 isn\'t eligible). Hover a badge to see the numbers behind it.',
          '"Champion of <Month>" is last month\'s winner, honored through the whole current month. "Past champions" lists earlier winners.',
        ],
      },
    ],
    tips: [
      '"N awaiting sign-off" counts finished tasks still waiting for client approval — they join the ranking once approved to Done.',
      'A task counts in the month it was completed, in your own timezone — viewers in different countries can see slightly different boards. That\'s expected.',
      'The page is read-only, and every view is a URL you can share with the team.',
    ],
  },

  tickets: {
    title: 'How Tickets works',
    intro:
      'The studio\'s internal bug tracker. Spotted something broken or off in the admin? File a ticket and the team is emailed right away.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Click "New ticket". Give it a short title, pick a severity ("Low" / "Medium" / "High"), say where you saw it, and describe what happened.',
          'You can attach a screenshot — drag it in, browse, or just paste it. It\'s shrunk automatically before upload.',
          'The moment you submit, every superadmin gets an email with your report and the screenshot.',
          'Follow your ticket from the list — the status pill on each row shows where it stands.',
        ],
      },
      {
        heading: 'What the statuses mean',
        bullets: [
          '"Open" — waiting for attention. Every new ticket starts here.',
          '"Pending" — a superadmin is on it.',
          '"Closed" — settled.',
        ],
      },
    ],
    tips: [
      'Superadmins see everyone\'s tickets and move the statuses. Everyone else sees only tickets they raised.',
      'Status changes send no email — revisit the list to see movement.',
      'Screenshots are private: only superadmins and you, the reporter, can open them.',
    ],
  },

  reports: {
    title: 'How Reports works',
    intro:
      'Each month\'s completed tasks, turned into a per-client delivery report you can print, export, or hand to the client as a link.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Pick a month with the switcher, then open a client from the roster. The pinned "Perseus" row is the studio\'s own internal work.',
          'A report builds itself from tasks marked "Done" that month: hours, deliverables, retainer burn, and who worked on the account.',
          '"Month highlights" is a written note for the client — it leads the PDF and the shared page. "Set target" stores the retainer hours the report measures against.',
          '"Share" creates a public read-only link for that client and month. "Regenerate" replaces it; "Revoke" kills it instantly.',
          '"Print report" opens the A4 sheet — use your browser\'s Save as PDF. "CSV" downloads the raw month.',
        ],
      },
    ],
    tips: [
      'The client never sees the internal parts: the "vs last month" deltas, the "Studio view" diagnostics, or the "Before you send this" checklist. Highlights and "Waiting on your approval" do travel.',
      'Share links show live numbers, not a snapshot — edits after sending change what the client sees.',
      'Nothing here sends email. You deliver the link yourself.',
      'A report month follows your own timezone; a shared link is frozen to the timezone of whoever created it, so the client sees exactly what the sender saw.',
    ],
  },

  inquiries: {
    title: 'How Inquiries works',
    intro:
      'Project leads from the website\'s contact form land here, for the team to read, triage, and reply to.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Three tabs: "Inbox" (new and read), "Archived", and "Spam". The Inbox badge counts unread only.',
          'Opening a "New" inquiry marks it "Read" for the whole team — it works like a shared mailbox.',
          'Triage with the checkboxes and bulk buttons, or the keyboard: j/k move, e archives, s marks spam, r flips read/unread, z undoes the last move.',
          '"Reply" opens your own mail app, addressed to the sender. The dashboard itself never emails them.',
          '"Export" downloads a CSV of the current filters. Spam is never included.',
        ],
      },
    ],
    tips: [
      'Spam is a quarantine, not a trash can — the form\'s bot checks park suspicious fills there instead of deleting them. Skim the tab now and then and press "Not spam" on real leads.',
      'Deleting is permanent, one at a time, behind a confirm.',
      'Dates and filters like "Today" follow your own timezone.',
    ],
  },

  applications: {
    title: 'How Applications works',
    intro:
      'Job applications from the careers page: review candidates, open their résumés, and triage — the same flow as Inquiries.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Same three tabs and moves as Inquiries: "Inbox", "Archived", "Spam", the bulk buttons, and the j/k/e/s/r/z keys.',
          'Each row shows the candidate and the role they applied for. Filter by "Role", "Source", or date.',
          'On a candidate\'s page: contact details, links, their "Cover note", and the résumé — "View résumé" opens the PDF, "Download" saves it.',
          '"Reply" opens your mail app, addressed to the candidate.',
        ],
      },
    ],
    tips: [
      'Résumés are private candidate data. Only people with the Applications grant can open them, and every open is recorded in the audit trail.',
      'Deleting an application also permanently deletes its résumé file.',
      'No candidate is ever emailed automatically — statuses are silent, and "Not spam" brings a real candidate back as unread.',
    ],
  },

  projects: {
    title: 'How Projects works',
    intro:
      'The manager behind the public /projects portfolio. Changes go live on the site immediately — no deploy needed.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          '"New project" creates a draft with the core fields. Cover, gallery, and videos unlock after that first save.',
          'Every project has a "Visibility": "Draft" (only visible here), "Unlisted" (reachable by link only), "Public" (listed and indexed).',
          'The project\'s own detail page switches on by itself once it has case-study text or any media — until then, its card links to the category page.',
          'Media saves itself: the cover, gallery images (drag, browse, or paste), and YouTube or Instagram embeds each apply immediately. Everything else — text, category, services, visibility, "Featured" — waits for "Save changes".',
          'The first YouTube video becomes the big "Screening room" frame on the detail page. ("Featured" is saved with the project, but the public site doesn\'t use it yet.)',
        ],
      },
    ],
    tips: [
      'Publishing, unpublishing, or renaming a slug automatically tells search engines. Draft and unlisted URLs are never announced.',
      '"Delete project" removes the page, the card, and every image at once. There is no undo.',
      'A slug never renames itself on an existing project — it\'s a live URL.',
    ],
  },

  clients: {
    title: 'How Clients works',
    intro:
      'The client roster: company details, logos, and which marks ride the public logo marquees.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Click a tile to edit it; "Add client" creates one. The dialog holds the name, industry, links, and an internal "Bio".',
          '"Show on the logo wall" puts the logo in the About-page marquee. "Feature on the home page" also adds it to the home "Selected Clients" rail.',
          'The pill on each tile says where it shows: "Home + wall", "Logo wall", or "Off the wall".',
          'Logo uploads apply immediately — no Save needed. "Order" decides rail position; lower shows earlier.',
        ],
      },
    ],
    tips: [
      'A client on the wall with no logo image is silently skipped — upload a mark for the toggle to have a visible effect.',
      'Bios are internal reference only; there is no public client page.',
      'Delete is blocked while projects or tasks still point at the client.',
      'Renaming a client changes live site text but does not ping search engines by itself — tell the owner after a rename.',
    ],
  },

  feedback: {
    title: 'How Feedback works',
    intro:
      'How readers rated each blog article with the "Was this article helpful?" buttons at the end of every post.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'One row per published post, voted posts first. "Helpful" and "Not helpful" count the two buttons; "% helpful" is the share of thumbs-up.',
          'Post titles open the live article. "Last vote" shows when the newest vote landed.',
          'There is nothing to click or triage — it\'s a read-only scoreboard with live numbers on every visit.',
        ],
      },
    ],
    tips: [
      'One vote per browser per article — a changed mind overwrites the old vote.',
      'Readers never see the counts. The tallies exist only on this page.',
      'A post removed from the site keeps its votes, shown as "(removed post)".',
    ],
  },

  'my-pay': {
    title: 'How My pay works',
    intro:
      'Your own pay, month by month: what landed, what was agreed, and a button to confirm it arrived. Only you and payroll can see this page.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'The newest month sits at the top with its status. When money goes out, it reads "Sent — awaiting your confirmation".',
          'When the money lands in your account, press "I received this". That\'s all — it just marks the month as received.',
          'If something looks wrong — nothing arrived, or the amount is short — press "Something\'s wrong" and describe it. Payroll is emailed your note immediately and will follow up.',
          '"Every month" lists your history; each row opens that month\'s printable payslip. The charts show your pay and your salary over time.',
          '"How <month> was worked out", at the bottom, shows the working: what landed, your agreed salary, and — when a currency conversion happened — the rate used.',
        ],
      },
    ],
    tips: [
      'Only the newest month has the confirm and report buttons; older months are read-only.',
      'You can only report a problem while a month reads "Sent". Once you confirm, that month is final for you.',
      'A partial first or last month is counted by days, and the page says so (for example "13 of 31 days").',
      'Every time on this page is shown in your own timezone.',
    ],
  },

  payroll: {
    title: 'How Payroll works',
    intro:
      'The month screen: prepare one draft line per member, enter the figures from the exchange invoice, send, and track confirmations.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          '"Start <month>" creates a "Draft" line per eligible member, pre-filled from their standing salary and prorated for mid-month joins or ends. Drafts are invisible to members.',
          'Enter the month\'s rate and invoice number in "Month details". The rate pre-fills every line; a wire the exchange quoted differently gets its own rate in "Edit line".',
          'Type the real figures from the invoice into each draft row — the computed suggestion is a starting point, the invoice is the truth.',
          '"Send N payments" flips every draft to "Sent" and emails members with self-view on (the email carries no figures). Only do this once the money has actually gone out.',
          'Members confirm from their own page, or flag a problem — a flag emails you their note. "Mark received", "Re-sent — clear the flag", and "Void" live in each row\'s "…" menu.',
          'The "Members" roster manages who is on payroll, their standing salary ("Salary" — a raise is a new term, the old one stays as history), and the self-view eye toggle.',
        ],
      },
      {
        heading: 'What the statuses mean',
        bullets: [
          '"Draft" — prepared, money not moved, invisible to the member.',
          '"Sent" — the money left; waiting for the member to confirm.',
          '"Received" — the member (or you, on their behalf) confirmed it landed.',
          '"Flagged" — the member reported a problem, with their note on the row.',
          '"Void" — recorded in error and cancelled; the record stays.',
        ],
      },
    ],
    tips: [
      'Amounts and statuses move through separate doors: "Save line" never changes a status, and a status action never changes an amount.',
      'Send refuses to run until every draft has its paid amount and a usable rate — the error names who is missing.',
      'The wire fee is company cost — never part of anyone\'s salary, never shown to a member.',
      'An unconfirmed payment is chased once by an automatic "Did your payment arrive?" email after a few days\' grace.',
    ],
  },

  users: {
    title: 'How Users works',
    intro:
      'Who can sign in to the admin, and which sections each account can open.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Each row is one account; the chips under it are the areas it can open. Click a chip to grant or remove — it saves instantly.',
          'A green dot on someone\u2019s photo means they have the admin open right now; otherwise the row says when they were last here. Closing the tab shows them offline within about five minutes.',
          'Three tiers: "Owner" (everything, always), "Superadmin" (role powers plus their chips), and members (chips only).',
          'The two chips after the divider — "Payroll" and "Activity log" — are sensitive: only the owner can flip them, on anyone.',
          'Who can manage whom: the owner\'s row is untouchable; superadmin rows are managed only by the owner; member rows by any superadmin — unless the member holds "Payroll" or "Activity log", then their reset and delete are owner-only too.',
          '"Add user" creates a member account with a temporary password. Share it securely — the person changes it on their Profile after first sign-in.',
          '"Reset password" sets a new temporary password and signs the person out everywhere. "Delete" is the real offboarding — sign-in, sessions, and passkeys all go.',
        ],
      },
    ],
    tips: [
      'Access changes apply on the person\'s next navigation — no sign-out needed.',
      'A password reset keeps their passkeys working. To fully revoke access, delete the account.',
      'Roles never change from this page — promoting someone is done in the database, on purpose, so the owner can never be locked out.',
      'This page sends no emails. Temporary passwords travel outside the app.',
      'Whether a member sees their own pay is a separate switch on the payroll roster — not the "Payroll" chip, which opens the payroll admin screens.',
    ],
  },

  logs: {
    title: 'How Activity works',
    intro:
      'The dashboard\'s audit trail: every change anyone made, who made it, and when. Kept for 365 days.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'The feed groups entries by day, in your own timezone. Each entry: who, a plain sentence of what happened, the time, and the area.',
          'Field changes show as "old → new" chips. "[redacted]" means the value was deliberately scrubbed — that is correct, not a bug.',
          'Filter with the bar on top — person, area, action, date. Filters apply as you pick them, and every filtered view is a URL you can share.',
        ],
      },
    ],
    tips: [
      'Salary figures, passwords, message bodies, and applicant contact details never appear here — they are refused at write time.',
      'Sensitive reads are logged too: opening a résumé or someone\'s payslip writes a "Viewed" row.',
      'Routine task and payroll edits keep their own feeds — only their structural or destructive acts show here.',
      'Entries older than 365 days are deleted permanently by a daily job.',
    ],
  },

  profile: {
    title: 'How Profile works',
    intro:
      'Your own account: photo, name, password, passkeys, signed-in devices, and the clock every date in the dashboard is worked out on.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Click your avatar to upload or change your photo — you see the exact preview before anything is saved.',
          '"Password": changing it signs you out everywhere except this device.',
          '"Passkeys": add Face ID, Touch ID, or a security key to sign in without a password. Remove anything you don\'t recognize.',
          '"Active sessions" lists every signed-in device. "Sign out others" ends all of them except this one.',
          'You stay signed in for as long as the dashboard is open in front of you. Leave it closed for 24 hours and you sign in again; after 30 days you sign in again regardless. A passkey makes that one tap.',
        ],
      },
    ],
    tips: [
      'The "Timezone" panel is read-only on purpose: it is detected from your device and follows you when you move. A manual setting could only make your dates silently wrong.',
      'A password reset does not remove passkeys — check the list here if you suspect a compromise.',
      'Nothing on this page sends emails, and everything acts only on your own account.',
    ],
  },
};
