'use client';

import { motion } from 'framer-motion';
import { LuArrowUpRight as ArrowUpRight, LuCalendarCheck as CalendarCheck } from 'react-icons/lu';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ImageKit, Container, Button, Heading } from '@/components';
import Link from 'next/link';
type ServiceProps = {
  title: string;
  image: string;
  url: string;
  height: 'tall' | 'medium' | 'short';
};

const contentProductionServices: ServiceProps[] = [
  {
    title: 'Videography',
    image: '/navbar-services-2.jpeg',
    url: '/contact',
    height: 'tall',
  },
  {
    title: 'Post-Production',
    image: '/post-production.png',
    url: '/contact',
    height: 'medium',
  },
  {
    title: '2D & 3D Models, Matterport',
    image: '/3Dmodel.jpg',
    url: '/contact',
    height: 'short',
  },
  {
    title: 'Aerial Production',
    image: '/aerial-production.jpg',
    url: '/contact',
    height: 'tall',
  },
  {
    title: 'Photography',
    image: '/services-photography.jpeg',
    url: '/contact',
    height: 'tall',
  },
  {
    title: 'Pre-Production',
    image: '/navbar-services-2.jpeg',
    url: '/contact',
    height: 'medium',
  },
];

interface ServicesProductionProps {
  className?: string;
}

const ServicesProduction = ({ className }: ServicesProductionProps) => {
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
        seperatorTitle="03 — Content Production"
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
            <Link href={service.url} key={idx}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group mb-6 block break-inside-avoid overflow-hidden rounded-xl"
              >
                <Card
                  className={`relative ${getHeightClass(service.height)} overflow-hidden p-0`}
                >
                  <ImageKit
                    src={service.image}
                    alt={service.title}
                    width={300}
                    height={300}
                    className="absolute inset-0 h-full w-full object-cover"
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

        <div className="mt-6 flex justify-center">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck} className="mx-auto">
              Book Your Consultation
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesProduction };
