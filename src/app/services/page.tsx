import {
  ServicesScrollVideoHero,
  ServicesHero,
  ServicesSvgMask,
  ServicesList,
  WhyChooseUs,
  ServicesFeatures,
  Container,
} from "../components";
import ScrollRevealParagraph from "@/components/smoothui/scroll-reveal-paragraph";

import { whyPerseusServices } from "../constants/index";

const ServicesPage = () => {
  const servicesDesc = `Perseus Creative Studio helps product teams ship with clarity and confidence. We design brands, interfaces, and end-to-end digital experiences that align with your roadmap, sharpen your story, and make every release feel intentional.`;

  return (
    <main className="">
      <ServicesHero />
      <section className="bg-white">
        <Container>
          <ScrollRevealParagraph
            paragraph={servicesDesc}
            className="bg-white text-md! leading-md! md:text-4xl! md:leading-4xl! pt-16"
          />
        </Container>
      </section>
      <ServicesList />
      <ServicesScrollVideoHero />
      <WhyChooseUs
        questions={whyPerseusServices}
        imgSrc="/homeServices-1.JPG"
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
