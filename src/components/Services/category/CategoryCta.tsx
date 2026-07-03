import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuCalendarCheck as CalendarCheck,
} from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import type { ServiceCtaContent } from '../types';

interface CategoryCtaProps {
  cta: ServiceCtaContent;
}

const CategoryCta = ({ cta }: CategoryCtaProps) => {
  return (
    <section className="pb-16 sm:pb-24">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-black text-white">
          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            {/* Statement */}
            <div className="p-8 sm:p-12 lg:p-14">
              <span className="eyebrow text-[10px] text-white/45">
                {cta.eyebrow}
              </span>
              <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl lg:leading-5xl">
                {cta.headline}
              </h2>
            </div>

            {/* Support + actions, divided by a hairline seam */}
            <div className="flex flex-col justify-between gap-10 border-t border-white/10 p-8 sm:p-12 lg:border-l lg:border-t-0 lg:p-14">
              <p className="max-w-sm text-sm leading-relaxed text-white/60 sm:text-base">
                {cta.description}
              </p>

              {/* The band is ink-colored (inverted), so the default button
                  fills self-cancel against it (the primary's foreground fill
                  matches the band exactly in dark mode). Invert the buttons
                  with the band: primary takes the page-background fill (always
                  the band's opposite), secondary goes ghost-outline in the
                  band's own ink. */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={cta.primaryHref}>
                  <Button
                    variant="primary"
                    icon={CalendarCheck}
                    background="var(--background)"
                    shimmerColor="var(--foreground)"
                    className="w-full justify-center border-black/10 text-black sm:w-auto"
                  >
                    {cta.primaryLabel}
                  </Button>
                </Link>

                {cta.secondaryLabel && cta.secondaryHref && (
                  <Link href={cta.secondaryHref}>
                    <Button
                      variant="secondary"
                      icon={ArrowUpRight}
                      className="w-full justify-center sm:w-auto border-white/25 bg-white/0 text-white/85 shadow-none backdrop-blur-none hover:border-white/50 hover:bg-white/10 hover:text-white"
                    >
                      {cta.secondaryLabel}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CategoryCta;
