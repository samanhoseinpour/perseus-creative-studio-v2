'use client';

import dynamic from 'next/dynamic';

import { cn } from '@/lib/utils';

import { Meteors } from '@/components/ui/meteors';

// Code-split the cobe globe (SSR preserved): its WebGL setup + the cobe lib
// only download when this hero actually renders, instead of riding the shared
// client chunk into every route. The canvas is opacity-0 until cobe boots
// anyway, so the deferred chunk changes nothing visually.
const Globe = dynamic(() =>
  import('@/components/ui/globe').then((m) => m.Globe),
);
import Container from '@/components/ui/Container';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import Breadcrumb from '@/components/Breadcrumb';
import type { Crumb } from '@/components/Breadcrumb';
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
          description="Marketing services built for growth — strategy, creative, content, websites, and performance delivered by one integrated team."
          containerStyle="items-center text-center max-w-4xl"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl"
          descStyle="max-w-2xl text-center"
        />

        {/* 20, not 60: every meteor is an infinitely-animating node, and this
            hero already runs a WebGL globe below — the sparser field reads the
            same while costing a third of the compositor work. */}
        <Meteors number={20} />
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck} shimmer>
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
