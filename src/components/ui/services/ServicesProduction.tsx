'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { ImageKit, Container, Button } from '@/app/components';
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
    url: '',
    height: 'tall',
  },
  {
    title: 'Post-Production',
    image: '/post-production.png',
    url: '',
    height: 'medium',
  },
  {
    title: '3D Models & 360 Tours',
    image: '/3Dmodel.jpg',
    url: '',
    height: 'short',
  },
  {
    title: 'Aerial Production',
    image: '/aerial-production.jpg',
    url: '',
    height: 'tall',
  },
  {
    title: 'Photography',
    image: '/services-photography.jpeg',
    url: '',
    height: 'tall',
  },
  {
    title: 'Pre-Production',
    image: '/navbar-services-2.jpeg',
    url: '',
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
      <Container>
        <div className="mb-12 max-w-2xl">
          <h2 className="mb-4 text-4xl md:text-5xl font-semibold tracking-tight ">
            Photo & Video{' '}
            <span className="text-gradient">Content Production</span>
          </h2>
          <h3 className="text-md tracking-tighter text-black/70">
            Creative that’s built for distribution. We produce content that
            works across your website, ads, and social, so every shoot turns
            into a full asset library.
          </h3>
        </div>

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
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="absolute inset-0 flex flex-col justify-end p-6 bg-linear-to-t from-black/70 via-transparent to-transparent">
                    <h3 className="font-semibold text-2xl tracking-tighter text-white">
                      {service.title}
                    </h3>
                  </CardContent>
                  <ArrowUpRight className="absolute top-6 right-6 h-6 w-6 text-white transition-all duration-300 group-hover:rotate-45" />
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button className="mx-auto">Book You Consultation</Button>
        </div>
      </Container>
    </section>
  );
};

export { ServicesProduction };
