/**
 * Render the weekly digest email for a real week, without waiting for Monday.
 *
 * Run:  node --dns-result-order=ipv4first --conditions=react-server \
 *         --env-file=.env.local --import tsx scripts/preview-digest-email.mts \
 *         [--weeks N] [--out FILE] [--send you@example.com]
 *
 * Keep --dns-result-order=ipv4first, for the reason npm run psi keeps it: the
 * Neon HTTP endpoint stalls on IPv6 from some networks and the read dies with a
 * bare "fetch failed" / ConnectTimeoutError that looks like a bad DATABASE_URL.
 *
 * The --conditions=react-server flag is LOAD-BEARING, for the same reason
 * scripts/check-releases.mts needs it: src/db/taskQueries.ts and src/lib/mail.ts
 * both carry `import 'server-only'`, whose package.json maps that condition to
 * an empty module and `default` to a bare throw. Without it this dies with
 * "cannot be imported from a Client Component module", and the obvious-but-wrong
 * fix is to strip the guard off the reader.
 *
 * It reads through the REAL reader the cron uses, so what you see is what will
 * be sent. It is READ ONLY against the database, and it writes nothing anywhere
 * unless you pass --send, which posts one genuine message through Resend.
 *
 * Why this exists at all: no amount of local rendering tells you what Gmail
 * does to the markup. --send to yourself, then open it on the desktop and on a
 * phone, in light mode and in dark, before shipping a change to the template.
 */

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SITE_URL } from '@/constants';
import { listRecentDone } from '@/db/taskQueries';
import { composeDigestEmail } from '@/lib/digestEmail';
import { formatMinutes } from '@/lib/taskFields';
import { dayKeyIn, dayStartIn, shiftDayKey, STUDIO_TZ } from '@/lib/calendar';

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};

const weeksBack = Math.max(1, Number(flag('--weeks') ?? 1));
const sendTo = flag('--send');
const outFile =
  flag('--out') ?? path.join(tmpdir(), 'perseus-digest-preview.html');

const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const labelKey = (key: string) => DAY_LABEL.format(new Date(`${key}T00:00:00Z`));

async function main() {
  // The cron's own window maths, so the preview covers exactly the week the
  // next real send would.
  const todayKey = dayKeyIn(STUDIO_TZ, new Date());
  const dow = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
  const thisMonday = shiftDayKey(todayKey, -((dow + 6) % 7));
  const weekEnd = shiftDayKey(thisMonday, -7 * (weeksBack - 1));
  const weekStart = shiftDayKey(weekEnd, -7);

  const rows = await listRecentDone({
    since: dayStartIn(STUDIO_TZ, weekStart),
    until: dayStartIn(STUDIO_TZ, weekEnd),
    limit: 500,
  });

  const rangeLabel = `${labelKey(weekStart)} – ${labelKey(shiftDayKey(weekEnd, -1))}`;
  const { subject, text, html, week } = composeDigestEmail({
    rows,
    rangeLabel,
    boardUrl: `${SITE_URL}/admin/tasks?view=digest`,
    logoUrl: `${SITE_URL}/perseus-wordmark-email.png`,
  });

  console.log(`\n${subject}`);
  console.log(`${rows.length} rows read from ${weekStart} to ${weekEnd}\n`);
  if (rows.length === 0) {
    console.log('Nothing completed in that week. Try --weeks 2.');
  }
  console.log(
    `  ${week.deliverables} shipped · ${week.revisions} revisions · ${formatMinutes(week.totalMinutes)}`,
  );
  console.log(
    `  ${week.clients.bars.length} clients shown${week.clients.more ? ` (+${week.clients.more.count} folded, ${formatMinutes(week.clients.more.minutes)})` : ''}`,
  );
  console.log(`  ${week.members.length} members`);
  for (const member of week.members) {
    console.log(
      `    ${member.name}: ${member.deliverables}+${member.revisions} · ${formatMinutes(member.minutes)}` +
        `${member.more ? ` · ${member.more.count} folded` : ''}`,
    );
  }

  // The arithmetic the check script pins, re-run against REAL rows: three
  // independent routes to one figure. A fixture can miss a shape the live
  // board has; this cannot.
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
  const routes = {
    members: sum(week.members.map((m) => m.minutes)),
    clients:
      sum(week.clients.bars.map((b) => b.minutes)) +
      (week.clients.more?.minutes ?? 0),
    categories:
      sum(week.categories.bars.map((b) => b.minutes)) +
      (week.categories.more?.minutes ?? 0),
  };
  const agree = Object.values(routes).every((n) => n === week.totalMinutes);
  console.log(
    `\n  reconciliation: ${agree ? 'OK' : 'MISMATCH'} ` +
      `(total ${week.totalMinutes} | members ${routes.members} | clients ${routes.clients} | categories ${routes.categories})`,
  );
  if (!agree) process.exitCode = 1;

  writeFileSync(outFile, html, 'utf8');
  console.log(`\n  html  ${outFile}  (${(html.length / 1024).toFixed(1)} KB)`);
  writeFileSync(`${outFile}.txt`, text, 'utf8');
  console.log(`  text  ${outFile}.txt  (${text.split('\n').length} lines)`);
  console.log(`\n  open ${outFile}`);

  if (sendTo) {
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: sendTo, subject, text, html });
    console.log(`\n  sent to ${sendTo}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
