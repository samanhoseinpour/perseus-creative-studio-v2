"use client";

import { HeroTextAnimation, VideoKit } from "@/app/components";
import { useState } from "react";

const ServicesScrollVideoHero = () => {
  const [video, setVideo] = useState("/home-hero.mp4");
  const [bgOpacity, setBgOpacity] = useState(0.7);

  return (
    <section className="min-h-[100svh] mt-12">
      <div className="bg-black/70">
        <div className="sticky h-[100svh] inset-0">
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
          Brand identity, product strategy, and web that convert.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/tv-1.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          UX research, interface design, and design systems—end-to-end.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/production-hero.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Webflow & Next.js builds with technical SEO and performance.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/tv-1.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          We partner with B2B SaaS, fintech, healthtech, AI/ML & devtools,
          e‑commerce, marketplaces, and climate & energy.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/home-hero.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Sprint-based delivery with clear milestones and measurable outcomes.
        </HeroTextAnimation>
      </div>
    </section>
  );
};

export default ServicesScrollVideoHero;
