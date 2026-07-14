'use client';

import { useEffect, useState } from 'react';
import {
  LuThumbsUp as ThumbsUp,
  LuThumbsDown as ThumbsDown,
  LuCheck as Check,
} from 'react-icons/lu';
import Button from '@/components/Button';
import { cn } from '@/lib/utils';
import {
  submitArticleFeedback,
  type FeedbackVote,
} from '@/app/(marketing)/blogs/[blog]/actions';

// End-of-article "Was this article helpful?" widget — write-only for readers
// (tallies live in /admin/feedback), same as the Yoast/Rank Math pattern.
// Ships in the shared client chunk, so imports stay minimal: Button (direct
// path, never the barrel), two icons, cn, and the action stub. No zod, no
// registries.
//
// Vote lifecycle: optimistic. The choice paints and persists locally first,
// then the server action runs; a failed write reverts and invites a retry.
// Both buttons stay mounted after voting — the unchosen one is the visible
// vote-switch affordance (the server upserts on (client_id, slug)).

const STORE_KEY = 'perseus.feedback';

type FeedbackStore = {
  /** Durable per-browser token — the dedup identity for (client_id, slug). */
  id: string;
  votes: Record<string, FeedbackVote>;
};

// Private-mode Safari throws on localStorage access; votes still land with a
// per-session id, dedup is just weaker.
let memoryId: string | null = null;

function readStore(): FeedbackStore | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedbackStore;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      id: typeof parsed.id === 'string' ? parsed.id : '',
      votes:
        typeof parsed.votes === 'object' && parsed.votes !== null
          ? parsed.votes
          : {},
    };
  } catch {
    return null;
  }
}

function writeStore(store: FeedbackStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort — an unpersisted vote just means the widget resets on reload.
  }
}

function getClientId(): string {
  const stored = readStore();
  if (stored?.id) return stored.id;
  if (!memoryId) memoryId = crypto.randomUUID();
  const id = memoryId;
  writeStore({ id, votes: stored?.votes ?? {} });
  return id;
}

function persistVote(slug: string, vote: FeedbackVote | null) {
  const stored = readStore();
  const id = stored?.id || memoryId || crypto.randomUUID();
  memoryId = id;
  const votes = { ...(stored?.votes ?? {}) };
  if (vote) votes[slug] = vote;
  else delete votes[slug];
  writeStore({ id, votes });
}

// Voted copy confirms receipt (the vote is recorded and a human reads it),
// not just politeness — pairs with the eyebrow flipping to "Feedback received".
const MESSAGES: Record<'idle' | FeedbackVote | 'failed', string> = {
  idle: 'Was this article helpful?',
  up: 'Thanks — the team reads every vote.',
  down: 'Noted — we’ll use this to sharpen the article.',
  failed: 'Couldn’t save that — try again.',
};

const ArticleFeedback = ({ slug }: { slug: string }) => {
  // Starts null on server and client alike (no hydration mismatch); the mount
  // effect restores a prior vote from localStorage — intentional mount-gate
  // (warn-level rule), same pattern as NativeShareButton.
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stored = readStore()?.votes[slug];
    if (stored === 'up' || stored === 'down') setVote(stored);
  }, [slug]);

  const handleVote = async (next: FeedbackVote) => {
    if (next === vote) return;
    const prev = vote;
    setVote(next);
    setFailed(false);
    persistVote(slug, next);
    let ok = false;
    try {
      ok = (await submitArticleFeedback({
        slug,
        vote: next,
        clientId: getClientId(),
      })).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setVote(prev);
      persistVote(slug, prev);
      setFailed(true);
    }
  };

  const state = failed ? 'failed' : (vote ?? 'idle');
  const acknowledged = state === 'up' || state === 'down';

  return (
    <section
      aria-label="Article feedback"
      className="mt-12 border-t border-black/20 pt-6"
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/55">
            {acknowledged ? 'Feedback received' : 'Reader signal'}
          </p>
          {/* aria-live stays on the persistent wrapper; the keyed <p> remounts
              per state so the entrance animation replays on every change. */}
          <div aria-live="polite">
            <p
              key={state}
              className={cn(
                'mt-1 flex items-center gap-1.5 text-sm font-semibold text-black',
                state !== 'idle' &&
                  'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none',
              )}
            >
              {acknowledged && (
                <Check
                  aria-hidden
                  className="size-3.5 shrink-0 animate-in zoom-in-50 duration-300 motion-reduce:animate-none"
                />
              )}
              {MESSAGES[state]}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label="Rate this article"
          className="flex shrink-0 gap-2"
        >
          <Button
            variant="secondary"
            size="small"
            icon={ThumbsUp}
            iconPosition="left"
            aria-pressed={vote === 'up'}
            onClick={() => handleVote('up')}
            className={cn(
              vote === 'up' && 'border-black/40 bg-white/85 text-black',
            )}
          >
            Helpful
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={ThumbsDown}
            iconPosition="left"
            aria-pressed={vote === 'down'}
            onClick={() => handleVote('down')}
            className={cn(
              vote === 'down' && 'border-black/40 bg-white/85 text-black',
            )}
          >
            Not really
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ArticleFeedback;
