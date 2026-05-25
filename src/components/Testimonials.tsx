'use client';

import { LuArrowLeft as ArrowLeft, LuArrowRight as ArrowRight } from 'react-icons/lu';
import { motion, AnimatePresence } from 'motion/react';

import { useEffect, useState, useMemo } from 'react';
import { Button, Container, Heading } from '../components';

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
    [testimonials],
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
    <section className="mb-8">
      <Container className="mx-auto max-w-md px-4 mt-8 sm:max-w-7xl">
        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <div className="relative h-80 w-full overflow-hidden">
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
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 origin-bottom flex items-center justify-center md:justify-start"
                  >
                    <iframe
                      title={`YouTube video of ${testimonial.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      src={`https://www.youtube.com/embed/${testimonial.src}`}
                      width={500}
                      height={250}
                      className="rounded-lg"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-col justify-between py-4">
            <div key={active}>
              <h4 className="text-2xl leading-2xl font-semibold text-foreground">
                {testimonials[active].name}
              </h4>
              <span className="text-xs leading-xs text-foreground/70">
                {testimonials[active].designation}
              </span>
              <p className="mt-8 text-sm leading-sm text-foreground">
                {testimonials[active].quote}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 pt-12 md:pt-6">
              <div className="flex gap-2">
                <Button
                  size="small"
                  onClick={handlePrev}
                  className="p-2"
                  aria-label="Previous testimonial"
                  icon={ArrowLeft}
                />

                <Button
                  size="small"
                  onClick={handleNext}
                  className="p-2"
                  aria-label="Next testimonial"
                  icon={ArrowRight}
                />
              </div>
              <div
                className="flex items-center gap-1.5"
                aria-label="Testimonial carousel position"
              >
                {testimonials.map((testimonial, index) => (
                  <button
                    key={`${testimonial.name}-${testimonial.src}`}
                    type="button"
                    onClick={() => setActive(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive(index)
                        ? 'w-6 bg-foreground'
                        : 'w-1.5 bg-foreground/30 hover:bg-foreground/50'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                    aria-current={isActive(index) ? 'true' : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
