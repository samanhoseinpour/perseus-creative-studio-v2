'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import {
  LuArrowUpRight as ArrowUpRight,
  LuChevronDown as ChevronDown,
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuChevronUp as ChevronUp,
  LuCirclePlus as PlusCircle,
} from 'react-icons/lu';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Container, Heading } from '@/components';
import { CATEGORIES } from '@/constants/services';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getBrandingVisual } from '../visuals/brandingBentoVisuals';

const brandingCategory = CATEGORIES.branding;

interface FeatureItem {
  slug: string;
  title: string;
  description: string;
}

interface ControlsProps {
  handleNext: () => void;
  handlePrevious: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
}

const Controls = ({
  handleNext,
  handlePrevious,
  isPreviousDisabled,
  isNextDisabled,
}: ControlsProps) => {
  return (
    <div className="hidden flex-col items-start gap-8 lg:flex">
      <Button
        type="button"
        variant="secondary"
        size="small"
        showIcon={false}
        className="aspect-square h-10 w-10 rounded-full bg-background/70 p-0 hover:bg-background disabled:pointer-events-none disabled:opacity-40"
        onClick={handlePrevious}
        disabled={isPreviousDisabled}
        aria-label="Previous branding feature"
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        showIcon={false}
        className="aspect-square h-10 w-10 rounded-full bg-background/70 p-0 hover:bg-background disabled:pointer-events-none disabled:opacity-40"
        onClick={handleNext}
        disabled={isNextDisabled}
        aria-label="Next branding feature"
      >
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
};

interface FeatureCardProps {
  feature: FeatureItem;
  isActive: boolean;
  onClick: () => void;
}

const FeatureCard = ({ feature, isActive, onClick }: FeatureCardProps) => {
  // Static (no motion) — only the showcase image animates between features.
  return (
    <div
      style={{ borderRadius: '24px' }}
      className="flex cursor-pointer items-start gap-4 overflow-hidden bg-background md:w-fit md:max-w-sm"
      onClick={onClick}
    >
      {isActive ? (
        <div className="p-6 text-sm md:p-8 md:text-base">
          <h3 className="tracking-tighter font-semibold text-lg leading-none md:text-3xl">
            {feature.title}.
          </h3>

          <h3 className="text-[10px] md:text-sm tracking-tighter text-black/70 mt-2">
            {feature.description}
          </h3>

          <Link
            href={`/services/branding/${feature.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-block w-fit"
          >
            <Button variant="secondary" size="small" icon={ArrowUpRight}>
              Explore {feature.title}
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            'group flex h-fit shrink-0 items-center gap-3 text-sm md:py-3.5 md:pr-6 md:pl-3 md:text-base',
            'h-0 w-0 md:h-auto md:w-auto',
          )}
          style={{ lineHeight: 'normal' }}
        >
          <Button
            type="button"
            variant="secondary"
            size="small"
            showIcon={false}
            className="pointer-events-none aspect-square h-8 w-8 rounded-full p-0 transition-transform duration-500 group-hover:rotate-90"
            tabIndex={-1}
            aria-hidden="true"
          >
            <PlusCircle
              className="h-4 w-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Button>
          <h3 className="shrink-0 tracking-tighter text-on-media/70">
            {feature.title}
          </h3>
        </div>
      )}
    </div>
  );
};

interface FeaturesDesktopProps {
  features: FeatureItem[];
  handleNext: () => void;
  handlePrevious: () => void;
  activeIndex: number;
  handleFeatureClick: (index: number) => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
}

const FeaturesDesktop = ({
  features,
  handleNext,
  handlePrevious,
  activeIndex,
  handleFeatureClick,
  isPreviousDisabled,
  isNextDisabled,
}: FeaturesDesktopProps) => {
  return (
    <div className="relative z-10 hidden items-center gap-8 md:flex">
      <Controls
        handleNext={handleNext}
        handlePrevious={handlePrevious}
        isPreviousDisabled={isPreviousDisabled}
        isNextDisabled={isNextDisabled}
      />
      <div className="flex flex-col gap-4">
        {features.map((feature, index) => {
          return (
            <FeatureCard
              key={`feature-card-${index}`}
              feature={feature}
              isActive={index === activeIndex}
              onClick={() => handleFeatureClick(index)}
            />
          );
        })}
      </div>
    </div>
  );
};

interface FeatureMobileProps {
  features: FeatureItem[];
  handleNext: () => void;
  handlePrevious: () => void;
  activeIndex: number;
  direction: 1 | -1;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
}

const FeaturesMobile = ({
  features,
  handleNext,
  handlePrevious,
  activeIndex,
  direction,
  isPreviousDisabled,
  isNextDisabled,
}: FeatureMobileProps) => {
  const variants = {
    initial: (direction: 1 | -1) => ({
      opacity: 0,
      scale: 0.6,
      x: direction * 50 + '%',
    }),
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
    },
    exit: (direction: 1 | -1) => ({
      opacity: 0,
      scale: 0.6,
      x: direction * -50 + '%',
    }),
  };

  return (
    <div className="absolute bottom-6 left-0 z-10 flex w-full items-end justify-between gap-6 px-6 md:hidden">
      <Button
        type="button"
        variant="secondary"
        size="small"
        showIcon={false}
        className="aspect-square h-10 w-10 rounded-full bg-background p-0 disabled:pointer-events-none disabled:opacity-40"
        onClick={handlePrevious}
        disabled={isPreviousDisabled}
        aria-label="Previous branding feature"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </Button>
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={`feature-mobile-${activeIndex}`}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          custom={direction}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
          className="h-full w-full object-cover"
        >
          <FeatureCard
            feature={features[activeIndex]}
            isActive={true}
            onClick={() => {}}
          />
        </motion.div>
      </AnimatePresence>

      <Button
        type="button"
        variant="secondary"
        size="small"
        showIcon={false}
        className="aspect-square h-10 w-10 rounded-full bg-background p-0 disabled:pointer-events-none disabled:opacity-40"
        onClick={handleNext}
        disabled={isNextDisabled}
        aria-label="Next branding feature"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
};

interface SpecimenStageProps {
  slug: string;
  activeIndex: number;
  direction: 1 | -1;
  variants: Variants;
}

/**
 * The crossfading "specimen" on the dark stage — the active feature's bespoke
 * code visual, framed in an adaptive card so it reads on the dark panel in both
 * themes. Replaces the old stock photo; fills whatever box the caller sizes
 * (an aspect box on desktop, the panel on mobile).
 */
const SpecimenStage = ({
  slug,
  activeIndex,
  direction,
  variants,
}: SpecimenStageProps) => {
  const Visual = getBrandingVisual(slug);
  return (
    <AnimatePresence mode="popLayout" custom={direction}>
      <motion.div
        key={`branding-specimen-${activeIndex}`}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={direction}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <div className="grid h-full w-full place-items-center overflow-hidden rounded-2xl border border-border bg-background-contrast p-5 sm:p-7">
          {Visual ? <Visual /> : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface ServicesBrandingProps {
  features?: FeatureItem[];
  className?: string;
}

const ServicesBranding = ({
  className,
  features = [
    {
      slug: 'brand-strategy-positioning',
      title: 'Brand Strategy & Positioning',
      description:
        'We help you clearly define what you do, who you’re for, and why a customer should choose you over other Vancouver options—so your website, ads, and sales conversations are consistent. Brand positioning is essentially differentiation in the customer’s mind and a reason to buy.',
    },
    {
      slug: 'logo-visual-identity',
      title: 'Logo & Visual Identity',
      description:
        'We design a professional visual system—logo, colors, fonts, and overall style—so you look credible and recognizable everywhere (website, signage, social, ads). Visual identity includes elements like logo, color palette, and typography.',
    },
    {
      slug: 'brand-messaging-copywriting',
      title: 'Brand Messaging & Copywriting',
      description:
        'We write the words that sell—your tagline, website copy, and ad copy—using a clear tone of voice so customers instantly “get” your business. Tone of voice is about the way your company communicates (how you say it).',
    },
    {
      slug: 'creative-direction',
      title: 'Creative Direction',
      description:
        'We set the creative “north star” so your website, ads, social content, and campaigns all look and feel consistent—same quality, same vibe, same story. Creative direction is about bringing brand elements into a cohesive whole across communications.',
    },
    {
      slug: 'brand-guidelines',
      title: 'Brand Guidelines',
      description:
        'We document the rules—logo usage, color, typography, and tone of voice—in a clear guideline your whole team can follow, so your brand stays consistent across every channel, vendor, and new hire.',
    },
  ],
}: ServicesBrandingProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleNext = () => {
    setDirection(1);
    if (activeIndex !== features.length - 1) {
      setActiveIndex((prevIndex) => prevIndex + 1);
    }
  };

  const handlePrevious = () => {
    setDirection(-1);
    if (activeIndex !== 0) {
      setActiveIndex((prevIndex) => prevIndex - 1);
    }
  };

  const handleFeatureClick = (index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const xOffset = !isMobile ? 50 : 15;
  const yOffset = !isMobile ? 15 : 5;
  const scale = !isMobile ? 0.6 : 0.8;

  const variants = {
    initial: (direction: 1 | -1) => ({
      opacity: 0,
      scale: scale,
      filter: 'blur(20px)',
      x: direction * xOffset + '%',
      y: direction * yOffset + '%',
    }),
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      x: 0,
      y: 0,
    },
    exit: (direction: 1 | -1) => ({
      opacity: 0,
      scale: scale,
      x: direction * -xOffset + '%',
      y: direction * -yOffset + '%',
      filter: 'blur(20px)',
    }),
  };

  return (
    <section className={cn('py-16 bg-background-contrast', className)}>
      <Container className="space-y-12">
        <Heading
          titleTag="h2"
          seperatorTitle="Brand Strategy & Identity"
          eyebrowRight="Brand Systems"
          title="Brand Strategy & Identity"
          titleAccent="Built to make your business clear, credible, and consistent."
          description="Get clear on what you sell, look professional everywhere, and sound consistent across your website, ads, and social."
          containerStyle="px-0 md:px-0 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <div className="relative w-full overflow-hidden rounded-2xl bg-background-contrast-black p-6 sm:p-8 md:p-10">
          {/* Tablet stacks; desktop puts the selector left, live specimen right. */}
          <div className="hidden gap-8 md:grid md:grid-cols-1 lg:grid-cols-2 lg:items-center lg:gap-12">
            <FeaturesDesktop
              features={features}
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              activeIndex={activeIndex}
              handleFeatureClick={handleFeatureClick}
              isPreviousDisabled={activeIndex === 0}
              isNextDisabled={activeIndex === features.length - 1}
            />
            <div className="relative aspect-4/3 w-full md:mx-auto md:max-w-md lg:max-w-none">
              <SpecimenStage
                slug={features[activeIndex].slug}
                activeIndex={activeIndex}
                direction={direction}
                variants={variants}
              />
            </div>
          </div>

          {/* Mobile — specimen fills the panel with the active feature overlaid. */}
          <div className="relative min-h-[26rem] md:hidden">
            <SpecimenStage
              slug={features[activeIndex].slug}
              activeIndex={activeIndex}
              direction={direction}
              variants={variants}
            />
            <FeaturesMobile
              features={features}
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              activeIndex={activeIndex}
              direction={direction}
              isPreviousDisabled={activeIndex === 0}
              isNextDisabled={activeIndex === features.length - 1}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Link href={`/services/${brandingCategory.slug}`}>
            <Button variant="secondary" icon={ArrowUpRight}>
              Explore {brandingCategory.title}
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesBranding };
