"use client";
import { useRef } from "react";

import { ImageKit, TextEffect } from "@/app/components";
import { useScroll, useTransform, motion } from "framer-motion";

export default function Section() {
  const container = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center h-screen overflow-hidden"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative z-10 p-20 mix-blend-difference text-white w-full h-full flex flex-col justify-between">
        <p className="w-[50vw] text-[2vw] self-end uppercase mix-blend-difference">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Ex beatae
          quae voluptatibus, error earum veritatis placeat vero eaque nam nemo
          quas vel odit sapiente suscipit delectus quia alias at nulla?
        </p>
        <p className="text-[5vw] uppercase mix-blend-difference">
          Dynamic Content
        </p>
      </div>
      <div className="fixed top-[-10vh] left-0 h-[120vh] w-full">
        <motion.div style={{ y }} className="relative w-full h-full">
          <ImageKit
            src="/homeServices-1.JPG"
            fill
            alt="homeServices-1.JPG"
            className="object-cover"
          />
        </motion.div>
      </div>
    </div>
  );
}
