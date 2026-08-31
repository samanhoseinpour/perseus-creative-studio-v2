import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  splitMinutesAcross,
} from '@/lib/taskFields';

/**
 * The weekly digest's one composer: last week's rows in, a whole email out.
 *
 * ── WHY THIS MODULE EXISTS ──────────────────────────────────────────────────
 *
 * The digest used to be built inline in the cron, and it printed EVERY task:
 * the Aug 24 to Aug 30 send was 158 lines over five screens. That is not a
 * digest, it is the board pasted into an inbox, and the dashboard renders the
 * same rows better than an email ever can (faces, links, nested revisions,
 * tags). Meanwhile the three questions a Monday letter should answer were all
 * missing: which clients the week went to, what shape of work it was, and who
 * carried it.
 *
 * So the email leads with rollups, gives each member their biggest few items,
 * and links out for the rest. What it must never do is imply it showed you
 * everything, which is why every cap here states its remainder.
 *
 * ── GUARD-FREE ON PURPOSE ───────────────────────────────────────────────────
 *
 * No `server-only`, and `DigestRow` is a structural subset of TaskBoardRow
 * rather than an import of it, so scripts/check-digest-email.mts can pin the
 * REAL folds against hand-built fixtures instead of a copy that drifts. Same
 * reasoning as src/db/taskPredicates.ts. It follows that this module may not
 * grow a database read or an env lookup.
 *
 * ── FOUR COUNTING RULES, ALL SILENT WHEN BROKEN ─────────────────────────────
 *
 *  1. COUNTS SPLIT, MINUTES NEVER. A revision (`parentId !== null`) is a round
 *     of notes, not a second delivery, so it is counted apart. Its hours were
 *     always real work and stay in every total.
 *  2. COUNTS DO NOT SPLIT ACROSS PEOPLE, MINUTES DO. A 3h shoot two people went
 *     on is 3h studio-wide, apportioned by `splitMinutesAcross` (largest
 *     remainder, so 185 across two is [93, 92]); each of them is credited the
 *     whole delivery. Rounding the halves independently gives 186 and the
 *     member rows stop summing to the headline above them.
 *  3. A CLIENT AND A CATEGORY TAKE THE WHOLE JOB, COUNTED ONCE. They are not
 *     split: a client is owed the entire shoot however many people attended.
 *     So the client column and the category column each sum to the studio
 *     total, while the member column reaches it by a different route.
 *  4. A CAP STATES ITS REMAINDER, WITH THE HOURS. Visible rows plus the "+ N
 *     more" line still equal the bucket above them (the foldLineCap rule from
 *     spendFields.ts). On a page of hours a silent truncation is an arithmetic
 *     error, not a display one.
 *
 * ── ONE FOLD, TWO RENDERINGS ────────────────────────────────────────────────
 *
 * `composeDigestEmail` folds once and renders both halves from that result, so
 * the HTML and its plain-text twin are structurally incapable of quoting
 * different figures. See the multipart note in src/lib/mail.ts.
 */

/**
 * The shape the fold needs. TaskBoardRow already satisfies it structurally, so
 * the cron passes `listRecentDone` straight through with no mapping.
 */
export type DigestRow = {
  id: string;
  title: string;
  clientName: string | null;
  categoryName: string;
  assignees: { id: string | null; name: string }[];
  estimatedMinutes: number;
  actualMinutes: number | null;
  parentId: string | null;
};

/** Clients named before the rest fold into one line. Past a handful the
 *  section stops being a ranking and becomes the roster. */
export const DIGEST_CLIENT_CAP = 6;
/** Task categories, not the five site ones: the board carries Video Editing,
 *  Website Development, SEO, Videography, Photo Editing and more, so this cap
 *  really does bite and really does need its remainder line. */
export const DIGEST_CATEGORY_CAP = 5;
/** Items named under a member. Four keeps a 61-task week readable while still
 *  showing what the person actually spent the week on. */
export const DIGEST_MEMBER_ITEM_CAP = 4;

/** What a cap hid. Never null when anything was hidden, and never rendered
 *  without its minutes: the whole point is that the visible rows plus this
 *  still reconcile with the total above them. */
export type DigestRemainder = { count: number; minutes: number };

export type DigestBar = {
  label: string;
  minutes: number;
  tasks: number;
  /** Share of the studio's whole week, floored at 2 so a thin slice stays
   *  visible. Scaled to the TOTAL and not to the biggest bar, matching the
   *  in-app month wrap-up so the two surfaces draw one picture. */
  pct: number;
};

export type DigestBucket = { bars: DigestBar[]; more: DigestRemainder | null };

export type DigestItem = {
  title: string;
  clientLabel: string;
  /** This member's share. */
  minutes: number;
  /** The whole job, when more than one person worked it. A 3h shoot reading
   *  "1h 30m" and nothing else looks like the hours were logged wrong. */
  sharedTotal: number | null;
  revision: boolean;
};

export type DigestMember = {
  key: string;
  name: string;
  minutes: number;
  deliverables: number;
  revisions: number;
  items: DigestItem[];
  more: DigestRemainder | null;
};

export type DigestWeek = {
  /**
   * Rows with no parent. NOT called `delivered`, which since the done →
   * delivered → posted ladder names one STATUS rather than the whole shipped
   * set this reader spans. The email's own wording follows the same rule and
   * says "shipped".
   */
  deliverables: number;
  revisions: number;
  totalMinutes: number;
  clients: DigestBucket;
  categories: DigestBucket;
  members: DigestMember[];
};

type Tally = { minutes: number; tasks: number };

function bump(map: Map<string, Tally>, label: string, minutes: number): void {
  const entry = map.get(label);
  if (entry) {
    entry.minutes += minutes;
    entry.tasks += 1;
  } else {
    map.set(label, { minutes, tasks: 1 });
  }
}

/** Rank, cap, and account for what the cap hid. */
function toBucket(
  map: Map<string, Tally>,
  total: number,
  cap: number,
): DigestBucket {
  const ranked = [...map.entries()].sort(
    (a, b) => b[1].minutes - a[1].minutes || a[0].localeCompare(b[0]),
  );
  const shown = ranked.slice(0, cap);
  const hidden = ranked.slice(cap);
  return {
    bars: shown.map(([label, tally]) => ({
      label,
      minutes: tally.minutes,
      tasks: tally.tasks,
      pct: total === 0 ? 0 : Math.max(2, Math.round((tally.minutes / total) * 100)),
    })),
    more:
      hidden.length === 0
        ? null
        : {
            count: hidden.length,
            minutes: hidden.reduce((sum, [, t]) => sum + t.minutes, 0),
          },
  };
}

/**
 * Rows to figures. Pure, and the only place the four counting rules live.
 */
export function foldDigestWeek(rows: DigestRow[]): DigestWeek {
  let deliverables = 0;
  let revisions = 0;
  let totalMinutes = 0;
  const clients = new Map<string, Tally>();
  const categories = new Map<string, Tally>();
  const members = new Map<string, DigestMember>();

  for (const row of rows) {
    const minutes = row.actualMinutes ?? row.estimatedMinutes;
    const revision = row.parentId !== null;
    totalMinutes += minutes;
    if (revision) revisions += 1;
    else deliverables += 1;

    // Rule 3: whole minutes, counted once. Null client is the studio's own
    // work, labelled exactly as the board labels it.
    bump(clients, row.clientName ?? INTERNAL_CLIENT_LABEL, minutes);
    bump(categories, row.categoryName, minutes);

    // Rule 2: the row is listed under everyone who worked it, with the minutes
    // apportioned so the member rows still add up to the headline.
    const shares = splitMinutesAcross(minutes, row.assignees.length);
    row.assignees.forEach((who, i) => {
      const key = who.id ?? `name:${who.name}`;
      let member = members.get(key);
      if (!member) {
        member = {
          key,
          name: who.name,
          minutes: 0,
          deliverables: 0,
          revisions: 0,
          items: [],
          more: null,
        };
        members.set(key, member);
      }
      member.minutes += shares[i];
      if (revision) member.revisions += 1;
      else member.deliverables += 1;
      member.items.push({
        title: row.title,
        clientLabel: row.clientName ?? INTERNAL_CLIENT_LABEL,
        minutes: shares[i],
        sharedTotal: row.assignees.length > 1 ? minutes : null,
        revision,
      });
    });
  }

  const memberList = [...members.values()].sort((a, b) => b.minutes - a.minutes);
  for (const member of memberList) {
    member.items.sort(
      (a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title),
    );
    const hidden = member.items.slice(DIGEST_MEMBER_ITEM_CAP);
    if (hidden.length > 0) {
      member.more = {
        count: hidden.length,
        // The hidden items' OWN shares, so the four shown plus this line equal
        // the member's total exactly.
        minutes: hidden.reduce((sum, item) => sum + item.minutes, 0),
      };
      member.items = member.items.slice(0, DIGEST_MEMBER_ITEM_CAP);
    }
  }

  return {
    deliverables,
    revisions,
    totalMinutes,
    clients: toBucket(clients, totalMinutes, DIGEST_CLIENT_CAP),
    categories: toBucket(categories, totalMinutes, DIGEST_CATEGORY_CAP),
    members: memberList,
  };
}

/* ────────────────────────────── shared copy ────────────────────────────── */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** "158 tasks · 5 revisions · 253h 1m delivered". The preheader, the text
 *  body's second line and the HTML stat row all read from this one place. */
export function digestHeadline(week: DigestWeek): string {
  return [
    plural(week.deliverables, 'task', 'tasks'),
    week.revisions > 0 ? plural(week.revisions, 'revision', 'revisions') : null,
    `${formatMinutes(week.totalMinutes)} shipped`,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
}

const memberMeta = (member: DigestMember) =>
  [
    plural(member.deliverables, 'task', 'tasks'),
    member.revisions > 0
      ? plural(member.revisions, 'revision', 'revisions')
      : null,
    formatMinutes(member.minutes),
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

const itemHours = (item: DigestItem) =>
  item.sharedTotal === null
    ? formatMinutes(item.minutes)
    : `${formatMinutes(item.minutes)} of ${formatMinutes(item.sharedTotal)}`;

/* ─────────────────────────────── plain text ────────────────────────────── */

/**
 * The multipart fallback, and a real reading in its own right. Same order and
 * the same figures as the HTML, because both come from one fold.
 */
export function renderDigestText(
  week: DigestWeek,
  { rangeLabel, boardUrl }: { rangeLabel: string; boardUrl: string },
): string {
  const lines: string[] = [
    `Perseus weekly digest: ${rangeLabel}`,
    '',
    digestHeadline(week),
  ];

  const bucket = (title: string, data: DigestBucket, noun: string) => {
    if (data.bars.length === 0) return;
    lines.push('', title);
    for (const bar of data.bars) {
      lines.push(`  ${bar.label} · ${formatMinutes(bar.minutes)}`);
    }
    if (data.more) {
      lines.push(
        `  + ${data.more.count} more ${noun} · ${formatMinutes(data.more.minutes)}`,
      );
    }
  };

  bucket('WHERE THE WEEK WENT', week.clients, 'clients');
  bucket('WHAT KIND OF WORK', week.categories, 'categories');

  if (week.members.length > 0) lines.push('', 'THE TEAM');
  for (const member of week.members) {
    lines.push('', `${member.name}: ${memberMeta(member)}`);
    for (const item of member.items) {
      lines.push(
        `  ${item.revision ? '↳ revision:' : '•'} ${item.title} · ${item.clientLabel} · ${itemHours(item)}`,
      );
    }
    if (member.more) {
      lines.push(
        `  + ${member.more.count} more · ${formatMinutes(member.more.minutes)}`,
      );
    }
  }

  lines.push('', `Open the dashboard: ${boardUrl}`);
  return lines.join('\n');
}

/* ─────────────────────────────────  HTML  ──────────────────────────────── */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * NOT a formatting nicety. Task titles and client names are member-typed free
 * text going into an HTML document, and last week's real board already carried
 * both hazards: "Cartel Lash & Supply Co" and the title
 * `fix: put the "Get 10% off" tab back on mobile`. Unescaped, the first breaks
 * an entity and the second closes an attribute.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** The house ink ramp, darkest first. Email cannot express
 *  `bg-foreground/[0.08]`, so the opacity ladder becomes literal greys; a hue
 *  would break the rule that every bar in this product measures with ink. */
export const DIGEST_BAR_INKS = [
  '#141414',
  '#3d3d3d',
  '#666666',
  '#8f8f8f',
  '#b8b8b8',
] as const;

const BAR_TRACK_PX = 176;
const TRACK_INK = '#ececec';

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = '#141414';
const MUTED = '#737373';
const FAINT = '#8f8f8f';

const CAPS = `font:600 10px/1.4 ${FONT};letter-spacing:.16em;text-transform:uppercase;color:${MUTED};`;

/**
 * Outlook's Word engine mishandles percentage widths on nested table cells, so
 * every bar is measured in pixels off a fixed track.
 *
 * There is deliberately NO minimum here. `toBucket` already floors `pct` at 2,
 * which is 4px on this track, so a second floor could never fire and would
 * only read as a guarantee that was really coming from somewhere else. The
 * link between the two is what scripts/check-digest-email.mts pins.
 */
function barCells(pct: number, ink: string): string {
  const fill = Math.min(BAR_TRACK_PX, Math.round((pct / 100) * BAR_TRACK_PX));
  const rest = BAR_TRACK_PX - fill;
  const cell = (width: number, colour: string) =>
    `<td width="${width}" height="6" bgcolor="${colour}" style="width:${width}px;height:6px;background:${colour};font-size:0;line-height:0;">&nbsp;</td>`;
  return cell(fill, ink) + (rest > 0 ? cell(rest, TRACK_INK) : '');
}

function barRow(bar: DigestBar, index: number): string {
  return `<tr>
<td style="padding:6px 0;font:400 13px/1.45 ${FONT};color:${INK};">${escapeHtml(bar.label)}</td>
<td width="${BAR_TRACK_PX + 14}" style="padding:6px 0 6px 14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${BAR_TRACK_PX}" style="width:${BAR_TRACK_PX}px;border-radius:3px;"><tr>${barCells(bar.pct, DIGEST_BAR_INKS[Math.min(index, DIGEST_BAR_INKS.length - 1)])}</tr></table>
</td>
<td width="70" align="right" style="padding:6px 0 6px 12px;font:400 12px/1.45 ${FONT};color:${MUTED};white-space:nowrap;">${escapeHtml(formatMinutes(bar.minutes))}</td>
</tr>`;
}

function moreRow(more: DigestRemainder, noun: string): string {
  return `<tr>
<td colspan="2" style="padding:6px 0 0;font:400 12px/1.45 ${FONT};color:${FAINT};">+ ${more.count} more ${escapeHtml(noun)}</td>
<td align="right" style="padding:6px 0 0 12px;font:400 12px/1.45 ${FONT};color:${FAINT};white-space:nowrap;">${escapeHtml(formatMinutes(more.minutes))}</td>
</tr>`;
}

function bucketSection(
  title: string,
  bucket: DigestBucket,
  noun: string,
): string {
  if (bucket.bars.length === 0) return '';
  return `<tr><td style="padding:22px 32px 0;">
<div style="${CAPS}">${title}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
${bucket.bars.map(barRow).join('\n')}
${bucket.more ? moreRow(bucket.more, noun) : ''}
</table>
</td></tr>`;
}

function itemRow(item: DigestItem): string {
  const title = `${item.revision ? '&#8629; ' : ''}${escapeHtml(item.title)}`;
  return `<tr>
<td style="padding:3px 0;font:400 13px/1.5 ${FONT};color:${item.revision ? MUTED : INK};">${title}<span style="color:${FAINT};"> &#183; ${escapeHtml(item.clientLabel)}</span></td>
<td width="82" align="right" style="padding:3px 0 3px 12px;font:400 12px/1.5 ${FONT};color:${FAINT};white-space:nowrap;">${escapeHtml(itemHours(item))}</td>
</tr>`;
}

function memberSection(member: DigestMember): string {
  return `<tr><td style="padding:18px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font:600 14px/1.4 ${FONT};color:${INK};">${escapeHtml(member.name)}</td>
<td align="right" style="padding-left:12px;font:400 12px/1.4 ${FONT};color:${MUTED};white-space:nowrap;">${escapeHtml(memberMeta(member))}</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:5px;">
${member.items.map(itemRow).join('\n')}
${
  member.more
    ? `<tr><td style="padding:4px 0 0;font:400 12px/1.5 ${FONT};color:${FAINT};">+ ${member.more.count} more</td><td align="right" style="padding:4px 0 0 12px;font:400 12px/1.5 ${FONT};color:${FAINT};white-space:nowrap;">${escapeHtml(formatMinutes(member.more.minutes))}</td></tr>`
    : ''
}
</table>
</td></tr>`;
}

function statCells(week: DigestWeek): string {
  const stats: { value: string; label: string }[] = [
    { value: String(week.deliverables), label: week.deliverables === 1 ? 'task' : 'tasks' },
    ...(week.revisions > 0
      ? [
          {
            value: String(week.revisions),
            label: week.revisions === 1 ? 'revision' : 'revisions',
          },
        ]
      : []),
    { value: formatMinutes(week.totalMinutes), label: 'shipped' },
  ];
  const width = Math.floor(100 / stats.length);
  return stats
    .map(
      (stat) => `<td width="${width}%" valign="top" style="padding:0 8px 0 0;">
<div style="font:600 26px/1.1 ${FONT};color:${INK};">${escapeHtml(stat.value)}</div>
<div style="margin-top:4px;font:400 12px/1.4 ${FONT};color:${MUTED};">${stat.label}</div>
</td>`,
    )
    .join('\n');
}

/**
 * The letterhead rendering.
 *
 * Tables and inline styles throughout, because Gmail strips `<style>` in
 * several contexts. `color-scheme: light` stops Apple Mail and Outlook.com
 * auto-inverting; Gmail inverts regardless, which the near-black band survives.
 * Member faces are deliberately absent: avatars stream through the
 * authenticated /admin/avatars route, so no mail client could fetch one.
 */
export function renderDigestHtml(
  week: DigestWeek,
  {
    rangeLabel,
    boardUrl,
    logoUrl,
  }: { rangeLabel: string; boardUrl: string; logoUrl: string },
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Perseus weekly digest: ${escapeHtml(rangeLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(digestHeadline(week))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:24px 12px 32px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;">

<tr><td bgcolor="${INK}" style="background:${INK};padding:28px 32px;border-radius:14px 14px 0 0;">
<img src="${logoUrl}" width="176" height="60" alt="Perseus Creative Studio" style="display:block;border:0;outline:none;text-decoration:none;width:176px;height:60px;">
<div style="margin-top:16px;font:600 10px/1.4 ${FONT};letter-spacing:.16em;text-transform:uppercase;color:${FAINT};">Weekly digest</div>
<div style="margin-top:6px;font:600 19px/1.3 ${FONT};color:#ffffff;">${escapeHtml(rangeLabel)}</div>
</td></tr>

<tr><td style="padding:24px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${statCells(week)}
</tr></table>
</td></tr>

${bucketSection('Where the week went', week.clients, 'clients')}
${bucketSection('What kind of work', week.categories, 'categories')}

${
  week.members.length > 0
    ? `<tr><td style="padding:24px 32px 0;"><div style="${CAPS}">The team</div></td></tr>
${week.members.map(memberSection).join('\n')}`
    : ''
}

<tr><td align="center" style="padding:28px 32px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${INK}" style="background:${INK};border-radius:8px;">
<a href="${boardUrl}" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${FONT};color:#ffffff;text-decoration:none;">Open the dashboard</a>
</td>
</tr></table>
</td></tr>

</table>

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
<tr><td align="center" style="padding:18px 12px 0;border-top:0;font:400 11px/1.7 ${FONT};color:${FAINT};">
Perseus Creative Studio &#183; Vancouver<br>
You get this because you hold the Tasks area.
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

/* ────────────────────────────── the one door ───────────────────────────── */

/**
 * Fold once, render twice. A caller cannot produce a text body and an HTML body
 * that disagree, because there is only one pass over the rows.
 */
export function composeDigestEmail({
  rows,
  rangeLabel,
  boardUrl,
  logoUrl,
}: {
  rows: DigestRow[];
  rangeLabel: string;
  boardUrl: string;
  logoUrl: string;
}): { subject: string; text: string; html: string; week: DigestWeek } {
  const week = foldDigestWeek(rows);
  return {
    // Unchanged wording on purpose: Gmail threads by subject, so rephrasing it
    // would split the digest away from every previous week.
    subject: `Perseus weekly digest: ${rangeLabel}`,
    text: renderDigestText(week, { rangeLabel, boardUrl }),
    html: renderDigestHtml(week, { rangeLabel, boardUrl, logoUrl }),
    week,
  };
}
