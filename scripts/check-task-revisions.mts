/**
 * Revision self-check — the deliverable/revision split, and the title
 * normaliser behind the add band's duplicate guard.
 *
 * Run:  node --import tsx scripts/check-task-revisions.mts
 *
 * No DB and no env (the check-task-tags.mts shape). Everything pinned here is
 * a PURE decision, and every one of them is silent when it goes wrong — which
 * is exactly why it needs a script:
 *
 *  - `foldMonthTotals` must count DELIVERABLES and never rows. A revision is a
 *    linked follow-up round on something already delivered; counting it as a
 *    second delivery is what made a client who received one video read "3
 *    tasks delivered" on their report.
 *  - MINUTES must never split. A revision's hours were always real work, so
 *    every total, category and member figure keeps them. The counts are the
 *    only thing that moves. Get this backwards and the studio under-reports
 *    its own delivered hours with nothing on screen to say so.
 *  - Turnaround must SKIP revisions: a 15-minute fix on work that shipped a
 *    fortnight ago has a near-zero span and would drag the median to "same
 *    day" for a month of real projects.
 *  - The normaliser must collapse the markers the studio writes INTO titles
 *    ("(Eslahie)", "V2", a trailing "TH") without merging two genuinely
 *    different deliverables ("MT11 Th Conor 1" vs "… Conor 2").
 */
import {
  foldMonthTotals,
  normalizeTaskTitle,
  titlesLookSame,
  type MonthTaskSlice,
} from '@/lib/taskFields';

let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`,
  );
};

// ── foldMonthTotals: the deliverable/revision split ─────────────────────────

const slice = (
  over: Partial<MonthTaskSlice> & Pick<MonthTaskSlice, 'minutes' | 'parentId'>,
): MonthTaskSlice => ({
  categorySlug: 'video-editing',
  categoryName: 'Video Editing',
  siteCategory: 'production',
  assignees: [{ id: 'u1', name: 'Sajad' }],
  ...over,
});

console.log('\n— foldMonthTotals: counts split, minutes do not —');
{
  // The real August shape: one 6h video, then two rounds of notes on it.
  const rows = [
    slice({ minutes: 360, parentId: null }),
    slice({ minutes: 15, parentId: 'parent-1' }),
    slice({ minutes: 30, parentId: 'parent-1' }),
  ];
  const totals = foldMonthTotals(rows);
  eq_('one deliverable, not three', totals.taskCount, 1);
  eq_('two revisions counted apart', totals.revisionCount, 2);
  eq_('minutes keep every row (360 + 15 + 30)', totals.totalMinutes, 405);
  eq_('category minutes keep every row', totals.byCategory[0].minutes, 405);
  eq_('category tasks count deliverables', totals.byCategory[0].tasks, 1);
  eq_('category revisions counted apart', totals.byCategory[0].revisions, 2);
  eq_('member minutes keep every row', totals.byMember[0].minutes, 405);
  eq_('member tasks count deliverables', totals.byMember[0].tasks, 1);
  eq_('member revisions counted apart', totals.byMember[0].revisions, 2);
  eq_(
    'site-category minutes keep every row',
    totals.bySiteCategory.production,
    405,
  );
}

console.log('\n— a month of nothing but revisions —');
{
  // The trap: zero deliverables must NOT read as zero work. The roster's
  // "did anything happen" test reads taskCount + revisionCount for this.
  const totals = foldMonthTotals([
    slice({ minutes: 45, parentId: 'p' }),
    slice({ minutes: 20, parentId: 'p' }),
  ]);
  eq_('no deliverables', totals.taskCount, 0);
  eq_('but the revisions are counted', totals.revisionCount, 2);
  eq_('and the hours are all there', totals.totalMinutes, 65);
  eq_('the member still has a line', totals.byMember.length, 1);
}

console.log('\n— an ordinary month is unchanged —');
{
  const totals = foldMonthTotals([
    slice({ minutes: 60, parentId: null }),
    slice({ minutes: 90, parentId: null }),
  ]);
  eq_('taskCount still equals the row count', totals.taskCount, 2);
  eq_('no revisions reported', totals.revisionCount, 0);
  eq_('minutes unchanged', totals.totalMinutes, 150);
}

console.log('\n— members and categories keep their own tallies —');
{
  const totals = foldMonthTotals([
    slice({
      minutes: 100,
      parentId: null,
      assignees: [{ id: 'u1', name: 'Sajad' }],
    }),
    slice({
      minutes: 10,
      parentId: 'p1',
      assignees: [{ id: 'u2', name: 'Mehdi' }],
    }),
    slice({
      minutes: 200,
      parentId: null,
      assignees: [{ id: 'u2', name: 'Mehdi' }],
    }),
  ]);
  const mehdi = totals.byMember.find((m) => m.assigneeName === 'Mehdi')!;
  const sajad = totals.byMember.find((m) => m.assigneeName === 'Sajad')!;
  // A revision by one member on ANOTHER member's deliverable lands on the
  // member who did the revision — the work is theirs, the delivery is not.
  eq_('reviser gets the revision', mehdi.revisions, 1);
  eq_('reviser keeps their own deliverable', mehdi.tasks, 1);
  eq_('reviser gets both sets of minutes', mehdi.minutes, 210);
  eq_('the other member is untouched', [sajad.tasks, sajad.revisions], [1, 0]);
}

// ── The title normaliser ────────────────────────────────────────────────────

console.log('\n— normalizeTaskTitle: the studio real titles —');
eq_('strips a correction parenthetical and a trailing TH',
  normalizeTaskTitle('Taurus Bahar Deadlift TH (Eslahie)'), 'taurus bahar deadlift');
eq_('strips a v-suffix',
  normalizeTaskTitle('MT11 Th Ashley Int V2'), 'mt11 ashley int');
eq_('strips a multi-word correction parenthetical',
  normalizeTaskTitle('Samba Academy Alvarez Intro v2 (Eslahie Music)'), 'samba academy alvarez intro');
eq_('collapses punctuation',
  normalizeTaskTitle('Photos MT Connor & Michael'), 'photos mt connor michael');
eq_('keeps a bare deliverable number (not a version)',
  normalizeTaskTitle('MT11 Th Conor 2'), 'mt11 conor 2');
eq_('a title that is only markers normalises to nothing',
  normalizeTaskTitle('V2 (Eslahie)'), '');

console.log('\n— titlesLookSame: matches without over-matching —');
const SAME: [string, string][] = [
  ['Taurus Bahar Deadlift TH (Eslahie)', 'Taurus Bahar Deadlift'],
  ['Belcanto OP 1 (Eslahie)', 'Belcanto OP 1'],
  ['MT11 Th Ashley Int V2', 'MT11 Th Ashley Int'],
  ['Newport House v2', 'Newport House'],
  ['Photos MT Connor & Michael V2', 'Photos MT Connor & Michael'],
  // The plain duplicate-entry case: the same title typed twice.
  ['Taurus Stephen TH', 'Taurus Stephen TH'],
];
for (const [a, b] of SAME) eq_(`same: ${a} ~ ${b}`, titlesLookSame(a, b), true);

const DIFFERENT: [string, string][] = [
  // Numbered siblings are different deliverables, and this is the case the
  // whole "letter-v + digit only" rule exists to protect.
  ['MT11 Th Conor 1', 'MT11 Th Conor 2'],
  // BOTH numbers inside the version range [2-9], so this pair is what
  // actually catches a normaliser that starts stripping bare digits. The
  // 1-vs-2 pair above passes such a mutation by accident, since 1 is out of
  // range — it was doing no work until this line joined it.
  ['MT11 Th Conor 2', 'MT11 Th Conor 3'],
  ['Belcanto OP 2', 'Belcanto OP 3'],
  ['Belcanto OP 1', 'Belcanto OP 2'],
  ['Samba Reels 1', 'Samba Reels 2'],
  // A prefix is NOT a match — two different shoots for one client.
  ['Photos MT Ashley', 'Photos MT Ashley Int'],
  ['Samba Kids Interview', 'Samba Older Player Interview 1'],
];
for (const [a, b] of DIFFERENT) eq_(`different: ${a} ≠ ${b}`, titlesLookSame(a, b), false);

// Two titles that are nothing but markers must not match each other — '' is
// "no useful comparison", never "equal to every other empty one".
eq_('marker-only titles never match', titlesLookSame('V2', '(Eslahie)'), false);
eq_('an empty title never matches', titlesLookSame('', 'Anything'), false);

console.log(
  fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`,
);
process.exit(fails === 0 ? 0 : 1);
