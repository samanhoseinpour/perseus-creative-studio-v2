import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { getFeedbackStats } from '@/db/adminQueries';
import { blogPosts } from '@/constants/blogs';
import { formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel, glassRowHover, adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'How readers rate each article.',
};

type FeedbackRow = {
  slug: string;
  title: string;
  href: string | null;
  up: number;
  down: number;
  total: number;
  helpfulPct: number | null;
  lastVoteAt: Date | null;
  datetime: string;
};

export default async function FeedbackPage() {
  await requireArea('feedback');

  const stats = await getFeedbackStats();
  const bySlug = new Map(stats.map((s) => [s.slug, s]));
  const knownSlugs = new Set(blogPosts.map((p) => p.slug));

  // Every published post gets a row (zero-vote rows double as a coverage
  // view); votes whose post left the registry surface as "(removed post)"
  // rather than erroring or vanishing.
  const rows: FeedbackRow[] = blogPosts.map((post) => {
    const stat = bySlug.get(post.slug);
    const up = stat?.up ?? 0;
    const down = stat?.down ?? 0;
    const total = up + down;
    return {
      slug: post.slug,
      title: post.title,
      href: `/blogs/${post.slug}`,
      up,
      down,
      total,
      helpfulPct: total ? Math.round((up / total) * 100) : null,
      lastVoteAt: stat?.lastVoteAt ?? null,
      datetime: post.datetime,
    };
  });
  for (const stat of stats) {
    if (knownSlugs.has(stat.slug)) continue;
    const total = stat.up + stat.down;
    rows.push({
      slug: stat.slug,
      title: `${stat.slug} (removed post)`,
      href: null,
      up: stat.up,
      down: stat.down,
      total,
      helpfulPct: total ? Math.round((stat.up / total) * 100) : null,
      lastVoteAt: stat.lastVoteAt,
      datetime: '',
    });
  }

  // Voted rows first (total desc, then freshest vote); zero-vote posts after,
  // newest publish first.
  rows.sort((a, b) => {
    if ((b.total > 0 ? 1 : 0) !== (a.total > 0 ? 1 : 0))
      return b.total > 0 ? 1 : -1;
    if (b.total !== a.total) return b.total - a.total;
    const aLast = a.lastVoteAt?.getTime() ?? 0;
    const bLast = b.lastVoteAt?.getTime() ?? 0;
    if (bLast !== aLast) return bLast - aLast;
    return b.datetime.localeCompare(a.datetime);
  });

  const totalVotes = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Journal
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Feedback
          </h1>
          <p className="text-sm text-muted-foreground">
            How readers rate each article — {totalVotes}{' '}
            {totalVotes === 1 ? 'vote' : 'votes'} so far.
          </p>
        </div>
      </header>

      <GlassPanel className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                <th scope="col" className="px-4 py-3 sm:px-5">
                  Post
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Helpful
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Not helpful
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  % helpful
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 text-right sm:px-5">
                  Last vote
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.slug}
                  className={cn(
                    'border-b border-foreground/5 last:border-b-0',
                    glassRowHover,
                  )}
                >
                  <td className="max-w-xs px-4 py-2.5 sm:px-5">
                    {row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'block truncate text-foreground',
                          adminLink,
                        )}
                        title={row.title}
                      >
                        {row.title}
                      </a>
                    ) : (
                      <span
                        className="block truncate text-muted-foreground"
                        title={row.title}
                      >
                        {row.title}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                    {row.up}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                    {row.down}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                    {row.helpfulPct === null ? '—' : `${row.helpfulPct}%`}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground">
                    {row.total}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground sm:px-5">
                    {row.lastVoteAt ? formatRelative(row.lastVoteAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
