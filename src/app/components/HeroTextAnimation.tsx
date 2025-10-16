"use client";

import React, { HTMLAttributes, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface HeroTextAnimationProps extends HTMLAttributes<HTMLSelectElement> {
  video: string;
  setVideo: (_: string) => void;
  setBgOpacity: (_: number) => void;
}

const HeroTextAnimation = ({
  video,
  setVideo,
  setBgOpacity,
  children,
  ...props
}: HeroTextAnimationProps) => {
  const contentRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start end", "start start"],
  });

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.2, 0.8, 0.9, 1],
    [0, 0, 1, 1, 0, 0]
  );

  scrollYProgress.on("change", (val) => {
    if (val > 0 || val < 1) {
      setVideo(video);
    }
  });

  const bgOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.7, 0.3, 0.3, 0.7]
  );

  bgOpacity.on("change", (val) => {
    setBgOpacity(val);
  });

  return (
    <section
      className="relative flex flex-col items-center justify-center"
      {...props}
    >
      <motion.div
        ref={contentRef}
        style={{ opacity: contentOpacity }}
        className="min-h-[100svh] text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-white font-bold text-center max-w-[80ch]"
      >
        {children}
      </motion.div>
    </section>
  );
};

export default HeroTextAnimation;
