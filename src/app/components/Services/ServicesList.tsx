import { Container, Heading } from "../";
import LensCard from "../LensCard";
import { servicesData } from "@/app/constants";

const ServicesList = () => {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <Heading
        titleTag="h2"
        title="All Services"
        seperatorTitle="All in one solutions"
        description="explore our services"
      />
      <Container className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {servicesData.map((services) => (
          <div key={services.id}>
            <LensCard
              title={services.title}
              desc={services.description}
              img={services.img}
            />
          </div>
        ))}
      </Container>
    </section>
  );
};

export default ServicesList;
