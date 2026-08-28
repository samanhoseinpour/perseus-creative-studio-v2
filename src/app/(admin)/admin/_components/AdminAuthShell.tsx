'use client';

import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

import AuthOrb from './AuthOrb';
import Container from '@/components/ui/Container';
import ImgClient from '@/components/ImgClient';
import ThemedShader from '@/components/ui/ThemedShader';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { PERSEUS_LOGO } from '@/constants';

/**
 * Shared chrome for the chrome-less admin auth pages (login + reset-password).
 * The (admin) route group strips the Navbar/Footer, so this shell is the only
 * way back to the public site — it offers that twice (the logo mark → /, and an
 * explicit "Back to the website" link in the brand panel). Both open a NEW TAB:
 * this page is the launch screen of the installed dashboard app, whose scope is
 * "/admin", so navigating this window to / would replace the app with the
 * marketing site.
 *
 * Layout: the site's own ThemedShader runs FULL-BLEED behind everything — the
 * bright Shader5 in light mode, the dark-neon Shader4 in dark mode, the same
 * theme switch used by the About hero and the 404 page. The two-column card
 * floats over it as one frosted-glass surface: a heavy `backdrop-blur` on the
 * card melts the animated shader into a soft colour wash, and each half carries
 * a translucent `surface` tint — the brand panel stays airier so the shader
 * reads through it, the form panel a touch more opaque so fields stay crisp.
 *
 * IMPORTANT: the root must NOT have its own `bg-*`, AND it must `isolate` (own
 * stacking context). The shader sits at `-z-10`; without an isolated context the
 * `(admin)/layout.tsx` ancestor's `bg-background` — a non-positioned in-flow
 * block — paints AFTER (over) the negative-z shader and hides it (that was the
 * "shader invisible" bug: fixing the root's own bg wasn't enough while an
 * ANCESTOR bg still covered it). `isolate` traps the `-z-10` shader inside this
 * shell so the whole shell paints above that ancestor background. Legibility
 * comes from the glass tint + blur, not an opaque page background.
 *
 * `pending` is the shell's own loading state, and it is the shell's rather than
 * each form's so login and reset-password cannot drift apart. Pass the caption
 * to show it, null to hide it.
 *
 * ONE overlay on the CARD, centred on the card — deliberately not on the form
 * half. The card is two columns at lg and one stacked column below it, so an
 * orb centred on the form panel sits dead centre on a phone and off to the
 * right on a desktop: the same wait, in two different places, depending on the
 * window. Centring on the card is the only anchor both layouts share. It also
 * sits above the specular rim (z-20 > the rim's z-10) so the whole card dims
 * as one object rather than keeping a lit edge over a greyed face.
 *
 * The tint (`bg-white/*`), brand copy (`text-black/*`) and rim (`border-white/*`)
 * are the --ink/--surface FLIP tokens (globals.css `@theme inline`), never
 * literal colours — they invert with the theme on their own, so only the alpha
 * differs per theme. Shadows stay literal `neutral-950` so they read as shadow,
 * not a glow, after the flip.
 */
export default function AdminAuthShell({
  children,
  pending = null,
}: {
  children: React.ReactNode;
  /** Caption for the loading orb, or null when nothing is in flight. */
  pending?: string | null;
}) {
  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden">
      {/* Full-bleed, theme-aware shader background — visible around AND through
          the glass card. No opaque wrapper background may cover this. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <ThemedShader />
      </div>

      <Container className="flex min-h-svh items-center justify-center py-10">
        {/* Frosted-glass two-column card floating over the shader. */}
        <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 shadow-2xl shadow-neutral-950/30 backdrop-blur-2xl lg:min-h-128 lg:grid-cols-2 dark:border-white/12 dark:shadow-neutral-950/70">
          {/* Specular top edge — a hairline of surface light that reads as the
              lit rim of glass in both themes. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/25"
          />

          {/* Brand / media panel — airier tint so the shader reads through it. */}
          <aside className="relative flex min-h-52 flex-col justify-between bg-white/40 p-7 lg:p-9 dark:bg-white/25">
            {/* Soft scrim behind the copy keeps it legible while the shader
                still shows through the top of the panel. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent to-white/45 dark:to-white/35"
            />

            <Link
              href="/"
              target="_blank"
              rel="noopener"
              aria-label="Perseus Creative Studio, back to the website"
              className="relative w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ImgClient
                src={PERSEUS_LOGO}
                alt="Perseus Creative Studio"
                width={60}
                height={69}
                priority
                className="dark:invert"
              />
            </Link>

            <div className="relative flex flex-col gap-3.5 text-black">
              <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-black/55">
                Admin access
              </span>
              <p className="text-balance text-xl font-semibold leading-[1.15] tracking-tight lg:text-2xl">
                A trusted marketing agency in Vancouver.
              </p>
              {/* New tab: /admin/login is the launch screen of the installed
                  dashboard app (scope "/admin"), so navigating this window out
                  to the marketing site would replace the app with it. */}
              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className={cn(
                  'inline-flex w-fit items-center gap-1.5 text-xs font-medium text-black/70 hover:text-black',
                  adminLink,
                )}
              >
                <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to the website
              </Link>
            </div>
          </aside>

          {/* Form panel — more opaque frost so inputs stay crisp on the glass. */}
          <main className="flex items-center justify-center border-t border-white/40 bg-white/72 p-8 sm:p-10 lg:border-t-0 lg:border-l dark:border-white/10 dark:bg-white/60">
            <div className="w-full max-w-sm">{children}</div>
          </main>

          {pending && (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-20 grid place-items-center bg-background/60 backdrop-blur-sm"
            >
              <span className="flex flex-col items-center gap-5">
                <AuthOrb />
                {/* Plain text, not a chip: the whole point of the orb is that a
                    wait must not wear a button's clothes. */}
                <span className="text-sm font-medium text-foreground/70">
                  {pending}
                </span>
              </span>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
