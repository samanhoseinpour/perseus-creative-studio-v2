'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuKeyRound, LuTrash2 } from 'react-icons/lu';

import Button from '@/components/Button';
import { GlassPanel, glassChip } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';

type Passkey = {
  id: string;
  label: string;
  deviceType: string;
  addedLabel: string | null;
};

export default function PasskeyManager({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  async function add() {
    setAdding(true);
    try {
      const res = await authClient.passkey.addPasskey();
      if (res?.error) {
        toast.error(res.error.message ?? 'Could not add passkey.');
      } else {
        toast.success('Passkey added — use it to sign in next time.');
        router.refresh();
      }
    } catch {
      toast.error('Passkey setup was cancelled.');
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setRemovingId(id);
    const res = await authClient.passkey.deletePasskey({ id });
    setRemovingId(null);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not remove passkey.');
      return; // keep the confirm open so they can retry or cancel
    }
    setConfirmTarget(null);
    toast.success('Passkey removed.');
    router.refresh();
  }

  const busy = adding || removingId !== null;

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Passkeys</h2>
          <p className="text-xs text-muted-foreground">
            Sign in with Face ID, Touch ID, or a security key instead of a
            password.
          </p>
        </div>
        <Button
          type="button"
          size="small"
          shimmer={false}
          icon={LuKeyRound}
          iconPosition="left"
          onClick={add}
          disabled={busy}
        >
          {adding ? 'Waiting…' : 'Add'}
        </Button>
      </div>

      {passkeys.length === 0 ? (
        <p className="rounded-lg border border-dashed border-foreground/15 px-4 py-6 text-center text-xs text-muted-foreground">
          No passkeys yet. Add one so you can sign in without your password.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/40 dark:divide-white/10">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  glassChip,
                )}
              >
                <LuKeyRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.deviceType === 'singleDevice' ? 'This device' : 'Synced'}
                  {p.addedLabel ? ` · Added ${p.addedLabel}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                onClick={() => setConfirmTarget({ id: p.id, label: p.label })}
                disabled={busy}
                aria-label={`Remove ${p.label}`}
                className="!px-2.5 text-destructive"
              >
                <LuTrash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmTarget(null);
        }}
        title="Remove passkey?"
        description={
          confirmTarget
            ? `You won't be able to sign in with "${confirmTarget.label}" after this.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        pending={removingId !== null}
        onConfirm={() => confirmTarget && remove(confirmTarget.id)}
      />
    </GlassPanel>
  );
}
