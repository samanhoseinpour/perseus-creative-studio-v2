'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

import Button from '@/components/Button';
import ImgClient from '@/components/ImgClient';
import { MediaImage } from '@/components/ProjectMediaImage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ScreenshotDropzone, {
  type ShotState,
} from '@/components/Admin/tickets/ScreenshotDropzone';
import { uploadBlogMedia } from '@/app/(admin)/admin/(protected)/_actions/blogMedia';
import type { BlogMedia } from '@/db/schema';
import {
  reduceProjectImage,
  type ReducedProjectImage,
} from '@/lib/reduceScreenshot';
import {
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_FULL_MAX,
  PROJECT_IMAGE_RUNGS,
  projectImageInputProblem,
} from '@/lib/portfolioFields';
import { sniffScreenshotKind } from '@/lib/ticketFields';

/** The post's hero as the editor holds it: the seeded static asset, an
 *  uploaded set, or nothing yet. */
export type HeroValue =
  | { type: 'static'; src: string }
  | ({ type: 'media' } & BlogMedia)
  | null;

/**
 * The post's hero slot in the editor: the image, its alt text and its optional
 * caption.
 *
 * The upload flow is `CoverField`'s, unchanged in shape and for the same
 * reasons: one pick is fanned into the full master, the width rungs and an
 * LQIP in the BROWSER (`reduceProjectImage`), the whole ladder travels in one
 * action body, and the byte budget is checked here as well as on the server so
 * a doomed upload never leaves the machine. The `gen` ref is what makes a
 * remove or a second pick mid-reduce discard the stale async result instead of
 * letting it land on top of a newer one.
 *
 * The upload is EXPLICIT: an abandoned pick leaves zero server state, and
 * nothing is written to the post here. `uploadBlogMedia` returns the media
 * value and `onHeroChange` hands it to the editor's form state, which saves it
 * through the ordinary save door. One write path for post data.
 *
 * A Blob URL must never go through `<Img>`: `resolveImageSrc` swaps anything
 * outside `/images/` for the Perseus wordmark, so the field would show a logo
 * where the photograph is. Uploaded media renders through `MediaImage` (which
 * maps next/image's requested width onto the stored rungs) and a static path
 * through `ImgClient`.
 */
export default function HeroField({
  postId,
  hero,
  alt,
  caption,
  onHeroChange,
  onAltChange,
  onCaptionChange,
  disabled = false,
}: {
  postId: string;
  hero: HeroValue;
  alt: string;
  caption: string;
  onHeroChange: (media: BlogMedia) => void;
  onAltChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reduced, setReduced] = useState<ReducedProjectImage | null>(null);
  const [shot, setShot] = useState<ShotState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Remove/replace mid-reduce: the stale async result self-discards.
  const gen = useRef(0);
  const busy = pending || disabled;

  async function onPick(picked: File | null) {
    if (!picked || busy) return;
    const run = ++gen.current;
    setError(null);

    const problem = projectImageInputProblem(picked);
    const kind = problem ? null : await sniffScreenshotKind(picked);
    if (run !== gen.current) return;
    if (problem || !kind) {
      setShot({ phase: 'idle' });
      setError(problem ?? PROJECT_IMAGE_BAD_TYPE);
      return;
    }

    setShot({ phase: 'processing', name: picked.name });
    const result = await reduceProjectImage(picked, kind, {
      fullMax: PROJECT_IMAGE_FULL_MAX,
      rungWidths: PROJECT_IMAGE_RUNGS,
    });
    if (run !== gen.current) return;

    if (!result) {
      setShot({ phase: 'idle' });
      setError('Could not read that image. Try a different file.');
      return;
    }
    const totalBytes =
      result.full.file.size +
      result.rungs.reduce((sum, r) => sum + r.file.size, 0);
    if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
      setShot({ phase: 'idle' });
      setError('Image is still over 4 MB after optimizing. Try a smaller image.');
      return;
    }

    setReduced(result);
    setShot({
      phase: 'ready',
      file: result.full.file,
      originalBytes: result.originalBytes,
      kept: false,
    });
  }

  function onClear() {
    gen.current++;
    setReduced(null);
    setShot({ phase: 'idle' });
    setError(null);
  }

  async function onSave() {
    if (!reduced || busy) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set('postId', postId);
    fd.set('label', 'hero');
    fd.set('blur', reduced.blurDataUrl);
    fd.set('fullWidth', String(reduced.full.width));
    fd.set('fullHeight', String(reduced.full.height));
    fd.set('full', reduced.full.file);
    for (const rung of reduced.rungs) fd.set(`w${rung.width}`, rung.file);

    let res: Awaited<ReturnType<typeof uploadBlogMedia>>;
    try {
      res = (await uploadBlogMedia(fd)) ?? {
        ok: false,
        error: 'Upload failed. Try again.',
      };
    } catch {
      res = { ok: false, error: 'Upload failed. Try again.' };
    }
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onHeroChange(res.media);
    toast.success('Hero image ready. Save the post to keep it.');
    onClear();
  }

  return (
    <div className="flex flex-col gap-3">
      {hero && shot.phase === 'idle' && (
        <figure className="overflow-hidden rounded-xl border border-foreground/10">
          {hero.type === 'media' ? (
            <MediaImage
              variants={hero.variants}
              blurDataUrl={hero.blurDataUrl}
              alt={alt}
              sizes="(min-width: 768px) 640px, 100vw"
              className="aspect-[16/10] w-full rounded-none object-cover"
            />
          ) : (
            <ImgClient
              src={hero.src}
              alt={alt}
              width={960}
              height={600}
              sizes="(min-width: 768px) 640px, 100vw"
              className="aspect-[16/10] w-full rounded-none object-cover"
            />
          )}
          <figcaption className="px-3 py-2 text-xs text-muted-foreground">
            {hero.type === 'static'
              ? 'Current hero (original site asset). Upload to replace it.'
              : 'Current hero. Upload to replace it.'}
          </figcaption>
        </figure>
      )}

      <ScreenshotDropzone
        state={shot}
        inputRef={inputRef}
        onPick={onPick}
        onClear={onClear}
        accept={PROJECT_IMAGE_ACCEPT}
        hint="PNG, JPEG, WebP, or AVIF. Up to 15 MB, optimized into responsive sizes before upload"
        labelledBy="blog-hero-label"
        describedBy={error ? 'blog-hero-error' : undefined}
        invalid={!!error}
        disabled={busy}
      />

      {shot.phase === 'ready' && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="small"
            shimmer={false}
            showIcon={false}
            disabled={busy}
            onClick={onSave}
          >
            {pending ? 'Uploading…' : 'Use this image'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="blog-hero-alt">Describe the image</Label>
        <Input
          id="blog-hero-alt"
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="e.g. Drone shot of a West Vancouver house at dusk"
          maxLength={300}
          disabled={disabled}
        />
        <p className="px-1 text-xs text-muted-foreground">
          Read by screen readers and search engines. Needed before you publish.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="blog-hero-caption">Caption (optional)</Label>
        <Input
          id="blog-hero-caption"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Shown under the image on the post"
          maxLength={300}
          disabled={disabled}
        />
      </div>

      {error && (
        <p id="blog-hero-error" role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
