import {
  ServicesScrollVideoHero,
  ServicesHero,
  ServicesSvgMask,
  ServicesList,
  WhyChooseUs,
} from "../components";

import { whyPerseusServices } from "../constants/index";

const ServicesPage = () => {
  return (
    <main className="">
      <ServicesHero />
      <WhyChooseUs
        questions={whyPerseusServices}
        imgSrc="/homeServices-1.JPG"
        imgAlt="why choose us"
        imgHeight={2432}
        imgWidth={1442}
      />
      <ServicesScrollVideoHero />
      <ServicesSvgMask />
      <ServicesList />
    </main>
  );
};

export default ServicesPage;
