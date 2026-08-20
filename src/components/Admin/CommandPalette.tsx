'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  LuListChecks,
  LuMessageSquare,
  LuBuilding2,
  LuClapperboard,
  LuBug,
  LuUsersRound,
  LuScrollText,
  LuArrowRight,
} from 'react-icons/lu';

import { Input } from '@/components/ui/input';
import { glassSurface, glassRowHover, GlassRim } from '@/components/Admin/Glass';
import { useLenisFreeze } from '@/hooks/useLenisFreeze';
import { ADMIN_ROUTES, canSeeNavItem, type NavAccess } from '@/lib/adminNav';
import {
  ADMIN_SEARCH_OPEN_EVENT,
  parseScopedQuery,
  type SearchEntity,
  type SearchHit,
} from '@/lib/adminSearch';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import { globalSearchAction } from '@/app/(admin)/admin/(protected)/_actions/search';

type Item = {
  key: string;
  label: string;
  hint?: string;
  icon: IconType;
  run: () => void;
};

const ENTITY_ICONS: Record<SearchEntity, IconType> = {
  task: LuListChecks,
  comment: LuMessageSquare,
  client: LuBuilding2,
  project: LuClapperboard,
  inquiry: LuInbox,
  application: LuBriefcaseBusiness,
  ticket: LuBug,
  user: LuUsersRound,
  activity: LuScrollText,
};

/**
 * Fixed group order for entity hits. `viewAll` is the list page whose own
 * filter bar takes over for the deep dive — only pages with `?q=` support get
 * one (tickets has no q filter, the users roster is one screen, and activity
 * hits already land on the ?q=-filtered log).
 */
const ENTITY_GROUPS: {
  heading: string;
  entities: SearchEntity[];
  viewAll?: string;
}[] = [
  { heading: 'Tasks', entities: ['task', 'comment'], viewAll: '/admin/tasks' },
  { heading: 'Clients', entities: ['client'], viewAll: '/admin/clients' },
  { heading: 'Projects', entities: ['project'], viewAll: '/admin/projects' },
  { heading: 'Inquiries', entities: ['inquiry'], viewAll: '/admin/inquiries' },
  {
    heading: 'Applications',
    entities: ['application'],
    viewAll: '/admin/applications',
  },
  { heading: 'Tickets', entities: ['ticket'] },
  { heading: 'Users', entities: ['user'] },
  { heading: 'Activity', entities: ['activity'] },
];

// Global ⌘K palette: jump to a page, search everything the viewer's grants
// cover (tasks + comments, clients, projects, submissions, tickets, users,
// activity), or run a quick action. Mounted once in the protected layout.
// Entity search goes through ONE server action returning one atomic hit list
// (registries and gates stay server-side); a `task:`-style prefix narrows the
// scope. Opens via ⌘K or the ADMIN_SEARCH_OPEN_EVENT the sidebar/mobile
// triggers dispatch. Coexists with the inbox triage listener — triage ignores
// keys while this dialog's input is focused, and ⌘K itself uses the meta/ctrl
// modifier that triage explicitly skips.
export default function CommandPalette({
  access,
}: {
  /** Layout-computed access profile — decides which routes this viewer sees. */
  access: NavAccess;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  /** A fetch is owed for the current term (debounce window included) — while
   *  true and nothing matches yet, the empty state is a skeleton, never a
   *  premature "No results." */
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Radix's body lock can't stop root Lenis (it scrolls programmatically);
  // freeze it so the page can't creep behind the open palette.
  useLenisFreeze(open);

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

  // The visible triggers (sidebar row, mobile top-bar icon) live in a sibling
  // client island — they reach this dialog through a window event, the same
  // bus the shortcuts above already ride.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(ADMIN_SEARCH_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ADMIN_SEARCH_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      setPending(false);
      setSelected(0);
    }
  }, [open]);

  // Debounced entity search — one action, one response, one state write (so
  // groups can't stream in separately and yank the keyboard cursor). 250ms:
  // the unscoped fire fans out to every permitted entity, so it earns a
  // slightly longer settle than the old single-table 150ms. A bare scope
  // prefix ("task:") fires nothing until a real term follows.
  useEffect(() => {
    if (!open) return;
    const { scopes, term } = parseScopedQuery(query);
    if (term.length < 2) {
      setHits([]);
      setPending(false);
      return;
    }
    // Pending covers the debounce window too — the moment a searchable term
    // exists, the UI owes an answer, so the empty state must read "thinking",
    // not "nothing found". If the query changes mid-flight the next effect
    // run re-asserts pending, so a cancelled fetch can't strand it.
    setPending(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await globalSearchAction(term, scopes ?? undefined);
        if (!cancelled) {
          setHits(res);
          setPending(false);
        }
      } catch {
        // Transport failure (offline, deploy) — degrade to empty; the next
        // keystroke retries. The action logs server-side failures itself.
        if (!cancelled) {
          setHits([]);
          setPending(false);
        }
      }
    }, 250);
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
    const { scopes, term } = parseScopedQuery(query);
    const q = term.toLowerCase();
    const match = (s: string) => q === '' || s.toLowerCase().includes(q);

    // A scope prefix must never show another entity's rows: `hits` lags the
    // typed query by the debounce + a round trip, so after narrowing
    // "acme" → "task:acme" the stale client/project hits would otherwise
    // render (and spawn their View-all rows) under the scoped view — every
    // one Enter-activatable — until the refetch lands.
    const visibleHits =
      scopes === null ? hits : hits.filter((h) => scopes.includes(h.entity));

    const entityGroups = ENTITY_GROUPS.map((g) => {
      const items: Item[] = visibleHits
        .filter((h) => g.entities.includes(h.entity))
        .map((h) => ({
          key: `${h.entity}:${h.id}`,
          label: h.label,
          hint: h.sublabel,
          icon: ENTITY_ICONS[h.entity],
          run: () => go(h.href),
        }));
      // The deep-dive handoff: the list page's own filter bar takes over.
      if (items.length > 0 && g.viewAll && term.length >= 2) {
        const href = `${g.viewAll}?q=${encodeURIComponent(term)}`;
        items.push({
          key: `all:${g.heading}`,
          label: `View all in ${g.heading}`,
          icon: LuArrowRight,
          run: () => go(href),
        });
      }
      return { heading: g.heading, items };
    });

    // A scope prefix means "I'm searching data, not navigating" — the route
    // and action groups stand down until the prefix is cleared.
    if (scopes !== null) {
      return entityGroups.filter((g) => g.items.length > 0);
    }

    const goTo: Item[] = ADMIN_ROUTES.filter(
      (r) =>
        canSeeNavItem(r, access) &&
        (match(r.label) ||
          (r.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)),
    ).map((r) => ({
      key: `route:${r.href}`,
      label: r.label,
      icon: r.icon,
      run: () => go(r.href),
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
      ...entityGroups,
      { heading: 'Actions', items: actions },
    ].filter((g) => g.items.length > 0);
  }, [query, hits, go, signOut, resolvedTheme, setTheme, access]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setSelected(0);
  }, [flat.length]);

  // Keep the active row visible when ArrowUp/ArrowDown walks past the list's
  // max-height fold. 'nearest' is a no-op for rows already in view, so
  // mouse-hover selection never causes a jump.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, flat]);

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
        <Dialog.Overlay
          data-lenis-prevent
          className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          onKeyDown={onKeyDown}
          aria-label="Command palette"
          data-lenis-prevent
          className={cn(
            'fixed left-1/2 top-[15%] z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden p-0',
            glassSurface,
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <GlassRim />
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search tasks, clients, projects, submissions and more, or jump to a
            page.
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
              placeholder="Search the studio or jump to…"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {/* Quiet in-flight tick beside the field — stale results below
                stay interactive while the fresh set is fetched. */}
            {pending && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60 motion-reduce:animate-none"
              />
            )}
          </div>

          {/* data-lenis-prevent: the admin shell runs Lenis on desktop, which
              swallows wheel events for its own (dialog-locked) root scroller
              unless the path opts out — without it this list can't scroll.
              Same pattern as the sidebar's mobile sheet. */}
          <div
            ref={listRef}
            data-lenis-prevent
            className="max-h-[min(60svh,24rem)] overflow-y-auto overscroll-contain p-2"
          >
            {flat.length === 0 ? (
              pending ? (
                // Searching: skeleton rows in place of a premature "No
                // results." — three ghost hits at the real row metrics so the
                // list doesn't jump when the fresh set lands.
                <div role="status" className="px-1 py-1">
                  <span className="sr-only">Searching…</span>
                  <ul aria-hidden="true" className="animate-pulse">
                    {['w-3/5', 'w-2/5', 'w-1/2'].map((w) => (
                      <li
                        key={w}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <span className="h-4 w-4 shrink-0 rounded bg-foreground/10" />
                        <span className={cn('h-3 rounded bg-foreground/10', w)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {parseScopedQuery(query).term.length < 2 ? (
                    <p>Type at least two characters.</p>
                  ) : (
                    <p>No results.</p>
                  )}
                  {parseScopedQuery(query).scopes === null && (
                    <p className="mt-2 text-xs">
                      Tip: prefix with{' '}
                      <span className="font-medium">task:</span>,{' '}
                      <span className="font-medium">client:</span> or{' '}
                      <span className="font-medium">project:</span> to narrow.
                    </p>
                  )}
                </div>
              )
            ) : (
              groups.map((group) => (
                <div key={group.heading} className="mb-1">
                  <p className="px-3 pb-1 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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
                            data-active={active || undefined}
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
