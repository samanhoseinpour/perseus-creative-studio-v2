import { servicesData } from "@/app/constants";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

interface ServicesListProps {
  style?: string;
}

const ServicesList = ({ style }: ServicesListProps) => {
  const cards = servicesData.map((card, index) => (
    <Card key={card.id} card={card} index={index} layout={true} />
  ));
  return (
    <section className={`pb-16  ${style}`}>
      <Carousel items={cards} />
    </section>
  );
};

export default ServicesList;
