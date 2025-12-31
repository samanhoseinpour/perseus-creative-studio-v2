"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Container } from "../";
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
        className="relative w-full max-h-240 h-[70svh] mb-16"
        ref={headerRef}
      >
        <Container className="relative flex flex-col h-full z-10">
          <div className="flex-1 flex flex-col justify-end items-center max-sm:px-5">
            <h1 className="text-white font-bold text-4xl leading-4xl sm:text-5xl sm:leading-5xl text-center">
              About Perseus Creative Studio
            </h1>
            <p className="text-sm leading-sm font-semibold text-center">
              We’re a creative marketing studio built on design, storytelling,
              and results — helping brands grow, connect, and become truly
              memorable through meaningful visuals.
            </p>
          </div>
        </Container>
        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ y }}
        >
          <div className="relative h-full w-full">
            <iframe
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[56.25vw] min-w-[177.78vh] min-h-full object-cover opacity-80"
              src="https://www.youtube.com/embed/kC3LPrq2fqY?autoplay=1&mute=1&loop=1&playlist=kC3LPrq2fqY&controls=0&modestbranding=1&playsinline=1&rel=0"
              title="Perseus hero video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ border: 0 }}
            />
          </div>
        </motion.div>
      </section>

      <Container className="z-50">
        <div className="grid grid-cols-3 gap-x-8 gap-y-16 max-sm:grid-cols-1 items-stretch">
          <FeatureCard
            feature="Mission"
            featureDesc="We turn ideas into real, high-performing assets — websites, videos, and brand identities that push businesses forward. From the first strategy call to the final delivery, we ensure every step is built on intention: clean, custom code; visuals with meaning; and design that earns trust. No shortcuts, no templates — just purposeful work aligned with your goals."
            icon={LocateFixed}
          />
          <FeatureCard
            feature="Vision"
            featureDesc="Creativity should be infrastructure, not decoration. We envision a world where artistry, engineering, and business intelligence fuse together — so brands communicate clearly, convert consistently, and scale with confidence. As we grow, we push the boundaries of what a creative studio can do: deeper systems, richer storytelling, and solutions that last long after launch. "
            icon={Telescope}
          />
          <FeatureCard
            feature="How We Work"
            featureDesc="Our process is built on clarity and collaboration. It begins with discovery — understanding you, your business, your market, and your vision. We then translate strategy into execution: designing, developing, filming, and branding — all tied to concrete outcomes. Every decision we make links back to your goals, delivering work that feels polished, impactful, and authentic."
            icon={ChartNoAxesGantt}
          />
          <FeatureCard
            feature="What We Do"
            featureDesc="We excel in three core areas: custom website development (WordPress, Next.js, fully bespoke—no templates), professional media production (multi-camera video, drone cinematography, high-end photography, and storytelling for real estate, corporate, luxury, and lifestyle), and branding & identity (strategic visual systems, logos, and long-term brand guidelines)."
            icon={Briefcase}
          />
          <FeatureCard
            feature="Our Commitment"
            featureDesc="We believe in doing the work right — not fast or easy, but with purpose and precision. Our clients trust us because we bring vision and thoughtful detail to every project, whether it’s a one-day shoot or a full-scale campaign. You’re not hiring a vendor — you’re partnering with creators invested in your brand’s success."
            icon={Network}
          />
          <FeatureCard
            feature="What Sets Us Apart"
            featureDesc="It’s not just about what we produce — it’s how deeply we engage. We’ve led international visual storytelling projects, launched digital platforms for global clients, and filmed high-stakes events and luxury properties. That level of ambition, experience, and care is what makes the difference."
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
    <div className="flex flex-col gap-y-4 bg-background-contrast rounded-xl p-6 relative z-10 h-full">
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <h3 className="text-white font-semibold text-lg leading-lg">
          {feature || "Feature name"}
        </h3>
      </div>
      <p className="text-xs leading-xs">{featureDesc}</p>
    </div>
  );
};

export default AboutHero;
