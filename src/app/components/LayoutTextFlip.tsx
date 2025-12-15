"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/app/utils/aceternity";

const LayoutTextFlip = ({
  text = "Build Amazing",
  words = ["Landing Pages", "Component Blocks", "Page Sections", "3D Shaders"],
  duration = 3000,
}: {
  text: string;
  words: string[];
  duration?: number;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [duration, words.length]);

  return (
    <div className="flex justify-start items-start gap-4 mb-2">
      <div className="flex justify-center items-center gap-2">
        <motion.span
          layoutId="subtext"
          className="text-xl leading-xl font-semibold md:text-3xl md:leading-3xl text-white"
        >
          {text}
        </motion.span>

        <motion.span
          layout
          className="relative w-fit overflow-hidden rounded-md border border-transparent bg-white px-4 py-2 text-2xl leading-2xl sm:text-4xl sm:leading-4xl font-bold tracking-tight text-black shadow-sm ring shadow-black/10 ring-black/10 drop-shadow-lg dark:bg-neutral-900 dark:text-white dark:shadow-sm dark:ring-1 dark:shadow-white/10 dark:ring-white/10"
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={currentIndex}
              initial={{ y: -40, filter: "blur(10px)" }}
              animate={{
                y: 0,
                filter: "blur(0px)",
              }}
              exit={{ y: 50, filter: "blur(10px)", opacity: 0 }}
              transition={{
                duration: 0.5,
              }}
              className={cn("inline-block whitespace-nowrap")}
            >
              {words[currentIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </div>
    </div>
  );
};

export default LayoutTextFlip;
