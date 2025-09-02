"use client";
import { ReactNode } from "react";
import { motion, Variants, Transition, Variant } from "motion/react";
import React from "react";

export type PresetType =
  | "fade"
  | "slide"
  | "scale"
  | "blur"
  | "blur-slide"
  | "zoom"
  | "flip"
  | "bounce"
  | "rotate"
  | "swing"
  | "custom";

export type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: PresetType;
  as?: React.ElementType;
  asChild?: React.ElementType;

  /** New: delay (seconds) before children start animating */
  delay?: number;

  /** New: speed factor for item duration (1 = default, 2 = 2x faster). */
  speedSegment?: number;

  /** New: trigger visibility animation when the group scrolls into view */
  startWhenInView?: boolean;

  /** Framer Motion viewport options when using startWhenInView */
  viewport?: {
    once?: boolean;
    amount?: number | "some" | "all";
    margin?: string;
  };
};

const defaultContainerVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const presetVariants: Partial<Record<PresetType, Variants>> = {
  custom: {},
  fade: {},
  slide: {
    hidden: { y: 20 },
    visible: { y: 0 },
  },
  scale: {
    hidden: { scale: 0.8 },
    visible: { scale: 1 },
  },
  blur: {
    hidden: { filter: "blur(4px)" },
    visible: { filter: "blur(0px)" },
  },
  "blur-slide": {
    hidden: { filter: "blur(4px)", y: 20 },
    visible: { filter: "blur(0px)", y: 0 },
  },
  zoom: {
    hidden: { scale: 0.5 },
    visible: {
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  },
  flip: {
    hidden: { rotateX: -90 },
    visible: {
      rotateX: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  },
  bounce: {
    hidden: { y: -50 },
    visible: {
      y: 0,
      transition: { type: "spring", stiffness: 400, damping: 10 },
    },
  },
  rotate: {
    hidden: { rotate: -180 },
    visible: {
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  },
  swing: {
    hidden: { rotate: -10 },
    visible: {
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 8 },
    },
  },
};

// ---------- helpers ----------
const hasTransition = (
  variant?: Variant
): variant is Variant & { transition?: Transition } => {
  return !!variant && typeof variant === "object" && "transition" in variant;
};

// Merge transitions into Variants (non-destructive, user variants win).
const createVariantsWithTransition = (
  base: Variants,
  transition?: Transition
): Variants => {
  if (!transition) return base;

  const merge = (v?: Variant): Variant => {
    if (!v) return {};
    const baseT = hasTransition(v) ? v.transition ?? {} : {};
    return { ...v, transition: { ...transition, ...baseT } }; // baseT last -> user wins
  };

  const result: Variants = {
    ...base,
  };

  if (base.visible !== undefined) {
    result.visible = merge(base.visible);
  }

  if (base.exit !== undefined) {
    result.exit = merge(base.exit);
  }

  if (base.hidden !== undefined) {
    result.hidden = base.hidden;
  }

  return result;
};

// Safely merge defaults even if variants.hidden/visible are undefined
const addDefaultVariants = (variants: Variants = {}) => ({
  hidden: { ...(defaultItemVariants.hidden ?? {}), ...(variants.hidden ?? {}) },
  visible: {
    ...(defaultItemVariants.visible ?? {}),
    ...(variants.visible ?? {}),
  },
});

const AnimatedGroup = ({
  children,
  className,
  variants,
  preset = "blur-slide",
  as = "div",
  asChild = "div",
  delay = 0.7,
  speedSegment = 0.3,
  startWhenInView = true,
  viewport,
}: AnimatedGroupProps) => {
  const selectedVariants = {
    item: addDefaultVariants(preset ? presetVariants[preset] ?? {} : {}),
    // Ensure a hidden key exists for container
    container: { hidden: {}, ...defaultContainerVariants } as Variants,
  };

  // External overrides (variants prop) take priority over preset/defaults
  const baseContainer = variants?.container || selectedVariants.container;
  const baseItem = variants?.item || selectedVariants.item;

  // Apply delay to container (without clobbering user-defined transition keys)
  const containerVariants = createVariantsWithTransition(
    baseContainer,
    delay != null ? { delayChildren: delay } : undefined
  );

  // Apply per-item duration scaling
  const baseDuration = 0.3 / Math.max(speedSegment, 0.0001);
  const itemVariants = createVariantsWithTransition(baseItem, {
    duration: baseDuration,
  });

  const MotionComponent = React.useMemo(() => motion.create(as), [as]);
  const MotionChild = React.useMemo(() => motion.create(asChild), [asChild]);

  const items = React.Children.toArray(children);
  const viewportOptions = startWhenInView
    ? { once: true, amount: 0.3, ...viewport }
    : undefined;

  return (
    <MotionComponent
      initial="hidden"
      animate={startWhenInView ? undefined : "visible"}
      whileInView={startWhenInView ? "visible" : undefined}
      viewport={viewportOptions}
      variants={containerVariants}
      className={className}
    >
      {items.map((child, index) => (
        <MotionChild
          key={(child as React.ReactElement)?.key ?? index}
          variants={itemVariants}
        >
          {child}
        </MotionChild>
      ))}
    </MotionComponent>
  );
};

export default AnimatedGroup;
