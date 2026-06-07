import { Container, Heading } from '@/components';
import type { ServiceCategoryContent } from '../types';

interface CategoryFitProps {
  data: ServiceCategoryContent;
}

/**
 * "Who it's for" — the business types this category serves, as an editorial
 * directory: one hairline-divided panel with a cell per segment (industry name
 * + the one-line deliverable we make for it). Lets a reader self-qualify
 * ("yes, that's my business") right after the offer, before the how/proof
 * sections. Hairline grid (gap-px over an ink wash) rather than floating cards,
 * to stay in the page's spec-sheet language. Static server component; hides
 * when content omits `fitFor`.
 */
const CategoryFit = ({ data }: CategoryFitProps) => {
  const fit = data.fitFor;
  if (!fit) return null;

  const { heading, titleAccent, description, segments } = fit;

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
        <div className="overflow-hidden rounded-3xl ring-1 ring-inset ring-black/[0.07]">
          <div className="grid grid-cols-1 gap-px bg-black/[0.07] sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((seg, i) => (
              <div key={seg.name} className="bg-white p-6 sm:p-7">
                <span className="font-mono text-[10px] tracking-[0.18em] text-black/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-lg font-medium tracking-tight text-black">
                  {seg.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-black/55">
                  {seg.deliverable}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CategoryFit;
