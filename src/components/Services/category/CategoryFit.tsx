'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LuArrowRight } from 'react-icons/lu';

import { Container, Heading } from '@/components';
import type { ServiceCategoryContent } from '../types';

interface CategoryFitProps {
  data: ServiceCategoryContent;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "Who it's for" — the business types this category serves, as an interactive
 * switcher: a selectable industry list on one side, a large detail panel on the
 * other showing the chosen industry's deliverable (with a watermark index). Lets
 * a reader self-qualify ("yes, that's my business") by clicking through. Client
 * component (selection state); studio tokens; hides when content omits `fitFor`.
 */
const CategoryFit = ({ data }: CategoryFitProps) => {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  const fit = data.fitFor;
  if (!fit) return null;
  const { heading, titleAccent, description, segments } = fit;
  const current = segments[active] ?? segments[0];

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="Who it's for"
        eyebrowRight={data.title}
        title={heading}
        titleAccent={titleAccent}
        description={description}
        containerStyle="mb-10 sm:mb-12"
      />

      <Container>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
          {/* Industry list */}
          <ul className="flex flex-col gap-1 rounded-3xl p-2 sm:p-2.5">
            {segments.map((seg, i) => {
              const isActive = i === active;
              return (
                <li key={seg.name}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActive(i)}
                    className={[
                      'group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4',
                      isActive
                        ? 'bg-black text-white'
                        : 'text-black/70 hover:bg-black/[0.04] hover:text-black',
                    ].join(' ')}
                  >
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-white/50' : 'text-black/30'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-medium tracking-tight sm:text-base">
                      {seg.name}
                    </span>
                    <LuArrowRight
                      aria-hidden
                      className={`size-4 shrink-0 transition-all duration-300 ${
                        isActive
                          ? 'translate-x-0 opacity-100'
                          : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-40'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail panel */}
          <div className="relative flex min-h-[15rem] flex-col overflow-hidden rounded-3xl bg-background-contrast p-8 sm:min-h-[17rem] sm:p-10 lg:p-12">
            {/* Watermark index */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-3 -top-10 select-none font-mono text-[9rem] font-semibold leading-none tracking-tighter text-black/[0.04] sm:-top-14 sm:text-[13rem]"
            >
              {String(active + 1).padStart(2, '0')}
            </span>

            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="relative flex flex-1 flex-col"
            >
              <span className="eyebrow text-[10px] text-black/45">
                What we make
              </span>
              <h3 className="mt-5 text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">
                {current.name}
              </h3>
              <p className="mt-5 max-w-md text-base leading-relaxed text-black/60 sm:text-lg">
                {current.deliverable}
              </p>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CategoryFit;
