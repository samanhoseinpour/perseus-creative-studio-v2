'use client';

import { cn } from '@/lib/utils';

import { Globe } from '@/components/ui/globe';
import { Meteors } from '@/components/ui/meteors';
import { Container, Button } from '@/app/components';
import Link from 'next/link';

interface ServicesHeroProps {
  className?: string;
}

const ServicesHero = ({ className }: ServicesHeroProps) => {
  return (
    <section className={cn('pt-48 pb-8', className)}>
      <Container className="flex flex-col items-center justify-center gap-4 overflow-hidden">
        <h2 className="text-center text-md text-black/70 tracking-tighter">
          Digital marketing services built for growth, strategy, creative, and
          performance in one team.
        </h2>
        <h1 className="text-center tracking-tighter text-4xl md:text-5xl font-semibold">
          Creative Services, <span className="text-gradient">Worldwide.</span>
        </h1>

        <Meteors number={60} />
        <Link href="/contact">
          <Button>Book a Free Consultation</Button>
        </Link>
      </Container>
      <div className="relative h-115 w-full overflow-hidden">
        <Globe className="translate-y-40 scale-125 md:scale-175" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-white via-white/70 to-transparent" />
      </div>
    </section>
  );
};

export { ServicesHero };
