'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuCopy, LuLink } from 'react-icons/lu';

import {
  mintReportShare,
  revokeReportShare,
} from '@/app/(admin)/admin/(protected)/_actions/tasks';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';

type ShareInfo = { id: string; url: string };

/**
 * Mint / copy / regenerate / revoke the public share link for one
 * client-month report (RetainerDialog recipe: owns its trigger, GlassDialog,
 * 'reports'-gated server-side). The link is LIVE — revoking 404s it on the
 * next request; regenerating revokes and mints a fresh token.
 */
export default function ReportShareDialog({
  clientId,
  month,
  monthLabelText,
  clientName,
  share,
}: {
  clientId: string;
  month: string;
  monthLabelText: string;
  clientName: string;
  /** The active link, resolved server-side; null = none yet. */
  share: ShareInfo | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // undefined = trust the server prop; set after a mint/revoke so the dialog
  // reflects the action without waiting for the next server render.
  const [local, setLocal] = useState<ShareInfo | null | undefined>(undefined);
  const active = local === undefined ? share : local;

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  }

  async function mint(copyAfter: boolean) {
    setPending(true);
    const res = await mintReportShare(clientId, month).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error(res && !res.ok ? res.error : 'Could not create the link. Try again.');
      return;
    }
    setLocal({ id: res.id, url: res.url });
    if (copyAfter) void copy(res.url);
  }

  async function revoke(thenMint: boolean) {
    if (!active) return;
    setPending(true);
    const res = await revokeReportShare(active.id).catch(() => null);
    if (!res?.ok) {
      setPending(false);
      toast.error(res && !res.ok ? res.error : 'Could not revoke the link. Try again.');
      return;
    }
    setLocal(null);
    if (thenMint) {
      const minted = await mintReportShare(clientId, month).catch(() => null);
      setPending(false);
      if (!minted?.ok) {
        toast.error('The old link is revoked, but a new one could not be created. Try again.');
        return;
      }
      setLocal({ id: minted.id, url: minted.url });
      toast.success('New link created. The old one no longer works.');
      return;
    }
    setPending(false);
    toast.success('Link revoked.');
  }

  return (
    <>
      <Button
        type="button"
        size="small"
        variant="secondary"
        icon={LuLink}
        iconPosition="left"
        onClick={() => {
          // Re-trust the server prop on every open (the RetainerDialog /
          // ReportHighlights rule). `local` is an optimistic overlay for the
          // mint/revoke just performed — but MonthSwitcher navigates to
          // ?month= on the same route, so this instance (and its state)
          // survives the switch, and a stale overlay showed July's link under
          // August's heading, where "Regenerate" revoked July's live link.
          setLocal(undefined);
          setOpen(true);
        }}
      >
        Share
      </Button>

      <GlassDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          Share this report
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {clientName}, {monthLabelText}. Anyone with the link can view this
          month&apos;s report (read-only, live numbers). Revoke it any time.
        </Dialog.Description>

        {active ? (
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={active.url}
                aria-label="Share link"
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 flex-1 text-xs"
              />
              <Button
                type="button"
                size="small"
                variant="secondary"
                icon={LuCopy}
                iconPosition="left"
                disabled={pending}
                onClick={() => void copy(active.url)}
              >
                Copy
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="small"
                variant="secondary"
                showIcon={false}
                disabled={pending}
                onClick={() => void revoke(true)}
              >
                Regenerate
              </Button>
              <Button
                type="button"
                size="small"
                variant="secondary"
                showIcon={false}
                disabled={pending}
                onClick={() => void revoke(false)}
                className="text-destructive"
              >
                Revoke
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Button
              type="button"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              onClick={() => void mint(true)}
            >
              {pending ? 'Creating…' : 'Create share link'}
            </Button>
          </div>
        )}
      </GlassDialog>
    </>
  );
}
