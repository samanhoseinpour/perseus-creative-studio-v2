"use client";

import { HeroTextAnimation, VideoKit } from "@/app/components";
import { useState } from "react";

const ServicesScrollVideoHero = () => {
  const [video, setVideo] = useState("/home-hero.mp4");
  const [bgOpacity, setBgOpacity] = useState(0.7);

  return (
    <section className="min-h-svh mt-12">
      <div className="bg-black/70">
        <div className="sticky h-svh inset-0">
          <VideoKit
            src={video}
            alt=""
            className="h-full w-full object-cover"
            fill
            key={video}
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: bgOpacity }}
          />
        </div>
        <HeroTextAnimation
          video="/production-hero.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Every project starts with a goal. You have something you want to build
          or improve.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/tv-1.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          You know it can be better, but you’re not sure where to start. That’s
          where we come in.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/production-hero.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          We learn about your business and what matters most to you. Then we
          plan the best way to reach your goals.
        </HeroTextAnimation>
      </div>
    </section>
  );
};

export default ServicesScrollVideoHero;
