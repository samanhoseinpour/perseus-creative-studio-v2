'use server';

/**
 * "Was this article helpful?" vote — the blog's only public mutation.
 *
 * Mirrors contact/actions.ts conventions where they apply: importing the
 * `blogPosts` registry here is safe for the client bundle (server imports of
 * a 'use server' module never reach the browser — only the action reference
 * stub does), and unknown slugs get an indistinguishable success with nothing
 * stored (same philosophy as the contact bot traps: no junk rows, no signal
 * for scripts probing the action).
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
import { blogPosts } from '@/constants/blogs';

const VALID_SLUGS = new Set(blogPosts.map((p) => p.slug));
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
    // Unknown slug: indistinguishable success, nothing stored.
    if (typeof slug !== 'string' || !VALID_SLUGS.has(slug)) return { ok: true };

    await db
      .insert(articleFeedback)
      .values({ clientId, slug, vote })
      .onConflictDoUpdate({
        target: [articleFeedback.clientId, articleFeedback.slug],
        set: { vote, updatedAt: sql`now()` },
      });
    return { ok: true };
  } catch (error) {
    console.error('[feedback] vote failed', error);
    return { ok: false };
  }
}
