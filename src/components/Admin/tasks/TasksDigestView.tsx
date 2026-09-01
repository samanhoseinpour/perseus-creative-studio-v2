import {
  LuCornerDownRight,
  LuLink,
  LuSquareCheckBig,
  LuSearchX,
} from 'react-icons/lu';
import Link from 'next/link';

import {
  listRecentDone,
  listTaskViews,
  resolveTaskFilters,
} from '@/db/taskQueries';
import {
  INTERNAL_CLIENT_LABEL,
  formatMinutes,
  linkLabelFor,
  revisionRootOf,
  splitMinutesAcross,
  type TaskLink,
} from '@/lib/taskFields';
import {
  hasActiveTaskFilters,
  isMonthScoped,
  parseTaskListParams,
  parseTaskMonth,
  resolveTaskView,
  taskScopeQs,
} from '@/lib/taskFilters';
import {
  dayKeyIn,
  monthTokenIn,
  monthWindowIn,
  recentSinceIn,
} from '@/lib/calendar';
import { viewerZone } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { TaskTagChipData } from '@/lib/taskTagFields';
import { digestDayLabel, monthLabel, monthNameLabel } from './format';
import { TagMixStrip, TaskTagStrip } from './TaskTagChip';
import TaskFilterBar from './TaskFilterBar';
import TaskMonthBand from './TaskMonthBand';
import {
  loadTaskOptions,
  monthSwitcherFor,
  type SearchParamsRecord,
} from './TasksListView';
import TasksViewToggle from './TasksViewToggle';

const BASE_PATH = '/admin/tasks';
const DIGEST_DAYS = 7;
/** Rows arrive newest-completed first, so hitting the cap silently drops the
 *  window's OLDEST days — and the boundary day would report a partial tally as
 *  if it were complete. High enough that a real week never reaches it; when it
 *  does, the view says so instead of quietly lying. */
const DIGEST_MAX_ROWS = 500;
/** A whole month is four to five times a week, so the rolling cap would bite
 *  on a busy one and silently drop its earliest days. Same contract either
 *  way: when it DOES bite, the view says so rather than quietly lying. */
const DIGEST_MONTH_MAX_ROWS = 1500;
/** Tags named in the week's mix strip. Past a handful it stops being a
 *  readout and becomes the vocabulary printed sideways. */
const DIGEST_MIX_MAX = 8;
/** Categories named in the month wrap-up's mix. Past a handful the bar stops
 *  being a shape and becomes a list. */
const WRAP_UP_CATEGORIES = 5;

type DigestItem = {
  id: string;
  title: string;
  clientLabel: string;
  categoryLabel: string;
  hoursLabel: string;
  links: TaskLink[];
  tags: TaskTagChipData[];
  /** '' when this is a deliverable. */
  parentId: string;
  /** The revised task's title — rendered only when the parent ISN'T in the
   *  same block, since a nested child sits under it already. */
  parentTitle: string;
  /** Rounds of this item finished by the same member on the same day, folded
   *  in beneath it. */
  revisions: DigestItem[];
};

type DigestMember = {
  key: string;
  name: string;
  /** Server-resolved face (loadTaskOptions' avatar map); null → initials. */
  avatar: import('./types').RowAvatar | null;
  minutes: number;
  /** Deliverables finished — the header count. */
  taskCount: number;
  revisionCount: number;
  items: DigestItem[];
};

type DigestDay = {
  dayKey: string;
  label: string;
  /** Deliverables. Revisions are counted separately so the day's line can say
   *  "6 tasks · 2 revisions" instead of quietly reporting eight deliveries. */
  taskCount: number;
  revisionCount: number;
  minutes: number;
  members: DigestMember[];
};

/**
 * One line of a member's day, plus any rounds folded under it.
 *
 * A nested revision is indented past the title and carries a ↳ instead of
 * repeating the deliverable's name — the parent is directly above it, so the
 * name would be noise. A revision whose parent shipped on a different day (or
 * was done by someone else) renders at the top level and says what it revises,
 * because there is nothing above it to infer that from.
 */
function DigestLine({ item, nested }: { item: DigestItem; nested?: boolean }) {
  return (
    <li className={cn('py-1', nested ? 'pl-14' : 'pl-9')}>
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1">
          {nested && (
            <LuCornerDownRight
              aria-hidden="true"
              className="mr-1 inline size-3 align-middle text-muted-foreground"
            />
          )}
          <span
            className={cn(
              'text-sm',
              nested ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {/* "Add revision" inherits the parent's title verbatim (the link
                now carries what "(Eslahie)" used to), so repeating it directly
                under the parent would read as the same line twice. A member
                who DID retitle the round meant something by it — show that. */}
            {nested
              ? item.title === item.parentTitle
                ? 'Revision'
                : item.title
              : item.title}
          </span>
          {/* Plain anchors, not the board's dropdown: this page is server-
              rendered and read-only, and a Radix menu per row would put a
              click — and a client runtime — in front of a list that can just
              BE the list. The name shows only when there are several, so a
              single link stays the bare glyph it always was. */}
          {item.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${linkLabelFor(link)} for ${item.title}`}
              className="-m-1.5 ml-0 inline-flex items-center gap-1 p-1.5 align-middle text-muted-foreground transition-colors hover:text-foreground"
            >
              <LuLink aria-hidden="true" className="size-3" />
              {item.links.length > 1 && (
                <span className="max-w-32 truncate text-xs">
                  {linkLabelFor(link)}
                </span>
              )}
            </a>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {/* A nested round is on the same client as the line above it, so
                only the category is worth repeating. */}
            {nested
              ? item.categoryLabel
              : `${item.clientLabel} · ${item.categoryLabel}`}
          </span>
          {!nested && item.parentTitle && (
            <span className="ml-2 text-xs text-muted-foreground">
              · revision of {item.parentTitle}
            </span>
          )}
          {item.tags.length > 0 && (
            <TaskTagStrip
              tags={item.tags}
              // A prose line, not a table cell: nothing here can widen a
              // column, so the fold is generous.
              max={6}
              className="ml-2 max-w-none align-middle"
            />
          )}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {item.hoursLabel}
        </span>
      </span>
      {item.revisions.length > 0 && (
        <ul>
          {item.revisions.map((revision) => (
            <DigestLine key={revision.id} item={revision} nested />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The daily digest — the team's old Telegram ritual, auto-generated: done
 * tasks from the last week grouped Today / Yesterday / date, then by member.
 * Read-only by design (edits live in the List view); grouping happens here on
 * the server via Vancouver day keys, so the client receives strings only.
 */
export default async function TasksDigestView({
  sp,
  viewer,
}: {
  sp: SearchParamsRecord;
  viewer: { id: string; name: string };
}) {
  const get = (name: string) => firstParam(sp[name]);
  const view = resolveTaskView(get('status'));
  const params = parseTaskListParams(get);
  const now = new Date();
  // The reader's own clock. Bucketing on the studio's put work finished
  // yesterday evening in Tehran under "Today" for most of the team — the
  // boundary has to be the one the reader lives on.
  const tz = await viewerZone();
  const todayKey = dayKeyIn(tz, now);
  // Calendar math, not now-24h: the spring-forward day is 23h long, so a
  // fixed-ms subtraction mislabels "Yesterday" in the first hour after the
  // DST switch. recentSinceIn(tz, 2) is local midnight one day back.
  const yesterdayKey = dayKeyIn(tz, recentSinceIn(tz, 2, now));

  // Options are filter-independent, so listRecentDone starts the moment the
  // filters resolve and overlaps the options wave instead of waiting on it.
  const optionsPromise = loadTaskOptions(viewer, tz);
  const savedViewsPromise = listTaskViews(viewer.id);
  optionsPromise.catch(() => {});
  savedViewsPromise.catch(() => {});
  // The month scope REPLACES the rolling window rather than narrowing it,
  // which is what turns this page into that month's wrap-up. Unscoped keeps
  // the last-7-days shape the digest was built as, and that is the digest's
  // DEFAULT (unlike the list, which opens on the current month): a rolling
  // week routinely straddles a month boundary, and clipping it to the calendar
  // month would empty this page every 1st.
  const currentMonth = monthTokenIn(tz, now);
  const month = parseTaskMonth(get, { digest: true, currentMonth });
  const scope = { month, currentMonth, digest: true };
  const scoped = isMonthScoped(month);
  const monthWindow = scoped ? monthWindowIn(tz, month) : null;
  const rowCap = monthWindow ? DIGEST_MONTH_MAX_ROWS : DIGEST_MAX_ROWS;

  // The window above IS this page's month, so the scope must not ALSO narrow
  // the rows — passing it here would apply the same month twice, and on a past
  // month the second one is a different clause (completed-only) that happens to
  // agree. One window, one place.
  const filters = await resolveTaskFilters(tz, params, view);
  const [rows, options, savedViews] = await Promise.all([
    filters
      ? listRecentDone({
          since: monthWindow ? monthWindow.since : recentSinceIn(tz, DIGEST_DAYS, now),
          // listRecentDone has always accepted an upper bound (the weekly
          // digest email uses it for its exact Mon–Sun week); this is the
          // first in-app caller to need one.
          ...(monthWindow ? { until: monthWindow.until } : {}),
          filters,
          limit: rowCap,
        })
      : Promise.resolve([]),
    optionsPromise,
    savedViewsPromise,
  ]);

  // Fold: day → member → items. Rows arrive newest-first, so insertion order
  // IS display order for days; members sort by minutes within a day.
  const days = new Map<string, DigestDay>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const dayKey = dayKeyIn(tz, row.completedAt);
    const minutes = row.actualMinutes ?? row.estimatedMinutes;
    let day = days.get(dayKey);
    if (!day) {
      day = {
        dayKey,
        label: digestDayLabel(dayKey, todayKey, yesterdayKey),
        taskCount: 0,
        revisionCount: 0,
        minutes: 0,
        members: [],
      };
      days.set(dayKey, day);
    }
    // Minutes take every row; the counts split (foldMonthTotals' rule).
    const delivered = row.parentId === null;
    if (delivered) day.taskCount += 1;
    else day.revisionCount += 1;
    day.minutes += minutes;

    // The day header above counted this row ONCE; it is listed under everyone
    // who worked it, with the hours split so the member lines still add up to
    // the day's total.
    const shares = splitMinutesAcross(minutes, row.assignees.length);
    row.assignees.forEach((who, i) => {
      const memberKey = who.id ?? `name:${who.name}`;
      let member = day.members.find((m) => m.key === memberKey);
      if (!member) {
        member = {
          key: memberKey,
          name: who.name,
          avatar: (who.id ? options.avatars.get(who.id) : null) ?? null,
          minutes: 0,
          taskCount: 0,
          revisionCount: 0,
          items: [],
        };
        day.members.push(member);
      }
      member.minutes += shares[i];
      if (delivered) member.taskCount += 1;
      else member.revisionCount += 1;
      member.items.push({
        id: row.id,
        title: row.title,
        clientLabel: row.clientName ?? INTERNAL_CLIENT_LABEL,
        categoryLabel: row.categoryName,
        // The member's share, with the whole job named beside it — a 3h shoot
        // two people went on reading "1h 30m" and nothing else would look like
        // the hours were logged wrong.
        hoursLabel:
          row.assignees.length > 1
            ? `${formatMinutes(shares[i])} of ${formatMinutes(minutes)}`
            : formatMinutes(minutes),
        links: row.deliverableLinks,
        tags: row.tags,
        parentId: row.parentId ?? '',
        parentTitle: row.parentTitle,
        revisions: [],
      });
    });
  }
  const dayList = [...days.values()];
  for (const day of dayList) {
    day.members.sort((a, b) => b.minutes - a.minutes);
    // Tuck each revision under its own deliverable when BOTH are in the same
    // member's same day — which is the shape the screenshot showed: "Taurus
    // Bahar Deadlift" and "Taurus Bahar Deadlift TH (Eslahie)" as two sibling
    // lines. When the parent shipped on another day (or by someone else) the
    // revision stays a top-level line and names what it revises instead;
    // hoisting it would move work into a day it wasn't done on.
    for (const member of day.members) {
      const byId = new Map(member.items.map((item) => [item.id, item]));
      // revisionRootOf CLIMBS to the deliverable rather than hopping once.
      // Revisions nest — a third round hangs off the second — so a single
      // lookup tucked v3 under v2 and then, when v2 was itself lifted out of
      // this list, left v3 inside something no longer rendered. Which of the
      // two happened depended on the order the filter visited them in.
      member.items = member.items.filter((item) => {
        const root = revisionRootOf(
          item.id,
          (id) => byId.get(id)?.parentId || null,
          (id) => byId.get(id),
        );
        if (!root) return true;
        root.revisions.push(item);
        return false;
      });
    }
  }

  // What actually shipped, by shape. Folded from the rows already in hand —
  // listRecentDone attaches the tags, so this costs no query at all. INTERNAL
  // only, like everything else on this page: the client month report reads
  // listClientMonthTasks, which structurally cannot carry tags.
  const mix = new Map<string, { tag: TaskTagChipData; n: number }>();
  for (const row of rows) {
    for (const tag of row.tags) {
      const entry = mix.get(tag.id);
      if (entry) entry.n += 1;
      else mix.set(tag.id, { tag, n: 1 });
    }
  }
  const tagMix = [...mix.values()]
    .sort((a, b) => b.n - a.n || a.tag.name.localeCompare(b.tag.name))
    .slice(0, DIGEST_MIX_MAX);

  /**
   * The month's wrap-up — folded from the rows already in hand, so it costs
   * ZERO extra queries (TagMixStrip's discipline, applied to the whole strip).
   *
   * Deliberately NOT the client report's numbers: no on-time rate, no estimate
   * drift, no turnaround. This is "what the studio shipped", readable by
   * anyone holding the tasks area — the reports area exists precisely because
   * the client-facing interpretation is a narrower audience.
   */
  const wrapUp = monthWindow
    ? (() => {
        let delivered = 0;
        let revisions = 0;
        let minutes = 0;
        const members = new Set<string>();
        const categories = new Map<string, number>();
        for (const row of rows) {
          const mins = row.actualMinutes ?? row.estimatedMinutes;
          minutes += mins;
          if (row.parentId === null) delivered += 1;
          else revisions += 1;
          for (const who of row.assignees)
            members.add(who.id ?? `name:${who.name}`);
          categories.set(
            row.categoryName,
            (categories.get(row.categoryName) ?? 0) + mins,
          );
        }
        const bars = [...categories.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, WRAP_UP_CATEGORIES)
          .map(([name, mins]) => ({
            name,
            hoursLabel: formatMinutes(mins),
            // Scaled to the total, with a floor so a thin slice stays visible
            // (pctOf's rule in reportData).
            pct: minutes === 0 ? 0 : Math.max(2, Math.round((mins / minutes) * 100)),
          }));
        return {
          monthLabel: monthNameLabel(month),
          deliveredLabel: `${delivered} task${delivered === 1 ? '' : 's'}`,
          revisionsLabel:
            revisions > 0
              ? `${revisions} revision${revisions === 1 ? '' : 's'}`
              : '',
          hoursLabel: formatMinutes(minutes),
          membersLabel: `${members.size} member${members.size === 1 ? '' : 's'}`,
          bars,
        };
      })()
    : null;

  const monthSwitch = monthSwitcherFor({
    tz,
    now,
    view,
    params,
    month,
    currentMonth,
    digest: true,
    // Unscoped here means the rolling week this page has always been, not all
    // of history — the row and the trigger both have to say that.
    allLabel: `Last ${DIGEST_DAYS} days`,
  });

  const filtered = filters === null || hasActiveTaskFilters(params, view);
  // Clear drops the filters, never the month: a scope is not a filter.
  const clearQs = taskScopeQs(view, {}, scope);

  return (
    <AdminPage width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tasks
            </h1>
            <HelpButton topic={ADMIN_HELP.tasks} />
          </div>
          <p className="text-sm text-muted-foreground">
            {wrapUp
              ? `Everything ${wrapUp.monthLabel} shipped, day by day.`
              : `The last ${DIGEST_DAYS} days of shipped work, day by day. The digest, minus the typing.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TasksViewToggle
            basePath={BASE_PATH}
            view={view}
            params={params}
            digest
            scope={scope}
          />
        </div>
      </header>

      <GlassPanel className="mt-6">
        {/* The same band the list carries, and in the same place: this view has
            no tabs to sit above, but one band in the shared loading.tsx is only
            correct if BOTH branches of the page draw one. */}
        <TaskMonthBand
          basePath={BASE_PATH}
          switcher={monthSwitch}
          total={rows.length}
          scoped={scoped}
          // Never "closed": the digest has no working tabs to explain away,
          // and its unscoped state is a rolling week rather than all of time.
          past={false}
          currentHref={BASE_PATH}
          currentLabel={monthLabel(currentMonth)}
        />
        <TaskFilterBar
          basePath={BASE_PATH}
          view={view}
          params={params}
          clientOptions={options.filterClients}
          categoryOptions={options.filterCategories}
          tagOptions={options.tags}
          tagTypes={options.tagTypes}
          assigneeOptions={options.assigneeOptions}
          scope={scope}
          viewerId={viewer.id}
          savedViews={savedViews}
          digest
        />
        {wrapUp && (
          // Takes no `tone` prop, so like InternalKpiPanel and TagMixStrip it
          // structurally cannot be rendered onto a print sheet or the /share
          // page — this is the studio's own picture of its month.
          <div className="border-t border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {wrapUp.monthLabel} wrap-up
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-foreground">
              <span className="font-medium">{wrapUp.deliveredLabel}</span>
              {wrapUp.revisionsLabel && (
                <span className="text-muted-foreground">
                  · {wrapUp.revisionsLabel}
                </span>
              )}
              <span className="text-muted-foreground">
                · {wrapUp.hoursLabel} · {wrapUp.membersLabel}
              </span>
            </p>
            {wrapUp.bars.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {wrapUp.bars.map((bar) => (
                  <li key={bar.name} className="flex items-center gap-2.5">
                    <span className="w-32 shrink-0 truncate text-xs text-muted-foreground sm:w-40">
                      {bar.name}
                    </span>
                    {/* A plain div, not a chart library — there is none in
                        this repo and none is wanted. */}
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]">
                      <span
                        className="block h-full rounded-full bg-foreground/45"
                        style={{ width: `${bar.pct}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {bar.hoursLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <TagMixStrip
          mix={tagMix}
          className="border-t border-white/40 px-4 py-2.5 sm:px-5 dark:border-white/10"
        />
        {rows.length === rowCap && (
          <p className="border-t border-white/40 px-4 py-2.5 text-xs text-muted-foreground sm:px-5 dark:border-white/10">
            Showing the {rowCap} most recent completions, so the earliest
            days of this window are cut off. Narrow it with a filter, or use the
            List view.
          </p>
        )}
        {dayList.length === 0 && (
          <>
            {filtered ? (
              <EmptyState
                icon={LuSearchX}
                title="No matches"
                description="Nothing finished in the window matches the current filters."
                action={
                  <Link
                    href={clearQs ? `${BASE_PATH}?${clearQs}` : BASE_PATH}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                      adminLink,
                    )}
                  >
                    Clear filters
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={LuSquareCheckBig}
                title={
                  wrapUp
                    ? `Nothing shipped in ${wrapUp.monthLabel}`
                    : 'Nothing shipped this week'
                }
                description="Tasks that have shipped appear here, grouped by day and member. Done, Delivered and Posted all count."
              />
            )}
          </>
        )}
      </GlassPanel>

      {dayList.map((day) => (
        <section key={day.dayKey} className="mt-6">
          <h2 className="mb-3 flex items-baseline justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {day.label}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {day.taskCount} task{day.taskCount === 1 ? '' : 's'}
              {day.revisionCount > 0 &&
                ` · ${day.revisionCount} revision${day.revisionCount === 1 ? '' : 's'}`}{' '}
              · {formatMinutes(day.minutes)}
            </span>
          </h2>
          <GlassPanel>
            {day.members.map((member, mi) => (
              <div
                key={member.key}
                className={cn(
                  mi > 0 && 'border-t border-white/40 dark:border-white/10',
                )}
              >
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AdminAvatar
                      name={member.name}
                      size={28}
                      {...(member.avatar ?? {})}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {/* member.taskCount, NOT items.length: a revision folded
                        under its parent is no longer a top-level item, so the
                        array length would under-report a member's own day. */}
                    {member.taskCount} task{member.taskCount === 1 ? '' : 's'}
                    {member.revisionCount > 0 &&
                      ` · ${member.revisionCount} revision${member.revisionCount === 1 ? '' : 's'}`}{' '}
                    · {formatMinutes(member.minutes)}
                  </span>
                </div>
                <ul className="px-4 pt-1.5 pb-3.5 sm:px-5">
                  {member.items.map((item) => (
                    <DigestLine key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </GlassPanel>
        </section>
      ))}
    </AdminPage>
  );
}
