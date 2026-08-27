import { isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { taskAssignees, tasks } from '@/db/schema';
import { listTemplatesDueOn } from '@/db/taskQueries';
import { deleteExpiredSessions } from '@/db/adminQueries';
import { dayKeyIn, shiftDayKey, STUDIO_TZ } from '@/lib/calendar';
import { reportCronStep, runCron } from '@/lib/cronRun';
import {
  deleteActivityBefore,
  logSystemActivity,
} from '@/lib/activityLog';

/**
 * Daily recurring-task mint (vercel.json cron, 14:00 UTC — deliberately an
 * hour AHEAD of the due-reminder cron at 15:00, so anything minted today is
 * already in the list when that email is composed).
 *
 * Every active template whose schedule lands on today's Vancouver date becomes
 * one task: status todo, start today, due today + the template's offset.
 *
 * Idempotency is the DATABASE's job, not this handler's. neon-http has no
 * transactions, so a read-then-write "has today's already been made?" check
 * could interleave with a retry or an overlapping invocation and mint twice.
 * Instead every row carries (template_id, template_run_key) under a partial
 * unique index, and the insert is onConflictDoNothing — running this endpoint
 * ten times in a row produces exactly one task per template per day.
 *
 * Deliberately silent: no email. The due-reminder cron already nags about
 * what's owed, and a second daily message about work that just appeared in
 * the list is noise. Runs inside runCron (src/lib/cronRun.ts), which owns the
 * CRON_SECRET check and stamps the outcome for /admin/monitoring; the two
 * sweeps below report through reportCronStep so a failed sweep shows on that
 * page as a warning on an otherwise successful run.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return runCron('recurring-tasks', request, async () => {
    const warnings: string[] = [];
    // STUDIO_TZ, not a viewer's: a daily template must fire once per studio
    // day. Resolving this per member would spawn a duplicate for every zone
    // the team spans.
    const todayKey = dayKeyIn(STUDIO_TZ, new Date());
    const [year, month, day] = todayKey.split('-').map(Number);
    // The key IS the Vancouver calendar day, so reading its weekday as UTC is
    // exact — no offset can move a date that was never an instant.
    const utcWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    // getUTCDay is 0=Sunday; the schedule speaks ISO (1=Monday … 7=Sunday).
    const isoWeekday = utcWeekday === 0 ? 7 : utcWeekday;

    // Retention sweep rides this cron rather than adding a fifth schedule to
    // vercel.json — but it MUST run before the early return below. Weekly
    // templates are due one day in seven, and with no active templates at all
    // the mint path never runs, so a sweep placed after that return would
    // never execute and the "Kept for 365 days" line on /admin/logs would be
    // a claim the code does not honour.
    //
    // 365 days: long enough to answer "what happened last time we ran this
    // campaign", short enough to be defensible under PIPEDA Principle 5.
    //
    // Awaited, unlike the activity writes: nobody is waiting on a cron, and a
    // silently failing sweep is how a table grows unbounded. Isolated in its
    // own try/catch so a sweep failure can't turn a successful mint into a
    // 500 that Vercel then retries — the rule the revalidate below follows.
    let swept = 0;
    try {
      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      swept = await deleteActivityBefore(cutoff);
    } catch (error) {
      warnings.push(
        reportCronStep('recurring-tasks', '[cron] activity sweep failed', error),
      );
    }

    // Dead session rows, same reasoning and the same isolation: with the
    // 24-hour idle window (src/lib/sessionPolicy.ts) every person leaves one
    // expired row a day, and Better Auth only cleans up the ones whose cookie
    // is presented late. See deleteExpiredSessions for why this bypasses the
    // auth adapter's hooks.
    // In the activity row this travels as `staleLoginsSwept`: the redaction
    // denylist (activityFields.ts) refuses any key containing "session", by
    // design, and a count is not worth an exception to it.
    let sessionsSwept = 0;
    try {
      sessionsSwept = await deleteExpiredSessions();
    } catch (error) {
      warnings.push(
        reportCronStep('recurring-tasks', '[cron] session sweep failed', error),
      );
    }

    const due = await listTemplatesDueOn(isoWeekday, day);
    if (due.length === 0) {
      // `activitySwept` rides BOTH exits, so the sweep is observable from the
      // cron response on the days nothing is minted.
      logSystemActivity('System', {
        area: 'cron',
        entity: 'cron',
        entityId: null,
        entityName: 'recurring-tasks',
        action: 'create',
        summary: 'Swept the activity log and expired sessions; no recurring tasks were due',
        payload: { count: 0, meta: { day: todayKey, activitySwept: swept, staleLoginsSwept: sessionsSwept } },
      });
      return {
        body: {
          day: todayKey,
          due: 0,
          created: 0,
          activitySwept: swept,
          sessionsSwept,
        },
        summary: 'No recurring tasks were due',
        warnings,
      };
    }

    const byTemplateId = new Map(due.map((t) => [t.id, t]));
    const rows = due.map((template) => ({
      title: template.title,
      notes: template.notes,
      clientId: template.clientId,
      categoryId: template.categoryId,
      status: 'todo' as const,
      priority: template.priority,
      createdByName: 'Recurring',
      estimatedMinutes: template.estimatedMinutes,
      startDate: todayKey,
      dueDate:
        template.dueOffsetDays === null
          ? null
          : shiftDayKey(todayKey, template.dueOffsetDays),
      templateId: template.id,
      templateRunKey: todayKey,
    }));

    // One statement, conflicts skipped by the partial unique index. `returning`
    // reports what was actually inserted, so a re-run honestly reports 0.
    const created = await db
      .insert(tasks)
      .values(rows)
      .onConflictDoNothing({
        target: [tasks.templateId, tasks.templateRunKey],
        // MANDATORY for a partial index: `where` here is the INDEX PREDICATE,
        // and without it Postgres can't match an index to the ON CONFLICT
        // target at all — it raises 42P10, so the whole mint throws instead of
        // skipping duplicates. Must stay identical to the index's own WHERE.
        where: isNotNull(tasks.templateId),
      })
      .returning({ id: tasks.id, templateId: tasks.templateId });

    // Crew the tasks that were actually minted. Keyed off `returning`, so a
    // re-run that inserted nothing also assigns nobody — the idempotency the
    // partial unique index gives the tasks is inherited here for free rather
    // than re-derived. A template whose members were all offboarded mints an
    // unassigned task: honest, and it shows up in the list for someone to
    // claim, which is better than skipping the work entirely.
    const crew = created.flatMap((task) => {
      const template = byTemplateId.get(task.templateId ?? '');
      return (template?.assignees ?? []).map((who) => ({
        taskId: task.id,
        userId: who.id,
        memberName: who.name,
      }));
    });
    if (crew.length > 0) await db.insert(taskAssignees).values(crew);

    // The tasks are already written; a failed cache invalidation must not turn
    // a successful mint into a 500 the platform then retries and reports as
    // broken. Log it and let the next admin navigation revalidate naturally.
    if (created.length > 0) {
      try {
        revalidatePath('/admin', 'layout');
      } catch (error) {
        warnings.push(
          reportCronStep(
            'recurring-tasks',
            '[cron] recurring tasks revalidate failed',
            error,
          ),
        );
      }
    }
    logSystemActivity('System', {
      area: 'cron',
      entity: 'cron',
      entityId: null,
      entityName: 'recurring-tasks',
      action: 'create',
      summary: `Minted ${created.length} recurring tasks`,
      payload: {
        count: created.length,
        meta: { day: todayKey, due: due.length, activitySwept: swept, staleLoginsSwept: sessionsSwept },
      },
    });

    return {
      body: {
        day: todayKey,
        due: due.length,
        created: created.length,
        activitySwept: swept,
        sessionsSwept,
      },
      summary: `Minted ${created.length} recurring ${created.length === 1 ? 'task' : 'tasks'}`,
      warnings,
    };
  });
}
