import Link from 'next/link';
import { LuCheck as Check } from 'react-icons/lu';

import { Button, Container, Heading } from '@/components';
import type { ServiceCategoryContent } from '../types';

interface CategoryWhyUsProps {
  data: ServiceCategoryContent;
}

const CategoryWhyUs = ({ data }: CategoryWhyUsProps) => {
  const why = data.whyChooseUs;
  if (!why) return null;

  const { heading, titleAccent, description, rows } = why;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="Why Perseus"
        eyebrowRight={data.title}
        title={heading}
        titleAccent={titleAccent}
        description={description}
        containerStyle="mb-10 sm:mb-12"
      />

      <Container>
        <div className="overflow-hidden rounded-4xl bg-background-contrast p-2 sm:p-3">
          {/* Column headers — desktop only; on mobile each row is self-labelled */}
          <div className="hidden sm:grid sm:grid-cols-[0.7fr_1fr_1fr]">
            <span aria-hidden className="px-7 pt-6 pb-4" />
            <span className="px-7 pt-6 pb-4 text-sm font-medium text-black/40">
              Most studios
            </span>
            <span className="rounded-t-[1.4rem] bg-white px-7 pt-6 pb-4 text-sm font-medium text-black">
              Perseus
            </span>
          </div>

          {rows.map((row, i) => {
            const last = i === rows.length - 1;
            const cellDivider = !last
              ? 'sm:border-b sm:border-black/[0.06]'
              : '';
            return (
              <div
                key={row.aspect}
                className={[
                  'grid grid-cols-1 sm:grid-cols-[0.7fr_1fr_1fr]',
                  !last ? 'border-b border-black/[0.07] sm:border-b-0' : '',
                ].join(' ')}
              >
                {/* Aspect */}
                <div
                  className={`px-7 pt-6 pb-3 sm:flex sm:items-center sm:py-7 ${cellDivider}`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/40">
                    {row.aspect}
                  </span>
                </div>

                {/* Most studios */}
                <div
                  className={`px-7 pb-3 sm:flex sm:items-center sm:py-7 ${cellDivider}`}
                >
                  <span className="mb-1 block text-xs text-black/35 sm:hidden">
                    Most studios
                  </span>
                  <span className="text-base leading-base text-black/45">
                    {row.usual}
                  </span>
                </div>

                {/* Perseus — lifted white card column on desktop */}
                <div
                  className={[
                    'px-7 pb-6 pt-1 sm:py-7 sm:bg-white',
                    cellDivider,
                    last ? 'sm:rounded-b-[1.4rem]' : '',
                  ].join(' ')}
                >
                  <span className="mb-1 block text-xs text-black/35 sm:hidden">
                    Perseus
                  </span>
                  <span className="flex items-start gap-2.5 sm:items-center">
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-black sm:mt-0"
                    />
                    <span className="text-base font-medium leading-base text-black">
                      {row.perseus}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA — shared Button primitive */}
        <div className="mt-10 flex justify-center sm:mt-12">
          <Link href="/contact">
            <Button variant="primary">Start a project</Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default CategoryWhyUs;
