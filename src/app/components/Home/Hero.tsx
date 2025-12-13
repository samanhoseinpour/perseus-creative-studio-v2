"use client";

import Link from "next/link";
import { useScroll, useTransform, motion } from "framer-motion";
import { Container, Button, VideoKit } from "../";
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
          src="/home-hero.mp4"
          alt="perseus creative studio ancient video"
          loading="eager"
          className="sticky top-0 h-screen object-cover w-full"
        />
      </motion.div>
      <Container className="relative z-10 h-svh pb-7">
        <motion.div
          className="flex h-full flex-col items-start justify-end text-white"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          whileInView="visible"
          exit="hidden"
          animate="hidden"
          viewport={{ amount: 0.98 }}
        >
          <h1 className="text-4xl leading-4xl sm:text-5xl sm:leading-5xl font-bold">
            Perseus Creative Studio.
          </h1>

          <h2 className="text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-semibold mb-10">
            We help you build a brand people love.
          </h2>

          <Link href="/contact" className="mb-16">
            <Button size="large">Get Started</Button>
          </Link>
          <h2 className="font-semibold text-sm leading-sm">
            We’re a creative marketing studio focused on helping businesses grow
            with purpose.
          </h2>
        </motion.div>
      </Container>
    </section>
  );
};

export default Hero;
