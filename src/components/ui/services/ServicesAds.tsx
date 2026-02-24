'use client';

import { Plus } from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Container, ImageKit } from '@/app/components';
import { Button } from '@/components/ui/button';
import type { CarouselApi } from '@/components/ui/carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const ServicesAds = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const testimonials = [
    {
      title: 'SEO',
      imgSrc: 'services-seo.png',
      href: '',
    },
    {
      title: 'Google Ads',
      imgSrc: 'services-gads.png',
      href: '',
    },
    {
      title: 'Meta Ads',
      imgSrc: 'services-meta.png',
      href: '',
    },
    {
      title: 'LinkedIn Ads',
      imgSrc: 'services-linkedin.png',
      href: '',
    },
    {
      title: 'Tracking & Analytics',
      imgSrc: 'services-ga4.png',
      href: '',
    },
    {
      title: 'CRO',
      imgSrc: 'services-gsc.png',
      href: '',
    },
  ];

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(testimonials.length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, testimonials.length]);

  return (
    <section className="overflow-hidden py-16">
      <Container className="relative flex flex-col items-center md:px-0 lg:pt-8">
        <div className="relative z-10 w-full items-center justify-between lg:flex">
          <h2 className="max-w-2xl text-4xl md:text-5xl leading-5xl font-semibold tracking-tighter">
            <span className="text-gradient">SEO</span> & Paid Ads
          </h2>
          <h3 className="mt-8 max-w-lg tracking-tighter text-black/70 text-md lg:mt-0">
            We bring in qualified traffic with SEO + ads, then track every lead
            and improve conversion rate over time.
          </h3>
        </div>
        <DottedDiv className="mt-8 flex w-full items-center justify-center px-2 py-10">
          <Carousel
            opts={{
              align: 'center',
              loop: true,
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent className="m-0 flex w-full">
              {testimonials.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="px-2 md:basis-1/2 lg:basis-1/3"
                >
                  <Link
                    href={item.href}
                    className="relative z-10 cursor-pointer"
                  >
                    <div className="group relative flex h-full max-h-96 w-full flex-col items-end justify-between rounded-3xl bg-background-contrast p-5 text-ellipsis">
                      <ImageKit
                        width={300}
                        height={300}
                        className="max-h-72 w-full opacity-100 transition-all ease-in-out group-hover:scale-90 group-hover:opacity-60"
                        src={item.imgSrc}
                        alt={item.title}
                      />
                      <div className="flex w-full items-center justify-between gap-4">
                        <h3 className="text-3xl font-semibold tracking-tighter transition-all ease-in-out group-hover:translate-x-4">
                          {item.title}
                        </h3>

                        <Button
                          variant="outline"
                          className="h-12 w-12 rounded-full bg-transparent transition-all ease-in-out hover:bg-muted"
                        >
                          <Plus className="scale-150" />
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
                <CarouselPrevious className="h-10 w-10" />
                <CarouselNext variant="default" className="h-10 w-10" />
              </div>
            </div>
          </Carousel>
        </DottedDiv>
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
