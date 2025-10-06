"use client";

import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

import { useEffect, useState } from "react";
import {
  Button,
  Container,
  ImageKit,
  Heading,
  TextEffect,
} from "../components";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
};
const Testimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };
  return (
    <section>
      <Heading
        title="Trusted by founders and operators"
        titleTag="h3"
        seperatorTitle="Proof in performance"
        description="Selective engagements, measurable outcomes. Here’s what our clients’ leadership says about partnering with Perseus on brand, product, and go‑to‑market."
      />
      <Container className="mx-auto max-w-sm px-4 pb-40 pt-20 sm:max-w-7xl">
        <div className="relative grid grid-cols-1 gap-20 md:grid-cols-2">
          <div>
            <div className="relative h-80 w-full">
              <AnimatePresence>
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.src}
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      z: -100,
                      rotate: randomRotateY(),
                    }}
                    animate={{
                      opacity: isActive(index) ? 1 : 0.7,
                      scale: isActive(index) ? 1 : 0.95,
                      z: isActive(index) ? 0 : -100,
                      rotate: isActive(index) ? 0 : randomRotateY(),
                      zIndex: isActive(index)
                        ? 40
                        : testimonials.length + 2 - index,
                      y: isActive(index) ? [0, -80, 0] : 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      z: 100,
                      rotate: randomRotateY(),
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 origin-bottom"
                  >
                    <ImageKit
                      src={testimonial.src}
                      alt={testimonial.name}
                      width={500}
                      height={500}
                      className="h-full w-full rounded-xl object-cover object-center"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-col justify-between py-4 gap-6">
            <motion.div
              key={active}
              initial={{
                y: 20,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: -20,
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
            >
              <TextEffect
                as="h4"
                className="text-2xl leading-2xl font-semibold text-white"
              >
                {testimonials[active].name}
              </TextEffect>
              <TextEffect
                as="p"
                per="line"
                delay={0.5}
                className="text-xs leading-xs text-white/70"
              >
                {testimonials[active].designation}
              </TextEffect>
              <motion.p className="mt-8 text-md leading-md text-white">
                {testimonials[active].quote.split(" ").map((word, index) => (
                  <motion.span
                    key={index}
                    initial={{
                      filter: "blur(10px)",
                      opacity: 0,
                      y: 5,
                    }}
                    animate={{
                      filter: "blur(0px)",
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 1,
                      ease: "easeInOut",
                      delay: 0.02 * index,
                    }}
                    className="inline-block"
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </motion.p>
            </motion.div>
            <div className="flex gap-4 pt-12 md:pt-0">
              <Button size="small" onClick={handlePrev} className="p-2">
                <ArrowLeftCircle size={20} />
              </Button>
              <Button size="small" onClick={handleNext} className="p-2">
                <ArrowRightCircle size={20} />
              </Button>
            </div>
            <Link href="/" className="flex justify-end items-center">
              <Button>All Case Studies</Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
