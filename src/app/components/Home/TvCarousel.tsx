"use client";

import { useMemo, useRef, useState } from "react";
import {
  useScroll,
  useTransform,
  motion,
  AnimatePresence,
  useMotionValueEvent,
} from "framer-motion";

import type { Variants } from "framer-motion";

import { useWindowSize } from "react-use";

import { VideoKit, Button } from "../";

export type Movie = {
  id: number;
  poster: string;
  name: string;
  link: string;
};

export const movies: Movie[] = [
  {
    id: 1,
    poster: "/tv-1.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
  {
    id: 2,
    poster: "/production-hero.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
  {
    id: 3,
    poster: "/tv-1.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
  {
    id: 4,
    poster: "/production-hero.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
  {
    id: 5,
    poster: "/tv-1.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
  {
    id: 6,
    poster: "/production-hero.mp4/ik-video.mp4",
    name: "Cinematic North Vancouver Luxury Home Tour",
    link: "https://www.youtube.com/watch?v=pjDQN3riSKg",
  },
];

const positions = [-1, 0, 1];

const TvCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [carouselVariant, setCarouselVariant] = useState<"inactive" | "active">(
    "inactive"
  );

  const { width, height } = useWindowSize();
  const carouselWrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: carouselWrapperRef,
    offset: ["start start", "end start"],
  });

  const maximumScale = useMemo(() => {
    const windowYRatio = height / width;
    const xScale = 1.66667;
    const yScale = xScale * (16 / 9) * windowYRatio;
    return Math.max(xScale, yScale);
  }, [width, height]);

  const scale = useTransform(
    scrollYProgress,
    [0.3, 0.5, 0.66],
    [maximumScale * 1.1, maximumScale, 1]
  );

  const postersOpacity = useTransform(scrollYProgress, [0.64, 0.66], [0, 1]);
  const posterTranslateXLeft = useTransform(
    scrollYProgress,
    [0.64, 0.66],
    [-20, 0]
  );
  const posterTranslateXRight = useTransform(
    scrollYProgress,
    [0.64, 0.66],
    [20, 0]
  );

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setCarouselVariant(progress >= 0.67 ? "active" : "inactive");
  });

  const getMovie = (offset: number) =>
    movies[(currentIndex + offset + movies.length) % movies.length];

  // Framer Motion variants for slide transition
  const slideVariants: Variants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 400 : -400,
      opacity: 0,
      position: "absolute" as const,
    }),
    animate: {
      x: 0,
      opacity: 1,
      position: "relative" as const,
      transition: {
        x: { type: "spring", stiffness: 80, damping: 24 },
        opacity: { duration: 0.3 },
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -400 : 400,
      opacity: 0,
      position: "absolute" as const,
      transition: {
        x: { type: "spring", stiffness: 80, damping: 24 },
        opacity: { duration: 0.3 },
      },
    }),
  };

  return (
    <motion.div animate={carouselVariant}>
      <div
        ref={carouselWrapperRef}
        className="mt-[-100svh] h-[300svh] overflow-clip"
      >
        <div className="sticky top-0 flex h-[100svh] items-center">
          <div className="relative left-1/2 -translate-x-1/2 mb-5 flex justify-center w-full">
            {/* Navigation Buttons: Fade in/out left/right */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: carouselVariant === "active" ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
              style={{
                pointerEvents: carouselVariant === "active" ? "auto" : "none",
              }}
            >
              <Button
                aria-label="Previous"
                onClick={() => {
                  setDirection(-1);
                  setCurrentIndex(
                    (i) => (i - 1 + movies.length) % movies.length
                  );
                }}
                size="medium"
                className="p-2"
                disabled={carouselVariant !== "active"}
              >
                <svg
                  className="w-6 h-6 "
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m15 19-7-7 7-7"
                  />
                </svg>
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: carouselVariant === "active" ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="absolute right-10 top-1/2 -translate-y-1/2 z-20"
              style={{
                pointerEvents: carouselVariant === "active" ? "auto" : "none",
              }}
            >
              <Button
                aria-label="Next"
                onClick={() => {
                  setDirection(1);
                  setCurrentIndex((i) => (i + 1) % movies.length);
                }}
                size="medium"
                className="p-2"
                disabled={carouselVariant !== "active"}
              >
                <svg
                  className="w-6 h-6 "
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m9 5 7 7-7 7"
                  />
                </svg>
              </Button>
            </motion.div>

            {/* Animated posters, always centered */}
            <div className="flex gap-5 relative">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex gap-5"
                  style={{ minWidth: "900px" }}
                >
                  {positions.map((offset) => {
                    const movie = getMovie(offset);
                    const isCenter = offset === 0;
                    let style = {};
                    if (offset === -1)
                      style = {
                        opacity: postersOpacity,
                        x: posterTranslateXLeft,
                      };
                    if (offset === 1)
                      style = {
                        opacity: postersOpacity,
                        x: posterTranslateXRight,
                      };
                    if (isCenter) style = { scale };

                    return (
                      <motion.div
                        key={movie.id}
                        style={style}
                        className="relative aspect-[9/16] w-[300px] shrink-0 overflow-clip rounded-2xl md:aspect-video md:w-[60vw]"
                        suppressHydrationWarning
                      >
                        <VideoKit
                          className="object-cover"
                          src={movie.poster}
                          alt={movie.name}
                          loading="lazy"
                        />
                        {isCenter && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                              opacity: carouselVariant === "active" ? 1 : 0,
                              y: carouselVariant === "active" ? 0 : 20,
                            }}
                            transition={{
                              duration: 0.4,
                              delay: carouselVariant === "active" ? 0.2 : 0,
                            }}
                            className="absolute bottom-0 left-0 flex w-full flex-col items-center gap-4 p-5 text-lg text-white md:flex-row md:justify-between md:gap-0"
                            aria-hidden={carouselVariant !== "active"}
                          >
                            <p className="font-semibold">{movie.name}</p>
                            <a href={movie.link} target="_blank">
                              <Button>Watch Now</Button>
                            </a>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TvCarousel;
