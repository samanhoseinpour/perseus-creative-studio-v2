'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { LuBuilding2, LuLoaderCircle } from 'react-icons/lu';

import Button from '@/components/Button';
import { glassChip } from '@/components/Admin/Glass';
import {
  removeClientLogo,
  uploadClientLogo,
} from '@/app/(admin)/admin/(protected)/_actions/clients';
import { reduceImage } from '@/lib/reduceScreenshot';
import {
  CLIENT_LOGO_MAX_DIMENSION,
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_BAD_TYPE,
  projectImageInputProblem,
} from '@/lib/portfolioFields';
import { sniffScreenshotKind } from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

/**
 * The client's mark inside the edit dialog: current logo (uploaded blob or
 * the seeded static path) with upload / replace / remove. A pick is reduced
 * in the browser first (reduceImage: contained ≤512 — marks are never
 * cropped), then posts through uploadClientLogo; the sniff on both sides
 * stays authoritative. Uploads apply immediately (no separate save step —
 * the dialog's Save only covers the text fields).
 */
export default function ClientLogoField({
  clientId,
  logoUrl,
  hasUploadedLogo,
  hasDefaultLogo,
}: {
  clientId: string;
  /** Current mark: uploaded blob URL, seeded /images path, or null. */
  logoUrl: string | null;
  /** Only an uploaded mark can be cleared. */
  hasUploadedLogo: boolean;
  /** A seeded static mark sits underneath the upload, so clearing REVEALS it
   *  rather than leaving the client markless — the affordance says so. */
  hasDefaultLogo: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'idle' | 'optimizing' | 'uploading' | 'removing'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  // One operation at a time: the file input and both buttons are disabled
  // while `busy`, so a pick can't land mid-flight and there's no stale run to
  // discard. Every path returns to 'idle' via finally — a wedged non-idle
  // state would leave Upload/Change/Clear permanently disabled.
  async function onPick(picked: File | null) {
    if (!picked || busy !== 'idle') return;
    setError(null);

    const problem = projectImageInputProblem(picked);
    const kind = problem ? null : await sniffScreenshotKind(picked);
    if (problem || !kind) {
      setError(problem ?? PROJECT_IMAGE_BAD_TYPE);
      return;
    }

    try {
      setBusy('optimizing');
      const reduced = await reduceImage(picked, kind, {
        maxDimension: CLIENT_LOGO_MAX_DIMENSION,
      });
      if (reduced.file.size > MAX_PROJECT_UPLOAD_BYTES) {
        setError('Logo is still over 4 MB after optimizing — try a smaller image.');
        return;
      }

      setBusy('uploading');
      const fd = new FormData();
      fd.set('clientId', clientId);
      fd.set('logo', reduced.file);
      let res: Awaited<ReturnType<typeof uploadClientLogo>>;
      try {
        res = (await uploadClientLogo(fd)) ?? { ok: false, error: 'Upload failed — try again.' };
      } catch {
        res = { ok: false, error: 'Upload failed — try again.' };
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success('Logo updated.');
    } catch {
      // reduceImage is contracted never to throw and the action call is already
      // guarded, so this is the unforeseen case — surfaced rather than left as
      // an unhandled rejection (onPick is fired unawaited from onChange).
      setError('Upload failed — try again.');
    } finally {
      setBusy('idle');
    }
  }

  async function onRemove() {
    if (busy !== 'idle') return;
    setError(null);
    try {
      setBusy('removing');
      let res: Awaited<ReturnType<typeof removeClientLogo>>;
      try {
        res = (await removeClientLogo(clientId)) ?? { ok: false, error: 'Remove failed — try again.' };
      } catch {
        res = { ok: false, error: 'Remove failed — try again.' };
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(
        hasDefaultLogo ? 'Reverted to the default mark.' : 'Logo removed.',
      );
    } catch {
      setError('Remove failed — try again.');
    } finally {
      setBusy('idle');
    }
  }

  const working = busy !== 'idle';

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Logo</span>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full',
            glassChip,
          )}
        >
          {working ? (
            <LuLoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : logoUrl ? (
            // Raw mark bytes (blob CDN or static path) — decorative here; the
            // dialog's client name is the accessible label.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              width={56}
              height={56}
              draggable={false}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <LuBuilding2 className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            showIcon={false}
            disabled={working}
            onClick={() => inputRef.current?.click()}
          >
            {busy === 'optimizing'
              ? 'Optimizing…'
              : busy === 'uploading'
                ? 'Uploading…'
                : logoUrl
                  ? 'Change'
                  : 'Upload'}
          </Button>
          {hasUploadedLogo && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              disabled={working}
              onClick={onRemove}
            >
              {busy === 'removing'
                ? hasDefaultLogo
                  ? 'Reverting…'
                  : 'Removing…'
                : hasDefaultLogo
                  ? 'Revert to default'
                  : 'Remove'}
            </Button>
          )}
        </div>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        Shown on project cards and the logo marquee. PNG, JPEG, WebP, or AVIF —
        never cropped, optimized before upload.
        {hasUploadedLogo && hasDefaultLogo
          ? ' Reverting restores this client’s original seeded mark.'
          : ''}
      </p>
      {error && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_IMAGE_ACCEPT}
        aria-label="Logo file"
        disabled={working}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = '';
          onPick(picked);
        }}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
