'use client';

import { cn } from '@/lib/utils';

import { Globe } from '@/components/ui/globe';
import { Meteors } from '@/components/ui/meteors';
import { Container, Button, Heading } from '@/components';
import Link from 'next/link';
import { LuCalendarCheck as CalendarCheck, LuPanelsTopLeft as PanelsTopLeft } from 'react-icons/lu';

interface ServicesHeroProps {
  className?: string;
}

const ServicesHero = ({ className }: ServicesHeroProps) => {
  return (
    <section
      className={cn('relative overflow-hidden pt-48 md:pb-8', className)}
    >
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
        <Globe className="translate-y-10 md:translate-y-40 scale-125 md:scale-175" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-white via-white/70 to-transparent" />
      </div>
    </section>
  );
};

export { ServicesHero };
