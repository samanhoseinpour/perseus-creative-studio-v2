import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ImageKit, Container, Button } from '@/app/components';

interface ServicesCtaProps {
  className?: string;
}

const ServicesCta = ({ className }: ServicesCtaProps) => {
  const leftLogos = [
    {
      wrapperClass:
        'absolute right-0 -bottom-5 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        width: 150,
        height: 150,
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-3.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute right-24 bottom-1 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-20.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute right-44 bottom-7 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-6.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute right-44 bottom-28 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-8.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute bottom-4 left-24 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-9.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute bottom-24 left-20 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-21.svg',
        alt: 'logo',
      },
    },
  ] as const;

  const rightLogos = [
    {
      wrapperClass:
        'absolute -bottom-5 left-0 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-12.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute bottom-1 left-24 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-13.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute bottom-7 left-44 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-14.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute bottom-28 left-44 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-15.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute right-24 bottom-4 flex size-20 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-17.svg',
        alt: 'logo',
      },
    },
    {
      wrapperClass:
        'absolute right-20 bottom-24 flex size-20 scale-60 items-center justify-center rounded-full border border-border p-4',
      image: {
        src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/integration/integration-19.svg',
        alt: 'logo',
      },
    },
  ] as const;

  return (
    <section className={cn('overflow-hidden py-8', className)}>
      <Container className="relative">
        <h3 className="mx-auto max-w-4xl text-center tracking-tighter text-4xl md:text-5xl leading-none">
          Solutions for <br />
          <span className="text-gradient font-semibold">
            Modern Businesses.
          </span>
        </h3>
        <h3 className="sub-heading mx-auto text-center max-w-2xl">
          Not sure which service you need?
          <br /> Book a free consultation and we’ll recommend the best option
          for your business.
        </h3>
        <Link
          href="/contact"
          className="relative z-10 mt-8 flex justify-center lg:mt-16"
        >
          <Button>Book a Free Consultation</Button>
        </Link>
        <div className="inset-0 -z-10 flex justify-center lg:absolute">
          <div className="relative -top-8 flex justify-between sm:-top-20 lg:top-0 lg:w-full">
            <div className="relative -left-20 min-h-44 min-w-[460px] translate-x-28 scale-80 sm:translate-x-0 lg:min-h-[292px] lg:scale-90 xl:scale-100">
              {leftLogos.map(({ wrapperClass, image }) => (
                <span key={image.src} className={wrapperClass}>
                  <ImageKit width={150} height={150} {...image} />
                </span>
              ))}
            </div>
            <div className="relative -right-20 min-h-44 min-w-[460px] -translate-x-28 scale-80 sm:translate-x-0 lg:min-h-[292px] lg:scale-90 xl:scale-100">
              {rightLogos.map(({ wrapperClass, image }) => (
                <span key={image.src} className={wrapperClass}>
                  <ImageKit width={150} height={150} {...image} />
                </span>
              ))}
            </div>
            <div className="absolute inset-0 bg-linear-to-r from-background/80 via-transparent to-background/80" />
          </div>
        </div>
      </Container>
    </section>
  );
};

export { ServicesCta };
