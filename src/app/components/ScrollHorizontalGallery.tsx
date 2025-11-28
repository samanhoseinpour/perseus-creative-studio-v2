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
    <section ref={targetRef} className="relative h-[350vh]">
      <div className="sticky top-0 flex h-svh items-center justify-start overflow-hidden px-16">
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
      className="group relative h-[450px] w-[650px] overflow-hidden"
    >
      <Link href={project.href}>
        <ImageKit
          src={project.imageSrc}
          alt={project.title}
          fill
          className="object-cover bg-center absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500"
        />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
          <h3 className="text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold max-w-[25ch] ">
            {project.title}
          </h3>
          <p className="max-w-[50ch] text-xs leading-xs">
            {project.description}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default ScrollHorizontalGallery;
