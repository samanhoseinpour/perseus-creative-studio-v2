import { Heading, Testimonials } from '@/components';
import { TESTIMONIALS, PRODUCTION_TESTIMONIALS } from '@/constants/testimonials';
import type { ServiceCategoryContent } from '../types';

interface CategoryTestimonialsProps {
  data: ServiceCategoryContent;
}

/**
 * Client social proof for a category — the funnel's human beat, sitting right
 * after the "Why Perseus" claims and before the FAQ. Reuses the shared
 * `Testimonials` carousel and the studio-wide `TESTIMONIALS` set; Production
 * keeps its curated `PRODUCTION_TESTIMONIALS` subset. Server component.
 */
const CategoryTestimonials = ({ data }: CategoryTestimonialsProps) => {
  const set =
    data.slug === 'production' ? PRODUCTION_TESTIMONIALS : TESTIMONIALS;
  if (set.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="What clients say"
        eyebrowRight={data.title}
        title="Proof from the people"
        titleAccent="we build with."
        description="Real feedback from clients across real estate, construction, fitness, and development — the partners we work with project after project."
        containerStyle="mb-10"
        titleStyle="max-w-3xl"
        descStyle="max-w-3xl"
      />
      <Testimonials testimonials={set} autoplay />
    </section>
  );
};

export default CategoryTestimonials;
