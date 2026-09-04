'use client';

import { useEffect, useId, useState } from 'react';
import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  YOUTUBE_ID_RE,
  extractYouTubeId,
  normalizeInstagramUrl,
} from '@/lib/portfolioFields';

export type EmbedKind = 'youtube' | 'instagram';

type InstagramType = 'p' | 'reel' | 'tv';

export type EmbedValue =
  | { kind: 'youtube'; id: string; external: boolean }
  | { kind: 'instagram'; id: string; type: InstagramType };

type Props = {
  kind: EmbedKind | null;
  onClose: () => void;
  onInsert: (value: EmbedValue) => void;
};

/**
 * Collects what a `youtube` or `instagram` node needs BEFORE the node exists.
 *
 * That order is the whole point. Both nodes are atoms whose id the zod layer
 * requires (`YOUTUBE_ID_RE`, and Instagram's own charset), so inserting an
 * empty one and filling it in afterwards would leave the writer with a
 * document that refuses to save and an error pointing at a block they thought
 * they had finished.
 *
 * THE OWNERSHIP TOGGLE IS NOT A DETAIL. `external: false` makes the public
 * page emit a VideoObject claiming the video as ours, so it is asked here and
 * defaults to OFF: the harm of falsely claiming someone else's video runs one
 * way only, and a writer embedding their own work is the one who knows.
 */
export default function EmbedDialog({ kind, onClose, onInsert }: Props) {
  const fieldId = useId();
  const [raw, setRaw] = useState('');
  const [ours, setOurs] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setRaw('');
    setOurs(false);
  }, [kind]);

  const value = kind === null ? null : resolve(kind, raw);
  const problem =
    raw.trim() === ''
      ? null
      : value === null
        ? kind === 'youtube'
          ? 'That is not a YouTube link or video id.'
          : 'That is not an Instagram post, reel or IGTV link.'
        : null;

  function insert() {
    if (!value) return;
    onInsert(value.kind === 'youtube' ? { ...value, external: !ours } : value);
  }

  return (
    <GlassDialog
      open={kind !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      maxWidth="28rem"
      header={
        <div className="px-5 pt-5 pb-3">
          <Dialog.Title className="text-base font-semibold">
            {kind === 'instagram' ? 'Add an Instagram post' : 'Add a YouTube video'}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            {kind === 'instagram'
              ? 'Paste the link to the post, reel or IGTV video.'
              : 'Paste the watch link, the share link, or the 11 character video id.'}
          </Dialog.Description>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2 border-t border-white/40 px-5 py-3 dark:border-white/10">
          <Button
            type="button"
            size="compact"
            variant="secondary"
            shimmer={false}
            showIcon={false}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="compact"
            shimmer={false}
            showIcon={false}
            disabled={value === null}
            onClick={insert}
          >
            Insert
          </Button>
        </div>
      }
      className="px-5 pb-4"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>Link</Label>
          <Input
            id={fieldId}
            value={raw}
            autoFocus
            onChange={(event) => setRaw(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && value) {
                event.preventDefault();
                insert();
              }
            }}
            placeholder={
              kind === 'instagram'
                ? 'https://www.instagram.com/reel/…'
                : 'https://www.youtube.com/watch?v=…'
            }
            aria-invalid={problem !== null}
            aria-describedby={problem ? `${fieldId}-error` : undefined}
          />
          {problem && (
            <p id={`${fieldId}-error`} role="alert" className="px-1 text-xs text-destructive">
              {problem}
            </p>
          )}
        </div>

        {kind === 'youtube' && (
          <label className="flex items-start gap-2.5 text-xs">
            <input
              type="checkbox"
              checked={ours}
              onChange={(event) => setOurs(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-foreground"
            />
            <span>
              <span className="font-medium">This video is on the Perseus channel.</span>
              <span className="mt-0.5 block text-muted-foreground">
                Tick it only for our own work. It tells search engines the post is the
                video&rsquo;s home page, which is a claim we should not make about
                somebody else&rsquo;s upload.
              </span>
            </span>
          </label>
        )}
      </div>
    </GlassDialog>
  );
}

/** Both ids, parsed through the shared portfolio helpers rather than a second
 *  regex: `extractYouTubeId` already knows watch, share, shorts, embed and
 *  live URLs, and it ends on the same `YOUTUBE_ID_RE` the zod layer applies. */
function resolve(kind: EmbedKind, raw: string): EmbedValue | null {
  const value = raw.trim();
  if (value === '') return null;
  if (kind === 'youtube') {
    const id = extractYouTubeId(value);
    return id && YOUTUBE_ID_RE.test(id) ? { kind, id, external: true } : null;
  }
  // Canonicalised first so one parser owns what an Instagram URL is; the
  // canonical form is `https://www.instagram.com/(p|reel|tv)/<id>/`, which is
  // why this match is on the OUTPUT rather than on what was typed.
  const canonical = normalizeInstagramUrl(value);
  const match = canonical?.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]{1,64})\/$/);
  return match ? { kind, id: match[2], type: match[1] as InstagramType } : null;
}
