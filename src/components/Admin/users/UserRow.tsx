'use client';

import { useState } from 'react';
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
  /** role === 'owner' — the one untouchable row. */
  owner: boolean;
  /** role === 'superadmin' exactly (the owner is NOT flagged here). */
  superadmin: boolean;
  areas: AdminArea[];
  avatar: { src: string; blur?: string; mark?: boolean } | null;
  passkeys: number;
  createdLabel: string;
  lastActiveLabel: string | null;
  isSelf: boolean;
  /** Whether the VIEWER is the owner — unlocks superadmin rows and the
   *  sensitive chips. A mirror of the server rules, never the enforcement. */
  viewerIsOwner: boolean;
};

const pill =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide';
const frostedPill = cn(
  pill,
  'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
);

/**
 * One account row: identity + meta up top, the access controls beneath.
 * Three target kinds: the OWNER row is read-only for everyone; SUPERADMIN
 * rows are fully owner-managed — live chips (sensitive pair included) plus
 * reset-password and delete under the owner, read-only chips ("Managed by
 * owner") for superadmins; MEMBER rows get live chips plus reset/delete for
 * every viewer, with the sensitive pair locked for non-owners. The server
 * actions refuse everything this hides, so nothing here is load-bearing.
 */
export default function UserRow({
  id,
  name,
  email,
  owner,
  superadmin,
  areas,
  avatar,
  passkeys,
  createdLabel,
  lastActiveLabel,
  isSelf,
  viewerIsOwner,
}: UserRowProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const isMember = !owner && !superadmin;
  // Members are manageable by any viewer of this page; superadmin accounts
  // (credentials AND offboarding) only under the owner; the owner row never.
  // The server actions enforce the same lines — this only decides rendering.
  const canManageAccount = isMember || (superadmin && viewerIsOwner);

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
            {owner && (
              <span
                className={cn(
                  pill,
                  'border-foreground/80 bg-transparent font-semibold text-foreground',
                )}
              >
                Owner
              </span>
            )}
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
        {canManageAccount && (
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
        {owner ? (
          <span className={frostedPill}>Full access — everything</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AreaToggles
              userId={id}
              areas={areas}
              readOnly={superadmin && !viewerIsOwner}
              canEditSensitive={viewerIsOwner}
            />
            {superadmin && !viewerIsOwner && (
              <p className="px-1 text-xs text-muted-foreground">
                Managed by owner
              </p>
            )}
          </div>
        )}
      </div>

      {canManageAccount && (
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
