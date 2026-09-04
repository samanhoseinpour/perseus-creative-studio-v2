'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import ScreenshotDropzone, {
  type ShotState,
} from '@/components/Admin/tickets/ScreenshotDropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadBlogMedia } from '@/app/(admin)/admin/(protected)/_actions/blogMedia';
import type { BlogMedia } from '@/db/schema';
import {
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_FULL_MAX,
  PROJECT_IMAGE_RUNGS,
  projectImageInputProblem,
} from '@/lib/portfolioFields';
import { reduceProjectImage, type ReducedProjectImage } from '@/lib/reduceScreenshot';
import { sniffScreenshotKind } from '@/lib/ticketFields';

export type FigureValue = {
  media: BlogMedia;
  alt: string;
  caption: string | null;
  credit: string | null;
};

type Props = {
  postId: string;
  open: boolean;
  onClose: () => void;
  onInsert: (value: FigureValue) => void;
};

/**
 * Upload one body image and hand back a complete `figure` node's worth of
 * attributes.
 *
 * The upload flow is `HeroField`'s, unchanged and for the same reasons: one
 * pick is fanned into the master, the width rungs and an LQIP in the BROWSER,
 * the whole ladder travels in one action body, and the byte budget is checked
 * here as well as on the server so a doomed upload never leaves the machine.
 * The `gen` ref discards a stale reduce when the writer picks again.
 *
 * ALT TEXT IS REQUIRED HERE because the zod layer requires it: `figure.alt` is
 * `shortText.min(1)`, so a figure inserted without it makes the whole document
 * unsavable, and the error would point at a node the writer thought was done.
 * Asking now is the only place the question is cheap.
 */
export default function FigureDialog({ postId, open, onClose, onInsert }: Props) {
  const altId = useId();
  const captionId = useId();
  const creditId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gen = useRef(0);
  const [reduced, setReduced] = useState<ReducedProjectImage | null>(null);
  const [shot, setShot] = useState<ShotState>({ phase: 'idle' });
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [credit, setCredit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    gen.current++;
    setReduced(null);
    setShot({ phase: 'idle' });
    setAlt('');
    setCaption('');
    setCredit('');
    setError(null);
    setPending(false);
  }, [open]);

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
      setError('Could not read that image. Try a different file.');
      return;
    }
    const totalBytes =
      result.full.file.size + result.rungs.reduce((sum, r) => sum + r.file.size, 0);
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

  async function upload() {
    if (!reduced || pending || alt.trim() === '') return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set('postId', postId);
    fd.set('label', 'figure');
    fd.set('blur', reduced.blurDataUrl);
    fd.set('fullWidth', String(reduced.full.width));
    fd.set('fullHeight', String(reduced.full.height));
    fd.set('full', reduced.full.file);
    for (const rung of reduced.rungs) fd.set(`w${rung.width}`, rung.file);

    let res: Awaited<ReturnType<typeof uploadBlogMedia>>;
    try {
      res = (await uploadBlogMedia(fd)) ?? { ok: false, error: 'Upload failed. Try again.' };
    } catch {
      res = { ok: false, error: 'Upload failed. Try again.' };
    }
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onInsert({
      media: res.media,
      alt: alt.trim(),
      caption: caption.trim() || null,
      credit: credit.trim() || null,
    });
  }

  const ready = reduced !== null && alt.trim() !== '' && !pending;

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      maxWidth="30rem"
      header={
        <div className="px-5 pt-5 pb-3">
          <Dialog.Title className="text-base font-semibold">Add an image</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            It is optimized in your browser, then stored with the post.
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
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="compact"
            shimmer={false}
            showIcon={false}
            disabled={!ready}
            onClick={upload}
          >
            {pending ? 'Uploading' : 'Insert image'}
          </Button>
        </div>
      }
      className="px-5 pb-4"
    >
      <div className="flex flex-col gap-4">
        <ScreenshotDropzone
          state={shot}
          inputRef={inputRef}
          onPick={onPick}
          onClear={onClear}
          accept={PROJECT_IMAGE_ACCEPT}
          hint="PNG, JPEG, WebP, or AVIF. Up to 15 MB, optimized into responsive sizes before upload"
          // The hero field mounts a dropzone on the same page, and two inputs
          // sharing one id send every label to the first of them.
          inputId="blog-figure-input"
          describedBy={error ? `${altId}-error` : undefined}
          invalid={!!error}
          disabled={pending}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor={altId}>Describe the image</Label>
          <Input
            id={altId}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="e.g. Two camera operators setting up on a Vancouver street"
            maxLength={300}
            disabled={pending}
          />
          <p className="px-1 text-xs text-muted-foreground">
            Read by screen readers and search engines. Required.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={captionId}>Caption (optional)</Label>
          <Input
            id={captionId}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Shown under the image"
            maxLength={2000}
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={creditId}>Credit (optional)</Label>
          <Input
            id={creditId}
            value={credit}
            onChange={(event) => setCredit(event.target.value)}
            placeholder="Who took it"
            maxLength={2000}
            disabled={pending}
          />
        </div>

        {error && (
          <p id={`${altId}-error`} role="alert" className="px-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </GlassDialog>
  );
}
