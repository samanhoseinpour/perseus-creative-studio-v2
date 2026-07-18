'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ScreenshotDropzone, {
  type ShotState,
} from '@/components/Admin/tickets/ScreenshotDropzone';
import { uploadProjectMedia } from '@/app/(admin)/admin/(protected)/_actions/projects';
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

/** What the editor page knows about the current cover. */
export type CurrentCover =
  | { kind: 'media'; url: string; alt: string }
  | { kind: 'static'; url: string; alt: string }
  | null;

/**
 * The project's cover slot on the editor page. Seeded projects show their
 * static /images cover; uploading a replacement fans the pick into the full
 * master + width rungs + LQIP in the browser (reduceProjectImage), then one
 * uploadProjectMedia call stores the whole set as the kind='cover' media row
 * (which wins over the static path everywhere). Explicit save — an abandoned
 * pick leaves zero server state (the avatar dialog's principle).
 */
export default function CoverField({
  projectId,
  current,
}: {
  projectId: string;
  current: CurrentCover;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reduced, setReduced] = useState<ReducedProjectImage | null>(null);
  const [shot, setShot] = useState<ShotState>({ phase: 'idle' });
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Remove/replace mid-reduce: the stale async result self-discards.
  const gen = useRef(0);

  async function onPick(picked: File | null) {
    if (!picked || pending) return;
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
      setError('Could not read that image — try a different file.');
      return;
    }
    const totalBytes =
      result.full.file.size +
      result.rungs.reduce((sum, r) => sum + r.file.size, 0);
    if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
      setShot({ phase: 'idle' });
      setError('Image is still over 4 MB after optimizing — try a smaller image.');
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
    if (!reduced || pending) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set('projectId', projectId);
    fd.set('slot', 'cover');
    fd.set('alt', alt);
    fd.set('blur', reduced.blurDataUrl);
    fd.set('fullWidth', String(reduced.full.width));
    fd.set('fullHeight', String(reduced.full.height));
    fd.set('full', reduced.full.file);
    for (const rung of reduced.rungs) fd.set(`w${rung.width}`, rung.file);

    let res: Awaited<ReturnType<typeof uploadProjectMedia>>;
    try {
      res = (await uploadProjectMedia(fd)) ?? {
        ok: false,
        error: 'Upload failed — try again.',
      };
    } catch {
      res = { ok: false, error: 'Upload failed — try again.' };
    }
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success('Cover saved.');
    onClear();
    setAlt('');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {current && shot.phase === 'idle' && (
        <figure className="overflow-hidden rounded-xl border border-foreground/10">
          {/* Current cover (blob CDN or static /images path) — the alt below
              it is editable only via a replacement upload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            draggable={false}
            className="aspect-[16/10] w-full object-cover"
          />
          <figcaption className="px-3 py-2 text-xs text-muted-foreground">
            {current.kind === 'static'
              ? 'Current cover (original site asset) — upload to replace it.'
              : 'Current cover — upload to replace it.'}
          </figcaption>
        </figure>
      )}

      <ScreenshotDropzone
        state={shot}
        inputRef={inputRef}
        onPick={onPick}
        onClear={onClear}
        accept={PROJECT_IMAGE_ACCEPT}
        hint="PNG, JPEG, WebP, or AVIF — up to 15 MB, optimized into responsive sizes before upload"
        labelledBy="project-cover-label"
        describedBy={error ? 'project-cover-error' : undefined}
        invalid={!!error}
        disabled={pending}
      />

      {shot.phase === 'ready' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-cover-alt">Describe the image</Label>
            <Input
              id="project-cover-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. Aerial view of the Mystica 80 at sunset"
              maxLength={300}
              disabled={pending}
            />
            <p className="px-1 text-xs text-muted-foreground">
              Read by screen readers and search engines.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              onClick={onSave}
            >
              {pending ? 'Uploading…' : 'Save cover'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p id="project-cover-error" role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
