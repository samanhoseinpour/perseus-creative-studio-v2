"use client";

import Link from "next/link";
import { useScroll, useTransform, motion } from "framer-motion";
import { Container, Button, VideoKit, TextEffect } from "../";
import { useRef } from "react";

const Hero = () => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: videoContainerRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);

  return (
    <section className="relative bg-background">
      <motion.div
        style={{ opacity }}
        className="absolute -top-[--header-height] left-0 w-full h-[200vh]"
        ref={videoContainerRef}
      >
        <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
        <VideoKit
          src="home-hero.mp4"
          alt="ancient video from Perseus"
          loading="eager"
          width="100%"
          className="sticky top-0 h-screen object-cover"
        />
      </motion.div>
      <div className="px-6">
        <Container className="relative z-10 h-[100svh] pb-7">
          <motion.div
            className="flex h-full flex-col items-start justify-end"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            whileInView="visible"
            exit="hidden"
            animate="hidden"
            viewport={{ amount: 0.98 }}
          >
            <TextEffect as="h1" className="text-5xl leading-5xl font-bold">
              Perseus Creative Studio.
            </TextEffect>
            <TextEffect
              as="h2"
              delay={0.5}
              className="text-5xl leading-5xl font-bold mb-10"
            >
              Beyond Boundaries.
            </TextEffect>

            <Link href="/contact" className="mb-16">
              <Button size="large">Get Started</Button>
            </Link>
            <TextEffect as="p" per="line" delay={0.5} className="font-semibold">
              We are a creative studio that pushes boundaries and explores new
              possibilities.
            </TextEffect>
          </motion.div>
        </Container>
      </div>
    </section>
  );
};

export default Hero;
