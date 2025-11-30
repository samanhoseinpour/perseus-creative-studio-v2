"use client";
import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import { ImageKit } from "./";
import Link from "next/link";

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
    <section ref={targetRef} className="relative h-[350vh] bg-white">
      <div className="sticky top-40 pt-12 flex items-start justify-start overflow-hidden px-16">
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
    <div
      key={project.id}
      className="group relative h-[450px] w-[650px] overflow-hidden bg-black rounded-lg"
    >
      <a href={project.href} target="_blank">
        <ImageKit
          src={project.imageSrc}
          alt={project.title}
          fill
          className="object-cover bg-center absolute inset-0 z-0 opacity-70 group-hover:opacity-80 transition-opacity duration-500"
        />
        <div className="absolute inset-0 z-10 flex flex-col gap-1 items-center justify-center text-white text-center">
          <h3 className="text-md leading-md sm:text-lg sm:leading-lg font-semibold">
            {project.title}
          </h3>
          <p className="max-w-[50ch] text-xs">{project.description}</p>
        </div>
      </a>
    </div>
  );
};

export default ScrollHorizontalGallery;
