"use client";
import { useRef } from "react";

import { ImageKit } from "@/app/components";
import { useScroll, useTransform, motion } from "framer-motion";

const ProjectHero = () => {
  const container = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "150vh"]);

  return (
    <div className="h-screen overflow-hidden" ref={container}>
      <motion.div style={{ y }} className="relative h-full">
        <ImageKit
          src="/homeServices-1.JPG"
          fill
          alt="/homeServices-1.JPG"
          className="object-cover"
        />
      </motion.div>
    </div>
  );
};

export default ProjectHero;
