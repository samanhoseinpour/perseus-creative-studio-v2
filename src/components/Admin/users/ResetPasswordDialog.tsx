'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import PasswordStrengthMeter from '@/components/Admin/PasswordStrengthMeter';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { resetUserPassword } from '@/app/(admin)/admin/(protected)/_actions/users';
import { tempPasswordSchema } from '@/lib/usersSchema';
import { generateTempPassword } from './generateTempPassword';
import { cn } from '@/lib/utils';

/**
 * Superadmin-set temp password for a member — the ConfirmDialog glass shell
 * with one password field. The action also revokes the member's sessions;
 * the copy spells out that passkeys survive (offboarding = delete, not reset).
 */
export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  name,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  name: string;
  email: string;
}) {
  const [password, setPassword] = useState('');
  const [issue, setIssue] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function close(next: boolean) {
    if (pending) return;
    onOpenChange(next);
    if (!next) {
      setPassword('');
      setIssue(undefined);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = tempPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setIssue(parsed.error.issues[0]?.message);
      return;
    }
    setPending(true);
    const res = await safeAction(resetUserPassword(userId, parsed.data));
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Password reset — ${name} has been signed out everywhere.`);
    close(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <div
          data-lenis-prevent
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Content
              className={cn(
                'relative w-[min(92vw,26rem)] p-6',
                glassSurface,
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <GlassRim />
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                Reset password
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Set a new temporary password for {name}. This signs them out
                everywhere; passkeys they added still work — to fully revoke
                access, delete the account instead.
              </Dialog.Description>

              <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`reset-password-${userId}`}>
                      Temporary password
                    </Label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      showIcon={false}
                      disabled={pending}
                      onClick={() => {
                        setPassword(generateTempPassword());
                        setIssue(undefined);
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  <PasswordInput
                    id={`reset-password-${userId}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setIssue(undefined);
                    }}
                    autoComplete="new-password"
                    disabled={pending}
                    aria-invalid={issue ? true : undefined}
                    aria-describedby={
                      issue ? `reset-password-${userId}-error` : undefined
                    }
                  />
                  {issue && (
                    <p
                      id={`reset-password-${userId}-error`}
                      role="alert"
                      className="px-1 text-xs text-destructive"
                    >
                      {issue}
                    </p>
                  )}
                  <PasswordStrengthMeter
                    password={password}
                    email={email}
                    name={name}
                  />
                  <p className="px-1 text-xs text-muted-foreground">
                    Share it securely — they can change it on their profile
                    after signing in.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <Button
                    type="submit"
                    size="small"
                    shimmer={false}
                    showIcon={false}
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    {pending ? 'Resetting…' : 'Reset password'}
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
                </div>
              </form>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
