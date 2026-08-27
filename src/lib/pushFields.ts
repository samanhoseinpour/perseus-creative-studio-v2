import type { TicketStatusSlug } from '@/lib/ticketFields';

/**
 * The push-notification vocabulary — what a notification may say, and the pure
 * predicates the send path and the service worker both depend on.
 *
 * A zero-dependency, client-safe leaf (the adminAreas.ts / releaseFields.ts
 * split). `src/lib/push.ts` is the `server-only` door that actually sends;
 * everything testable without a network lives here so scripts/check-push.mts
 * can pin it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE PRIVACY RULE, AND WHY IT IS A TYPE
 *
 * A notification is rendered by the OPERATING SYSTEM, stored in a notification
 * centre, and shown on a LOCKED SCREEN. Its audience is anyone who can see the
 * device — no authentication, no session, no grant. That is a wider audience
 * than /admin/logs, which is already this codebase's benchmark for "too wide".
 *
 * So a body may contain ONLY: integers (counts), a value from a closed enum
 * rendered through a composer here, and fixed English sentences.
 *
 * It may NEVER contain, in any form:
 *  - a person's name — client, teammate, applicant, first name;
 *  - a CLIENT or COMPANY name. This is the load-bearing one: a task title in
 *    this studio routinely IS a client name ("Vela 21st Street Vt",
 *    "Belcanto OP 1 (Eslahie)", "MT11 Th Conor 2"), so a due-reminder body
 *    listing titles would put the client roster on a lock screen in a café.
 *    The EMAIL lists them, because an inbox needs an unlocked device and an
 *    authenticated account. The push does not;
 *  - any free text a human typed — a task title, a ticket title or
 *    description, a note, an inquiry message. Tickets already omit
 *    `description` from their activity row "because free text may carry a
 *    pasted token", and a lock screen is a strictly worse place for one;
 *  - any money figure, rate, wire reference or invoice number;
 *  - any credential — a share token, a résumé path, an endpoint, an email
 *    address, a phone number.
 *
 * This is enforced by the TYPE, not by discipline: `sendToUser` takes a
 * PushNotice and has no `title` or `body` parameter, and `renderNotice` below
 * is the only thing that turns one into strings. A call site cannot
 * interpolate a client name into a lock screen because there is nowhere to put
 * one — the same mechanism that makes `ActivityValue` scalars-only turn a
 * `{...row}` spread into a type error instead of a privacy incident.
 *
 * Deep-link URLs MAY carry ids, because the OS never displays the URL — and
 * RFC 8291 means the push service cannot read any of it either: the payload is
 * encrypted with a key derived from the subscription's own p256dh/auth, so
 * Google, Mozilla and Apple relay ciphertext. The URL must still be an /admin
 * path; never a /share/<token> one.
 */

/** Every kind of thing we may interrupt someone about. */
export const PUSH_KINDS = [
  'due',
  'assigned',
  'inbox',
  'ticket',
  'ticket-new',
  'digest',
  'payroll',
  'payroll-flag',
  'signin',
  'test',
  'monitoring',
  'monitoring-resolved',
] as const;

export type PushKind = (typeof PUSH_KINDS)[number];

/**
 * A notification, as DATA. Counts and closed enums only — see the privacy rule
 * above. `kind` exists from day one because it is the future category key: if
 * per-category opt-in is ever wanted, it filters on this, and a free-form
 * notice would have left nothing to filter on.
 */
export type PushNotice =
  | { kind: 'due'; overdue: number; today: number }
  | { kind: 'assigned'; count: number }
  | { kind: 'inbox'; inquiries: number; applications: number }
  | { kind: 'ticket'; status: TicketStatusSlug }
  | { kind: 'ticket-new'; severity: 'low' | 'medium' | 'high' }
  | { kind: 'digest'; tasks: number; members: number }
  /**
   * The payroll chase. Carries a COUNT and nothing else — not the amount, not
   * the month, not the words "salary" or "pay". The email it rides with is
   * already figure-free by design, and this is a strictly smaller surface: a
   * lock screen is an audience the payroll own-vs-admin projection split never
   * contemplated, so the notice says only that something is waiting.
   */
  | { kind: 'payroll'; months: number }
  /**
   * A member reported a problem with a payment — for the people who can act on
   * it. Names NOBODY: the email says who and what they wrote, because an inbox
   * is authenticated; the notification says only that one is waiting.
   */
  | { kind: 'payroll-flag' }
  /**
   * "Send a test notification", from /admin/profile. It exists because every
   * layer below us fails SILENTLY and they fail differently: a push can be
   * delivered, accepted by the browser, and still never drawn — macOS will
   * hand an installed web app a Dock badge while refusing to show the
   * notification itself, which looks exactly like a broken send. A round trip
   * through the real door separates "we never sent it" from "your OS is
   * hiding it", on any device, in one tap.
   *
   * Carries nothing, like every other notice — a test that proved a title
   * could be interpolated would be a test of the wrong thing.
   */
  /**
   * Somebody signed in to this account — the "was that you?" alert.
   *
   * Deliberately CARRIES NOTHING, and here that is a stronger rule than usual.
   * The device, the city and the IP are exactly what a sign-in alert elsewhere
   * would name, and every one of them is free text or personal data rendering
   * on a lock screen a stranger may be holding. The useful half of the alert
   * survives without them: the reader knows whether they just signed in, and
   * nobody else can learn anything from the fact that somebody did. The detail
   * lives on /admin/logs, behind the session.
   *
   * It goes to every device this account has subscribed, including the one
   * that just signed in — a push endpoint cannot be correlated with the
   * session creating it, and guessing wrong would silence the alert on the
   * device the person is NOT holding, which is the only one that matters.
   */
  | { kind: 'signin' }
  | { kind: 'test' }
  /**
   * An incident opened (or escalated) on /admin/monitoring — for the people
   * who hold that area. A severity from a closed enum and a COUNT of what is
   * open: the incident's title names an error class and a route pattern, and
   * even that stays in the email. A lock screen learns only that the dashboard
   * needs a look.
   */
  | { kind: 'monitoring'; severity: 'warning' | 'critical'; open: number }
  /** Its recovery twin: an announced incident cleared. */
  | { kind: 'monitoring-resolved'; open: number };

/** What actually crosses the wire, after renderNotice. */
export type PushPayload = {
  title: string;
  body: string;
  /** Always an /admin path. */
  url: string;
  /** Collapses a repeat in the OS tray rather than stacking it. */
  tag: string;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The ONE place a notice becomes words. Every string below is a fixed sentence
 * or a count — never an interpolated name, title, or figure.
 */
export function renderNotice(notice: PushNotice): PushPayload {
  switch (notice.kind) {
    case 'due': {
      const { overdue, today } = notice;
      const body =
        overdue && today
          ? `${plural(overdue, 'task is', 'tasks are')} overdue and ${plural(today, 'is', 'are')} due today.`
          : overdue
            ? `${plural(overdue, 'task is', 'tasks are')} overdue.`
            : `${plural(today, 'task is', 'tasks are')} due today.`;
      return {
        title: 'Work needs your attention',
        body,
        url: '/admin/tasks',
        tag: 'perseus-due',
      };
    }
    case 'assigned':
      return {
        title: 'New work for you',
        body: `You were assigned ${plural(notice.count, 'task', 'tasks')}.`,
        url: '/admin/tasks',
        tag: 'perseus-assigned',
      };
    case 'inbox': {
      const { inquiries, applications } = notice;
      const parts = [
        inquiries ? plural(inquiries, 'inquiry', 'inquiries') : '',
        applications ? plural(applications, 'application', 'applications') : '',
      ].filter(Boolean);
      return {
        title: 'Something arrived',
        body: `${parts.join(' and ')} came in.`,
        url: inquiries ? '/admin/inquiries' : '/admin/applications',
        tag: 'perseus-inbox',
      };
    }
    case 'ticket-new':
      return {
        title: 'A new ticket was filed',
        // The severity is a closed enum; the ticket's TITLE and DESCRIPTION are
        // free text someone typed, and free text never reaches a lock screen.
        body: `Someone reported a ${notice.severity}-severity issue.`,
        url: '/admin/tickets',
        tag: 'perseus-ticket-new',
      };
    case 'digest':
      return {
        title: 'Last week at Perseus',
        body: `${plural(notice.tasks, 'task', 'tasks')} delivered by ${plural(notice.members, 'person', 'people')}.`,
        url: '/admin/tasks?status=done',
        tag: 'perseus-digest',
      };
    case 'payroll':
      return {
        // Deliberately vague. "Payment", "salary" and any figure are all absent:
        // the whole point is that a passer-by learns nothing from the screen.
        title: 'Something needs confirming',
        body:
          notice.months === 1
            ? 'Open My pay to confirm it arrived.'
            : `${notice.months} things are waiting on you. Open My pay.`,
        url: '/admin/my-pay',
        tag: 'perseus-payroll',
      };
    case 'signin':
      return {
        title: 'New sign-in to your account',
        // An instruction, not a description: the reader who did NOT do this
        // needs to know the next move, and /admin/profile is where both the
        // password and the signed-in devices are.
        body: 'If this was not you, change your password now.',
        url: '/admin/profile',
        tag: 'perseus-signin',
      };
    case 'payroll-flag':
      return {
        // "payment" would have gone here on the first draft; the check script
        // refused it. A passer-by reading a lock screen must not learn that
        // this notification is about money.
        title: 'Something needs a look',
        body: 'Someone flagged an issue. Open Payroll.',
        url: '/admin/payroll',
        tag: 'perseus-payroll-flag',
      };
    case 'test':
      return {
        title: 'Notifications are working',
        // Says what it proves, because that is the whole point: if this is on
        // screen, delivery is fine and anything still missing is the device's
        // own notification settings.
        body: 'This is a test. Your device can receive notifications.',
        url: '/admin/profile',
        tag: 'perseus-test',
      };
    case 'ticket': {
      const word =
        notice.status === 'closed'
          ? 'closed'
          : notice.status === 'pending'
            ? 'moved to pending'
            : 'reopened';
      return {
        title: 'Ticket update',
        body: `A ticket you filed was ${word}.`,
        url: '/admin/tickets',
        tag: 'perseus-ticket',
      };
    }
    case 'monitoring':
      return {
        title:
          notice.severity === 'critical'
            ? 'Something on the dashboard is down'
            : 'The dashboard needs a look',
        body: `${plural(notice.open, 'incident is', 'incidents are')} open. Open Monitoring.`,
        url: '/admin/monitoring',
        tag: 'perseus-monitoring',
      };
    case 'monitoring-resolved':
      return {
        title: 'An incident cleared',
        body:
          notice.open === 0
            ? 'Nothing is open on the dashboard now.'
            : `${plural(notice.open, 'incident is', 'incidents are')} still open.`,
        url: '/admin/monitoring',
        tag: 'perseus-monitoring',
      };
  }
}

/**
 * How long the push service should hold an undelivered message, and the Topic
 * that collapses repeats while it waits (RFC 8030).
 *
 * `topic` is the SERVER-side twin of the SW-side `tag`: tag collapses what is
 * already DISPLAYED, topic collapses what is still QUEUED — so a phone that was
 * off for two days gets one due-reminder rather than two. A topic must be
 * base64url-safe and at most 32 characters, which several push services
 * enforce by rejecting the request outright.
 */
export const PUSH_DELIVERY: Record<
  PushKind,
  { ttlSeconds: number; topic: string }
> = {
  // A day's worth: after that the reminder is about yesterday and is noise.
  due: { ttlSeconds: 20 * 60 * 60, topic: 'perseus-due' },
  assigned: { ttlSeconds: 24 * 60 * 60, topic: 'perseus-assigned' },
  inbox: { ttlSeconds: 24 * 60 * 60, topic: 'perseus-inbox' },
  ticket: { ttlSeconds: 24 * 60 * 60, topic: 'perseus-ticket' },
  'ticket-new': { ttlSeconds: 24 * 60 * 60, topic: 'perseus-tkt-new' },
  // A week's digest is stale once the next one is due, but holding it a couple
  // of days covers a phone that was off for the weekend.
  digest: { ttlSeconds: 3 * 24 * 60 * 60, topic: 'perseus-digest' },
  payroll: { ttlSeconds: 3 * 24 * 60 * 60, topic: 'perseus-payroll' },
  'payroll-flag': { ttlSeconds: 3 * 24 * 60 * 60, topic: 'perseus-pay-flag' },
  // A security alert is worth holding, but not for ever: past a day the
  // useful window for "was that you?" has closed and the sign-in it describes
  // is buried in /admin/logs anyway. Its own topic, so a device that was off
  // wakes to ONE alert rather than a stack — the reader only has to act once,
  // and the count of sign-ins is not what the alert is for.
  signin: { ttlSeconds: 24 * 60 * 60, topic: 'perseus-signin' },
  // Five minutes: a test is about RIGHT NOW. Arriving an hour later would
  // answer a question nobody is still asking, and would read as a second
  // failure. Deliberately non-zero all the same — TTL 0 means "deliver this
  // instant or drop it", which a phone with a screen off would fail.
  test: { ttlSeconds: 5 * 60, topic: 'perseus-test' },
  // An hour: an incident older than that has either been seen on the page or
  // been followed by its recovery, and both share a topic so the recovery
  // replaces a queued alert rather than arriving after it.
  monitoring: { ttlSeconds: 60 * 60, topic: 'perseus-monitoring' },
  'monitoring-resolved': { ttlSeconds: 60 * 60, topic: 'perseus-monitoring' },
};

/**
 * Whether a push-service status means the subscription is GONE FOR EVER.
 *
 * Only 404 and 410. Everything else is transient or ours:
 *  - 403 means the VAPID signature did not match the key the subscription was
 *    created with, i.e. the keys were rotated or are misconfigured. It hits
 *    EVERY row at once, so treating it as dead would empty the table on one
 *    bad deploy. Keep the row; log it loudly.
 *  - 400/413 are our bug (malformed request, payload too large).
 *  - 429 and 5xx are the push service having a bad day.
 *
 * Pinned by scripts/check-push.mts, with 403 asserted explicitly as NOT dead —
 * that is the one someone will "fix" wrongly.
 */
export function isDeadSubscription(status: number): boolean {
  return status === 404 || status === 410;
}

/**
 * A SECURITY PREDICATE, not a validator — treat it like avatarPaths.ts.
 *
 * The endpoint is attacker-adjacent input that OUR SERVER later fetches, so
 * this is SSRF-shaped: without it, a crafted subscribe call could point the
 * send path at an internal address. Deny-shape rather than a vendor allowlist,
 * so a new browser's push service is not broken by our list going stale.
 */
export function isPlausiblePushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  // An explicit port is never used by a real push service and is the easiest
  // way to aim this at something internal.
  if (url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;
  // Bare IP literals (v4 or v6) — a real push service is always a name.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.startsWith('[') || host.includes(':')) return false;
  // Our own origin, which would make the server call itself.
  if (host === 'www.perseustudio.com' || host === 'perseustudio.com') {
    return false;
  }
  return true;
}

/**
 * base64url → Uint8Array, for `applicationServerKey`.
 *
 * MANDATORY: Safari and Firefox reject the base64url STRING form that Chrome
 * happens to accept, so passing the raw key straight through works in testing
 * on one browser and throws on the others.
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  // Backed by a real ArrayBuffer, not ArrayBufferLike: `applicationServerKey`
  // is typed BufferSource, which excludes a SharedArrayBuffer-backed view.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Whether this browser can subscribe at all. Pure feature detection — on iOS
 * Safari in a TAB, `PushManager` is simply undefined, which is what makes the
 * non-nagging default (render nothing) fall out for free.
 */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Whether the page is running as an installed app rather than in a tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return (
    iosStandalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

/**
 * iOS/iPadOS Safari, NOT installed to the Home Screen — the one platform where
 * push is unavailable for a reason the person can actually fix.
 *
 * Detected rather than assumed from `!pushSupported()`, because the remedy is
 * completely different: everywhere else "unsupported" means "nothing you can
 * do", here it means "add it to your Home Screen first". iPadOS 13+ reports a
 * Mac user-agent, so the touch-points test is what separates an iPad from a
 * MacBook — a Mac has no touch screen and macOS Safari supports push in a
 * plain tab.
 */
export function needsInstallForPush(): boolean {
  if (typeof window === 'undefined') return false;
  if (pushSupported() || isStandalone()) return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPod/.test(ua) ||
    (/iPad/.test(ua) ) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}
