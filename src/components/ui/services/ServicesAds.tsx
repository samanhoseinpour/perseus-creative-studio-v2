'use client';

import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
  LuCalendarCheck as CalendarCheck,
  LuPanelsTopLeft as PanelsTopLeft,
  LuPlus as Plus,
} from 'react-icons/lu';
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button, Container, Heading, ImageKit } from '@/components';
import type { CarouselApi } from '@/components/ui/carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

const ServicesAds = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const adsServices = [
    {
      title: 'SEO',
      imgSrc: 'services-seo.png',
      href: '/contact',
    },
    {
      title: 'Google Ads',
      imgSrc: 'services-gads.png',
      href: '/contact',
    },
    {
      title: 'Meta Ads',
      imgSrc: 'services-meta.png',
      href: '/contact',
    },
    {
      title: 'LinkedIn Ads',
      imgSrc: 'services-linkedin.png',
      href: '/contact',
    },
    {
      title: 'Tracking & Analytics',
      imgSrc: 'services-ga4.png',
      href: '/contact',
    },
    {
      title: 'CRO',
      imgSrc: 'services-gsc.png',
      href: '/contact',
    },
  ];

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(adsServices.length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, adsServices.length]);

  return (
    <section className="overflow-hidden py-16">
      <Container className="relative flex flex-col items-center md:px-0 lg:pt-8">
        <Heading
          titleTag="h2"
          seperatorTitle="02 — SEO & Paid Ads"
          eyebrowRight="Paid Growth"
          title="SEO & Paid Ads"
          titleAccent="Built to attract, track, and convert qualified traffic."
          description="We bring in qualified traffic with SEO and paid ads, then track every lead, analyze performance, and improve conversion rate over time."
          containerStyle="px-0 md:px-0 mb-10 w-full"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <DottedDiv className="flex w-full items-center justify-center px-2 py-10">
          <Carousel
            opts={{
              align: 'center',
              loop: true,
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent className="m-0 flex w-full">
              {adsServices.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="px-2 md:basis-1/2 lg:basis-1/3"
                >
                  <Link
                    href={item.href}
                    className="relative z-10 cursor-pointer"
                    aria-label={`Discuss ${item.title} with Perseus Creative Studio`}
                  >
                    <div className="group relative flex h-full max-h-96 w-full flex-col items-end justify-between rounded-3xl bg-background-contrast p-5 text-ellipsis">
                      <ImageKit
                        width={300}
                        height={300}
                        // Brand logos are baked on white tiles; invert + hue-rotate
                        // in dark mode darkens the tile, keeping logo hues ~right.
                        className="max-h-72 w-full opacity-100 duration-500 transition-all ease-in-out group-hover:scale-90 group-hover:opacity-60 dark:[filter:invert(1)_hue-rotate(180deg)]"
                        src={item.imgSrc}
                        alt={item.title}
                      />
                      <div className="flex w-full items-center justify-between gap-4">
                        <h3 className="text-3xl font-semibold tracking-tighter transition-all duration-500 ease-in-out group-hover:translate-x-4">
                          {item.title}
                        </h3>

                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          showIcon={false}
                          className="pointer-events-none aspect-square h-11 w-11 rounded-full p-0 transition-all duration-500 group-hover:rotate-90"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="mt-8 flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">
                  {current.toString().padStart(2, '0')}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {count.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="relative mr-10 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  className="aspect-square h-10 w-10 p-0"
                  onClick={() => api?.scrollPrev()}
                  aria-label="Previous paid growth service"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  className="aspect-square h-10 w-10 p-0"
                  onClick={() => api?.scrollNext()}
                  aria-label="Next paid growth service"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Carousel>
        </DottedDiv>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck}>
              Plan Your Paid Growth
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="secondary" icon={PanelsTopLeft}>
              Explore Projects
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesAds };

const DottedDiv = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('relative', className)}>
    <div className="absolute top-4 -left-[12.5px] h-[1.5px] w-[110%] bg-background-contrast md:-left-20" />
    <div className="absolute bottom-4 -left-[12.5px] h-[1.5px] w-[110%] bg-background-contrast md:-left-20" />
    <div className="absolute -top-4 left-0 h-[110%] w-[1.5px] bg-background-contrast" />
    <div className="absolute -top-4 right-0 h-[110%] w-[1.5px] bg-background-contrast" />
    <div className="absolute top-[12.5px] left-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute top-[12.5px] right-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute bottom-[12.5px] left-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute right-[-3px] bottom-[12.5px] z-10 h-2 w-2 rounded-full bg-foreground" />
    {children}
  </div>
);
