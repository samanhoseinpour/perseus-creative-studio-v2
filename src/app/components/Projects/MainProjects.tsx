"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { VideoKit, Container } from "..";

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
      <motion.div className="absolute w-full h-[130%] -z-10" style={{ top: y }}>
        <div className="absolute inset-0 bg-black/20 z-10" />
        <VideoKit
          src={videoSrc}
          alt={title + "video"}
          fill
          className="w-full h-full object-cover object-center"
          sizes="90vw"
        />
      </motion.div>

      <Container className="flex flex-col py-12">
        <Link href="/contact">
          <h2 className="text-2xl leading-2xl sm:text-3xl sm:leading-3xl font-semibold max-w-[25ch]">
            {title}
          </h2>
          <p className="max-w-[50ch] text-xs">{description}</p>
        </Link>
      </Container>
    </section>
  );
};

export default MainProjects;
