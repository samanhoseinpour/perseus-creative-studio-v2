'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  PlusCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Container } from '@/app/components';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

import { Button } from '@/components/ui/button';

interface FeatureItem {
  image: string;
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
        variant="outline"
        size="icon"
        className="rounded-full !bg-background/50 hover:!bg-background/100 [&_svg:not([class*='size-'])]:size-6"
        onClick={handlePrevious}
        disabled={isPreviousDisabled}
      >
        <ChevronUp />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full !bg-background/50 hover:!bg-background/100 [&_svg:not([class*='size-'])]:size-6"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronDown />
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
  const variants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        transition={{
          layout: {
            duration: 0.4,
            ease: 'easeOut',
          },
        }}
        style={{
          borderRadius: '24px',
        }}
        className="flex cursor-pointer items-start gap-4 overflow-hidden bg-background md:w-fit md:max-w-sm"
        onClick={onClick}
      >
        {isActive ? (
          <motion.div
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            key={`feature-description-active-${feature.title}`}
            transition={{
              duration: 0.4,
              delay: 0.3,
              ease: 'easeOut',
            }}
            className="p-6 text-sm md:p-8 md:text-base"
          >
            <h3 className="tracking-tighter font-semibold text-3xl">
              {feature.title}.
            </h3>

            <h3 className="text-sm tracking-tighter text-black/70 mt-2">
              {feature.description}
            </h3>
          </motion.div>
        ) : (
          <motion.div
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            key={`feature-description-inactive-${feature.title}`}
            transition={{
              duration: 0.4,
              delay: 0.2,
              ease: 'easeOut',
            }}
            className={cn(
              'flex h-fit shrink-0 items-center gap-4 text-sm md:py-3.5 md:pr-6 md:pl-3 md:text-base',
              !isActive && 'h-0 w-0 md:h-auto md:w-auto',
            )}
            style={{
              height: 'auto',
              lineHeight: 'normal',
            }}
          >
            <PlusCircle strokeWidth={1.5} />
            <h3 className="shrink-0 tracking-tighter text-black/70">
              {feature.title}
            </h3>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
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
        variant="outline"
        size="icon"
        className="rounded-full bg-background! [&_svg:not([class*='size-'])]:size-6"
        onClick={handlePrevious}
        disabled={isPreviousDisabled}
      >
        <ChevronLeft />
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
        variant="outline"
        size="icon"
        className="rounded-full bg-background [&_svg:not([class*='size-'])]:size-6"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronRight />
      </Button>
    </div>
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
      image:
        'https://cdn.cosmos.so/604e8a93-c9fe-472c-9a8d-34852c9398aa?format=jpeg',
      title: 'Brand Strategy & Positioning',
      description:
        'We help you clearly define what you do, who you’re for, and why a customer should choose you over other Vancouver options—so your website, ads, and sales conversations are consistent. Brand positioning is essentially differentiation in the customer’s mind and a reason to buy.',
    },
    {
      image:
        'https://cdn.cosmos.so/7fd6ff09-dcc1-47b8-8d67-46e38170faa0?format=jpeg',
      title: 'Logo & Visual Identity',
      description:
        'We design a professional visual system—logo, colors, fonts, and overall style—so you look credible and recognizable everywhere (website, signage, social, ads). Visual identity includes elements like logo, color palette, and typography.',
    },
    {
      image:
        'https://cdn.cosmos.so/3a3ae75b-237b-4ac9-b076-9ae59d227fd0?format=jpeg',
      title: 'Brand Messaging & Copywriting',
      description:
        'We write the words that sell—your tagline, website copy, and ad copy—using a clear tone of voice so customers instantly “get” your business. Tone of voice is about the way your company communicates (how you say it).',
    },
    {
      image:
        'https://cdn.cosmos.so/178b542c-7f78-4976-9346-32b2cb756cac.?format=jpeg',
      title: 'Creative Direction',
      description:
        'We set the creative “north star” so your website, ads, social content, and campaigns all look and feel consistent—same quality, same vibe, same story. Creative direction is about bringing brand elements into a cohesive whole across communications.',
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
        <div className="flex flex-col">
          <h2 className="font-semibold tracking-tighter text-5xl">
            <span className="text-gradient">Brand</span> Strategy & Identity
          </h2>
          <h3 className="sub-heading text-md">
            Get clear on what you sell, look professional everywhere, and sound
            consistent across your website, ads, and social.
          </h3>
        </div>
        <div className="relative h-full min-h-[60vh] w-full overflow-hidden rounded-2xl bg-background-contrast-black px-8 py-8 md:min-h-full md:py-20">
          <FeaturesDesktop
            features={features}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
            activeIndex={activeIndex}
            handleFeatureClick={handleFeatureClick}
            isPreviousDisabled={activeIndex === 0}
            isNextDisabled={activeIndex === features.length - 1}
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

          <div className="absolute top-0 right-0 z-0 flex h-full w-full items-center justify-center lg:w-2/3 lg:mask-[linear-gradient(to_right,transparent,black_30%,black)]">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.img
                key={`feature-image-${activeIndex}`}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
                transition={{
                  duration: 0.4,
                  ease: 'easeOut',
                }}
                src={features[activeIndex].image}
                alt={features[activeIndex].title}
                className="h-full w-full object-cover"
              />
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
};

export { ServicesBranding };
