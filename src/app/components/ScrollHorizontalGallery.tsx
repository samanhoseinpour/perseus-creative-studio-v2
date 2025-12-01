"use client";
import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import { ImageKit } from "./";
import { Button } from "./";

interface ScrollHorizontalGalleryProps {
  imageProjects: {
    id: number;
    imageSrc: string;
    title: string;
    href: string;
    description: string;
  }[];
}

const ScrollHorizontalGallery = ({
  imageProjects,
}: ScrollHorizontalGalleryProps) => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

  return (
    <section
      ref={targetRef}
      className="relative h-[350vh] bg-white pb-16 sm:pb-32 flex flex-col gap-12"
    >
      <div className="sticky top-30 pt-12 flex items-start justify-start overflow-hidden px-16">
        <motion.div style={{ x }} className="flex gap-4">
          {imageProjects.map((project) => {
            return <Project project={project} key={project.id} />;
          })}
        </motion.div>
      </div>
    </section>
  );
};

const Project = ({
  project,
}: {
  project: ScrollHorizontalGalleryProps["imageProjects"][0];
}) => {
  return (
    <div key={project.id} className="group w-[650px]">
      <a
        href={project.href}
        target="_blank"
        className="block relative h-[450px] w-full overflow-hidden bg-black rounded-lg"
      >
        <ImageKit
          src={project.imageSrc}
          alt={project.title}
          fill
          className="object-cover bg-center absolute inset-0 z-0 opacity-70 group-hover:opacity-80 transition-opacity duration-500"
        />
      </a>
      <div className="mt-3 flex flex-col gap-1 text-left">
        <h3 className="text-md leading-md sm:text-lg sm:leading-lg font-semibold text-black">
          {project.title}
        </h3>
        <p className="max-w-[60ch] text-xs text-black/70">
          {project.description}
        </p>
      </div>
    </div>
  );
};

export default ScrollHorizontalGallery;
