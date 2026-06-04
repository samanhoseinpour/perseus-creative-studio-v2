'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button, Container, Heading, ThemedShader } from '../';
import { LuArrowRight as ArrowRight } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import {
  ABOUT_HERO_HEADING,
  ABOUT_HERO_CTAS,
  ABOUT_PRINCIPLES_HEADING,
  ABOUT_FEATURES,
} from '@/constants/about';

const AboutHero = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  return (
    <div className="flex flex-col mb-8">
      <section
        className="relative w-full max-h-240 h-[60svh] mb-16"
        ref={headerRef}
      >
        <Container className="relative flex flex-col h-full z-10">
          <div className="flex-1 flex flex-col justify-end items-center max-sm:px-5">
            <Heading
              titleTag="h1"
              {...ABOUT_HERO_HEADING}
              containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
              titleStyle="max-w-4xl text-center text-4xl md:text-5xl text-black"
              descStyle="max-w-2xl text-center text-black/70"
            />
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {ABOUT_HERO_CTAS.map((cta) => (
                <Link key={cta.href} href={cta.href}>
                  <Button variant={cta.variant} icon={cta.icon}>
                    {cta.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </Container>
        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ y }}
        >
          <div className="relative h-full w-full">
            <ThemedShader />
          </div>
        </motion.div>
      </section>

      <Container className="z-50">
        <Heading
          titleTag="h2"
          {...ABOUT_PRINCIPLES_HEADING}
          containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <div className="grid grid-cols-3 gap-x-8 gap-y-16 max-sm:grid-cols-1 items-stretch">
          {ABOUT_FEATURES.map((item) => (
            <FeatureCard
              key={item.feature}
              feature={item.feature}
              featureDesc={item.featureDesc}
              icon={item.icon}
            />
          ))}
        </div>
      </Container>
    </div>
  );
};

interface FeatureCardProps {
  feature: string;
  featureDesc: string;
  icon?: IconType;
}

const FeatureCard = ({
  feature,
  featureDesc,
  icon: Icon = ArrowRight,
}: FeatureCardProps) => {
  return (
    <div className="flex flex-col gap-y-4 bg-background-contrast rounded-xl p-6 relative z-10 h-full">
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg leading-lg">
          {feature || 'Feature name'}
        </h3>
      </div>
      <p className="text-xs leading-xs">{featureDesc}</p>
    </div>
  );
};

export default AboutHero;
