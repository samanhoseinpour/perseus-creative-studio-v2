import {
  ServicesScrollVideoHero,
  ServicesHero,
  ServicesSvgMask,
  ServicesList,
  WhyChooseUs,
  ServicesFeatures,
  Container,
} from '../components';
import ScrollRevealParagraph from '@/components/smoothui/scroll-reveal-paragraph';

import { whyPerseusServices } from '../constants/index';

const ServicesPage = () => {
  const servicesDesc = `We work with brands to build clear, modern visuals and marketing that actually represent who they are. Our services cover content creation, websites, and digital strategy, all designed to help brands stand out and connect with their audience.`;

  return (
    <main>
      <ServicesHero />
      <section className="bg-white">
        <Container>
          <ScrollRevealParagraph
            paragraph={servicesDesc}
            className="bg-white text-md! leading-md! md:text-4xl! md:leading-4xl! pt-16"
          />
        </Container>
      </section>
      <ServicesList style="bg-white pt-16 sm:pt-32" />
      <ServicesScrollVideoHero />
      <WhyChooseUs
        questions={whyPerseusServices}
        imgSrc="/about-perseus-6.jpg"
        imgAlt="why choose us"
        imgHeight={2432}
        imgWidth={1442}
      />
      <ServicesSvgMask />
      <ServicesFeatures />
    </main>
  );
};

export default ServicesPage;
