'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { deleteAdminUser } from '@/app/(admin)/admin/(protected)/_actions/users';
import type { AdminArea } from '@/lib/adminAreas';
import AreaToggles from './AreaToggles';
import ResetPasswordDialog from './ResetPasswordDialog';
import { cn } from '@/lib/utils';

export type UserRowProps = {
  id: string;
  name: string;
  email: string;
  superadmin: boolean;
  areas: AdminArea[];
  avatar: { src: string; blur?: string; mark?: boolean } | null;
  passkeys: number;
  createdLabel: string;
  lastActiveLabel: string | null;
  isSelf: boolean;
};

const pill =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide';
const frostedPill = cn(
  pill,
  'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
);

/**
 * One account row: identity + meta up top, the access controls beneath.
 * Superadmin rows are read-only by design — the server actions refuse them
 * too, so nothing here is load-bearing; members get live area chips plus
 * reset-password and delete (both behind glass dialogs).
 */
export default function UserRow({
  id,
  name,
  email,
  superadmin,
  areas,
  avatar,
  passkeys,
  createdLabel,
  lastActiveLabel,
  isSelf,
}: UserRowProps) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function onDelete() {
    setDeletePending(true);
    const res = await safeAction(deleteAdminUser(id));
    setDeletePending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Account deleted.');
    setDeleteOpen(false);
    router.refresh();
  }

  const meta = [
    `${passkeys} ${passkeys === 1 ? 'passkey' : 'passkeys'}`,
    `Joined ${createdLabel}`,
    lastActiveLabel ? `Active ${lastActiveLabel}` : 'Never signed in',
  ].join(' · ');

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-3.5">
        <AdminAvatar
          src={avatar?.src}
          blur={avatar?.blur}
          mark={avatar?.mark}
          name={name}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {name}
            </span>
            {superadmin && (
              <span
                className={cn(pill, 'border-transparent bg-foreground text-background')}
              >
                Superadmin
              </span>
            )}
            {isSelf && <span className={frostedPill}>You</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">{meta}</p>
        </div>
        {!superadmin && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => setResetOpen(true)}
            >
              Reset password
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 pl-[50px]">
        {superadmin ? (
          <span className={frostedPill}>Full access — every area</span>
        ) : (
          <AreaToggles userId={id} areas={areas} />
        )}
      </div>

      {!superadmin && (
        <>
          <ResetPasswordDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            userId={id}
            name={name}
            email={email}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={(next) => !deletePending && setDeleteOpen(next)}
            title="Delete this account?"
            description={`${name} loses access immediately — their sign-in, sessions, and passkeys are removed. Tickets they reported are kept with their name on them.`}
            confirmLabel="Delete account"
            onConfirm={onDelete}
            destructive
            pending={deletePending}
          />
        </>
      )}
    </li>
  );
}
