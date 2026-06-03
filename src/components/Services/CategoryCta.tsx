import Link from 'next/link';

import { Button, Container } from '@/components';
import type { ServiceCtaContent } from './types';

interface CategoryCtaProps {
  cta: ServiceCtaContent;
}

const CategoryCta = ({ cta }: CategoryCtaProps) => {
  return (
    <section className="pb-16 sm:pb-24">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-black text-white ring-1 ring-inset ring-white/8">
          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            {/* Statement */}
            <div className="p-8 sm:p-12 lg:p-14">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={cta.primaryHref}>
                  <Button
                    variant="primary"
                    className="w-full justify-center sm:w-auto"
                  >
                    {cta.primaryLabel}
                  </Button>
                </Link>

                {cta.secondaryLabel && cta.secondaryHref && (
                  <Link href={cta.secondaryHref}>
                    <Button
                      variant="secondary"
                      className="w-full justify-center sm:w-auto bg-white"
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
