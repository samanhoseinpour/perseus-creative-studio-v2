'use client';

import { HeroTextAnimation, VideoKit } from '@/app/components';
import { useState } from 'react';

const ServicesScrollVideoHero = () => {
  const [video, setVideo] = useState('/home-hero.mp4');
  const [bgOpacity, setBgOpacity] = useState(0.7);

  return (
    <main className="min-h-[100svh]">
      <section className="bg-black/70">
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
          Welcome to the era of scroll animations.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/tv-1.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          This demo seamlessly blends video content with aesthetic interactions.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/production-hero.mp4/ik-video.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          You navigate simply by scrolling.
        </HeroTextAnimation>
        <HeroTextAnimation
          video="/home-hero.mp4"
          setVideo={setVideo}
          setBgOpacity={setBgOpacity}
        >
          Youve never seen everything like this before.
        </HeroTextAnimation>
      </section>
    </main>
  );
};

export default ServicesScrollVideoHero;
