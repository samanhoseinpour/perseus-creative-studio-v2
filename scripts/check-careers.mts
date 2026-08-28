/**
 * Careers self-check — the job-listing vocabulary and rules, executable.
 *
 * Run:  node --import tsx scripts/check-careers.mts    (no DB, no env)
 *
 * src/lib/careerFields.ts is where the open roles become prose (the hero,
 * the meta description, the FAQ answers, and the WebPage JSON-LD all read the
 * same composers, which is what stops them naming different role counts the
 * way the hand-written copy used to), where pay becomes a string, and where
 * the public fingerprint that gates IndexNow pings is computed.
 * src/lib/careersSchema.ts holds the two policy refinements — nothing opens
 * without a pay range (BC Pay Transparency) and a posted date (Google
 * JobPosting). There is no test runner in this repo (see CLAUDE.md), and each
 * regression here is quiet: a snippet Google truncates mid-title, a "four
 * roles" hero over three listings, a half-filled range rendering
 * "$30–undefined", or a listing going live with no pay on it. Run this after
 * touching careerFields.ts or careersSchema.ts.
 */
import {
  GENERAL_APPLICATION,
  JOB_SLUG_MAX,
  JOB_SLUG_RE,
  careersFilterValue,
  META_DESCRIPTION_MAX,
  RESERVED_JOB_SLUGS,
  SCHEMA_EMPLOYMENT_TYPE,
  composeHiringFaq,
  composeHiringIntro,
  composeHiringMeta,
  composeRemoteFaq,
  countWord,
  formatPay,
  isJobCategoryIconKey,
  isRemoteLocation,
  listTitles,
  openingFingerprint,
  payFrom,
  roleLabel,
  type OpeningPublicFields,
} from '@/lib/careerFields';
import {
  flattenCareersIssues,
  jobCategorySchema,
  jobOpeningSchema,
  openingCanOpen,
} from '@/lib/careersSchema';
import { parseInboxListParams } from '@/lib/inboxFilters';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};
const has = (label: string, text: string, needle: string) =>
  eq(`${label} contains ${JSON.stringify(needle)}`, text.includes(needle), true);
const lacks = (label: string, text: string, needle: string) =>
  eq(`${label} omits ${JSON.stringify(needle)}`, text.includes(needle), false);

// ---- list + count words. The Oxford comma is deliberate: the studio's copy
// uses it everywhere else, and a two-item list must not grow a comma.
eq('listTitles: empty', listTitles([]), '');
eq('listTitles: one', listTitles(['Video Editor']), 'Video Editor');
eq('listTitles: two', listTitles(['Video Editor', 'SEO Specialist']), 'Video Editor and SEO Specialist');
eq(
  'listTitles: three (Oxford comma)',
  listTitles(['Video Editor', 'SEO Specialist', 'Web Developer']),
  'Video Editor, SEO Specialist, and Web Developer',
);
eq('countWord: 0', countWord(0), 'zero');
eq('countWord: 1', countWord(1), 'one');
eq('countWord: 4', countWord(4), 'four');
eq('countWord: 10', countWord(10), 'ten');
eq('countWord: 11 falls back to digits', countWord(11), '11');

// ---- the hero paragraph.
const FOUR = ['Video Editor', 'SEO Specialist', 'Web Developer', 'Graphic Designer'] as const;
const intro0 = composeHiringIntro([]);
const intro1 = composeHiringIntro(['Video Editor']);
const intro4 = composeHiringIntro(FOUR);
const intro4Mixed = composeHiringIntro(FOUR, false);

has('intro (0)', intro0, 'No roles are open right now');
has('intro (0)', intro0, 'general application');
has('intro (1)', intro1, 'one remote role right now: Video Editor.');
lacks('intro (1) is singular', intro1, 'roles');
has('intro (4)', intro4, 'four remote roles right now');
has('intro (4) carries the Oxford list', intro4, listTitles(FOUR));
has('intro (4) keeps the filled tail', intro4, 'Every other listing below is filled');
has('intro (4, allRemote=false)', intro4Mixed, 'four roles right now');
lacks('intro (4, allRemote=false) drops the word', intro4Mixed, 'remote');

// ---- the meta / OG description. The budget is the whole contract.
eq('META_DESCRIPTION_MAX is 160', META_DESCRIPTION_MAX, 160);
const LONG8 = [
  'Senior Motion Graphics Designer',
  'Performance Marketing Strategist',
  'Full-Stack Web Developer (Next.js)',
  'Director of Photography, Commercial',
  'Social Media Community Manager',
  'Brand Identity Designer, Mid-level',
  'Search Engine Optimisation Lead',
  'Paid Social Campaign Coordinator',
] as const;
const meta0 = composeHiringMeta([]);
const meta4 = composeHiringMeta(FOUR);
const meta8 = composeHiringMeta(LONG8);
const meta4Mixed = composeHiringMeta(FOUR, false);

eq('meta (0) within budget', meta0.length <= META_DESCRIPTION_MAX, true);
has('meta (0)', meta0, 'no open roles right now');
has('meta (0)', meta0, 'general application');
eq('meta (4) within budget', meta4.length <= META_DESCRIPTION_MAX, true);
has('meta (4) names every role', meta4, listTitles(FOUR));
lacks('meta (4) needs no fold', meta4, ' more');
has('meta (4) is remote', meta4, '— all remote');
lacks('meta (4, allRemote=false) drops the remote tail', meta4Mixed, 'all remote');
eq('meta (8 long) within budget', meta8.length <= META_DESCRIPTION_MAX, true);
has('meta (8 long) folds the rest', meta8, ' more');
has('meta (8 long) still names the first role', meta8, LONG8[0]);
eq(
  'meta (8 long) fold count + shown count = 8',
  (() => {
    const m = meta8.match(/(\d+) more/);
    const hidden = m ? Number(m[1]) : NaN;
    const shown = LONG8.filter((t) => meta8.includes(t)).length;
    return shown + hidden;
  })(),
  8,
);

// ---- the FAQ answers.
const faq0 = composeHiringFaq([]);
const faq1 = composeHiringFaq(['Video Editor']);
const faq4 = composeHiringFaq(FOUR);
const faq4Mixed = composeHiringFaq(FOUR, false);
has('faq (0)', faq0, 'Not right now');
has('faq (0)', faq0, 'general application');
has('faq (1) singular verb', faq1, 'one role is open right now: Video Editor');
has('faq (4) plural verb', faq4, 'four roles are open right now');
has('faq (4) carries the Oxford list', faq4, listTitles(FOUR));
has('faq (4) is remote', faq4, ', all remote');
lacks('faq (4, allRemote=false)', faq4Mixed, 'all remote');
has('faq (4) keeps the filled note', faq4, 'Position filled');

eq('remote faq: all remote', composeRemoteFaq(true).startsWith('Every role we list is remote'), true);
eq('remote faq: mixed', composeRemoteFaq(false).startsWith('Most roles are remote'), true);
eq('remote faq: the two branches differ', composeRemoteFaq(true) === composeRemoteFaq(false), false);

// ---- pay. The chip strings, measured against the old hand-written ones.
eq('formatPay: hourly range', formatPay({ min: 30, max: 45, unit: 'HOUR' }), '$30–45 / hour');
eq('formatPay: daily range', formatPay({ min: 650, max: 900, unit: 'DAY' }), '$650–900 / day');
eq('formatPay: single figure', formatPay({ min: 30, max: 30, unit: 'HOUR' }), '$30 / hour');
eq(
  'formatPay: annual, thousands grouped',
  formatPay({ min: 55_000, max: 70_000, unit: 'YEAR' }),
  '$55,000–70,000 / year',
);
eq('payFrom: complete', payFrom(30, 45, 'HOUR'), { min: 30, max: 45, unit: 'HOUR' });
eq('payFrom: zero minimum is a value, not missing', payFrom(0, 10, 'HOUR'), { min: 0, max: 10, unit: 'HOUR' });
eq('payFrom: null min', payFrom(null, 45, 'HOUR'), null);
eq('payFrom: null max', payFrom(30, null, 'HOUR'), null);
eq('payFrom: null unit', payFrom(30, 45, null), null);
eq('payFrom: undefined min', payFrom(undefined, 45, 'HOUR'), null);
eq('payFrom: all missing', payFrom(null, null, null), null);

// ---- schema.org employmentType.
eq('SCHEMA_EMPLOYMENT_TYPE.full_time', SCHEMA_EMPLOYMENT_TYPE.full_time, 'FULL_TIME');
eq('SCHEMA_EMPLOYMENT_TYPE.part_time', SCHEMA_EMPLOYMENT_TYPE.part_time, 'PART_TIME');
eq('SCHEMA_EMPLOYMENT_TYPE.subcontract', SCHEMA_EMPLOYMENT_TYPE.subcontract, 'CONTRACTOR');

// ---- role labels. The snapshot is what the applicant saw; it always wins.
eq('roleLabel: snapshot wins', roleLabel('video-editor', 'Video Editor'), 'Video Editor');
eq(
  'roleLabel: snapshot wins even over the sentinel',
  roleLabel(GENERAL_APPLICATION.slug, 'Open application'),
  'Open application',
);
eq('roleLabel: general-application sentinel', roleLabel(GENERAL_APPLICATION.slug), 'General application');
eq('roleLabel: raw slug fallback', roleLabel('video-editor'), 'video-editor');
eq('roleLabel: empty snapshot falls through', roleLabel('video-editor', ''), 'video-editor');
eq('roleLabel: null snapshot falls through', roleLabel('video-editor', null), 'video-editor');
eq('RESERVED_JOB_SLUGS holds the sentinel', [...RESERVED_JOB_SLUGS], [GENERAL_APPLICATION.slug]);

// ---- remote detection (case- and whitespace-insensitive, exact word).
eq('isRemoteLocation: Remote', isRemoteLocation('Remote'), true);
eq('isRemoteLocation: " remote "', isRemoteLocation(' remote '), true);
eq('isRemoteLocation: REMOTE', isRemoteLocation('REMOTE'), true);
eq('isRemoteLocation: Vancouver', isRemoteLocation('Vancouver'), false);
eq('isRemoteLocation: "Remote, Canada" is not the sentinel', isRemoteLocation('Remote, Canada'), false);

// ---- slug + icon vocabulary.
eq('JOB_SLUG_RE accepts video-editor', JOB_SLUG_RE.test('video-editor'), true);
eq('JOB_SLUG_RE accepts digits', JOB_SLUG_RE.test('editor-2'), true);
eq('JOB_SLUG_RE rejects uppercase', JOB_SLUG_RE.test('Video-Editor'), false);
eq('JOB_SLUG_RE rejects a trailing dash', JOB_SLUG_RE.test('video-'), false);
eq('JOB_SLUG_RE rejects a double dash', JOB_SLUG_RE.test('video--editor'), false);
eq('isJobCategoryIconKey: briefcase', isJobCategoryIconKey('briefcase'), true);
eq('isJobCategoryIconKey: rocket', isJobCategoryIconKey('rocket'), false);
eq('isJobCategoryIconKey: non-string', isJobCategoryIconKey(42), false);

// ---- the public fingerprint. Equal for equal input, different for any
// visible change — the IndexNow gate rides on exactly this.
const base: OpeningPublicFields = {
  title: 'Video Editor',
  categoryName: 'Production',
  location: 'Remote',
  employmentType: 'subcontract',
  level: 'Mid-level',
  cadence: 'Flexible hours',
  fit: 'Editors who cut fast and clean for social.',
  summary: 'Cut short-form and long-form video for client accounts.',
  tags: ['Premiere', 'DaVinci'],
  status: 'open',
  datePosted: '2026-08-01',
  validThrough: '2026-11-15',
  payMin: 30,
  payMax: 45,
  payUnit: 'HOUR',
};
const fp = openingFingerprint(base);
eq('fingerprint: stable for identical input', openingFingerprint({ ...base, tags: ['Premiere', 'DaVinci'] }), fp);
eq('fingerprint: title change moves it', openingFingerprint({ ...base, title: 'Senior Video Editor' }) === fp, false);
eq('fingerprint: payMin change moves it', openingFingerprint({ ...base, payMin: 35 }) === fp, false);
eq('fingerprint: status change moves it', openingFingerprint({ ...base, status: 'filled' }) === fp, false);
eq(
  'fingerprint: tag order matters',
  openingFingerprint({ ...base, tags: ['DaVinci', 'Premiere'] }) === fp,
  false,
);
eq('fingerprint: readonly tags array is fine', openingFingerprint({ ...base, tags: Object.freeze(['Premiere', 'DaVinci']) }), fp);

// ---- the zod rules. A valid open listing is the baseline; each case flips
// one thing and must fail on exactly the path the form slots it under.
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const validOpen = {
  title: 'Video Editor',
  slug: 'video-editor',
  categoryId: CATEGORY_ID,
  location: 'Remote',
  employmentType: 'subcontract',
  level: 'Mid-level',
  cadence: 'Flexible hours',
  fit: 'Editors who cut fast and clean for social.',
  summary: 'Cut short-form and long-form video for client accounts.',
  tags: ['Premiere', 'DaVinci'],
  status: 'open',
  datePosted: '2026-08-01',
  validThrough: '2026-11-15',
  payMin: 30,
  payMax: 45,
  payUnit: 'HOUR',
};
const issuesOf = (input: unknown): Record<string, string> | null => {
  const r = jobOpeningSchema.safeParse(input);
  return r.success ? null : flattenCareersIssues(r.error);
};
const failsOn = (label: string, input: unknown, path: string, message?: string) => {
  const issues = issuesOf(input);
  eq(`opening: ${label} fails on ${path}`, issues !== null && path in issues, true);
  if (message) eq(`opening: ${label} says the ${path} message`, issues?.[path], message);
};

eq('opening: a valid open listing parses', issuesOf(validOpen), null);
const parsedOpen = jobOpeningSchema.safeParse(validOpen);
eq(
  'opening: the parse keeps the values',
  parsedOpen.success && parsedOpen.data.payMin === 30 && parsedOpen.data.datePosted === '2026-08-01',
  true,
);
const { payMin: _pm, payMax: _px, payUnit: _pu, ...openNoPay } = validOpen;
void _pm; void _px; void _pu;
failsOn(
  'open without pay',
  openNoPay,
  'payMin',
  'Add the pay range before opening this role. BC requires it on every public posting.',
);
failsOn(
  'open without datePosted',
  { ...validOpen, datePosted: '' },
  'datePosted',
  'Add the posted date before opening this role.',
);
failsOn(
  'payMin > payMax',
  { ...validOpen, payMin: 50, payMax: 45 },
  'payMax',
  'The maximum must be at least the minimum.',
);
failsOn(
  'half-filled pay (min only, draft)',
  { ...openNoPay, status: 'draft', payMin: 30 },
  'payMin',
  'Fill in the minimum, maximum, and unit together.',
);
failsOn('half-filled pay (unit only, draft)', { ...openNoPay, status: 'draft', payUnit: 'HOUR' }, 'payMin');
failsOn(
  'validThrough before datePosted',
  { ...validOpen, datePosted: '2026-08-01', validThrough: '2026-07-31' },
  'validThrough',
  'The expiry can’t be before the posted date.',
);
eq(
  'opening: validThrough equal to datePosted is accepted',
  issuesOf({ ...validOpen, validThrough: '2026-08-01' }),
  null,
);
failsOn(
  'the reserved general-application slug',
  { ...validOpen, slug: GENERAL_APPLICATION.slug },
  'slug',
  'This slug is reserved for the general-application option.',
);
failsOn('a malformed date', { ...validOpen, datePosted: '08/01/2026' }, 'datePosted', 'Use a date like 2026-08-09.');
failsOn('a fractional dollar figure', { ...validOpen, payMin: 30.5 }, 'payMin');
failsOn('too many tags', { ...validOpen, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, 'tags');
eq(
  'opening: a draft with no pay and no dates parses',
  issuesOf({ ...openNoPay, status: 'draft', datePosted: '', validThrough: '' }),
  null,
);
eq(
  'opening: a filled listing with no pay parses (the rule is about opening)',
  issuesOf({ ...openNoPay, status: 'filled' }),
  null,
);
eq(
  'opening: tags default to []',
  (() => {
    const { tags: _t, ...noTags } = validOpen;
    void _t;
    const r = jobOpeningSchema.safeParse(noTags);
    return r.success ? r.data.tags : 'parse failed';
  })(),
  [],
);

// ---- categories.
const validCategory = { name: 'Production', slug: 'production', icon: 'video' };
eq('category: valid parses', jobCategorySchema.safeParse(validCategory).success, true);
const badIcon = jobCategorySchema.safeParse({ ...validCategory, icon: 'rocket' });
eq('category: unknown icon is refused', badIcon.success, false);
eq(
  'category: the icon refusal lands on icon',
  badIcon.success ? null : 'icon' in flattenCareersIssues(badIcon.error),
  true,
);
eq(
  'category: a reserved-looking slug is fine here (the reservation is for openings)',
  jobCategorySchema.safeParse({ ...validCategory, slug: GENERAL_APPLICATION.slug }).success,
  true,
);

// ---- openingCanOpen: the roster's one-sentence gate against the stored row.
const stored = { payMin: 30, payMax: 45, payUnit: 'HOUR', datePosted: '2026-08-01' };
eq('canOpen: complete row → null', openingCanOpen(stored), null);
eq(
  'canOpen: no pay, no date',
  openingCanOpen({ payMin: null, payMax: null, payUnit: null, datePosted: null }),
  'Add a pay range and a posted date before opening this role.',
);
eq(
  'canOpen: no pay',
  openingCanOpen({ ...stored, payMin: null, payMax: null, payUnit: null }),
  'Add a pay range before opening this role.',
);
eq(
  'canOpen: half pay counts as no pay',
  openingCanOpen({ ...stored, payMax: null }),
  'Add a pay range before opening this role.',
);
eq(
  'canOpen: no date',
  openingCanOpen({ ...stored, datePosted: null }),
  'Add a posted date before opening this role.',
);

// ---- the review's three pins (2026-08-23). The slug cap is ALSO the inbox
// URL contract: a role slug the dialog accepts must survive
// /admin/applications?role=<slug>, or the roster's "N applications" link
// lands on the unfiltered list. Phantom dates must die in zod, not in the
// Postgres date cast. Category filter values carry a prefix so a category
// slugged 'all'/'open' can't collide with the public filter's sentinels.
const longest = 'a'.repeat(JOB_SLUG_MAX);
eq(
  'slug cap: the inbox parser keeps a max-length role slug',
  parseInboxListParams((k) => (k === 'role' ? longest : '')).role,
  longest,
);
eq(
  'slug cap: one char over is refused by the schema',
  jobOpeningSchema.safeParse({ ...validOpen, slug: `${longest}a` }).success,
  false,
);
for (const bad of ['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31']) {
  const r = jobOpeningSchema.safeParse({ ...validOpen, datePosted: bad });
  eq(`phantom date ${bad} refused on datePosted`, r.success ? null : flattenCareersIssues(r.error).datePosted?.includes('exist'), true);
}
eq(
  'leap day accepted',
  jobOpeningSchema.safeParse({ ...validOpen, datePosted: '2028-02-29', validThrough: '2028-03-01' }).success,
  true,
);
eq('filter value: prefixed', careersFilterValue('all'), 'category:all');
eq('filter value: never bare', ['all', 'open'].includes(careersFilterValue('open')), false);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
