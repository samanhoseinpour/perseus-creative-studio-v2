"use client";
import { useEffect, useRef, useState } from "react";
import { ImageKit } from "@/app/components";
import Lenis from "lenis";
import { useTransform, useScroll, motion } from "framer-motion";
import type { MotionValue } from "framer-motion";

const images = [
  "/services-photography.jpg",
  "/services-videography.jpg",
  "/navbar-home.jpg",
  "/navbar-about.jpg",
  "/navbar-home.jpg",
  "/navbar-blogs.jpg",
  "/services-aerial-production.jpg",
  "/services-ads.jpg",
  "/services-branding.jpg",
  "/services-smm.jpg",
  "/services-floor-plan.jpg",
  "/services-content-creation.jpg",
];

type ColumnProps = {
  images: string[];
  y: MotionValue<number>;
  extraClass?: string;
};

const Column = ({ images, y, extraClass = "" }: ColumnProps) => {
  return (
    <motion.div
      className={`relative h-full w-1/4 min-w-[250px] flex flex-col gap-[2vw] ${extraClass}`}
      style={{ y }}
    >
      {images.map((src, i) => {
        return (
          <div
            key={i}
            className="h-full w-full relative rounded-[1vw] overflow-hidden"
          >
            <ImageKit
              src={`${src}`}
              alt="image"
              fill
              className="object-cover"
            />
          </div>
        );
      })}
    </motion.div>
  );
};

const BlogsParallaxHero = () => {
  const gallery = useRef<HTMLDivElement | null>(null);
  type Dimension = { width: number; height: number };
  const [dimension, setDimension] = useState<Dimension>({
    width: 0,
    height: 0,
  });

  const { scrollYProgress } = useScroll({
    target: gallery,
    offset: ["start end", "end start"],
  });
  const { height } = dimension;
  const y = useTransform(scrollYProgress, [0, 1], [0, height * 2]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, height * 3.3]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, height * 1.25]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, height * 3]);

  useEffect(() => {
    const lenis = new Lenis();

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    const resize = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", resize);
    requestAnimationFrame(raf);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section>
      <div
        ref={gallery}
        className="h-[175vh] bg-background-contrast relative flex gap-[1vw] p-[2vw] box-border overflow-hidden"
      >
        <div className="h-screen" />
        <Column
          images={[images[0], images[1], images[2]]}
          y={y}
          extraClass="-top-[45%]"
        />
        <Column
          images={[images[3], images[4], images[5]]}
          y={y2}
          extraClass="-top-[95%]"
        />
        <Column
          images={[images[6], images[7], images[8]]}
          y={y3}
          extraClass="-top-[45%]"
        />
        <Column
          images={[images[9], images[10], images[11]]}
          y={y4}
          extraClass="-top-[75%]"
        />
      </div>
    </section>
  );
};

export default BlogsParallaxHero;
