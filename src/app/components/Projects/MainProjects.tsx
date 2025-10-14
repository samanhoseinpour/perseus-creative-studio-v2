"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { ImageKit } from "..";

interface MainProductionProps {
  imageSrc: string;
  title: string;
  description: string;
}
const MainProjects: React.FC<MainProductionProps> = ({
  imageSrc,
  title,
  description,
}) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-30%", "10%"]);

  return (
    <div ref={sectionRef} className="relative h-[40vh] overflow-hidden">
      <motion.div
        className="absolute w-full h-[130%] -z-10 "
        style={{ top: y }}
      >
        <div className="absolute inset-0 bg-black/20 z-10" />
        <ImageKit
          src={imageSrc}
          alt="title"
          fill
          className="object-cover"
          sizes="90vw"
        />
      </motion.div>

      <div className="flex flex-col p-12">
        <h2 className="text-2xl leading-2xl sm:text-3xl sm:leading-3xl font-semibold max-w-[25ch]">
          {title}
        </h2>
        <p className="max-w-[50ch] text-xs">{description}</p>
      </div>
    </div>
  );
};

export default MainProjects;
