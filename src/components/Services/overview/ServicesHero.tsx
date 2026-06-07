'use client';

import { cn } from '@/lib/utils';

import { Globe } from '@/components/ui/globe';
import { Meteors } from '@/components/ui/meteors';
import { Container, Button, Heading, Breadcrumb } from '@/components';
import type { Crumb } from '@/components';
import Link from 'next/link';
import {
  LuCalendarCheck as CalendarCheck,
  LuPanelsTopLeft as PanelsTopLeft,
} from 'react-icons/lu';

interface ServicesHeroProps {
  className?: string;
  crumbs?: Crumb[];
}

const ServicesHero = ({ className, crumbs }: ServicesHeroProps) => {
  return (
    <section
      className={cn(
        'relative overflow-hidden pt-28 sm:pt-32 md:pb-8',
        className,
      )}
    >
      {crumbs && crumbs.length > 0 && (
        <Container className="[&_ol]:justify-center">
          <Breadcrumb crumbs={crumbs} />
        </Container>
      )}
      <Container className="flex flex-col items-center justify-center gap-4 overflow-hidden">
        <Heading
          titleTag="h1"
          seperatorTitle="Services"
          eyebrowRight="Strategy · Creative · Performance"
          title="Creative Services,"
          titleAccent="Worldwide."
          description="Digital marketing services built for growth — strategy, creative, content, websites, and performance delivered by one integrated team."
          containerStyle="items-center text-center max-w-4xl"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl"
          descStyle="max-w-2xl text-center"
        />

        <Meteors number={60} />
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck}>
              Book a Free Consultation
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="secondary" icon={PanelsTopLeft}>
              Explore Projects
            </Button>
          </Link>
        </div>
      </Container>
      <div className="relative h-115 w-full overflow-hidden">
        {/* The cobe globe renders white. Invert it (+ hue-rotate to keep marker
            hue) in light mode so it reads dark on the light page; leave it white
            on the dark page. */}
        <Globe className="translate-y-10 md:translate-y-40 scale-125 md:scale-175 [filter:invert(1)_hue-rotate(180deg)] dark:[filter:none]" />
        {/* Tall, eased fade into the page bg so the globe's bottom edge blends
            smoothly in both themes (especially the bright edge in dark mode). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-background from-15% via-background/60 via-55% to-transparent" />
      </div>
    </section>
  );
};

export { ServicesHero };
