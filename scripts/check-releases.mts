/**
 * Release-notes self-check — the changelog's ordering, audiences and links.
 *
 * Run:  node --conditions=react-server --import tsx scripts/check-releases.mts
 *                ^^^^^^^^^^^^^^^^^^^^^^^^ LOAD-BEARING, and this is the only
 * script in the repo that needs it. src/lib/adminReleases.ts and
 * src/lib/adminHelp.ts both carry `import 'server-only'`, whose package.json
 * maps the "react-server" condition to an empty module and "default" to a bare
 * `throw`. Without the flag this script dies with "This module cannot be
 * imported from a Client Component module" and the obvious-but-wrong fix is to
 * strip the guard off the registry — which is the one thing keeping the whole
 * changelog out of every admin route's client chunk.
 *
 * There is no test runner in this repo (see CLAUDE.md), and every regression
 * here is quiet. A string-compared version hides every release from the tenth
 * minor onwards. An entry whose href points at a section its own audience
 * cannot open bounces the reader to Overview with nothing on screen to explain
 * why. A null watermark that resolves the wrong way hands a new hire a wall of
 * history on their first morning. A reused id makes two different changes look
 * like one. None of these throws, and none of them shows up in a lint.
 *
 * Run it after touching src/lib/releaseFields.ts or adding a release.
 */
import { ADMIN_AREAS, isAdminArea, type AdminArea } from '@/lib/adminAreas';
import { ADMIN_HELP } from '@/lib/adminHelp';
import {
  ADMIN_ROUTES,
  canSeeNavItem,
  type NavAccess,
  type NavGate,
} from '@/lib/adminNav';
import {
  RELEASE_LIST,
  unseenFor,
  visibleReleases,
} from '@/lib/adminReleases';
import {
  CURRENT_VERSION,
  RELEASE_KINDS,
  RELEASE_KIND_LABELS,
  RELEASE_KIND_TONES,
  RELEASE_TITLE_MAX,
  RELEASE_VERSIONS,
  VERSION_RE,
  compareVersions,
  parseVersion,
  resolveWatermark,
  type Release,
  type ReleaseEntry,
} from '@/lib/releaseFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};
const section = (name: string) => console.log(`\n— ${name}`);

const NO_ACCESS: NavAccess = {
  superadmin: false,
  areas: [],
  payrollSelf: false,
};
const access = (over: Partial<NavAccess> = {}): NavAccess => ({
  ...NO_ACCESS,
  ...over,
});

// ---------------------------------------------------------------- ordering --
section('ordering and identity');

eq(
  'every version matches the three-number grammar',
  RELEASE_VERSIONS.filter((v) => !VERSION_RE.test(v)),
  [],
);

// ── CalVer shape ───────────────────────────────────────────────────────────
//
// VERSION_RE cannot carry this: it also has to accept the pre-CalVer strings
// still sitting in user.release_seen_version, so it stays three loose numbers
// and the SHAPE of a release we publish is pinned here instead.
//
// Run through a named predicate and mutation-tested below, because with every
// shipped release currently correct, a filter over the real tuple that returns
// [] proves nothing on its own.
const badCalVer = (versions: readonly string[]): string[] =>
  versions.filter((v) => {
    const parts = v.split('.');
    if (parts.length !== 3) return true;
    // Leading zeros are refused rather than normalised: the watermark is
    // compared as numbers but STORED as a string, so '2026.08.1' and
    // '2026.8.1' would be one release under two watermarks.
    if (parts.some((p) => p !== String(Number(p)))) return true;
    const [year, month, nth] = parts.map(Number);
    return year < 2026 || month < 1 || month > 12 || nth < 1;
  });

eq('every version is well-formed CalVer', badCalVer(RELEASE_VERSIONS), []);
eq('…and the rule catches a leading zero', badCalVer(['2026.08.1']), ['2026.08.1']);
eq('…and a thirteenth month', badCalVer(['2026.13.1']), ['2026.13.1']);
eq('…and a zeroth release of a month', badCalVer(['2026.8.0']), ['2026.8.0']);
eq('…and a leftover semver string', badCalVer(['1.8.0']), ['1.8.0']);
eq('…and passes two real ones', badCalVer(['2026.8.6', '2027.11.2']), []);

// The invariant CalVer makes possible, and the one that would actually bite: a
// version claiming a month its own release day is not in. Checked against every
// release rather than only the newest, since renumbering the back catalogue is
// exactly when this could go wrong.
eq(
  'every version names the month its release date falls in',
  RELEASE_LIST.filter((r) => {
    const [year, month] = r.version.split('.').map(Number);
    const [dYear, dMonth] = r.date.split('-').map(Number);
    return year !== dYear || month !== dMonth;
  }).map((r) => `${r.version} dated ${r.date}`),
  [],
);

// The ordering and uniqueness RULES go through named helpers, and each helper
// is then run against a known-bad list. With a single shipped release the
// checks over the real tuple are VACUOUSLY true — "no out-of-order pair" holds
// trivially for one item — and a vacuous assertion is worse than none, because
// its PASS reads as proof. Pinning the helper means the rule is guarded from
// the first release, not from the second.
const outOfOrder = (versions: readonly string[]): string[] =>
  versions.filter(
    (v, i) => i > 0 && compareVersions(versions[i - 1], v) <= 0,
  );
const duplicates = (values: readonly string[]): number =>
  values.length - new Set(values).size;

eq('RELEASE_VERSIONS is strictly descending', outOfOrder(RELEASE_VERSIONS), []);
eq(
  '…and the descending rule itself catches an ascending pair',
  outOfOrder(['1.4.0', '1.5.0']),
  ['1.5.0'],
);
eq(
  '…and catches a repeated version',
  outOfOrder(['1.5.0', '1.5.0']),
  ['1.5.0'],
);
eq('…and passes a genuinely descending list', outOfOrder(['2.0.0', '1.9.0']), []);

eq('no duplicate versions', duplicates(RELEASE_VERSIONS), 0);
eq('…and the duplicate rule itself counts one', duplicates(['a', 'a']), 1);

eq(
  'CURRENT_VERSION is the newest release',
  RELEASE_LIST[0]?.version,
  CURRENT_VERSION,
);

eq(
  'every release record matches the tuple slot it is keyed by',
  RELEASE_LIST.filter((r, i) => r.version !== RELEASE_VERSIONS[i]).map(
    (r) => r.version,
  ),
  [],
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
eq(
  'every date is a YYYY-MM-DD calendar day',
  RELEASE_LIST.filter((r) => !DATE_RE.test(r.date)).map((r) => r.version),
  [],
);
eq(
  'every date is a real day',
  RELEASE_LIST.filter(
    (r) => !Number.isFinite(new Date(`${r.date}T00:00:00Z`).getTime()),
  ).map((r) => r.version),
  [],
);
eq(
  'dates are non-increasing down the list',
  RELEASE_LIST.filter((r, i) => i > 0 && r.date > RELEASE_LIST[i - 1].date).map(
    (r) => r.version,
  ),
  [],
);

const allEntries: ReleaseEntry[] = RELEASE_LIST.flatMap((r) => r.entries);

eq(
  'entry ids are globally unique',
  duplicates(allEntries.map((e) => e.id)),
  0,
);

eq(
  'every entry id is prefixed by its own release version',
  RELEASE_LIST.flatMap((r) =>
    r.entries.filter((e) => !e.id.startsWith(`${r.version}/`)).map((e) => e.id),
  ),
  [],
);

eq(
  'no release is empty',
  RELEASE_LIST.filter((r) => r.entries.length === 0).map((r) => r.version),
  [],
);
eq(
  'no release carries more than 8 entries',
  RELEASE_LIST.filter((r) => r.entries.length > 8).map((r) => r.version),
  [],
);

// -------------------------------------------------------------- vocabulary --
section('vocabulary');

eq(
  'every announce is notice or quiet',
  RELEASE_LIST.filter((r) => r.announce !== 'notice' && r.announce !== 'quiet')
    .map((r) => r.version),
  [],
);

eq(
  'every kind is in RELEASE_KINDS',
  allEntries
    .filter((e) => !(RELEASE_KINDS as readonly string[]).includes(e.kind))
    .map((e) => e.id),
  [],
);

eq(
  'every kind has a label and a tone',
  RELEASE_KINDS.filter(
    (k) => !RELEASE_KIND_LABELS[k] || !RELEASE_KIND_TONES[k],
  ),
  [],
);

// The admin theme carries no chroma; a hue on a kind chip would be the first
// colour in the dashboard, and it would be carrying a category rather than a
// quantity. Ink only.
const CHROMA_RE =
  /\b(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-/;
eq(
  'kind tones are ink, never a hue',
  RELEASE_KINDS.filter((k) => CHROMA_RE.test(RELEASE_KIND_TONES[k])),
  [],
);

const gateAreas = (gate: NavGate): AdminArea[] => [
  ...(gate.area ? [gate.area] : []),
  ...(gate.areasAll ?? []),
  ...(gate.areasAny ?? []),
];
eq(
  'every area named in a gate is a real AdminArea',
  allEntries
    .filter((e) => gateAreas(e).some((a) => !isAdminArea(a)))
    .map((e) => e.id),
  [],
);

// ------------------------------------------------------------------- links --
section('links reach the audience that is offered them');

/**
 * The least-privileged viewer this entry is offered to, following
 * canSeeNavItem's own precedence. If THAT viewer cannot open the linked route,
 * some real member will be shown a link that bounces them.
 */
function minimalAccessesFor(gate: NavGate): NavAccess[] {
  if (gate.payrollSelf) return [access({ payrollSelf: true })];
  if (gate.superadmin) return [access({ superadmin: true })];
  if (gate.areasAll) return [access({ areas: [...gate.areasAll] })];
  // EVERY alternative, not just the first. `areasAny` has no single
  // least-privileged viewer — it has one per alternative — so sampling
  // areasAny[0] verified whichever area happened to be written first and left
  // the rest of the audience unchecked. An entry offered on `areasAny:
  // ['payroll','costs']` and linked to /admin/payroll would have PASSED while
  // bouncing every costs-only member who clicked it.
  if (gate.areasAny) return gate.areasAny.map((a) => access({ areas: [a] }));
  if (gate.area) return [access({ areas: [gate.area] })];
  return [access()];
}

const linked = allEntries.filter((e) => e.href);
const routeFor = (href: string) => {
  const path = href.split('?')[0];
  // EXACT, never a prefix: '/admin/payroll/xyz' prefix-matches '/admin/payroll'
  // and an entry should point at a section, not a row.
  return ADMIN_ROUTES.find((r) => r.href === path);
};

eq(
  'every href resolves to an exact ADMIN_ROUTES path',
  linked.filter((e) => !routeFor(e.href!)).map((e) => e.id),
  [],
);

eq(
  "every href is reachable by EVERY least-privileged viewer it is offered to",
  linked
    .filter((e) => {
      const route = routeFor(e.href!);
      return (
        route &&
        !minimalAccessesFor(e).every((acc) => canSeeNavItem(route, acc))
      );
    })
    .map((e) => e.id),
  [],
);

// The oracle itself, against a known-bad shape — otherwise this whole section
// is only as good as today's single ungated entry.
{
  const spendRoute = ADMIN_ROUTES.find((r) => r.href === '/admin/spend');
  const payrollRoute = ADMIN_ROUTES.find((r) => r.href === '/admin/payroll');
  eq(
    'oracle: an areasAny entry linked to an areasAll route is REFUSED',
    minimalAccessesFor({ areasAny: ['payroll', 'costs'] }).every((acc) =>
      canSeeNavItem(spendRoute!, acc),
    ),
    false,
  );
  eq(
    'oracle: an areasAny entry linked to a payroll-only route is REFUSED',
    minimalAccessesFor({ areasAny: ['payroll', 'costs'] }).every((acc) =>
      canSeeNavItem(payrollRoute!, acc),
    ),
    false,
  );
  eq(
    'oracle: an areasAll entry linked to the Spend route is allowed',
    minimalAccessesFor({ areasAll: ['payroll', 'costs'] }).every((acc) =>
      canSeeNavItem(spendRoute!, acc),
    ),
    true,
  );
}

eq(
  'every help key exists in ADMIN_HELP',
  allEntries.filter((e) => e.help && !(e.help in ADMIN_HELP)).map((e) => e.id),
  [],
);

// -------------------------------------------------------------- comparator --
section('the comparator orders numerically, not lexically');

eq('1.9.0 < 1.10.0', compareVersions('1.9.0', '1.10.0'), -1);
eq('1.10.0 > 1.9.0', compareVersions('1.10.0', '1.9.0'), 1);
eq('1.10.0 < 2.0.0', compareVersions('1.10.0', '2.0.0'), -1);
eq('1.0.9 < 1.0.10', compareVersions('1.0.9', '1.0.10'), -1);
eq('2.0.0 > 1.99.99', compareVersions('2.0.0', '1.99.99'), 1);
eq('equality is 0', compareVersions('1.5.0', '1.5.0'), 0);
eq('junk sorts below a real version', compareVersions('nope', '0.0.1'), -1);
eq('two junks tie', compareVersions('nope', 'also-nope'), 0);

for (const bad of ['', '1.5', 'v1.5.0', '1.5.0-beta', '1.5.0+build', '1.5.0.1'])
  eq(`parseVersion rejects ${JSON.stringify(bad)}`, parseVersion(bad), null);
eq('parseVersion reads 1.10.2', parseVersion('1.10.2'), [1, 10, 2]);

section('resolveWatermark');
eq('null is a clean slate', resolveWatermark(null), CURRENT_VERSION);
eq('undefined is a clean slate', resolveWatermark(undefined), CURRENT_VERSION);
eq('junk degrades to a clean slate', resolveWatermark('garbage'), CURRENT_VERSION);
eq('a real version is kept', resolveWatermark('1.2.3'), '1.2.3');

// ------------------------------------------------------------ the fixtures --
// Deliberately BELOW CURRENT_VERSION so the null-watermark case (which resolves
// to CURRENT_VERSION) is genuinely "nothing newer", exactly as it is in prod.
const entry = (id: string, gate: NavGate = {}): ReleaseEntry => ({
  id,
  kind: 'added',
  title: id,
  what: 'A fixture.',
  ...gate,
});

const fixtures = [
  {
    version: '1.2.0',
    date: '2026-08-03',
    announce: 'notice',
    entries: [
      entry('1.2.0/everyone'),
      entry('1.2.0/tasks', { area: 'tasks' }),
      entry('1.2.0/spend', { areasAll: ['payroll', 'costs'] }),
      entry('1.2.0/commitments', { areasAny: ['payroll', 'costs'] }),
      entry('1.2.0/users', { superadmin: true }),
      entry('1.2.0/mypay', { payrollSelf: true }),
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-02',
    announce: 'quiet',
    entries: [entry('1.1.0/quiet-tasks', { area: 'tasks' })],
  },
  {
    version: '1.0.0',
    date: '2026-08-01',
    announce: 'notice',
    entries: [entry('1.0.0/payroll-only', { area: 'payroll' })],
  },
] as unknown as Release[];

const ids = (r: { releases: Release[] }) =>
  r.releases.flatMap((rel) => rel.entries.map((e) => e.id));

section('unseenFor — the watermark oracle');

eq(
  'watermark above the newest fixture → nothing',
  unseenFor(access({ areas: [...ADMIN_AREAS] }), '9.9.9', fixtures).count,
  0,
);
eq(
  'watermark equal to the newest fixture → nothing',
  unseenFor(access({ areas: [...ADMIN_AREAS] }), '1.2.0', fixtures).count,
  0,
);
eq(
  'NULL watermark → nothing (the clean-slate rule)',
  unseenFor(access({ areas: [...ADMIN_AREAS] }), null, fixtures).count,
  0,
);
eq(
  'watermark below the oldest → every entry this viewer may read',
  ids(unseenFor(access({ areas: [...ADMIN_AREAS] }), '0.0.1', fixtures)),
  [
    '1.2.0/everyone',
    '1.2.0/tasks',
    '1.2.0/spend',
    '1.2.0/commitments',
    '1.1.0/quiet-tasks',
    '1.0.0/payroll-only',
  ],
);

section('unseenFor — the audience oracle');

eq(
  'no areas at all → only the ungated entry',
  ids(unseenFor(access(), '0.0.1', fixtures)),
  ['1.2.0/everyone'],
);
eq(
  'every area, but no payroll record and not superadmin → no users, no my-pay',
  ids(unseenFor(access({ areas: [...ADMIN_AREAS] }), '0.0.1', fixtures)).filter(
    (id) => id.endsWith('/users') || id.endsWith('/mypay'),
  ),
  [],
);
eq(
  'payrollSelf only → own-pay plus ungated, nothing else',
  ids(unseenFor(access({ payrollSelf: true }), '0.0.1', fixtures)),
  ['1.2.0/everyone', '1.2.0/mypay'],
);
eq(
  'superadmin with no areas → the superadmin entry plus ungated',
  ids(unseenFor(access({ superadmin: true }), '0.0.1', fixtures)),
  ['1.2.0/everyone', '1.2.0/users'],
);
eq(
  'costs WITHOUT payroll → gets areasAny, never the areasAll Spend entry',
  ids(unseenFor(access({ areas: ['costs'] }), '0.0.1', fixtures)),
  ['1.2.0/everyone', '1.2.0/commitments'],
);
eq(
  'costs AND payroll → gets the areasAll Spend entry too',
  ids(unseenFor(access({ areas: ['costs', 'payroll'] }), '0.0.1', fixtures)),
  [
    '1.2.0/everyone',
    '1.2.0/spend',
    '1.2.0/commitments',
    '1.0.0/payroll-only',
  ],
);

section('unseenFor — announce');

eq(
  'a notice release the viewer can read announces',
  unseenFor(access({ areas: ['tasks'] }), '0.0.1', fixtures).announce,
  true,
);
// 1.0.0 is a `notice` release carrying ONE payroll-only entry, so for a viewer
// without that grant it must vanish entirely rather than survive as an empty
// release that opens a dialog with nothing in it. (Testing this against the
// whole fixture set would prove nothing — 1.2.0 carries an ungated entry, so
// it is visible to everyone and is SUPPOSED to survive.)
const payrollOnlyNotice = [fixtures[2]];
eq(
  'a notice release entirely outside the viewer areas is DROPPED, not empty',
  unseenFor(access({ areas: ['tasks'] }), '0.0.1', payrollOnlyNotice).releases
    .length,
  0,
);
eq(
  '…and therefore does not announce',
  unseenFor(access({ areas: ['tasks'] }), '0.0.1', payrollOnlyNotice).announce,
  false,
);
eq(
  '…while the payroll holder does get it, and IS announced',
  unseenFor(access({ areas: ['payroll'] }), '0.0.1', payrollOnlyNotice)
    .announce,
  true,
);
eq(
  'a quiet-only span does not announce',
  unseenFor(access({ areas: ['tasks'] }), '0.0.1', [fixtures[1]]).announce,
  false,
);
eq(
  '…but still counts, so the dot lights',
  unseenFor(access({ areas: ['tasks'] }), '0.0.1', [fixtures[1]]).count,
  1,
);

section('visibleReleases ignores the watermark');

const everyArea = access({
  areas: [...ADMIN_AREAS],
  superadmin: true,
  payrollSelf: true,
});
eq(
  'the history is the same set whatever the watermark says',
  visibleReleases(everyArea, fixtures).flatMap((r) =>
    r.entries.map((e) => e.id),
  ).length,
  8,
);
eq(
  'a viewer with no areas still sees only what they may read',
  visibleReleases(access(), fixtures).flatMap((r) => r.entries.map((e) => e.id)),
  ['1.2.0/everyone'],
);

// --------------------------------------------------------------------- copy --
section('copy');

// /admin/logs is already this codebase's benchmark for "a wider audience than
// the payroll grant", and a changelog is wider still. A vendor or a section can
// be named; a figure cannot.
const MONEY_RE = /CA\$|\$\d|£|€|\btoman\b|\bIRT\b|\bCAD\b|\d+\.\d{2}\b/i;
const strings = (e: ReleaseEntry) => [e.title, e.what, ...(e.steps ?? [])];
eq(
  'no money figure in any entry string',
  allEntries.filter((e) => strings(e).some((s) => MONEY_RE.test(s))).map((e) => e.id),
  [],
);
eq(
  'no money figure in a headline',
  RELEASE_LIST.filter((r) => r.headline && MONEY_RE.test(r.headline)).map(
    (r) => r.version,
  ),
  [],
);

eq(
  `every title is at most ${RELEASE_TITLE_MAX} characters`,
  allEntries.filter((e) => e.title.length > RELEASE_TITLE_MAX).map((e) => e.id),
  [],
);
eq(
  'no title ends in a period',
  allEntries.filter((e) => e.title.trim().endsWith('.')).map((e) => e.id),
  [],
);
eq(
  'every what is a non-empty sentence',
  allEntries.filter((e) => e.what.trim().length < 10).map((e) => e.id),
  [],
);
eq(
  'steps, when present, are never empty',
  allEntries
    .filter((e) => e.steps && (e.steps.length === 0 || e.steps.some((s) => !s.trim())))
    .map((e) => e.id),
  [],
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
