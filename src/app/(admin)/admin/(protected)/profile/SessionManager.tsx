'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { IconType } from 'react-icons';
import { LuMonitor, LuSmartphone, LuTabletSmartphone, LuLogOut } from 'react-icons/lu';
import { FaApple, FaAndroid, FaWindows, FaLinux, FaUbuntu } from 'react-icons/fa6';

import Button from '@/components/Button';
import { GlassPanel, glassChip } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';

// The server (profile/page.tsx `deviceMeta`) can't hand a React component across
// the RSC boundary, so it sends a serialisable key and we map it to a glyph
// here. OS brand marks win (Apple covers macOS + iOS/iPadOS); the generic
// device-class icons are the fallback for an unknown OS.
export type IconKey =
  | 'apple'
  | 'windows'
  | 'android'
  | 'linux'
  | 'ubuntu'
  | 'mobile'
  | 'tablet'
  | 'desktop';

const DEVICE_ICONS: Record<IconKey, IconType> = {
  apple: FaApple,
  windows: FaWindows,
  android: FaAndroid,
  linux: FaLinux,
  ubuntu: FaUbuntu,
  mobile: LuSmartphone,
  tablet: LuTabletSmartphone,
  desktop: LuMonitor,
};

type Session = {
  token: string;
  current: boolean;
  device: string;
  iconKey: IconKey;
  ipAddress: string | null;
  sinceLabel: string | null;
  lastActiveLabel: string | null;
};

export default function SessionManager({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const others = sessions.filter((s) => !s.current);

  async function revokeOne(token: string) {
    setRevokingToken(token);
    const res = await authClient.revokeSession({ token });
    setRevokingToken(null);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not sign out that session.');
      return;
    }
    toast.success('Session signed out.');
    router.refresh();
  }

  async function revokeOthers() {
    setRevokingAll(true);
    const res = await authClient.revokeOtherSessions();
    setRevokingAll(false);
    setConfirmOpen(false);
    if (res?.error) {
      toast.error(res.error.message ?? 'Could not sign out other sessions.');
      return;
    }
    toast.success('Signed out of all other sessions.');
    router.refresh();
  }

  const busy = revokingToken !== null || revokingAll;

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Active sessions
          </h2>
          <p className="text-xs text-muted-foreground">
            Devices currently signed in to your account.
          </p>
        </div>
        {others.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            icon={LuLogOut}
            iconPosition="left"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
          >
            {revokingAll ? 'Signing out…' : 'Sign out others'}
          </Button>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-white/40 dark:divide-white/10">
        {sessions.map((s) => {
          const Icon = DEVICE_ICONS[s.iconKey] ?? LuMonitor;
          return (
          <li key={s.token} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                glassChip,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="truncate">{s.device}</span>
                {s.current && (
                  <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide text-background">
                    This device
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  s.ipAddress ?? 'Unknown IP',
                  s.sinceLabel ? `Since ${s.sinceLabel}` : null,
                  s.lastActiveLabel ? `Last active ${s.lastActiveLabel}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {!s.current && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                onClick={() => revokeOne(s.token)}
                disabled={busy}
              >
                {revokingToken === s.token ? 'Signing out…' : 'Sign out'}
              </Button>
            )}
          </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out other sessions?"
        description="This signs you out everywhere except this device."
        confirmLabel="Sign out others"
        destructive
        pending={revokingAll}
        onConfirm={revokeOthers}
      />
    </GlassPanel>
  );
}
