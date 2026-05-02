'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';

import { useScroll, motion, useTransform } from 'framer-motion';
import { Button, Container, Heading } from '../';
import Link from 'next/link';

interface TextParallaxContentProps {
  videoUrl: string;
  videoAlt: string;
  subheading: string;
  heading: string;
  children?: ReactNode;
}

interface ExampleContentProps {
  eyebrow: string;
  eyebrowRight: string;
  heading: string;
  titleAccent: string;
  subHeading: string;
  desc: string;
  cta: string;
  linkTo: string;
}

const AboutParallaxContent = () => {
  return (
    <section>
      <TextParallaxContent
        videoUrl="https://www.youtube.com/embed/siYOgBYfgo4?autoplay=1&mute=1&loop=1&playlist=siYOgBYfgo4&controls=0&modestbranding=1&playsinline=1&rel=0"
        videoAlt="Cinematic Real Estate Video | Custom Home Development in Encino, Los Angeles, California"
        subheading="Transforming concepts into visuals that resonate and endure."
        heading="See Beyond the Frame"
      >
        <ExampleContent
          eyebrow="02 — Vision & Mission"
          eyebrowRight="Studio Purpose"
          heading="Our Vision and Mission"
          titleAccent="A creative partner built for speed, clarity, and results."
          subHeading="Why Choose Perseus Creative Studio"
          desc="At Perseus Creative Studio, we’re defined by speed, creativity, flexibility — and above all, results. We deliver same-day video and photo work when needed, and move quickly on larger branding, web, or media projects without sacrificing quality. Our creative team adapts to your vision, shifts direction as needed, and always centers your objectives. You’re not just hiring a vendor — you’re gaining a partner committed to making your brand known, liked, and trusted. With us, every project is driven by purpose: beautiful visuals, compelling stories, and measurable outcomes."
          cta="Explore What We Can Do for You"
          linkTo="/contact"
        />
      </TextParallaxContent>
      <TextParallaxContent
        videoUrl="https://www.youtube.com/embed/4W4UqdZYEKs?autoplay=1&mute=1&loop=1&playlist=4W4UqdZYEKs&controls=0&modestbranding=1&playsinline=1&rel=0"
        videoAlt="342 Mountain Highway | Insane Transitions | SONY FX3 Cinematic Construction Video"
        heading="Unleash Visual Potential"
        subheading="Elevating brands through innovative visual storytelling."
      >
        <ExampleContent
          eyebrow="03 — Beliefs & Values"
          eyebrowRight="Brand Systems"
          heading="What We Believe & Our Values"
          titleAccent="Principles that shape modern brand strategy."
          subHeading="Principles that power modern brand strategy and design"
          desc="We serve a wide range of clients — from real estate developers, luxury lifestyle brands, health & wellness studios, to construction, corporate, and tech startups — anyone who wants their brand to be meaningful and noticed. We don’t just make visuals; we build identity. Our expertise includes strategic branding and visual systems, custom web design using WordPress or Next.js, and cinematic media production — video, drone footage, and photography tailored to your story. For real estate clients, we offer MLS imagery, 3D floor plans, and virtual tours. We also devise content strategy and digital marketing for brands wanting to grow across channels. And for immersive experiences — events, luxury showcases, hospitality — we capture those moments in a way that resonates long after."
          cta="See Our Work in Action"
          linkTo="/projects"
        />
      </TextParallaxContent>
      <TextParallaxContent
        videoUrl="https://www.youtube.com/embed/pjDQN3riSKg?autoplay=1&mute=1&loop=1&playlist=pjDQN3riSKg&controls=0&modestbranding=1&playsinline=1&rel=0"
        videoAlt="Professional Wedding Venue Tour | Cinematic Wedding Video Walkthrough of the Space Shot on Sony FX3"
        heading="Crafted to Inspire"
        subheading="Precision-driven visuals designed to captivate and connect."
      >
        <ExampleContent
          eyebrow="04 — Studio Origin"
          eyebrowRight="Why Perseus"
          heading="Why We Created Perseus Creative Studio ?"
          titleAccent="Built to close the gap between ideas and execution."
          subHeading="Built to move modern brands forward"
          desc="Perseus Creative Studio was founded to close the gap between bold ideas and precise execution. Modern brands need an agile creative partner that understands business objectives, moves quickly, and never compromises on craft. Our studio is deliberately built around that mindset: senior-level strategy, streamlined production, and workflows that keep branding, web, and media tightly aligned. Every deliverable — from a full launch campaign to a single hero asset — is designed to perform, so your brand shows up consistently, confidently, and ahead of the curve."
          cta="Let’s Build What’s Next"
          linkTo="/contact"
        />
      </TextParallaxContent>
      <TextParallaxContent
        videoUrl="https://www.youtube.com/embed/YkGMjWixtME?autoplay=1&mute=1&loop=1&playlist=YkGMjWixtME&controls=0&modestbranding=1&playsinline=1&rel=0"
        videoAlt="Exclusive Listing Tour | Edgemont, North Vancouver | Amin Meysami | The Agency Vancouver"
        heading="Showcase Listings with Clarity"
        subheading="Cinematic tours that elevate agents, developers, and properties."
      />
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
        className="absolute inset-0 bg-neutral-950/20"
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
      className="absolute top-0 left-0 flex h-svh w-full flex-col justify-center items-center text-white"
    >
      <Heading
        titleTag="h3"
        title={heading}
        description={subheading}
        containerStyle="px-6 md:px-0 w-full max-w-none items-center text-center [&>div:first-child]:hidden"
        titleStyle="!mt-0 max-w-4xl text-center text-white text-3xl leading-3xl sm:text-4xl sm:leading-4xl"
        descStyle="max-w-2xl text-center text-white/80 font-semibold mt-0"
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
}: ExampleContentProps) => {
  return (
    <Container className="py-24">
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
          <p className="mb-8 text-sm leading-6 text-black/70 dark:text-white/70 sm:text-md">
            {desc}
          </p>
          <Link href={linkTo} className="flex w-fit">
            <Button>{cta}</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
};

export default AboutParallaxContent;
