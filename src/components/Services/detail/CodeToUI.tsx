'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  LuArrowDown,
  LuArrowRight,
  LuCheck,
  LuLock,
  LuPlay,
} from 'react-icons/lu';

import type { WebsiteServiceContent } from '../types';

type CodeToUi = NonNullable<WebsiteServiceContent['codeToUi']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;
const BUILD_MS = 850;

/**
 * Website Development signature — a single "build" artifact, not two cards. The
 * dark editor pane compiles into a believable browser-rendered page when the
 * Build button runs (auto-runs once on scroll-in; the button re-runs it). While
 * building it shows a spinner + skeleton; on finish the page reveals and the
 * status checks tick in. One framed slab so it reads as a product. Studio tokens.
 */
const CodeToUI = ({
  fileName,
  code,
  rendered,
  previewUrl = 'localhost:3000',
  buildLabel = 'Compiled in 0.8s',
  checks = ['TypeScript', '100 Lighthouse', 'WCAG AA'],
}: CodeToUi) => {
  const [phase, setPhase] = useState<'idle' | 'building' | 'done'>('idle');
  const [run, setRun] = useState(0);

  const build = () => {
    setPhase('building');
    setRun((r) => r + 1);
  };

  // Drive building → done, and clean up the timer on unmount / re-run.
  useEffect(() => {
    if (phase !== 'building') return;
    const t = setTimeout(() => setPhase('done'), BUILD_MS);
    return () => clearTimeout(t);
  }, [phase, run]);

  const building = phase === 'building';
  const done = phase === 'done';

  const buildButton = (mobile?: boolean) => (
    <button
      type="button"
      onClick={build}
      disabled={building}
      aria-label="Run build"
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white shadow-lg ring-4 ring-background-contrast transition-transform hover:scale-105 active:scale-95 disabled:opacity-100"
    >
      {building ? (
        <>
          <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          building
        </>
      ) : (
        <>
          {done ? 'rebuild' : 'build'}
          {mobile ? (
            <LuArrowDown aria-hidden className="size-3.5" />
          ) : done ? (
            <LuPlay aria-hidden className="size-3" />
          ) : (
            <LuArrowRight aria-hidden className="size-3.5" />
          )}
        </>
      )}
    </button>
  );

  return (
    <motion.div
      onViewportEnter={() => setPhase((p) => (p === 'idle' ? 'building' : p))}
      viewport={VIEWPORT}
      className="overflow-hidden rounded-3xl bg-background-contrast shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-black/10"
    >
      <div className="relative grid lg:grid-cols-2">
        {/* ───── Editor pane ───── */}
        <div className="flex flex-col bg-black">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
            </div>
            <span className="font-mono text-[11px] tracking-tight text-white/45">
              {fileName}
            </span>
          </div>

          <pre className="flex-1 overflow-x-auto p-5 font-mono text-[12px] leading-[1.7] sm:text-[13px]">
            <code>
              {code.map((line, i) => {
                const isComment = line.trim().startsWith('//');
                const isTag = /^\s*<\/?[A-Za-z]/.test(line);
                return (
                  <motion.span
                    key={i}
                    className="block whitespace-pre"
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT}
                    transition={{ duration: 0.3, ease: EASE, delay: i * 0.07 }}
                  >
                    <span className="mr-4 inline-block w-4 select-none text-right text-white/20">
                      {i + 1}
                    </span>
                    <span
                      className={
                        isComment
                          ? 'italic text-white/35'
                          : isTag
                            ? 'font-medium text-white/90'
                            : 'text-white/70'
                      }
                    >
                      {line || ' '}
                    </span>
                  </motion.span>
                );
              })}
            </code>
          </pre>
        </div>

        {/* ───── Compile seam badge (the real Build button) ───── */}
        <div className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          {buildButton(false)}
        </div>
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 lg:hidden">
          {buildButton(true)}
        </div>

        {/* ───── Preview pane: a rendered page in browser chrome ───── */}
        <div className="flex flex-col border-t border-black/10 lg:border-l lg:border-t-0">
          {/* URL bar */}
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-black/[0.04] px-3 py-1.5 ring-1 ring-inset ring-black/6">
              <LuLock aria-hidden className="size-3 shrink-0 text-black/40" />
              <span className="truncate font-mono text-[11px] tracking-tight text-black/50">
                {previewUrl}
              </span>
            </div>
          </div>

          {done ? (
            <motion.div key={run} className="flex flex-1 flex-col">
              {/* Faux site nav */}
              {(rendered.siteName || rendered.nav) && (
                <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-black/85">
                    <span className="size-3.5 rounded-[5px] bg-black" />
                    {rendered.siteName}
                  </span>
                  <div className="hidden items-center gap-4 sm:flex">
                    {(rendered.nav ?? []).map((n) => (
                      <span
                        key={n}
                        className="text-[12px] tracking-tight text-black/50"
                      >
                        {n}
                      </span>
                    ))}
                    <span className="rounded-md bg-black px-2.5 py-1 text-[11px] font-semibold text-white">
                      {rendered.cta}
                    </span>
                  </div>
                </div>
              )}

              {/* Rendered hero */}
              <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-8">
                {[
                  <span
                    key="eyebrow"
                    className="inline-block w-fit rounded-full bg-black/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/55 ring-1 ring-inset ring-black/10"
                  >
                    {rendered.eyebrow}
                  </span>,
                  <h3
                    key="headline"
                    className="mt-4 text-2xl font-semibold leading-tight tracking-tighter text-black sm:text-3xl"
                  >
                    {rendered.headline}
                  </h3>,
                  <p
                    key="body"
                    className="mt-3 max-w-sm text-sm leading-relaxed text-black/60"
                  >
                    {rendered.body}
                  </p>,
                  <span
                    key="cta"
                    className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold tracking-tight text-white"
                  >
                    {rendered.cta}
                    <LuArrowRight aria-hidden className="size-4" />
                  </span>,
                ].map((el, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: i * 0.1 }}
                  >
                    {el}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Idle / building skeleton */
            <div className="flex flex-1 flex-col justify-center gap-3 px-6 py-10 sm:px-8">
              <span className="h-5 w-24 rounded-full bg-black/[0.06]" />
              <span className="h-8 w-3/4 rounded-lg bg-black/[0.06]" />
              <span className="h-3 w-2/3 rounded-full bg-black/[0.05]" />
              <span className="h-3 w-1/2 rounded-full bg-black/[0.05]" />
              <span className="mt-3 h-9 w-32 rounded-lg bg-black/[0.06]" />
              <span className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
                {building ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                    Building…
                  </>
                ) : (
                  'Press build to compile'
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ───── Build status strip ───── */}
      <div className="flex min-h-[44px] flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/10 bg-black/[0.02] px-5 py-3 sm:px-6">
        {done ? (
          <>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
              {buildLabel}
            </span>
            <span className="hidden h-3 w-px bg-black/10 sm:block" />
            {checks.map((c, i) => (
              <motion.span
                key={`${run}-${c}`}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.15 + i * 0.12 }}
              >
                <LuCheck aria-hidden className="size-3.5 text-black" />
                {c}
              </motion.span>
            ))}
          </>
        ) : (
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
            {building ? (
              <>
                <span className="size-3 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                Compiling…
              </>
            ) : (
              'Ready to build'
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default CodeToUI;
