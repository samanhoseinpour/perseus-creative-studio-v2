'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import { authClient } from '@/lib/auth-client';

export default function DisplayNameForm({
  initialName,
}: {
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const trimmed = name.trim();
  const unchanged = trimmed === initialName.trim();
  const tooShort = trimmed.length < 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort) {
      setError('Use at least 2 characters.');
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await authClient.updateUser({ name: trimmed });
    setPending(false);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not update your name.');
      return;
    }
    toast.success('Name updated.');
    // Re-run the server tree so the sidebar + greeting pick up the new name.
    router.refresh();
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Display name</h2>
        <p className="text-xs text-muted-foreground">
          Shown in the dashboard and on your account.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="display-name" className="sr-only">
            Display name
          </Label>
          <Input
            id="display-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(undefined);
            }}
            disabled={pending}
            maxLength={120}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'display-name-error' : undefined}
          />
          {error && (
            <p
              id="display-name-error"
              role="alert"
              className="px-1 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="small"
          shimmer={false}
          showIcon={false}
          disabled={pending || unchanged || tooShort}
          className="sm:w-auto"
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </GlassPanel>
  );
}
