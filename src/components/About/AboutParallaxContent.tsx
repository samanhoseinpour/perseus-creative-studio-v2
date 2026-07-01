'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';

import { useScroll, motion, useTransform } from 'motion/react';
import { Button, Container, Heading } from '../';
import Link from 'next/link';
import {
  ABOUT_PARALLAX_SECTIONS,
  type AboutParallaxBody,
} from '@/constants/about';

interface TextParallaxContentProps {
  videoUrl: string;
  videoAlt: string;
  subheading: string;
  heading: string;
  children?: ReactNode;
}

const AboutParallaxContent = () => {
  return (
    <section>
      {ABOUT_PARALLAX_SECTIONS.map((section) => (
        <TextParallaxContent
          key={section.videoUrl}
          videoUrl={section.videoUrl}
          videoAlt={section.videoAlt}
          subheading={section.subheading}
          heading={section.heading}
        >
          {section.body && <ExampleContent {...section.body} />}
        </TextParallaxContent>
      ))}
    </section>
  );
};

const IMG_PADDING = 12;

const TextParallaxContent = ({
  videoUrl,
  videoAlt,
  subheading,
  heading,
  children,
}: TextParallaxContentProps) => {
  return (
    <section>
      <div className="relative h-[150svh]">
        <StickyImage videoUrl={videoUrl} videoAlt={videoAlt} />
        <OverlayCopy heading={heading} subheading={subheading} />
      </div>
      {children}
    </section>
  );
};

const StickyImage = ({
  videoUrl,
  videoAlt,
}: {
  videoUrl: string;
  videoAlt: string;
}) => {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['end end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <motion.div
      style={{
        height: `calc(100vh - ${IMG_PADDING * 2}px)`,
        top: IMG_PADDING,
        scale,
      }}
      ref={targetRef}
      className="sticky! z-0 overflow-hidden rounded-3xl"
    >
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        <div className="relative h-full w-full">
          <iframe
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[56.25vw] min-w-[177.78vh] min-h-full"
            src={videoUrl}
            title={videoAlt}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
      </div>

      <motion.div
        style={{ opacity }}
        className="absolute inset-0 bg-scrim/20"
      />
    </motion.div>
  );
};

const OverlayCopy = ({
  heading,
  subheading,
}: {
  heading: string;
  subheading: string;
}) => {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [250, -250]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0]);

  return (
    <motion.div
      ref={targetRef}
      style={{ y, opacity }}
      className="absolute top-0 left-0 flex h-svh w-full flex-col justify-center items-center text-on-media"
    >
      <Heading
        titleTag="h3"
        title={heading}
        description={subheading}
        containerStyle="px-6 md:px-0 w-full max-w-none items-center text-center [&>div:first-child]:hidden"
        titleStyle="!mt-0 max-w-4xl text-center text-on-media text-3xl leading-3xl sm:text-4xl sm:leading-4xl"
        descStyle="max-w-2xl text-center text-on-media/80 font-semibold mt-0"
      />
    </motion.div>
  );
};

const ExampleContent = ({
  eyebrow,
  eyebrowRight,
  heading,
  titleAccent,
  subHeading,
  desc,
  cta,
  linkTo,
  icon: CtaIcon,
  variant: ctaVariant,
}: AboutParallaxBody) => {
  return (
    <Container className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={eyebrow}
        eyebrowRight={eyebrowRight}
        title={heading}
        titleAccent={titleAccent}
        description={subHeading}
        containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="col-span-1 md:col-start-5 md:col-span-8">
          <p className="mb-8 text-sm leading-6 text-black/70 sm:text-md">
            {desc}
          </p>
          <Link href={linkTo} className="flex w-fit">
            <Button variant={ctaVariant} icon={CtaIcon}>
              {cta}
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
};

export default AboutParallaxContent;
