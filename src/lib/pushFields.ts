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
export const PUSH_KINDS = ['due', 'assigned', 'inbox', 'ticket'] as const;

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
  | { kind: 'ticket'; status: TicketStatusSlug };

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
