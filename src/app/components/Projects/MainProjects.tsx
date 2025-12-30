"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { Container } from "..";

interface MainProductionProps {
  videoSrc: string;
  title: string;
  description: string;
}
const MainProjects: React.FC<MainProductionProps> = ({
  videoSrc,
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
    <section ref={sectionRef} className="relative h-[50vh] overflow-hidden">
      <motion.div
        className="absolute h-[130%] inset-0 -z-10 w-full"
        style={{ top: y }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[56.25vw] min-w-[177.78vh] min-h-full"
            src={videoSrc}
            title={title + "video"}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none" />
      </motion.div>

      <Container className="flex flex-col py-12">
        <Link href="/contact">
          <h2 className="text-2xl leading-2xl sm:text-3xl sm:leading-3xl font-semibold max-w-[25ch]">
            {title}
          </h2>
          <p className="max-w-[50ch] text-xs leading-xs">{description}</p>
        </Link>
      </Container>
    </section>
  );
};

export default MainProjects;
