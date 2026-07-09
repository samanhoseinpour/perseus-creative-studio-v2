'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Dialog } from 'radix-ui';
import type { IconType } from 'react-icons';
import {
  LuSearch,
  LuInbox,
  LuBriefcaseBusiness,
  LuSunMoon,
  LuExternalLink,
  LuLogOut,
  LuCornerDownLeft,
} from 'react-icons/lu';

import { Input } from '@/components/ui/input';
import { glassSurface, glassRowHover, GlassRim } from '@/components/Admin/Glass';
import { ADMIN_ROUTES } from '@/lib/adminNav';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import { searchSubmissionsAction } from '@/app/(admin)/admin/(protected)/_actions/search';
import type { SubmissionHit } from '@/db/adminQueries';

type Item = {
  key: string;
  label: string;
  hint?: string;
  icon: IconType;
  run: () => void;
};

// Global ⌘K palette: jump to a page, search submissions by name/email, or run a
// quick action. Mounted once in the protected layout. Submission search goes
// through a server action (registries stay server-side); everything else is
// static. Coexists with the inbox triage listener — triage ignores keys while
// this dialog's input is focused, and ⌘K itself uses the meta/ctrl modifier that
// triage explicitly skips.
export default function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SubmissionHit[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced submission search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchSubmissionsAction(q);
      if (!cancelled) setHits(res);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );
  const signOut = useCallback(async () => {
    close();
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }, [close, router]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => q === '' || s.toLowerCase().includes(q);

    const goTo: Item[] = ADMIN_ROUTES.filter((r) => match(r.label)).map((r) => ({
      key: `route:${r.href}`,
      label: r.label,
      icon: r.icon,
      run: () => go(r.href),
    }));

    const subs: Item[] = hits.map((h) => ({
      key: `sub:${h.id}`,
      label: h.name,
      hint: `${h.email} · ${h.kind === 'project' ? 'Inquiry' : 'Application'}`,
      icon: h.kind === 'project' ? LuInbox : LuBriefcaseBusiness,
      run: () => go(h.href),
    }));

    const actions: Item[] = (
      [
        {
          key: 'act:theme',
          label: 'Toggle theme',
          icon: LuSunMoon,
          run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
        },
        {
          key: 'act:site',
          label: 'View the live site',
          icon: LuExternalLink,
          run: () => go('/'),
        },
        {
          key: 'act:signout',
          label: 'Sign out',
          icon: LuLogOut,
          run: () => void signOut(),
        },
      ] satisfies Item[]
    ).filter((a) => match(a.label));

    return [
      { heading: 'Go to', items: goTo },
      { heading: 'Submissions', items: subs },
      { heading: 'Actions', items: actions },
    ].filter((g) => g.items.length > 0);
  }, [query, hits, go, signOut, resolvedTheme, setTheme]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setSelected(0);
  }, [flat.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flat[selected]?.run();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          aria-label="Command palette"
          className={cn(
            'fixed left-1/2 top-[15%] z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden p-0',
            glassSurface,
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <GlassRim />
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search submissions or jump to a page.
          </Dialog.Description>

          <div className="flex items-center gap-2 border-b border-white/40 px-4 dark:border-white/10">
            <LuSearch
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search submissions or jump to…"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            {flat.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.heading} className="mb-1">
                  <p className="px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                    {group.heading}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const idx = flat.indexOf(item);
                      const active = idx === selected;
                      const Icon = item.icon;
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            onMouseMove={() => setSelected(idx)}
                            onClick={() => item.run()}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                              active
                                ? 'bg-white/60 dark:bg-white/10'
                                : cn('text-muted-foreground', glassRowHover),
                            )}
                          >
                            <Icon
                              className="h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {item.label}
                            </span>
                            {item.hint && (
                              <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">
                                {item.hint}
                              </span>
                            )}
                            {active && (
                              <LuCornerDownLeft
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
