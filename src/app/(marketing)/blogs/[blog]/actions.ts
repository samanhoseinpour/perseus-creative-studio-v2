'use server';

/**
 * "Was this article helpful?" vote — the blog's only public mutation.
 *
 * Mirrors contact/actions.ts conventions where they apply: the slug passes a
 * shape gate first (the cap and charset the blog schema enforces, so junk
 * never costs a read), then an UNCACHED existence check against the published
 * rows (`publishedSlugExists` in @/db/blogQueries, never the cached store, so
 * a post published later is never refused for a TTL), and unknown slugs get
 * an indistinguishable success with nothing stored (same philosophy as the
 * contact bot traps: no junk rows, no signal for scripts probing the action).
 *
 * What it deliberately does NOT have:
 * - zod — the caller (ArticleFeedback) lives in the shared client chunk and
 *   three fields don't justify a schema module; validation is manual+narrow.
 * - honeypot / min-fill-time — those guard fillable form surfaces; a
 *   two-button widget has none. The unique (client_id, slug) constraint is
 *   the dedup backstop, and a Vercel WAF rule is the abuse plan (repo
 *   convention, see CLAUDE.md on /contact).
 * - revalidatePath — the public page shows no counts, and the protected
 *   /admin/feedback page renders at request time anyway.
 *
 * Vote switching is allowed: the upsert forgives misclicks, makes retries of
 * the same vote a natural no-op, and lets a transiently failed write
 * self-heal on the next toggle. created_at keeps the first-vote time;
 * updated_at tracks the switch.
 */
import { sql } from 'drizzle-orm';
import { articleFeedback, db } from '@/db';
import { publishedSlugExists } from '@/db/blogQueries';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE } from '@/lib/portfolioFields';
import { reportError } from '@/lib/monitoringRecord';

// crypto.randomUUID() shape with room for fallback ids — same charset gate
// idea as the contact client_id.
const CLIENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export type FeedbackVote = 'up' | 'down';
export type SubmitFeedbackResult = { ok: boolean };

export async function submitArticleFeedback(input: {
  slug: string;
  vote: FeedbackVote;
  clientId: string;
}): Promise<SubmitFeedbackResult> {
  try {
    if (typeof input !== 'object' || input === null) return { ok: false };
    const { slug, vote, clientId } = input;
    if (vote !== 'up' && vote !== 'down') return { ok: false };
    if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId))
      return { ok: false };
    // Unknown slug: indistinguishable success, nothing stored. The shape gate
    // runs first (no read for junk); the existence check is UNCACHED so a post
    // published later is never refused for a TTL.
    if (typeof slug !== 'string' || slug.length > PORTFOLIO_SLUG_MAX || !PORTFOLIO_SLUG_RE.test(slug)) return { ok: true };
    if (!(await publishedSlugExists(slug))) return { ok: true };

    await db
      .insert(articleFeedback)
      .values({ clientId, slug, vote })
      .onConflictDoUpdate({
        target: [articleFeedback.clientId, articleFeedback.slug],
        set: { vote, updatedAt: sql`now()` },
      });
    return { ok: true };
  } catch (error) {
    reportError('[feedback] vote failed', error);
    return { ok: false };
  }
}
