"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { useScroll, motion, useTransform } from "framer-motion";
import { AnimatedGroup, Button, Container, ImageKit, TextEffect } from "../";
import Link from "next/link";

interface TextParallaxContentProps {
  imgUrl: string;
  imgAlt: string;
  subheading: string;
  heading: string;
  children?: ReactNode;
}

interface ExampleContentProps {
  heading: string;
  subHeading: string;
  desc: string;
  cta: string;
  linkTo: string;
}

const AboutParallaxContent = () => {
  return (
    <section>
      <TextParallaxContent
        imgUrl="/website-hero.webp"
        imgAlt="website image"
        subheading="Transforming concepts into visuals that resonate and endure."
        heading="See Beyond the Frame"
      >
        <ExampleContent
          heading="Our Vision and Mission"
          subHeading="Modern Marketing, Unforgettable Brand Experiences"
          desc="At Perseus Creative Studio, our vision goes beyond traditional marketing. We aim to break the mold with creative solutions that resonate in today’s rapidly evolving digital world. Our mission is to elevate brands through innovative strategies and impactful content—whether it’s dynamic visuals, custom-built websites, or interactive experiences. True branding is more than just visuals; it’s about telling your story in a way that sets you apart and engages audiences. In a world where media shapes how we connect, we ensure your brand isn’t just seen but remembered."
          cta="Explore What We Can Do for You"
          linkTo="/contact"
        />
      </TextParallaxContent>
      <TextParallaxContent
        imgUrl="/website-hero.webp"
        imgAlt="website image"
        heading="Unleash Visual Potential"
        subheading="Elevating brands through innovative visual storytelling."
      >
        <ExampleContent
          heading="What We Believe & Our Values"
          subHeading="Principles that power modern brand strategy and design"
          desc="At Perseus Creative Studio, our values guide how we partner, create, and deliver measurable outcomes. We believe in human-centered design, radical clarity, and results you can track. Every engagement connects brand strategy, visual storytelling, and high-performance web design—so your message is consistent from campaign to code. We prioritize accessibility, speed, and SEO best practices to boost discoverability and conversion. Above all, we act as an extension of your team: transparent, data-driven, and committed to long-term growth."
          cta="See Our Work in Action"
          linkTo="/projects"
        />
      </TextParallaxContent>
      <TextParallaxContent
        imgUrl="/website-hero.webp"
        imgAlt="website image"
        heading="Crafted to Inspire"
        subheading="Precision-driven visuals designed to captivate and connect."
      ></TextParallaxContent>
    </section>
  );
};

const IMG_PADDING = 12;

const TextParallaxContent = ({
  imgUrl,
  imgAlt,
  subheading,
  heading,
  children,
}: TextParallaxContentProps) => {
  return (
    <section>
      <div className="relative h-[150svh]">
        <StickyImage imgUrl={imgUrl} imgAlt={imgAlt} />
        <OverlayCopy heading={heading} subheading={subheading} />
      </div>
      {children}
    </section>
  );
};

const StickyImage = ({
  imgUrl,
  imgAlt,
}: {
  imgUrl: string;
  imgAlt: string;
}) => {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["end end", "end start"],
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
      className="!sticky z-0 overflow-hidden rounded-3xl"
    >
      <ImageKit
        src={imgUrl}
        alt={imgAlt}
        className="absolute inset-0 h-full w-full object-cover object-top"
        fill
      />
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 bg-neutral-950/70"
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
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [250, -250]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0]);

  return (
    <motion.div
      ref={targetRef}
      style={{ y, opacity }}
      className="absolute top-0 left-0 flex h-[100svh] w-full flex-col justify-center items-center text-white"
    >
      <h3 className="text-center text-3xl leading-3xl font-bold sm:text-4xl sm:leading-4xl">
        {heading}
      </h3>
      <h4 className="text-center text-sm leading-sm sm:text-md sm:leading-md font-semibold">
        {subheading}
      </h4>
    </motion.div>
  );
};

const ExampleContent = ({
  heading,
  subHeading,
  desc,
  cta,
  linkTo,
}: ExampleContentProps) => {
  return (
    <Container className="grid grid-cols-1 gap-6  py-24 md:grid-cols-12">
      <TextEffect
        as="h2"
        className="col-span-1 md:col-span-4 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl"
      >
        {heading}
      </TextEffect>
      <div className="col-span-1 md:col-span-8">
        <TextEffect
          as="h3"
          className="mb-4 text-lg leading-lg sm:text-2xl sm:leading-2xl font-semibold"
        >
          {subHeading}
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="mb-8 text-sm sm:text-md"
        >
          {desc}
        </TextEffect>
        <AnimatedGroup>
          <Link href={linkTo} className="mb-8 flex flex-col">
            <Button>{cta}</Button>
          </Link>
        </AnimatedGroup>
      </div>
    </Container>
  );
};

export default AboutParallaxContent;
