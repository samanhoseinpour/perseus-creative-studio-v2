"use client";

import { motion, SpringOptions, useScroll, useSpring } from "motion/react";
import { cn } from "../utils/aceternity";
import { RefObject } from "react";

export type ScrollProgressProps = {
  className?: string;
  springOptions?: SpringOptions;
  containerRef?: RefObject<HTMLDivElement>;
};

const DEFAULT_SPRING_OPTIONS: SpringOptions = {
  stiffness: 200,
  damping: 50,
  restDelta: 0.001,
};

const ScrollProgress = ({
  className,
  springOptions,
  containerRef,
}: ScrollProgressProps) => {
  const { scrollYProgress } = useScroll({
    container: containerRef,
    layoutEffect: Boolean(containerRef?.current),
  });

  const scaleX = useSpring(scrollYProgress, {
    ...DEFAULT_SPRING_OPTIONS,
    ...(springOptions ?? {}),
  });

  return (
    <motion.div
      className={cn(
        "fixed left-0 right-0 top-0 z-[60] h-1 origin-left",
        "bg-[linear-gradient(to_right,rgba(255,255,255,0),#ffffff_75%,#ffffff_100%)]",
        "dark:bg-[linear-gradient(to_right,rgba(0,0,0,0),#111111_75%,#111111_100%)]",
        className
      )}
      style={{ scaleX }}
    />
  );
};

export function ScrollProgressGradient() {
  return (
    <ScrollProgress
      springOptions={{
        stiffness: 280,
        damping: 18,
        mass: 0.3,
      }}
    />
  );
}

export default ScrollProgress;
