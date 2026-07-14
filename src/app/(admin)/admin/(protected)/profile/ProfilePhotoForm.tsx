'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuImagePlus, LuImageOff, LuLoaderCircle } from 'react-icons/lu';

import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { GlassPanel } from '@/components/Admin/Glass';
import {
  removeAvatar,
  updateAvatar,
} from '@/app/(admin)/admin/(protected)/_actions/avatar';
import { reduceAvatar } from '@/lib/reduceScreenshot';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { reducedSizeLine } from '@/lib/formatBytes';
import {
  AVATAR_ACCEPT,
  AVATAR_BAD_TYPE,
  avatarInputProblem,
  MAX_AVATAR_BYTES,
} from '@/lib/avatarFields';
import { sniffScreenshotKind } from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

/** Mirror of the resolver's AdminAvatar shape (adminIdentity is server-only). */
type AvatarProps = { src: string; blur?: string; mark?: boolean } | null;

/** Same three phases as the ticket form's screenshot handling. */
type PhotoState =
  | { phase: 'idle' }
  | { phase: 'processing'; name: string }
  | { phase: 'ready'; file: File; originalBytes: number; kept: boolean };

/**
 * Self-service profile photo: pick → client-side cover-crop/re-encode
 * (reduceAvatar) → truthful circular preview → explicit Save/Cancel. Nothing
 * uploads until Save, so abandoning a pick leaves zero server state. The
 * preview doubles as the decode check — a corrupt-but-sniffable file fails to
 * render, which blocks Save before any bytes travel. Unlike the sibling forms
 * this mutates through a server action (files can't ride authClient), which
 * revalidates the /admin layout; router.refresh() re-reads this page.
 */
export default function ProfilePhotoForm({
  avatar,
  name,
  hasUploadedAvatar,
}: {
  avatar: AvatarProps;
  name: string;
  hasUploadedAvatar: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Generation counter: replace/cancel while a reduce is in flight bumps it,
  // so the stale async result self-discards (the ticket form's shotGen idiom).
  const gen = useRef(0);
  const [state, setState] = useState<PhotoState>({ phase: 'idle' });
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  // Decode-check flag, keyed by URL so it self-resets on every new preview.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  const previewUrl = useObjectUrl(state.phase === 'ready' ? state.file : null);
  const previewBroken = previewUrl !== null && brokenUrl === previewUrl;
  const busy = pending || removing;

  async function onPick(picked: File | null) {
    if (!picked || busy) return;
    const g = ++gen.current;

    const problem = avatarInputProblem(picked);
    const kind = problem ? null : await sniffScreenshotKind(picked);
    if (g !== gen.current) return;
    if (problem || !kind) {
      setState({ phase: 'idle' });
      setError(problem ?? AVATAR_BAD_TYPE);
      return;
    }

    setError(undefined);
    setState({ phase: 'processing', name: picked.name });
    const result = await reduceAvatar(picked, kind);
    if (g !== gen.current) return; // cancelled/replaced meanwhile

    if (result.file.size > MAX_AVATAR_BYTES) {
      setState({ phase: 'idle' });
      setError(
        'Photo is still over 4 MB after optimizing — choose a smaller image.',
      );
      return;
    }
    setState({ phase: 'ready', ...result });
  }

  function onCancel() {
    gen.current++;
    setState({ phase: 'idle' });
    setError(undefined);
  }

  async function onSave() {
    if (state.phase !== 'ready' || busy || previewBroken) return;
    setPending(true);
    const fd = new FormData();
    fd.set('avatar', state.file);
    // A redirect from the gate resolves the action to undefined — treat it
    // like a server failure (the ticket form's null guard).
    const res = (await updateAvatar(fd)) ?? {
      ok: false as const,
      error: 'Could not update your photo — try again.',
    };
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    gen.current++;
    setState({ phase: 'idle' });
    toast.success('Profile photo updated.');
    router.refresh();
  }

  async function onRemove() {
    setRemoving(true);
    const res = (await removeAvatar()) ?? {
      ok: false as const,
      error: 'Could not remove your photo — try again.',
    };
    setRemoving(false);
    if (!res.ok) {
      toast.error(res.error);
      return; // keep the confirm open so they can retry or cancel
    }
    setConfirmOpen(false);
    toast.success('Profile photo removed.');
    router.refresh();
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Profile photo</h2>
        <p className="text-xs text-muted-foreground">
          Shown in the sidebar and on your account.
        </p>
      </div>

      {state.phase === 'processing' ? (
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <LuLoaderCircle
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          </span>
          <p
            role="status"
            className="min-w-0 flex-1 truncate text-sm text-foreground"
          >
            Optimizing {state.name}…
          </p>
          <Button
            type="button"
            variant="secondary"
            size="small"
            showIcon={false}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      ) : state.phase === 'ready' ? (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={cn(
              'relative inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border',
              (previewBroken || !previewUrl) && 'bg-muted',
            )}
          >
            {previewUrl && !previewBroken ? (
              // The optimized bytes themselves, in the same circular crop the
              // avatar renders with — WYSIWYG, and the decode check.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview of your new profile photo"
                width={56}
                height={56}
                draggable={false}
                onError={() => setBrokenUrl(previewUrl)}
                className="h-full w-full object-cover"
              />
            ) : previewBroken ? (
              // Broken glyph ONLY on a real decode failure — the first frame
              // before the object URL materializes stays a quiet muted circle.
              <LuImageOff
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {state.file.name}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {reducedSizeLine(state.file.size, state.originalBytes, state.kept)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="small"
              shimmer={false}
              showIcon={false}
              onClick={onSave}
              disabled={busy || previewBroken}
            >
              {pending ? 'Uploading…' : 'Save photo'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <AdminAvatar
            src={avatar?.src}
            blur={avatar?.blur}
            mark={avatar?.mark}
            name={name}
            size={56}
          />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {hasUploadedAvatar && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                className="text-destructive"
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              size="small"
              shimmer={false}
              icon={LuImagePlus}
              iconPosition="left"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {hasUploadedAvatar ? 'Change photo' : 'Upload photo'}
            </Button>
          </div>
        </div>
      )}

      {previewBroken && (
        <p role="alert" className="mt-3 px-1 text-xs text-destructive">
          That image can’t be displayed — try a different file.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 px-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        aria-label="Profile photo file"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          // Reset so re-picking the same filename fires onChange again.
          e.target.value = '';
          onPick(picked);
        }}
        className="sr-only"
        tabIndex={-1}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false);
        }}
        title="Remove profile photo?"
        description="Your account falls back to its default avatar."
        confirmLabel="Remove"
        destructive
        pending={removing}
        onConfirm={onRemove}
      />
    </GlassPanel>
  );
}
