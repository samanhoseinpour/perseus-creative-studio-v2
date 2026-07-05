'use client';

import { motion } from 'motion/react';
import { LuArrowUpRight as ArrowUpRight, LuCalendarCheck as CalendarCheck } from 'react-icons/lu';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import ImgClient from '@/components/ImgClient';
import Container from '@/components/ui/Container';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import Link from 'next/link';
type ServiceProps = {
  title: string;
  image: string;
  imageBlur?: string;
  alt: string;
  href: string;
  height: 'tall' | 'medium' | 'short';
  imagePosition?: string;
};

/** Slim projection derived server-side by app/services/page.tsx (from
 *  CATEGORIES.production) — this client section must not import the registry
 *  itself or the whole services content DB ships as JS in the shared chunk. */
export interface ProductionOverviewService {
  slug: string;
  title: string;
  imageUrl: string;
  /** Blur-up placeholder, looked up server-side alongside the projection. */
  imageBlur?: string;
  imageAlt: string;
  imagePosition?: string;
  available: boolean;
}
export interface ProductionOverviewCategory {
  slug: string;
  title: string;
  services: ProductionOverviewService[];
}

// Only the masonry height rhythm stays local, so the column layout keeps its
// varied cadence.
const HEIGHT_RHYTHM: ServiceProps['height'][] = [
  'tall',
  'medium',
  'short',
  'tall',
  'tall',
  'medium',
];

interface ServicesProductionProps {
  category: ProductionOverviewCategory;
  className?: string;
}

const ServicesProduction = ({ category, className }: ServicesProductionProps) => {
  const contentProductionServices: ServiceProps[] = category.services.map(
    (service, index) => ({
      title: service.title,
      image: service.imageUrl,
      imageBlur: service.imageBlur,
      alt: service.imageAlt,
      imagePosition: service.imagePosition,
      href: service.available
        ? `/services/${category.slug}/${service.slug}`
        : '/contact',
      height: HEIGHT_RHYTHM[index % HEIGHT_RHYTHM.length],
    }),
  );

  const getHeightClass = (height: ServiceProps['height']) => {
    switch (height) {
      case 'tall':
        return 'h-96';
      case 'medium':
        return 'h-72';
      case 'short':
        return 'h-56';
      default:
        return 'h-56';
    }
  };

  return (
    <section className={cn('py-16', className)}>
      <Heading
        titleTag="h2"
        seperatorTitle="Content Production"
        eyebrowRight="Asset Library"
        title="Photo & Video Content Production"
        titleAccent="Built for every platform your brand shows up on."
        description="Creative that’s built for distribution. We produce content that works across your website, ads, and social, so every shoot turns into a full asset library."
        containerStyle="md:px-0 mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />
      <Container>
        {/* Masonry Layout using CSS Columns */}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {contentProductionServices.map((service, idx) => (
            <Link href={service.href} key={idx}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group mb-6 block break-inside-avoid overflow-hidden rounded-xl"
              >
                <Card
                  className={`relative ${getHeightClass(service.height)} overflow-hidden p-0`}
                >
                  <ImgClient
                    src={service.image}
                    alt={service.alt}
                    width={300}
                    height={300}
                    blur={service.imageBlur}
                    className={cn(
                      'absolute inset-0 h-full w-full object-cover',
                      service.imagePosition,
                    )}
                  />
                  {/* Color overlay on hover */}
                  <div className="absolute inset-0 bg-linear-to-t from-scrim/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="absolute inset-0 flex flex-col justify-end p-6 bg-linear-to-t from-scrim/70 via-transparent to-transparent">
                    <h3 className="font-semibold text-2xl tracking-tighter text-on-media">
                      {service.title}
                    </h3>
                  </CardContent>
                  <ArrowUpRight className="absolute top-6 right-6 h-6 w-6 text-on-media transition-all duration-300 group-hover:rotate-45" />
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck} className="mx-auto">
              Book Your Consultation
            </Button>
          </Link>
          <Link href={`/services/${category.slug}`}>
            <Button variant="secondary" icon={ArrowUpRight}>
              Explore {category.title}
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesProduction };
