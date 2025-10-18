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
      {/* <Heading
        titleTag="h3"
        title="Feature Projects"
        seperatorTitle="Feature Projects"
        description="Check Our Latest Projects"
      /> */}
    </main>
  );
};

export default ServicesPage;
