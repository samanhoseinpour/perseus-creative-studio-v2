import { LuLink } from 'react-icons/lu';

import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassPanel } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { RowAvatar } from '@/components/Admin/tasks/types';

/**
 * The monthly report's presentational sections, shared verbatim between the
 * /admin/reports/[slug] dashboard (tone="glass") and its /print page
 * (tone="print"). Print tone uses LITERAL neutrals so `dark:` never applies
 * and backgrounds survive print without color-adjust hacks; every number
 * arrives pre-formatted from the server (hydration-safe, and the print page
 * renders the exact same strings the dashboard showed).
 */

export type ReportTone = 'glass' | 'print';

export type CategoryBarGroup = {
  label: string;
  hoursLabel: string;
  /** 0–100, server-computed against the month total (2% floor for slivers). */
  pct: number;
  fine: { label: string; hoursLabel: string; pct: number }[];
};

export type MemberBarRow = {
  /** Stable identity: assigneeId, or the name-keyed fallback for deleted
   *  accounts — NEVER the display name alone (a departed member's snapshot
   *  line and a same-named live account may both appear in one month). */
  key: string;
  name: string;
  /** Resolved face — rendered in glass tone only (the print page's literal
   *  neutrals can't host AdminAvatar's theme tokens); null → initials. */
  avatar: RowAvatar | null;
  tasksLabel: string;
  hoursLabel: string;
  /** Scaled to the top member. */
  pct: number;
};

export type ReportTaskItem = {
  id: string;
  title: string;
  deliverableUrl: string;
  categoryLabel: string;
  assigneeName: string;
  hoursLabel: string;
  completedLabel: string;
};

function Section({
  tone,
  title,
  children,
}: {
  tone: ReportTone;
  title: string;
  children: React.ReactNode;
}) {
  if (tone === 'print') {
    return (
      <section className="mt-8 break-inside-avoid">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
          {title}
        </h2>
        {children}
      </section>
    );
  }
  return (
    <section className="mt-6">
      <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <GlassPanel className="p-5 sm:p-6">{children}</GlassPanel>
    </section>
  );
}

const track = (tone: ReportTone) =>
  tone === 'print' ? 'bg-neutral-100' : 'bg-foreground/[0.08]';
const fill = (tone: ReportTone) =>
  tone === 'print' ? 'bg-neutral-900' : 'bg-foreground';
const primaryText = (tone: ReportTone) =>
  tone === 'print' ? 'text-neutral-900' : 'text-foreground';
const mutedText = (tone: ReportTone) =>
  tone === 'print' ? 'text-neutral-500' : 'text-muted-foreground';

/** Hours by service category — rolled up to the site's five service areas,
 *  fine-grained categories nested beneath. Bars are plain divs (no chart
 *  dep); the numbers are in the aria-label AND visible text, so the bar is
 *  redundant decoration. */
export function CategoryBars({
  tone,
  groups,
  totalLabel,
}: {
  tone: ReportTone;
  groups: CategoryBarGroup[];
  totalLabel: string;
}) {
  return (
    <Section tone={tone} title="Hours by service">
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn('font-medium', primaryText(tone))}>
                {group.label}
              </span>
              <span className={cn('tabular-nums', mutedText(tone))}>
                {group.hoursLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${group.label}: ${group.hoursLabel} of ${totalLabel}`}
              className={cn(
                'mt-1.5 h-2 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn('h-full rounded-full', fill(tone))}
                style={{ width: `${group.pct}%` }}
              />
            </div>
            {group.fine.length > 1 && (
              <div className="mt-2 flex flex-col gap-1.5 pl-4">
                {group.fine.map((fine) => (
                  <div key={fine.label}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className={mutedText(tone)}>{fine.label}</span>
                      <span className={cn('tabular-nums', mutedText(tone))}>
                        {fine.hoursLabel}
                      </span>
                    </div>
                    <div
                      role="img"
                      aria-label={`${fine.label}: ${fine.hoursLabel}`}
                      className={cn(
                        'mt-1 h-1 overflow-hidden rounded-full',
                        track(tone),
                      )}
                    >
                      <div
                        className={cn(
                          'h-full rounded-full',
                          tone === 'print' ? 'bg-neutral-400' : 'bg-foreground/50',
                        )}
                        style={{ width: `${fine.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Per-member contribution, scaled to the month's top contributor. */
export function MemberBars({
  tone,
  members,
}: {
  tone: ReportTone;
  members: MemberBarRow[];
}) {
  return (
    <Section tone={tone} title="Team on this account">
      <div className="flex flex-col gap-4">
        {members.map((member) => (
          <div key={member.key}>
            {/* items-center hosts the avatar in glass tone; print has no
                avatar, so it keeps the baseline grid of the other sections. */}
            <div
              className={cn(
                'flex justify-between gap-3 text-sm',
                tone === 'glass' ? 'items-center' : 'items-baseline',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {tone === 'glass' && (
                  <AdminAvatar
                    name={member.name}
                    size={22}
                    {...(member.avatar ?? {})}
                  />
                )}
                <span className={cn('truncate font-medium', primaryText(tone))}>
                  {member.name}
                </span>
              </span>
              <span className={cn('shrink-0 text-xs tabular-nums', mutedText(tone))}>
                {member.tasksLabel} · {member.hoursLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${member.name}: ${member.hoursLabel}`}
              className={cn(
                'mt-1.5 h-2 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn('h-full rounded-full', fill(tone))}
                style={{ width: `${member.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Delivered-vs-agreed when the client has a monthly retainer target. The
 *  numbers render as visible text; the bar caps at 100% with the overage
 *  called out beside it (the admin's amber accent — ticket-pending
 *  precedent — or plain ink in print). */
export function RetainerBar({
  tone,
  usedLabel,
  targetLabel,
  pct,
  overLabel,
}: {
  tone: ReportTone;
  usedLabel: string;
  targetLabel: string;
  /** Already capped at 100. */
  pct: number;
  /** e.g. "+3 h over" — empty when at/under target. */
  overLabel: string;
}) {
  return (
    <Section tone={tone} title="Retainer">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={cn('font-medium', primaryText(tone))}>
          {usedLabel} of {targetLabel}
        </span>
        {overLabel && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              tone === 'print'
                ? 'text-neutral-900'
                : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {overLabel}
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={`${usedLabel} of the ${targetLabel} monthly target`}
        className={cn('mt-2 h-2.5 overflow-hidden rounded-full', track(tone))}
      >
        <div
          className={cn('h-full rounded-full', fill(tone))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Section>
  );
}

/** The month's task list (feedback-page table recipe). */
export function ReportTaskTable({
  tone,
  tasks,
}: {
  tone: ReportTone;
  tasks: ReportTaskItem[];
}) {
  const headerCell = cn(
    'pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em]',
    mutedText(tone),
  );
  const border =
    tone === 'print'
      ? 'border-neutral-200'
      : 'border-white/40 dark:border-white/10';
  return (
    <Section tone={tone} title="Delivered work">
      <div
        {...(tone === 'glass' ? { 'data-lenis-prevent': true } : {})}
        className="overflow-x-auto"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className={cn('border-b', border)}>
              <th scope="col" className={headerCell}>
                Task
              </th>
              <th scope="col" className={headerCell}>
                Category
              </th>
              <th scope="col" className={headerCell}>
                Member
              </th>
              <th scope="col" className={cn(headerCell, 'text-right')}>
                Hours
              </th>
              <th scope="col" className={cn(headerCell, 'pr-0 text-right')}>
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={cn('border-b last:border-b-0', border)}
              >
                <td className={cn('max-w-96 py-2.5 pr-3', primaryText(tone))}>
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate">{task.title}</span>
                    {task.deliverableUrl && (
                      <a
                        href={task.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open deliverable for ${task.title}`}
                        className={cn(
                          'shrink-0 transition-colors print:hidden',
                          mutedText(tone),
                          tone === 'glass' && 'hover:text-foreground',
                        )}
                      >
                        <LuLink aria-hidden="true" className="size-3.5" />
                      </a>
                    )}
                  </span>
                </td>
                <td className={cn('whitespace-nowrap pr-3 text-xs', mutedText(tone))}>
                  {task.categoryLabel}
                </td>
                <td className={cn('whitespace-nowrap pr-3 text-xs', mutedText(tone))}>
                  {task.assigneeName}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap pr-3 text-right text-xs tabular-nums',
                    primaryText(tone),
                  )}
                >
                  {task.hoursLabel}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap pr-0 text-right text-xs tabular-nums',
                    mutedText(tone),
                  )}
                >
                  {task.completedLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
