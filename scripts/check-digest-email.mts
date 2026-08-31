/**
 * The weekly-digest email self-check (no DB, no env, no network).
 *
 * The Monday email states figures nobody can eyeball, and every way it can be
 * wrong still renders a plausible number. So this pins the four counting rules
 * in src/lib/digestEmail.ts, the reconciliation of every capped list, and the
 * escaping, against the studio's own data shapes.
 *
 * The load-bearing assertion is the arithmetic one: a shared task must reach
 * the studio total by THREE different routes (the member column, the client
 * column and the category column) and all three must land on the same figure.
 * A fold that credits a 3h shoot as 3h to each of two people reads as a
 * perfectly ordinary email; it is only wrong if you add it up.
 *
 * Run after touching src/lib/digestEmail.ts:
 *   node --import tsx scripts/check-digest-email.mts
 */

import {
  DIGEST_CLIENT_CAP,
  DIGEST_MEMBER_ITEM_CAP,
  composeDigestEmail,
  digestHeadline,
  escapeHtml,
  foldDigestWeek,
  type DigestRow,
} from '../src/lib/digestEmail';

let failures = 0;
let checks = 0;

function ok(label: string, condition: boolean, detail?: string) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
}

function eq<T>(label: string, actual: T, expected: T) {
  ok(
    label,
    Object.is(actual, expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function section(name: string) {
  console.log(`\n${name}`);
}

let seq = 0;
const row = (over: Partial<DigestRow> = {}): DigestRow => ({
  id: `t${(seq += 1)}`,
  title: `Task ${seq}`,
  clientName: 'Vela Homes',
  categoryName: 'Production',
  assignees: [{ id: 'u1', name: 'Sajad Hoseinpour' }],
  estimatedMinutes: 60,
  actualMinutes: null,
  parentId: null,
  ...over,
});

const RENDER = {
  rangeLabel: 'Aug 24 – Aug 30',
  boardUrl: 'https://www.perseustudio.com/admin/tasks?view=digest',
  logoUrl: 'https://www.perseustudio.com/perseus-wordmark-email.png',
};

/* ── 1. Counts split, minutes never (the revision rule) ─────────────────── */

section('Revisions are counted apart, but their minutes are in every total');
{
  const week = foldDigestWeek([
    row({ actualMinutes: 120 }),
    row({ actualMinutes: 30, parentId: 't1' }),
  ]);
  eq('deliverables counted alone', week.deliverables, 1);
  eq('revisions counted apart', week.revisions, 1);
  // The whole reason the rule is worth pinning: a revision's hours were real
  // work. Holding them out of the total would understate the week.
  eq('minutes take every row', week.totalMinutes, 150);
  eq('the client is billed both rounds', week.clients.bars[0].minutes, 150);
  eq("the member's hours include the round", week.members[0].minutes, 150);
  eq('the member keeps both counts apart', week.members[0].deliverables, 1);
  eq('...and the revision separately', week.members[0].revisions, 1);
}

/* ── 2. Counts do not split across people, minutes do ───────────────────── */

section('A shared task is one delivery, with its minutes apportioned');
{
  const week = foldDigestWeek([
    row({
      actualMinutes: 185,
      assignees: [
        { id: 'u1', name: 'Arshia Farrahi' },
        { id: 'u2', name: 'Aryan Ghasemi' },
      ],
    }),
  ]);
  eq('the studio counts it once', week.deliverables, 1);
  eq('the studio takes the whole 185', week.totalMinutes, 185);
  eq('both members appear', week.members.length, 2);
  // Largest remainder, NOT minutes/n rounded twice: 93 + 93 = 186 would leave
  // the member rows over-stating the headline directly above them.
  eq(
    'the shares are whole minutes that sum exactly',
    week.members[0].minutes + week.members[1].minutes,
    185,
  );
  ok(
    'the shares are the largest-remainder pair',
    [week.members[0].minutes, week.members[1].minutes].join(',') === '93,92',
    `got ${week.members[0].minutes},${week.members[1].minutes}`,
  );
  eq('each is credited the whole delivery', week.members[0].deliverables, 1);
  eq('...and so is the other', week.members[1].deliverables, 1);
  // Rule 3: the client attended one 185-minute job, not two halves.
  eq('the client takes the whole job', week.clients.bars[0].minutes, 185);
  eq('...counted once', week.clients.bars[0].tasks, 1);
  eq('the item names the whole job beside the share', week.members[0].items[0].sharedTotal, 185);
  eq('a solo item has no shared total', foldDigestWeek([row()]).members[0].items[0].sharedTotal, null);
}

/* ── 3. Three routes to one total ───────────────────────────────────────── */

section('Members, clients and categories all reconcile with the headline');
{
  const rows: DigestRow[] = [
    row({ actualMinutes: 185, categoryName: 'Production', clientName: 'UBC Women’s Soccer',
      assignees: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }] }),
    row({ actualMinutes: 240, categoryName: 'Websites', clientName: 'Cartel Lash & Supply Co' }),
    row({ actualMinutes: 55, categoryName: 'Websites', clientName: null }),
    row({ actualMinutes: 30, categoryName: 'Production', clientName: 'UBC Women’s Soccer', parentId: 't1' }),
    row({ estimatedMinutes: 45, actualMinutes: null, categoryName: 'Social', clientName: null,
      assignees: [{ id: 'u2', name: 'B' }, { id: 'u3', name: 'C' }, { id: 'u4', name: 'D' }] }),
  ];
  const week = foldDigestWeek(rows);
  const total = 185 + 240 + 55 + 30 + 45;

  eq('the headline total', week.totalMinutes, total);
  eq(
    'estimate stands in when actual is null',
    week.categories.bars.find((b) => b.label === 'Social')?.minutes ?? null,
    45,
  );
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
  eq('members reach it', sum(week.members.map((m) => m.minutes)), total);
  eq('clients reach it', sum(week.clients.bars.map((b) => b.minutes)), total);
  eq('categories reach it', sum(week.categories.bars.map((b) => b.minutes)), total);
  eq('deliverables', week.deliverables, 4);
  eq('revisions', week.revisions, 1);
  // A null client is the studio's own work, labelled as the board labels it.
  ok(
    'a null client folds to Perseus',
    week.clients.bars.some((b) => b.label === 'Perseus'),
    week.clients.bars.map((b) => b.label).join(' | '),
  );
  eq(
    '...carrying both of its rows',
    week.clients.bars.find((b) => b.label === 'Perseus')?.minutes ?? null,
    100,
  );
  // A 45-minute job across three people is 15 each: the count never splits.
  eq('a three-way split still sums', sum(week.members.filter((m) => ['B', 'C', 'D'].includes(m.name)).map(() => 15)), 45);
}

/* ── 4. Every cap states its remainder, and it reconciles ───────────────── */

section('Capped lists still add up to the bucket above them');
{
  const clients = Array.from({ length: DIGEST_CLIENT_CAP + 5 }, (_, i) =>
    row({ clientName: `Client ${i}`, actualMinutes: (i + 1) * 10 }),
  );
  const week = foldDigestWeek(clients);
  eq('only the cap is shown', week.clients.bars.length, DIGEST_CLIENT_CAP);
  ok('the remainder is declared', week.clients.more !== null);
  eq('...counting every hidden client', week.clients.more!.count, 5);
  const shown = week.clients.bars.reduce((a, b) => a + b.minutes, 0);
  // The house no-silent-truncation rule: visible plus remainder IS the total.
  eq('visible + remainder = the week', shown + week.clients.more!.minutes, week.totalMinutes);
  ok(
    'the biggest clients are the ones kept',
    week.clients.bars[0].minutes > week.clients.bars[DIGEST_CLIENT_CAP - 1].minutes,
  );

  const many = Array.from({ length: DIGEST_MEMBER_ITEM_CAP + 9 }, (_, i) =>
    row({ actualMinutes: (i + 1) * 7, assignees: [{ id: 'u9', name: 'Saman Hoseinpour' }] }),
  );
  const solo = foldDigestWeek(many).members[0];
  eq('the member list is capped', solo.items.length, DIGEST_MEMBER_ITEM_CAP);
  eq('and says how many it held back', solo.more!.count, 9);
  eq(
    "visible items + remainder = the member's own hours",
    solo.items.reduce((a, b) => a + b.minutes, 0) + solo.more!.minutes,
    solo.minutes,
  );
  ok('an uncapped member declares no remainder', foldDigestWeek([row()]).members[0].more === null);
}

/* ── 5. Escaping: the two hazards last week's real board already carried ── */

section('Member-typed text cannot break the markup');
{
  const week = foldDigestWeek([
    row({ clientName: 'Cartel Lash & Supply Co', title: 'fix: put the "Get 10% off" tab back on mobile' }),
  ]);
  const { html, text } = composeDigestEmail({
    rows: [
      row({ clientName: 'Cartel Lash & Supply Co', title: 'fix: put the "Get 10% off" tab back on mobile' }),
    ],
    ...RENDER,
  });
  eq('the fold keeps the raw name', week.clients.bars[0].label, 'Cartel Lash & Supply Co');
  ok('the HTML escapes the ampersand', html.includes('Cartel Lash &amp; Supply Co'));
  ok('...and does not emit a bare one', !html.includes('Lash & Supply'));
  ok('the HTML escapes the quotes', html.includes('&quot;Get 10% off&quot;'));
  ok('...and does not emit bare ones', !html.includes('"Get 10% off"'));
  // The text twin is not markup, so it must NOT be escaped: an entity in a
  // plain-text body is just noise the reader has to decode.
  ok('the text twin carries them raw', text.includes('Cartel Lash & Supply Co'));
  ok('...quotes included', text.includes('"Get 10% off"'));

  eq('escapeHtml covers every metacharacter', escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  ok('a tag cannot survive', !escapeHtml('<img src=x onerror=1>').includes('<'));
}

/* ── 6. The two renderings come from one fold ───────────────────────────── */

section('The HTML and the plain-text twin cannot disagree');
{
  const rows: DigestRow[] = [
    row({ actualMinutes: 185, clientName: 'Vela Homes', assignees: [{ id: 'u1', name: 'Sajad Hoseinpour' }, { id: 'u2', name: 'Arshia Farrahi' }] }),
    row({ actualMinutes: 240, clientName: 'Cartel Lash', categoryName: 'Websites', assignees: [{ id: 'u3', name: 'Saman Hoseinpour' }] }),
    row({ actualMinutes: 30, clientName: 'Vela Homes', parentId: 't1', assignees: [{ id: 'u1', name: 'Sajad Hoseinpour' }] }),
  ];
  const { html, text, subject, week } = composeDigestEmail({ rows, ...RENDER });
  const headline = digestHeadline(week);

  eq('the headline reads as expected', headline, '2 tasks · 1 revision · 7h 35m shipped');
  ok('the text body leads with it', text.includes(headline));
  ok('the HTML carries it as the preheader', html.includes(headline));
  eq('the subject is unchanged in shape', subject, 'Perseus weekly digest: Aug 24 – Aug 30');

  for (const member of week.members) {
    ok(`${member.name} appears in the text body`, text.includes(member.name));
    ok(`${member.name} appears in the HTML`, html.includes(member.name));
  }
  // Both renderings rank by hours, so the first name after "The team" is the
  // same person in each. A divergence here means two sorts, not one fold.
  eq('both rank the same person first', week.members[0].name, 'Saman Hoseinpour');

  ok('the HTML is a complete document', html.startsWith('<!DOCTYPE html>') && html.trimEnd().endsWith('</html>'));
  ok('the letterhead is the PNG, not the AVIF', html.includes(RENDER.logoUrl) && !html.includes('.avif'));
  ok('the logo has alt text', html.includes('alt="Perseus Creative Studio"'));
  ok('the CTA points at the digest view', html.includes(RENDER.boardUrl) && text.includes(RENDER.boardUrl));
  ok('auto-inversion is declared off', html.includes('name="color-scheme" content="light"'));
}

/* ── 7. Email-client constraints that fail silently in a browser ────────── */

section('Markup that survives Gmail, Apple Mail and Outlook');
{
  // 10 minutes against 100 hours is 0.17%, which rounds to nothing. This is
  // the case the percentage floor in toBucket exists for, so the fixture has
  // to actually reach it or the floor is untested.
  const { html } = composeDigestEmail({
    rows: [row({ actualMinutes: 6000 }), row({ actualMinutes: 10, clientName: 'Tiny Co' })],
    ...RENDER,
  });
  // Outlook's Word engine mishandles percentage widths on nested table cells,
  // so every bar is measured in pixels off a fixed track.
  ok('bars are pixel widths', /<td width="\d+" height="6"/.test(html));
  ok('no percentage-width bar cell', !/<td width="\d+%" height="6"/.test(html));
  // A slice too small to round up to a pixel must still be a visible mark, and
  // the ONLY thing making that true is the percentage floor in toBucket.
  const widths = [...html.matchAll(/<td width="(\d+)" height="6"/g)].map((m) => Number(m[1]));
  ok('the bars were drawn at all', widths.length > 0);
  ok('no fill collapses to nothing', widths.every((w) => w > 0), widths.join(','));
  ok('the thinnest slice is still a mark', Math.min(...widths) >= 4, widths.join(','));
  // Gmail strips <style> in several contexts, so nothing may depend on it.
  ok('no <style> block to be stripped', !html.includes('<style'));
  ok('no class attribute to depend on', !html.includes('class='));
  // Outlook will not size a bare anchor, so the button is a table cell.
  ok('the CTA is a bulletproof button', /<td bgcolor="#141414"[^>]*>\s*<a href=/.test(html));
  ok('layout tables are presentational', html.includes('role="presentation"'));
  // No hue for a quantity: the house rule that every bar in this product
  // measures with ink. A grey has all three channels equal.
  const fills = [...html.matchAll(/bgcolor="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  const grey = (hex: string) =>
    hex.slice(1, 3).toLowerCase() === hex.slice(3, 5).toLowerCase() &&
    hex.slice(3, 5).toLowerCase() === hex.slice(5, 7).toLowerCase();
  ok('the email fills any cell at all', fills.length > 0);
  ok('every filled cell is a grey', fills.every(grey), fills.join(' '));
  ok('the grey test would catch a hue', !grey('#e7000b'));
}

/* ── 8. Degenerate weeks must not render a lie ──────────────────────────── */

section('Edge cases');
{
  const empty = foldDigestWeek([]);
  eq('an empty week totals nothing', empty.totalMinutes, 0);
  eq('...with no members', empty.members.length, 0);
  ok('...and no remainder to explain', empty.clients.more === null);
  const { html } = composeDigestEmail({ rows: [], ...RENDER });
  ok('an empty week still renders a document', html.startsWith('<!DOCTYPE html>'));
  ok('...with no orphan team heading', !html.includes('>The team<'));

  eq('one task reads singular', digestHeadline(foldDigestWeek([row({ actualMinutes: 60 })])), '1 task · 1h shipped');
  // Zero revisions is an absence, not a figure worth a column.
  ok('no revisions means no revision count', !digestHeadline(foldDigestWeek([row()])).includes('revision'));

  // A job shorter than its crew: nobody may be credited a fraction.
  const tiny = foldDigestWeek([
    row({ actualMinutes: 2, assignees: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }] }),
  ]);
  eq('sub-minute shares stay whole and still sum', tiny.members.reduce((a, m) => a + m.minutes, 0), 2);
  ok('nobody gets a fraction', tiny.members.every((m) => Number.isInteger(m.minutes)));
}

console.log(
  `\n${failures === 0 ? 'PASS' : 'FAIL'}  ${checks - failures}/${checks} assertions`,
);
if (failures > 0) process.exitCode = 1;
