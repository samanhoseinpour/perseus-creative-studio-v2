"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { VideoKit, Container, AnimatedGroup, TextEffect } from "../";

const AboutHero = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "75%"]);

  return (
    <div className="flex flex-col min-h-[200svh]">
      <section
        className="relative w-full max-h-[60rem] h-[100svh]"
        ref={headerRef}
      >
        <div className="relative flex flex-col h-full z-10">
          <div className="flex-1 flex flex-col justify-center items-center gap-4 max-sm:px-5">
            <TextEffect
              as="h1"
              className="text-white font-bold text-4xl leading-4xl sm:text-5xl sm:leading-5xl text-center"
            >
              Behind Every Iconic Brand Is a Visionary Team.
            </TextEffect>
            <TextEffect
              as="h2"
              delay={0.5}
              className="text-lg leading-lg font-semibold"
            >
              Perseus Creative Studio
            </TextEffect>
          </div>
        </div>
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
        <TextEffect as="h2" className="font-semibold text-4xl leading-4xl my-8">
          Built On Creativity, Driven by Excellence
        </TextEffect>
        <AnimatedGroup className="grid grid-cols-3 gap-x-8 gap-y-16 max-sm:grid-cols-1 items-stretch">
          <FeatureCard
            feature="Creative Strategy & Identity"
            featureDesc="We develop bold and memorable brand identities combined with content strategies that truly connect with audiences. From logos, typography, and color systems to storytelling and campaign narratives, we shape how people experience and remember your brand across digital platforms, print, and physical touchpoints. Our process ensures your brand communicates authenticity, consistency, and long-term value."
          />
          <FeatureCard
            feature="Tailored Web Development"
            featureDesc="We build custom-coded websites designed for speed, performance, and stunning design. Each site is carefully developed with responsive layouts, intuitive navigation, and SEO best practices, ensuring visibility on search engines and maximum engagement for your audience. Our approach merges creativity with technical excellence, delivering user-focused platforms that increase conversions and strengthen your online presence."
          />
          <FeatureCard
            feature="Client-Focused Marketing"
            featureDesc="Your goals drive our process. We partner closely with you to design marketing strategies, campaigns, and content that reflect your voice, values, and aspirations. By combining data-driven insights with creative execution, we help your brand reach the right audience, improve engagement, and achieve measurable growth. Every campaign is tailored to create meaningful connections with your customers."
          />
          <FeatureCard
            feature="High-End Visual Production"
            featureDesc="We are dedicated to delivering cinematic-quality visual content for brands that demand excellence. From concept development to final editing, we produce films, animations, and photography that tell powerful stories and elevate your brand presence. Our production process emphasizes precision, creativity, and attention to detail, ensuring that each project communicates professionalism and leaves a lasting impression."
          />
          <FeatureCard
            feature="Pixel-Perfect Quality"
            featureDesc="We obsess over every pixel, ensuring that each photo, layout, and line of code meets the highest professional standards. From mobile devices to large displays, we design and develop assets that look flawless across platforms. This commitment to pixel-perfect quality enhances your brand’s credibility, maximizes usability, and ensures consistency across every interaction your audience has with your business."
          />
          <FeatureCard
            feature="Adaptive Tech & Trends"
            featureDesc="We stay ahead of the curve by integrating the latest design tools, development frameworks, and emerging technologies into our workflow. From motion graphics and interactive experiences to AI-driven personalization and modern UX practices, we ensure your brand remains competitive in a rapidly changing digital world. Our adaptive approach helps position your business as innovative, future-ready, and always relevant."
          />
        </AnimatedGroup>
      </Container>
    </div>
  );
};

interface FeatureCardProps {
  feature: string;
  featureDesc: string;
}

const FeatureCard = ({ feature, featureDesc }: FeatureCardProps) => {
  return (
    <div className="flex flex-col gap-y-4 bg-background-contrast rounded-xl p-8 relative z-10 h-full">
      <h3 className="text-white font-semibold text-lg leading-lg">
        {feature || "Feature name"}
      </h3>
      <p className="text-xs leading-xs">{featureDesc}</p>
    </div>
  );
};

export default AboutHero;
