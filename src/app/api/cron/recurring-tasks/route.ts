import { isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { listTemplatesDueOn } from '@/db/taskQueries';
import { shiftDayKey, vancouverDayKey } from '@/lib/taskFilters';
import { logError } from '@/lib/log';
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
 * the list is noise. Verified by CRON_SECRET.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const todayKey = vancouverDayKey(new Date());
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
      logError('[cron] activity sweep failed', error);
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
        summary: 'Swept the activity log; no recurring tasks were due',
        payload: { count: 0, meta: { day: todayKey, activitySwept: swept } },
      });
      return Response.json({
        day: todayKey,
        due: 0,
        created: 0,
        activitySwept: swept,
      });
    }

    const rows = due.map((template) => ({
      title: template.title,
      notes: template.notes,
      clientId: template.clientId,
      categoryId: template.categoryId,
      status: 'todo' as const,
      priority: template.priority,
      assigneeId: template.assigneeId,
      // The snapshot column is NOT NULL and a template's owner may have been
      // offboarded (assigneeId SET NULL). "Unassigned" is honest and shows up
      // in the list for someone to claim — better than skipping the task.
      assigneeName: template.assigneeName ?? 'Unassigned',
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
      .returning({ id: tasks.id });

    // The tasks are already written; a failed cache invalidation must not turn
    // a successful mint into a 500 the platform then retries and reports as
    // broken. Log it and let the next admin navigation revalidate naturally.
    if (created.length > 0) {
      try {
        revalidatePath('/admin', 'layout');
      } catch (error) {
        logError('[cron] recurring tasks revalidate failed', error);
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
        meta: { day: todayKey, due: due.length, activitySwept: swept },
      },
    });

    return Response.json({
      day: todayKey,
      due: due.length,
      created: created.length,
      activitySwept: swept,
    });
  } catch (error) {
    logError('[cron] recurring tasks failed', error);
    return new Response('Recurring tasks failed', { status: 500 });
  }
}
