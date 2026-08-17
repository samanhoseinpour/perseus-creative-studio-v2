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

  /**
   * Single-flight latch. Deliberately a ref, NOT the `busy` state or the
   * controls' `disabled` attributes: those only take effect after a re-render,
   * so the first `await` in a handler still runs with everything enabled and a
   * second pick (or a Remove) could interleave — one run's `finally` would then
   * clear the other's spinner, and an interleaved Remove could null the row
   * moments after an upload wrote it. A ref flips synchronously, before any
   * await, so the losing call returns immediately. Every exit path clears it in
   * `finally`, so it cannot wedge the control the way a stuck state would.
   */
  const running = useRef(false);

  /** Async failures also toast: the dialog can be closed mid-flight, and an
   *  inline-only message would be unmounted before anyone read it. */
  function failLoudly(message: string) {
    setError(message);
    toast.error(message);
  }

  async function onPick(picked: File | null) {
    if (!picked || running.current) return;
    running.current = true;
    setError(null);

    try {
      setBusy('optimizing');
      // Inside the latch: the sniff is async, so validating out here (as this
      // used to) is exactly the unguarded window described above.
      const problem = projectImageInputProblem(picked);
      const kind = problem ? null : await sniffScreenshotKind(picked);
      if (problem || !kind) {
        // A rejected pick is a local, synchronous-feeling correction — inline
        // only, no toast; the dialog is necessarily still open.
        setError(problem ?? PROJECT_IMAGE_BAD_TYPE);
        return;
      }

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
        failLoudly(res.error);
        return;
      }
      toast.success('Logo updated.');
    } catch {
      // reduceImage is contracted never to throw, but the sniff can reject on a
      // file that vanished after selection (ejected volume, moved file) — and
      // onPick is fired unawaited from onChange, so without this the rejection
      // would be a silent no-op.
      failLoudly('Upload failed — try again.');
    } finally {
      running.current = false;
      setBusy('idle');
    }
  }

  async function onRemove() {
    if (running.current) return;
    running.current = true;
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
        failLoudly(res.error);
        return;
      }
      toast.success(
        hasDefaultLogo ? 'Reverted to the default mark.' : 'Logo removed.',
      );
    } catch {
      failLoudly('Remove failed — try again.');
    } finally {
      running.current = false;
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
