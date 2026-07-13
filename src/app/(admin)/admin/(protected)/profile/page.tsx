import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

import { requireAdmin } from '@/lib/adminSession';
import { resolveAdminAvatar, resolveAdminRole } from '@/lib/adminIdentity';
import { getUserPasskeys, getUserActiveSessions } from '@/db/adminQueries';
import { formatRelative } from '@/components/Admin/inbox/format';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import DisplayNameForm from './DisplayNameForm';
import ChangePasswordForm from './ChangePasswordForm';
import PasskeyManager from './PasskeyManager';
import SessionManager, { type IconKey } from './SessionManager';

export const metadata: Metadata = {
  title: 'Profile',
  description:
    'Manage your display name, password, passkeys, and active sessions.',
};

// Self-service account page. Everything here acts on the CURRENT admin only —
// reads happen server-side (this component), mutations run through the Better
// Auth client in the child forms, which then `router.refresh()` so this server
// component re-reads and the UI reflects the change.
export default async function ProfilePage() {
  const { session, user } = await requireAdmin();
  const avatar = resolveAdminAvatar(user);
  const role = resolveAdminRole(user);

  const [passkeys, sessions] = await Promise.all([
    getUserPasskeys(user.id),
    getUserActiveSessions(user.id),
  ]);

  // Format dates + parse user agents SERVER-side (fixed locale, one timezone)
  // and pass plain strings down, so the client sections never do Date math —
  // avoids a hydration mismatch between the UTC server render and the viewer's
  // local timezone.
  const passkeyProps = passkeys.map((p) => ({
    id: p.id,
    label: p.name?.trim() || 'Passkey',
    deviceType: p.deviceType,
    addedLabel: fmtDate(p.createdAt),
  }));

  const sessionProps = sessions
    .map((s) => {
      const meta = deviceMeta(s.userAgent ?? null);
      return {
        token: s.token,
        current: s.token === session.token,
        device: meta.label,
        iconKey: meta.iconKey,
        ipAddress: s.ipAddress ?? null,
        sinceLabel: fmtDate(s.createdAt ? new Date(s.createdAt) : null),
        lastActiveLabel: s.updatedAt ? formatRelative(new Date(s.updatedAt)) : null,
      };
    })
    // Current session first, then the rest.
    .sort((a, b) => Number(b.current) - Number(a.current));

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href="/admin"
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to dashboard
      </Link>

      <header className="mb-8 flex items-center gap-4">
        <AdminAvatar
          src={avatar?.src}
          blur={avatar?.blur}
          mark={avatar?.mark}
          name={user.name}
          size={64}
        />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <span className="mt-1 w-fit rounded-full border border-white/50 bg-white/40 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10">
            {role}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <DisplayNameForm initialName={user.name} />
        <ChangePasswordForm email={user.email} name={user.name} />
        <PasskeyManager passkeys={passkeyProps} />
        <SessionManager sessions={sessionProps} />
      </div>
    </div>
  );
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function fmtDate(d: Date | null): string | null {
  return d ? DATE_FMT.format(d) : null;
}

/**
 * Parse a User-Agent into a human "Browser · OS" label and a serialisable icon
 * key for the session list. OS brand marks take priority (Apple covers macOS +
 * iOS/iPadOS); an unknown OS falls back to a generic device-class glyph.
 */
function deviceMeta(ua: string | null): { label: string; iconKey: IconKey } {
  if (!ua) return { label: 'Unknown device', iconKey: 'desktop' };

  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /OPR|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome|CriOS/i.test(ua)
        ? 'Chrome'
        : /Firefox|FxiOS/i.test(ua)
          ? 'Firefox'
          : /Safari/i.test(ua)
            ? 'Safari'
            : 'Browser';

  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone/i.test(ua)
      ? 'iOS'
      : /iPad/i.test(ua)
        ? 'iPadOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Android/i.test(ua)
            ? 'Android'
            : /Ubuntu/i.test(ua)
              ? 'Ubuntu'
              : /Linux/i.test(ua)
                ? 'Linux'
                : '';

  const deviceClass: IconKey =
    /iPad|Tablet/i.test(ua) || /Android(?!.*Mobile)/i.test(ua)
      ? 'tablet'
      : /Mobile|iPhone/i.test(ua)
        ? 'mobile'
        : 'desktop';

  const iconKey: IconKey =
    os === 'iOS' || os === 'iPadOS' || os === 'macOS'
      ? 'apple'
      : os === 'Windows'
        ? 'windows'
        : os === 'Android'
          ? 'android'
          : os === 'Ubuntu'
            ? 'ubuntu'
            : os === 'Linux'
              ? 'linux'
              : deviceClass;

  const label = os ? `${browser} · ${os}` : browser;
  return { label, iconKey };
}
