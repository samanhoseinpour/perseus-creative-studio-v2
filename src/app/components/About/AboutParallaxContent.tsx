"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { useScroll, motion, useTransform } from "framer-motion";
import { Button, Container, ImageKit } from "../";
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
        imgUrl="/about-perseus-2.jpg"
        imgAlt="Close-up shot of a person wearing a black Perseus Creative Studio  brand top, operating a Sony mirrorless camera mounted on a DJI Ronin-S 3 (RS 3) gimbal stabilizer indoors, showing professional video production equipment."
        subheading="Transforming concepts into visuals that resonate and endure."
        heading="See Beyond the Frame"
      >
        <ExampleContent
          heading="Our Vision and Mission"
          subHeading="Why Choose Perseus Creative Studio"
          desc="At Perseus Creative Studio, we’re defined by speed, creativity, flexibility — and above all, results. We deliver same-day video and photo work when needed, and move quickly on larger branding, web, or media projects without sacrificing quality. Our creative team adapts to your vision, shifts direction as needed, and always centers your objectives. You’re not just hiring a vendor — you’re gaining a partner committed to making your brand known, liked, and trusted. With us, every project is driven by purpose: beautiful visuals, compelling stories, and measurable outcomes."
          cta="Explore What We Can Do for You"
          linkTo="/contact"
        />
      </TextParallaxContent>
      <TextParallaxContent
        imgUrl="/about-perseus-1.jpg"
        imgAlt="Detail shot of a person in a black Perseus Creative Studio branded quarter-zip sweater or hoodie, adjusting settings on a Sony mirrorless camera, attached to a camera strap. Focus is on the Perseus logo and the camera controls."
        heading="Unleash Visual Potential"
        subheading="Elevating brands through innovative visual storytelling."
      >
        <ExampleContent
          heading="What We Believe & Our Values"
          subHeading="Principles that power modern brand strategy and design"
          desc="We serve a wide range of clients — from real estate developers, luxury lifestyle brands, health & wellness studios, to construction, corporate, and tech startups — anyone who wants their brand to be meaningful and noticed. We don’t just make visuals; we build identity. Our expertise includes strategic branding and visual systems, custom web design using WordPress or Next.js, and cinematic media production — video, drone footage, and photography tailored to your story. For real estate clients, we offer MLS imagery, 3D floor plans, and virtual tours. We also devise content strategy and digital marketing for brands wanting to grow across channels. And for immersive experiences — events, luxury showcases, hospitality — we capture those moments in a way that resonates long after."
          cta="See Our Work in Action"
          linkTo="/projects"
        />
      </TextParallaxContent>
      <TextParallaxContent
        imgUrl="/about-perseus-3.jpg"
        imgAlt="A person wearing a black Perseus Creative Studio branded top is setting up a Sony mirrorless camera on a small tripod indoors near a glass door, suggesting content creation, photography, or videography setup."
        heading="Crafted to Inspire"
        subheading="Precision-driven visuals designed to captivate and connect."
      >
        <ExampleContent
          heading="Why We Create Perseus Creative Studio ?"
          subHeading="Built to move modern brands forward"
          desc="Perseus Creative Studio was founded to close the gap between bold ideas and precise execution. Modern brands need an agile creative partner that understands business objectives, moves quickly, and never compromises on craft. Our studio is deliberately built around that mindset: senior-level strategy, streamlined production, and workflows that keep branding, web, and media tightly aligned. Every deliverable — from a full launch campaign to a single hero asset — is designed to perform, so your brand shows up consistently, confidently, and ahead of the curve."
          cta="Let’s Build What’s Next"
          linkTo="/contact"
        />
      </TextParallaxContent>
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
      className="sticky! z-0 overflow-hidden rounded-3xl grayscale"
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
      <h2 className="col-span-1 md:col-span-4 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl">
        {heading}
      </h2>
      <div className="col-span-1 md:col-span-8">
        <h3 className="mb-4 text-lg leading-lg sm:text-2xl sm:leading-2xl font-semibold">
          {subHeading}
        </h3>
        <p className="mb-8 text-sm sm:text-md">{desc}</p>
        <div>
          <Link href={linkTo} className="mb-8 flex flex-col">
            <Button>{cta}</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
};

export default AboutParallaxContent;
