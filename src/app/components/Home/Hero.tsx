'use client';

import Link from 'next/link';
import { useScroll, useTransform, motion } from 'framer-motion';
import { Container, Button } from '../';
import { useRef } from 'react';
import { Shader4 } from '@/components/shader4';

const Hero = () => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: videoContainerRef,
    offset: ['start start', 'end end'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);

  return (
    <section className="relative bg-black">
      <motion.div
        style={{ opacity }}
        className="absolute -top-[--header-height] left-0 w-full h-[200vh]"
        ref={videoContainerRef}
      >
        <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
        <div className="sticky top-0 h-dvh w-full overflow-hidden">
          <div className="relative h-full w-full">
            <Shader4 />
          </div>
        </div>
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

          <h2 className="text-xl leading-xl sm:text-4xl sm:leading-4xl font-semibold mb-10">
            We help you build a brand people love.
          </h2>

          <Link href="/contact" className="mb-16">
            <Button size="large">Get Started</Button>
          </Link>
          <h3 className="font-semibold text-sm leading-sm">
            We’re a creative digital marketing agency focused on helping
            businesses grow with purpose.
          </h3>
        </motion.div>
      </Container>
    </section>
  );
};

export default Hero;
