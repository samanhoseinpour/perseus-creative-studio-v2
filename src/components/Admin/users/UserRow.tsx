'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LuBell, LuBellOff } from 'react-icons/lu';

import Button from '@/components/Button';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { deleteAdminUser } from '@/app/(admin)/admin/(protected)/_actions/users';
import type { AdminArea } from '@/lib/adminAreas';
import { PRESENCE_TICK_MS, presenceFrom } from '@/lib/presence';
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
  /** Epoch ms of the last sighting, or null for never seen. */
  lastSeenMs: number | null;
  /** Server-formatted date for that sighting — spent only past a week. */
  lastSeenAbsolute: string | null;
  /**
   * The server's clock at render, shared by every row. The presence label is
   * computed against it until this component mounts and can read a real one —
   * without it the first render has no "now" and would score every row as a
   * zero-second-old sighting, i.e. everybody Online.
   */
  serverNowMs: number;
  /**
   * How many browsers this person has subscribed to push.
   *
   * ZERO IS AMBIGUOUS AND THE LABEL MUST NOT RESOLVE IT: it covers "turned it
   * off", "never asked" and "an iPhone not yet on the Home Screen" alike, and
   * the server only knows about subscriptions that exist. So the row reads
   * "No devices" — a fact — rather than "Notifications off", which would read
   * as a refusal when it is usually just an offer nobody has taken up.
   */
  pushDevices: number;
  /** Server-formatted date of the newest delivery, or null if never notified.
   *  Subscribed and actually-reached are different things, and only this one
   *  shows a subscription that has quietly stopped working. */
  lastNotifiedLabel: string | null;
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
  lastSeenMs,
  lastSeenAbsolute,
  serverNowMs,
  pushDevices,
  lastNotifiedLabel,
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

  // The label decays on its own. A server-rendered string would sit on
  // "Online" for as long as the tab stayed open — which is the whole class of
  // bug this replaced. `now` starts null so the first client render is byte
  // for byte the server's, then the tick takes over: no hydration mismatch,
  // and no Intl in the browser (see @/lib/presence).
  //
  // Decay-only, and honestly so: this can move a row from Online to "Last
  // seen 6m ago" and grow the gap, but it can never show someone ARRIVING
  // without a reload. It fails toward "gone", never toward a false green dot.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, PRESENCE_TICK_MS);
    // Load-bearing: a tab restored after three hours must jump straight to the
    // real gap, not resume ticking up from wherever it froze.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Before mount there is no client clock, so both the server render and the
  // first client render score against the server's — identical output, which
  // is what makes the handover invisible.
  const presence = presenceFrom(lastSeenMs, lastSeenAbsolute, now ?? serverNowMs);

  const meta = [
    `${passkeys} ${passkeys === 1 ? 'passkey' : 'passkeys'}`,
    `Joined ${createdLabel}`,
  ].join(' · ');

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-3.5">
        {/* The dot is a sibling overlay, not a prop on AdminAvatar: presence
            belongs to this page only (it is superadmin-gated here), and the
            avatar is shared with the sidebar, tickets and profile, where a
            green dot would quietly widen who can see who is online. */}
        <span className="relative inline-flex shrink-0">
          <AdminAvatar
            src={avatar?.src}
            blur={avatar?.blur}
            mark={avatar?.mark}
            name={name}
            size={36}
          />
          {presence.online && (
            // Only when online. A grey dot on every offline row is noise, and
            // the meta line already says the state in words — which is also
            // why this is aria-hidden: the label is the accessible source of
            // truth, and a screen reader announcing a decoration twice is
            // worse than not announcing it.
            <span
              aria-hidden="true"
              className={cn(
                'absolute -bottom-px -right-px h-[11px] w-[11px] rounded-full',
                'bg-emerald-500 dark:bg-emerald-400',
                // Ringed in the panel's own colour so the dot reads as cut
                // out of the avatar rather than stuck on top of it. `white` is
                // a FLIP token here (--color-white: var(--surface)), so this
                // one class is already correct in both themes — a literal
                // dark: override would be the bug, not the fix.
                'ring-2 ring-white',
              )}
            />
          )}
        </span>
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
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {meta}
            {' · '}
            {/* The glyph carries the meaning: "2 devices" alone reads as
                hardware rather than as notifications. Bell when someone is
                reachable, struck-through bell when nobody is. */}
            <span className="inline-flex items-center gap-1 align-[-0.1em]">
              {pushDevices > 0 ? (
                <LuBell className="size-3 shrink-0" aria-hidden="true" />
              ) : (
                <LuBellOff className="size-3 shrink-0" aria-hidden="true" />
              )}
              {pushDevices > 0
                ? `${pushDevices} ${pushDevices === 1 ? 'device' : 'devices'}`
                : 'No devices'}
            </span>
            {lastNotifiedLabel && ` · notified ${lastNotifiedLabel}`}
            {' · '}
            <span
              className={cn(
                presence.online &&
                  'font-medium text-emerald-600 dark:text-emerald-400',
              )}
            >
              {presence.label}
            </span>
          </p>
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
          <span className={frostedPill}>Full access to everything</span>
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
            description={`${name} loses access immediately: their sign-in, sessions, and passkeys are removed. Tickets they reported are kept with their name on them.`}
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
