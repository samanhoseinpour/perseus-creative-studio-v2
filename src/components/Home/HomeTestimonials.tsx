import Testimonials from '@/components/Testimonials';
import Heading from '@/components/Heading';
import { TESTIMONIALS } from '@/constants/testimonials';

const HomeTestimonials = () => {
  const testimonials = TESTIMONIALS;
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="Client Testimonials"
        eyebrowRight="Reviews · Results · Long-Term Partners"
        title="What Clients Say"
        titleAccent="Proof from the people we build with."
        description="A collection of client feedback from real projects across real estate, construction, fitness, development, and service-based brands."
        containerStyle="mb-10"
      />
      <Testimonials testimonials={testimonials} />
    </section>
  );
};

export default HomeTestimonials;
