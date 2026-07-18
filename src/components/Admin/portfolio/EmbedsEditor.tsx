'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuInstagram, LuTrash2, LuYoutube } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { glassChip } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import {
  addProjectEmbed,
  removeProjectMedia,
} from '@/app/(admin)/admin/(protected)/_actions/projects';
import { ChipGroup } from './PortfolioChips';
import {
  extractYouTubeId,
  normalizeInstagramUrl,
} from '@/lib/portfolioFields';
import { cn } from '@/lib/utils';

/** One stored embed, serialized by the editor page. */
export type EmbedItem = {
  id: string;
  kind: 'youtube' | 'instagram';
  ref: string;
};

const KIND_OPTIONS = [
  { slug: 'youtube', label: 'YouTube' },
  { slug: 'instagram', label: 'Instagram' },
] as const;

/**
 * The project's video embeds: paste a YouTube or Instagram link, it
 * normalizes to the stored ref (bare video id / canonical post URL) and
 * renders on the detail page through the existing embed components. The
 * first YouTube embed becomes the detail page's screening-room frame.
 */
export default function EmbedsEditor({
  projectId,
  items,
}: {
  projectId: string;
  items: EmbedItem[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<'youtube' | 'instagram'>('youtube');
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<EmbedItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    // Instant pre-check with the same normalizers the server uses.
    const normalized =
      kind === 'youtube' ? extractYouTubeId(ref) : normalizeInstagramUrl(ref);
    if (!normalized) {
      setError(
        kind === 'youtube'
          ? 'Paste a YouTube link (or the 11-character video id).'
          : 'Paste an Instagram post, reel, or IGTV link.',
      );
      return;
    }

    setPending(true);
    let res: Awaited<ReturnType<typeof addProjectEmbed>>;
    try {
      res = (await addProjectEmbed(projectId, { kind, ref })) ?? {
        ok: false,
        error: 'Add failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Add failed — try again.' };
    }
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRef('');
    toast.success('Video added.');
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    setDeletePending(true);
    let res: Awaited<ReturnType<typeof removeProjectMedia>>;
    try {
      res = (await removeProjectMedia(deleting.id)) ?? {
        ok: false,
        error: 'Delete failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Delete failed — try again.' };
    }
    setDeletePending(false);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Video removed.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onAdd} className="flex flex-col gap-3">
        <ChipGroup
          legend="Platform"
          options={KIND_OPTIONS}
          value={kind}
          onChange={(next) => {
            setError(null);
            setKind(next);
          }}
          disabled={pending}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="embed-ref">
            {kind === 'youtube' ? 'YouTube link or video id' : 'Instagram link'}
          </Label>
          <div className="flex gap-2">
            <Input
              id="embed-ref"
              value={ref}
              onChange={(e) => {
                setError(null);
                setRef(e.target.value);
              }}
              placeholder={
                kind === 'youtube'
                  ? 'https://www.youtube.com/watch?v=…'
                  : 'https://www.instagram.com/reel/…'
              }
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'embed-ref-error' : undefined}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              size="small"
              showIcon={false}
              disabled={pending || ref.trim() === ''}
            >
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {error && (
            <p id="embed-ref-error" role="alert" className="px-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </form>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-white/30 p-2 dark:bg-white/5"
            >
              <span
                className={cn(
                  'flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md',
                  glassChip,
                )}
              >
                {item.kind === 'youtube' ? (
                  // YouTube's own thumbnail service — the same source the
                  // public click-to-load facade uses.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://i.ytimg.com/vi/${item.ref}/default.jpg`}
                    alt=""
                    width={56}
                    height={40}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <LuInstagram className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  {item.kind === 'youtube' ? (
                    <LuYoutube className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <LuInstagram className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">
                    {item.kind === 'youtube' ? item.ref : item.ref.replace('https://www.instagram.com/', '')}
                  </span>
                  {index === 0 && item.kind === 'youtube' && (
                    <span className="shrink-0 rounded-full border border-foreground/15 bg-foreground/[0.06] px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                      Screening room
                    </span>
                  )}
                </span>
              </span>

              <button
                type="button"
                aria-label={`Remove ${item.kind} embed`}
                onClick={() => setDeleting(item)}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <LuTrash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !deletePending && !next && setDeleting(null)}
        title="Remove this video?"
        description="It disappears from the detail page immediately."
        confirmLabel="Remove video"
        onConfirm={onDelete}
        destructive
        pending={deletePending}
      />
    </div>
  );
}
