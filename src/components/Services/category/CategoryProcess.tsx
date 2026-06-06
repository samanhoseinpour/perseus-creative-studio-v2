import { Container } from '@/components';
import type { ServiceCategoryContent } from '../types';

interface CategoryProcessProps {
  data: ServiceCategoryContent;
}

/**
 * "How we work" — the engagement steps for a category, as a single dark
 * inverted band (a deliberate dark moment on an otherwise light page). The
 * signature is the oversized ghost numerals and a hairline rail that threads
 * numbered nodes across the steps. Static (CSS-only hovers) — server component.
 */
const CategoryProcess = ({ data }: CategoryProcessProps) => {
  const process = data.process;
  if (!process) return null;

  const { heading, description, steps } = process;

  return (
    <section className="px-6 pb-16 sm:pb-24">
      <Container className="px-0 md:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-black p-7 text-white ring-1 ring-inset ring-white/10 sm:p-10 lg:p-14">
          {/* Header */}
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/45">
              How we work
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tighter sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-4 max-w-xl text-sm text-white/60">{description}</p>
          </div>

          {/* Steps */}
          <ol className="relative mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {/* Hairline rail threading the nodes (lg). The black node rings cut
                gaps into it, so it reads as a connected-but-stepped line. */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-[5px] hidden h-px bg-linear-to-r from-white/30 via-white/15 to-white/5 lg:block"
            />
            {steps.map((s) => (
              <li key={s.step} className="group relative pt-7">
                {/* Node on the rail */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 size-3 rounded-full bg-white/30 ring-4 ring-black transition-colors duration-300 group-hover:bg-white"
                />
                {/* Oversized ghost numeral — the editorial anchor */}
                <span
                  aria-hidden
                  className="block text-6xl font-semibold leading-none tracking-tighter text-white/10 transition-colors duration-300 group-hover:text-white/20 lg:text-7xl"
                >
                  {s.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-white/55">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
};

export default CategoryProcess;
