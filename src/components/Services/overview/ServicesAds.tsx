'use client';

import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
  LuArrowUpRight as ArrowUpRight,
  LuCalendarCheck as CalendarCheck,
  LuPlus as Plus,
} from 'react-icons/lu';
import React from 'react';
import Link from 'next/link';
import { Button, Container, Heading, Img } from '@/components';
import { CATEGORIES } from '@/constants/services';
import type { CarouselApi } from '@/components/ui/carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import DottedFrame from '../shared/DottedFrame';

// Titles + slugs come from CATEGORIES (kept in sync with
// /services/digital-marketing — e.g. the card reads "Conversion Optimization",
// not "CRO"). Each card carries the real full-colour mark of the platform/tool
// that channel runs on — self-hosted 320² AVIFs in shared/logos (the same set
// the Services CTA + Social sections draw from). SEO → Search Console and
// Conversion Optimization → Tag Manager are the honest single marks for those
// disciplines (both tools are cited in the channel copy); Analytics → GA4. All
// six are colour marks on transparent grounds, so none need a dark-mode invert.
const marketingCategory = CATEGORIES['digital-marketing'];

const LOGO_DIR = '/images/shared/logos';

const AD_LOGO_BY_SLUG: Record<string, string> = {
  seo: `${LOGO_DIR}/shared-logos-google-search-console.avif`,
  'google-ads': `${LOGO_DIR}/shared-logos-google-ads.avif`,
  'meta-ads': `${LOGO_DIR}/shared-logos-meta.avif`,
  'linkedin-ads': `${LOGO_DIR}/shared-logos-linkedin.avif`,
  'tracking-analytics': `${LOGO_DIR}/shared-logos-google-analytics.avif`,
  'conversion-rate-optimization': `${LOGO_DIR}/shared-logos-google-tag-manager.avif`,
};

const adsServices = marketingCategory.services.map((service) => ({
  title: service.title,
  imgSrc:
    AD_LOGO_BY_SLUG[service.slug] ??
    `${LOGO_DIR}/shared-logos-google-search-console.avif`,
  href: service.available
    ? `/services/${marketingCategory.slug}/${service.slug}`
    : '/contact',
}));

const ServicesAds = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(adsServices.length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section className="overflow-hidden py-16">
      <Container className="relative flex flex-col items-center md:px-0 lg:pt-8">
        <Heading
          titleTag="h2"
          seperatorTitle="SEO & Paid Ads"
          eyebrowRight="Paid Growth"
          title="SEO & Paid Ads"
          titleAccent="Built to attract, track, and convert qualified traffic."
          description="We bring in qualified traffic with SEO and paid ads, then track every lead, analyze performance, and improve conversion rate over time."
          containerStyle="px-0 md:px-0 mb-10 w-full"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <DottedFrame className="flex w-full items-center justify-center px-2 py-10">
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
                    <div className="group relative flex h-full min-h-80 max-h-96 w-full flex-col justify-between rounded-3xl bg-background-contrast p-6 text-ellipsis">
                      <div className="flex flex-1 items-center justify-center">
                        <Img
                          width={300}
                          height={300}
                          className="max-h-32 w-full object-contain opacity-100 duration-500 transition-all ease-in-out group-hover:scale-90 group-hover:opacity-60"
                          src={item.imgSrc}
                          alt={item.title}
                        />
                      </div>
                      <div className="flex w-full items-center justify-between gap-4">
                        <h3 className="text-2xl font-semibold tracking-tighter transition-all duration-500 ease-in-out group-hover:translate-x-4">
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
        </DottedFrame>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck}>
              Plan Your Paid Growth
            </Button>
          </Link>
          <Link href={`/services/${marketingCategory.slug}`}>
            <Button variant="secondary" icon={ArrowUpRight}>
              Explore {marketingCategory.title}
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesAds };
