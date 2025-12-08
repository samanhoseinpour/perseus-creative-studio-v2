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
          video="/projects-fitness&sports.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Website development that turns visitors into qualified leads, tailored
          for businesses across all industries.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/about-hero.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Social media management that keeps your brand active, consistent, and
          trusted across every channel.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/velahomes-forming.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Visual production for construction & real estate—photo, video, and
          drone content that showcases every project at its best.
        </HeroTextAnimation>
      </div>
    </section>
  );
};

export default ServicesScrollVideoHero;
