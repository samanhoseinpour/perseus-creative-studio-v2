'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuTarget } from 'react-icons/lu';

import { setClientRetainer } from '@/app/(admin)/admin/(protected)/_actions/tasks';
import { timeInputValue, parseHoursToMinutes } from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Set/clear a client's monthly retainer target (hours). Owns its trigger —
 * a quiet secondary button on the report header. 'reports'-gated server-side.
 */
export default function RetainerDialog({
  clientId,
  clientName,
  retainerMinutes,
}: {
  clientId: string;
  clientName: string;
  retainerMinutes: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(timeInputValue(retainerMinutes));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(minutes: number | null) {
    setPending(true);
    const res = await setClientRetainer(clientId, {
      retainerMinutes: minutes,
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error('Could not save the target — try again.');
      return;
    }
    toast.success(minutes === null ? 'Retainer target cleared.' : 'Retainer target saved.');
    setOpen(false);
    router.refresh();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseHoursToMinutes(value);
    if (minutes === null) {
      setError('Enter the monthly hours — like 40.');
      return;
    }
    void save(minutes);
  }

  return (
    <>
      <Button
        type="button"
        size="small"
        variant="secondary"
        icon={LuTarget}
        iconPosition="left"
        onClick={() => {
          setValue(timeInputValue(retainerMinutes));
          setError(null);
          setOpen(true);
        }}
      >
        {retainerMinutes === null ? 'Set target' : 'Target'}
      </Button>

      <GlassDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          Monthly retainer target
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {clientName} — agreed hours per month. The report shows
          delivered-vs-agreed.
        </Dialog.Description>

        <form onSubmit={onSubmit} className="mt-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retainer-hours">Hours per month</Label>
            <Input
              id="retainer-hours"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 40"
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'retainer-hours-error' : undefined}
            />
            {error && (
              <p
                id="retainer-hours-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : 'Save target'}
            </Button>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Dialog.Close>
            {retainerMinutes !== null && (
              <div className="flex flex-1 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  disabled={pending}
                  onClick={() => void save(null)}
                  className="text-destructive"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </form>
      </GlassDialog>
    </>
  );
}
