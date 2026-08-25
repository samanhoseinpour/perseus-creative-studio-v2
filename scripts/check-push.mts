/**
 * Push self-check — the notification vocabulary, the delivery contract, and
 * the two predicates that are security controls rather than formatters.
 *
 * Run:  node --import tsx scripts/check-push.mts        (no DB, no env)
 *
 * There is no test runner in this repo (see CLAUDE.md), and every regression
 * here is silent in a way you only discover from a member saying "I never get
 * anything". A body that interpolates a task title publishes the CLIENT ROSTER
 * to a lock screen, because a task title in this studio routinely IS a client
 * name. Treating a 403 as a dead subscription empties the whole table on one
 * bad deploy. Handing `applicationServerKey` a string works on Chrome and
 * throws on Safari and Firefox, so it passes every test done on one browser.
 * An endpoint predicate that lets an internal host through makes the send path
 * an SSRF. None of these raises an error anywhere.
 *
 * Run it after touching src/lib/pushFields.ts or the send path in
 * src/lib/push.ts.
 */
import {
  PUSH_DELIVERY,
  PUSH_KINDS,
  isDeadSubscription,
  isPlausiblePushEndpoint,
  renderNotice,
  urlBase64ToUint8Array,
  type PushNotice,
} from '@/lib/pushFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};
const section = (name: string) => console.log(`\n— ${name}`);

// ------------------------------------------- the dead-subscription contract --
section('the dead-subscription contract');

eq('404 is dead', isDeadSubscription(404), true);
eq('410 is dead', isDeadSubscription(410), true);
// THE one someone will "fix" wrongly. 403 means the VAPID signature did not
// match — an operator error hitting EVERY row at once, so deleting on it would
// empty the table on a single bad deploy or key rotation.
eq('403 is NOT dead (VAPID rotation, not a gone device)', isDeadSubscription(403), false);
eq('400 is not dead (our malformed request)', isDeadSubscription(400), false);
eq('413 is not dead (our payload was too big)', isDeadSubscription(413), false);
eq('429 is not dead (rate limited)', isDeadSubscription(429), false);
for (const s of [500, 502, 503, 504]) {
  eq(`${s} is not dead (push service outage)`, isDeadSubscription(s), false);
}
eq('0 is not dead (network throw, no status)', isDeadSubscription(0), false);

// ------------------------------------------------------- the copy contract --
section('renderNotice — counts and fixed sentences only');

const NOTICES: PushNotice[] = [
  { kind: 'due', overdue: 0, today: 1 },
  { kind: 'due', overdue: 1, today: 0 },
  { kind: 'due', overdue: 3, today: 2 },
  { kind: 'assigned', count: 1 },
  { kind: 'assigned', count: 4 },
  { kind: 'inbox', inquiries: 1, applications: 0 },
  { kind: 'inbox', inquiries: 0, applications: 2 },
  { kind: 'inbox', inquiries: 2, applications: 3 },
  { kind: 'ticket', status: 'closed' },
  { kind: 'ticket', status: 'pending' },
  { kind: 'ticket', status: 'open' },
];

eq(
  'one task due today reads in the singular',
  renderNotice({ kind: 'due', overdue: 0, today: 1 }).body,
  '1 task is due today.',
);
eq(
  'two overdue reads in the plural',
  renderNotice({ kind: 'due', overdue: 2, today: 0 }).body,
  '2 tasks are overdue.',
);
eq(
  'both halves compose',
  renderNotice({ kind: 'due', overdue: 3, today: 2 }).body,
  '3 tasks are overdue and 2 are due today.',
);
eq(
  'one assignment reads in the singular',
  renderNotice({ kind: 'assigned', count: 1 }).body,
  'You were assigned 1 task.',
);
eq(
  'a closed ticket names the status, not the ticket',
  renderNotice({ kind: 'ticket', status: 'closed' }).body,
  'A ticket you filed was closed.',
);

// Every rendered string, checked against the things that must never appear on
// a lock screen. The TYPE already makes most of these impossible — there is no
// parameter to put a name in — so this pins the COPY against a well-meaning
// edit that adds one.
const FORBIDDEN: [RegExp, string][] = [
  [/CA\$|\$\d|£|€/, 'a currency figure'],
  [/\btoman\b|\bIRT\b|\bCAD\b/i, 'a currency name'],
  [/\d+\.\d{2}\b/, 'a decimal amount'],
  [/@[\w.-]+\.\w+/, 'an email address'],
  [/\bhttps?:\/\//, 'an absolute URL'],
];
for (const notice of NOTICES) {
  const p = renderNotice(notice);
  for (const [re, what] of FORBIDDEN) {
    eq(
      `${notice.kind}: body/title carries no ${what}`,
      re.test(`${p.title} ${p.body}`),
      false,
    );
  }
  eq(`${notice.kind}: url is an /admin path`, p.url.startsWith('/admin'), true);
  eq(`${notice.kind}: url is never a share token`, p.url.includes('/share/'), false);
  // renotify:true without a tag throws a TypeError from showNotification(),
  // which inside a push handler means NO notification is shown at all — and
  // Chrome then punishes the origin for a silent push.
  eq(`${notice.kind}: a non-empty tag is always set`, Boolean(p.tag), true);
  eq(`${notice.kind}: title is non-empty`, Boolean(p.title.trim()), true);
  eq(`${notice.kind}: body is non-empty`, Boolean(p.body.trim()), true);
}

// ------------------------------------------------------------- delivery ----
section('delivery headers');

eq(
  'every kind has a delivery entry (exhaustive)',
  PUSH_KINDS.filter((k) => !PUSH_DELIVERY[k]),
  [],
);
eq(
  'every TTL is a positive number of seconds',
  PUSH_KINDS.filter((k) => !(PUSH_DELIVERY[k].ttlSeconds > 0)),
  [],
);
// TTL 0 means "deliver now if the device is reachable, then discard" — right
// for a live-presence ping, catastrophic for a reminder a phone should get
// when it wakes up.
eq(
  'no kind uses TTL 0',
  PUSH_KINDS.filter((k) => PUSH_DELIVERY[k].ttlSeconds === 0),
  [],
);
eq(
  'every topic is <= 32 chars and base64url-safe (services reject otherwise)',
  PUSH_KINDS.filter(
    (k) =>
      PUSH_DELIVERY[k].topic.length > 32 ||
      !/^[A-Za-z0-9_-]+$/.test(PUSH_DELIVERY[k].topic),
  ),
  [],
);

// ------------------------------------------- the endpoint security predicate --
section('isPlausiblePushEndpoint — an SSRF guard, not a formatter');

const REAL = [
  'https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bH...',
  'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABh',
  'https://web.push.apple.com/QMuOu8lFJvQ0Q4a1KZ3vX',
  'https://wns2-par02p.notify.windows.com/w/?token=BQYAAA',
];
for (const url of REAL) {
  eq(`accepts a real push service (${new URL(url).hostname})`, isPlausiblePushEndpoint(url), true);
}

const HOSTILE: [string, string][] = [
  ['http://fcm.googleapis.com/x', 'plain http'],
  ['https://localhost/push', 'localhost'],
  ['https://api.localhost/push', 'a localhost subdomain'],
  ['https://127.0.0.1/push', 'a loopback IP'],
  ['https://10.0.0.5/push', 'a private IP'],
  ['https://169.254.169.254/latest/meta-data', 'the cloud metadata IP'],
  ['https://box.local/push', 'an mDNS name'],
  ['https://svc.internal/push', 'an internal name'],
  ['https://fcm.googleapis.com:8080/x', 'an explicit port'],
  ['https://www.perseustudio.com/admin', 'our own origin'],
  ['https://perseustudio.com/x', 'our own apex'],
  ['not a url', 'junk'],
  ['', 'empty'],
];
for (const [url, why] of HOSTILE) {
  eq(`rejects ${why}`, isPlausiblePushEndpoint(url), false);
}

// --------------------------------------------------- the key encoding trap --
section('urlBase64ToUint8Array — the applicationServerKey trap');

// A real VAPID public key: 87 base64url chars decoding to a 65-byte
// uncompressed P-256 point that begins 0x04. Safari and Firefox REJECT the
// string form that Chrome accepts, so this conversion is mandatory, not
// cosmetic.
const KEY =
  'BJxex3kfKdahJVvG7A3xSFTDkT6xnAQ1UQvzFPQ4gPAc0q9mrLcgSBOb2B1w6Fvv_UbkBx69o81sEjppjvHhxRg';
const bytes = urlBase64ToUint8Array(KEY);
eq('a VAPID public key decodes to 65 bytes', bytes.length, 65);
eq('…and begins with the uncompressed-point marker 0x04', bytes[0], 4);
eq('the result is a real Uint8Array', bytes instanceof Uint8Array, true);
// BufferSource excludes a SharedArrayBuffer-backed view, so the buffer must be
// a plain ArrayBuffer or TypeScript (and some engines) refuse it.
eq('…backed by a plain ArrayBuffer', bytes.buffer instanceof ArrayBuffer, true);
eq(
  'padded and unpadded input agree',
  Array.from(urlBase64ToUint8Array(KEY)).join(),
  Array.from(urlBase64ToUint8Array(`${KEY}=`)).join(),
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
