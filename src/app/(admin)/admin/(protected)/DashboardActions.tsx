'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuKeyRound, LuLogOut } from 'react-icons/lu';

import Button from '@/components/Button';
import { authClient } from '@/lib/auth-client';

export default function DashboardActions() {
  const router = useRouter();
  const [pending, setPending] = useState<'passkey' | 'signout' | null>(null);

  async function addPasskey() {
    setPending('passkey');
    try {
      const res = await authClient.passkey.addPasskey();
      if (res?.error) {
        toast.error(res.error.message ?? 'Could not add passkey.');
      } else {
        toast.success('Passkey added — use it to sign in next time.');
      }
    } catch {
      toast.error('Passkey setup was cancelled.');
    } finally {
      setPending(null);
    }
  }

  async function signOut() {
    setPending('signout');
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        onClick={addPasskey}
        disabled={pending !== null}
        icon={LuKeyRound}
        iconPosition="left"
        shimmer={false}
      >
        {pending === 'passkey' ? 'Waiting for device…' : 'Add a passkey'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={signOut}
        disabled={pending !== null}
        icon={LuLogOut}
        iconPosition="left"
      >
        Sign out
      </Button>
    </div>
  );
}
