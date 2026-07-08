'use client';

import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

import Container from '@/components/ui/Container';
import ImgClient from '@/components/ImgClient';
import ThemedShader from '@/components/ui/ThemedShader';
import { PERSEUS_LOGO } from '@/constants';

/**
 * Shared chrome for the chrome-less admin auth pages (login + reset-password).
 * The (admin) route group strips the Navbar/Footer, so this shell is the only
 * way back to the public site — it offers that twice (the logo mark → /, and an
 * explicit "Back to the website" link in the brand panel).
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
 * The tint (`bg-white/*`), brand copy (`text-black/*`) and rim (`border-white/*`)
 * are the --ink/--surface FLIP tokens (globals.css `@theme inline`), never
 * literal colours — they invert with the theme on their own, so only the alpha
 * differs per theme. Shadows stay literal `neutral-950` so they read as shadow,
 * not a glow, after the flip.
 */
export default function AdminAuthShell({
  children,
}: {
  children: React.ReactNode;
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
              aria-label="Perseus Creative Studio — back to the website"
              className="relative w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ImgClient
                src={PERSEUS_LOGO}
                alt="Perseus Creative Studio"
                width={40}
                height={49}
                priority
                className="dark:invert"
              />
            </Link>

            <div className="relative flex flex-col gap-3.5 text-black">
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-black/55">
                Admin access
              </span>
              <p className="text-balance text-xl font-semibold leading-[1.15] tracking-tight lg:text-2xl">
                A trusted marketing agency in Vancouver.
              </p>
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-black/70 underline-offset-4 transition-colors hover:text-black hover:underline"
              >
                <LuArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to the website
              </Link>
            </div>
          </aside>

          {/* Form panel — more opaque frost so inputs stay crisp on the glass. */}
          <main className="flex items-center justify-center border-t border-white/40 bg-white/72 p-8 sm:p-10 lg:border-t-0 lg:border-l dark:border-white/10 dark:bg-white/60">
            <div className="w-full max-w-sm">{children}</div>
          </main>
        </div>
      </Container>
    </div>
  );
}
