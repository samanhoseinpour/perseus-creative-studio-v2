import { Heading } from '@/components';
import { servicesDataHome } from '@/constants';
import { Carousel, Card } from '@/components/ui/apple-cards-carousel';

interface ServicesListProps {
  style?: string;
}

const ServicesList = ({ style }: ServicesListProps) => {
  const cards = servicesDataHome.map((card, index) => (
    <Card key={card.id} card={card} index={index} layout={true} />
  ));
  return (
    <section className={`pb-16 ${style}`}>
      <Heading
        titleTag="h2"
        seperatorTitle="03 — Perseus Services"
        eyebrowRight="Strategy · Design · Content · Digital"
        title="All-in-One Solution"
        titleAccent="Built for brands that need momentum."
        description="Everything your brand needs — from strategy and design to content and digital marketing. One senior team, one clear direction, one consistent standard."
        containerStyle="mb-10"
      />
      <Carousel items={cards} />
    </section>
  );
};

export default ServicesList;
