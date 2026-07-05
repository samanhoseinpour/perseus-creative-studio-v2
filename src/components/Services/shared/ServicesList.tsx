import Link from 'next/link';
import { LuLayoutGrid as LayoutGrid } from 'react-icons/lu';

import Button from '@/components/Button';
import Heading from '@/components/Heading';
import { CATEGORIES } from '@/constants/services';
import { blurFor } from '@/lib/imageBlur';
import { Carousel, Card } from '@/components/ui/apple-cards-carousel';
import PopularServices from './PopularServices';

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
        blur: blurFor(category.cardImageUrl),
        title: category.title,
        category: category.eyebrow,
        href: `/services/${category.slug}`,
      }}
    />
  ));
  return (
    <section className={`py-16 ${style}`}>
      <Heading
        titleTag="h2"
        seperatorTitle="Perseus Services"
        eyebrowRight="Strategy · Design · Content · Digital"
        title="All-in-One Solution"
        titleAccent="Built for brands that need momentum."
        description="Everything your brand needs — from strategy and design to content and digital marketing. One senior team, one clear direction, one consistent standard."
        containerStyle="mb-10"
      />
      <Carousel items={cards} />

      {/* Most-requested individual services — a separate band above the CTA. */}
      <PopularServices />

      <div className="mt-12 flex justify-center">
        <Link href="/services">
          <Button variant="primary" icon={LayoutGrid} shimmer={false}>
            View All Services
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default ServicesList;
