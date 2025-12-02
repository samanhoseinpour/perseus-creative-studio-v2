import {
  ServicesScrollVideoHero,
  ServicesHero,
  ServicesSvgMask,
  ServicesList,
} from "../components";

const ServicesPage = () => {
  return (
    <main className="">
      <ServicesHero />
      <ServicesScrollVideoHero />
      <ServicesSvgMask />
      <ServicesList />
    </main>
  );
};

export default ServicesPage;
