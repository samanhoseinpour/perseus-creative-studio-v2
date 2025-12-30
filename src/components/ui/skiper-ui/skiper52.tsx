"use client";

import { AnimatePresence, motion } from "framer-motion";
import { VideoKit, Container, TextShimmer } from "@/app/components";
import { useState } from "react";
import "swiper/css";
import "swiper/css/effect-creative";
import "swiper/css/pagination";
import "swiper/css/autoplay";

import { cn } from "@/lib/utils";

const Skiper52 = () => {
  const videos = [
    {
      src: "/production-hero.mp4/ik-video.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
    {
      src: "/velahomes-forming.mp4",
      alt: "Fitbodega TV News Video",
      code: "Fitbodega TV News",
    },
    {
      src: "/cfr-dev.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
    {
      src: "/taurus-commercial.mp4",
      alt: "Taurus Fitness Club Commercial Video",
      code: "Taurus Fitness Club Commercial Video",
    },
    {
      src: "/fitbodega-tv-news.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
    {
      src: "/velahomes-demolishing.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
    {
      src: "/obsidian-gym-tour.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
    {
      src: "/projects-boats&yachts.mp4",
      alt: "Illustrations by my fav AarzooAly",
      code: "Project Name",
    },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#f5f4f3]">
      <HoverExpand_001 className="" videos={videos} />{" "}
    </div>
  );
};

export { Skiper52 };

const HoverExpand_001 = ({
  videos,
  className,
}: {
  videos: { src: string; alt: string; code: string }[];
  className?: string;
}) => {
  const [activeImage, setActiveImage] = useState<number | null>(1);

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.5,
      }}
      className={cn("relative w-full", className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="w-full"
      >
        <Container className="flex w-full justify-center gap-1 mt-4">
          {videos.map((image, index) => (
            // <Link key={index} href={image.src}>
            <motion.div
              key={index}
              className="relative cursor-pointer overflow-hidden rounded-xl"
              initial={{ width: "2.5rem", height: "20rem" }}
              animate={{
                width: activeImage === index ? "40rem" : "7rem",
                height: activeImage === index ? "24rem" : "24rem",
              }}
              transition={{ duration: 1, ease: "easeInOut" }}
              onClick={() => setActiveImage(index)}
              onHoverStart={() => setActiveImage(index)}
            >
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute h-full w-full bg-linear-to-t from-black/40 to-transparent"
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute flex h-full w-full flex-col items-end justify-end p-4"
                  >
                    <TextShimmer className="text-left text-xs leading-xs font-bold">
                      {image.code}
                    </TextShimmer>
                  </motion.div>
                )}
              </AnimatePresence>

              <VideoKit
                src={image.src}
                className="size-full object-cover"
                alt={image.alt}
                width={640}
                height={384}
              />
            </motion.div>
            // </Link>
          ))}
        </Container>
      </motion.div>
    </motion.div>
  );
};

export { HoverExpand_001 };
