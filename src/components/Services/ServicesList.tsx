import { Heading } from '@/components';
import { CATEGORIES } from '@/constants/services';
import { Carousel, Card } from '@/components/ui/apple-cards-carousel';

interface ServicesListProps {
  style?: string;
}

const ServicesList = ({ style }: ServicesListProps) => {
  // Render the real service categories, each linking to its /services page.
  const cards = Object.values(CATEGORIES).map((category, index) => (
    <Card
      key={category.slug}
      index={index}
      layout={true}
      card={{
        src: category.cardImageUrl,
        title: category.title,
        category: category.eyebrow,
        href: `/services/${category.slug}`,
      }}
    />
  ));
  return (
    <section className={`pb-16 ${style}`}>
      <Heading
        titleTag="h2"
        seperatorTitle="04 — Perseus Services"
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
