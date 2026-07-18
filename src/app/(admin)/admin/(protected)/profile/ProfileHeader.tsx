'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import {
  LuCamera,
  LuImagePlus,
  LuImageOff,
  LuLoaderCircle,
} from 'react-icons/lu';

import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
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

/**
 * The photo dialog's phases. `closed` doubles as the header's resting state;
 * everything after a pick — optimizing, previewing, and every failure — lives
 * inside the one dialog so recovery never restarts from the menu.
 */
type PhotoState =
  | { phase: 'closed' }
  | { phase: 'processing'; name: string }
  | { phase: 'ready'; file: File; originalBytes: number; kept: boolean }
  | { phase: 'error'; message: string };

/** Menu items share the row recipe; radix flags hover AND keyboard focus as `data-highlighted`. */
const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10';

/**
 * Profile-page header where the avatar IS the photo control (the GitHub
 * pattern): a camera badge marks it interactive, clicking opens a glass menu —
 * Upload a photo… / Remove photo (the latter only once an uploaded photo
 * exists) — and a pick runs the ticket form's optimize flow inside a preview
 * dialog with an explicit Save, so nothing uploads until confirmed and an
 * abandoned pick leaves zero server state. Mutations go through server actions
 * (files can't ride authClient), which revalidate the /admin layout;
 * router.refresh() re-reads the server page around this header.
 */
export default function ProfileHeader({
  avatar,
  name,
  email,
  role,
  hasUploadedAvatar,
}: {
  avatar: AvatarProps;
  name: string;
  email: string;
  role: string;
  hasUploadedAvatar: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Generation counter: replace/cancel while a reduce is in flight bumps it,
  // so the stale async result self-discards (the ticket form's shotGen idiom).
  const gen = useRef(0);
  const [state, setState] = useState<PhotoState>({ phase: 'closed' });
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      setState({ phase: 'error', message: problem ?? AVATAR_BAD_TYPE });
      return;
    }

    setState({ phase: 'processing', name: picked.name });
    const result = await reduceAvatar(picked, kind);
    if (g !== gen.current) return; // cancelled/replaced meanwhile

    if (result.file.size > MAX_AVATAR_BYTES) {
      setState({
        phase: 'error',
        message:
          'Photo is still over 4 MB after optimizing — choose a smaller image.',
      });
      return;
    }
    setState({ phase: 'ready', ...result });
  }

  function onClose() {
    if (pending) return; // mid-upload: Esc/overlay must not orphan the save
    gen.current++;
    setState({ phase: 'closed' });
  }

  async function onSave() {
    if (state.phase !== 'ready' || busy || previewBroken) return;
    setPending(true);
    const fd = new FormData();
    fd.set('avatar', state.file);
    // A redirect from the gate resolves the action to undefined (the `??`),
    // while a dropped connection REJECTS the action's fetch (the catch) — a
    // stuck `pending` here would soft-lock the dialog, since onClose swallows
    // dismissal mid-upload. Same shape as NewTicketForm's submit.
    let res: Awaited<ReturnType<typeof updateAvatar>>;
    try {
      res = (await updateAvatar(fd)) ?? {
        ok: false as const,
        error: 'Could not update your photo — try again.',
      };
    } catch {
      res = {
        ok: false as const,
        error: 'Could not update your photo — try again.',
      };
    }
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    gen.current++;
    setState({ phase: 'closed' });
    toast.success('Profile photo updated.');
    router.refresh();
  }

  async function onRemove() {
    setRemoving(true);
    // Same reject-vs-redirect handling as onSave: `removing` must never stick.
    let res: Awaited<ReturnType<typeof removeAvatar>>;
    try {
      res = (await removeAvatar()) ?? {
        ok: false as const,
        error: 'Could not remove your photo — try again.',
      };
    } catch {
      res = {
        ok: false as const,
        error: 'Could not remove your photo — try again.',
      };
    }
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
    <header className="mb-8 flex items-center gap-4">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Change profile photo"
            disabled={busy}
            className="group relative flex shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring"
          >
            <AdminAvatar
              src={avatar?.src}
              blur={avatar?.blur}
              mark={avatar?.mark}
              name={name}
              size={72}
              className="ring-0"
            />
            {/* Always-visible affordance (touch has no hover) — the role
                chip's frost recipe, docked on the avatar's rim. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-white/50 bg-white/40 text-foreground backdrop-blur-sm transition-colors group-hover:bg-white/70 dark:border-white/12 dark:bg-white/10 dark:group-hover:bg-white/20"
            >
              <LuCamera className="size-3.5" />
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            className={cn(
              'relative z-50 min-w-44 p-1.5',
              glassSurface,
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            )}
          >
            <GlassRim />
            <DropdownMenu.Item
              className={cn(menuItem, 'text-foreground')}
              onSelect={() => inputRef.current?.click()}
            >
              <LuImagePlus
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              {hasUploadedAvatar ? 'Change photo…' : 'Upload a photo…'}
            </DropdownMenu.Item>
            {hasUploadedAvatar && (
              <DropdownMenu.Item
                className={cn(menuItem, 'text-destructive')}
                onSelect={() => setConfirmOpen(true)}
              >
                <LuImageOff className="size-4" aria-hidden="true" />
                Remove photo
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h1>
        <p className="text-sm text-muted-foreground">{email}</p>
        <span className="mt-1 w-fit rounded-full border border-white/50 bg-white/40 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10">
          {role}
        </span>
      </div>

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

      <Dialog.Root
        open={state.phase !== 'closed'}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          {/* Flex-centering scroll container — see ConfirmDialog. */}
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4"
          >
            <div className="flex min-h-full items-center justify-center">
              <Dialog.Content
                className={cn(
                  'relative w-[min(92vw,24rem)] p-6',
                  glassSurface,
                  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                )}
              >
                <GlassRim />
                <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                  Profile photo
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  Shown in the sidebar and on your account.
                </Dialog.Description>

                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  {state.phase === 'processing' ? (
                    <>
                      <span className="flex size-28 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                        <LuLoaderCircle
                          className="size-7 animate-spin text-muted-foreground"
                          aria-hidden="true"
                        />
                      </span>
                      <p
                        role="status"
                        className="w-full truncate text-sm text-foreground"
                      >
                        Optimizing {state.name}…
                      </p>
                    </>
                  ) : state.phase === 'ready' ? (
                    <>
                      <span
                        className={cn(
                          'relative flex size-28 items-center justify-center overflow-hidden rounded-full ring-1 ring-border',
                          (previewBroken || !previewUrl) && 'bg-muted',
                        )}
                      >
                        {previewUrl && !previewBroken ? (
                          // The optimized bytes themselves, in the same
                          // circular crop the avatar renders with — WYSIWYG,
                          // and the decode check.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt="Preview of your new profile photo"
                            width={112}
                            height={112}
                            draggable={false}
                            onError={() => setBrokenUrl(previewUrl)}
                            className="h-full w-full object-cover"
                          />
                        ) : previewBroken ? (
                          // Broken glyph ONLY on a real decode failure — the
                          // first frame before the object URL materializes
                          // stays a quiet muted circle.
                          <LuImageOff
                            className="size-7 text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                      <div className="w-full min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {state.file.name}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {reducedSizeLine(
                            state.file.size,
                            state.originalBytes,
                            state.kept,
                          )}
                        </p>
                      </div>
                      {previewBroken && (
                        <p role="alert" className="text-xs text-destructive">
                          That image can’t be displayed — try a different file.
                        </p>
                      )}
                    </>
                  ) : state.phase === 'error' ? (
                    <>
                      <span className="flex size-28 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                        <LuImageOff
                          className="size-7 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </span>
                      <p role="alert" className="text-sm text-destructive">
                        {state.message}
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                  {state.phase === 'ready' && !previewBroken ? (
                    <Button
                      type="button"
                      size="small"
                      shimmer={false}
                      showIcon={false}
                      onClick={onSave}
                      disabled={busy}
                      className="w-full sm:w-auto"
                    >
                      {pending ? 'Uploading…' : 'Save photo'}
                    </Button>
                  ) : state.phase !== 'processing' ? (
                    <Button
                      type="button"
                      size="small"
                      shimmer={false}
                      icon={LuImagePlus}
                      iconPosition="left"
                      onClick={() => inputRef.current?.click()}
                      disabled={busy}
                      className="w-full sm:w-auto"
                    >
                      Choose another file
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    onClick={onClose}
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </Dialog.Content>
            </div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

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
    </header>
  );
}
