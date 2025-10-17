"use client";

import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

import { useEffect, useState, useMemo } from "react";
import {
  Button,
  Container,
  Heading,
  Partners,
  YoutubePlayer,
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

  const hashToAngle = (key: string) => {
    let h = 2166136261; // FNV-1a seed
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const angle = (h >>> 0) % 21; // 0..20
    return angle - 10; // -10..10
  };

  const rotations = useMemo(
    () => testimonials.map((t) => hashToAngle(t.src || t.name || t.quote)),
    [testimonials]
  );

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
    if (!autoplay || testimonials.length < 2) return;

    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(id);
  }, [autoplay, testimonials.length]);

  return (
    <section className="mb-16">
      <Heading
        title="Trusted by bests worldwide"
        titleTag="h3"
        seperatorTitle="Proof in performance"
        description="Selective engagements, measurable outcomes. Here’s what our clients’ leadership says about partnering with Perseus on brand, product, and go‑to‑market."
      />
      <Container className="mx-auto max-w-sm px-4 mt-8 sm:max-w-7xl">
        <div className="relative grid grid-cols-1 gap-20 md:grid-cols-2">
          <div>
            <div className="relative h-80 w-full">
              <AnimatePresence initial={false}>
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.src}
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      z: -100,
                      rotate: rotations[index],
                    }}
                    animate={{
                      opacity: isActive(index) ? 1 : 0.7,
                      scale: isActive(index) ? 1 : 0.95,
                      z: isActive(index) ? 0 : -100,
                      rotate: isActive(index) ? 0 : rotations[index],
                      zIndex: isActive(index)
                        ? 40
                        : testimonials.length + 2 - index,
                      y: isActive(index) ? [0, -80, 0] : 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      z: 100,
                      rotate: rotations[index],
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 origin-bottom"
                  >
                    <YoutubePlayer
                      videoId={testimonial.src}
                      title={testimonial.designation}
                      className="h-full w-full rounded-xl object-cover object-center"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-col justify-between py-4 gap-6">
            <div key={active}>
              <h4 className="text-2xl leading-2xl font-semibold text-black dark:text-white">
                {testimonials[active].name}
              </h4>
              <span className="text-xs leading-xs text-black/70 dark:text-white/70">
                {testimonials[active].designation}
              </span>
              <p className="mt-8 text-md leading-md text-black dark:text-white">
                {testimonials[active].quote}
              </p>
            </div>
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
      <Partners />
    </section>
  );
};

export default Testimonials;
