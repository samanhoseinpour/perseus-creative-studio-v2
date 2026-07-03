import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LuCalendarCheck as CalendarCheck } from 'react-icons/lu';
import Img from '@/components/Img';
import Container from '@/components/ui/Container';
import Button from '@/components/Button';
import Heading from '@/components/Heading';

interface ServicesCtaProps {
  className?: string;
}

// The constellation behind the CTA is the studio's real toolkit, shown as a
// floating dock of full-colour app icons (self-hosted under
// /images/shared/logos). Left cluster = how we make it (Production + design),
// right cluster = how we grow it (Marketing + Social + Web). Monochrome marks
// (Next.js, WordPress) carry `invert` so they flip to white on the dark theme.
type ToolLogo = {
  wrapperClass: string;
  invert?: boolean;
  image: { src: string; alt: string };
};

const TILE =
  'flex size-16 items-center justify-center overflow-hidden rounded-[28%]';

const ServicesCta = ({ className }: ServicesCtaProps) => {
  const leftLogos: ToolLogo[] = [
    {
      wrapperClass: `absolute right-0 -bottom-5 scale-60 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-adobe-after-effects.avif',
        alt: 'Adobe After Effects',
      },
    },
    {
      wrapperClass: `absolute right-24 bottom-1 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-final-cut-pro.avif',
        alt: 'Final Cut Pro',
      },
    },
    {
      wrapperClass: `absolute right-44 bottom-7 scale-60 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-figma.avif',
        alt: 'Figma',
      },
    },
    {
      wrapperClass: `absolute right-44 bottom-28 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-davinci-resolve.avif',
        alt: 'DaVinci Resolve',
      },
    },
    {
      wrapperClass: `absolute bottom-4 left-24 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-adobe-premiere-pro.avif',
        alt: 'Adobe Premiere Pro',
      },
    },
    {
      wrapperClass: `absolute bottom-24 left-20 scale-60 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-adobe-photoshop.avif',
        alt: 'Adobe Photoshop',
      },
    },
  ];

  const rightLogos: ToolLogo[] = [
    {
      wrapperClass: `absolute -bottom-5 left-0 scale-60 ${TILE}`,
      invert: true,
      image: {
        src: '/images/shared/logos/shared-logos-nextjs.avif',
        alt: 'Next.js',
      },
    },
    {
      wrapperClass: `absolute bottom-1 left-24 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-google-ads.avif',
        alt: 'Google Ads',
      },
    },
    {
      wrapperClass: `absolute bottom-7 left-44 scale-60 ${TILE}`,
      invert: true,
      image: {
        src: '/images/shared/logos/shared-logos-wordpress.avif',
        alt: 'WordPress',
      },
    },
    {
      wrapperClass: `absolute bottom-28 left-44 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-meta.avif',
        alt: 'Meta',
      },
    },
    {
      wrapperClass: `absolute right-24 bottom-4 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-youtube.avif',
        alt: 'YouTube',
      },
    },
    {
      wrapperClass: `absolute right-20 bottom-24 scale-60 ${TILE}`,
      image: {
        src: '/images/shared/logos/shared-logos-instagram.avif',
        alt: 'Instagram',
      },
    },
  ];

  const renderLogo = ({ wrapperClass, image, invert }: ToolLogo) => (
    <span key={image.src} className={wrapperClass}>
      <Img
        width={150}
        height={150}
        className={cn('size-full object-contain', invert && 'dark:invert')}
        {...image}
      />
    </span>
  );

  return (
    <section className={cn('overflow-hidden py-20 sm:py-32', className)}>
      <Container className="relative">
        <Heading
          titleTag="h2"
          seperatorTitle="Services Consultation"
          eyebrowRight="Next Step"
          title="Solutions for Modern Businesses"
          titleAccent="Built around the service your brand actually needs."
          description="Not sure which service you need? Book a free consultation and we’ll recommend the best option for your business."
          containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
          titleStyle="max-w-4xl text-center"
          descStyle="max-w-2xl text-center"
        />
        <div className="relative z-10 mt-8 flex justify-center">
          <Link href="/contact">
            <Button variant="primary" icon={CalendarCheck}>
              Book a Free Consultation
            </Button>
          </Link>
        </div>
        <div className="inset-0 -z-10 flex justify-center lg:absolute">
          <div className="relative -top-8 flex justify-between sm:-top-20 lg:top-0 lg:w-full">
            <div className="relative -left-20 min-h-44 min-w-[460px] translate-x-28 scale-80 sm:translate-x-0 lg:min-h-[292px] lg:scale-90 xl:scale-100">
              {leftLogos.map(renderLogo)}
            </div>
            <div className="relative -right-20 min-h-44 min-w-[460px] -translate-x-28 scale-80 sm:translate-x-0 lg:min-h-[292px] lg:scale-90 xl:scale-100">
              {rightLogos.map(renderLogo)}
            </div>
            {/* Radial fade: solid page bg in the center (clears the text area
                and the central icon pile-up) fading out so the tools only read
                at the periphery. Matches the bg in both themes, so no band. */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_75%_at_50%_50%,var(--background),var(--background)_30%,transparent_72%)]" />
          </div>
        </div>
      </Container>
    </section>
  );
};

export { ServicesCta };
