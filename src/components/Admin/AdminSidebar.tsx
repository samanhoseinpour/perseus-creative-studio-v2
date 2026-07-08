'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard,
  LuUserRound,
  LuInbox,
  LuBriefcaseBusiness,
  LuLogOut,
  LuMenu,
  LuX,
} from 'react-icons/lu';

import Button from '@/components/Button';
import ImgClient from '@/components/ImgClient';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import {
  glassSurface,
  glassChip,
  glassRowHover,
  GlassRim,
} from '@/components/Admin/Glass';
import { authClient } from '@/lib/auth-client';
import { greetingWord, firstNameOf } from '@/lib/greeting';
import { cn } from '@/lib/utils';
import { PERSEUS_LOGO } from '@/constants';

type NavCountKey = 'project' | 'career';
type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  badge?: NavCountKey;
};

const NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LuLayoutDashboard },
  { label: 'Profile', href: '/admin/profile', icon: LuUserRound },
];

// The submissions inbox (Phase 2b), grouped under its own header. Badges show
// the untriaged ('new') count per kind, kept live by the inbox actions'
// revalidatePath('/admin', 'layout').
const INBOX: NavItem[] = [
  {
    label: 'Inquiries',
    href: '/admin/inquiries',
    icon: LuInbox,
    badge: 'project',
  },
  {
    label: 'Applications',
    href: '/admin/applications',
    icon: LuBriefcaseBusiness,
    badge: 'career',
  },
];

type AdminSidebarProps = {
  name: string;
  email: string;
  avatar: { src: string; blur?: string } | null;
  counts?: { project: number; career: number };
};

export default function AdminSidebar({
  name,
  email,
  avatar,
  counts,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The greeting word depends on the viewer's local clock, which the server
  // can't know — so render a stable neutral line on the server + first client
  // paint, then swap in the time-aware word after mount (same pattern as
  // ThemeSwitcher). Keeps hydration identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const firstName = firstNameOf(name);
  const greeting = mounted
    ? `${greetingWord(new Date().getHours())}, ${firstName}`
    : `Welcome, ${firstName}`;

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const renderLink = (
    { label, href, icon: Icon, badge }: NavItem,
    onNavigate?: () => void,
  ) => {
    const active = isActive(href);
    const n = badge ? (counts?.[badge] ?? 0) : 0;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-foreground text-background'
            : cn('text-muted-foreground hover:text-foreground', glassRowHover),
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </span>
        {badge && n > 0 && (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6rem] font-semibold tabular-nums',
              active ? 'bg-background/20 text-background' : glassChip,
            )}
          >
            {n}
          </span>
        )}
      </Link>
    );
  };

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV.map((item) => renderLink(item, onNavigate))}

      <span className="my-2 px-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        Inbox
      </span>
      {INBOX.map((item) => renderLink(item, onNavigate))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/60 p-3 dark:border-white/12">
      <div className="flex items-center gap-3 px-1 py-1">
        <AdminAvatar src={avatar?.src} blur={avatar?.blur} name={name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <ThemeSwitcher direction="left" className="shrink-0" />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={signOut}
        disabled={signingOut}
        icon={LuLogOut}
        iconPosition="left"
        className="mt-2 w-full"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );

  const brand = (onClose?: () => void) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link
        href="/"
        onClick={onClose}
        aria-label="Perseus Creative Studio — view the website"
        className="shrink-0"
      >
        <ImgClient
          src={PERSEUS_LOGO}
          alt="Perseus Creative Studio"
          width={26}
          height={30}
          className="rounded-none dark:invert"
        />
      </Link>
      <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
        {greeting}
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop rail — crisp frosted glass matching the dashboard cards/panels
          (glassSurface), full-bleed so its card rounding is dropped and only the
          right edge keeps a hairline; a specular rim lights its top edge. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh w-64 shrink-0 flex-col lg:flex',
          glassSurface,
          'rounded-none border-y-0 border-l-0',
        )}
      >
        <GlassRim />
        <div className="flex h-16 items-center border-b border-white/60 px-5 dark:border-white/12">
          {brand()}
        </div>
        {nav()}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header
        className={cn(
          'sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden',
          glassSurface,
          'rounded-none border-x-0 border-t-0',
        )}
      >
        <GlassRim />
        {brand()}
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => setOpen(true)}
          icon={LuMenu}
          iconPosition="left"
          aria-label="Open menu"
        >
          {''}
        </Button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col',
              glassSurface,
              'rounded-none border-y-0 border-l-0 shadow-2xl',
            )}
          >
            <GlassRim />
            <div className="flex h-14 items-center justify-between border-b border-white/60 px-4 dark:border-white/12">
              {brand(() => setOpen(false))}
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setOpen(false)}
                icon={LuX}
                iconPosition="left"
                aria-label="Close menu"
              >
                {''}
              </Button>
            </div>
            {nav(() => setOpen(false))}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
