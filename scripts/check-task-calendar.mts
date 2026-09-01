/**
 * The calendar self-check. No DB, no env, no browser.
 *
 * A month grid is the one task surface where being wrong still looks right:
 * every cell renders a number and a handful of chips whatever the folds do, so
 * a task placed on the wrong day, dropped entirely, or truncated without
 * saying so is invisible unless you go and count. These are the folds behind
 * it, pinned.
 *
 * Run after touching src/lib/taskCalendar.ts, monthGridKeys/weekdayOfDayKey in
 * src/lib/calendar.ts, or the calendar branches in taskFilters.ts.
 *
 *   node --import tsx scripts/check-task-calendar.mts
 */
import {
  DAY_KEY_RE,
  daysBetweenDayKeys,
  monthFirstKey,
  monthGridKeys,
  shiftDayKey,
  shiftMonthToken,
  weekdayOfDayKey,
} from '@/lib/calendar';
import {
  CALENDAR_CELL_CHIPS,
  CALENDAR_FIELD_PHRASE,
  CALENDAR_FIELD_VERB,
  calendarMinutes,
  dayKeyForField,
  foldCellChips,
  foldDayCells,
  rankCellTasks,
  type CalendarTaskLike,
} from '@/lib/taskCalendar';
import {
  TASK_MONTH_ALL,
  calendarDateWindow,
  calendarTabsFor,
  coerceTaskViewIn,
  isTaskDateField,
  parseTaskListParams,
  parseTaskMonth,
  taskListQs,
  TASK_VIEW_STATUSES,
  taskScopeQs,
  type TaskDateField,
} from '@/lib/taskFilters';


let fails = 0;
const eq_ = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : `  want=${JSON.stringify(want)}`}`,
  );
};
const ok_ = (label: string, got: boolean) => eq_(label, got, true);

const VAN = 'America/Vancouver';
const TEH = 'Asia/Tehran';

/** The five fields, listed so the sweeps below are exhaustive. Guarded by the
 *  parser rather than trusted: a sixth field added to the union without being
 *  added here fails the last assertion in this block. */
const FIELDS: TaskDateField[] = [
  'date',
  'due',
  'start',
  'completed',
  'created',
];

let seq = 0;
const row = (over: Partial<CalendarTaskLike> = {}): CalendarTaskLike => ({
  id: `t${String(++seq).padStart(3, '0')}`,
  title: 'Task',
  status: 'todo',
  priority: null,
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdAt: new Date('2026-08-10T12:00:00.000Z'),
  estimatedMinutes: 60,
  actualMinutes: null,
  ...over,
});

// ── Placement: dayKeyForField must mirror tasksWhere ────────────────────────

console.log('\n— placement mirrors the SQL clause for each field —');
{
  FIELDS.forEach((f) => ok_(`${f} is a real field`, isTaskDateField(f)));
  ok_('and an invented one is not', !isTaskDateField('shipped'));

  // The whole reason the composite field exists: quick-add's default task
  // shape is start-only, so a due-only placement would leave the board's most
  // common row off the grid entirely.
  const startOnly = row({ startDate: '2026-08-04' });
  eq_('date places a start-only task on its start',
    dayKeyForField(startOnly, 'date', VAN), '2026-08-04');
  eq_('due places it nowhere', dayKeyForField(startOnly, 'due', VAN), '');
  eq_('start places it on its start',
    dayKeyForField(startOnly, 'start', VAN), '2026-08-04');

  // coalesce(due_date, start_date) — DUE wins. Reversing the two arms puts
  // every scheduled task on the day work began instead of the day it is owed,
  // which still draws a full, plausible grid.
  const both = row({ startDate: '2026-08-03', dueDate: '2026-08-07' });
  eq_('date places a two-date task on its DUE date, not its start',
    dayKeyForField(both, 'date', VAN), '2026-08-07');
  eq_('start still reads the start column',
    dayKeyForField(both, 'start', VAN), '2026-08-03');

  eq_('a dateless task is placed nowhere by the composite field',
    dayKeyForField(row(), 'date', VAN), '');
  eq_('an unfinished task is placed nowhere by completed',
    dayKeyForField(row({ startDate: '2026-08-04' }), 'completed', VAN), '');

  // The two timestamptz columns are INSTANTS, so the day depends on who is
  // reading. Same edge instant check-calendar.mts uses.
  const edge = new Date('2026-08-31T22:15:00.000Z');
  const done = row({ status: 'done', completedAt: edge, createdAt: edge });
  eq_('a completion instant is Aug 31 for a Vancouver reader',
    dayKeyForField(done, 'completed', VAN), '2026-08-31');
  eq_('...and Sep 1 for a Tehran reader at the same instant',
    dayKeyForField(done, 'completed', TEH), '2026-09-01');
  eq_('created follows the same clock',
    dayKeyForField(done, 'created', TEH), '2026-09-01');
  ok_('the two readers disagree, which is the contract',
    dayKeyForField(done, 'completed', VAN) !==
      dayKeyForField(done, 'completed', TEH));

  // The date columns are calendar KEYS, so they must NOT move with the reader.
  ok_('a due date is the same day in both zones',
    dayKeyForField(both, 'due', VAN) === dayKeyForField(both, 'due', TEH));
}

// ── The fold: every row lands in exactly one cell ───────────────────────────

console.log('\n— the fold places every windowed row exactly once —');
{
  const rows: CalendarTaskLike[] = [
    row({ startDate: '2026-08-04', estimatedMinutes: 90 }),
    row({ startDate: '2026-08-04', dueDate: '2026-08-04', estimatedMinutes: 30 }),
    row({ dueDate: '2026-08-05', estimatedMinutes: 120, actualMinutes: 100 }),
    row({ startDate: '2026-08-01', dueDate: '2026-08-31', estimatedMinutes: 45 }),
    row({ startDate: '2026-08-20', estimatedMinutes: 15 }),
  ];
  const cells = foldDayCells(rows, 'date', VAN, '2026-08-10');
  const placed = [...cells.values()].flatMap((c) => c.rows.map((r) => r.id));

  eq_('every row is placed', placed.length, rows.length);
  eq_('and no row is placed twice', new Set(placed).size, rows.length);
  eq_('the union is exactly the input',
    [...placed].sort(), rows.map((r) => r.id).sort());

  const minutes = [...cells.values()].reduce((n, c) => n + c.minutes, 0);
  eq_('the day minutes sum to the month',
    minutes, rows.reduce((n, r) => n + calendarMinutes(r), 0));
  eq_('and a confirmed figure beats the estimate',
    calendarMinutes(rows[2]), 100);

  // A span task is ONE point, on its due date. Point semantics, deliberately:
  // 8 of 693 rows on the real board have a due date later than their start.
  eq_('a task spanning the month occupies its due day only',
    cells.get('2026-08-31')?.rows.map((r) => r.id), [rows[3].id]);
  eq_('and nothing sits on the day it started',
    cells.get('2026-08-01'), undefined);

  // Rows with no date for this field are DROPPED, not pooled. There is no
  // off-grid bucket to render, and a windowed read never produces one.
  const mixed = foldDayCells([...rows, row()], 'date', VAN, '2026-08-10');
  eq_('a dateless row folds into no cell at all',
    [...mixed.values()].reduce((n, c) => n + c.rows.length, 0), rows.length);

  // Whatever a windowed row folds to has to be a cell the grid actually draws.
  const grid = new Set(monthGridKeys('2026-08'));
  ok_('every folded key is on the month grid',
    [...cells.keys()].every((k) => grid.has(k)));
}

// ── Ranking: which chips survive the cap ────────────────────────────────────

console.log('\n— the cell ranks by urgency, then priority, deterministically —');
{
  const today = '2026-08-10';
  const late = row({ id: 'late', title: 'Late', dueDate: '2026-08-01' });
  const now_ = row({ id: 'now', title: 'Today', dueDate: today });
  const high = row({ id: 'high', title: 'High', priority: 'high', dueDate: '2026-08-20' });
  const med = row({ id: 'med', title: 'Med', priority: 'medium', dueDate: '2026-08-20' });
  const low = row({ id: 'low', title: 'Low', priority: 'low', dueDate: '2026-08-20' });
  const none = row({ id: 'none', title: 'None', dueDate: '2026-08-20' });
  const want = ['late', 'now', 'high', 'med', 'low', 'none'];

  eq_('urgency first, then priority',
    rankCellTasks([none, low, med, high, now_, late], today).map((r) => r.id),
    want);
  eq_('and the answer does not depend on input order',
    rankCellTasks([high, late, none, now_, low, med], today).map((r) => r.id),
    want);

  // Overdue is strictly DUE-based, exactly as toRowData's tint is: a
  // start-only task is ongoing, never late.
  //
  // Both titles here sort BEFORE 'Late' on purpose. With an alphabetical
  // tiebreak, a row that wrongly ranks as overdue ties with the real one and
  // then wins on title, so the assertion fails; give it a later title and the
  // right answer comes out for the wrong reason and the check is vacuous.
  // (Found by mutation testing: it was vacuous.)
  const started = row({ id: 'st', title: 'Aaa started', startDate: '2026-08-01' });
  eq_('a start-only task is never ranked overdue',
    rankCellTasks([started, late], today).map((r) => r.id), ['late', 'st']);

  // A shipped row cannot be overdue either: it met or missed its deadline
  // already, and the grid says so with ink rather than rose.
  const shippedLate = row({
    id: 'sh', title: 'Aaa shipped', status: 'delivered', dueDate: '2026-08-01',
  });
  eq_('a shipped task past its due date is not ranked overdue',
    rankCellTasks([shippedLate, late], today).map((r) => r.id), ['late', 'sh']);

  const a = row({ id: 'zz', title: 'Alpha' });
  const b = row({ id: 'aa', title: 'Beta' });
  eq_('ties break on title before id',
    rankCellTasks([b, a], today).map((r) => r.id), ['zz', 'aa']);
  const c1 = row({ id: 'b1', title: 'Same' });
  const c2 = row({ id: 'a1', title: 'Same' });
  eq_('and on id when the titles match',
    rankCellTasks([c1, c2], today).map((r) => r.id), ['a1', 'b1']);
}

// ── The cap reconciles ──────────────────────────────────────────────────────

console.log('\n— a capped cell still adds up to its header —');
{
  const many = Array.from({ length: 49 }, (_, i) =>
    row({ id: `x${i}`, title: `Task ${i}` }),
  );
  for (let n = 0; n <= 49; n++) {
    const { shown, hidden } = foldCellChips(many.slice(0, n));
    if (shown.length + hidden !== n) {
      eq_(`visible + hidden reconciles at n=${n}`, shown.length + hidden, n);
      break;
    }
    if (n === 49) ok_('visible + hidden reconciles at every size 0..49', true);
  }
  eq_('a full cell folds nothing',
    foldCellChips(many.slice(0, CALENDAR_CELL_CHIPS)).hidden, 0);
  // One hidden row costs a whole line to announce, and that line is as tall as
  // the chip it replaced. Showing it is both shorter and more useful.
  eq_('one over the cap is shown rather than announced',
    foldCellChips(many.slice(0, CALENDAR_CELL_CHIPS + 1)).hidden, 0);
  eq_('two over the cap folds both',
    foldCellChips(many.slice(0, CALENDAR_CELL_CHIPS + 2)).hidden, 2);
  eq_('and shows exactly the cap',
    foldCellChips(many.slice(0, CALENDAR_CELL_CHIPS + 2)).shown.length,
    CALENDAR_CELL_CHIPS);
  eq_('a 49-task day announces 44 of them',
    foldCellChips(many).hidden, 49 - CALENDAR_CELL_CHIPS);
}

// ── The grid itself ─────────────────────────────────────────────────────────

console.log('\n— monthGridKeys draws whole Mon–Sun weeks, in no timezone —');
{
  eq_('Monday is 0', weekdayOfDayKey('2026-08-03'), 0);
  eq_('Sunday is 6', weekdayOfDayKey('2026-08-09'), 6);
  eq_('a malformed token draws nothing', monthGridKeys('nope'), []);
  eq_('and so does an empty one', monthGridKeys(''), []);

  // Swept over four years rather than spot-checked: February, a month opening
  // on a Sunday, and both DST transitions are all in here without being named.
  let swept = 0;
  for (let y = 2026; y <= 2029; y++) {
    for (let m = 1; m <= 12; m++) {
      const token = `${y}-${String(m).padStart(2, '0')}`;
      const keys = monthGridKeys(token);
      const first = monthFirstKey(token);
      const last = shiftDayKey(monthFirstKey(shiftMonthToken(token, 1)), -1);
      const days = daysBetweenDayKeys(first, last) + 1;
      const inMonth = keys.filter((k) => k.slice(0, 7) === token);
      const bad =
        keys.length % 7 !== 0 ||
        weekdayOfDayKey(keys[0]) !== 0 ||
        weekdayOfDayKey(keys[keys.length - 1]) !== 6 ||
        inMonth.length !== days ||
        inMonth[0] !== first ||
        inMonth[inMonth.length - 1] !== last ||
        !keys.every((k) => DAY_KEY_RE.test(k)) ||
        keys.some((k, i) => i > 0 && daysBetweenDayKeys(keys[i - 1], k) !== 1);
      if (bad) {
        eq_(`grid is well-formed for ${token}`, keys, 'a whole Mon–Sun span');
        break;
      }
      swept++;
    }
  }
  eq_('48 months of grids are whole weeks covering exactly their month',
    swept, 48);

  // March 2027 holds a 23-hour day in Vancouver. These are calendar keys with
  // no instant behind them, so it must not matter — a millisecond-based
  // implementation loses or repeats a day here and nowhere else.
  eq_('a spring-forward month still draws 31 days',
    monthGridKeys('2027-03').filter((k) => k.startsWith('2027-03')).length, 31);
  eq_('and a fall-back month draws 30',
    monthGridKeys('2027-11').filter((k) => k.startsWith('2027-11')).length, 30);
  eq_('February 2027 starts on a Monday, so it needs exactly four rows',
    monthGridKeys('2027-02').length, 28);
}

// ── The window replaces the month scope ─────────────────────────────────────

console.log('\n— the grid window, per field —');
{
  eq_('a forward field windows on day KEYS',
    calendarDateWindow(VAN, 'date', '2026-08'),
    { sinceKey: '2026-08-01', beforeKey: '2026-09-01' });
  eq_('due windows the same way',
    calendarDateWindow(TEH, 'due', '2026-08'),
    { sinceKey: '2026-08-01', beforeKey: '2026-09-01' });
  ok_('a forward window is identical in both zones',
    JSON.stringify(calendarDateWindow(VAN, 'start', '2026-12')) ===
      JSON.stringify(calendarDateWindow(TEH, 'start', '2026-12')));

  const van = calendarDateWindow(VAN, 'completed', '2026-08');
  const teh = calendarDateWindow(TEH, 'completed', '2026-08');
  ok_('a backward field windows on INSTANTS', van?.since instanceof Date);
  ok_('...which differ by zone, because a month starts at a local midnight',
    van?.since?.getTime() !== teh?.since?.getTime());
  eq_('August starts at 07:00Z for a Vancouver reader',
    van?.since?.toISOString(), '2026-08-01T07:00:00.000Z');
  eq_('...and at 20:30Z the evening before for a Tehran one',
    teh?.since?.toISOString(), '2026-07-31T20:30:00.000Z');

  eq_('an unscoped calendar has no window at all',
    calendarDateWindow(VAN, 'date', TASK_MONTH_ALL), null);
  eq_('and neither has a malformed one',
    calendarDateWindow(VAN, 'date', 'August'), null);

  // "All time" is a grid with no month to draw, so it lands on the current one
  // rather than on a page with no cells.
  const at = (qs: string, mode: 'list' | 'calendar') =>
    parseTaskMonth((k) => new URLSearchParams(qs).get(k) ?? '', {
      mode,
      currentMonth: '2026-08',
    });
  eq_('the list keeps all time', at('month=all', 'list'), TASK_MONTH_ALL);
  eq_('the calendar refuses it', at('month=all', 'calendar'), '2026-08');
  eq_('a bare calendar URL opens on the current month',
    at('', 'calendar'), '2026-08');
  eq_('and a named month is honoured',
    at('month=2026-06', 'calendar'), '2026-06');
}

// ── Tabs a calendar can honestly offer ──────────────────────────────────────

console.log('\n— keyed on Completed, the working tabs cannot hold anything —');
{
  const SHIPPED = ['done', 'delivered', 'posted', 'all'];
  eq_('completed offers the shipped tabs only',
    calendarTabsFor('completed'), SHIPPED);
  for (const f of FIELDS.filter((x) => x !== 'completed')) {
    eq_(`${f} offers all eight`, calendarTabsFor(f).length, 8);
  }
  // Every offered tab has to be one the query knows how to answer. 'open' and
  // 'all' are composites over the status vocabulary, not statuses, which is
  // exactly why this reads TASK_VIEW_STATUSES rather than the slug list.
  ok_('every offered tab is a real view on every field',
    FIELDS.every((f) =>
      calendarTabsFor(f).every((v) => v in TASK_VIEW_STATUSES),
    ));
  ok_('and the shipped set is exactly the tabs whose statuses have shipped',
    calendarTabsFor('completed')
      .filter((v) => v !== 'all')
      .every((v) =>
        TASK_VIEW_STATUSES[v].every((st) =>
          (['done', 'delivered', 'posted'] as readonly string[]).includes(st),
        ),
      ));

  eq_('an open tab is coerced away on a completed grid',
    coerceTaskViewIn('open', calendarTabsFor('completed')), 'done');
  eq_('so is in progress',
    coerceTaskViewIn('in_progress', calendarTabsFor('completed')), 'done');
  eq_('a shipped tab survives',
    coerceTaskViewIn('posted', calendarTabsFor('completed')), 'posted');
  eq_('All survives',
    coerceTaskViewIn('all', calendarTabsFor('completed')), 'all');
  eq_('and nothing is coerced on a dated grid',
    coerceTaskViewIn('open', calendarTabsFor('date')), 'open');

  // The coercion has to be STABLE: it only ever lands on 'done', whose own
  // default field is 'completed' — the value that caused it. Otherwise the
  // view resolves the field, the field re-resolves the view, and the page
  // renders one of them stale.
  ok_('coercing twice changes nothing',
    coerceTaskViewIn(
      coerceTaskViewIn('open', calendarTabsFor('completed')),
      calendarTabsFor('completed'),
    ) === 'done');
}

// ── The URL a calendar writes ───────────────────────────────────────────────

console.log('\n— the calendar URL carries a field and no range —');
{
  const P = (qs: string) => parseTaskListParams(
    (k) => new URLSearchParams(qs).get(k) ?? '',
  );
  eq_('a bare calendar is just the view',
    taskListQs('open', P(''), undefined, 'calendar'), 'view=calendar');
  eq_('the field serializes when it differs from the tab default',
    taskListQs('open', P('dfield=completed'), undefined, 'calendar'),
    'view=calendar&dfield=completed');
  eq_('...and drops when it matches',
    taskListQs('done', P('dfield=completed'), undefined, 'calendar'),
    'status=done&view=calendar');

  // The month band IS the range control here, so a preset could only fight it:
  // drange=month resolves against `now`, which empties an August grid read in
  // September.
  eq_('a preset is dropped',
    taskListQs('open', P('drange=today'), undefined, 'calendar'),
    'view=calendar');
  eq_('a custom range is dropped, field kept',
    taskListQs('open', P('dfield=due&from=2026-08-01&to=2026-08-09'), undefined, 'calendar'),
    'view=calendar&dfield=due');
  eq_('a page is dropped: there is no second page of a calendar',
    taskListQs('open', P(''), 4, 'calendar'), 'view=calendar');
  eq_('the list still carries all three',
    taskListQs('open', P('drange=today'), 4, 'list'), 'drange=today&page=4');

  // task_views.query stores this string and compares it by equality, so a
  // month inside it would pin every saved view to the month it was saved in.
  for (const mode of ['list', 'digest', 'calendar'] as const) {
    ok_(`no month reaches taskListQs on ${mode}`,
      !taskListQs('done', P('month=2026-07&q=reels'), 2, mode).includes('month='));
  }
  eq_('the scope door carries one, after the view',
    taskScopeQs('open', P(''), {
      month: '2026-06', currentMonth: '2026-08', mode: 'calendar',
    }),
    'view=calendar&month=2026-06');
  eq_('and drops the current month, which is the calendar default',
    taskScopeQs('open', P(''), {
      month: '2026-08', currentMonth: '2026-08', mode: 'calendar',
    }),
    'view=calendar');
}

// ── Copy that describes what is drawn ───────────────────────────────────────

console.log('\n— every field has words for what the grid is a calendar of —');
{
  for (const f of FIELDS) {
    ok_(`${f} has a band verb`, Boolean(CALENDAR_FIELD_VERB[f]));
    ok_(`${f} has a subtitle phrase`, Boolean(CALENDAR_FIELD_PHRASE[f]));
  }
  // Admin copy carries no em dashes, and no spaced hyphen standing in for one.
  const copy = [
    ...Object.values(CALENDAR_FIELD_VERB),
    ...Object.values(CALENDAR_FIELD_PHRASE),
  ];
  ok_('and none of it carries an em dash',
    copy.every((s) => !/[—–]| - /.test(s)));
}

console.log(
  fails === 0
    ? '\nALL PASS (pure checks: no DB, no env)'
    : `\n${fails} FAILED`,
);
process.exit(fails === 0 ? 0 : 1);
