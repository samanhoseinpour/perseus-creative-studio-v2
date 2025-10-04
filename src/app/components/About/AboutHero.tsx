"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { VideoKit, Container, TextEffect, AnimatedGroup } from "../";
import {
  ArrowRight,
  LocateFixed,
  Telescope,
  ChartNoAxesGantt,
  Briefcase,
  Network,
  Signature,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AboutHero = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="flex flex-col mb-8">
      <section
        className="relative w-full max-h-[60rem] h-[100svh]"
        ref={headerRef}
      >
        <Container className="relative flex flex-col h-full z-10">
          <div className="flex-1 flex flex-col justify-center items-center max-sm:px-5">
            <TextEffect
              as="h1"
              className="text-white font-bold text-4xl leading-4xl sm:text-5xl sm:leading-5xl text-center"
            >
              About Perseus Creative Studio
            </TextEffect>
            <TextEffect
              as="p"
              delay={0.5}
              per="line"
              className="text-sm leading-sm font-semibold text-center"
            >
              At Perseus Creative Studio, we specialize in high-impact,
              custom-coded websites and cinematic media production for
              businesses ready to elevate their presence — locally and globally.
            </TextEffect>
          </div>
        </Container>
        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ y }}
        >
          <VideoKit
            src="home-hero.mp4"
            alt="ancient video from Perseus"
            className="object-cover rounded-lg w-full h-full"
          />
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-black/90" />
        </motion.div>
      </section>

      <Container className="z-50 mt-6">
        <TextEffect
          as="h2"
          className="font-semibold text-3xl leading-3xl sm:text-4xl sm:leading-4xl  my-8"
        >
          We Build More Than Brands
        </TextEffect>
        <div className="grid grid-cols-3 gap-x-8 gap-y-16 max-sm:grid-cols-1 items-stretch">
          <FeatureCard
            feature="Our Mission"
            featureDesc="We turn ideas into working assets—sites, films, and identities that move businesses forward. Every engagement starts with strategy and ends with excellence: fast, accessible code; visuals that tell a story; and design that strengthens trust. No templates, no shortcuts—just purposeful work that serves real objectives."
            icon={LocateFixed}
          />
          <FeatureCard
            feature="Our Vision"
            featureDesc="We envision creative that operates as infrastructure, not decoration. Our goal is to blend artistry, engineering, and business intelligence so brands communicate more clearly, convert more consistently, and scale with confidence. As we grow, we’ll continue pushing what a creative studio can deliver—deeper integrations, richer storytelling, and systems that perform long after launch."
            icon={Telescope}
          />
          <FeatureCard
            feature="How We Work"
            featureDesc="Our process is built on collaboration, strategy, and execution. We begin every project with a discovery phase to understand your business, goals, and audience. From there, we craft a strategy that connects creative execution with real-world outcomes. Whether we’re building a platform, capturing a story through video, or developing a brand, we focus on delivering polished, high-impact results that elevate your brand’s visibility and value."
            icon={ChartNoAxesGantt}
          />
          <FeatureCard
            feature="What We Do"
            featureDesc="We specialize in three core pillars: custom website development, professional media production, and branding with purpose. Every website we build is coded from scratch — no templates, no shortcuts — crafted to align with the client’s business model, aesthetic, and user experience needs. Our media production capabilities include multi-camera video shoots, drone footage, and high-end photography tailored for industries like real estate, retail, and corporate storytelling. And our branding work goes beyond design; we develop complete visual identities that are strategic, consistent, and positioned for long-term success."
            icon={Briefcase}
          />
          <FeatureCard
            feature="Our Commitment"
            featureDesc="We take pride in doing the work right — not fast or easy, but thoughtfully and thoroughly. Our clients trust us because we bring vision and detail to everything we do, from single-day shoots to long-term digital strategies. Whether you're a local business looking for a brand refresh or a global enterprise ready to scale your content production, we’re here to be more than a vendor — we’re here to be a creative partner."
            icon={Network}
          />
          <FeatureCard
            feature="What sets us apart"
            featureDesc="What sets us apart isn’t just the quality of our output — it’s the depth of our involvement. We’ve managed complex, international productions like a 40-day visual storytelling journey across Asia for a petroleum company. We’ve filmed at the world’s largest soccer tournament in North Carolina. And we’ve helped businesses across Vancouver and beyond launch digital platforms that drive results."
            icon={Signature}
          />
        </div>
      </Container>
    </div>
  );
};

interface FeatureCardProps {
  feature: string;
  featureDesc: string;
  icon?: LucideIcon;
}

const FeatureCard = ({
  feature,
  featureDesc,
  icon: Icon = ArrowRight,
}: FeatureCardProps) => {
  return (
    <AnimatedGroup className="flex flex-col gap-y-4 bg-background-contrast rounded-xl p-6 relative z-10 h-full">
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <TextEffect
          as="h3"
          className="text-white font-semibold text-lg leading-lg"
        >
          {feature || "Feature name"}
        </TextEffect>
      </div>
      <TextEffect as="p" per="line" delay={0.5} className="text-xs leading-xs">
        {featureDesc}
      </TextEffect>
    </AnimatedGroup>
  );
};

export default AboutHero;
