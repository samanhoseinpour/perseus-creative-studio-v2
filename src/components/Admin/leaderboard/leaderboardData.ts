import {
  countAwaitingApprovalByMember,
  listMemberDoneSlices,
  listTaskRoster,
  type MemberDoneSlice,
  type TaskRosterRow,
} from '@/db/taskQueries';
import { isOrgAccount, resolveAdminAvatar } from '@/lib/adminIdentity';
import { formatMinutes } from '@/lib/taskFields';
import {
  monthToken,
  parseMonthToken,
  shiftDayKey,
  shiftMonthToken,
  vancouverDayKey,
  vancouverDayStart,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import {
  monthLabel,
  monthNameLabel,
  shortMonthLabel,
} from '@/components/Admin/tasks/format';
import { recentMonths } from '@/components/Admin/reports/reportData';
import type { MonthOption } from '@/components/Admin/reports/MonthSwitcher';
import type { RowAvatar } from '@/components/Admin/tasks/types';

/**
 * Server-side assembly for the studio leaderboard — the light competitive
 * layer over the same task rows /admin/reports reads. (Transitively
 * server-only through taskQueries.)
 *
 * One definition of delivered, shared with every report, digest and cron:
 * `status='done'` with `completedAt` inside a Vancouver month window, valued
 * at `actualMinutes ?? estimatedMinutes`. Ranking is the TASK COUNT — hours
 * and on-time ride along as context rather than being blended into a score,
 * so there is no formula for anyone to distrust.
 *
 * Everything here folds in JS off one narrow read; month bucketing goes
 * through vancouverDayKey (the calendar-door rule — no SQL AT TIME ZONE).
 */

/** How many months of past champions the page looks back over. Also the read
 *  window: one query covers the board, the previous month and this strip. */
const HISTORY_MONTHS = 5;

/** Below this, an on-time percentage is one or two tasks' luck, not a habit. */
const RELIABLE_MIN_DATED = 3;
/** And below this it isn't worth calling reliable. */
const RELIABLE_MIN_PCT = 80;
/** A gain smaller than this is noise, not a comeback. */
const IMPROVED_MIN_GAIN = 2;

/**
 * A category needs this much traffic before it crowns anyone. Both floors
 * matter and for different reasons: under a few tasks the "winner" is whoever
 * happened to finish one, and with only a single member working a category
 * the title is just their name again — it reads as manufactured praise, which
 * is worse for morale than no title at all.
 */
const CATEGORY_MIN_TASKS = 3;
const CATEGORY_MIN_MEMBERS = 2;
/** Keeps a studio with many service lines from turning the page into a wall. */
const CATEGORY_MAX_CARDS = 4;

export type CategoryChampion = {
  categoryId: string;
  categoryName: string;
  name: string;
  avatar: RowAvatar | null;
  tasksLabel: string;
  hoursLabel: string;
  /** "of 11 in this category" — the context that makes the title checkable. */
  shareLabel: string;
};

/**
 * How far back the board looks. `month` is the calendar standing — the one
 * with champions, history and Most Improved, because all three are month
 * ideas. The rolling windows exist because a studio one month into tracking
 * has a nearly empty board: they answer "who is delivering lately" without
 * waiting for the calendar.
 */
export type LeaderboardRange = 'month' | 'd30' | 'all';

const LEADERBOARD_RANGES = ['month', 'd30', 'all'] as const;

export function resolveLeaderboardRange(value: string): LeaderboardRange {
  return (LEADERBOARD_RANGES as readonly string[]).includes(value)
    ? (value as LeaderboardRange)
    : 'month';
}

/** Rolling-window span in days. */
const ROLLING_DAYS = 30;

export type LeaderBadgeId = 'active' | 'deep' | 'reliable' | 'improved';

export type LeaderBadge = {
  id: LeaderBadgeId;
  label: string;
  /** Why they hold it — the row's own numbers, so the badge is never a claim
   *  the reader can't check. */
  hint: string;
};

export type LeaderRow = {
  /** Stable identity: assigneeId, or the name-keyed fallback for deleted
   *  accounts — never the display name alone (MemberBarRow's rule). */
  key: string;
  rank: number;
  name: string;
  avatar: RowAvatar | null;
  tasksLabel: string;
  hoursLabel: string;
  /** '' when none of the month's tasks carried a due date — silence beats a
   *  fake 0%. */
  onTimeLabel: string;
  /** Present-tense work parked in client sign-off. Ranking counts `done`
   *  only, so without this a member whose month is sitting in approval reads
   *  as idle when they aren't. */
  awaitingLabel: string;
  badges: LeaderBadge[];
  /** Bar length, scaled to the top member. */
  pct: number;
  /** Highlights the viewer's own row. */
  isViewer: boolean;
};

export type IdleMember = {
  key: string;
  name: string;
  avatar: RowAvatar | null;
  awaitingLabel: string;
  isViewer: boolean;
};

export type ChampionCard = {
  key: string;
  name: string;
  avatar: RowAvatar | null;
  /** The month they won, e.g. 'July'. */
  monthName: string;
  month: string;
  tasksLabel: string;
  hoursLabel: string;
  onTimeLabel: string;
};

export type PastChampion = {
  month: string;
  monthLabelText: string;
  name: string;
  avatar: RowAvatar | null;
  tasksLabel: string;
};

export type Leaderboard = {
  month: string;
  monthLabelText: string;
  currentMonth: string;
  isCurrentMonth: boolean;
  monthOptions: MonthOption[];
  range: LeaderboardRange;
  /** Section heading for the ranked list. */
  rangeLabel: string;
  /** Full sentence for the page subtitle — composed here rather than at the
   *  call site, because "in all time" is not a thing anyone says. */
  subtitle: string;
  emptyTitle: string;
  /** The slice read hit its cap, so these totals are a floor, not a count. */
  truncated: boolean;
  tiles: { tasks: string; hours: string; members: string };
  rows: LeaderRow[];
  idle: IdleMember[];
  /** Last month's winner, carried through the current month. Null when the
   *  previous month delivered nothing, or when browsing history (a past
   *  month's winner already wears the crown on row 1). */
  champion: ChampionCard | null;
  pastChampions: PastChampion[];
  /** Per-discipline winners — a second way onto the board for people whose
   *  craft isn't the highest-volume one. */
  categoryChampions: CategoryChampion[];
};

export type DashboardLeaderboard = {
  month: string;
  monthLabelText: string;
  champion: ChampionCard | null;
  /** Top three of the current month. */
  rows: LeaderRow[];
  /** The viewer's standing, when they've completed anything this month. */
  viewerStanding: { rank: number; total: number; tasksLabel: string } | null;
};

// ── Folding ─────────────────────────────────────────────────────────────────

type MemberTally = {
  key: string;
  assigneeId: string | null;
  name: string;
  tasks: number;
  minutes: number;
  /** Completed tasks that carried a due date — the on-time denominator. */
  dated: number;
  onTime: number;
};

/** The member identity used by MemberBars, the digest and both crons: a live
 *  account keys by id, an offboarded one by its name snapshot, so one person
 *  is one line either way. */
const memberKey = (assigneeId: string | null, assigneeName: string): string =>
  assigneeId ?? `name:${assigneeName}`;

const tasksLabel = (tasks: number): string =>
  `${tasks} task${tasks === 1 ? '' : 's'}`;

const onTimeLabel = (tally: MemberTally): string =>
  tally.dated === 0
    ? ''
    : `${Math.round((tally.onTime / tally.dated) * 100)}% on time`;

const onTimePct = (tally: MemberTally): number =>
  tally.dated === 0 ? 0 : (tally.onTime / tally.dated) * 100;

/**
 * Slices → month token → member tallies. `truncated` means the read hit its
 * row cap: rows arrive newest-first, so the OLDEST bucket is the partial one
 * and gets dropped rather than published as a real month (a half-month would
 * crown the wrong champion).
 */
function foldByMonth(
  slices: MemberDoneSlice[],
  truncated: boolean,
): Map<string, Map<string, MemberTally>> {
  const months = new Map<string, Map<string, MemberTally>>();

  for (const slice of slices) {
    if (!slice.completedAt) continue;
    const token = vancouverDayKey(slice.completedAt).slice(0, 7);
    let members = months.get(token);
    if (!members) {
      members = new Map<string, MemberTally>();
      months.set(token, members);
    }
    addSlice(members, slice);
  }

  return dropTruncatedMonths(months, truncated);
}

/** Every slice into ONE bucket — the rolling ranges, where the window is the
 *  read's own since/until rather than a calendar month. */
function foldFlat(slices: MemberDoneSlice[]): Map<string, MemberTally> {
  const members = new Map<string, MemberTally>();
  for (const slice of slices) {
    if (!slice.completedAt) continue;
    addSlice(members, slice);
  }
  return members;
}

/** One completion onto its member's tally — shared so the month board and the
 *  rolling board can never drift on what a task is worth or what "on time"
 *  means. */
function addSlice(
  members: Map<string, MemberTally>,
  slice: MemberDoneSlice,
): void {
  const dayKey = vancouverDayKey(slice.completedAt!);
  const key = memberKey(slice.assigneeId, slice.assigneeName);
  let tally = members.get(key);
  if (!tally) {
    tally = {
      key,
      assigneeId: slice.assigneeId,
      name: slice.assigneeName,
      tasks: 0,
      minutes: 0,
      dated: 0,
      onTime: 0,
    };
    members.set(key, tally);
  }

  tally.tasks += 1;
  tally.minutes += slice.actualMinutes ?? slice.estimatedMinutes;
  if (slice.dueDate) {
    tally.dated += 1;
    // Lexical compare on YYYY-MM-DD through the Vancouver key, matching
    // foldInternalKpis — a bare Intl format would call a 9pm PT completion
    // "tomorrow" on the UTC production server.
    if (dayKey <= slice.dueDate) tally.onTime += 1;
  }
}

/** Drops the oldest bucket when the read was capped — see listMemberDoneSlices. */
function dropTruncatedMonths(
  months: Map<string, Map<string, MemberTally>>,
  truncated: boolean,
): Map<string, Map<string, MemberTally>> {
  if (!truncated || months.size === 0) return months;
  const oldest = [...months.keys()].sort()[0];
  months.delete(oldest);
  return months;
}

/** Tasks desc → hours desc → name asc. Fully deterministic, so a tie doesn't
 *  reshuffle between renders. */
function byRank(a: MemberTally, b: MemberTally): number {
  return (
    b.tasks - a.tasks || b.minutes - a.minutes || a.name.localeCompare(b.name)
  );
}

const rankMonth = (members: Map<string, MemberTally> | undefined): MemberTally[] =>
  members ? [...members.values()].sort(byRank) : [];

/**
 * Who wears which badge. Awarded independently — one member can hold several,
 * which is honest — except Most Improved, which is deliberately withheld from
 * the month's #1: it exists to recognise the chasing pack, and the leader
 * already has a badge.
 */
function awardBadges(
  ranked: MemberTally[],
  previous: Map<string, MemberTally> | undefined,
  prevMonth: string,
): Map<string, LeaderBadge[]> {
  const badges = new Map<string, LeaderBadge[]>();
  const give = (key: string, badge: LeaderBadge) => {
    const held = badges.get(key);
    if (held) held.push(badge);
    else badges.set(key, [badge]);
  };

  const leader = ranked[0];
  if (!leader || leader.tasks === 0) return badges;
  give(leader.key, {
    id: 'active',
    label: 'Most Active',
    hint: `${tasksLabel(leader.tasks)} completed`,
  });

  // The remaining badges only mean something in a field — with one member
  // working, "most hours" is just the same person again.
  if (ranked.length < 2) return badges;

  const deepest = [...ranked].sort(
    (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name),
  )[0];
  if (deepest.minutes > 0) {
    give(deepest.key, {
      id: 'deep',
      label: 'Deep Work',
      hint: `${formatMinutes(deepest.minutes)} logged`,
    });
  }

  const reliable = ranked
    .filter((m) => m.dated >= RELIABLE_MIN_DATED)
    .sort((a, b) => onTimePct(b) - onTimePct(a) || a.name.localeCompare(b.name))[0];
  if (reliable && onTimePct(reliable) >= RELIABLE_MIN_PCT) {
    give(reliable.key, {
      id: 'reliable',
      label: 'Most Reliable',
      hint: `${reliable.onTime} of ${reliable.dated} delivered on time`,
    });
  }

  // No previous month means no baseline — the badge simply doesn't exist yet.
  if (previous && previous.size > 0) {
    const gains = ranked
      .filter((m) => m.key !== leader.key)
      .map((m) => ({ member: m, gain: m.tasks - (previous.get(m.key)?.tasks ?? 0) }))
      .sort((a, b) => b.gain - a.gain || a.member.name.localeCompare(b.member.name));
    const best = gains[0];
    if (best && best.gain >= IMPROVED_MIN_GAIN) {
      give(best.member.key, {
        id: 'improved',
        label: 'Most Improved',
        hint: `+${best.gain} vs ${monthNameLabel(prevMonth)}`,
      });
    }
  }

  return badges;
}

/** Avatar lookup for a tally: live accounts resolve a face, an offboarded
 *  member's name-keyed line falls back to initials. */
function avatarFor(
  tally: Pick<MemberTally, 'assigneeId'>,
  avatars: Map<string, RowAvatar | null>,
): RowAvatar | null {
  return tally.assigneeId ? (avatars.get(tally.assigneeId) ?? null) : null;
}

function buildAvatarMap(roster: TaskRosterRow[]): Map<string, RowAvatar | null> {
  return new Map(roster.map((u) => [u.id, resolveAdminAvatar(u)]));
}

/**
 * Who belongs on the board when they've completed nothing yet — the studio's
 * PEOPLE. Superadmins count: founders take on work like everyone else, and
 * their implicit area grant leaves `areas` empty, so keying on the explicit
 * grant alone would silently drop them. The shared org login is the one
 * account excluded: it isn't a teammate, and a zero row for it is pure noise.
 */
const isTeammate = (u: TaskRosterRow): boolean =>
  !isOrgAccount(u.email) && (u.superadmin || u.hasTasksArea);

function toChampion(
  tally: MemberTally,
  month: string,
  avatars: Map<string, RowAvatar | null>,
): ChampionCard {
  return {
    key: tally.key,
    name: tally.name,
    avatar: avatarFor(tally, avatars),
    monthName: monthNameLabel(month),
    month,
    tasksLabel: tasksLabel(tally.tasks),
    hoursLabel: formatMinutes(tally.minutes),
    onTimeLabel: onTimeLabel(tally),
  };
}

function toRows({
  ranked,
  badges,
  avatars,
  awaiting,
  viewerId,
}: {
  ranked: MemberTally[];
  badges: Map<string, LeaderBadge[]>;
  avatars: Map<string, RowAvatar | null>;
  awaiting: Map<string, number>;
  viewerId: string | null;
}): LeaderRow[] {
  const top = ranked[0]?.tasks ?? 0;
  return ranked.map((tally, index) => ({
    key: tally.key,
    rank: index + 1,
    name: tally.name,
    avatar: avatarFor(tally, avatars),
    tasksLabel: tasksLabel(tally.tasks),
    hoursLabel: formatMinutes(tally.minutes),
    onTimeLabel: onTimeLabel(tally),
    awaitingLabel: awaitingLabel(awaiting.get(tally.key) ?? 0),
    badges: badges.get(tally.key) ?? [],
    // Slivers stay visible; the leader is always full width (pctOf's rule,
    // against the top COUNT here rather than minutes — the bar has to agree
    // with the ranking it sits under).
    pct: top === 0 ? 0 : Math.max(2, Math.round((tally.tasks / top) * 100)),
    isViewer: viewerId !== null && tally.assigneeId === viewerId,
  }));
}

const awaitingLabel = (tasks: number): string =>
  tasks === 0 ? '' : `${tasks} awaiting sign-off`;

/**
 * Who leads each category, over the slices already in hand (no extra read).
 * Same ranking rule as the overall board — tasks, then hours, then name — so
 * a category title means the same thing the headline one does.
 *
 * Only the categories being ranked in THIS window count: passing the month's
 * slices keeps a category champion from being crowned on work outside the
 * board the card sits under.
 */
function foldCategoryChampions(
  slices: MemberDoneSlice[],
  avatars: Map<string, RowAvatar | null>,
): CategoryChampion[] {
  const categories = new Map<
    string,
    { name: string; tasks: number; members: Map<string, MemberTally> }
  >();

  for (const slice of slices) {
    if (!slice.completedAt) continue;
    let entry = categories.get(slice.categoryId);
    if (!entry) {
      entry = { name: slice.categoryName, tasks: 0, members: new Map() };
      categories.set(slice.categoryId, entry);
    }
    entry.tasks += 1;
    addSlice(entry.members, slice);
  }

  const qualified: { total: number; card: CategoryChampion }[] = [];
  for (const [categoryId, entry] of categories) {
    if (entry.tasks < CATEGORY_MIN_TASKS) continue;
    if (entry.members.size < CATEGORY_MIN_MEMBERS) continue;
    const winner = [...entry.members.values()].sort(byRank)[0];
    if (!winner || winner.tasks === 0) continue;
    qualified.push({
      total: entry.tasks,
      card: {
        categoryId,
        categoryName: entry.name,
        name: winner.name,
        avatar: avatarFor(winner, avatars),
        tasksLabel: tasksLabel(winner.tasks),
        hoursLabel: formatMinutes(winner.minutes),
        shareLabel: `of ${entry.tasks} in ${entry.name}`,
      },
    });
  }

  // Busiest categories first — the same "where the work actually is" ordering
  // the reports' service mix uses. Sorted on the real count, never on a number
  // parsed back out of the label it was formatted into.
  return qualified
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.card.categoryName.localeCompare(b.card.categoryName),
    )
    .slice(0, CATEGORY_MAX_CARDS)
    .map((entry) => entry.card);
}

/** Tallies keyed the same way the leaderboard rows are. */
function awaitingMap(
  rows: { assigneeId: string | null; assigneeName: string; tasks: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = memberKey(row.assigneeId, row.assigneeName);
    map.set(key, (map.get(key) ?? 0) + row.tasks);
  }
  return map;
}

// ── Assembly ────────────────────────────────────────────────────────────────

export type BoardInput = {
  slices: MemberDoneSlice[];
  roster: TaskRosterRow[];
  awaiting: { assigneeId: string | null; assigneeName: string; tasks: number }[];
  /** A parsed YYYY-MM token — the month being ranked. Still supplied in
   *  rolling mode (the window came from elsewhere), but nothing buckets by it. */
  month: string;
  /** True when the slice read hit its row cap (see listMemberDoneSlices). */
  truncated: boolean;
  viewerId: string | null;
  /**
   * 'rolling' ranks every slice as one bucket. Champions, past champions and
   * Most Improved are structurally absent there — all three compare one
   * calendar month against another, and a rolling window has no "previous"
   * to compare with. Faking them would be worse than omitting them.
   */
  mode?: 'month' | 'rolling';
};

export type AssembledBoard = {
  rows: LeaderRow[];
  idle: IdleMember[];
  totalTasks: number;
  totalMinutes: number;
  /** Every month in the fetched window that had a winner, keyed by token —
   *  the ribbon and the past-champion strip both read from here. */
  winners: Map<string, ChampionCard>;
  categoryChampions: CategoryChampion[];
};

/**
 * The shared fold both surfaces run — pure, so the ranking, the badge
 * thresholds and the Vancouver month boundary are testable against fixtures
 * without a database (assembleMonthSections' role in reportData).
 */
export function assembleBoard({
  slices,
  roster,
  awaiting: awaitingRows,
  month,
  truncated,
  viewerId,
  mode = 'month',
}: BoardInput): AssembledBoard {
  const rolling = mode === 'rolling';
  const prevMonth = shiftMonthToken(month, -1);
  const avatars = buildAvatarMap(roster);
  const awaiting = awaitingMap(awaitingRows);
  // A rolling window is already the window: bucketing it by month and then
  // reading one bucket would silently throw away most of it.
  const months = rolling
    ? new Map<string, Map<string, MemberTally>>()
    : foldByMonth(slices, truncated);

  const ranked = rolling
    ? [...foldFlat(slices).values()].sort(byRank)
    : rankMonth(months.get(month));
  // No previous bucket in rolling mode → awardBadges skips Most Improved.
  const badges = awardBadges(ranked, months.get(prevMonth), prevMonth);
  const rows = toRows({ ranked, badges, avatars, awaiting, viewerId });

  const rankedIds = new Set(
    ranked.map((m) => m.assigneeId).filter((id): id is string => id !== null),
  );
  const idle: IdleMember[] = roster
    .filter((u) => isTeammate(u) && !rankedIds.has(u.id))
    .map((u) => ({
      key: u.id,
      name: u.name,
      avatar: avatars.get(u.id) ?? null,
      awaitingLabel: awaitingLabel(awaiting.get(u.id) ?? 0),
      isViewer: u.id === viewerId,
    }));

  const winners = new Map<string, ChampionCard>();
  for (const [token, members] of months) {
    const winner = [...members.values()].sort(byRank)[0];
    if (winner) winners.set(token, toChampion(winner, token, avatars));
  }

  // Only the slices the board itself ranks: in month mode that is the viewed
  // month, not the five-month read window behind the champion strip.
  const inWindow = rolling
    ? slices
    : slices.filter(
        (slice) =>
          slice.completedAt &&
          vancouverDayKey(slice.completedAt).slice(0, 7) === month,
      );

  return {
    rows,
    idle,
    totalTasks: ranked.reduce((sum, m) => sum + m.tasks, 0),
    totalMinutes: ranked.reduce((sum, m) => sum + m.minutes, 0),
    winners,
    categoryChampions: foldCategoryChampions(inWindow, avatars),
  };
}

// ── Builders ────────────────────────────────────────────────────────────────

/**
 * The /admin/leaderboard page. One slice read covers the viewed month, the
 * month before it (Most Improved + the reigning champion) and the
 * past-champion strip.
 */
export async function buildLeaderboard(
  rawMonth: string,
  viewerId: string | null,
  rawRange = '',
): Promise<Leaderboard> {
  const now = new Date();
  const currentMonth = monthToken(now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const isCurrentMonth = month === currentMonth;
  const range = resolveLeaderboardRange(rawRange);
  const rolling = range !== 'month';

  const prevMonth = shiftMonthToken(month, -1);
  const oldest = shiftMonthToken(month, -HISTORY_MONTHS);
  // Non-null: both tokens came from parseMonthToken/shiftMonthToken.
  const monthSince = vancouverMonthWindow(oldest)!.since;
  const monthUntil = vancouverMonthWindow(month)!.until;
  // Rolling windows run to now, so they need no upper bound. `all` starts at
  // the epoch rather than a guessed founding date — the cap below is what
  // actually bounds the read.
  const since =
    range === 'month'
      ? monthSince
      : range === 'd30'
        ? vancouverDayStart(shiftDayKey(vancouverDayKey(now), -(ROLLING_DAYS - 1)))
        : new Date(0);
  const until = range === 'month' ? monthUntil : undefined;
  const limit = 4000;

  const [slices, roster, awaiting] = await Promise.all([
    listMemberDoneSlices({ since, until, limit }),
    listTaskRoster(),
    countAwaitingApprovalByMember(),
  ]);

  const truncated = slices.length === limit;
  const board = assembleBoard({
    slices,
    roster,
    awaiting,
    month,
    truncated,
    viewerId,
    mode: rolling ? 'rolling' : 'month',
  });

  // The reigning champion is a current-month idea: on a past month, row 1
  // already wears the crown for the month you're looking at. A rolling window
  // has no champion at all — assembleBoard leaves `winners` empty.
  const champion =
    !rolling && isCurrentMonth ? (board.winners.get(prevMonth) ?? null) : null;

  // Prior months, newest first — minus the one already in the ribbon. Empty
  // in rolling mode: `winners` is, so the loop finds nothing anyway.
  const pastChampions: PastChampion[] = [];
  for (let i = 1; i <= HISTORY_MONTHS; i += 1) {
    const token = shiftMonthToken(month, -i);
    if (champion && token === prevMonth) continue;
    const winner = board.winners.get(token);
    if (!winner) continue;
    pastChampions.push({
      month: token,
      monthLabelText: shortMonthLabel(token),
      name: winner.name,
      avatar: winner.avatar,
      tasksLabel: winner.tasksLabel,
    });
  }

  const { totalTasks, totalMinutes } = board;

  const rangeLabel =
    range === 'month'
      ? monthLabel(month)
      : range === 'd30'
        ? `Last ${ROLLING_DAYS} days`
        : 'All time';
  const subtitle =
    range === 'month'
      ? `Ranked by tasks completed in ${monthLabel(month)}.`
      : range === 'd30'
        ? `Ranked by tasks completed in the last ${ROLLING_DAYS} days.`
        : 'Ranked by everything completed since the studio started tracking.';
  const emptyTitle =
    range === 'month'
      ? `Nothing completed in ${monthLabel(month)} yet`
      : range === 'd30'
        ? `Nothing completed in the last ${ROLLING_DAYS} days`
        : 'Nothing completed yet';

  return {
    month,
    monthLabelText: monthLabel(month),
    currentMonth,
    isCurrentMonth,
    monthOptions: recentMonths(12, now),
    range,
    rangeLabel,
    subtitle,
    emptyTitle,
    truncated,
    tiles: {
      tasks: String(totalTasks),
      hours: totalMinutes > 0 ? formatMinutes(totalMinutes) : '—',
      members: String(board.rows.length),
    },
    rows: board.rows,
    idle: board.idle,
    champion,
    pastChampions,
    categoryChampions: board.categoryChampions,
  };
}

/**
 * The /admin dashboard strip: the reigning champion, the current month's top
 * three, and where the viewer stands. Reads two months rather than six — the
 * dashboard pays for this on every load.
 */
export async function buildDashboardLeaderboard(
  viewerId: string,
): Promise<DashboardLeaderboard> {
  const now = new Date();
  const month = monthToken(now);
  const prevMonth = shiftMonthToken(month, -1);
  const limit = 2000;

  const [slices, roster] = await Promise.all([
    listMemberDoneSlices({
      since: vancouverMonthWindow(prevMonth)!.since,
      limit,
    }),
    listTaskRoster(),
  ]);

  const board = assembleBoard({
    slices,
    roster,
    // The strip is a scoreboard, not a work list — the sign-off note belongs
    // on the full page, and skipping it keeps the dashboard at two reads.
    awaiting: [],
    month,
    truncated: slices.length === limit,
    viewerId,
  });

  const viewerRow = board.rows.find((row) => row.isViewer);

  return {
    month,
    monthLabelText: monthLabel(month),
    champion: board.winners.get(prevMonth) ?? null,
    rows: board.rows.slice(0, 3),
    viewerStanding: viewerRow
      ? {
          rank: viewerRow.rank,
          total: board.rows.length,
          tasksLabel: viewerRow.tasksLabel,
        }
      : null,
  };
}
